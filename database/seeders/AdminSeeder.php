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
            ['name' => 'Alex Twoclicks Technology'],
            [
                'birth_date' => "1985-05-09",
                'order'      => 1,
                'active'     => true,
            ]
        );

        User::firstOrCreate(
            ['email' => 'alex@twoclicks.com.br'],
            [
                'person_id' => $person->id,
                'password'  => Hash::make('Alex1985@'),
                'active'    => true,
            ]
        );
    }
}
