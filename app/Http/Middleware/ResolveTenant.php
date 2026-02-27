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
        $slug      = $request->route('tenant');
        $isSandbox = str_contains($request->getHost(), '.sandbox.');
        $schema    = $isSandbox ? 'sand' : 'prod';

        if ($slug === 'admin') {
            // Reconfigura main para o schema correto (sand,log ou prod,log)
            config(['database.connections.main.search_path' => $schema . ',log']);
            DB::purge('main');
            DB::setDefaultConnection('main');
            return $next($request);
        }

        // Aponta main para o schema correto antes do lookup do tenant
        config(['database.connections.main.search_path' => $schema . ',log']);
        DB::purge('main');

        $tenant = Tenant::where('slug', $slug)->first();

        if (! $tenant) {
            return response()->json(['message' => 'Tenant não encontrado.'], 404);
        }

        $dbName   = 'tc_' . $tenant->db_name;
        $username = $schema === 'sand' ? $tenant->sand_user : $tenant->prod_user;
        $password = $schema === 'sand' ? $tenant->sand_password : $tenant->prod_password;

        config(['database.connections.tenant' => array_merge(
            config('database.connections.main'),
            [
                'database'    => $dbName,
                'username'    => $username,
                'password'    => $password,
                'search_path' => $schema . ',log',
            ]
        )]);

        DB::purge('tenant');
        DB::setDefaultConnection('tenant');

        return $next($request);
    }
}
