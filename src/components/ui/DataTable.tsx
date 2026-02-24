'use client';

import { useMemo, useState } from 'react';
import { ArrowsUpDownIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

type SortDirection = 'asc' | 'desc';
type SortingMode = 'client' | 'server';
type ColumnFilterType = 'text' | 'select';

export interface DataTableSortState {
  key: string;
  direction: SortDirection;
}

interface DataTableFilterOption {
  label: string;
  value: string;
}

interface DataTableColumnFilterConfig<T> {
  type?: ColumnFilterType;
  placeholder?: string;
  options?: DataTableFilterOption[];
  getFilterValue?: (item: T) => string | number | boolean | null | undefined;
}

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (item: T, index: number) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  sortable?: boolean;
  sortValue?: (item: T) => string | number | boolean | Date | null | undefined;
  filter?: DataTableColumnFilterConfig<T>;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (item: T, index: number) => string;
  isLoading?: boolean;
  loadingRows?: number;
  minWidthClassName?: string;
  emptyState?: React.ReactNode;
  emptyMessage?: string;
  rowClassName?: string | ((item: T, index: number) => string);
  initialSort?: DataTableSortState;
  sortingMode?: SortingMode;
  sortState?: DataTableSortState | null;
  onSortChange?: (sortState: DataTableSortState | null) => void;
  enableColumnFilters?: boolean;
  initialFilters?: Record<string, string>;
  filtersState?: Record<string, string>;
  onFiltersChange?: (filters: Record<string, string>) => void;
  enableRowSelection?: boolean;
  selectedRowKeys?: string[];
  onSelectedRowKeysChange?: (selectedKeys: string[]) => void;
  rowSelectionMode?: 'single' | 'multiple';
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  isLoading = false,
  loadingRows = 5,
  minWidthClassName = 'min-w-full',
  emptyState,
  emptyMessage = 'No hay registros disponibles.',
  rowClassName = 'border-b border-gray-100 transition-colors hover:bg-gray-50',
  sortingMode = 'client',
  sortState,
  onSortChange,
  enableColumnFilters = false,
  initialFilters = {},
  filtersState,
  onFiltersChange,
  enableRowSelection = false,
  selectedRowKeys,
  onSelectedRowKeysChange,
  rowSelectionMode = 'multiple',
  initialSort,
}: DataTableProps<T>) {
  const [internalSortState, setInternalSortState] = useState<DataTableSortState | null>(
    initialSort ?? null
  );
  const [internalFiltersState, setInternalFiltersState] = useState<Record<string, string>>(initialFilters);
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<string[]>([]);

  const activeSortState = sortingMode === 'server'
    ? (sortState ?? null)
    : (sortState ?? internalSortState);

  const activeFilters = filtersState ?? internalFiltersState;
  const activeSelectedKeys = selectedRowKeys ?? internalSelectedKeys;
  const selectedSet = useMemo(() => new Set(activeSelectedKeys), [activeSelectedKeys]);

  const resolveRowClass = (item: T, index: number) =>
    typeof rowClassName === 'function' ? rowClassName(item, index) : rowClassName;

  const getComparableValue = (column: DataTableColumn<T>, item: T) => {
    const value = column.sortValue
      ? column.sortValue(item)
      : (item as Record<string, unknown>)[column.key];

    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'boolean') return value ? 1 : 0;
    return value;
  };

  const setSelectedKeys = (keys: string[]) => {
    onSelectedRowKeysChange?.(keys);
    if (!selectedRowKeys) {
      setInternalSelectedKeys(keys);
    }
  };

  const filteredData = useMemo(() => {
    if (!enableColumnFilters) return data;

    return data.filter((item) => {
      return columns.every((column) => {
        const filterValue = (activeFilters[column.key] ?? '').trim();
        if (!filterValue) return true;
        if (!column.filter) return true;

        const rawValue = column.filter.getFilterValue
          ? column.filter.getFilterValue(item)
          : (item as Record<string, unknown>)[column.key];

        const normalizedValue = String(rawValue ?? '').toLowerCase();
        const normalizedFilter = filterValue.toLowerCase();
        const filterType = column.filter.type ?? 'text';

        if (filterType === 'select') {
          return normalizedValue === normalizedFilter;
        }

        return normalizedValue.includes(normalizedFilter);
      });
    });
  }, [activeFilters, columns, data, enableColumnFilters]);

  const processedData = useMemo(() => {
    if (sortingMode === 'server' || !activeSortState?.key) return filteredData;

    const column = columns.find((col) => col.key === activeSortState.key);
    if (!column) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = getComparableValue(column, a);
      const bValue = getComparableValue(column, b);

      let comparison = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue), 'es', {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return activeSortState.direction === 'asc' ? comparison : -comparison;
    });
  }, [activeSortState, columns, filteredData, sortingMode]);

  const updateSortState = (nextSortState: DataTableSortState | null) => {
    onSortChange?.(nextSortState);
    if (!sortState) {
      setInternalSortState(nextSortState);
    }
  };

  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable) return;

    if (!activeSortState || activeSortState.key !== column.key) {
      updateSortState({ key: column.key, direction: 'asc' });
      return;
    }

    if (activeSortState.direction === 'asc') {
      updateSortState({ key: column.key, direction: 'desc' });
      return;
    }

    updateSortState(null);
  };

  const handleFilterChange = (key: string, value: string) => {
    const nextFilters = { ...activeFilters, [key]: value };
    onFiltersChange?.(nextFilters);
    if (!filtersState) {
      setInternalFiltersState(nextFilters);
    }
  };

  const visibleRowKeys = processedData.map((item, index) => getRowKey(item, index));
  const allVisibleSelected =
    visibleRowKeys.length > 0 && visibleRowKeys.every((key) => selectedSet.has(key));
  const someVisibleSelected =
    visibleRowKeys.some((key) => selectedSet.has(key)) && !allVisibleSelected;

  const toggleRowSelection = (rowKey: string) => {
    if (rowSelectionMode === 'single') {
      setSelectedKeys(selectedSet.has(rowKey) ? [] : [rowKey]);
      return;
    }

    if (selectedSet.has(rowKey)) {
      setSelectedKeys(activeSelectedKeys.filter((key) => key !== rowKey));
      return;
    }

    setSelectedKeys([...activeSelectedKeys, rowKey]);
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedKeys(activeSelectedKeys.filter((key) => !visibleRowKeys.includes(key)));
      return;
    }

    const merged = new Set([...activeSelectedKeys, ...visibleRowKeys]);
    setSelectedKeys(Array.from(merged));
  };

  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${minWidthClassName}`}>
        <thead>
          <tr className="border-b border-gray-200">
            {enableRowSelection && (
              <th className="w-10 px-4 py-3 text-left">
                {rowSelectionMode === 'multiple' && (
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = someVisibleSelected;
                      }
                    }}
                    onChange={toggleSelectAllVisible}
                    className="h-4 w-4 rounded border-gray-300 text-[#003B7A] focus:ring-[#7AB82E]"
                    aria-label="Seleccionar todas las filas visibles"
                  />
                )}
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-left text-sm font-semibold text-gray-900 ${column.headerClassName ?? ''}`}
                aria-sort={
                  column.sortable && activeSortState?.key === column.key
                    ? activeSortState.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => handleSort(column)}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-[#003B7A]"
                  >
                    <span>{column.header}</span>
                    {activeSortState?.key !== column.key ? (
                      <ArrowsUpDownIcon className="h-4 w-4 text-gray-400" />
                    ) : activeSortState.direction === 'asc' ? (
                      <ChevronUpIcon className="h-4 w-4 text-[#003B7A]" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4 text-[#003B7A]" />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
          {enableColumnFilters && (
            <tr className="border-b border-gray-100 bg-gray-50/60">
              {enableRowSelection && <th className="px-4 py-2" />}
              {columns.map((column) => {
                const filterConfig = column.filter;
                if (!filterConfig) {
                  return <th key={`filter-${column.key}`} className="px-4 py-2" />;
                }

                const filterType = filterConfig.type ?? 'text';
                const value = activeFilters[column.key] ?? '';

                return (
                  <th key={`filter-${column.key}`} className="px-4 py-2">
                    {filterType === 'select' ? (
                      <select
                        value={value}
                        onChange={(e) => handleFilterChange(column.key, e.target.value)}
                        className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:border-[#003B7A] focus:outline-none"
                      >
                        <option value="">{filterConfig.placeholder || 'Todos'}</option>
                        {(filterConfig.options ?? []).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleFilterChange(column.key, e.target.value)}
                        placeholder={filterConfig.placeholder || 'Filtrar'}
                        className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 placeholder:text-gray-400 focus:border-[#003B7A] focus:outline-none"
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          )}
        </thead>
        <tbody>
          {isLoading ? (
            [...Array(loadingRows)].map((_, rowIndex) => (
              <tr key={`loading-${rowIndex}`} className="border-b border-gray-100">
                {enableRowSelection && (
                  <td className="px-4 py-4">
                    <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={`${column.key}-${rowIndex}`} className="px-4 py-4">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                  </td>
                ))}
              </tr>
            ))
          ) : processedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (enableRowSelection ? 1 : 0)} className="px-4 py-10 text-center">
                {emptyState || <p className="text-sm text-gray-500">{emptyMessage}</p>}
              </td>
            </tr>
          ) : (
            processedData.map((item, index) => {
              const rowKey = getRowKey(item, index);
              const isSelected = selectedSet.has(rowKey);
              return (
              <tr key={getRowKey(item, index)} className={resolveRowClass(item, index)}>
                {enableRowSelection && (
                  <td className="px-4 py-4 align-top">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRowSelection(rowKey)}
                      className="h-4 w-4 rounded border-gray-300 text-[#003B7A] focus:ring-[#7AB82E]"
                      aria-label="Seleccionar fila"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-4 ${column.cellClassName ?? ''}`}>
                    {column.render(item, index)}
                  </td>
                ))}
              </tr>
            )})
          )}
        </tbody>
      </table>
    </div>
  );
}

interface DataTablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  isLoading?: boolean;
  className?: string;
}

export function DataTablePagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  isLoading = false,
  className = '',
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems);

  const pageNumbers = useMemo(() => {
    const windowSize = 5;
    const start = Math.max(1, currentPage - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    const adjustedStart = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - adjustedStart + 1 }, (_, idx) => adjustedStart + idx);
  }, [currentPage, totalPages]);

  return (
    <div className={`mt-6 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-gray-600">
          Mostrando {pageStart}-{pageEnd} de {totalItems}
          {totalPages > 1 && ` (Pagina ${currentPage} de ${totalPages})`}
        </p>
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Ver</label>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-[#003B7A] focus:outline-none"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentPage <= 1 || isLoading}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          Anterior
        </button>

        {pageNumbers.map((page) => (
          <button
            key={page}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              page === currentPage
                ? 'bg-[#003B7A] text-white'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
            disabled={isLoading}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentPage >= totalPages || isLoading}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

