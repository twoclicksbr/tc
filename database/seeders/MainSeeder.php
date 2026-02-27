<?php

namespace Database\Seeders;

use App\Models\Module;
use Illuminate\Database\Seeder;

class MainSeeder extends Seeder
{
    public function run(): void
    {
        Module::on('main')->firstOrCreate(
            ['name_url' => 'tenants'],
            [
                'name'       => 'Empresas',
                'type'       => 'modulo',
                'name_table' => 'tenants',
                'model'      => 'Tenant',
                'request'    => 'TenantRequest',
                'order'      => 1,
                'active'     => true,
            ]
        );

        Module::on('main')->firstOrCreate(
            ['name_url' => 'modules'],
            [
                'name'       => 'Modules',
                'type'       => 'modulo',
                'name_table' => 'modules',
                'model'      => 'Module',
                'request'    => 'ModuleRequest',
                'order'      => 2,
                'active'     => true,
            ]
        );

        Module::on('main')->firstOrCreate(
            ['name_url' => 'platforms'],
            [
                'name'       => 'Plataformas',
                'type'       => 'modulo',
                'name_table' => 'platforms',
                'model'      => 'Platform',
                'request'    => 'PlatformRequest',
                'order'      => 3,
                'active'     => true,
            ]
        );

        Module::on('main')->firstOrCreate(
            ['name_url' => 'pessoas'],
            [
                'name'       => 'Pessoas',
                'type'       => 'modulo',
                'name_table' => 'people',
                'model'      => 'Person',
                'request'    => 'PersonRequest',
                'order'      => 4,
                'active'     => true,
            ]
        );
    }
}
