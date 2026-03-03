<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateSchemas extends Command
{
    protected $signature = 'migrate:schemas
                            {--fresh : Drop e recria todos os schemas antes de migrar}
                            {--seed  : Executa os seeders após migrar}';

    protected $description = 'Roda migrations nos schemas sand e log do tc_master (prod via deploy)';

    public function handle(): int
    {
        if ($this->option('fresh')) {
            $this->dropAndRecreateSchemas();
        } else {
            $this->ensureSchemasExist();
        }

        $this->runMigrations();

        if ($this->option('seed')) {
            $this->runSeeders();
        }

        // Restaura search_path padrão da conexão main
        config(['database.connections.tc_master.search_path' => env('DB_SCHEMA', 'prod') . ',log']);
        DB::purge('tc_master');

        $this->info('');
        $this->info('migrate:schemas concluído.');

        return self::SUCCESS;
    }

    private function ensureSchemasExist(): void
    {
        $conn = DB::connection('tc_master');
        foreach (['sand', 'prod', 'log'] as $schema) {
            $conn->statement("CREATE SCHEMA IF NOT EXISTS {$schema}");
            $this->line("  Schema <info>{$schema}</info> pronto.");
        }
    }

    private function dropAndRecreateSchemas(): void
    {
        $conn = DB::connection('tc_master');
        foreach (['sand', 'prod', 'log'] as $schema) {
            $conn->statement("DROP SCHEMA IF EXISTS {$schema} CASCADE");
            $conn->statement("CREATE SCHEMA {$schema}");
            $this->line("  Schema <info>{$schema}</info> dropado e recriado.");
        }
    }

    private function runMigrations(): void
    {
        $this->info('');
        $this->info('--- Migrations: sand ---');
        $this->call('migrate', [
            '--database' => 'main_sand',
            '--path'     => 'database/migrations/tc_master',
            '--force'    => true,
        ]);

        $this->info('');
        $this->info('--- Migrations: log ---');
        $this->call('migrate', [
            '--database' => 'main_log',
            '--path'     => 'database/migrations/log',
            '--force'    => true,
        ]);
    }

    private function runSeeders(): void
    {
        $this->info('');
        $this->info('--- Seed: sand ---');
        config(['database.connections.tc_master.search_path' => 'sand,log']);
        DB::purge('tc_master');
        DB::setDefaultConnection('tc_master');
        $this->call('db:seed', ['--class' => 'DatabaseSeeder', '--force' => true]);

    }
}
