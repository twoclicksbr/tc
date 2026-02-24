<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['name', 'email_verified_at', 'remember_token']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('person_id')->after('id')->constrained('people')->cascadeOnDelete();
            $table->boolean('active')->default(true)->after('password');
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn('active');
            $table->dropForeign(['person_id']);
            $table->dropColumn('person_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->after('id');
            $table->timestamp('email_verified_at')->nullable()->after('email');
            $table->rememberToken();
        });
    }
};
