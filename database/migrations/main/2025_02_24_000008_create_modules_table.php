<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['modulo', 'submodulo']);
            $table->string('name_table')->unique();
            $table->string('name_url')->unique();
            $table->string('model')->nullable();
            $table->string('request')->nullable();
            $table->string('controller_front')->nullable();
            $table->string('controller_back')->nullable();
            $table->text('description_index')->nullable();
            $table->text('description_show')->nullable();
            $table->text('description_store')->nullable();
            $table->text('description_update')->nullable();
            $table->text('description_delete')->nullable();
            $table->text('description_restore')->nullable();
            $table->enum('after_store', ['index', 'show', 'create', 'edit'])->nullable();
            $table->enum('after_update', ['index', 'show', 'create', 'edit'])->nullable();
            $table->enum('after_restore', ['index', 'show', 'create', 'edit'])->nullable();
            $table->integer('order')->default(1);
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('modules');
    }
};
