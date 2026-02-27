<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

class TenantDatabaseService
{
    public function provision(Tenant $tenant): void
    {
        $dbName   = 'tc_' . $tenant->db_name;
        $sandUser = $tenant->sand_user;
        $sandPass = $tenant->sand_password; // auto-decryptado pelo cast 'encrypted'
        $prodUser = $tenant->prod_user;
        $prodPass = $tenant->prod_password;
        $logUser  = $tenant->log_user;
        $logPass  = $tenant->log_password;

        $dbCreated   = false;
        $sandCreated = false;
        $prodCreated = false;
        $logCreated  = false;

        try {
            // 1. Criar banco de dados (só se ainda não existir)
            $dbExists = DB::connection('main')->selectOne("SELECT 1 FROM pg_database WHERE datname = ?", [$dbName]);
            if (!$dbExists) {
                DB::connection('main')->statement("CREATE DATABASE \"{$dbName}\"");
                $dbCreated = true;
            }

            // 2. Criar 3 users PostgreSQL (ou atualizar senha se já existirem)
            $sandExists = DB::connection('main')->selectOne("SELECT 1 FROM pg_roles WHERE rolname = ?", [$sandUser]);
            if (!$sandExists) {
                DB::connection('main')->statement("CREATE USER \"{$sandUser}\" WITH PASSWORD '{$sandPass}'");
                $sandCreated = true;
            } else {
                DB::connection('main')->statement("ALTER USER \"{$sandUser}\" WITH PASSWORD '{$sandPass}'");
            }

            $prodExists = DB::connection('main')->selectOne("SELECT 1 FROM pg_roles WHERE rolname = ?", [$prodUser]);
            if (!$prodExists) {
                DB::connection('main')->statement("CREATE USER \"{$prodUser}\" WITH PASSWORD '{$prodPass}'");
                $prodCreated = true;
            } else {
                DB::connection('main')->statement("ALTER USER \"{$prodUser}\" WITH PASSWORD '{$prodPass}'");
            }

            $logExists = DB::connection('main')->selectOne("SELECT 1 FROM pg_roles WHERE rolname = ?", [$logUser]);
            if (!$logExists) {
                DB::connection('main')->statement("CREATE USER \"{$logUser}\" WITH PASSWORD '{$logPass}'");
                $logCreated = true;
            } else {
                DB::connection('main')->statement("ALTER USER \"{$logUser}\" WITH PASSWORD '{$logPass}'");
            }

            // 3. Conceder CONNECT no banco para cada user
            DB::connection('main')->statement("GRANT CONNECT ON DATABASE \"{$dbName}\" TO \"{$sandUser}\"");
            DB::connection('main')->statement("GRANT CONNECT ON DATABASE \"{$dbName}\" TO \"{$prodUser}\"");
            DB::connection('main')->statement("GRANT CONNECT ON DATABASE \"{$dbName}\" TO \"{$logUser}\"");

            // 4. Conectar no novo banco como superuser e configurar os 3 schemas
            $superConfig = array_merge(
                config('database.connections.main'),
                ['database' => $dbName, 'search_path' => 'public']
            );
            config(['database.connections.tenant_setup' => $superConfig]);
            DB::purge('tenant_setup');
            $setup = DB::connection('tenant_setup');

            // a. Remover public
            $setup->statement("DROP SCHEMA IF EXISTS public CASCADE");

            // b. Criar schemas
            $setup->statement("CREATE SCHEMA sand");
            $setup->statement("CREATE SCHEMA prod");
            $setup->statement("CREATE SCHEMA log");

            // c. Transferir ownership
            $setup->statement("ALTER SCHEMA sand OWNER TO \"{$sandUser}\"");
            $setup->statement("ALTER SCHEMA prod OWNER TO \"{$prodUser}\"");
            $setup->statement("ALTER SCHEMA log OWNER TO \"{$logUser}\"");

            // d. Permissões de uso
            $setup->statement("GRANT USAGE ON SCHEMA sand TO \"{$sandUser}\"");
            $setup->statement("GRANT USAGE ON SCHEMA prod TO \"{$prodUser}\"");
            $setup->statement("GRANT USAGE ON SCHEMA log TO \"{$logUser}\"");

            // e. Privilégios padrão em tabelas futuras
            $setup->statement("ALTER DEFAULT PRIVILEGES IN SCHEMA sand GRANT ALL ON TABLES TO \"{$sandUser}\"");
            $setup->statement("ALTER DEFAULT PRIVILEGES IN SCHEMA prod GRANT ALL ON TABLES TO \"{$prodUser}\"");
            $setup->statement("ALTER DEFAULT PRIVILEGES IN SCHEMA log GRANT ALL ON TABLES TO \"{$logUser}\"");

            DB::purge('tenant_setup');

            // 5. Configurar conexões dinâmicas
            $this->configureTenantConnections($dbName, $sandUser, $sandPass, $prodUser, $prodPass, $logUser, $logPass);

            // 6. Migrations de tenant em sand e prod
            Artisan::call('migrate', [
                '--database' => 'tenant_sand',
                '--path'     => 'database/migrations/tenant',
                '--force'    => true,
            ]);
            Artisan::call('migrate', [
                '--database' => 'tenant_prod',
                '--path'     => 'database/migrations/tenant',
                '--force'    => true,
            ]);

            // 7. Migration de log
            Artisan::call('migrate', [
                '--database' => 'tenant_log',
                '--path'     => 'database/migrations/log',
                '--force'    => true,
            ]);

        } catch (\Throwable $e) {
            $this->rollback(
                $tenant, $dbName,
                $sandUser, $prodUser, $logUser,
                $dbCreated, $sandCreated, $prodCreated, $logCreated
            );
            throw $e;
        }
    }

    private function configureTenantConnections(
        string $dbName,
        string $sandUser, string $sandPass,
        string $prodUser, string $prodPass,
        string $logUser,  string $logPass
    ): void {
        $base = config('database.connections.main');

        config([
            'database.connections.tenant_sand' => array_merge($base, [
                'database'    => $dbName,
                'username'    => $sandUser,
                'password'    => $sandPass,
                'search_path' => 'sand',
            ]),
            'database.connections.tenant_prod' => array_merge($base, [
                'database'    => $dbName,
                'username'    => $prodUser,
                'password'    => $prodPass,
                'search_path' => 'prod',
            ]),
            'database.connections.tenant_log' => array_merge($base, [
                'database'    => $dbName,
                'username'    => $logUser,
                'password'    => $logPass,
                'search_path' => 'log',
            ]),
        ]);

        DB::purge('tenant_sand');
        DB::purge('tenant_prod');
        DB::purge('tenant_log');

        DB::reconnect('tenant_sand');
        DB::reconnect('tenant_prod');
        DB::reconnect('tenant_log');
    }

    private function rollback(
        Tenant $tenant,
        string $dbName,
        string $sandUser,
        string $prodUser,
        string $logUser,
        bool $dbCreated,
        bool $sandCreated,
        bool $prodCreated,
        bool $logCreated
    ): void {
        // Remover registro do tenant no tc_main
        try {
            DB::connection('main')
                ->table('tenants')
                ->where('id', $tenant->id)
                ->delete();
        } catch (\Throwable) {
        }

        // Fechar conexões com o banco do tenant
        DB::purge('tenant_sand');
        DB::purge('tenant_prod');
        DB::purge('tenant_log');
        DB::purge('tenant_setup');

        // Terminar conexões ativas e dropar banco
        if ($dbCreated) {
            try {
                DB::connection('main')->statement(
                    "SELECT pg_terminate_backend(pid)
                     FROM pg_stat_activity
                     WHERE datname = :db AND pid <> pg_backend_pid()",
                    ['db' => $dbName]
                );
                DB::connection('main')->statement("DROP DATABASE IF EXISTS \"{$dbName}\"");
            } catch (\Throwable) {
            }
        }

        // Dropar users
        foreach ([
            [$sandCreated, $sandUser],
            [$prodCreated, $prodUser],
            [$logCreated,  $logUser],
        ] as [$created, $user]) {
            if ($created) {
                try {
                    DB::connection('main')->statement("DROP USER IF EXISTS \"{$user}\"");
                } catch (\Throwable) {
                }
            }
        }
    }
}
