<?php

namespace App\Http\Controllers;

use App\Http\Requests\PersonRequest;
use App\Models\Person;
use Illuminate\Http\JsonResponse;

class PersonController extends Controller
{
    public function index(): JsonResponse
    {
        $people = Person::orderBy('order')->orderBy('name')->get();

        return response()->json($people);
    }

    public function show(int $id): JsonResponse
    {
        $person = Person::withTrashed()->findOrFail($id);

        return response()->json($person);
    }

    public function store(PersonRequest $request): JsonResponse
    {
        $person = Person::create($request->validated());

        return response()->json($person, 201);
    }

    public function update(PersonRequest $request, int $id): JsonResponse
    {
        $person = Person::findOrFail($id);
        $person->update($request->validated());

        return response()->json($person);
    }

    public function destroy(int $id): JsonResponse
    {
        $person = Person::findOrFail($id);
        $person->active = false;
        $person->save();
        $person->delete();

        return response()->json(['message' => 'Pessoa deletada com sucesso.']);
    }

    public function restore(int $id): JsonResponse
    {
        $person = Person::withTrashed()->findOrFail($id);
        $person->restore();

        return response()->json($person);
    }
}
