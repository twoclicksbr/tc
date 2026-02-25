<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use SoftDeletes;

    protected $connection = 'main';

    protected $fillable = [
        'name',
        'slug',
        'db_name',
        'db_user',
        'db_password',
        'expiration_date',
        'order',
        'active',
    ];

    protected $hidden = ['db_password'];

    protected $casts = [
        'db_password'     => 'encrypted',
        'expiration_date' => 'date',
        'active'          => 'boolean',
    ];
}
