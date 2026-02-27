<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->isMethod('POST')) {
            $base = str_replace('-', '_', $this->input('slug', ''));
            $this->merge([
                'db_name'       => $base,
                'sand_user'     => 'sand_' . $base,
                'sand_password' => \Illuminate\Support\Str::random(32),
                'prod_user'     => 'prod_' . $base,
                'prod_password' => \Illuminate\Support\Str::random(32),
                'log_user'      => 'log_' . $base,
                'log_password'  => \Illuminate\Support\Str::random(32),
            ]);
        }
    }

    public function rules(): array
    {
        $tenantId = $this->route('id');

        return [
            'name'            => ['required', 'string', 'max:255'],
            'slug'            => ['required', 'string', 'max:255', 'unique:main.tenants,slug' . ($tenantId ? ',' . $tenantId : '')],
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
