'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/ui';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface CatalogTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  isLoading: boolean;
  onEdit?: (item: T) => void;
  onToggleActive?: (item: T) => void;
  emptyMessage?: string;
  showActions?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function CatalogTable<T extends { id: string; activo?: boolean }>({
  columns,
  data,
  isLoading,
  onEdit,
  onToggleActive,
  emptyMessage = 'No se encontraron registros.',
  showActions = true,
}: CatalogTableProps<T>) {
  const dataTableColumns = useMemo<DataTableColumn<T>[]>(() => {
    const cols: DataTableColumn<T>[] = columns.map((col) => ({
      key: col.key,
      header: col.header,
      headerClassName: col.className,
      cellClassName: col.className,
      render: (item) =>
        col.render
          ? col.render(item)
          : ((item as Record<string, unknown>)[col.key] as React.ReactNode),
    }));

    if (showActions) {
      cols.push({
        key: '__actions',
        header: 'Acciones',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (item) => (
          <div className="flex items-center justify-end gap-3">
            {/* Active / Inactive toggle */}
            {onToggleActive && (
              <button
                type="button"
                onClick={() => onToggleActive(item)}
                className="focus:outline-none"
              >
                <Badge
                  variant="outline"
                  className={`px-1.5 py-0 text-[10px] cursor-pointer select-none ${
                    (item as Record<string, unknown>).activo
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'border-red-300 bg-red-50 text-red-700'
                  }`}
                >
                  {(item as Record<string, unknown>).activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </button>
            )}

            {/* Edit button */}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(item)}
              >
                Editar
              </Button>
            )}
          </div>
        ),
      });
    }

    return cols;
  }, [columns, showActions, onEdit, onToggleActive]);

  return (
    <DataTable<T>
      columns={dataTableColumns}
      data={data}
      getRowKey={(item, index) => String(item.id ?? index)}
      isLoading={isLoading}
      loadingRows={5}
      emptyMessage={emptyMessage}
    />
  );
}
