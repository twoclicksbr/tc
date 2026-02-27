<?php

namespace App\Observers;

use App\Models\Platform;
use App\Services\PlatformDatabaseService;
use Illuminate\Support\Str;

class PlatformObserver
{
    /**
     * Antes de salvar: gerar campos automáticos ausentes.
     */
    public function creating(Platform $platform): void
    {
        if (empty($platform->slug)) {
            $platform->slug = Str::slug($platform->name);
        }

        // Sempre deriva do slug para garantir consistência
        $base = str_replace('-', '_', $platform->slug);
        $platform->db_name = $base;

        if (empty($platform->sand_user)) {
            $platform->sand_user = 'sand_' . $base;
        }
        if (empty($platform->sand_password)) {
            $platform->sand_password = Str::random(24);
        }
        if (empty($platform->prod_user)) {
            $platform->prod_user = 'prod_' . $base;
        }
        if (empty($platform->prod_password)) {
            $platform->prod_password = Str::random(24);
        }
        if (empty($platform->log_user)) {
            $platform->log_user = 'log_' . $base;
        }
        if (empty($platform->log_password)) {
            $platform->log_password = Str::random(24);
        }

        if (empty($platform->expiration_date)) {
            $platform->expiration_date = now()->addDays(30);
        }
    }

    /**
     * Após salvar: provisionar banco de dados da platform de forma síncrona.
     */
    public function created(Platform $platform): void
    {
        app(PlatformDatabaseService::class)->provision($platform);
    }
}
