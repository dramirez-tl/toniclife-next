'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
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
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

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

export default function DistribuidoresAdminPage() {
  const dispatch = useAppDispatch();
  const customers = useAppSelector(selectCustomers);
  const isLoading = useAppSelector(selectCustomersLoading);
  const error = useAppSelector(selectCustomersError);
  const pagination = useAppSelector(selectCustomersPagination);
  const filters = useAppSelector(selectCustomersFilters);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<CustomerStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Fetch customers on component mount and filter changes
  const loadCustomers = useCallback(() => {
    const params = {
      page: filters.page || 1,
      limit: filters.limit || 10,
      search: searchQuery || undefined,
      customerType: filterType !== 'all' ? filterType : undefined,
      status: filterStatus !== 'all' ? filterStatus : undefined,
      sortBy,
      sortOrder,
    };
    dispatch(fetchCustomers(params));
  }, [dispatch, filters.page, filters.limit, searchQuery, filterType, filterStatus, sortBy, sortOrder]);

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

  const handlePageChange = (newPage: number) => {
    dispatch(setFilters({ page: newPage }));
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (customerToDelete) {
      await dispatch(deleteCustomer(customerToDelete.id));
      setDeleteModalOpen(false);
      setCustomerToDelete(null);
    }
  };

  // Calculate stats
  const activeCount = customers.filter((c) => c.status === 'active').length;
  const distributorCount = customers.filter((c) => c.customerType === 'distributor').length;

  return (
    <PermissionGuard permissions={['users:read']}>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Clientes y Distribuidores</h1>
              <p className="text-gray-600">Gestiona la red de clientes y distribuidores</p>
            </div>
            <Link
              href="/admin/distribuidores/nuevo"
              className="flex items-center gap-2 px-4 py-2 bg-[#003B7A] text-white rounded-lg hover:bg-[#002855] transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Nuevo Distribuidor
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <UserGroupIcon className="h-5 w-5 text-[#003B7A]" />
              <span className="text-sm text-gray-600">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
            <p className="text-xs text-gray-500 mt-1">registros</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-600">Activos</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            <p className="text-xs text-gray-500 mt-1">en esta página</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <UserGroupIcon className="h-5 w-5 text-[#7AB82E]" />
              <span className="text-sm text-gray-600">Distribuidores</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{distributorCount}</p>
            <p className="text-xs text-gray-500 mt-1">en esta página</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <UserGroupIcon className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-gray-600">Página</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {pagination.page} / {pagination.totalPages}
            </p>
            <p className="text-xs text-gray-500 mt-1">de {pagination.totalPages} páginas</p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <ExclamationTriangleIcon className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
                />
              </div>
            </div>

            <div>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  dispatch(setFilters({ page: 1 }));
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
              >
                <option value="all">Todos los Tipos</option>
                <option value="distributor">Distribuidores</option>
                <option value="retail">Clientes</option>
              </select>
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as CustomerStatus | 'all');
                  dispatch(setFilters({ page: 1 }));
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
              >
                <option value="all">Todos los Estados</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="pending">Pendiente</option>
                <option value="suspended">Suspendido</option>
              </select>
            </div>

            <div>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-');
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder as 'asc' | 'desc');
                  dispatch(setFilters({ page: 1 }));
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
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

        {/* Customers Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003B7A]"></div>
              <span className="ml-3 text-gray-600">Cargando...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código Referido
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patrocinador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Registro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {customer.firstName} {customer.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            customer.customerType === 'distributor'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {typeLabels[customer.customerType] || customer.customerType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {customer.customerNumber || '-'}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {customer.sponsor ? (
                          <div className="text-sm">
                            <div className="text-gray-900">
                              {customer.sponsor.firstName} {customer.sponsor.lastName}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {customer.sponsor.email || ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <PhoneIcon className="h-4 w-4" />
                              {customer.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <EnvelopeIcon className="h-4 w-4" />
                            {customer.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            statusColors[customer.status]
                          }`}
                        >
                          {statusLabels[customer.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(customer.createdAt).toLocaleDateString('es-MX')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/distribuidores/${customer.id}`}
                            className="p-1 text-[#003B7A] hover:bg-blue-50 rounded"
                            title="Ver detalles"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </Link>
                          <Link
                            href={`/admin/distribuidores/${customer.id}/editar`}
                            className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                            title="Editar"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(customer)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Eliminar"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && customers.length === 0 && (
            <div className="text-center py-12">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No se encontraron clientes</p>
              <p className="text-sm text-gray-400 mt-1">
                Intenta ajustar los filtros de búsqueda
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Mostrando{' '}
              <span className="font-medium">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{' '}
              a{' '}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              de <span className="font-medium">{pagination.total}</span> resultados
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum: number;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-4 py-2 border rounded-lg ${
                      pagination.page === pageNum
                        ? 'bg-[#003B7A] text-white border-[#003B7A]'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && customerToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Confirmar eliminación</h3>
            </div>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar a{' '}
              <span className="font-medium">
                {customerToDelete.firstName} {customerToDelete.lastName}
              </span>
              ? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setCustomerToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PermissionGuard>
  );
}
