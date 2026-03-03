<?php

namespace App\Http\Middleware;

use App\Models\Platform;
use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        // Resolve tenant e platform a partir do hostname ou headers (fallback dev).
        //
        // Produção — hostname: {tenant}.{platform}.api.{base-domain}
        //   master.tc.api.twoclicks.com.br  → tenant=master, platform=tc
        //   master.tc.sandbox.api.tc.test   → tenant=master, platform=tc, sandbox
        //
        // Dev local — hostname simples (ex: api.tc.test) + headers:
        //   X-Tenant: master
        //   X-Platform: tc
        //   X-Sandbox: 1  (opcional)

        $host  = $request->getHost();
        $parts = explode('.', $host);

        if (count($parts) >= 4) {
            // Produção: tenant e platform no subdomínio
            $tenantSlug   = $parts[0];
            $platformSlug = $parts[1];
            $isSandbox    = ($parts[2] === 'sandbox');
        } else {
            // Dev local: lê dos headers
            $tenantSlug   = $request->header('X-Tenant');
            $platformSlug = $request->header('X-Platform');
            $isSandbox    = $request->header('X-Sandbox') === '1';

            if (! $tenantSlug || ! $platformSlug) {
                return response()->json(['message' => 'Host inválido.'], 400);
            }
        }

        $schema = $isSandbox ? 'sand' : 'prod';

        // Nível de acesso: master > platform > tenant
        $rootPlatformSlug = env('ROOT_PLATFORM_SLUG', 'tc');
        if ($tenantSlug === 'master') {
            $accessLevel = ($platformSlug === $rootPlatformSlug) ? 'master' : 'platform';
        } else {
            $accessLevel = 'tenant';
        }
        config(['app.access_level' => $accessLevel]);

        // Configura search_path na conexão main para lookup da platform
        config(['database.connections.tc_master.search_path' => $schema . ',log']);
        DB::purge('tc_master');

        // Busca a platform pelo slug
        $platform = Platform::where('slug', $platformSlug)->first();

        if (! $platform) {
            return response()->json(['message' => 'Plataforma não encontrada.'], 404);
        }

        if ($tenantSlug === 'master') {
            // Acesso master → banco master da platform (ex: tc_master)
            config([
                'database.connections.main.database'    => $platform->db_name,
                'database.connections.main.search_path' => $schema . ',log',
            ]);
            DB::purge('tc_master');
            DB::setDefaultConnection('tc_master');
            return $next($request);
        }

        // Acesso de tenant → busca tenant no banco master da platform
        $platformMasterConfig = array_merge(
            config('database.connections.tc_master'),
            [
                'database'    => $platform->db_name,
                'username'    => $schema === 'sand' ? $platform->sand_user : $platform->prod_user,
                'password'    => $schema === 'sand' ? $platform->sand_password : $platform->prod_password,
                'search_path' => $schema . ',log',
            ]
        );

        config(['database.connections.platform_lookup' => $platformMasterConfig]);
        DB::purge('platform_lookup');

        $tenant = Tenant::on('platform_lookup')
            ->where('slug', $tenantSlug)
            ->first();

        if (! $tenant) {
            return response()->json(['message' => 'Tenant não encontrado.'], 404);
        }

        // Nome do banco: {platform-slug}_{tenant-slug}
        $tenantDb = $platformSlug . '_' . $tenantSlug;
        $username = $schema === 'sand' ? $tenant->sand_user : $tenant->prod_user;
        $password = $schema === 'sand' ? $tenant->sand_password : $tenant->prod_password;

        config(['database.connections.tenant' => array_merge(
            config('database.connections.tc_master'),
            [
                'database'    => $tenantDb,
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
