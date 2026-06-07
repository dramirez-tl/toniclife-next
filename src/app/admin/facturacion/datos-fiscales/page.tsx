// app/admin/facturacion/datos-fiscales/page.tsx - Gestión de Datos Fiscales
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.5 Facturación
'use client';

import { Suspense, useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import {
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
  UserIcon,
  FunnelIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { getFiscalRegimeName, getCfdiUseName } from '@/types/billing';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useFiscalDataList } from '@/hooks/useBilling';
import type { FiscalDataQueryDto, FiscalDataItem } from '@/services/billing.service';
import { useQueryFilters } from '@/hooks/useQueryFilters';

export default function DatosFiscalesPage() {
  return <Suspense><DatosFiscalesContent /></Suspense>;
}

function DatosFiscalesContent() {
  const [searchInput, setSearchInput] = useState('');

  const { get, getNumber, setParams } = useQueryFilters({
    validated: 'all',
    page: '1',
    limit: '20',
  });

  const filterValidated = get('validated');
  const currentPage = getNumber('page');
  const pageSize = getNumber('limit');
  const searchQuery = get('search');

  // Build query params for server-side filtering
  const queryParams: FiscalDataQueryDto = useMemo(() => {
    const params: FiscalDataQueryDto = {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
    };
    if (searchQuery) params.search = searchQuery;
    if (filterValidated === 'validated') params.validated = true;
    if (filterValidated === 'pending') params.validated = false;
    return params;
  }, [searchQuery, filterValidated, currentPage, pageSize]);

  const { data: fiscalResult, isLoading, isFetching, error, refetch } = useFiscalDataList(queryParams);

  const fiscalDataList = fiscalResult?.data ?? [];
  const totalItems = fiscalResult?.total ?? 0;
  const backendTotalPages = fiscalResult?.totalPages;

  // Handlers
  const handleSearch = () => {
    setParams({ search: searchInput.trim() });
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const resetFilters = () => {
    setSearchInput('');
    setParams({ search: null, validated: null, page: null, limit: null });
  };

  const hasActiveFilters = Boolean(searchQuery || filterValidated !== 'all');

  useEffect(() => {
    if (backendTotalPages && currentPage > backendTotalPages) {
      setParams({ page: String(backendTotalPages) });
    }
  }, [backendTotalPages, currentPage, setParams]);

  // Stats (from total count)
  const stats = useMemo(() => ({
    total: totalItems,
    validated: fiscalDataList.filter((d) => d.isValidated).length,
    pending: fiscalDataList.filter((d) => !d.isValidated).length,
  }), [totalItems, fiscalDataList]);

  // Loading state
  if (isLoading && !fiscalResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-center gap-3 mb-2">
              <BuildingOfficeIcon className="h-9 w-9" />
              <h1 className="text-3xl font-bold sm:text-4xl">Datos Fiscales</h1>
            </div>
            <p className="text-white/80 text-lg">Cargando datos fiscales...</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                    <div className="h-8 w-16 bg-gray-200 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Table columns
  const columns: DataTableColumn<FiscalDataItem>[] = [
    {
      key: 'customer',
      header: 'Cliente',
      sortable: true,
      sortValue: (item) => item.legalName,
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-[#3E667D]/10 flex items-center justify-center">
            <UserIcon className="h-5 w-5 text-[#3E667D]" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{item.legalName}</p>
            <p className="text-sm text-gray-500">#{item.customerNumber || '-'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'rfc',
      header: 'RFC',
      sortable: true,
      sortValue: (item) => item.rfc,
      render: (item) => (
        <span className="font-mono text-sm text-[#3E667D] font-medium">
          {item.rfc}
        </span>
      ),
    },
    {
      key: 'taxRegime',
      header: 'Régimen Fiscal',
      render: (item) => (
        <p className="text-sm text-gray-600">
          {item.taxRegime ? getFiscalRegimeName(item.taxRegime) : <span className="text-gray-400">Sin régimen</span>}
        </p>
      ),
    },
    {
      key: 'cfdiUse',
      header: 'Uso CFDI',
      render: (item) => (
        <p className="text-sm text-gray-600">
          {item.defaultCfdiUse ? getCfdiUseName(item.defaultCfdiUse) : <span className="text-gray-400">-</span>}
        </p>
      ),
    },
    {
      key: 'postalCode',
      header: 'C.P.',
      render: (item) => (
        <span className="text-sm text-gray-600 font-mono">{item.postalCode || '-'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      sortValue: (item) => (item.isValidated ? 1 : 0),
      render: (item) =>
        item.isValidated ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Completo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <XCircleIcon className="h-3 w-3" />
            Incompleto
          </span>
        ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/admin/facturacion/datos-fiscales/${item.id}`}>
            <button
              className="rounded-lg p-2 transition-colors hover:bg-blue-50"
              title="Editar datos fiscales"
            >
              <PencilSquareIcon className="h-4 w-4 text-blue-600" />
            </button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/facturacion"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Link>
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <BuildingOfficeIcon className="h-9 w-9" />
                  <h1 className="text-3xl font-bold sm:text-4xl">Datos Fiscales</h1>
                </div>
                <p className="text-base text-white/80 sm:text-lg">
                  Gestiona los datos fiscales de los clientes para facturación
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total con RFC</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Datos Completos</p>
                  <p className="text-3xl font-bold text-green-600">{stats.validated}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Datos Incompletos</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <XCircleIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6 border-gray-100 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-gray-700">Búsqueda y filtros</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-gray-600"
                  onClick={handleRefresh}
                  disabled={isFetching}
                >
                  <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                  {isFetching ? 'Actualizando...' : 'Actualizar'}
                </Button>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
              {/* Search */}
              <div className="lg:col-span-8">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por RFC, nombre o número de cliente..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearch();
                        }
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    />
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-10 px-4 sm:min-w-[96px]"
                    onClick={handleSearch}
                  >
                    Buscar
                  </Button>
                </div>
              </div>

              {/* Validation Filter */}
              <div className="lg:col-span-4">
                <SearchableSelect
                  options={[
                    { value: 'validated', label: 'Datos Completos' },
                    { value: 'pending', label: 'Datos Incompletos' },
                  ]}
                  value={filterValidated}
                  onChange={(val) => setParams({ validated: val })}
                  allLabel="Todos los Estados"
                  allValue="all"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                  Filtros activos
                </span>
                {searchQuery && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                    Búsqueda: {searchQuery}
                  </span>
                )}
                {filterValidated !== 'all' && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                    Estado: {filterValidated === 'validated' ? 'Completos' : 'Incompletos'}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900">Listado de datos fiscales</h2>
              <p className="text-sm text-gray-600">
                Mostrando {fiscalDataList.length} de {totalItems.toLocaleString()}
              </p>
            </div>
            {isFetching && (
              <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                Actualizando resultados...
              </div>
            )}
            <DataTable
              columns={columns}
              data={fiscalDataList}
              isLoading={isLoading && !fiscalResult}
              getRowKey={(item) => item.id}
              minWidthClassName="min-w-[900px]"
              emptyState={
                <div className="py-2 text-center">
                  <BuildingOfficeIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                  <h3 className="mb-2 text-xl font-bold text-gray-900">
                    No se encontraron registros
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery
                      ? 'Intenta con otros términos de búsqueda'
                      : 'No hay clientes con datos fiscales registrados'}
                  </p>
                  {hasActiveFilters && (
                    <div className="mt-4">
                      <Button variant="outline" onClick={resetFilters}>
                        Limpiar filtros
                      </Button>
                    </div>
                  )}
                </div>
              }
            />

            {/* Pagination */}
            {fiscalDataList.length > 0 && (
              <DataTablePagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={totalItems}
                isLoading={isLoading || isFetching}
                onPageChange={(p) => setParams({ page: String(p) })}
                onPageSizeChange={(size) => {
                  setParams({ limit: String(size), page: null });
                }}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
