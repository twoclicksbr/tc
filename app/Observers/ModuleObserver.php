<?php

namespace App\Observers;

use App\Models\Module;
use App\Models\ModuleField;

class ModuleObserver
{
    public function created(Module $module): void
    {
        if (ModuleField::where('module_id', $module->id)->exists()) {
            return;
        }

        $defaults = [
            ['name' => 'id',         'label' => 'ID',          'type' => 'bigint',   'nullable' => false, 'required' => true,  'unique' => true,  'index' => true,  'default' => null,   'order' => 1],
            ['name' => 'order',      'label' => 'Ordem',       'type' => 'integer',  'nullable' => false, 'required' => false, 'unique' => false, 'index' => false, 'default' => '1',    'order' => 2],
            ['name' => 'active',     'label' => 'Ativo',       'type' => 'boolean',  'nullable' => false, 'required' => false, 'unique' => false, 'index' => false, 'default' => 'true', 'order' => 3],
            ['name' => 'created_at', 'label' => 'Criado em',   'type' => 'datetime', 'nullable' => true,  'required' => false, 'unique' => false, 'index' => false, 'default' => null,   'order' => 4],
            ['name' => 'updated_at', 'label' => 'Alterado em', 'type' => 'datetime', 'nullable' => true,  'required' => false, 'unique' => false, 'index' => false, 'default' => null,   'order' => 5],
            ['name' => 'deleted_at', 'label' => 'Deletado em', 'type' => 'datetime', 'nullable' => true,  'required' => false, 'unique' => false, 'index' => false, 'default' => null,   'order' => 6],
        ];

        foreach ($defaults as $field) {
            ModuleField::create([
                'module_id'   => $module->id,
                'name'        => $field['name'],
                'label'       => $field['label'],
                'type'        => $field['type'],
                'nullable'    => $field['nullable'],
                'required'    => $field['required'],
                'unique'      => $field['unique'],
                'index'       => $field['index'],
                'default'     => $field['default'],
                'main'        => true,
                'is_custom'   => false,
                'owner_level' => $module->owner_level,
                'owner_id'    => $module->owner_id,
                'active'      => true,
                'order'       => $field['order'],
            ]);
        }
    }
}
