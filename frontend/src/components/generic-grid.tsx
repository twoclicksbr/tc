import { type ComponentType, useCallback, useEffect, useMemo, useState } from 'react';
import {
  type ColumnDef,
  getCoreRowModel,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { type DragEndEvent, type UniqueIdentifier } from '@dnd-kit/core';
import { arrayMove, useSortable } from '@dnd-kit/sortable';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Eye,
  GripVertical,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridTableDndRows } from '@/components/ui/data-grid-table-dnd-rows';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { apiGet, apiPut } from '@/lib/api';
import { getTenantSlug } from '@/lib/tenant';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RowMode = 'create' | 'edit' | 'show' | 'delete' | 'restore';

interface ModuleConfig {
  id: number;
  name: string;
  name_url: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export interface ColumnConfig {
  key: string;
  label: string;
  sortable?: boolean;
  type?: 'text' | 'date' | 'datetime' | 'badge' | 'boolean' | 'currency';
  width?: string;
  alignHead?: 'start' | 'center' | 'end';
  alignBody?: 'start' | 'center' | 'end';
  badgeOptions?: Record<string, { label: string; variant: string }>;
}

export interface GenericGridProps {
  moduleId: number;
  columns: ColumnConfig[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modalComponent: ComponentType<any>;
  modalSize?: 'p' | 'm' | 'g';

  // Colunas padrão
  showDrag?: boolean;
  showCheckbox?: boolean;
  showId?: boolean;
  showActive?: boolean;

  // Ações por linha
  showActions?: boolean;
  showActionEdit?: boolean;
  showActionDelete?: boolean;
  showActionShow?: boolean;
  showActionRestore?: boolean;

  // Botões do topo
  showBtnNew?: boolean;
  showBtnSearch?: boolean;
  showBtnExport?: boolean;

  // Ações em massa
  showBulkActions?: boolean;

  // Paginação
  showPagination?: boolean;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatDate(value: unknown): string {
  if (!value) return '—';
  return new Date(value as string).toLocaleDateString('pt-BR');
}

function formatDatetime(value: unknown): string {
  if (!value) return '—';
  return new Date(value as string).toLocaleString('pt-BR');
}

function formatCurrency(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function parseWidthPx(width?: string): number | undefined {
  if (!width || !width.endsWith('px')) return undefined;
  const num = parseInt(width, 10);
  return isNaN(num) ? undefined : num;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ChevronUp className="size-3.5" />;
  if (sorted === 'desc') return <ChevronDown className="size-3.5" />;
  return <ChevronsUpDown className="size-3.5 opacity-40" />;
}

function DragHandle({ rowId }: { rowId: string }) {
  const { attributes, listeners, isDragging } = useSortable({ id: rowId });
  return (
    <TooltipProvider>
      <Tooltip open={isDragging ? false : undefined}>
        <TooltipTrigger asChild>
          <span
            className="flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">Arrastar para reordenar</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Align helpers
// ---------------------------------------------------------------------------

function alignFlexClass(align?: 'start' | 'center' | 'end'): string {
  if (align === 'center') return 'justify-center';
  if (align === 'end') return 'justify-end';
  return '';
}

function alignTextClass(align?: 'start' | 'center' | 'end'): string {
  if (align === 'center') return 'text-center';
  if (align === 'end') return 'text-right';
  return '';
}

// ---------------------------------------------------------------------------
// Cell renderer por type
// ---------------------------------------------------------------------------

function renderCellByType(value: unknown, col: ColumnConfig): React.ReactNode {
  switch (col.type) {
    case 'date':
      return formatDate(value);
    case 'datetime':
      return formatDatetime(value);
    case 'currency':
      return formatCurrency(value);
    case 'boolean':
      return value ? (
        <Badge variant="success" appearance="light" size="sm">Sim</Badge>
      ) : (
        <Badge variant="destructive" appearance="light" size="sm">Não</Badge>
      );
    case 'badge': {
      if (!col.badgeOptions) return String(value ?? '—');
      const opt = col.badgeOptions[String(value)];
      if (!opt) return String(value ?? '—');
      return (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <Badge variant={opt.variant as any} appearance="light" size="sm">
          {opt.label}
        </Badge>
      );
    }
    default:
      return String(value ?? '—');
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GenericGrid({
  moduleId,
  columns: columnConfigs,
  modalComponent,
  modalSize = 'm',
  showDrag       = true,
  showCheckbox   = true,
  showId         = true,
  showActive     = true,
  showActions    = true,
  showActionEdit     = true,
  showActionDelete   = true,
  showActionShow     = true,
  showActionRestore  = true,
  showBtnNew     = true,
  showBtnSearch  = true,
  showBtnExport  = true,
  showBulkActions = true,
  showPagination  = true,
}: GenericGridProps) {
  const tenant = getTenantSlug();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [moduleConfig, setModuleConfig]     = useState<ModuleConfig | null>(null);
  const [data, setData]                     = useState<AnyRecord[]>([]);
  const [total, setTotal]                   = useState(0);
  const [isLoading, setIsLoading]           = useState(true);
  const [sorting, setSorting]               = useState<SortingState>([{ id: 'order', desc: true }]);
  const [pagination, setPagination]         = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [rowSelection, setRowSelection]     = useState<RowSelectionState>({});
  const [modalOpen, setModalOpen]           = useState(false);
  const [modalMode, setModalMode]           = useState<RowMode>('create');
  const [selectedRecord, setSelectedRecord] = useState<AnyRecord | null>(null);

  // ---------------------------------------------------------------------------
  // Module config fetch
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!moduleId || !tenant) return;
    apiGet<ModuleConfig>(`/v1/${tenant}/modules/${moduleId}`)
      .then(setModuleConfig)
      .catch((err) => console.error('[GenericGrid] Erro ao buscar config do módulo:', err));
  }, [moduleId, tenant]);

  // ---------------------------------------------------------------------------
  // Data fetch
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!moduleConfig) return;
    setIsLoading(true);
    try {
      const { pageIndex, pageSize } = pagination;
      const sort      = sorting[0]?.id ?? 'order';
      const direction = sorting[0]?.desc ? 'desc' : 'asc';
      const res = await apiGet<{ data: AnyRecord[]; meta: { total: number } }>(
        `/v1/${tenant}/${moduleConfig.name_url}?page=${pageIndex + 1}&per_page=${pageSize}&sort=${sort}&direction=${direction}`,
      );
      setData(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      console.error('[GenericGrid] Erro ao buscar dados:', err);
    } finally {
      setIsLoading(false);
    }
  }, [moduleConfig, pagination, sorting, tenant]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Modal handlers
  // ---------------------------------------------------------------------------

  const openModal = useCallback((mode: RowMode, record: AnyRecord | null = null) => {
    setModalMode(mode);
    setSelectedRecord(record);
    setModalOpen(true);
  }, []);

  const handleModalOpenChange = useCallback((open: boolean) => {
    setModalOpen(open);
    if (!open) setSelectedRecord(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Drag & Drop
  // ---------------------------------------------------------------------------

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !moduleConfig) return;

      const oldIndex = parseInt(active.id as string);
      const newIndex = parseInt(over.id as string);
      const newData  = arrayMove(data, oldIndex, newIndex);

      const baseOrder        = total - pagination.pageIndex * pagination.pageSize;
      const newDataWithOrders = newData.map((item, i) => ({ ...item, order: baseOrder - i } as AnyRecord));

      // Optimistic update
      setData(newDataWithOrders);

      const orderMap    = new Map(data.map((item) => [item.id as number, (item.order as number) ?? 0]));
      const changedItems = newDataWithOrders.filter(
        (item) => (item.order as number) !== orderMap.get(item.id as number),
      );

      try {
        await Promise.all(
          changedItems.map((item) =>
            apiPut<unknown>(`/v1/${tenant}/${moduleConfig.name_url}/${item.id as number}`, item),
          ),
        );
      } catch (err) {
        console.error('[GenericGrid] Erro ao reordenar:', err);
        fetchData();
      }
    },
    [data, total, pagination, fetchData, tenant, moduleConfig],
  );

  // ---------------------------------------------------------------------------
  // Bulk actions
  // ---------------------------------------------------------------------------

  const handleBulkActive = useCallback(
    async (activeValue: boolean) => {
      if (!moduleConfig) return;
      const selectedIndices = Object.keys(rowSelection).map(Number);
      const selectedItems   = data.filter((_, i) => selectedIndices.includes(i));
      try {
        await Promise.all(
          selectedItems.map((item) =>
            apiPut<unknown>(`/v1/${tenant}/${moduleConfig.name_url}/${item.id as number}`, {
              ...item,
              active: activeValue,
            }),
          ),
        );
      } catch (err) {
        console.error('[GenericGrid] Erro ao atualizar em massa:', err);
      } finally {
        setRowSelection({});
        fetchData();
      }
    },
    [moduleConfig, rowSelection, data, tenant, fetchData],
  );

  // ---------------------------------------------------------------------------
  // Columns
  // ---------------------------------------------------------------------------

  const tableColumns = useMemo<ColumnDef<AnyRecord>[]>(() => {
    const cols: ColumnDef<AnyRecord>[] = [];

    // — drag handle
    if (showDrag) {
      cols.push({
        id: 'drag',
        size: 40,
        header: () => null,
        cell: ({ row }) => <DragHandle rowId={row.id} />,
        meta: { skeleton: <span className="block w-4 h-4" /> },
      });
    }

    // — checkbox
    if (showCheckbox) {
      cols.push({
        id: 'select',
        size: 40,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? 'indeterminate'
                  : false
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Selecionar todos"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Selecionar linha"
          />
        ),
        meta: { skeleton: <Skeleton className="h-4 w-4" /> },
      });
    }

    // — id
    if (showId) {
      cols.push({
        accessorKey: 'id',
        size: 70,
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() => column.toggleSorting()}
          >
            ID <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        meta: { skeleton: <Skeleton className="h-4 w-8" /> },
      });
    }

    // — module columns
    for (const col of columnConfigs) {
      const sizePx       = parseWidthPx(col.width);
      const headFlex     = alignFlexClass(col.alignHead);
      const headTextCls  = alignTextClass(col.alignHead);
      const bodyTextCls  = alignTextClass(col.alignBody);

      const colDef: ColumnDef<AnyRecord> = {
        accessorKey: col.key,
        ...(sizePx !== undefined ? { size: sizePx } : {}),
        header: col.sortable
          ? ({ column }) => (
              <button
                className={`flex items-center gap-1 hover:text-foreground ${headFlex}`}
                onClick={() => column.toggleSorting()}
              >
                {col.label} <SortIcon sorted={column.getIsSorted()} />
              </button>
            )
          : () => <span className={headFlex}>{col.label}</span>,
        cell: ({ getValue }) => renderCellByType(getValue<unknown>(), col),
        meta: {
          ...(headTextCls ? { headerClassName: headTextCls } : {}),
          ...(bodyTextCls ? { cellClassName: bodyTextCls } : {}),
          skeleton: <Skeleton className="h-4 w-24" />,
        },
      };

      cols.push(colDef);
    }

    // — active
    if (showActive) {
      cols.push({
        accessorKey: 'active',
        size: 90,
        header: 'Ativo',
        cell: ({ getValue }) =>
          getValue<boolean>() ? (
            <Badge variant="success" appearance="light" size="sm">Ativo</Badge>
          ) : (
            <Badge variant="destructive" appearance="light" size="sm">Inativo</Badge>
          ),
        meta: { skeleton: <Skeleton className="h-5 w-14" /> },
      });
    }

    // — actions
    if (showActions) {
      const btnCount   = [showActionShow, showActionEdit, showActionDelete, showActionRestore].filter(Boolean).length;
      const actionsWidth = Math.max(60, btnCount * 36 + 16);

      cols.push({
        id: 'actions',
        size: actionsWidth,
        header: () => <span className="text-right block">Ações</span>,
        cell: ({ row }) => {
          const record    = row.original;
          const isDeleted = Boolean(record.deleted_at);
          return (
            <TooltipProvider>
              <div className="flex items-center justify-end gap-1">
                {showActionShow && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" mode="icon" onClick={() => openModal('show', record)}>
                        <Eye className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Visualizar</TooltipContent>
                  </Tooltip>
                )}
                {showActionEdit && !isDeleted && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" mode="icon" onClick={() => openModal('edit', record)}>
                        <Pencil className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Editar</TooltipContent>
                  </Tooltip>
                )}
                {showActionDelete && !isDeleted && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" mode="icon" onClick={() => openModal('delete', record)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Deletar</TooltipContent>
                  </Tooltip>
                )}
                {showActionRestore && isDeleted && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" mode="icon" onClick={() => openModal('restore', record)}>
                        <RotateCcw className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Restaurar</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          );
        },
        meta: { skeleton: <Skeleton className="h-8 w-16" /> },
      });
    }

    return cols;
  }, [
    showDrag, showCheckbox, showId, showActive, showActions,
    showActionShow, showActionEdit, showActionDelete, showActionRestore,
    columnConfigs, openModal,
  ]);

  // ---------------------------------------------------------------------------
  // Table instance
  // ---------------------------------------------------------------------------

  const table = useReactTable<AnyRecord>({
    data,
    columns: tableColumns,
    pageCount: Math.ceil(total / pagination.pageSize) || 1,
    state: { pagination, sorting, rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: showCheckbox,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      setPagination(next);
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(next);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  // ---------------------------------------------------------------------------
  // DnD data IDs + overlay
  // ---------------------------------------------------------------------------

  const dataIds = useMemo<UniqueIdentifier[]>(
    () => table.getRowModel().rows.map((row) => row.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );

  const renderDragOverlay = useCallback(
    (activeId: UniqueIdentifier | null) => {
      if (activeId === null) return null;
      const item = data[parseInt(activeId as string)];
      if (!item) return null;
      const col0 = columnConfigs[0];
      const col1 = columnConfigs[1];
      return (
        <div className="flex items-center gap-2 bg-background border rounded-md shadow-xl px-3 py-2 text-sm cursor-grabbing">
          <GripVertical className="size-4 text-muted-foreground shrink-0" />
          {col0 && <span className="font-medium">{String(item[col0.key] ?? '')}</span>}
          {col1 && <span className="text-muted-foreground text-xs">{String(item[col1.key] ?? '')}</span>}
        </div>
      );
    },
    [data, columnConfigs],
  );

  // ---------------------------------------------------------------------------
  // Modal component
  // ---------------------------------------------------------------------------

  const ModalComponent = modalComponent;
  const selectedCount  = Object.keys(rowSelection).length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <Container>
        {/* Cabeçalho da página */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-semibold">
            {moduleConfig?.name ?? '...'}
          </h1>
          <div className="flex items-center gap-2">
            {showBtnExport && (
              <Button size="sm" variant="outline">
                <Download className="size-4" />Export
              </Button>
            )}
            {showBtnSearch && (
              <Button size="sm" variant="outline">
                <Search className="size-4" />Pesquisar
              </Button>
            )}
            {showBtnNew && (
              <Button size="sm" onClick={() => openModal('create')}>
                Novo
              </Button>
            )}
          </div>
        </div>

        {/* Grid */}
        <DataGridContainer>
          <DataGrid table={table} recordCount={total} isLoading={isLoading} loadingMode="skeleton">

            {/* Barra de ações em massa */}
            {showBulkActions && selectedCount > 0 && (
              <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30">
                <span className="text-sm text-muted-foreground">
                  {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
                </span>
                <Button size="sm" variant="outline" onClick={() => handleBulkActive(true)}>
                  Ativar
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkActive(false)}>
                  Desativar
                </Button>
              </div>
            )}

            {/* Tabela */}
            {showDrag ? (
              <DataGridTableDndRows
                handleDragEnd={handleDragEnd}
                dataIds={dataIds}
                renderDragOverlay={renderDragOverlay}
              />
            ) : (
              <DataGridTable />
            )}

            {/* Paginação */}
            {showPagination && (
              <div className="border-t px-4 py-3">
                <DataGridPagination />
              </div>
            )}
          </DataGrid>
        </DataGridContainer>
      </Container>

      {/* Modal do módulo */}
      <ModalComponent
        open={modalOpen}
        onOpenChange={handleModalOpenChange}
        mode={modalMode}
        moduleId={moduleId}
        record={selectedRecord}
        onSuccess={fetchData}
        size={modalSize}
      />
    </>
  );
}
