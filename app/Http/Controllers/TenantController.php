<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use Illuminate\Http\JsonResponse;

class TenantController extends Controller
{
    public function credentials(string $tenant, string $id): JsonResponse
    {
        $record = Tenant::withTrashed()->findOrFail($id);

        return response()->json([
            'sand_password' => $record->sand_password,
            'prod_password' => $record->prod_password,
            'log_password'  => $record->log_password,
        ]);
    }
}
