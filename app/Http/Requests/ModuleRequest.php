<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ModuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('module');

        return [
            'name' => ['required', 'string', 'max:255'],

            'type' => ['required', Rule::in(['modulo', 'submodulo'])],

            'name_table' => [
                'required',
                'string',
                'max:255',
                Rule::unique('modules', 'name_table')->ignore($id)->whereNull('deleted_at'),
            ],

            'name_url' => [
                'required',
                'string',
                'max:255',
                Rule::unique('modules', 'name_url')->ignore($id)->whereNull('deleted_at'),
            ],

            'model'            => ['nullable', 'string', 'max:255'],
            'request'          => ['nullable', 'string', 'max:255'],
            'controller_front' => ['nullable', 'string', 'max:255'],
            'controller_back'  => ['nullable', 'string', 'max:255'],

            'description_index'   => ['nullable', 'string'],
            'description_show'    => ['nullable', 'string'],
            'description_store'   => ['nullable', 'string'],
            'description_update'  => ['nullable', 'string'],
            'description_delete'  => ['nullable', 'string'],
            'description_restore' => ['nullable', 'string'],

            'after_store'   => ['nullable', Rule::in(['index', 'show', 'create', 'edit'])],
            'after_update'  => ['nullable', Rule::in(['index', 'show', 'create', 'edit'])],
            'after_restore' => ['nullable', Rule::in(['index', 'show', 'create', 'edit'])],

            'order'  => ['nullable', 'integer', 'min:1'],
            'active' => ['nullable', 'boolean'],
        ];
    }
}
