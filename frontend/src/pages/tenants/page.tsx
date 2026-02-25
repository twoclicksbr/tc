import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { TenantForEdit, TenantModal } from './tenant-modal';
import {
  ColumnDef,
  getCoreRowModel,
  PaginationState,
  RowSelectionState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Container } from '@/components/common/container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTableDndRows } from '@/components/ui/data-grid-table-dnd-rows';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { apiGet, apiPut } from '@/lib/api';
import { type DragEndEvent, type UniqueIdentifier } from '@dnd-kit/core';
import { arrayMove, useSortable } from '@dnd-kit/sortable';

interface Tenant {
  id: number;
  name: string;
  slug: string;
  db_name: string;
  expiration_date: string | null;
  active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

interface TenantsResponse {
  data: Tenant[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString('pt-BR');
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ChevronUp className="size-3.5" />;
  if (sorted === 'desc') return <ChevronDown className="size-3.5" />;
  return <ChevronsUpDown className="size-3.5 opacity-40" />;
}

function DragHandle({ rowId }: { rowId: string }) {
  const { attributes, listeners } = useSortable({ id: rowId });
  return (
    <span
      className="flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </span>
  );
}

function buildColumns(onEdit: (tenant: TenantForEdit) => void): ColumnDef<Tenant>[] {
  return [
    {
      id: 'drag',
      size: 40,
      header: () => null,
      cell: ({ row }) => <DragHandle rowId={row.id} />,
      meta: { skeleton: <span className="block w-4 h-4" /> },
    },
    {
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
    },
    {
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
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting()}
        >
          Nome <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      meta: { skeleton: <Skeleton className="h-4 w-36" /> },
    },
    {
      accessorKey: 'slug',
      size: 140,
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting()}
        >
          Slug <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      meta: { skeleton: <Skeleton className="h-4 w-20" /> },
    },
    {
      accessorKey: 'db_name',
      size: 140,
      header: 'Banco',
      meta: { skeleton: <Skeleton className="h-4 w-20" /> },
    },
    {
      accessorKey: 'expiration_date',
      size: 120,
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting()}
        >
          Validade <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => formatDate(getValue<string | null>()),
      meta: { skeleton: <Skeleton className="h-4 w-24" /> },
    },
    {
      accessorKey: 'active',
      size: 90,
      header: 'Ativo',
      cell: ({ getValue }) =>
        getValue<boolean>() ? (
          <Badge variant="success" appearance="light" size="sm">
            Ativo
          </Badge>
        ) : (
          <Badge variant="destructive" appearance="light" size="sm">
            Inativo
          </Badge>
        ),
      meta: { skeleton: <Skeleton className="h-5 w-14" /> },
    },
    {
      id: 'actions',
      size: 80,
      header: () => <span className="text-right block">Ações</span>,
      cell: ({ row }) => (
        <TooltipProvider>
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" mode="icon" onClick={() => onEdit(row.original)}>
                  <Pencil className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Editar</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" mode="icon" onClick={() => {}}>
                  <Trash2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Deletar</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ),
      meta: { skeleton: <Skeleton className="h-8 w-16" /> },
    },
  ];
}

export function TenantsPage() {
  const [data, setData] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'order', desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantForEdit | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { pageIndex, pageSize } = pagination;
      const sort = sorting[0]?.id ?? 'order';
      const direction = sorting[0]?.desc ? 'desc' : 'asc';
      const res = await apiGet<TenantsResponse>(
        `/v1/admin/tenants?page=${pageIndex + 1}&per_page=${pageSize}&sort=${sort}&direction=${direction}`,
      );
      setData(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [pagination, sorting]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = useCallback((tenant: TenantForEdit) => {
    setSelectedTenant(tenant);
    setModalOpen(true);
  }, []);

  const handleModalOpenChange = useCallback((open: boolean) => {
    setModalOpen(open);
    if (!open) setSelectedTenant(null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = parseInt(active.id as string);
      const newIndex = parseInt(over.id as string);
      const newData = arrayMove(data, oldIndex, newIndex);

      // Item at position 0 gets the highest order value
      const baseOrder = total - pagination.pageIndex * pagination.pageSize;
      const newDataWithOrders = newData.map((item, i) => ({
        ...item,
        order: baseOrder - i,
      }));

      // Optimistic update for instant visual feedback
      setData(newDataWithOrders);

      // Find only items whose order actually changed
      const orderMap = new Map(data.map((item) => [item.id, item.order ?? 0]));
      const changedItems = newDataWithOrders.filter(
        (item) => item.order !== orderMap.get(item.id),
      );

      try {
        await Promise.all(
          changedItems.map((item) =>
            apiPut<unknown>(`/v1/admin/tenants/${item.id}`, {
              name: item.name,
              slug: item.slug,
              expiration_date: item.expiration_date,
              active: item.active,
              order: item.order,
            }),
          ),
        );
        fetchData();
      } catch (err) {
        console.error('Erro ao reordenar:', err);
        fetchData();
      }
    },
    [data, total, pagination, fetchData],
  );

  const columns = useMemo(() => buildColumns(handleEdit), [handleEdit]);

  const table = useReactTable<Tenant>({
    data,
    columns,
    pageCount: Math.ceil(total / pagination.pageSize) || 1,
    state: { pagination, sorting, rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
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

  // Row IDs used by dnd-kit — React Table uses string indices ("0", "1", ...)
  const dataIds = useMemo<UniqueIdentifier[]>(
    () => table.getRowModel().rows.map((row) => row.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );

  return (
    <Fragment>
      <Container>
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-semibold">Tenants</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline"><Download className="size-4" />Export</Button>
            <Button size="sm" onClick={() => setModalOpen(true)}>Novo</Button>
          </div>
        </div>
        <DataGridContainer>
          <DataGrid table={table} recordCount={total} isLoading={isLoading} loadingMode="skeleton">
            <DataGridTableDndRows handleDragEnd={handleDragEnd} dataIds={dataIds} />
            <div className="border-t px-4 py-3">
              <DataGridPagination />
            </div>
          </DataGrid>
        </DataGridContainer>
      </Container>

      <TenantModal
        open={modalOpen}
        onOpenChange={handleModalOpenChange}
        onSuccess={fetchData}
        tenant={selectedTenant}
      />
    </Fragment>
  );
}
