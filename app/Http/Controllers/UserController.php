<?php

namespace App\Http\Controllers;

use App\Http\Requests\UserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::orderBy('id')->get();

        return response()->json($users);
    }

    public function show(int $id): JsonResponse
    {
        $user = User::withTrashed()->findOrFail($id);

        return response()->json($user);
    }

    public function store(UserRequest $request): JsonResponse
    {
        $user = User::create($request->validated());

        return response()->json($user, 201);
    }

    public function update(UserRequest $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $data = $request->validated();

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);

        return response()->json($user);
    }

    public function destroy(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->active = false;
        $user->save();
        $user->delete();

        return response()->json(['message' => 'Usuário deletado com sucesso.']);
    }

    public function restore(int $id): JsonResponse
    {
        $user = User::withTrashed()->findOrFail($id);
        $user->restore();

        return response()->json($user);
    }
}
