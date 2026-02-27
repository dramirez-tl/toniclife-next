'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import { PermissionGuard } from '@/components/auth';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchCustomers,
  setFilters,
  selectCustomers,
  selectCustomersLoading,
  selectCustomersError,
  selectCustomersPagination,
  selectCustomersFilters,
  deleteCustomer,
} from '@/store/slices/customersSlice';
import { selectUserRoles } from '@/store/slices/authSlice';
import type { Customer, CustomerStatus } from '@/types/customer';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  pending: 'Pendiente',
  suspended: 'Suspendido',
};

const typeLabels: Record<string, string> = {
  distributor: 'Distribuidor',
  retail: 'Cliente',
  preferred: 'Preferente',
};

const COUNTRY_OPTIONS = [
  { value: 'b47b4f94-011d-4071-adf9-5c5285606af7', label: 'México' },
  { value: 'e6ba6110-76ee-4bb2-90e8-408c993cbe4e', label: 'Estados Unidos' },
  { value: '0dc6fde0-ea26-44d3-80b7-eec55cfe6b7a', label: 'Colombia' },
  { value: '6cfc176a-e5e8-4843-8a11-a1a967f2c6b5', label: 'Guatemala' },
];

export default function DistribuidoresAdminPage() {
  const dispatch = useAppDispatch();
  const customers = useAppSelector(selectCustomers);
  const isLoading = useAppSelector(selectCustomersLoading);
  const error = useAppSelector(selectCustomersError);
  const pagination = useAppSelector(selectCustomersPagination);
  const filters = useAppSelector(selectCustomersFilters);
  const userRoles = useAppSelector(selectUserRoles);
  const isSuperAdmin = userRoles.includes('super_admin');

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<CustomerStatus | 'all'>('all');
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  // Fetch customers on component mount and filter changes
  const loadCustomers = useCallback(() => {
    const params = {
      page: filters.page || 1,
      limit: pageSize,
      search: searchQuery || undefined,
      customerType: filterType !== 'all' ? filterType : undefined,
      status: filterStatus !== 'all' ? filterStatus : undefined,
      countryId: filterCountry !== 'all' ? filterCountry : undefined,
      sortBy,
      sortOrder,
    };
    dispatch(fetchCustomers(params));
  }, [dispatch, filters.page, pageSize, searchQuery, filterType, filterStatus, filterCountry, sortBy, sortOrder]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(setFilters({ page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, dispatch]);

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
    dispatch(setFilters({ page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    dispatch(setFilters({ page: newPage }));
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    dispatch(setFilters({ page: 1 }));
  };

  const handleFilterType = (value: string) => {
    setFilterType(value);
    dispatch(setFilters({ page: 1 }));
  };

  const handleFilterStatus = (value: string) => {
    setFilterStatus(value as CustomerStatus | 'all');
    dispatch(setFilters({ page: 1 }));
  };

  const handleRefresh = () => {
    loadCustomers();
  };

  const handleFilterCountry = (value: string) => {
    setFilterCountry(value);
    dispatch(setFilters({ page: 1 }));
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSearchInput('');
    setFilterType('all');
    setFilterStatus('all');
    setFilterCountry('all');
    setSortBy('createdAt');
    setSortOrder('desc');
    dispatch(setFilters({ page: 1 }));
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteConfirmText('');
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setCustomerToDelete(null);
    setDeleteConfirmText('');
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete || deleteConfirmText !== 'ELIMINAR') return;
    setIsDeleting(true);
    try {
      await dispatch(deleteCustomer(customerToDelete.id));
      toast.success(`${customerToDelete.firstName} ${customerToDelete.lastName} ha sido eliminado correctamente`);
      handleCloseDeleteModal();
    } catch {
      toast.error('Error al eliminar el cliente');
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => ({
    total: pagination.total,
    active: customers.filter((c) => c.status === 'active').length,
    distributors: customers.filter((c) => c.customerType === 'distributor').length,
  }), [customers, pagination.total]);

  const hasActiveFilters = Boolean(searchQuery || filterType !== 'all' || filterStatus !== 'all' || filterCountry !== 'all');

  // Column definitions
  const columns: DataTableColumn<Customer>[] = [
    {
      key: 'name',
      header: 'Cliente',
      sortable: true,
      sortValue: (c) => `${c.firstName} ${c.lastName}`,
      render: (customer) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-[#3E667D]/10 flex items-center justify-center">
            <UserGroupIcon className="h-5 w-5 text-[#3E667D]" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {customer.firstName} {customer.lastName}
            </p>
            <p className="text-sm text-gray-500">{customer.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      sortable: true,
      sortValue: (c) => c.customerType,
      render: (customer) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            customer.customerType === 'distributor'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-purple-100 text-purple-800'
          }`}
        >
          {typeLabels[customer.customerType] || customer.customerType}
        </span>
      ),
    },
    {
      key: 'customerNumber',
      header: 'Código Referido',
      sortable: true,
      sortValue: (c) => c.customerNumber || '',
      render: (customer) => (
        <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-sm font-mono font-medium text-gray-800">
          {customer.customerNumber || '-'}
        </span>
      ),
    },
    {
      key: 'sponsor',
      header: 'Patrocinador',
      render: (customer) =>
        customer.sponsor ? (
          <div>
            <p className="text-sm font-medium text-gray-900">
              {customer.sponsor.firstName} {customer.sponsor.lastName}
            </p>
            {customer.sponsor.email && (
              <p className="text-xs text-gray-500">{customer.sponsor.email}</p>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        ),
    },
    {
      key: 'contact',
      header: 'Contacto',
      render: (customer) => (
        <div className="flex flex-col gap-1">
          {customer.phone && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <PhoneIcon className="h-3.5 w-3.5" />
              {customer.phone}
            </div>
          )}
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <EnvelopeIcon className="h-3.5 w-3.5" />
            {customer.email}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      sortValue: (c) => c.status,
      render: (customer) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
            statusColors[customer.status]
          }`}
        >
          {customer.status === 'active' && <CheckCircleIcon className="h-3 w-3" />}
          {customer.status === 'inactive' && <XCircleIcon className="h-3 w-3" />}
          {statusLabels[customer.status]}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Fecha Registro',
      sortable: true,
      sortValue: (c) => c.createdAt,
      render: (customer) => (
        <span className="text-sm text-gray-600">
          {new Date(customer.createdAt).toLocaleDateString('es-MX')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (customer) => (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/admin/distribuidores/${customer.id}`}
            className="rounded-lg p-2 transition-colors hover:bg-blue-50"
            title="Ver detalles"
          >
            <EyeIcon className="h-4 w-4 text-[#3E667D]" />
          </Link>
          <Link
            href={`/admin/distribuidores/${customer.id}/editar`}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            title="Editar"
          >
            <PencilIcon className="h-4 w-4 text-gray-600" />
          </Link>
          {isSuperAdmin && (
            <button
              onClick={() => handleDeleteClick(customer)}
              className="rounded-lg p-2 transition-colors hover:bg-red-50"
              title="Eliminar"
            >
              <TrashIcon className="h-4 w-4 text-red-600" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Loading state
  if (isLoading && customers.length === 0) {
    return (
      <PermissionGuard permissions={['users:read']}>
        <div className="min-h-screen bg-gray-50">
          <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex items-center gap-3 mb-2">
                <UserGroupIcon className="h-9 w-9" />
                <h1 className="text-3xl font-bold sm:text-4xl">Clientes y Distribuidores</h1>
              </div>
              <p className="text-white/80 text-lg">Cargando...</p>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
      </PermissionGuard>
    );
  }

  // Error state
  if (error && customers.length === 0) {
    return (
      <PermissionGuard permissions={['users:read']}>
        <div className="min-h-screen bg-gray-50">
          <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex items-center gap-3 mb-2">
                <UserGroupIcon className="h-9 w-9" />
                <h1 className="text-3xl font-bold sm:text-4xl">Clientes y Distribuidores</h1>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-red-700">
                  <ExclamationTriangleIcon className="h-6 w-6" />
                  <p>Error al cargar los clientes: {error}</p>
                </div>
                <Button variant="outline" className="mt-4" onClick={handleRefresh}>
                  Reintentar
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permissions={['users:read']}>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <UserGroupIcon className="h-9 w-9" />
                  <h1 className="text-3xl font-bold sm:text-4xl">Clientes y Distribuidores</h1>
                </div>
                <p className="text-base text-white/80 sm:text-lg">
                  Gestiona la red de clientes y distribuidores
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/admin">
                  <Button variant="secondary">Volver al Panel Principal</Button>
                </Link>
                <Link href="/admin/distribuidores/nuevo">
                  <Button
                    variant="primary"
                    leftIcon={<PlusIcon className="h-5 w-5" />}
                  >
                    Nuevo Distribuidor
                  </Button>
                </Link>
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
                    <p className="text-sm text-gray-600 mb-1">Total Registros</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserGroupIcon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Activos</p>
                    <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                    <p className="text-xs text-gray-400 mt-1">en esta página</p>
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
                    <p className="text-sm text-gray-600 mb-1">Distribuidores</p>
                    <p className="text-3xl font-bold text-[#3E667D]">{stats.distributors}</p>
                    <p className="text-xs text-gray-400 mt-1">en esta página</p>
                  </div>
                  <div className="w-12 h-12 bg-[#3E667D]/10 rounded-full flex items-center justify-center">
                    <UserGroupIcon className="h-6 w-6 text-[#3E667D]" />
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
                    disabled={isLoading}
                  >
                    <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? 'Actualizando...' : 'Actualizar'}
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
                <div className="lg:col-span-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre, email o código..."
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
                      variant="primary"
                      size="sm"
                      className="h-10 px-4 sm:min-w-[96px]"
                      onClick={handleSearch}
                    >
                      Buscar
                    </Button>
                  </div>
                </div>

                {/* Type Filter */}
                <div className="lg:col-span-2">
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3">
                    <FunnelIcon className="h-4 w-4 text-gray-400" />
                    <select
                      value={filterType}
                      onChange={(e) => handleFilterType(e.target.value)}
                      className="w-full bg-transparent py-2.5 text-sm focus:outline-none"
                    >
                      <option value="all">Todos los Tipos</option>
                      <option value="distributor">Distribuidores</option>
                      <option value="retail">Clientes</option>
                    </select>
                  </div>
                </div>

                {/* Status Filter */}
                <div className="lg:col-span-2">
                  <div className="rounded-lg border border-gray-200 bg-white px-3">
                    <select
                      value={filterStatus}
                      onChange={(e) => handleFilterStatus(e.target.value)}
                      className="w-full bg-transparent py-2.5 text-sm focus:outline-none"
                    >
                      <option value="all">Todos los Estados</option>
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                      <option value="pending">Pendiente</option>
                      <option value="suspended">Suspendido</option>
                    </select>
                  </div>
                </div>

                {/* Country Filter */}
                <div className="lg:col-span-2">
                  <div className="rounded-lg border border-gray-200 bg-white px-3">
                    <select
                      value={filterCountry}
                      onChange={(e) => handleFilterCountry(e.target.value)}
                      className="w-full bg-transparent py-2.5 text-sm focus:outline-none"
                    >
                      <option value="all">Todos los Países</option>
                      {COUNTRY_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sort */}
                <div className="lg:col-span-2">
                  <div className="rounded-lg border border-gray-200 bg-white px-3">
                    <select
                      value={`${sortBy}-${sortOrder}`}
                      onChange={(e) => {
                        const [newSortBy, newSortOrder] = e.target.value.split('-');
                        setSortBy(newSortBy);
                        setSortOrder(newSortOrder as 'asc' | 'desc');
                        dispatch(setFilters({ page: 1 }));
                      }}
                      className="w-full bg-transparent py-2.5 text-sm focus:outline-none"
                    >
                      <option value="createdAt-desc">Más recientes</option>
                      <option value="createdAt-asc">Más antiguos</option>
                      <option value="firstName-asc">Nombre A-Z</option>
                      <option value="firstName-desc">Nombre Z-A</option>
                      <option value="email-asc">Correo A-Z</option>
                    </select>
                  </div>
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
                  {filterType !== 'all' && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                      Tipo: {typeLabels[filterType] || filterType}
                    </span>
                  )}
                  {filterStatus !== 'all' && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                      Estado: {statusLabels[filterStatus] || filterStatus}
                    </span>
                  )}
                  {filterCountry !== 'all' && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                      País: {COUNTRY_OPTIONS.find((c) => c.value === filterCountry)?.label || filterCountry}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customers Table */}
          <Card className="border-gray-100 shadow-sm">
            <CardContent className="p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-gray-900">Listado de clientes</h2>
                <p className="text-sm text-gray-600">
                  Mostrando {customers.length} de {pagination.total}
                </p>
              </div>

              {isLoading && customers.length > 0 && (
                <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                  Actualizando resultados...
                </div>
              )}

              <DataTable
                columns={columns}
                data={customers}
                isLoading={isLoading && customers.length === 0}
                getRowKey={(customer) => customer.id}
                minWidthClassName="min-w-[1100px]"
                emptyState={
                  <div className="py-2 text-center">
                    <UserGroupIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                    <h3 className="mb-2 text-xl font-bold text-gray-900">
                      No se encontraron clientes
                    </h3>
                    <p className="text-gray-600">
                      Intenta ajustar los filtros de búsqueda o crear un nuevo distribuidor.
                    </p>
                    <div className="mt-4 flex justify-center gap-2">
                      {hasActiveFilters && (
                        <Button variant="outline" onClick={resetFilters}>
                          Limpiar filtros
                        </Button>
                      )}
                      <Link href="/admin/distribuidores/nuevo">
                        <Button
                          variant="primary"
                          leftIcon={<PlusIcon className="h-4 w-4" />}
                        >
                          Nuevo Distribuidor
                        </Button>
                      </Link>
                    </div>
                  </div>
                }
              />

              {/* Pagination */}
              {customers.length > 0 && (
                <DataTablePagination
                  currentPage={pagination.page}
                  pageSize={pageSize}
                  totalItems={pagination.total}
                  isLoading={isLoading}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  pageSizeOptions={[10, 20, 50, 100]}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && customerToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={handleCloseDeleteModal} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
              {/* Red header */}
              <div className="bg-red-600 rounded-t-2xl px-6 py-4">
                <div className="flex items-center gap-3">
                  <ExclamationTriangleIcon className="h-6 w-6 text-white" />
                  <h3 className="text-lg font-semibold text-white">Eliminar cliente</h3>
                </div>
              </div>

              <div className="px-6 py-5">
                <p className="text-gray-600 mb-4">
                  Estás a punto de eliminar al cliente:
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="font-semibold text-gray-900">
                    {customerToDelete.firstName} {customerToDelete.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{customerToDelete.email}</p>
                  {customerToDelete.customerNumber && (
                    <p className="text-sm text-gray-500 mt-1">
                      Código: <code className="bg-red-100 px-1.5 py-0.5 rounded text-xs">{customerToDelete.customerNumber}</code>
                    </p>
                  )}
                </div>
                <p className="text-sm text-red-700 font-medium mb-4">
                  Esta acción desactivará al cliente y quedará registrada en los logs del sistema. Solo un Super Administrador puede realizar esta operación.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Escribe <span className="font-bold text-red-600">ELIMINAR</span> para confirmar:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="ELIMINAR"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && deleteConfirmText === 'ELIMINAR') {
                        handleConfirmDelete();
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <Button variant="outline" onClick={handleCloseDeleteModal} disabled={isDeleting}>
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  onClick={handleConfirmDelete}
                  disabled={deleteConfirmText !== 'ELIMINAR' || isDeleting}
                  isLoading={isDeleting}
                >
                  Eliminar cliente
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
