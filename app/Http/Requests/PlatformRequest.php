<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PlatformRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
    }

    public function rules(): array
    {
        $platformId = $this->route('id');

        return [
            'name'            => ['required', 'string', 'max:255'],
            'domain'          => ['required', 'string', 'max:255', 'unique:main.platforms,domain' . ($platformId ? ',' . $platformId : '')],
            'slug'            => ['required', 'string', 'max:255', 'unique:main.platforms,slug' . ($platformId ? ',' . $platformId : '')],
            'db_name'         => ['sometimes', 'required', 'string', 'max:255'],
            'sand_user'       => ['sometimes', 'nullable', 'string', 'max:255'],
            'sand_password'   => ['sometimes', 'nullable', 'string'],
            'prod_user'       => ['sometimes', 'nullable', 'string', 'max:255'],
            'prod_password'   => ['sometimes', 'nullable', 'string'],
            'log_user'        => ['sometimes', 'nullable', 'string', 'max:255'],
            'log_password'    => ['sometimes', 'nullable', 'string'],
            'expiration_date' => ['required', 'date'],
            'order'           => ['integer', 'min:1'],
            'active'          => ['boolean'],
        ];
    }
}
