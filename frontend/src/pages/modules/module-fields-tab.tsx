import { type CSSProperties, useEffect, useId, useRef, useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Link2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';
import { getTenantSlug } from '@/lib/tenant';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldRow {
  id: number;
  module_id: number;
  name: string;
  label: string;
  type: string;
  length: string | number | null;
  precision: number | null;
  nullable: boolean;
  required: boolean;
  unique: boolean;
  index: boolean;
  min: number | null;
  max: number | null;
  default: string;
  fk_table: string;
  fk_column: string;
  fk_label: string;
  is_custom: boolean;
  owner_level: string;
  owner_id: number;
  active: boolean;
  order: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIELD_TYPES = [
  'STRING', 'INTEGER', 'BIGINT', 'BOOLEAN', 'TEXT',
  'DATE', 'DATETIME', 'DECIMAL', 'FLOAT', 'ENUM', 'JSON',
];

const NO_LENGTH_TYPES   = new Set(['TEXT', 'BOOLEAN', 'DATE', 'DATETIME', 'JSON']);
const TEXT_LENGTH_TYPES = new Set(['DECIMAL', 'FLOAT', 'ENUM']);

// ---------------------------------------------------------------------------
// Normalize — converte record da API para FieldRow
// ---------------------------------------------------------------------------

function normalize(r: Record<string, unknown>): FieldRow {
  return {
    id:        r.id as number,
    module_id: r.module_id as number,
    name:      (r.name as string) ?? '',
    label:     (r.label as string) ?? '',
    type:      ((r.type as string) ?? 'STRING').toUpperCase(),
    length:    (r.length as string | number | null) ?? null,
    precision: (r.precision as number | null) ?? null,
    nullable:  !!(r.nullable),
    required:  !!(r.required),
    unique:    !!(r.unique),
    index:     !!(r.index),
    min:       (r.min as number | null) ?? null,
    max:       (r.max as number | null) ?? null,
    default:   (r.default as string) ?? '',
    fk_table:    (r.fk_table as string) ?? '',
    fk_column:   (r.fk_column as string) ?? '',
    fk_label:    (r.fk_label as string) ?? '',
    is_custom:   !!(r.is_custom),
    owner_level: (r.owner_level as string) ?? 'tenant',
    owner_id:    (r.owner_id as number) ?? 0,
    active:      r.active !== false,
    order:       (r.order as number) ?? 1,
  };
}

// ---------------------------------------------------------------------------
// FkModal
// ---------------------------------------------------------------------------

type ModuleOption = { id: number; name: string; slug: string };
type FieldOption  = { id: number; name: string };

interface FkModalProps {
  open: boolean;
  fkTable: string;
  fkColumn: string;
  fkLabel: string;
  onConfirm: (table: string, column: string, label: string) => void;
  onCancel: () => void;
}

function FkModal({ open, fkTable, fkColumn, fkLabel, onConfirm, onCancel }: FkModalProps) {
  const [modules,        setModules]        = useState<ModuleOption[]>([]);
  const [moduleFields,   setModuleFields]   = useState<FieldOption[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingFields,  setLoadingFields]  = useState(false);
  const [table,  setTable]  = useState('none');
  const [column, setColumn] = useState('none');
  const [label,  setLabel]  = useState('none');

  useEffect(() => {
    if (!open) return;
    setTable(fkTable   || 'none');
    setColumn(fkColumn || 'none');
    setLabel(fkLabel   || 'none');
    setLoadingModules(true);
    apiGet<{ data: ModuleOption[] }>(`/v1/${getTenantSlug()}/modules?per_page=100&sort=order&direction=desc`)
      .then(res => setModules(res.data))
      .catch(() => {})
      .finally(() => setLoadingModules(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (table === 'none' || modules.length === 0) {
      setModuleFields([]);
      return;
    }
    const mod = modules.find(m => m.slug === table);
    if (!mod) return;
    setLoadingFields(true);
    apiGet<{ data: FieldOption[] }>(`/v1/${getTenantSlug()}/module-fields?module_id=${mod.id}&per_page=100&sort=order&direction=asc`)
      .then(res => setModuleFields(res.data))
      .catch(() => {})
      .finally(() => setLoadingFields(false));
  }, [table, modules]);

  function handleTableChange(v: string) {
    setTable(v);
    setColumn('none');
    setLabel('none');
  }

  const fieldsDisabled = table === 'none' || loadingFields;

  return (
    <Dialog open={open} onOpenChange={v => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Chave Estrangeira</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Módulos</label>
            <Select value={table} onValueChange={handleTableChange} disabled={loadingModules}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-sm text-muted-foreground">Selecione</SelectItem>
                {modules.map(m => (
                  <SelectItem key={m.id} value={m.slug} className="text-sm">{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Chave de Conexão</label>
            <Select value={column} onValueChange={setColumn} disabled={fieldsDisabled}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-sm text-muted-foreground">Selecione</SelectItem>
                {moduleFields.map(f => (
                  <SelectItem key={f.id} value={f.name} className="text-sm">{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Texto de Exibição</label>
            <Select value={label} onValueChange={setLabel} disabled={fieldsDisabled}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-sm text-muted-foreground">Selecione</SelectItem>
                {moduleFields.map(f => (
                  <SelectItem key={f.id} value={f.name} className="text-sm">{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onConfirm(
              table  === 'none' ? '' : table,
              column === 'none' ? '' : column,
              label  === 'none' ? '' : label,
            )}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// SortableRow
// ---------------------------------------------------------------------------

interface SortableRowProps {
  field: FieldRow;
  isReadOnly: boolean;
  onChange: (id: number, key: keyof FieldRow, value: unknown) => void;
  onDelete: (id: number) => void;
}

function SortableRow({ field, isReadOnly, onChange, onDelete }: SortableRowProps) {
  const isCustom    = field.is_custom;
  const rowReadOnly = isReadOnly || !isCustom;

  const { attributes, listeners, isDragging, setNodeRef, transform } = useSortable({
    id: String(field.id),
    disabled: rowReadOnly,
  });

  const [fkOpen, setFkOpen] = useState(false);

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0 : 1,
  };

  const isBigint          = field.type === 'BIGINT';
  const lengthDisabled    = NO_LENGTH_TYPES.has(field.type) || rowReadOnly;
  const lengthIsText      = TEXT_LENGTH_TYPES.has(field.type);
  const lengthPlaceholder = field.type === 'ENUM' ? "'a','b','c'" : lengthIsText ? '10,2' : '255';
  const hasFk             = field.fk_table !== '' || field.fk_column !== '' || field.fk_label !== '';

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b hover:bg-muted/20 group ${!isCustom ? 'bg-muted/50' : ''}`}
    >

      {/* Drag handle */}
      <td className="w-8 px-1.5">
        {!rowReadOnly && (
          <span
            className="flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity outline-none focus:outline-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </span>
        )}
      </td>

      {/* Nome */}
      <td className="px-1.5 py-1.5">
        <Input
          value={field.name}
          onChange={e => onChange(field.id, 'name', e.target.value)}
          className="h-8 text-sm font-mono"
          placeholder="field_name"
          disabled={rowReadOnly}
        />
      </td>

      {/* Tipo */}
      <td className="px-1.5 py-1.5" style={{ minWidth: '130px' }}>
        <Select
          value={field.type}
          onValueChange={v => {
            const wasTextLength = TEXT_LENGTH_TYPES.has(field.type);
            const isTextLength  = TEXT_LENGTH_TYPES.has(v);
            const isNoLength    = NO_LENGTH_TYPES.has(v);
            if (isNoLength || isTextLength || wasTextLength || v === 'BIGINT' || field.type === 'BIGINT') {
              onChange(field.id, 'length', null);
            }
            onChange(field.id, 'type', v);
          }}
          disabled={rowReadOnly}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map(t => (
              <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>

      {/* Tamanho / FK */}
      <td className="px-1.5 py-1.5" style={{ width: '96px' }}>
        {isBigint ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`h-8 w-full text-xs gap-1 ${hasFk ? 'border-blue-400 text-blue-600 hover:text-blue-600' : ''}`}
              onClick={() => setFkOpen(true)}
              disabled={rowReadOnly}
            >
              <Link2 className="size-3" />
              FK
            </Button>
            <FkModal
              open={fkOpen}
              fkTable={field.fk_table}
              fkColumn={field.fk_column}
              fkLabel={field.fk_label}
              onConfirm={(table, column, label) => {
                onChange(field.id, 'fk_table',  table);
                onChange(field.id, 'fk_column', column);
                onChange(field.id, 'fk_label',  label);
                setFkOpen(false);
              }}
              onCancel={() => setFkOpen(false)}
            />
          </>
        ) : (
          <Input
            type={lengthIsText ? 'text' : 'number'}
            value={field.length ?? ''}
            onChange={e => onChange(field.id, 'length', e.target.value === '' ? null : (lengthIsText ? e.target.value : parseInt(e.target.value, 10)))}
            className="h-8 text-sm"
            placeholder={lengthPlaceholder}
            disabled={lengthDisabled}
          />
        )}
      </td>

      {/* Nulo */}
      <td className="px-1.5 py-1.5 text-center">
        <Checkbox
          checked={field.nullable}
          onCheckedChange={v => onChange(field.id, 'nullable', !!v)}
          disabled={rowReadOnly}
        />
      </td>

      {/* Obrigatório */}
      <td className="px-1.5 py-1.5 text-center">
        <Checkbox
          checked={field.required}
          onCheckedChange={v => onChange(field.id, 'required', !!v)}
          disabled={rowReadOnly}
        />
      </td>

      {/* Único */}
      <td className="px-1.5 py-1.5 text-center">
        <Checkbox
          checked={field.unique}
          onCheckedChange={v => onChange(field.id, 'unique', !!v)}
          disabled={rowReadOnly}
        />
      </td>

      {/* Índice */}
      <td className="px-1.5 py-1.5 text-center">
        <Checkbox
          checked={field.index}
          onCheckedChange={v => onChange(field.id, 'index', !!v)}
          disabled={rowReadOnly}
        />
      </td>

      {/* Default */}
      <td className="px-1.5 py-1.5">
        <Input
          value={field.default ?? ''}
          onChange={e => onChange(field.id, 'default', e.target.value)}
          className="h-8 text-sm"
          placeholder="—"
          disabled={rowReadOnly}
        />
      </td>

      {/* Ativo */}
      <td className="px-1.5 py-1.5 text-center">
        <Checkbox
          checked={field.active}
          onCheckedChange={v => onChange(field.id, 'active', !!v)}
          disabled={rowReadOnly}
        />
      </td>

      {/* Deletar */}
      <td className="w-8 px-1.5 py-1.5 text-center">
        {!isReadOnly && isCustom && (
          <button
            type="button"
            className="text-destructive opacity-40 hover:opacity-100 transition-opacity"
            onClick={() => onDelete(field.id)}
            title="Remover campo"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// OverlayRow — clone visual para o DragOverlay
// ---------------------------------------------------------------------------

function OverlayRow({ field }: { field: FieldRow }) {
  return (
    <table className="w-full text-sm border border-border rounded-md shadow-lg bg-background">
      <tbody>
        <tr>
          <td className="w-8 px-1.5 py-2">
            <GripVertical className="size-4 text-muted-foreground" />
          </td>
          <td className="px-1.5 py-2 font-mono text-sm">{field.name}</td>
          <td className="px-1.5 py-2 text-sm text-muted-foreground">{field.type}</td>
          <td colSpan={8} />
        </tr>
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Converte FieldRow para payload da API (type em minúsculo)
function toApiPayload(field: FieldRow): Record<string, unknown> {
  return { ...field, type: field.type.toLowerCase() };
}

// Ordena campos: id (primeiro) → custom (por order ASC) → fixed bottom (ordem fixa)
const FIXED_BOTTOM = ['order', 'active', 'created_at', 'updated_at', 'deleted_at'];

function sortFields(fields: FieldRow[]): FieldRow[] {
  return [...fields].sort((a, b) => {
    const aIsId     = a.name === 'id';
    const bIsId     = b.name === 'id';
    const aIsFixed  = FIXED_BOTTOM.includes(a.name);
    const bIsFixed  = FIXED_BOTTOM.includes(b.name);

    if (aIsId && !bIsId) return -1;
    if (!aIsId && bIsId) return 1;
    if (!aIsFixed && !bIsFixed) return a.order - b.order;
    if (!aIsFixed && bIsFixed)  return -1;
    if (aIsFixed  && !bIsFixed) return 1;
    return FIXED_BOTTOM.indexOf(a.name) - FIXED_BOTTOM.indexOf(b.name);
  });
}

// ---------------------------------------------------------------------------
// ModuleFieldsTab
// ---------------------------------------------------------------------------

export interface ModuleFieldsTabProps {
  moduleId: number;
  mode: string;
  active: boolean;
}

export function ModuleFieldsTab({ moduleId, mode }: ModuleFieldsTabProps) {
  const tenant     = getTenantSlug();
  const dndId      = useId();
  const isReadOnly = mode === 'show';

  const [fields,  setFields]  = useState<FieldRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // Ref para sempre ter o estado mais recente nos debounce timers
  const fieldsRef      = useRef<FieldRow[]>([]);
  const debounceTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // Mantém o ref sincronizado com o state
  useEffect(() => { fieldsRef.current = fields; }, [fields]);

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  // ── Carregar campos da API ─────────────────────────────────────────────────

  useEffect(() => {
    if (!moduleId) return;
    setLoading(true);
    apiGet<{ data: Record<string, unknown>[] }>(
      `/v1/${tenant}/module-fields?module_id=${moduleId}&per_page=200&sort=order&direction=asc`,
    )
      .then(res => setFields(sortFields(res.data.map(normalize))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [moduleId, tenant]);

  const fieldIds    = fields.map(f => String(f.id));
  const activeField = activeId ? fields.find(f => String(f.id) === String(activeId)) : null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleChange(id: number, key: keyof FieldRow, value: unknown) {
    // 1. Update local state imediato
    setFields(prev => prev.map(f => f.id === id ? { ...f, [key]: value } : f));

    // 2. Debounce PUT 800ms — usa fieldsRef para pegar o estado mais recente
    const existing = debounceTimers.current.get(id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      debounceTimers.current.delete(id);
      const field = fieldsRef.current.find(f => f.id === id);
      if (field) {
        apiPut(`/v1/${tenant}/module-fields/${id}`, toApiPayload(field))
          .catch(err => console.error('[ModuleFieldsTab] Erro ao atualizar campo:', err));
      }
    }, 800);
    debounceTimers.current.set(id, timer);
  }

  async function handleAdd() {
    try {
      const saved = await apiPost<Record<string, unknown>>(`/v1/${tenant}/module-fields`, {
        module_id:   moduleId,
        name:        `campo_${Date.now()}`,
        label:       'Novo Campo',
        type:        'string',
        length:      255,
        nullable:    true,
        required:    false,
        unique:      false,
        index:       false,
        main:        false,
        is_custom:   true,
        owner_level: 'tenant',
        owner_id:    0,
        order:       1,
        active:      true,
      });
      setFields(prev => sortFields([...prev, normalize(saved)]));
    } catch (err) {
      console.error('[ModuleFieldsTab] Erro ao criar campo:', err);
    }
  }

  async function handleDelete(id: number) {
    try {
      await apiDelete(`/v1/${tenant}/module-fields/${id}`);
      setFields(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error('[ModuleFieldsTab] Erro ao deletar campo:', err);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    (document.activeElement as HTMLElement)?.blur();
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex(f => String(f.id) === String(active.id));
    const newIndex = fields.findIndex(f => String(f.id) === String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(fields, oldIndex, newIndex);

    // Redistribui os valores de order existentes dos campos custom entre as novas posições.
    // sortFields usa order ASC para campos custom: menor order = visualmente primeiro.
    const oldCustomOrders = fields
      .filter(f => f.is_custom)
      .sort((a, b) => a.order - b.order)
      .map(f => f.order);

    let ci = 0;
    const newFields = reordered.map(f =>
      f.is_custom ? { ...f, order: oldCustomOrders[ci++] } : f,
    );

    const orderMap = new Map(fields.map(f => [f.id, f.order]));
    const changed  = newFields.filter(f => f.order !== orderMap.get(f.id));

    setFields(sortFields(newFields));

    try {
      await Promise.all(
        changed.map(f => apiPut(`/v1/${tenant}/module-fields/${f.id}`, { order: f.order })),
      );
    } catch (err) {
      console.error('[ModuleFieldsTab] Erro ao reordenar campos:', err);
      // rollback: recarrega do banco
      apiGet<{ data: Record<string, unknown>[] }>(
        `/v1/${tenant}/module-fields?module_id=${moduleId}&per_page=200&sort=order&direction=asc`,
      ).then(res => setFields(sortFields(res.data.map(normalize)))).catch(() => {});
    }
  }

  function handleDragCancel() {
    setActiveId(null);
    (document.activeElement as HTMLElement)?.blur();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Carregando campos...
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 ${isReadOnly ? 'pointer-events-none opacity-60' : ''}`}>

      <DndContext
        id={dndId}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted border-b">
                <th className="w-8" />
                <th className="px-2 py-2.5 text-left text-sm font-semibold text-muted-foreground">Nome</th>
                <th className="px-2 py-2.5 text-left text-sm font-semibold text-muted-foreground">Tipo</th>
                <th className="px-2 py-2.5 text-left text-sm font-semibold text-muted-foreground" style={{ width: '96px' }}>Tamanho</th>
                <th className="px-2 py-2.5 text-center text-sm font-semibold text-muted-foreground" style={{ width: '52px' }}>Nulo</th>
                <th className="px-2 py-2.5 text-center text-sm font-semibold text-muted-foreground" style={{ width: '76px' }}>Obrigatório</th>
                <th className="px-2 py-2.5 text-center text-sm font-semibold text-muted-foreground" style={{ width: '52px' }}>Único</th>
                <th className="px-2 py-2.5 text-center text-sm font-semibold text-muted-foreground" style={{ width: '52px' }}>Índice</th>
                <th className="px-2 py-2.5 text-left text-sm font-semibold text-muted-foreground">Default</th>
                <th className="px-2 py-2.5 text-center text-sm font-semibold text-muted-foreground" style={{ width: '52px' }}>Ativo</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
                {fields.map(field => (
                  <SortableRow
                    key={field.id}
                    field={field}
                    isReadOnly={isReadOnly}
                    onChange={handleChange}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>

              {fields.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-sm text-muted-foreground">
                    Nenhum campo cadastrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeField ? <OverlayRow field={activeField} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Botão Adicionar Campo */}
      {!isReadOnly && (
        <button
          type="button"
          onClick={handleAdd}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <Plus className="size-4" />
          Adicionar Campo
        </button>
      )}

    </div>
  );
}
