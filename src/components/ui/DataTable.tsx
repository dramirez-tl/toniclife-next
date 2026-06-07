'use client';

import { useMemo, useState } from 'react';
import { ArrowsUpDownIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

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
      <Table className={`w-full ${minWidthClassName}`}>
        <TableHeader>
          <TableRow className="border-b border-gray-200 hover:bg-transparent">
            {enableRowSelection && (
              <TableHead className="w-10 px-4 py-3 text-left">
                {rowSelectionMode === 'multiple' && (
                  <Checkbox
                    checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleSelectAllVisible}
                    aria-label="Seleccionar todas las filas visibles"
                  />
                )}
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead
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
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-[#3E667D]"
                  >
                    <span>{column.header}</span>
                    {activeSortState?.key !== column.key ? (
                      <ArrowsUpDownIcon className="h-4 w-4 text-gray-400" />
                    ) : activeSortState.direction === 'asc' ? (
                      <ChevronUpIcon className="h-4 w-4 text-[#3E667D]" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4 text-[#3E667D]" />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
          </TableRow>
          {enableColumnFilters && (
            <TableRow className="border-b border-gray-100 bg-gray-50/60 hover:bg-gray-50/60">
              {enableRowSelection && <TableHead className="px-4 py-2" />}
              {columns.map((column) => {
                const filterConfig = column.filter;
                if (!filterConfig) {
                  return <TableHead key={`filter-${column.key}`} className="px-4 py-2" />;
                }

                const filterType = filterConfig.type ?? 'text';
                const value = activeFilters[column.key] ?? '';

                return (
                  <TableHead key={`filter-${column.key}`} className="px-4 py-2">
                    {filterType === 'select' ? (
                      <SearchableSelect
                        options={(filterConfig.options ?? []).map((option) => ({ value: option.value, label: option.label }))}
                        value={value}
                        onChange={(val) => handleFilterChange(column.key, val)}
                        allLabel={filterConfig.placeholder || 'Todos'}
                        allValue=""
                        className="w-full"
                      />
                    ) : (
                      <Input
                        type="text"
                        value={value}
                        onChange={(e) => handleFilterChange(column.key, e.target.value)}
                        placeholder={filterConfig.placeholder || 'Filtrar'}
                        className="h-auto w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-none placeholder:text-gray-400 focus-visible:border-[#3E667D] focus-visible:ring-0"
                      />
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          )}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            [...Array(loadingRows)].map((_, rowIndex) => (
              <TableRow key={`loading-${rowIndex}`} className="border-b border-gray-100 hover:bg-transparent">
                {enableRowSelection && (
                  <TableCell className="px-4 py-4">
                    <Skeleton className="h-4 w-4 rounded bg-gray-200" />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={`${column.key}-${rowIndex}`} className="px-4 py-4">
                    <Skeleton className="h-4 w-3/4 rounded bg-gray-200" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : processedData.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length + (enableRowSelection ? 1 : 0)} className="px-4 py-10 text-center">
                {emptyState || <p className="text-sm text-gray-500">{emptyMessage}</p>}
              </TableCell>
            </TableRow>
          ) : (
            processedData.map((item, index) => {
              const rowKey = getRowKey(item, index);
              const isSelected = selectedSet.has(rowKey);
              return (
              <TableRow key={getRowKey(item, index)} className={resolveRowClass(item, index)}>
                {enableRowSelection && (
                  <TableCell className="px-4 py-4 align-top">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleRowSelection(rowKey)}
                      aria-label="Seleccionar fila"
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.key} className={`px-4 py-4 whitespace-normal ${column.cellClassName ?? ''}`}>
                    {column.render(item, index)}
                  </TableCell>
                ))}
              </TableRow>
            )})
          )}
        </TableBody>
      </Table>
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
            <SearchableSelect
              options={pageSizeOptions.map((size) => ({ value: String(size), label: String(size) }))}
              value={String(pageSize)}
              onChange={(val) => onPageSizeChange(Number(val))}
              showAllOption={false}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          disabled={currentPage <= 1 || isLoading}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          Anterior
        </Button>

        {pageNumbers.map((page) => (
          <Button
            key={page}
            type="button"
            variant={page === currentPage ? 'default' : 'outline'}
            size="sm"
            className={
              page === currentPage
                ? 'rounded-lg bg-[#3E667D] text-sm font-medium text-white hover:bg-[#3E667D]'
                : 'rounded-lg border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50'
            }
            disabled={isLoading}
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          disabled={currentPage >= totalPages || isLoading}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
