<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\System\ModuleController;
use App\Http\Controllers\System\PlatformController;
use App\Http\Controllers\System\TenantController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // Autenticação — público
    Route::middleware('resolve.tenant')->prefix('auth')->group(function () {
        Route::post('login', [AuthController::class, 'login']);
    });

    // Rotas protegidas por Sanctum
    Route::middleware(['resolve.tenant', 'auth:sanctum'])->group(function () {

        // Auth — protegido
        Route::prefix('auth')->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me',     [AuthController::class, 'me']);
        });

        // Rotas específicas (antes dos genéricos para evitar conflito)
        Route::get('tenants/{id}/credentials',   [TenantController::class,   'credentials']);
        Route::get('platforms/{id}/credentials', [PlatformController::class, 'credentials']);

        // Rotas específicas de modules (antes do genérico para evitar conflito)
        Route::get('modules/scan-files',           [ModuleController::class, 'scanFiles']);
        Route::get('modules/{id}/table-status',    [ModuleController::class, 'tableStatus']);
        Route::post('modules/{id}/generate-table', [ModuleController::class, 'generateTable']);

        // Módulos genéricos
        Route::prefix('{module}')->group(function () {
            Route::get('/',              [ModuleController::class, 'index']);
            Route::post('/',             [ModuleController::class, 'store']);
            Route::get('check-slug',     [ModuleController::class, 'checkSlug']);
            Route::get('{id}',           [ModuleController::class, 'show']);
            Route::put('{id}',           [ModuleController::class, 'update']);
            Route::patch('{id}',         [ModuleController::class, 'update']);
            Route::delete('{id}',        [ModuleController::class, 'destroy']);
            Route::patch('{id}/restore', [ModuleController::class, 'restore']);
        });

    });

});
