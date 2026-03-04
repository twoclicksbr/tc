import { type CSSProperties, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  useDndSensors,
  dndAccessibility,
  DndOverlayPortal,
  SortableRowCtx,
  useSortableRow,
  DragHandle,
} from '@/lib/dnd-config';
import { AlertTriangle, CheckCircle2, Database, GripVertical, Link2, Plus, Trash2 } from 'lucide-react';
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
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldForEdit {
  id: number | null;
  module_id: number;
  name: string;
  type: string;
  length: string | null;
  nullable: boolean;
  default: string | null;
  unique: boolean;
  index: boolean;
  fk_table: string | null;
  fk_column: string | null;
  is_system: boolean;
  order: number;
  active: boolean;
}

// ---------------------------------------------------------------------------
// TableStatus types
// ---------------------------------------------------------------------------

interface TableStatusChange {
  field:  string;
  status: 'new' | 'altered' | 'removed' | 'synced';
  detail: string | null;
}

interface DangerousChange {
  field:  string;
  reason: string;
}

interface TableStatus {
  table_exists:        boolean;
  table_name:          string;
  changes:             TableStatusChange[];
  has_pending_changes: boolean;
  dangerous_changes:   DangerousChange[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIELD_TYPES = [
  'string', 'text', 'integer', 'bigint', 'boolean', 'date', 'datetime', 'decimal', 'enum',
];

const NO_LENGTH_TYPES = new Set(['text', 'boolean', 'date', 'datetime', 'integer', 'bigint']);

// ---------------------------------------------------------------------------
// Normalize — converte record da API para FieldForEdit
// ---------------------------------------------------------------------------

function normalize(r: Record<string, unknown>): FieldForEdit {
  return {
    id:        (r.id as number) ?? null,
    module_id: r.module_id as number,
    name:      (r.name as string) ?? '',
    type:      ((r.type as string) ?? 'string').toLowerCase(),
    length:    (r.length as string | null) ?? null,
    nullable:  !!(r.nullable),
    default:   (r.default as string | null) ?? null,
    unique:    !!(r.unique),
    index:     !!(r.index),
    fk_table:  (r.fk_table as string | null) ?? null,
    fk_column: (r.fk_column as string | null) ?? null,
    is_system: !!(r.is_system),
    order:     (r.order as number) ?? 1,
    active:    r.active !== false,
  };
}

// ---------------------------------------------------------------------------
// toApiPayload
// ---------------------------------------------------------------------------

function toApiPayload(field: FieldForEdit): Record<string, unknown> {
  return {
    module_id:  field.module_id,
    name:       field.name,
    type:       field.type,
    length:     field.length,
    nullable:   field.nullable,
    default:    field.default,
    unique:     field.unique,
    index:      field.index,
    fk_table:   field.fk_table,
    fk_column:  field.fk_column,
    is_system:  field.is_system,
    order:      field.order,
    active:     field.active,
  };
}

// ---------------------------------------------------------------------------
// Ordena: id (primeiro) → editáveis (por order ASC) → sistema rodapé
// ---------------------------------------------------------------------------

const FIXED_BOTTOM = ['order', 'active', 'created_at', 'updated_at', 'deleted_at'];

function sortFields(fields: FieldForEdit[]): FieldForEdit[] {
  return [...fields].sort((a, b) => {
    const aIsId    = a.name === 'id';
    const bIsId    = b.name === 'id';
    const aIsFixed = a.is_system && a.name !== 'id';
    const bIsFixed = b.is_system && b.name !== 'id';

    if (aIsId && !bIsId) return -1;
    if (!aIsId && bIsId) return 1;
    if (!aIsFixed && !bIsFixed) return a.order - b.order;
    if (!aIsFixed && bIsFixed)  return -1;
    if (aIsFixed  && !bIsFixed) return 1;
    return FIXED_BOTTOM.indexOf(a.name) - FIXED_BOTTOM.indexOf(b.name);
  });
}

// ---------------------------------------------------------------------------
// FkModal
// ---------------------------------------------------------------------------

type ModuleOption = { id: number; name: string; slug: string };
type FieldOption  = { id: number; name: string };

interface FkModalProps {
  open: boolean;
  fkTable: string | null;
  fkColumn: string | null;
  onConfirm: (table: string, column: string) => void;
  onCancel: () => void;
}

function FkModal({ open, fkTable, fkColumn, onConfirm, onCancel }: FkModalProps) {
  const [modules,        setModules]        = useState<ModuleOption[]>([]);
  const [moduleFields,   setModuleFields]   = useState<FieldOption[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingFields,  setLoadingFields]  = useState(false);
  const [table,  setTable]  = useState('none');
  const [column, setColumn] = useState('none');

  useEffect(() => {
    if (!open) return;
    setTable(fkTable  || 'none');
    setColumn(fkColumn || 'none');
    setLoadingModules(true);
    apiGet<{ data: ModuleOption[] }>(`/v1/modules?per_page=100&sort=order&direction=desc`)
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
    apiGet<{ data: FieldOption[] }>(`/v1/module-fields?module_id=${mod.id}&per_page=100&sort=order&direction=asc`)
      .then(res => setModuleFields(res.data))
      .catch(() => {})
      .finally(() => setLoadingFields(false));
  }, [table, modules]);

  function handleTableChange(v: string) {
    setTable(v);
    setColumn('none');
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
            <label className="text-sm font-medium">Módulo</label>
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

        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onConfirm(
              table  === 'none' ? '' : table,
              column === 'none' ? '' : column,
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
// SystemFieldRow — campo de sistema (read-only, sem drag, sem delete)
// ---------------------------------------------------------------------------

function SystemFieldRow({ field }: { field: FieldForEdit }) {
  const isBigint = field.type === 'bigint';

  return (
    <tr className="border-b bg-muted/30">
      {/* Drag handle — vazio */}
      <td className="w-8 px-1.5" />

      {/* Nome */}
      <td className="px-1.5 py-1.5">
        <Input value={field.name} className="h-8 text-sm font-mono opacity-60" disabled />
      </td>

      {/* Tipo */}
      <td className="px-1.5 py-1.5" style={{ minWidth: '130px' }}>
        <Input value={field.type} className="h-8 text-sm opacity-60" disabled />
      </td>

      {/* Tamanho */}
      <td className="px-1.5 py-1.5" style={{ width: '96px' }}>
        <Input value={field.length ?? ''} className="h-8 text-sm opacity-60" disabled />
      </td>

      {/* Nulo */}
      <td className="px-1.5 py-1.5 text-center">
        <Checkbox checked={field.nullable} disabled />
      </td>

      {/* Default */}
      <td className="px-1.5 py-1.5">
        <Input value={field.default ?? ''} className="h-8 text-sm opacity-60" disabled />
      </td>

      {/* Único */}
      <td className="px-1.5 py-1.5 text-center">
        <Checkbox checked={field.unique} disabled />
      </td>

      {/* Índice */}
      <td className="px-1.5 py-1.5 text-center">
        <Checkbox checked={field.index} disabled />
      </td>

      {/* FK */}
      <td className="px-1.5 py-1.5 text-center" style={{ width: '60px' }}>
        {isBigint && field.fk_table && (
          <span className="text-xs text-blue-500 font-mono">{field.fk_table}</span>
        )}
      </td>

      {/* Ações — vazio */}
      <td className="w-8 px-1.5 py-1.5" />
    </tr>
  );
}

// ---------------------------------------------------------------------------
// FieldTableRow — campo editável (não-sistema)
// ---------------------------------------------------------------------------

interface FieldTableRowProps {
  field: FieldForEdit;
  isReadOnly: boolean;
  onChange: (id: number, key: keyof FieldForEdit, value: unknown) => void;
  onDelete: (id: number) => void;
}

function FieldTableRow({ field, isReadOnly, onChange, onDelete }: FieldTableRowProps) {
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } = useSortableRow(String(field.id));
  const [fkOpen, setFkOpen] = useState(false);

  const style: CSSProperties = { transform, transition, opacity: isDragging ? 0.4 : 1 };

  const isBigint       = field.type === 'bigint';
  const lengthDisabled = NO_LENGTH_TYPES.has(field.type) || isReadOnly;
  const hasFk          = !!(field.fk_table || field.fk_column);

  const id = field.id!;

  return (
    <SortableRowCtx.Provider value={{ attributes, listeners, isDragging }}>
      <tr
        ref={setNodeRef}
        style={style}
        className="border-b hover:bg-muted/20 group"
      >

        {/* Drag handle */}
        <td className="w-8 px-1.5">
          <DragHandle disabled={isReadOnly} />
        </td>

        {/* Nome */}
        <td className="px-1.5 py-1.5">
          <Input
            value={field.name}
            onChange={e => onChange(id, 'name', e.target.value)}
            className="h-8 text-sm font-mono"
            placeholder="field_name"
            disabled={isReadOnly}
          />
        </td>

        {/* Tipo */}
        <td className="px-1.5 py-1.5" style={{ minWidth: '130px' }}>
          <Select
            value={field.type}
            onValueChange={v => {
              onChange(id, 'type', v);
              if (v === 'bigint') onChange(id, 'index', true);
              if (NO_LENGTH_TYPES.has(v)) onChange(id, 'length', null);
            }}
            disabled={isReadOnly}
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

        {/* Tamanho */}
        <td className="px-1.5 py-1.5" style={{ width: '96px' }}>
          <Input
            type="text"
            value={field.length ?? ''}
            onChange={e => onChange(id, 'length', e.target.value || null)}
            className="h-8 text-sm"
            placeholder="255 ou 10,2"
            disabled={lengthDisabled}
          />
        </td>

        {/* Nulo */}
        <td className="px-1.5 py-1.5 text-center">
          <Checkbox
            checked={field.nullable}
            onCheckedChange={v => onChange(id, 'nullable', !!v)}
            disabled={isReadOnly}
          />
        </td>

        {/* Default */}
        <td className="px-1.5 py-1.5">
          <Input
            value={field.default ?? ''}
            onChange={e => onChange(id, 'default', e.target.value || null)}
            className="h-8 text-sm"
            placeholder="—"
            disabled={isReadOnly}
          />
        </td>

        {/* Único */}
        <td className="px-1.5 py-1.5 text-center">
          <Checkbox
            checked={field.unique}
            onCheckedChange={v => onChange(id, 'unique', !!v)}
            disabled={isReadOnly}
          />
        </td>

        {/* Índice */}
        <td className="px-1.5 py-1.5 text-center">
          <Checkbox
            checked={field.index}
            onCheckedChange={v => onChange(id, 'index', !!v)}
            disabled={isReadOnly}
          />
        </td>

        {/* FK */}
        <td className="px-1.5 py-1.5 text-center" style={{ width: '60px' }}>
          {isBigint && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`h-8 w-full text-xs gap-1 ${hasFk ? 'border-blue-400 text-blue-600 hover:text-blue-600' : ''}`}
                onClick={() => setFkOpen(true)}
                disabled={isReadOnly}
              >
                <Link2 className="size-3" />
                FK
              </Button>
              <FkModal
                open={fkOpen}
                fkTable={field.fk_table}
                fkColumn={field.fk_column}
                onConfirm={(table, column) => {
                  onChange(id, 'fk_table',  table || null);
                  onChange(id, 'fk_column', column || null);
                  setFkOpen(false);
                }}
                onCancel={() => setFkOpen(false)}
              />
            </>
          )}
        </td>

        {/* Deletar */}
        <td className="w-8 px-1.5 py-1.5 text-center">
          {!isReadOnly && (
            <button
              type="button"
              className="text-destructive opacity-40 hover:opacity-100 transition-opacity"
              onClick={() => onDelete(id)}
              title="Remover campo"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </td>
      </tr>
    </SortableRowCtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// GenerateTableModal
// ---------------------------------------------------------------------------

interface GenerateTableModalProps {
  open:                   boolean;
  status:                 TableStatus | null;
  loading:                boolean;
  generating:             boolean;
  dangerConfirmed:        boolean;
  onConfirm:              () => void;
  onCancel:               () => void;
  onDangerConfirmedChange: (v: boolean) => void;
}

function GenerateTableModal({
  open, status, loading, generating,
  dangerConfirmed, onConfirm, onCancel, onDangerConfirmedChange,
}: GenerateTableModalProps) {
  const tableExists  = status?.table_exists ?? false;
  const hasChanges   = status?.has_pending_changes ?? false;
  const tableName    = status?.table_name ?? '';
  const hasDanger    = (status?.dangerous_changes?.length ?? 0) > 0;
  const canApply     = !hasDanger || dangerConfirmed;
  const pendingChanges = (status?.changes ?? []).filter(c => c.status !== 'synced');

  const title = !tableExists
    ? `Criar tabela \`${tableName}\``
    : hasChanges
    ? `Alterações pendentes — \`${tableName}\``
    : `Status da tabela \`${tableName}\``;

  return (
    <Dialog open={open} onOpenChange={v => !v && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando status...</p>
          )}

          {!loading && status && (
            <>
              {/* Synced */}
              {tableExists && !hasChanges && (
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="size-4" />
                  A tabela está sincronizada. Nenhuma alteração necessária.
                </div>
              )}

              {/* Create — lista de campos novos */}
              {!tableExists && (
                <>
                  <p className="text-sm text-muted-foreground">
                    A tabela será criada com <strong>{pendingChanges.length}</strong> campos.
                  </p>
                  <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto text-xs font-mono text-success">
                    {pendingChanges.map(c => (
                      <li key={c.field} className="flex items-center gap-2">
                        <span>+</span>
                        <span>{c.field}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* Alter — lista de mudanças */}
              {tableExists && hasChanges && (
                <ul className="flex flex-col gap-1.5 max-h-52 overflow-y-auto text-xs font-mono">
                  {pendingChanges.map(c => {
                    const color = c.status === 'new'
                      ? 'text-success'
                      : c.status === 'altered'
                      ? 'text-warning'
                      : 'text-destructive';
                    const icon = c.status === 'new' ? '+' : c.status === 'altered' ? '△' : '×';
                    return (
                      <li key={c.field} className={`flex flex-col gap-0.5 ${color}`}>
                        <span><strong>{icon} {c.field}</strong></span>
                        {c.detail && (
                          <span className="pl-3 text-muted-foreground break-all">{c.detail}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Dangerous changes */}
              {hasDanger && (
                <div className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                    <AlertTriangle className="size-4" />
                    Alterações de risco
                  </div>
                  <ul className="flex flex-col gap-1 text-xs text-destructive">
                    {status!.dangerous_changes.map(d => (
                      <li key={d.field} className="flex gap-2">
                        <span className="font-mono font-semibold shrink-0">{d.field}:</span>
                        <span>{d.reason}</span>
                      </li>
                    ))}
                  </ul>
                  <label className="flex items-center gap-2 cursor-pointer text-sm mt-1">
                    <Checkbox
                      checked={dangerConfirmed}
                      onCheckedChange={v => onDangerConfirmedChange(!!v)}
                    />
                    Confirmo que entendo os riscos das alterações acima
                  </label>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={generating}>
            {tableExists && !hasChanges ? 'Fechar' : 'Cancelar'}
          </Button>
          {(tableExists ? hasChanges : true) && (
            <Button
              variant="primary"
              size="sm"
              onClick={onConfirm}
              disabled={!canApply || generating || loading}
            >
              {generating ? 'Gerando...' : tableExists ? 'Aplicar Alterações' : 'Criar Tabela'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
  const tabDndId   = useId();
  const sensors    = useDndSensors();
  const isReadOnly = mode === 'show';

  const [fields,          setFields]          = useState<FieldForEdit[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [activeId,        setActiveId]        = useState<UniqueIdentifier | null>(null);
  const [tableStatus,     setTableStatus]     = useState<TableStatus | null>(null);
  const [statusLoading,   setStatusLoading]   = useState(false);
  const [genModalOpen,    setGenModalOpen]    = useState(false);
  const [generating,      setGenerating]      = useState(false);
  const [dangerConfirmed, setDangerConfirmed] = useState(false);

  const fieldsRef      = useRef<FieldForEdit[]>([]);
  const debounceTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => { fieldsRef.current = fields; }, [fields]);

  const nonSystemIds = useMemo(
    () => fields.filter(f => !f.is_system).map(f => String(f.id)),
    [fields],
  );

  const activeField = useMemo(
    () => activeId ? fields.find(f => String(f.id) === String(activeId)) ?? null : null,
    [activeId, fields],
  );

  // ── Carregar campos da API ─────────────────────────────────────────────────

  useEffect(() => {
    if (!moduleId) return;
    setLoading(true);
    apiGet<{ data: Record<string, unknown>[] }>(
      `/v1/module-fields?module_id=${moduleId}&per_page=200&sort=order&direction=asc`,
    )
      .then(res => setFields(sortFields(res.data.map(normalize))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [moduleId]);

  // ── Table status ───────────────────────────────────────────────────────────

  function fetchTableStatus() {
    setStatusLoading(true);
    apiGet<TableStatus>(`/v1/modules/${moduleId}/table-status`)
      .then(setTableStatus)
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }

  useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
    if (!moduleId) return;
    fetchTableStatus();
  }, [moduleId]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleChange(id: number, key: keyof FieldForEdit, value: unknown) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, [key]: value } : f));

    const existing = debounceTimers.current.get(id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      debounceTimers.current.delete(id);
      const field = fieldsRef.current.find(f => f.id === id);
      if (field) {
        apiPut(`/v1/module-fields/${id}`, toApiPayload(field))
          .catch(err => console.error('[ModuleFieldsTab] Erro ao atualizar campo:', err));
      }
    }, 800);
    debounceTimers.current.set(id, timer);
  }

  async function handleAdd() {
    const nonSystemFields = fields.filter(f => !f.is_system);
    const maxOrder = nonSystemFields.length > 0
      ? Math.max(...nonSystemFields.map(f => f.order))
      : 1;

    try {
      const saved = await apiPost<Record<string, unknown>>(`/v1/module-fields`, {
        module_id:  moduleId,
        name:       `campo_${Date.now()}`,
        type:       'string',
        length:     '255',
        nullable:   true,
        unique:     false,
        index:      false,
        is_system:  false,
        order:      maxOrder + 1,
        active:     true,
      });
      setFields(prev => sortFields([...prev, normalize(saved)]));
    } catch (err) {
      console.error('[ModuleFieldsTab] Erro ao criar campo:', err);
    }
  }

  async function handleDelete(id: number) {
    try {
      await apiDelete(`/v1/module-fields/${id}`);
      setFields(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error('[ModuleFieldsTab] Erro ao deletar campo:', err);
    }
  }

  function handleOpenModal() {
    setDangerConfirmed(false);
    setGenModalOpen(true);
    fetchTableStatus();
  }

  async function handleGenerateTable() {
    setGenerating(true);
    try {
      await apiPost(`/v1/modules/${moduleId}/generate-table`, {
        confirm_dangerous: dangerConfirmed,
      });
      toast.success('Tabela gerada com sucesso!');
      setGenModalOpen(false);
      fetchTableStatus();
    } catch {
      toast.error('Erro ao gerar tabela.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    (document.activeElement as HTMLElement)?.blur();
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const nonSystemFields = fields.filter(f => !f.is_system);
    const oldIndex = nonSystemFields.findIndex(f => String(f.id) === String(active.id));
    const newIndex = nonSystemFields.findIndex(f => String(f.id) === String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(nonSystemFields, oldIndex, newIndex);

    const oldOrders = [...nonSystemFields]
      .sort((a, b) => a.order - b.order)
      .map(f => f.order);

    let ci = 0;
    const updatedNonSystem = reordered.map(f => ({ ...f, order: oldOrders[ci++] }));

    const orderMap = new Map(nonSystemFields.map(f => [f.id, f.order]));
    const changed  = updatedNonSystem.filter(f => f.order !== orderMap.get(f.id));

    const systemFields = fields.filter(f => f.is_system);
    setFields(sortFields([...systemFields, ...updatedNonSystem]));

    try {
      await Promise.all(
        changed.map(f => apiPut(`/v1/module-fields/${f.id}`, toApiPayload(f))),
      );
    } catch (err) {
      console.error('[ModuleFieldsTab] Erro ao reordenar campos:', err);
      apiGet<{ data: Record<string, unknown>[] }>(
        `/v1/module-fields?module_id=${moduleId}&per_page=200&sort=order&direction=asc`,
      ).then(res => setFields(sortFields(res.data.map(normalize)))).catch(() => {});
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const systemTopFields    = fields.filter(f => f.is_system && f.name === 'id');
  const nonSystemFields    = fields.filter(f => !f.is_system);
  const systemBottomFields = fields.filter(f => f.is_system && f.name !== 'id');

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Carregando campos...
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 ${isReadOnly ? 'pointer-events-none opacity-60' : ''}`}>

      {/* Header: status badge + botão Gerar Tabela */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {statusLoading && (
            <span className="text-xs text-muted-foreground">Verificando tabela...</span>
          )}
          {!statusLoading && tableStatus && (
            tableStatus.table_exists
              ? tableStatus.has_pending_changes
                ? <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                    {tableStatus.changes.filter(c => c.status !== 'synced').length} pendentes
                  </span>
                : <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                    <CheckCircle2 className="size-3" />
                    Sincronizado
                  </span>
              : <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                  Tabela não existe
                </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleOpenModal}
          disabled={statusLoading}
        >
          <Database className="size-4" />
          Gerar Tabela
        </Button>
      </div>

      <DndContext
        id={tabDndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        accessibility={dndAccessibility}
        onDragStart={(e) => setActiveId(e.active.id)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
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
                <th className="px-2 py-2.5 text-left text-sm font-semibold text-muted-foreground">Default</th>
                <th className="px-2 py-2.5 text-center text-sm font-semibold text-muted-foreground" style={{ width: '52px' }}>Único</th>
                <th className="px-2 py-2.5 text-center text-sm font-semibold text-muted-foreground" style={{ width: '52px' }}>Índice</th>
                <th className="px-2 py-2.5 text-center text-sm font-semibold text-muted-foreground" style={{ width: '60px' }}>FK</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {/* Campos sistema — topo (id) */}
              {systemTopFields.map(f => <SystemFieldRow key={f.id} field={f} />)}

              {/* Campos editáveis — DnD */}
              <SortableContext items={nonSystemIds} strategy={verticalListSortingStrategy}>
                {nonSystemFields.map(field => (
                  <FieldTableRow
                    key={field.id}
                    field={field}
                    isReadOnly={isReadOnly}
                    onChange={handleChange}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>

              {/* Campos sistema — rodapé */}
              {systemBottomFields.map(f => <SystemFieldRow key={f.id} field={f} />)}

              {fields.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-sm text-muted-foreground">
                    Nenhum campo cadastrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DndOverlayPortal>
          {activeField ? (
            <table className="w-full text-sm border border-border rounded-md shadow-lg bg-background">
              <tbody>
                <tr>
                  <td className="w-8 px-1.5 py-2">
                    <GripVertical className="size-4 text-muted-foreground" />
                  </td>
                  <td className="px-1.5 py-2 font-mono text-sm">{activeField.name}</td>
                  <td className="px-1.5 py-2 text-sm text-muted-foreground">{activeField.type}</td>
                  <td colSpan={7} />
                </tr>
              </tbody>
            </table>
          ) : null}
        </DndOverlayPortal>
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

      <GenerateTableModal
        open={genModalOpen}
        status={tableStatus}
        loading={statusLoading}
        generating={generating}
        dangerConfirmed={dangerConfirmed}
        onConfirm={handleGenerateTable}
        onCancel={() => setGenModalOpen(false)}
        onDangerConfirmedChange={setDangerConfirmed}
      />

    </div>
  );
}
