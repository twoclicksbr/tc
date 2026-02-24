<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Person extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'birth_date',
        'order',
        'active',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'order'      => 'integer',
        'active'     => 'boolean',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
