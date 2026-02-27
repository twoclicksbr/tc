<?php

namespace App\Services;

use App\Models\Platform;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

class PlatformDatabaseService
{
    public function provision(Platform $platform): void
    {
        $dbName   = 'tc_' . $platform->db_name;
        $sandUser = $platform->sand_user;
        $sandPass = $platform->sand_password; // auto-decryptado pelo cast 'encrypted'
        $prodUser = $platform->prod_user;
        $prodPass = $platform->prod_password;
        $logUser  = $platform->log_user;
        $logPass  = $platform->log_password;

        $dbCreated   = false;
        $sandCreated = false;
        $prodCreated = false;
        $logCreated  = false;

        try {
            // 1. Criar banco de dados
            DB::connection('main')->statement("CREATE DATABASE \"{$dbName}\"");
            $dbCreated = true;

            // 2. Criar 3 users PostgreSQL
            DB::connection('main')->statement("CREATE USER \"{$sandUser}\" WITH PASSWORD '{$sandPass}'");
            $sandCreated = true;

            DB::connection('main')->statement("CREATE USER \"{$prodUser}\" WITH PASSWORD '{$prodPass}'");
            $prodCreated = true;

            DB::connection('main')->statement("CREATE USER \"{$logUser}\" WITH PASSWORD '{$logPass}'");
            $logCreated = true;

            // 3. Conceder CONNECT no banco para cada user
            DB::connection('main')->statement("GRANT CONNECT ON DATABASE \"{$dbName}\" TO \"{$sandUser}\"");
            DB::connection('main')->statement("GRANT CONNECT ON DATABASE \"{$dbName}\" TO \"{$prodUser}\"");
            DB::connection('main')->statement("GRANT CONNECT ON DATABASE \"{$dbName}\" TO \"{$logUser}\"");

            // 4. Conectar no novo banco como superuser e configurar os 3 schemas
            $superConfig = array_merge(
                config('database.connections.main'),
                ['database' => $dbName, 'search_path' => 'public']
            );
            config(['database.connections.platform_setup' => $superConfig]);
            DB::purge('platform_setup');
            $setup = DB::connection('platform_setup');

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

            DB::purge('platform_setup');

            // 5. Configurar conexões dinâmicas
            $this->configurePlatformConnections($dbName, $sandUser, $sandPass, $prodUser, $prodPass, $logUser, $logPass);

            // 6. Migrations de tenant em sand e prod
            Artisan::call('migrate', [
                '--database' => 'platform_sand',
                '--path'     => 'database/migrations/tenant',
                '--force'    => true,
            ]);
            Artisan::call('migrate', [
                '--database' => 'platform_prod',
                '--path'     => 'database/migrations/tenant',
                '--force'    => true,
            ]);

            // 7. Migration de log
            Artisan::call('migrate', [
                '--database' => 'platform_log',
                '--path'     => 'database/migrations/log',
                '--force'    => true,
            ]);

        } catch (\Throwable $e) {
            $this->rollback(
                $platform, $dbName,
                $sandUser, $prodUser, $logUser,
                $dbCreated, $sandCreated, $prodCreated, $logCreated
            );
            throw $e;
        }
    }

    private function configurePlatformConnections(
        string $dbName,
        string $sandUser, string $sandPass,
        string $prodUser, string $prodPass,
        string $logUser,  string $logPass
    ): void {
        $base = config('database.connections.main');

        config([
            'database.connections.platform_sand' => array_merge($base, [
                'database'    => $dbName,
                'username'    => $sandUser,
                'password'    => $sandPass,
                'search_path' => 'sand',
            ]),
            'database.connections.platform_prod' => array_merge($base, [
                'database'    => $dbName,
                'username'    => $prodUser,
                'password'    => $prodPass,
                'search_path' => 'prod',
            ]),
            'database.connections.platform_log' => array_merge($base, [
                'database'    => $dbName,
                'username'    => $logUser,
                'password'    => $logPass,
                'search_path' => 'log',
            ]),
        ]);

        DB::purge('platform_sand');
        DB::purge('platform_prod');
        DB::purge('platform_log');

        DB::reconnect('platform_sand');
        DB::reconnect('platform_prod');
        DB::reconnect('platform_log');
    }

    private function rollback(
        Platform $platform,
        string $dbName,
        string $sandUser,
        string $prodUser,
        string $logUser,
        bool $dbCreated,
        bool $sandCreated,
        bool $prodCreated,
        bool $logCreated
    ): void {
        // Remover registro da platform no tc_main
        try {
            DB::connection('main')
                ->table('platforms')
                ->where('id', $platform->id)
                ->delete();
        } catch (\Throwable) {
        }

        // Fechar conexões com o banco da platform
        DB::purge('platform_sand');
        DB::purge('platform_prod');
        DB::purge('platform_log');
        DB::purge('platform_setup');

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
