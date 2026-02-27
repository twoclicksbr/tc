<?php

namespace App\Providers;

use App\Models\PersonalAccessToken;
use App\Models\Platform;
use App\Models\Tenant;
use App\Observers\PlatformObserver;
use App\Observers\TenantObserver;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);

        Tenant::observe(TenantObserver::class);
        Platform::observe(PlatformObserver::class);
    }
}
