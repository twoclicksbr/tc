import { Fragment, useCallback, useEffect, useState } from 'react';
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
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { apiGet } from '@/lib/api';

interface Tenant {
  id: number;
  name: string;
  slug: string;
  db_name: string;
  expiration_date: string | null;
  active: boolean;
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

const columns: ColumnDef<Tenant>[] = [
  {
    id: 'drag',
    size: 40,
    header: () => null,
    cell: () => (
      <span className="flex items-center justify-center cursor-grab text-muted-foreground">
        <GripVertical className="size-4" />
      </span>
    ),
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
    cell: () => (
      <TooltipProvider>
        <div className="flex items-center justify-end gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" mode="icon" onClick={() => {}}>
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

export function TenantsPage() {
  const [data, setData] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'id', desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { pageIndex, pageSize } = pagination;
      const sort = sorting[0]?.id ?? 'id';
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

  return (
    <Fragment>
      <Container>
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-semibold">Tenants</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline"><Download className="size-4" />Export</Button>
            <Button size="sm">Novo</Button>
          </div>
        </div>
        <DataGridContainer>
          <DataGrid table={table} recordCount={total} isLoading={isLoading}>
            <DataGridTable />
            <div className="border-t px-4 py-3">
              <DataGridPagination />
            </div>
          </DataGrid>
        </DataGridContainer>
      </Container>
    </Fragment>
  );
}
