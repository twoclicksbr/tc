<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('db_name');
            $table->string('sand_user')->nullable();
            $table->text('sand_password')->nullable();
            $table->string('prod_user')->nullable();
            $table->text('prod_password')->nullable();
            $table->string('log_user')->nullable();
            $table->text('log_password')->nullable();
            $table->date('expiration_date');
            $table->integer('order')->default(1);
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
