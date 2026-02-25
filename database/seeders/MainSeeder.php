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
        $slug = env('TENANT_SEED_SLUG', 'demo');

        Tenant::firstOrCreate(
            ['slug' => $slug],
            [
                'name'            => env('TENANT_SEED_NAME', 'Demo Tenant'),
                'db_name'         => str_replace('-', '_', $slug),
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
