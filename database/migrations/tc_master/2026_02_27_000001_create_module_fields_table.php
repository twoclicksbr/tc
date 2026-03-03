<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('module_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('module_id')->constrained('modules')->cascadeOnDelete();

            // Identidade
            $table->string('name');
            $table->string('label');
            $table->string('icon', 100)->nullable();

            // Tipo e Estrutura
            $table->string('type', 50);
            $table->integer('length')->nullable();
            $table->integer('precision')->nullable();
            $table->string('default')->nullable();

            // Validação
            $table->boolean('nullable')->default(false);
            $table->boolean('required')->default(false);
            $table->string('min', 50)->nullable();
            $table->string('max', 50)->nullable();

            // Unicidade
            $table->boolean('unique')->default(false);
            $table->boolean('index')->default(false);
            $table->string('unique_table')->nullable();
            $table->string('unique_column')->nullable();

            // Relacionamento (FK)
            $table->string('fk_table')->nullable();
            $table->string('fk_column')->nullable();
            $table->string('fk_label')->nullable();

            // Automação
            $table->string('auto_from')->nullable();
            $table->string('auto_type', 50)->nullable();

            // Controle
            $table->boolean('main')->default(false);
            $table->boolean('is_custom')->default(false);
            $table->enum('owner_level', ['master', 'platform', 'tenant'])->default('tenant');
            $table->unsignedBigInteger('owner_id')->default(0);
            $table->integer('order')->default(1);
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('module_fields');
    }
};
