<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $slug = $request->route('tenant');

        $tenant = Tenant::where('slug', $slug)->first();

        if (! $tenant) {
            return response()->json(['message' => 'Tenant não encontrado.'], 404);
        }

        // Em produção: usar $tenant->db_user e $tenant->db_password (decrypt automático via cast 'encrypted')
        // Em dev: usa as credenciais do .env para simplificar (não requer criar usuário por tenant no PostgreSQL)
        config([
            'database.connections.tenant.database' => 'sc360_' . $tenant->db_name,
            'database.connections.tenant.username'  => env('DB_USERNAME'),
            'database.connections.tenant.password'  => env('DB_PASSWORD'),
        ]);

        DB::purge('tenant');
        DB::setDefaultConnection('tenant');

        return $next($request);
    }
}
