<?php

namespace App\Http\Controllers;

use App\Http\Requests\ModuleRequest;
use App\Models\Module;
use Illuminate\Http\JsonResponse;

class ModuleController extends Controller
{
    public function index(): JsonResponse
    {
        $modules = Module::orderBy('order')->orderBy('name')->get();

        return response()->json($modules);
    }

    public function show(int $id): JsonResponse
    {
        $module = Module::withTrashed()->findOrFail($id);

        return response()->json($module);
    }

    public function store(ModuleRequest $request): JsonResponse
    {
        $module = Module::create($request->validated());

        return response()->json($module, 201);
    }

    public function update(ModuleRequest $request, int $id): JsonResponse
    {
        $module = Module::findOrFail($id);
        $module->update($request->validated());

        return response()->json($module);
    }

    public function destroy(int $id): JsonResponse
    {
        $module = Module::findOrFail($id);
        $module->active = false;
        $module->save();
        $module->delete();

        return response()->json(['message' => 'Módulo deletado com sucesso.']);
    }

    public function restore(int $id): JsonResponse
    {
        $module = Module::withTrashed()->findOrFail($id);
        $module->restore();

        return response()->json($module);
    }
}
