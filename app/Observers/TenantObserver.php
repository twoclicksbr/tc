<?php

namespace App\Observers;

use App\Models\Tenant;
use App\Services\TenantDatabaseService;
use Illuminate\Support\Str;

class TenantObserver
{
    /**
     * Antes de salvar: gerar campos automáticos ausentes.
     */
    public function creating(Tenant $tenant): void
    {
        if (empty($tenant->slug)) {
            $tenant->slug = Str::slug($tenant->name);
        }

        // Sempre deriva do slug para garantir consistência
        $base = str_replace('-', '_', $tenant->slug);
        $tenant->db_name = $base;

        if (empty($tenant->sand_user)) {
            $tenant->sand_user = 'sand_' . $base;
        }
        if (empty($tenant->sand_password)) {
            $tenant->sand_password = Str::random(24);
        }
        if (empty($tenant->prod_user)) {
            $tenant->prod_user = 'prod_' . $base;
        }
        if (empty($tenant->prod_password)) {
            $tenant->prod_password = Str::random(24);
        }
        if (empty($tenant->log_user)) {
            $tenant->log_user = 'log_' . $base;
        }
        if (empty($tenant->log_password)) {
            $tenant->log_password = Str::random(24);
        }

        if (empty($tenant->expiration_date)) {
            $tenant->expiration_date = now()->addDays(30);
        }
    }

    /**
     * Após salvar: provisionar banco de dados do tenant de forma síncrona.
     */
    public function created(Tenant $tenant): void
    {
        app(TenantDatabaseService::class)->provision($tenant);
    }
}
