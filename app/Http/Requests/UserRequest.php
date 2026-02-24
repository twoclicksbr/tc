<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('user');

        return [
            'person_id' => ['required', 'integer', 'exists:people,id'],

            'email' => [
                'required',
                'email',
                Rule::unique('users', 'email')->ignore($id)->whereNull('deleted_at'),
            ],

            'password' => [
                $id ? 'nullable' : 'required',
                'string',
                'min:8',
            ],

            'active' => ['nullable', 'boolean'],
        ];
    }
}
