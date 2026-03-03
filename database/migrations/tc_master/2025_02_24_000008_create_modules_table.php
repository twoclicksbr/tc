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
            $table->enum('owner_level', ['master', 'platform', 'tenant'])->default('tenant');
            $table->unsignedBigInteger('owner_id')->default(0);
            $table->string('slug')->unique();
            $table->string('url_prefix')->nullable();
            $table->string('name');
            $table->string('icon')->nullable();
            $table->enum('type', ['module', 'submodule', 'pivot'])->default('module');
            $table->string('model')->nullable();
            $table->string('request')->nullable();
            $table->string('controller')->nullable();
            $table->enum('size_modal', ['p', 'm', 'g'])->default('m');
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
