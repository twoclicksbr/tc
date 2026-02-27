<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateSchemas extends Command
{
    protected $signature = 'migrate:schemas
                            {--fresh : Drop e recria todos os schemas antes de migrar}
                            {--seed  : Executa os seeders após migrar}';

    protected $description = 'Roda migrations nos schemas sand, prod e log do tc_main';

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
        config(['database.connections.main.search_path' => env('DB_SCHEMA', 'prod') . ',log']);
        DB::purge('main');

        $this->info('');
        $this->info('migrate:schemas concluído.');

        return self::SUCCESS;
    }

    private function ensureSchemasExist(): void
    {
        $conn = DB::connection('main');
        foreach (['sand', 'prod', 'log'] as $schema) {
            $conn->statement("CREATE SCHEMA IF NOT EXISTS {$schema}");
            $this->line("  Schema <info>{$schema}</info> pronto.");
        }
    }

    private function dropAndRecreateSchemas(): void
    {
        $conn = DB::connection('main');
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
            '--path'     => 'database/migrations/main',
            '--force'    => true,
        ]);

        $this->info('');
        $this->info('--- Migrations: prod ---');
        $this->call('migrate', [
            '--database' => 'main_prod',
            '--path'     => 'database/migrations/main',
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
        config(['database.connections.main.search_path' => 'sand,log']);
        DB::purge('main');
        DB::setDefaultConnection('main');
        $this->call('db:seed', ['--class' => 'DatabaseSeeder', '--force' => true]);

        $this->info('');
        $this->info('--- Seed: prod ---');
        config(['database.connections.main.search_path' => 'prod,log']);
        DB::purge('main');
        DB::setDefaultConnection('main');
        $this->call('db:seed', ['--class' => 'DatabaseSeeder', '--force' => true]);
    }
}
