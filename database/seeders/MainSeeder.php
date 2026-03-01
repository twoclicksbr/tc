<?php

namespace Database\Seeders;

use App\Models\Module;
use Illuminate\Database\Seeder;

class MainSeeder extends Seeder
{
    public function run(): void
    {
        Module::on('main')->firstOrCreate(
            ['slug' => 'modules'],
            [
                'name'        => 'Módulos',
                'type'        => 'module',
                'model'       => 'Module',
                'request'     => 'ModuleRequest',
                'controller'  => 'System\\ModuleController',
                'owner_level' => 'master',
                'owner_id'    => 0,
                'order'       => 1,
                'active'      => true,
            ]
        );

        Module::on('main')->firstOrCreate(
            ['slug' => 'module-fields'],
            [
                'name'        => 'Campos do Módulo',
                'type'        => 'submodule',
                'model'       => 'ModuleField',
                'request'     => 'ModuleFieldRequest',
                'controller'  => null,
                'owner_level' => 'master',
                'owner_id'    => 0,
                'order'       => 2,
                'active'      => true,
            ]
        );

        Module::on('main')->firstOrCreate(
            ['slug' => 'platforms'],
            [
                'name'        => 'Plataformas',
                'type'        => 'module',
                'model'       => 'Platform',
                'request'     => 'PlatformRequest',
                'controller'  => 'System\\PlatformController',
                'owner_level' => 'master',
                'owner_id'    => 0,
                'order'       => 3,
                'active'      => true,
            ]
        );
    }
}
