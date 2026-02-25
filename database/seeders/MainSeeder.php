<?php

namespace Database\Seeders;

use App\Models\Module;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class MainSeeder extends Seeder
{
    public function run(): void
    {
        Tenant::firstOrCreate(
            ['slug' => 'valsul'],
            [
                'name'            => 'Valsul Auto Latas',
                'db_name'         => 'valsul',
                'db_user'         => 'postgres',
                'db_password'     => env('DB_PASSWORD', ''),
                'expiration_date' => Carbon::today()->addDays(30),
                'order'           => 1,
                'active'          => true,
            ]
        );

        Module::on('main')->firstOrCreate(
            ['name_url' => 'tenants'],
            [
                'name'       => 'Tenants',
                'type'       => 'modulo',
                'name_table' => 'tenants',
                'model'      => 'Tenant',
                'request'    => 'TenantRequest',
                'order'      => 1,
                'active'     => true,
            ]
        );
    }
}
