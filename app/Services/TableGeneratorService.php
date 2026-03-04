<?php

namespace App\Services;

use App\Models\Module;
use App\Models\ModuleField;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Throwable;

class TableGeneratorService
{
    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    public function getTableStatus(Module $module): array
    {
        $schema    = $this->currentSchema();
        $tableName = $module->slug;

        $tableExists = $this->tableExists($schema, $tableName);
        $dbColumns   = $tableExists
            ? $this->getTableColumns($schema, $tableName)->keyBy('column_name')
            : collect();

        $fields = $this->activeFields($module->id);

        $changes          = [];
        $dangerousChanges = [];

        foreach ($fields as $field) {
            $dbCol = $dbColumns->get($field->name);

            if (! $dbCol) {
                $changes[] = [
                    'field'  => $field->name,
                    'status' => 'new',
                    'detail' => 'ADD COLUMN ' . $this->buildColumnDDL($field),
                ];
            } else {
                $diff = $this->compareColumn($field, $dbCol);
                if ($diff) {
                    $changes[] = [
                        'field'  => $field->name,
                        'status' => 'altered',
                        'detail' => $diff,
                    ];
                    if ($this->isDangerous($field, $dbCol, $schema, $tableName)) {
                        $dangerousChanges[] = [
                            'field'  => $field->name,
                            'reason' => $this->dangerReason($field, $dbCol),
                        ];
                    }
                } else {
                    $changes[] = [
                        'field'  => $field->name,
                        'status' => 'synced',
                        'detail' => null,
                    ];
                }
            }
        }

        // Columns in DB but not in active module_fields → removed
        $activeNames = $fields->pluck('name')->all();
        foreach ($dbColumns as $colName => $dbCol) {
            if (in_array($colName, $activeNames, true)) {
                continue;
            }
            $changes[] = [
                'field'  => $colName,
                'status' => 'removed',
                'detail' => "DROP COLUMN \"{$colName}\"",
            ];
            if ($this->columnHasData($schema, $tableName, $colName)) {
                $dangerousChanges[] = [
                    'field'  => $colName,
                    'reason' => 'Coluna contém dados e será removida',
                ];
            }
        }

        $hasPending = ! empty(array_filter($changes, fn($c) => $c['status'] !== 'synced'));

        return [
            'table_exists'       => $tableExists,
            'table_name'         => $tableName,
            'changes'            => $changes,
            'has_pending_changes' => $hasPending,
            'dangerous_changes'  => $dangerousChanges,
        ];
    }

    public function generateTable(Module $module, bool $confirmDangerous = false): array
    {
        $schema    = $this->currentSchema();
        $tableName = $module->slug;
        $status    = $this->getTableStatus($module);

        // Abort early if dangerous and not confirmed
        if (! empty($status['dangerous_changes']) && ! $confirmDangerous) {
            return [
                'success'           => false,
                'dangerous_changes' => $status['dangerous_changes'],
                'requires_confirm'  => true,
            ];
        }

        // Nothing to do
        if (! $status['has_pending_changes']) {
            return [
                'success'      => true,
                'table_name'   => $tableName,
                'operations'   => [],
                'backup_table' => null,
                'message'      => 'Tabela já está sincronizada.',
            ];
        }

        $operations  = [];
        $backupTable = null;

        try {
            if (! $status['table_exists']) {
                // CREATE TABLE
                $sql = $this->buildCreateTableSQL($module, $schema, $tableName);
                DB::statement($sql);
                $operations[] = "CREATE TABLE {$tableName}";

                foreach ($this->createIndexesAndFKs($module, $schema, $tableName) as $op) {
                    $operations[] = $op;
                }
            } else {
                // Backup
                $backupTable  = "{$tableName}_backup_" . date('YmdHis');
                DB::statement(
                    "CREATE TABLE \"{$schema}\".\"{$backupTable}\" AS SELECT * FROM \"{$schema}\".\"{$tableName}\""
                );
                $operations[] = "CREATE TABLE {$backupTable} (backup)";

                // Apply changes
                $fields    = $this->activeFields($module->id)->keyBy('name');
                $dbColumns = $this->getTableColumns($schema, $tableName)->keyBy('column_name');

                foreach ($status['changes'] as $change) {
                    if ($change['status'] === 'synced') {
                        continue;
                    }

                    $fieldName = $change['field'];

                    if ($change['status'] === 'new') {
                        $field  = $fields->get($fieldName);
                        $colDDL = $this->buildColumnDDL($field);
                        DB::statement(
                            "ALTER TABLE \"{$schema}\".\"{$tableName}\" ADD COLUMN {$colDDL}"
                        );
                        $operations[] = "ADD COLUMN {$fieldName}";

                        if ($field && $field->unique) {
                            DB::statement(
                                "CREATE UNIQUE INDEX ON \"{$schema}\".\"{$tableName}\" (\"{$fieldName}\")"
                            );
                            $operations[] = "CREATE UNIQUE INDEX ON {$fieldName}";
                        } elseif ($field && $field->index) {
                            DB::statement(
                                "CREATE INDEX ON \"{$schema}\".\"{$tableName}\" (\"{$fieldName}\")"
                            );
                            $operations[] = "CREATE INDEX ON {$fieldName}";
                        }

                        if ($field && $field->fk_table && $field->fk_column) {
                            $cName = "fk_{$tableName}_{$fieldName}";
                            DB::statement(
                                "ALTER TABLE \"{$schema}\".\"{$tableName}\"
                                 ADD CONSTRAINT \"{$cName}\"
                                 FOREIGN KEY (\"{$fieldName}\")
                                 REFERENCES \"{$schema}\".\"{$field->fk_table}\"(\"{$field->fk_column}\")"
                            );
                            $operations[] = "ADD FK {$fieldName} → {$field->fk_table}.{$field->fk_column}";
                        }
                    } elseif ($change['status'] === 'altered') {
                        $field = $fields->get($fieldName);
                        if ($field) {
                            $this->applyAlterColumn(
                                $schema, $tableName, $field, $dbColumns->get($fieldName), $operations
                            );
                        }
                    } elseif ($change['status'] === 'removed') {
                        DB::statement(
                            "ALTER TABLE \"{$schema}\".\"{$tableName}\" DROP COLUMN IF EXISTS \"{$fieldName}\""
                        );
                        $operations[] = "DROP COLUMN {$fieldName}";
                    }
                }
            }

            return [
                'success'      => true,
                'table_name'   => $tableName,
                'operations'   => $operations,
                'backup_table' => $backupTable,
            ];
        } catch (Throwable $e) {
            // Rollback via backup
            if ($backupTable) {
                try {
                    DB::statement("DROP TABLE IF EXISTS \"{$schema}\".\"{$tableName}\"");
                    DB::statement(
                        "ALTER TABLE \"{$schema}\".\"{$backupTable}\" RENAME TO \"{$tableName}\""
                    );
                } catch (Throwable) {
                    // Ignore rollback errors
                }
            }

            return [
                'success'  => false,
                'error'    => $e->getMessage(),
                'rollback' => (bool) $backupTable,
            ];
        }
    }

    // -------------------------------------------------------------------------
    // Schema helpers
    // -------------------------------------------------------------------------

    private function currentSchema(): string
    {
        $result = DB::selectOne('SELECT current_schema() AS schema');

        return $result->schema ?? 'sand';
    }

    private function tableExists(string $schema, string $tableName): bool
    {
        $result = DB::selectOne(
            "SELECT COUNT(*) AS cnt
             FROM information_schema.tables
             WHERE table_schema = ? AND table_name = ?",
            [$schema, $tableName]
        );

        return ($result->cnt ?? 0) > 0;
    }

    private function getTableColumns(string $schema, string $tableName): Collection
    {
        return collect(DB::select(
            "SELECT column_name, data_type, character_maximum_length,
                    numeric_precision, numeric_scale, is_nullable, column_default, ordinal_position
             FROM information_schema.columns
             WHERE table_schema = ? AND table_name = ?
             ORDER BY ordinal_position",
            [$schema, $tableName]
        ));
    }

    private function columnHasData(string $schema, string $tableName, string $column): bool
    {
        $result = DB::selectOne(
            "SELECT COUNT(*) AS cnt
             FROM \"{$schema}\".\"{$tableName}\"
             WHERE \"{$column}\" IS NOT NULL
             LIMIT 1"
        );

        return ($result->cnt ?? 0) > 0;
    }

    private function columnHasNulls(string $schema, string $tableName, string $column): bool
    {
        $result = DB::selectOne(
            "SELECT COUNT(*) AS cnt
             FROM \"{$schema}\".\"{$tableName}\"
             WHERE \"{$column}\" IS NULL
             LIMIT 1"
        );

        return ($result->cnt ?? 0) > 0;
    }

    // -------------------------------------------------------------------------
    // Field helpers
    // -------------------------------------------------------------------------

    private function activeFields(int $moduleId): Collection
    {
        return ModuleField::where('module_id', $moduleId)
            ->where('active', true)
            ->whereNull('deleted_at')
            ->orderByRaw('CASE WHEN is_system AND name = \'id\' THEN 0 WHEN NOT is_system THEN 1 ELSE 2 END')
            ->orderBy('order')
            ->get();
    }

    // -------------------------------------------------------------------------
    // DDL builders
    // -------------------------------------------------------------------------

    private function buildCreateTableSQL(Module $module, string $schema, string $tableName): string
    {
        $fields = $this->activeFields($module->id);

        $columns = $fields->map(fn($f) => '    ' . $this->buildColumnDDL($f))->implode(",\n");

        return "CREATE TABLE \"{$schema}\".\"{$tableName}\" (\n{$columns}\n)";
    }

    private function buildColumnDDL(ModuleField $field): string
    {
        // System fields get canonical definitions
        if ($field->is_system) {
            return match ($field->name) {
                'id'         => '"id" BIGSERIAL PRIMARY KEY',
                'order'      => '"order" INTEGER NOT NULL DEFAULT 1',
                'active'     => '"active" BOOLEAN NOT NULL DEFAULT true',
                'created_at' => '"created_at" TIMESTAMP NULL',
                'updated_at' => '"updated_at" TIMESTAMP NULL',
                'deleted_at' => '"deleted_at" TIMESTAMP NULL',
                default      => $this->buildUserColumnDDL($field),
            };
        }

        return $this->buildUserColumnDDL($field);
    }

    private function buildUserColumnDDL(ModuleField $field): string
    {
        $name     = '"' . $field->name . '"';
        $type     = $this->buildSQLType($field);
        $nullable = $field->nullable ? ' NULL' : ' NOT NULL';
        $default  = $field->default !== null
            ? ' DEFAULT ' . $this->formatDefault($field)
            : '';

        return "{$name} {$type}{$nullable}{$default}";
    }

    private function buildSQLType(ModuleField $field): string
    {
        $length = $field->length;

        return match ($field->type) {
            'string'   => $length ? "VARCHAR({$length})" : 'VARCHAR(255)',
            'text'     => 'TEXT',
            'integer'  => 'INTEGER',
            'bigint'   => 'BIGINT',
            'boolean'  => 'BOOLEAN',
            'date'     => 'DATE',
            'datetime' => 'TIMESTAMP',
            'decimal'  => $length ? "NUMERIC({$length})" : 'NUMERIC',
            'enum'     => 'VARCHAR(255)',
            default    => 'VARCHAR(255)',
        };
    }

    private function formatDefault(ModuleField $field): string
    {
        return match ($field->type) {
            'boolean'           => in_array($field->default, ['true', '1'], true) ? 'true' : 'false',
            'integer', 'bigint',
            'decimal'           => (string) $field->default,
            default             => "'" . addslashes($field->default) . "'",
        };
    }

    // -------------------------------------------------------------------------
    // Indexes & FKs
    // -------------------------------------------------------------------------

    private function createIndexesAndFKs(Module $module, string $schema, string $tableName): array
    {
        $operations = [];

        $fields = ModuleField::where('module_id', $module->id)
            ->where('active', true)
            ->where('is_system', false)
            ->whereNull('deleted_at')
            ->get();

        foreach ($fields as $field) {
            if ($field->unique) {
                DB::statement(
                    "CREATE UNIQUE INDEX ON \"{$schema}\".\"{$tableName}\" (\"{$field->name}\")"
                );
                $operations[] = "CREATE UNIQUE INDEX ON {$field->name}";
            } elseif ($field->index) {
                DB::statement(
                    "CREATE INDEX ON \"{$schema}\".\"{$tableName}\" (\"{$field->name}\")"
                );
                $operations[] = "CREATE INDEX ON {$field->name}";
            }

            if ($field->fk_table && $field->fk_column) {
                $cName = "fk_{$tableName}_{$field->name}";
                DB::statement(
                    "ALTER TABLE \"{$schema}\".\"{$tableName}\"
                     ADD CONSTRAINT \"{$cName}\"
                     FOREIGN KEY (\"{$field->name}\")
                     REFERENCES \"{$schema}\".\"{$field->fk_table}\"(\"{$field->fk_column}\")"
                );
                $operations[] = "ADD FK {$field->name} → {$field->fk_table}.{$field->fk_column}";
            }
        }

        return $operations;
    }

    // -------------------------------------------------------------------------
    // Column comparison
    // -------------------------------------------------------------------------

    /** Returns a detail string if the column differs, null if synced. */
    private function compareColumn(ModuleField $field, object $dbCol): ?string
    {
        // System fields: only check data_type match; ignore defaults/sequences
        if ($field->is_system) {
            $pgType   = $this->mapFieldTypeToPg($field->type);
            $dbType   = $dbCol->data_type;
            // id is BIGSERIAL → stored as bigint in information_schema
            if ($pgType !== $dbType) {
                return "ALTER COLUMN \"{$field->name}\" — tipo divergente (esperado {$pgType}, banco {$dbType})";
            }

            return null;
        }

        $pgType = $this->mapFieldTypeToPg($field->type);
        $dbType = $dbCol->data_type;
        $parts  = [];

        // Type mismatch
        if ($pgType !== $dbType) {
            $sqlType = $this->buildSQLType($field);
            $parts[] = "ALTER COLUMN \"{$field->name}\" TYPE {$sqlType}";
        } elseif ($pgType === 'character varying') {
            // Length mismatch
            $expectedLen = $field->length ? (int) $field->length : 255;
            $actualLen   = (int) $dbCol->character_maximum_length;
            if ($expectedLen !== $actualLen) {
                $parts[] = "ALTER COLUMN \"{$field->name}\" TYPE VARCHAR({$expectedLen})";
            }
        } elseif ($pgType === 'numeric' && $field->length) {
            // Decimal precision/scale mismatch
            [$expectedP, $expectedS] = array_map('intval', explode(',', $field->length . ',0'));
            if ((int) $dbCol->numeric_precision !== $expectedP || (int) $dbCol->numeric_scale !== $expectedS) {
                $parts[] = "ALTER COLUMN \"{$field->name}\" TYPE NUMERIC({$field->length})";
            }
        }

        // Nullable mismatch
        $expectedNullable = $field->nullable ? 'YES' : 'NO';
        if ($dbCol->is_nullable !== $expectedNullable) {
            $parts[] = $field->nullable
                ? "ALTER COLUMN \"{$field->name}\" DROP NOT NULL"
                : "ALTER COLUMN \"{$field->name}\" SET NOT NULL";
        }

        return empty($parts) ? null : implode('; ', $parts);
    }

    private function mapFieldTypeToPg(string $type): string
    {
        return match ($type) {
            'string', 'enum' => 'character varying',
            'text'           => 'text',
            'integer'        => 'integer',
            'bigint'         => 'bigint',
            'boolean'        => 'boolean',
            'date'           => 'date',
            'datetime'       => 'timestamp without time zone',
            'decimal'        => 'numeric',
            default          => 'character varying',
        };
    }

    // -------------------------------------------------------------------------
    // Danger detection
    // -------------------------------------------------------------------------

    private function isDangerous(ModuleField $field, object $dbCol, string $schema, string $tableName): bool
    {
        // Type change with data
        if ($this->mapFieldTypeToPg($field->type) !== $dbCol->data_type) {
            return $this->columnHasData($schema, $tableName, $field->name);
        }

        // nullable true→false with existing NULLs
        if (! $field->nullable && $dbCol->is_nullable === 'YES') {
            return $this->columnHasNulls($schema, $tableName, $field->name);
        }

        return false;
    }

    private function dangerReason(ModuleField $field, object $dbCol): string
    {
        if ($this->mapFieldTypeToPg($field->type) !== $dbCol->data_type) {
            return 'Coluna contém dados e o tipo será alterado';
        }

        if (! $field->nullable && $dbCol->is_nullable === 'YES') {
            return 'Coluna contém valores NULL e será alterada para NOT NULL';
        }

        return 'Alteração potencialmente destrutiva';
    }

    // -------------------------------------------------------------------------
    // Alter column
    // -------------------------------------------------------------------------

    private function applyAlterColumn(
        string $schema,
        string $tableName,
        ModuleField $field,
        ?object $dbCol,
        array &$operations
    ): void {
        if (! $dbCol) {
            return;
        }

        $fieldName = $field->name;
        $pgType    = $this->mapFieldTypeToPg($field->type);
        $dbType    = $dbCol->data_type;

        // Alter type
        $typeChanged = $pgType !== $dbType;

        if (! $typeChanged && $pgType === 'character varying') {
            $expectedLen = $field->length ? (int) $field->length : 255;
            $typeChanged = (int) $dbCol->character_maximum_length !== $expectedLen;
        }

        if (! $typeChanged && $pgType === 'numeric' && $field->length) {
            [$ep, $es] = array_map('intval', explode(',', $field->length . ',0'));
            $typeChanged = (int) $dbCol->numeric_precision !== $ep || (int) $dbCol->numeric_scale !== $es;
        }

        if ($typeChanged) {
            $sqlType = $this->buildSQLType($field);
            DB::statement(
                "ALTER TABLE \"{$schema}\".\"{$tableName}\"
                 ALTER COLUMN \"{$fieldName}\" TYPE {$sqlType}
                 USING \"{$fieldName}\"::{$sqlType}"
            );
            $operations[] = "ALTER COLUMN {$fieldName} TYPE {$sqlType}";
        }

        // Alter nullable
        $expectedNullable = $field->nullable ? 'YES' : 'NO';
        if ($dbCol->is_nullable !== $expectedNullable) {
            if ($field->nullable) {
                DB::statement(
                    "ALTER TABLE \"{$schema}\".\"{$tableName}\" ALTER COLUMN \"{$fieldName}\" DROP NOT NULL"
                );
                $operations[] = "ALTER COLUMN {$fieldName} DROP NOT NULL";
            } else {
                DB::statement(
                    "ALTER TABLE \"{$schema}\".\"{$tableName}\" ALTER COLUMN \"{$fieldName}\" SET NOT NULL"
                );
                $operations[] = "ALTER COLUMN {$fieldName} SET NOT NULL";
            }
        }
    }
}
