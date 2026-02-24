<?php

use App\Http\Controllers\ModuleController;
use Illuminate\Support\Facades\Route;

Route::prefix('valsul/{module}')->group(function () {
    Route::get('/',          [ModuleController::class, 'index']);
    Route::post('/',         [ModuleController::class, 'store']);
    Route::get('{id}',       [ModuleController::class, 'show']);
    Route::put('{id}',       [ModuleController::class, 'update']);
    Route::patch('{id}',     [ModuleController::class, 'update']);
    Route::delete('{id}',    [ModuleController::class, 'destroy']);
    Route::patch('{id}/restore', [ModuleController::class, 'restore']);
});
