<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use App\Models\Module;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ModuleController extends Controller
{
    private function resolveModule(string $nameUrl): Module
    {
        $module = Module::where('slug', $nameUrl)->first();

        if (! $module) {
            abort(404, "Módulo '{$nameUrl}' não encontrado.");
        }

        return $module;
    }

    private function modelClass(Module $module): string
    {
        return "App\\Models\\{$module->model}";
    }

    private function requestClass(Module $module): string
    {
        return "App\\Http\\Requests\\{$module->request}";
    }

    public function scanFiles(): JsonResponse
    {
        $models = collect(glob(app_path('Models') . '/*.php'))
            ->map(fn($f) => pathinfo($f, PATHINFO_FILENAME))
            ->reject(fn($name) => $name === 'PersonalAccessToken')
            ->sort()
            ->values();

        $requests = collect(glob(app_path('Http/Requests') . '/*.php'))
            ->map(fn($f) => pathinfo($f, PATHINFO_FILENAME))
            ->sort()
            ->values();

        $controllersBase = app_path('Http/Controllers');
        $controllers     = [];

        // Controllers na raiz (exceto Controller.php base)
        foreach (glob($controllersBase . '/*.php') ?: [] as $file) {
            $filename = pathinfo($file, PATHINFO_FILENAME);
            if ($filename === 'Controller') continue;
            $controllers['Raiz'][] = $filename;
        }

        // Controllers em subpastas (um nível de profundidade)
        foreach (glob($controllersBase . '/*/*.php') ?: [] as $file) {
            $filename  = pathinfo($file, PATHINFO_FILENAME);
            $subfolder = basename(dirname($file));
            $controllers[$subfolder][] = $filename;
        }

        foreach ($controllers as &$group) {
            sort($group);
        }
        ksort($controllers);

        return response()->json([
            'models'      => $models,
            'requests'    => $requests,
            'controllers' => (object) $controllers,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $mod        = $this->resolveModule($request->route('module'));
        $modelClass = $this->modelClass($mod);
        $instance   = new $modelClass;
        $fillable   = $instance->getFillable();

        // include_deleted deve ser aplicado antes dos demais filtros
        $query = $request->boolean('include_deleted')
            ? $modelClass::withTrashed()
            : $modelClass::query();

        // Filtro por module_id (para submódulos)
        if ($request->has('module_id') && in_array('module_id', $fillable, true)) {
            $query->where('module_id', (int) $request->input('module_id'));
        }

        // Filtro por ID
        if ($searchId = $request->input('search_id')) {
            $query->where('id', (int) $searchId);
        }

        // Filtro por type (campo enum: module/submodule/pivot)
        if ($type = $request->input('type')) {
            if (in_array('type', $fillable, true)) {
                $query->where('type', $type);
            }
        }

        // Filtro por owner_level (campo enum: master/platform/tenant)
        if ($ownerLevel = $request->input('owner_level')) {
            if (in_array('owner_level', $fillable, true)) {
                $query->where('owner_level', $ownerLevel);
            }
        }

        // Filtro por nome
        if ($searchName = $request->input('search_name')) {
            $searchType = $request->input('search_type', 'contains');
            match ($searchType) {
                'starts' => $query->whereRaw('name ILIKE ?', [$searchName . '%']),
                'exact'  => $query->where('name', $searchName),
                default  => $query->whereRaw('name ILIKE ?', ['%' . $searchName . '%']),
            };
        }

        // Filtro por data (date_type + date_from + date_to)
        if ($dateFrom = $request->input('date_from')) {
            $dateType     = $request->input('date_type', 'created_at');
            $allowedDates = ['created_at', 'updated_at', 'deleted_at'];
            if (in_array($dateType, $allowedDates, true)) {
                $dateTo = $request->input('date_to', $dateFrom);
                $query->whereBetween($dateType, [$dateFrom . ' 00:00:00', $dateTo . ' 23:59:59']);
            }
        }

        // Filtro por expiration_date (apenas em módulos que possuem essa coluna)
        if (in_array('expiration_date', $fillable, true) && ($expirationFrom = $request->input('expiration_date_from'))) {
            $expirationTo = $request->input('expiration_date_to', $expirationFrom);
            $query->whereBetween('expiration_date', [$expirationFrom, $expirationTo]);
        }

        // Filtro por aniversariantes: birth_month_day_from/to no formato MM-DD (ignora ano)
        if (in_array('birth_date', $fillable, true)
            && ($birthFrom = $request->input('birth_month_day_from'))
            && ($birthTo   = $request->input('birth_month_day_to'))
        ) {
            if ($birthFrom <= $birthTo) {
                // Período normal: ex 03-01 até 03-31
                $query->whereRaw("TO_CHAR(birth_date, 'MM-DD') BETWEEN ? AND ?", [$birthFrom, $birthTo]);
            } else {
                // Período com virada de ano: ex 12-20 até 01-10
                $query->where(function ($q) use ($birthFrom, $birthTo) {
                    $q->whereRaw("TO_CHAR(birth_date, 'MM-DD') >= ?", [$birthFrom])
                      ->orWhereRaw("TO_CHAR(birth_date, 'MM-DD') <= ?", [$birthTo]);
                });
            }
        }

        // Filtro por active
        if ($request->has('active')) {
            $query->where('active', $request->boolean('active'));
        }

        // Ordenação
        $sort      = $request->input('sort', 'id');
        $direction = $request->input('direction', 'asc') === 'desc' ? 'desc' : 'asc';
        $allowed   = array_merge(['id', 'created_at', 'updated_at', 'deleted_at'], $fillable);

        $query->orderBy(in_array($sort, $allowed, true) ? $sort : 'id', $direction);

        // Paginação
        $perPage = min(max((int) $request->input('per_page', 10), 1), 100);
        $result  = $query->paginate($perPage);

        return response()->json([
            'data' => $result->items(),
            'meta' => [
                'current_page' => $result->currentPage(),
                'last_page'    => $result->lastPage(),
                'per_page'     => $result->perPage(),
                'total'        => $result->total(),
            ],
        ]);
    }

    public function checkSlug(Request $request): JsonResponse
    {
        $mod        = $this->resolveModule($request->route('module'));
        $modelClass = $this->modelClass($mod);
        $slug       = $request->input('slug', '');
        $excludeId  = $request->input('exclude_id');

        if ($slug === '') {
            return response()->json(['available' => false]);
        }

        $query = $modelClass::where('slug', $slug);

        if ($excludeId) {
            $query->where('id', '!=', (int) $excludeId);
        }

        return response()->json(['available' => ! $query->exists()]);
    }

    public function show(Request $request): JsonResponse
    {
        $mod        = $this->resolveModule($request->route('module'));
        $modelClass = $this->modelClass($mod);
        $id         = (int) $request->route('id');

        $item = $modelClass::withTrashed()->findOrFail($id);

        return response()->json($item);
    }

    public function store(Request $request): JsonResponse
    {
        $mod          = $this->resolveModule($request->route('module'));
        $modelClass   = $this->modelClass($mod);
        $requestClass = $this->requestClass($mod);

        $formRequest = app($requestClass);
        $validated   = $formRequest->validated();

        if (! isset($validated['order'])) {
            $validated['order'] = ($modelClass::max('order') ?? 0) + 1;
        }

        $item = $modelClass::create($validated);

        return response()->json($item, 201);
    }

    public function update(Request $request): JsonResponse
    {
        $mod          = $this->resolveModule($request->route('module'));
        $modelClass   = $this->modelClass($mod);
        $requestClass = $this->requestClass($mod);
        $id           = (int) $request->route('id');

        $item        = $modelClass::findOrFail($id);
        $formRequest = app($requestClass);
        $item->update($formRequest->validated());

        return response()->json($item);
    }

    public function destroy(Request $request): JsonResponse
    {
        $mod        = $this->resolveModule($request->route('module'));
        $modelClass = $this->modelClass($mod);
        $id         = (int) $request->route('id');

        $item         = $modelClass::findOrFail($id);
        $item->active = false;
        $item->save();
        $item->delete();

        return response()->json(['message' => 'Registro deletado com sucesso.']);
    }

    public function restore(Request $request): JsonResponse
    {
        $mod        = $this->resolveModule($request->route('module'));
        $modelClass = $this->modelClass($mod);
        $id         = (int) $request->route('id');

        $item = $modelClass::withTrashed()->findOrFail($id);
        $item->restore();

        return response()->json($item);
    }
}
