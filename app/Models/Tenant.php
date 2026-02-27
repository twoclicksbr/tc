<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use SoftDeletes;

    protected $connection = 'main';

    protected $fillable = [
        'platform_id',
        'name',
        'slug',
        'db_name',
        'sand_user',
        'sand_password',
        'prod_user',
        'prod_password',
        'log_user',
        'log_password',
        'expiration_date',
        'order',
        'active',
    ];

    protected $hidden = ['sand_password', 'prod_password', 'log_password'];

    protected $casts = [
        'sand_password'   => 'encrypted',
        'prod_password'   => 'encrypted',
        'log_password'    => 'encrypted',
        'expiration_date' => 'date:Y-m-d',
        'active'          => 'boolean',
    ];

    public function platform()
    {
        return $this->belongsTo(Platform::class);
    }
}
