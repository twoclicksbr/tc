<?php

namespace Database\Seeders;

use App\Models\Module;
use App\Models\Platform;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class TcMasterSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Platform TwoClicks (Observer gera credenciais + provisiona banco)
        $platform = Platform::on('tc_master')->firstOrCreate(
            ['slug' => 'tc'],
            [
                'name'            => 'TwoClicks',
                'domain'          => 'twoclicks.com.br',
                'domain_local'    => 'tc.test',
                'expiration_date' => now()->addYears(10),
                'order'           => 1,
                'active'          => true,
            ]
        );

        // 2. Tenant master (Observer gera db_name=master, credenciais + provisiona banco)
        Tenant::on('tc_master')->firstOrCreate(
            ['slug' => 'master'],
            [
                'platform_id'     => $platform->id,
                'name'            => 'Master',
                'expiration_date' => now()->addYears(10),
                'order'           => 1,
                'active'          => true,
            ]
        );

        // 3. Módulos do tc_master
        Module::on('tc_master')->firstOrCreate(
            ['slug' => 'modules'],
            [
                'name'        => 'Módulos',
                'icon'        => 'Box',
                'type'        => 'module',
                'model'       => 'Module',
                'request'     => 'ModuleRequest',
                'controller'  => 'System\ModuleController',
                'owner_level' => 'master',
                'owner_id'    => 0,
                'order'       => 1,
                'active'      => true,
            ]
        );

        Module::on('tc_master')->firstOrCreate(
            ['slug' => 'module-fields'],
            [
                'name'        => 'Campos do Módulo',
                'type'        => 'submodule',
                'model'       => 'ModuleField',
                'request'     => 'ModuleFieldRequest',
                'owner_level' => 'master',
                'owner_id'    => 0,
                'order'       => 2,
                'active'      => true,
            ]
        );

        Module::on('tc_master')->firstOrCreate(
            ['slug' => 'platforms'],
            [
                'name'        => 'Plataformas',
                'icon'        => 'Layers',
                'type'        => 'module',
                'model'       => 'Platform',
                'request'     => 'PlatformRequest',
                'controller'  => 'System\PlatformController',
                'owner_level' => 'master',
                'owner_id'    => 0,
                'order'       => 3,
                'active'      => true,
            ]
        );

        Module::on('tc_master')->firstOrCreate(
            ['slug' => 'tenants'],
            [
                'name'        => 'Tenants',
                'icon'        => 'Building2',
                'type'        => 'module',
                'model'       => 'Tenant',
                'request'     => 'TenantRequest',
                'controller'  => 'System\TenantController',
                'owner_level' => 'master',
                'owner_id'    => 0,
                'order'       => 4,
                'active'      => true,
            ]
        );
    }
}
