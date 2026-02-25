<?php

namespace App\Http\Controllers;

use App\Models\Module;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ModuleController extends Controller
{
    private function resolveModule(string $nameUrl): Module
    {
        $module = Module::where('name_url', $nameUrl)->first();

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

    public function index(Request $request): JsonResponse
    {
        $mod        = $this->resolveModule($request->route('module'));
        $modelClass = $this->modelClass($mod);
        $instance   = new $modelClass;

        $query = $modelClass::query();

        // Ordenação
        $sort      = $request->input('sort', 'id');
        $direction = $request->input('direction', 'asc') === 'desc' ? 'desc' : 'asc';
        $allowed   = array_merge(['id', 'created_at', 'updated_at'], $instance->getFillable());

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
