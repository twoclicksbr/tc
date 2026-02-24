<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PersonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'       => ['required', 'string', 'max:255'],
            'birth_date' => ['required', 'date'],
            'order'      => ['nullable', 'integer', 'min:1'],
            'active'     => ['nullable', 'boolean'],
        ];
    }
}
