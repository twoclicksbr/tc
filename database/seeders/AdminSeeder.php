<?php

namespace Database\Seeders;

use App\Models\Person;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $person = Person::firstOrCreate(
            ['name' => 'Admin'],
            [
                'birth_date' => null,
                'order'      => 1,
                'active'     => true,
            ]
        );

        User::firstOrCreate(
            ['email' => 'admin@admin.com'],
            [
                'person_id' => $person->id,
                'password'  => Hash::make('admin123'),
                'active'    => true,
            ]
        );
    }
}
