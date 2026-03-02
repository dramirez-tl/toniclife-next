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
import { useNewCustomersReport, useInactiveCustomersReport } from '@/hooks/useReports';
import { useQueryFilters } from '@/hooks/useQueryFilters';

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
        <button className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500">
          <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
          Exportar Excel
        </button>
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
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border-gray-300 pl-10 text-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>

            {viewMode === 'new' && (
              <>
                <div className="flex items-center space-x-2">
                  <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setParams({ dateFrom: e.target.value })}
                    className="rounded-md border-gray-300 text-sm focus:border-green-500 focus:ring-green-500"
                  />
                  <span className="text-gray-500">a</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setParams({ dateTo: e.target.value })}
                    className="rounded-md border-gray-300 text-sm focus:border-green-500 focus:ring-green-500"
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
              <button
                onClick={() => setParams({ viewMode: 'new' })}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  viewMode === 'new'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UserPlusIcon className="mr-1 inline h-4 w-4" />
                Nuevos
              </button>
              <button
                onClick={() => setParams({ viewMode: 'inactive' })}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  viewMode === 'inactive'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UserMinusIcon className="mr-1 inline h-4 w-4" />
                Inactivos
              </button>
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
            {filteredNewCustomers.length === 0 ? (
              <div className="py-12 text-center">
                <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No hay clientes nuevos en este periodo</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Patrocinador
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                        Fecha Registro
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredNewCustomers.map((customer) => (
                      <tr key={customer.customerId} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4">
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
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getTypeColor(customer.type)}`}>
                            {customer.type}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {customer.sponsorName || (
                            <span className="text-gray-400 italic">Sin patrocinador</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500">
                          {new Date(customer.createdAt).toLocaleDateString('es-MX')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}

        {viewMode === 'inactive' && !isLoading && (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Clientes Inactivos</h3>
              <p className="text-sm text-gray-500">Clientes sin compras en los últimos {inactiveDays} días</p>
            </div>
            {filteredInactiveCustomers.length === 0 ? (
              <div className="py-12 text-center">
                <UserMinusIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No hay clientes inactivos con los filtros seleccionados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                        Última Compra
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                        Días Inactivo
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Total Histórico
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredInactiveCustomers.map((customer) => (
                      <tr key={customer.customerId} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4">
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
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500">
                          {customer.lastOrderDate
                            ? new Date(customer.lastOrderDate).toLocaleDateString('es-MX')
                            : 'Nunca'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getInactivityColor(customer.inactiveDays)}`}>
                            {customer.inactiveDays} días
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <div className="flex items-center justify-end">
                            <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(customer.totalPurchases)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
