'use client';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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

// ── Skeleton row helper ──────────────────────────────────────────────────────

function SkeletonRows({ columns, showActions }: { columns: number; showActions: boolean }) {
  const totalCols = showActions ? columns + 1 : columns;

  return (
    <>
      {Array.from({ length: 5 }).map((_, rowIdx) => (
        <tr key={rowIdx}>
          {Array.from({ length: totalCols }).map((_, colIdx) => (
            <td key={colIdx} className="px-6 py-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
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
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
            {showActions && (
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                Acciones
              </th>
            )}
          </tr>
        </thead>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            <SkeletonRows columns={columns.length} showActions={showActions} />
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (showActions ? 1 : 0)}
                className="px-6 py-12 text-center text-sm text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50 transition-colors duration-150"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-6 py-4 text-sm text-gray-900 ${col.className ?? ''}`}
                  >
                    {col.render
                      ? col.render(item)
                      : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}

                {showActions && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {/* Active / Inactive toggle */}
                      {onToggleActive && (
                        <button
                          type="button"
                          onClick={() => onToggleActive(item)}
                          className="focus:outline-none"
                        >
                          <Badge
                            variant={(item as Record<string, unknown>).activo ? 'success' : 'error'}
                            size="sm"
                            className="cursor-pointer select-none"
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
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
