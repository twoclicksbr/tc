import { CSSProperties, ReactNode, useCallback, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useDataGrid } from '@/components/ui/data-grid';
import {
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
  DataGridTableHeadRowCellResize,
  DataGridTableRowSpacer,
} from '@/components/ui/data-grid-table';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Cell, flexRender, HeaderGroup, Row } from '@tanstack/react-table';
import { GripHorizontal } from 'lucide-react';

function DataGridTableDndRowHandle({ rowId }: { rowId: string }) {
  const { attributes, listeners } = useSortable({
    id: rowId,
  });

  return (
    <Button variant="dim" size="sm" className="size-7" {...attributes} {...listeners}>
      <GripHorizontal />
    </Button>
  );
}

function DataGridTableDndRow<TData>({ row }: { row: Row<TData> }) {
  const { transform, setNodeRef, isDragging } = useSortable({
    id: String((row.original as Record<string, unknown>).id),
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    // No transition — prevents rows from animating back before React re-renders with new order
    opacity: isDragging ? 0 : 1,
    position: 'relative',
  };

  return (
    <DataGridTableBodyRow row={row} dndRef={setNodeRef} dndStyle={style} key={row.id}>
      {row.getVisibleCells().map((cell: Cell<TData, unknown>, colIndex) => {
        return (
          <DataGridTableBodyRowCell cell={cell} key={colIndex}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </DataGridTableBodyRowCell>
        );
      })}
    </DataGridTableBodyRow>
  );
}

function DataGridTableDndRows<TData>({
  handleDragEnd,
  dataIds,
  onDragStart,
  renderDragOverlay,
}: {
  handleDragEnd: (event: DragEndEvent) => void;
  dataIds: UniqueIdentifier[];
  onDragStart?: (event: DragStartEvent) => void;
  renderDragOverlay?: (activeId: UniqueIdentifier | null) => ReactNode;
}) {
  const { table, isLoading, props } = useDataGrid();
  const pagination = table.getState().pagination;
  const id = useId();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}));

  const internalHandleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveId(event.active.id);
      onDragStart?.(event);
    },
    [onDragStart],
  );

  const internalHandleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      // Fire-and-forget — não usar await aqui
      void handleDragEnd(event);
    },
    [handleDragEnd],
  );

  const internalHandleDragCancel = useCallback(() => {
    setActiveId(null);
    (document.activeElement as HTMLElement)?.blur();
  }, []);

  return (
    <DndContext
      id={id}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={internalHandleDragStart}
      onDragEnd={internalHandleDragEnd}
      onDragCancel={internalHandleDragCancel}
      sensors={sensors}
    >
      <div className="relative">
        <DataGridTableBase>
          <DataGridTableHead>
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>, index) => {
              return (
                <DataGridTableHeadRow headerGroup={headerGroup} key={index}>
                  {headerGroup.headers.map((header, index) => {
                    const { column } = header;

                    return (
                      <DataGridTableHeadRowCell header={header} key={index}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        {props.tableLayout?.columnsResizable && column.getCanResize() && (
                          <DataGridTableHeadRowCellResize header={header} />
                        )}
                      </DataGridTableHeadRowCell>
                    );
                  })}
                </DataGridTableHeadRow>
              );
            })}
          </DataGridTableHead>

          {(props.tableLayout?.stripped || !props.tableLayout?.rowBorder) && <DataGridTableRowSpacer />}

          <DataGridTableBody>
            {props.loadingMode === 'skeleton' && isLoading && pagination?.pageSize ? (
              Array.from({ length: pagination.pageSize }).map((_, rowIndex) => (
                <DataGridTableBodyRowSkeleton key={rowIndex}>
                  {table.getVisibleFlatColumns().map((column, colIndex) => {
                    return (
                      <DataGridTableBodyRowSkeletonCell column={column} key={colIndex}>
                        {column.columnDef.meta?.skeleton}
                      </DataGridTableBodyRowSkeletonCell>
                    );
                  })}
                </DataGridTableBodyRowSkeleton>
              ))
            ) : table.getRowModel().rows.length ? (
              <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                {table.getRowModel().rows.map((row: Row<TData>) => {
                  return <DataGridTableDndRow row={row} key={row.id} />;
                })}
              </SortableContext>
            ) : (
              <DataGridTableEmpty />
            )}
          </DataGridTableBody>
        </DataGridTableBase>
      </div>

      {renderDragOverlay && (
        <DragOverlay dropAnimation={null}>
          {activeId !== null ? renderDragOverlay(activeId) : null}
        </DragOverlay>
      )}
    </DndContext>
  );
}

export { DataGridTableDndRowHandle, DataGridTableDndRows };
