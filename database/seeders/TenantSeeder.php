<?php

namespace Database\Seeders;

use App\Models\Module;
use Illuminate\Database\Seeder;

class TenantSeeder extends Seeder
{
    public function run(): void
    {
        // Module::firstOrCreate(
        //     ['slug' => 'modules'],
        //     [
        //         'name'        => 'Módulos',
        //         'type'        => 'module',
        //         'model'       => 'Module',
        //         'request'     => 'ModuleRequest',
        //         'controller'  => 'System\\ModuleController',
        //         'owner_level' => 'master',
        //         'owner_id'    => 0,
        //         'order'       => 1,
        //         'active'      => true,
        //     ]
        // );

        // Module::firstOrCreate(
        //     ['slug' => 'pessoas'],
        //     [
        //         'name'        => 'Pessoas',
        //         'type'        => 'module',
        //         'model'       => 'Person',
        //         'request'     => 'PersonRequest',
        //         'controller'  => null,
        //         'owner_level' => 'master',
        //         'owner_id'    => 0,
        //         'order'       => 2,
        //         'active'      => true,
        //     ]
        // );

        // Module::firstOrCreate(
        //     ['slug' => 'users'],
        //     [
        //         'name'        => 'Usuários',
        //         'type'        => 'module',
        //         'model'       => 'User',
        //         'request'     => 'UserRequest',
        //         'controller'  => null,
        //         'owner_level' => 'master',
        //         'owner_id'    => 0,
        //         'order'       => 3,
        //         'active'      => true,
        //     ]
        // );

        // Module::firstOrCreate(
        //     ['slug' => 'module-fields'],
        //     [
        //         'name'        => 'Campos do Módulo',
        //         'type'        => 'submodule',
        //         'model'       => 'ModuleField',
        //         'request'     => 'ModuleFieldRequest',
        //         'controller'  => null,
        //         'owner_level' => 'master',
        //         'owner_id'    => 0,
        //         'order'       => 4,
        //         'active'      => true,
        //     ]
        // );
    }
}
