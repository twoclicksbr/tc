import React, { CSSProperties, Fragment, type ComponentType, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  type Cell,
  type Column,
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type HeaderGroup,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  type DragEndEvent,
  type UniqueIdentifier,
  useDndContext,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown,
  ArrowUp,
  CalendarIcon,
  Check,
  ChevronsUpDown,
  Download,
  FileSpreadsheet,
  FileText,
  GripVertical,
  Search,
  SearchX,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type DateRange } from 'react-day-picker';
import { GridActions } from '@/components/grid-actions';
import { Container } from '@/components/common/container';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid, DataGridContainer, useDataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import {
  DataGridTable,
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
  DataGridTableBodyRowSkeleton,
  DataGridTableBodyRowSkeletonCell,
  DataGridTableEmpty,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableRowSpacer,
} from '@/components/ui/data-grid-table';
import { DataGridTableDndRows } from '@/components/ui/data-grid-table-dnd-rows';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiGet, apiPut } from '@/lib/api';
import { getTenantSlug } from '@/lib/tenant';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RowMode = 'create' | 'edit' | 'show' | 'delete' | 'restore';

interface ModuleConfig {
  id: number;
  name: string;
  slug: string;
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
  render?: (value: unknown, record: AnyRecord, openModal: (mode: RowMode, record: AnyRecord) => void) => React.ReactNode;
  meta?: { headerClassName?: string; cellClassName?: string; style?: React.CSSProperties };
}

export interface GenericGridProps {
  moduleId?: number;
  slug?: string;
  title?: string;
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

  // Filtros específicos do módulo (segunda linha no modal de pesquisa)
  renderSearchFilters?: React.ReactNode;
  onDataLoad?: (data: Record<string, unknown>[]) => void;
  onClearSearchFilters?: () => void;
  onSearch?: (baseFilters: Record<string, string>) => Record<string, string>;
  hasModuleFilters?: boolean;
  icon?: React.ComponentType<{ className?: string }>;

  // Agrupamento visual de linhas
  groupBy?: string;
  groupByLabels?: Record<string, string>;
  groupByOrder?: string[];
  groupByCompute?: (record: Record<string, unknown>) => string;
  groupByLevel1Labels?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatDate(value: unknown): string {
  if (!value) return '—';
  const str = value as string;
  // Data pura YYYY-MM-DD — parsear manualmente sem new Date (evita problemas de timezone)
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  // Datetime ou outros formatos — usar Date normalmente
  return new Date(str).toLocaleDateString('pt-BR');
}

function formatDatetime(value: unknown): string {
  if (!value) return '—';
  const str = value as string;
  // Timestamps sem timezone (ex: "2026-02-26 10:30:00") — normalizar separador para T
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str) ? str.replace(' ', 'T') : str;
  return new Date(normalized).toLocaleString('pt-BR');
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


function DragHandle({ rowId }: { rowId: string }) {
  const { attributes, listeners, isDragging } = useSortable({ id: rowId });
  const [tooltipOpen, setTooltipOpen] = useState(false);
  return (
    <TooltipProvider>
      <Tooltip open={isDragging ? false : tooltipOpen} onOpenChange={setTooltipOpen}>
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

function SortableColumnHeader({ column, label, headFlex, onResetSorting }: {
  column: Column<AnyRecord>;
  label: string;
  headFlex: string;
  onResetSorting: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`text-secondary-foreground rounded-md font-normal -ms-2 px-2 h-7 hover:bg-secondary data-[state=open]:bg-secondary hover:text-foreground data-[state=open]:text-foreground ${headFlex}`}
        >
          {label}
          {column.getIsSorted() === 'desc' ? (
            <ArrowDown className="size-[0.7rem]! mt-px" />
          ) : column.getIsSorted() === 'asc' ? (
            <ArrowUp className="size-[0.7rem]! mt-px" />
          ) : (
            <ChevronsUpDown className="size-[0.7rem]! mt-px" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuItem
          onClick={() => column.getIsSorted() === 'asc' ? onResetSorting() : column.toggleSorting(false)}
        >
          <ArrowUp className="size-3.5!" />
          <span className="grow">Asc</span>
          {column.getIsSorted() === 'asc' && <Check className="size-4 opacity-100! text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => column.getIsSorted() === 'desc' ? onResetSorting() : column.toggleSorting(true)}
        >
          <ArrowDown className="size-3.5!" />
          <span className="grow">Desc</span>
          {column.getIsSorted() === 'desc' && <Check className="size-4 opacity-100! text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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

function renderCellByType(value: unknown, col: ColumnConfig, record: AnyRecord, openModal: (mode: RowMode, record: AnyRecord) => void): React.ReactNode {
  if (col.render) return col.render(value, record, openModal);
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
// Grouped table DnD helpers
// ---------------------------------------------------------------------------

function GroupedDndRow({ row }: { row: Row<AnyRecord> }) {
  const recordId = String(row.original.id);
  const { transform, setNodeRef, isDragging } = useSortable({ id: recordId });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0 : 1,
    position: 'relative',
  };
  return (
    <DataGridTableBodyRow row={row} dndRef={setNodeRef} dndStyle={style}>
      {row.getVisibleCells().map((cell: Cell<AnyRecord, unknown>, colIndex) => (
        <DataGridTableBodyRowCell cell={cell} key={colIndex}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </DataGridTableBodyRowCell>
      ))}
    </DataGridTableBodyRow>
  );
}

function GroupedDndOverlay({
  renderDragOverlay,
}: {
  renderDragOverlay?: (activeId: UniqueIdentifier | null) => React.ReactNode;
}) {
  const { active } = useDndContext();
  return createPortal(
    <DragOverlay dropAnimation={null}>
      {active && renderDragOverlay ? renderDragOverlay(active.id) : null}
    </DragOverlay>,
    document.body,
  );
}

function GroupedDndSection({
  rows,
  onDragEnd,
  renderDragOverlay,
}: {
  rows: Row<AnyRecord>[];
  onDragEnd: (activeId: string, overId: string) => void;
  renderDragOverlay?: (activeId: UniqueIdentifier | null) => React.ReactNode;
}) {
  const id = useId();
  const items = useMemo(
    () => rows.map((r) => String(r.original.id)),
    [rows],
  );
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor),
  );
  return (
    <DndContext
      id={id}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      sensors={sensors}
      onDragEnd={(event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        // Fire-and-forget — não usar await aqui
        onDragEnd(String(active.id), String(over.id));
      }}
      onDragCancel={() => (document.activeElement as HTMLElement)?.blur()}
      accessibility={{ container: document.body }}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {rows.map((row) => (
          <GroupedDndRow row={row} key={String(row.original.id)} />
        ))}
      </SortableContext>
      <GroupedDndOverlay renderDragOverlay={renderDragOverlay} />
    </DndContext>
  );
}

// ---------------------------------------------------------------------------
// Grouped table (static, sem DnD) — renderizado quando groupBy está definido
// ---------------------------------------------------------------------------

function GroupedTable({
  groupBy,
  groupByLabels,
  groupByOrder,
  groupByCompute,
  groupByLevel1Labels,
  showDrag,
  onGroupedDragEnd,
  renderDragOverlay,
}: {
  groupBy: string;
  groupByLabels: Record<string, string>;
  groupByOrder?: string[];
  groupByCompute?: (record: Record<string, unknown>) => string;
  groupByLevel1Labels?: Record<string, string>;
  showDrag?: boolean;
  onGroupedDragEnd?: (activeId: string, overId: string) => void;
  renderDragOverlay?: (activeId: UniqueIdentifier | null) => React.ReactNode;
}) {
  const { table, isLoading, props } = useDataGrid();
  const pagination = table.getState().pagination;
  const rows = table.getRowModel().rows as Row<AnyRecord>[];
  const totalCols = table.getVisibleFlatColumns().length;

  const groups = useMemo(() => {
    const map = new Map<string, Row<AnyRecord>[]>();
    for (const row of rows) {
      const key = groupByCompute
        ? groupByCompute(row.original as AnyRecord)
        : String((row.original as AnyRecord)[groupBy] ?? '');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    const order = groupByOrder ?? Array.from(map.keys());
    const sorted = order.filter((k) => map.has(k)).map((k) => ({ key: k, rows: map.get(k)! }));
    const extra = Array.from(map.keys())
      .filter((k) => !order.includes(k))
      .map((k) => ({ key: k, rows: map.get(k)! }));
    return [...sorted, ...extra];
  }, [rows, groupBy, groupByOrder, groupByCompute]);

  return (
    <DataGridTableBase>
      <DataGridTableHead>
        {table.getHeaderGroups().map((headerGroup: HeaderGroup<AnyRecord>, index) => (
          <DataGridTableHeadRow headerGroup={headerGroup} key={index}>
            {headerGroup.headers.map((header, i) => (
              <DataGridTableHeadRowCell header={header} key={i}>
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </DataGridTableHeadRowCell>
            ))}
          </DataGridTableHeadRow>
        ))}
      </DataGridTableHead>

      {(props.tableLayout?.stripped || !props.tableLayout?.rowBorder) && <DataGridTableRowSpacer />}

      <DataGridTableBody>
        {props.loadingMode === 'skeleton' && isLoading && pagination?.pageSize ? (
          Array.from({ length: pagination.pageSize }).map((_, rowIndex) => (
            <DataGridTableBodyRowSkeleton key={rowIndex}>
              {table.getVisibleFlatColumns().map((column, colIndex) => (
                <DataGridTableBodyRowSkeletonCell column={column} key={colIndex}>
                  {column.columnDef.meta?.skeleton}
                </DataGridTableBodyRowSkeletonCell>
              ))}
            </DataGridTableBodyRowSkeleton>
          ))
        ) : rows.length ? (
          groups.map(({ key, rows: groupRows }, groupIndex) => {
            const [lvl1, lvl2] = groupByLevel1Labels ? key.split('|') : [key, ''];
            const prevKey = groupIndex > 0 ? groups[groupIndex - 1].key : null;
            const prevLvl1 = prevKey && groupByLevel1Labels ? prevKey.split('|')[0] : null;
            const showLvl1Header = !!groupByLevel1Labels && lvl1 !== prevLvl1;
            return (
              <Fragment key={`group-${key}`}>
                {showLvl1Header && (
                  <tr>
                    <td
                      colSpan={totalCols}
                      className="bg-muted px-4 py-2 font-bold text-xs text-foreground uppercase tracking-widest border-y border-border"
                    >
                      {groupByLevel1Labels[lvl1] ?? lvl1}
                    </td>
                  </tr>
                )}
                <tr>
                  <td
                    colSpan={totalCols}
                    className={groupByLevel1Labels
                      ? 'bg-muted/40 ps-8 pe-4 py-1 font-semibold text-xs text-muted-foreground uppercase tracking-wide border-b border-border'
                      : 'bg-muted/60 px-4 py-1.5 font-semibold text-xs text-muted-foreground uppercase tracking-wide border-y border-border'}
                  >
                    {groupByLevel1Labels ? (groupByLabels[lvl2] ?? lvl2) : (groupByLabels[key] ?? key)}
                  </td>
                </tr>
                {showDrag && onGroupedDragEnd ? (
                  <GroupedDndSection key={key} rows={groupRows} onDragEnd={onGroupedDragEnd} renderDragOverlay={renderDragOverlay} />
                ) : (
                  groupRows.map((row) => (
                    <DataGridTableBodyRow row={row} key={row.id}>
                      {row.getVisibleCells().map((cell: Cell<AnyRecord, unknown>, colIndex) => (
                        <DataGridTableBodyRowCell cell={cell} key={colIndex}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </DataGridTableBodyRowCell>
                      ))}
                    </DataGridTableBodyRow>
                  ))
                )}
              </Fragment>
            );
          })
        ) : (
          <DataGridTableEmpty />
        )}
      </DataGridTableBody>
    </DataGridTableBase>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GenericGrid({
  moduleId,
  slug: slugProp,
  title: titleProp,
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
  renderSearchFilters,
  onDataLoad,
  onClearSearchFilters,
  onSearch,
  hasModuleFilters = false,
  icon: Icon,
  groupBy,
  groupByLabels,
  groupByOrder,
  groupByCompute,
  groupByLevel1Labels,
}: GenericGridProps) {
  const tenant = getTenantSlug();
  const effectiveShowDrag = showDrag;
  const onDataLoadRef = useRef(onDataLoad);
  onDataLoadRef.current = onDataLoad;
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;
  const onClearSearchFiltersRef = useRef(onClearSearchFilters);
  onClearSearchFiltersRef.current = onClearSearchFilters;

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
  const [searchOpen, setSearchOpen]         = useState(false);
  const [searchDeleted, setSearchDeleted]   = useState(false);
  const [searchId, setSearchId]                       = useState('');
  const [searchContentMode, setSearchContentMode]     = useState('contains');
  const [searchContentText, setSearchContentText]     = useState('');
  const [searchActive, setSearchActive]               = useState('all');
  const [searchPerPage, setSearchPerPage]             = useState('10');
  const [searchDateType, setSearchDateType]           = useState('created_at');
  const [searchDateRange, setSearchDateRange]         = useState<DateRange | undefined>(undefined);
  const hasFilters = useMemo(
    () =>
      searchId !== '' ||
      searchContentMode !== 'contains' ||
      searchContentText !== '' ||
      searchDateType !== 'created_at' ||
      searchDateRange?.from !== undefined ||
      searchPerPage !== '10' ||
      searchActive !== 'all' ||
      searchDeleted ||
      hasModuleFilters,
    [searchId, searchContentMode, searchContentText, searchDateType, searchDateRange, searchPerPage, searchActive, searchDeleted, hasModuleFilters],
  );
  const [activeFilters, setActiveFilters]   = useState<Record<string, string>>({});
  const [modalMode, setModalMode]           = useState<RowMode>('create');
  const [selectedRecord, setSelectedRecord] = useState<AnyRecord | null>(null);

  // Bypass: slug/title podem vir direto como props (sem buscar moduleConfig via API)
  const resolvedSlug  = slugProp ?? moduleConfig?.slug ?? null;
  const resolvedTitle = titleProp ?? moduleConfig?.name ?? '...';

  // ---------------------------------------------------------------------------
  // Module config fetch
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (slugProp) return; // bypass: slug fornecido via prop, não precisa buscar
    if (!moduleId || !tenant) return;
    apiGet<ModuleConfig>(`/v1/${tenant}/modules/${moduleId}`)
      .then(setModuleConfig)
      .catch((err) => console.error('[GenericGrid] Erro ao buscar config do módulo:', err));
  }, [slugProp, moduleId, tenant]);

  // ---------------------------------------------------------------------------
  // Data fetch
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!resolvedSlug) return;
    setIsLoading(true);
    try {
      const { pageIndex, pageSize } = pagination;
      const sort      = sorting[0]?.id ?? 'order';
      const direction = sorting[0]?.desc ? 'desc' : 'asc';
      const params = new URLSearchParams({
        page: String(pageIndex + 1),
        per_page: String(pageSize),
        sort,
        direction,
        ...activeFilters,
      });
      const res = await apiGet<{ data: AnyRecord[]; meta: { total: number } }>(
        `/v1/${tenant}/${resolvedSlug}?${params.toString()}`,
      );
      setData(res.data);
      setTotal(res.meta.total);
      onDataLoadRef.current?.(res.data);
    } catch (err) {
      console.error('[GenericGrid] Erro ao buscar dados:', err);
    } finally {
      setIsLoading(false);
    }
  }, [resolvedSlug, pagination, sorting, tenant, activeFilters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Sort reset
  // ---------------------------------------------------------------------------

  const resetSorting = useCallback(() => {
    setSorting([{ id: 'order', desc: true }]);
  }, []);

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
      if (!over || active.id === over.id || !resolvedSlug) return;

      const oldIndex = data.findIndex((d) => String(d.id) === String(active.id));
      const newIndex = data.findIndex((d) => String(d.id) === String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;
      const newData = arrayMove(data, oldIndex, newIndex);

      const baseOrder = total - pagination.pageIndex * pagination.pageSize;
      const newDataWithOrders = newData.map((item, i) => ({ ...item, order: baseOrder - i } as AnyRecord));

      const orderMap = new Map(data.map((item) => [item.id as number, (item.order as number) ?? 0]));
      const changedItems = newDataWithOrders.filter(
        (item) => (item.order as number) !== orderMap.get(item.id as number),
      );

      try {
        await Promise.all(
          changedItems.map((item) =>
            apiPut<unknown>(`/v1/${tenant}/${resolvedSlug}/${item.id as number}`, item),
          ),
        );
      } catch (err) {
        console.error('[GenericGrid] Erro ao reordenar:', err);
      } finally {
        fetchData();
      }
    },
    [data, total, pagination, fetchData, tenant, resolvedSlug],
  );

  const handleGroupedDragEnd = useCallback(
    async (activeId: string, overId: string) => {
      if (!resolvedSlug) return;
      const oldIndex = data.findIndex((d) => String(d.id) === activeId);
      const newIndex = data.findIndex((d) => String(d.id) === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const newData = arrayMove(data, oldIndex, newIndex);
      const baseOrder = total - pagination.pageIndex * pagination.pageSize;
      const newDataWithOrders = newData.map((item, i) => ({ ...item, order: baseOrder - i } as AnyRecord));

      const orderMap = new Map(data.map((item) => [item.id as number, (item.order as number) ?? 0]));
      const changedItems = newDataWithOrders.filter(
        (item) => (item.order as number) !== orderMap.get(item.id as number),
      );

      try {
        await Promise.all(
          changedItems.map((item) =>
            apiPut<unknown>(`/v1/${tenant}/${resolvedSlug}/${item.id as number}`, item),
          ),
        );
      } catch (err) {
        console.error('[GenericGrid] Erro ao reordenar em grupo:', err);
      } finally {
        fetchData();
      }
    },
    [data, total, pagination, fetchData, tenant, resolvedSlug],
  );

  // ---------------------------------------------------------------------------
  // Bulk actions
  // ---------------------------------------------------------------------------

  const handleBulkActive = useCallback(
    async (activeValue: boolean) => {
      if (!resolvedSlug) return;
      const selectedIndices = Object.keys(rowSelection).map(Number);
      const selectedItems   = data.filter((_, i) => selectedIndices.includes(i));
      try {
        await Promise.all(
          selectedItems.map((item) =>
            apiPut<unknown>(`/v1/${tenant}/${resolvedSlug}/${item.id as number}`, {
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
    [resolvedSlug, rowSelection, data, tenant, fetchData],
  );

  // ---------------------------------------------------------------------------
  // Search handlers
  // ---------------------------------------------------------------------------

  const handleClearFilters = useCallback(() => {
    setSearchId('');
    setSearchContentMode('contains');
    setSearchContentText('');
    setSearchActive('all');
    setSearchPerPage('10');
    setSearchDateType('created_at');
    setSearchDateRange(undefined);
    setSearchDeleted(false);
    onClearSearchFiltersRef.current?.();
    setActiveFilters({});
    setPagination((p) => ({ ...p, pageIndex: 0, pageSize: 10 }));
  }, []);

  const handleSearch = useCallback(() => {
    const filters: Record<string, string> = {};
    if (searchId) filters['search_id'] = searchId;
    if (searchContentText) {
      filters['search_name'] = searchContentText;
      filters['search_type'] = searchContentMode;
    }
    if (searchDateRange?.from) {
      filters['date_type'] = searchDateType;
      filters['date_from'] = format(searchDateRange.from, 'yyyy-MM-dd');
      if (searchDateRange.to) filters['date_to'] = format(searchDateRange.to, 'yyyy-MM-dd');
    }
    if (searchActive !== 'all') filters['active'] = searchActive === 'active' ? 'true' : 'false';
    if (searchDeleted) filters['include_deleted'] = 'true';

    const extra = onSearchRef.current?.(filters) ?? {};
    const allFilters = { ...filters, ...extra };

    const newPageSize = parseInt(searchPerPage, 10);
    setPagination({ pageIndex: 0, pageSize: newPageSize });
    setActiveFilters(allFilters);
    setSearchOpen(false);
  }, [searchId, searchContentText, searchContentMode, searchDateRange, searchDateType, searchActive, searchDeleted, searchPerPage]);

  // ---------------------------------------------------------------------------
  // Columns
  // ---------------------------------------------------------------------------

  const tableColumns = useMemo<ColumnDef<AnyRecord>[]>(() => {
    const cols: ColumnDef<AnyRecord>[] = [];

    // — drag handle
    if (effectiveShowDrag) {
      cols.push({
        id: 'drag',
        header: () => null,
        cell: ({ row }) => <DragHandle rowId={String(row.original.id)} />,
        meta: { style: { width: '5%' }, skeleton: <span className="block w-4 h-4" /> },
      });
    }

    // — checkbox
    if (showCheckbox) {
      cols.push({
        id: 'select',
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
        meta: { style: { width: '5%' }, skeleton: <Skeleton className="h-4 w-4" /> },
      });
    }

    // — id
    if (showId) {
      cols.push({
        accessorKey: 'id',
        header: ({ column }) => (
          <SortableColumnHeader column={column} label="ID" headFlex="" onResetSorting={resetSorting} />
        ),
        meta: { style: { width: '5%' }, skeleton: <Skeleton className="h-4 w-8" /> },
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
              <SortableColumnHeader column={column} label={col.label} headFlex={headFlex} onResetSorting={resetSorting} />
            )
          : () => <span className={headFlex}>{col.label}</span>,
        cell: ({ getValue, row }) => renderCellByType(getValue<unknown>(), col, row.original, openModal),
        meta: {
          ...(headTextCls ? { headerClassName: headTextCls } : {}),
          ...(bodyTextCls ? { cellClassName: bodyTextCls } : {}),
          ...col.meta,
          skeleton: <Skeleton className="h-4 w-24" />,
        },
      };

      cols.push(colDef);
    }

    // — active
    if (showActive) {
      cols.push({
        accessorKey: 'active',
        header: 'Status',
        cell: ({ getValue }) =>
          getValue<boolean>() ? (
            <Badge variant="success" appearance="light" size="sm">Ativo</Badge>
          ) : (
            <Badge variant="destructive" appearance="light" size="sm">Inativo</Badge>
          ),
        meta: { style: { width: '7%' }, skeleton: <Skeleton className="h-5 w-14" /> },
      });
    }

    // — actions
    if (showActions) {
      cols.push({
        id: 'actions',
        header: () => <span className="text-right block">Ações</span>,
        cell: ({ row }) => {
          const record    = row.original;
          const isDeleted = Boolean(record.deleted_at);
          return (
            <GridActions
              record={record}
              isDeleted={isDeleted}
              showActionShow={showActionShow}
              showActionEdit={showActionEdit}
              showActionDelete={showActionDelete}
              showActionRestore={showActionRestore}
              openModal={openModal}
            />
          );
        },
        meta: { style: { width: '10%' }, skeleton: <Skeleton className="h-8 w-16" /> },
      });
    }

    return cols;
  }, [
    effectiveShowDrag, showCheckbox, showId, showActive, showActions,
    showActionShow, showActionEdit, showActionDelete, showActionRestore,
    columnConfigs, openModal, resetSorting,
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
    () => table.getRowModel().rows.map((row) => String(row.original.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );

  // Overlay para modo não-agrupado: activeId = database record id
  const renderDragOverlay = useCallback(
    (activeId: UniqueIdentifier | null) => {
      if (activeId === null) return null;
      const item = data.find((d) => String(d.id) === String(activeId));
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

  // Overlay para modo agrupado: activeId = database record id
  const renderGroupedDragOverlay = useCallback(
    (activeId: UniqueIdentifier | null) => {
      if (activeId === null) return null;
      const item = data.find((d) => String(d.id) === String(activeId));
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
          <h1 className="text-xl font-semibold flex items-center gap-2">
            {Icon && <Icon className="size-6" />}
            {resolvedTitle}
          </h1>
          <div className="flex items-center gap-2">
            {showBtnSearch && (
              <Button size="sm" variant="outline" onClick={() => setSearchOpen(true)}>
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
          <DataGrid table={table} recordCount={total} isLoading={isLoading} loadingMode="skeleton" tableClassNames={{ base: 'table-fixed w-full' }} emptyMessage={<div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground"><SearchX size={48} /><span>Nenhum registro encontrado</span></div>}>

            {/* Barra de ações em massa */}
            {showBulkActions && selectedCount > 0 && (
              <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Badge variant="destructive" appearance="light" className="cursor-pointer">
                      Ações em massa: {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkActive(true)}>Ativar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkActive(false)}>Desativar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Tabela */}
            {!groupBy && effectiveShowDrag ? (
              <DataGridTableDndRows
                handleDragEnd={handleDragEnd}
                dataIds={dataIds}
                renderDragOverlay={renderDragOverlay}
              />
            ) : groupBy ? (
              <GroupedTable
                groupBy={groupBy}
                groupByLabels={groupByLabels ?? {}}
                groupByOrder={groupByOrder}
                groupByCompute={groupByCompute}
                groupByLevel1Labels={groupByLevel1Labels}
                showDrag={effectiveShowDrag}
                onGroupedDragEnd={handleGroupedDragEnd}
                renderDragOverlay={renderGroupedDragOverlay}
              />
            ) : (
              <DataGridTable />
            )}

            {/* Paginação */}
            {showPagination && (
              <div className="border-t px-4 py-3 flex items-center justify-between gap-3 w-full">
                {showBtnExport && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Download className="size-4" />Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => console.log('Export PDF')}>
                        <FileText className="size-4" />PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => console.log('Export Excel')}>
                        <FileSpreadsheet className="size-4" />Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <DataGridPagination hideSizes info="Exibindo {from} - {to}. Total {count} registros" className="justify-end" />
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
        slug={slugProp}
        record={selectedRecord}
        onSuccess={fetchData}
        size={modalSize}
      />

      {/* Modal de pesquisa */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Pesquisar</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="grid grid-cols-12 gap-4 items-end">

              {/* ID — col-span-1 */}
              <div className="col-span-1 flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">ID</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="ID"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              {/* Tipo — col-span-2 */}
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select value={searchContentMode} onValueChange={setSearchContentMode}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contém</SelectItem>
                    <SelectItem value="starts">Início exato</SelectItem>
                    <SelectItem value="exact">Exato</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Nome — col-span-4 */}
              <div className="col-span-4 flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Nome</Label>
                <Input
                  type="text"
                  placeholder="Nome"
                  value={searchContentText}
                  onChange={(e) => setSearchContentText(e.target.value)}
                />
              </div>

              {/* Data — col-span-2 */}
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Data</Label>
                <Select value={searchDateType} onValueChange={setSearchDateType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Criado em</SelectItem>
                    <SelectItem value="updated_at">Alterado em</SelectItem>
                    <SelectItem value="deleted_at">Excluído em</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Período — col-span-3 */}
              <div className="col-span-3 flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Período</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal text-left">
                      <CalendarIcon className="size-4 opacity-60" />
                      {searchDateRange?.from ? (
                        searchDateRange.to ? (
                          <span>{format(searchDateRange.from, 'dd/MM/yyyy')} — {format(searchDateRange.to, 'dd/MM/yyyy')}</span>
                        ) : (
                          format(searchDateRange.from, 'dd/MM/yyyy')
                        )
                      ) : (
                        <span className="text-muted-foreground">Selecionar período</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      defaultMonth={searchDateRange?.from}
                      selected={searchDateRange}
                      onSelect={setSearchDateRange}
                      numberOfMonths={2}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

            </div>

            {/* Linha 2 — filtros específicos do módulo */}
            {renderSearchFilters && (
              <div className="mt-4">
                {renderSearchFilters}
              </div>
            )}

            {/* Linha 3 — Registro + Ativo */}
            <div className="mt-4 grid grid-cols-12 gap-4 items-end">

              {/* Registros */}
              <div className="col-span-3 flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Registros</Label>
                <Select value={searchPerPage} onValueChange={setSearchPerPage}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">Exibir 10 registros</SelectItem>
                    <SelectItem value="20">Exibir 20 registros</SelectItem>
                    <SelectItem value="25">Exibir 25 registros</SelectItem>
                    <SelectItem value="50">Exibir 50 registros</SelectItem>
                    <SelectItem value="100">Exibir 100 registros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="col-span-3 flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={searchActive} onValueChange={setSearchActive}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Ativos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>
          </DialogBody>
          <DialogFooter className="flex-row sm:justify-between items-center">
            <div className="flex items-center gap-2">
              <Switch
                checked={searchDeleted}
                onCheckedChange={setSearchDeleted}
                className="data-[state=checked]:bg-destructive"
              />
              <Badge
                variant="destructive"
                appearance="light"
                className="cursor-pointer"
                onClick={() => setSearchDeleted((v) => !v)}
              >
                {searchDeleted ? 'Ocultando deletados' : 'Mostrar deletados'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {hasFilters ? (
                <Button size="sm" variant="destructive" appearance="ghost" onClick={handleClearFilters}>
                  Limpar Filtros
                </Button>
              ) : (
                <DialogClose asChild>
                  <Button size="sm" variant="outline">Fechar</Button>
                </DialogClose>
              )}
              <Button size="sm" onClick={handleSearch}>
                Pesquisar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
