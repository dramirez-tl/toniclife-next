'use client';

import { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  UsersIcon,
  UserPlusIcon,
  UserMinusIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type DataTableColumn } from '@/components/ui';
import { useNewCustomersReport, useInactiveCustomersReport } from '@/hooks/useReports';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import type { NewCustomer, InactiveCustomer } from '@/types/reports';
import { exportToCsv, csvDateStamp } from '@/lib/csv-export';
import { toast } from 'sonner';

type ViewMode = 'new' | 'inactive';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(amount);
};

const getTypeColor = (type: string) => {
  switch (type.toLowerCase()) {
    case 'distribuidor':
      return 'bg-purple-100 text-purple-800';
    case 'cliente preferente':
      return 'bg-blue-100 text-blue-800';
    case 'cliente final':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getInactivityColor = (days: number) => {
  if (days >= 120) return 'text-red-600 bg-red-50';
  if (days >= 90) return 'text-orange-600 bg-orange-50';
  return 'text-yellow-600 bg-yellow-50';
};

// Helper to get date 30 days ago
function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}

export default function ClientesReportesPage() {
  return (
    <Suspense>
      <ClientesReportesContent />
    </Suspense>
  );
}

function ClientesReportesContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    viewMode: 'new',
    type: 'all',
    inactiveDays: '90',
  });

  const viewMode = get('viewMode') as ViewMode;
  const selectedType = get('type');
  const inactiveDays = getNumber('inactiveDays') || 90;
  const dateFrom = get('dateFrom') || getDefaultStartDate();
  const dateTo = get('dateTo') || getDefaultEndDate();

  const dateRange = { start: dateFrom, end: dateTo };

  const [searchTerm, setSearchTerm] = useState('');

  // API hooks
  const { data: newCustomersData, isLoading: loadingNew } = useNewCustomersReport({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const { data: inactiveCustomersData, isLoading: loadingInactive } = useInactiveCustomersReport({
    startDate: dateRange.start,
    endDate: dateRange.end,
    inactiveDays,
  });

  const isLoading = (viewMode === 'new' && loadingNew) || (viewMode === 'inactive' && loadingInactive);

  // Data from API
  const newCustomers = newCustomersData?.customers ?? [];
  const inactiveCustomers = inactiveCustomersData?.customers ?? [];

  // Calculate counts
  const newCount = newCustomersData?.count ?? 0;
  const inactiveCount = inactiveCustomersData?.count ?? 0;
  const distributorsCount = newCustomers.filter((c) => c.type === 'Distribuidor').length;
  const preferentCount = newCustomers.filter((c) => c.type === 'Cliente Preferente').length;

  // Filter data
  const filteredNewCustomers = useMemo(() => {
    return newCustomers.filter((customer) => {
      const matchesType = selectedType === 'all' || customer.type === selectedType;
      const matchesSearch =
        searchTerm === '' ||
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [newCustomers, selectedType, searchTerm]);

  const filteredInactiveCustomers = useMemo(() => {
    return inactiveCustomers
      .filter((customer) => {
        const matchesSearch =
          searchTerm === '' ||
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.email.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => b.inactiveDays - a.inactiveDays);
  }, [inactiveCustomers, searchTerm]);

  const handleExport = () => {
    if (viewMode === 'new') {
      if (filteredNewCustomers.length === 0) {
        toast.error('No hay clientes para exportar');
        return;
      }
      exportToCsv(
        `clientes_nuevos_${csvDateStamp()}.csv`,
        ['Cliente', 'Email', 'Tipo', 'Patrocinador', 'Fecha Registro'],
        filteredNewCustomers.map((c) => [
          c.name,
          c.email,
          c.type,
          c.sponsorName || '',
          new Date(c.createdAt).toLocaleDateString('es-MX'),
        ]),
      );
    } else {
      if (filteredInactiveCustomers.length === 0) {
        toast.error('No hay clientes para exportar');
        return;
      }
      exportToCsv(
        `clientes_inactivos_${csvDateStamp()}.csv`,
        ['Cliente', 'Email', 'Última Compra', 'Días Inactivo', 'Total Histórico'],
        filteredInactiveCustomers.map((c) => [
          c.name,
          c.email,
          c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('es-MX') : 'Nunca',
          c.inactiveDays,
          c.totalPurchases,
        ]),
      );
    }
    toast.success('CSV descargado');
  };

  const newCustomerColumns = useMemo<DataTableColumn<NewCustomer>[]>(
    () => [
      {
        key: 'customer',
        header: 'Cliente',
        render: (customer) => (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-sm font-medium text-green-700">
                {customer.name.split(' ').map((n) => n[0]).join('')}
              </span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">{customer.name}</p>
              <p className="text-sm text-gray-500 flex items-center">
                <EnvelopeIcon className="h-3 w-3 mr-1" />
                {customer.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Tipo',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        render: (customer) => (
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getTypeColor(customer.type)}`}>
            {customer.type}
          </span>
        ),
      },
      {
        key: 'sponsor',
        header: 'Patrocinador',
        cellClassName: 'text-sm text-gray-500',
        render: (customer) =>
          customer.sponsorName || (
            <span className="text-gray-400 italic">Sin patrocinador</span>
          ),
      },
      {
        key: 'createdAt',
        header: 'Fecha Registro',
        headerClassName: 'text-center',
        cellClassName: 'text-center text-sm text-gray-500',
        render: (customer) => new Date(customer.createdAt).toLocaleDateString('es-MX'),
      },
    ],
    []
  );

  const inactiveCustomerColumns = useMemo<DataTableColumn<InactiveCustomer>[]>(
    () => [
      {
        key: 'customer',
        header: 'Cliente',
        render: (customer) => (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {customer.name.split(' ').map((n) => n[0]).join('')}
              </span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">{customer.name}</p>
              <p className="text-sm text-gray-500 flex items-center">
                <EnvelopeIcon className="h-3 w-3 mr-1" />
                {customer.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'lastOrderDate',
        header: 'Última Compra',
        headerClassName: 'text-center',
        cellClassName: 'text-center text-sm text-gray-500',
        render: (customer) =>
          customer.lastOrderDate
            ? new Date(customer.lastOrderDate).toLocaleDateString('es-MX')
            : 'Nunca',
      },
      {
        key: 'inactiveDays',
        header: 'Días Inactivo',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        render: (customer) => (
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getInactivityColor(customer.inactiveDays)}`}>
            {customer.inactiveDays} días
          </span>
        ),
      },
      {
        key: 'totalPurchases',
        header: 'Total Histórico',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (customer) => (
          <div className="flex items-center justify-end">
            <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-1" />
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(customer.totalPurchases)}
            </span>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/reportes" className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reportes de Clientes</h1>
            <p className="mt-1 text-sm text-gray-500">
              Clientes nuevos, inactivos y análisis de retención
            </p>
          </div>
        </div>
        <Button variant="success" onClick={handleExport}>
          <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-lg bg-green-100 p-3">
                <UserPlusIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Clientes Nuevos</p>
                <p className="text-2xl font-semibold text-green-600">{newCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-lg bg-purple-100 p-3">
                <UsersIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Nuevos Distribuidores</p>
                <p className="text-2xl font-semibold text-purple-600">{distributorsCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-lg bg-blue-100 p-3">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Nuevos Preferentes</p>
                <p className="text-2xl font-semibold text-blue-600">{preferentCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-lg bg-red-100 p-3">
                <UserMinusIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Clientes Inactivos</p>
                <p className="text-2xl font-semibold text-red-600">{inactiveCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10"
                />
              </div>
            </div>

            {viewMode === 'new' && (
              <>
                <div className="flex items-center space-x-2">
                  <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setParams({ dateFrom: e.target.value })}
                    className="w-auto"
                  />
                  <span className="text-gray-500">a</span>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setParams({ dateTo: e.target.value })}
                    className="w-auto"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <FunnelIcon className="h-5 w-5 text-gray-400" />
                  <SearchableSelect
                    options={[
                      { value: 'Distribuidor', label: 'Distribuidor' },
                      { value: 'Cliente Preferente', label: 'Cliente Preferente' },
                      { value: 'Cliente Final', label: 'Cliente Final' },
                    ]}
                    value={selectedType}
                    onChange={(val) => setParams({ type: val })}
                    allLabel="Todos los tipos"
                    allValue="all"
                  />
                </div>
              </>
            )}

            {viewMode === 'inactive' && (
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700">Inactivos más de:</span>
                <SearchableSelect
                  options={[
                    { value: '30', label: '30 días' },
                    { value: '60', label: '60 días' },
                    { value: '90', label: '90 días' },
                    { value: '120', label: '120 días' },
                  ]}
                  value={String(inactiveDays)}
                  onChange={(val) => setParams({ inactiveDays: val })}
                  showAllOption={false}
                />
              </div>
            )}

            <div className="flex rounded-lg bg-gray-100 p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setParams({ viewMode: 'new' })}
                className={
                  viewMode === 'new'
                    ? 'bg-white text-gray-900 shadow hover:bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }
              >
                <UserPlusIcon className="mr-1 inline h-4 w-4" />
                Nuevos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setParams({ viewMode: 'inactive' })}
                className={
                  viewMode === 'inactive'
                    ? 'bg-white text-gray-900 shadow hover:bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }
              >
                <UserMinusIcon className="mr-1 inline h-4 w-4" />
                Inactivos
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Cargando datos...</p>
            </div>
          </div>
        ) : viewMode === 'new' ? (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Clientes Nuevos del Periodo</h3>
            </div>
            <DataTable<NewCustomer>
              columns={newCustomerColumns}
              data={filteredNewCustomers}
              getRowKey={(customer) => customer.customerId}
              emptyState={
                <div className="py-12 text-center">
                  <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No hay clientes nuevos en este periodo</p>
                </div>
              }
            />
          </>
        ) : null}

        {viewMode === 'inactive' && !isLoading && (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Clientes Inactivos</h3>
              <p className="text-sm text-gray-500">Clientes sin compras en los últimos {inactiveDays} días</p>
            </div>
            <DataTable<InactiveCustomer>
              columns={inactiveCustomerColumns}
              data={filteredInactiveCustomers}
              getRowKey={(customer) => customer.customerId}
              emptyState={
                <div className="py-12 text-center">
                  <UserMinusIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No hay clientes inactivos con los filtros seleccionados</p>
                </div>
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
