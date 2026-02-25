<?php

namespace Database\Seeders;

use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

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
    }
}
