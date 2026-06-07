'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchCustomers,
  selectCustomers,
  selectCustomersLoading,
  selectCustomersError,
  selectCustomersPagination,
  deleteCustomer,
} from '@/store/slices/customersSlice';
import { selectUserRoles } from '@/store/slices/authSlice';
import type { Customer, CustomerStatus } from '@/types/customer';
import { customersService } from '@/services/customers.service';
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
  ShieldCheckIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { getMlmTypeConfig } from '@/lib/mlmType';

type BadgeVariant = 'default' | 'secondary' | 'success' | 'info' | 'warning' | 'destructive' | 'outline';

const statusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  active: { label: 'Activo', variant: 'success' },
  inactive: { label: 'Inactivo', variant: 'outline' },
  pending: { label: 'Pendiente', variant: 'warning' },
  suspended: { label: 'Suspendido', variant: 'destructive' },
};

const COUNTRY_OPTIONS = [
  { value: 'b47b4f94-011d-4071-adf9-5c5285606af7', label: 'México' },
  { value: 'e6ba6110-76ee-4bb2-90e8-408c993cbe4e', label: 'Estados Unidos' },
  { value: '0dc6fde0-ea26-44d3-80b7-eec55cfe6b7a', label: 'Colombia' },
  { value: '6cfc176a-e5e8-4843-8a11-a1a967f2c6b5', label: 'Guatemala' },
];

const formatNumber = (n: number) => new Intl.NumberFormat('es-MX').format(n);

export function DistribuidoresTab() {
  const dispatch = useAppDispatch();
  const customers = useAppSelector(selectCustomers);
  const isLoading = useAppSelector(selectCustomersLoading);
  const error = useAppSelector(selectCustomersError);
  const pagination = useAppSelector(selectCustomersPagination);
  const userRoles = useAppSelector(selectUserRoles);
  const isSuperAdmin = userRoles.includes('super_admin');

  // Estado interno (no URL) para no chocar con los filtros del tab de usuarios
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState<CustomerStatus | 'all'>('all');
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterCedea, setFilterCedea] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Stats (server-side totals, dominio customers)
  const baseStatsParams = useMemo(() => ({
    search: searchQuery || undefined,
    countryId: filterCountry !== 'all' ? filterCountry : undefined,
    limit: 1,
    page: 1,
  }), [searchQuery, filterCountry]);

  const activeStatsParams = useMemo(() => ({ ...baseStatsParams, status: 'active' as CustomerStatus }), [baseStatsParams]);
  const distributorStatsParams = useMemo(() => ({ ...baseStatsParams, customerType: 'distributor' }), [baseStatsParams]);

  const { data: baseStatsData } = useQuery({
    queryKey: ['customers', 'stats', 'base', baseStatsParams],
    queryFn: () => customersService.getAll(baseStatsParams),
  });
  const { data: activeStatsData } = useQuery({
    queryKey: ['customers', 'stats', 'active', activeStatsParams],
    queryFn: () => customersService.getAll(activeStatsParams),
  });
  const { data: distributorStatsData } = useQuery({
    queryKey: ['customers', 'stats', 'distributor', distributorStatsParams],
    queryFn: () => customersService.getAll(distributorStatsParams),
  });

  const stats = useMemo(() => ({
    total: baseStatsData?.total ?? pagination.total,
    active: activeStatsData?.total ?? 0,
    distributors: distributorStatsData?.total ?? 0,
  }), [baseStatsData, activeStatsData, distributorStatsData, pagination.total]);

  const loadCustomers = useCallback(() => {
    const params: Record<string, unknown> = {
      page: currentPage,
      limit: pageSize,
      search: searchQuery || undefined,
      customerType: filterType !== 'all' ? filterType : undefined,
      status: filterStatus !== 'all' ? filterStatus : undefined,
      countryId: filterCountry !== 'all' ? filterCountry : undefined,
      sortBy,
      sortOrder,
    };
    if (filterCedea === 'yes') params.hasCedea = true;
    if (filterCedea === 'no') params.hasCedea = false;
    dispatch(fetchCustomers(params as never));
  }, [dispatch, currentPage, pageSize, searchQuery, filterType, filterStatus, filterCountry, filterCedea, sortBy, sortOrder]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setFilterType('all');
    setFilterStatus('all');
    setFilterCountry('all');
    setFilterCedea('all');
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchQuery || filterType !== 'all' || filterStatus !== 'all' || filterCountry !== 'all' || filterCedea !== 'all',
  );

  const handleConfirmDelete = async () => {
    if (!customerToDelete || deleteConfirmText !== 'ELIMINAR') return;
    setIsDeleting(true);
    try {
      await dispatch(deleteCustomer(customerToDelete.id));
      toast.success(`${customerToDelete.firstName} ${customerToDelete.lastName} ha sido eliminado correctamente`);
      setDeleteModalOpen(false);
      setCustomerToDelete(null);
      setDeleteConfirmText('');
    } catch {
      toast.error('Error al eliminar el cliente');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: DataTableColumn<Customer>[] = [
    {
      key: 'name',
      header: 'Cliente',
      sortable: true,
      sortValue: (c) => `${c.firstName} ${c.lastName}`,
      render: (customer) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
            <UserGroupIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <Link
              href={`/admin/distribuidores/${customer.id}`}
              className="font-semibold text-foreground hover:text-primary hover:underline"
            >
              {customer.firstName} {customer.lastName}
            </Link>
            <p className="text-sm text-muted-foreground">{customer.email}</p>
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
        <div className="flex flex-wrap gap-1">
          {(() => {
            const t = getMlmTypeConfig(customer.customerType) ?? { label: customer.customerType, variant: 'secondary' as BadgeVariant };
            return <Badge variant={t.variant}>{t.label}</Badge>;
          })()}
          {(customer.cedeaCount ?? 0) > 0 && (
            <Badge variant="success">
              <ShieldCheckIcon className="h-3 w-3" />
              CEDEA ({customer.cedeaCount})
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'customerNumber',
      header: 'Código Referido',
      sortable: true,
      sortValue: (c) => c.customerNumber || '',
      render: (customer) => (
        <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 font-mono text-sm font-medium text-foreground">
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
            <p className="text-sm font-medium text-foreground">
              {customer.sponsor.firstName} {customer.sponsor.lastName}
            </p>
            {customer.sponsor.email && (
              <p className="text-xs text-muted-foreground">{customer.sponsor.email}</p>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
    {
      key: 'contact',
      header: 'Contacto',
      render: (customer) => (
        <div className="flex flex-col gap-1">
          {customer.phone && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <PhoneIcon className="h-3.5 w-3.5" />
              {customer.phone}
            </div>
          )}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
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
      render: (customer) => {
        const cfg = statusConfig[customer.status] ?? { label: customer.status, variant: 'outline' as BadgeVariant };
        return (
          <Badge variant={cfg.variant}>
            {customer.status === 'active' && <CheckCircleIcon className="h-3 w-3" />}
            {customer.status === 'inactive' && <XCircleIcon className="h-3 w-3" />}
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Fecha Registro',
      sortable: true,
      sortValue: (c) => c.createdAt,
      render: (customer) => (
        <span className="text-sm text-muted-foreground">
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
            className="rounded-lg p-2 transition-colors hover:bg-muted"
            title="Ver detalles"
          >
            <EyeIcon className="h-4 w-4 text-primary" />
          </Link>
          <Link
            href={`/admin/distribuidores/${customer.id}/editar`}
            className="rounded-lg p-2 transition-colors hover:bg-muted"
            title="Editar"
          >
            <PencilIcon className="h-4 w-4 text-muted-foreground" />
          </Link>
          {isSuperAdmin && (
            <button
              onClick={() => {
                setCustomerToDelete(customer);
                setDeleteConfirmText('');
                setDeleteModalOpen(true);
              }}
              className="rounded-lg p-2 transition-colors hover:bg-muted"
              title="Eliminar"
            >
              <TrashIcon className="h-4 w-4 text-destructive" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Stats — un solo acento */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Registros', value: stats.total, icon: UserGroupIcon },
          { label: 'Activos', value: stats.active, icon: CheckCircleIcon },
          { label: 'Distribuidores', value: stats.distributors, icon: BuildingStorefrontIcon },
        ].map((s) => (
          <Card key={s.label} className="gap-0 p-5 transition-shadow duration-200 hover:shadow-md">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-1 truncate text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {formatNumber(s.value)}
                </p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-6 border-border shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-foreground">Búsqueda y filtros</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={loadCustomers}
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
              <Button asChild size="sm">
                <Link href="/admin/distribuidores/nuevo">
                  <PlusIcon className="h-4 w-4" />
                  Nuevo Distribuidor
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
            <div className="lg:col-span-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
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
                    className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                </div>
                <Button size="sm" className="h-10 px-4 sm:min-w-[96px]" onClick={handleSearch}>
                  Buscar
                </Button>
              </div>
            </div>

            <div className="lg:col-span-2">
              <SearchableSelect
                options={[
                  { value: 'distributor', label: 'Distribuidores' },
                  { value: 'preferred_customer', label: 'Preferentes' },
                  { value: 'final_customer', label: 'Clientes' },
                ]}
                value={filterType}
                onChange={(v) => { setFilterType(v); setCurrentPage(1); }}
                allLabel="Todos los Tipos"
                allValue="all"
                className="w-full"
              />
            </div>

            <div className="lg:col-span-2">
              <SearchableSelect
                options={[
                  { value: 'active', label: 'Activo' },
                  { value: 'inactive', label: 'Inactivo' },
                  { value: 'pending', label: 'Pendiente' },
                  { value: 'suspended', label: 'Suspendido' },
                ]}
                value={filterStatus}
                onChange={(v) => { setFilterStatus(v as CustomerStatus | 'all'); setCurrentPage(1); }}
                allLabel="Todos los Estados"
                allValue="all"
                className="w-full"
              />
            </div>

            <div className="lg:col-span-2">
              <SearchableSelect
                options={COUNTRY_OPTIONS}
                value={filterCountry}
                onChange={(v) => { setFilterCountry(v); setCurrentPage(1); }}
                allLabel="Todos los Países"
                allValue="all"
                className="w-full"
              />
            </div>

            <div className="lg:col-span-2">
              <SearchableSelect
                options={[
                  { value: 'yes', label: 'Con CEDEA' },
                  { value: 'no', label: 'Sin CEDEA' },
                ]}
                value={filterCedea}
                onChange={(v) => { setFilterCedea(v); setCurrentPage(1); }}
                allLabel="CEDEA: Todos"
                allValue="all"
                className="w-full"
              />
            </div>

            <div className="lg:col-span-2">
              <SearchableSelect
                options={[
                  { value: 'createdAt-desc', label: 'Más recientes' },
                  { value: 'createdAt-asc', label: 'Más antiguos' },
                  { value: 'firstName-asc', label: 'Nombre A-Z' },
                  { value: 'firstName-desc', label: 'Nombre Z-A' },
                  { value: 'email-asc', label: 'Correo A-Z' },
                ]}
                value={`${sortBy}-${sortOrder}`}
                onChange={(val) => {
                  const [nb, no] = val.split('-');
                  setSortBy(nb);
                  setSortOrder(no as 'asc' | 'desc');
                }}
                showAllOption={false}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">Listado de clientes y distribuidores</h2>
            <p className="text-sm text-muted-foreground">
              Mostrando {customers.length} de {pagination.total}
            </p>
          </div>

          {error && customers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <ExclamationTriangleIcon className="h-10 w-10 text-destructive" />
              <p className="text-destructive">Error al cargar los clientes: {error}</p>
              <Button variant="outline" onClick={loadCustomers}>Reintentar</Button>
            </div>
          ) : (
            <>
              {isLoading && customers.length > 0 && (
                <div className="mb-3 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
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
                    <UserGroupIcon className="mx-auto mb-4 h-16 w-16 text-muted-foreground/40" />
                    <h3 className="mb-2 text-xl font-bold text-foreground">No se encontraron clientes</h3>
                    <p className="text-muted-foreground">
                      Intenta ajustar los filtros de búsqueda o crear un nuevo distribuidor.
                    </p>
                    <div className="mt-4 flex justify-center gap-2">
                      {hasActiveFilters && (
                        <Button variant="outline" onClick={resetFilters}>Limpiar filtros</Button>
                      )}
                      <Button asChild>
                        <Link href="/admin/distribuidores/nuevo">
                          <PlusIcon className="h-4 w-4" />
                          Nuevo Distribuidor
                        </Link>
                      </Button>
                    </div>
                  </div>
                }
              />

              {customers.length > 0 && (
                <DataTablePagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={pagination.total}
                  isLoading={isLoading}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                  pageSizeOptions={[10, 20, 50, 100]}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Modal */}
      {deleteModalOpen && customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => { setDeleteModalOpen(false); setCustomerToDelete(null); setDeleteConfirmText(''); }}
          />
          <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl">
            <div className="flex items-center gap-3 bg-destructive px-6 py-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-white" />
              <h3 className="text-lg font-semibold text-white">Eliminar cliente</h3>
            </div>

            <div className="px-6 py-5">
              <p className="mb-4 text-muted-foreground">Estás a punto de eliminar al cliente:</p>
              <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                <p className="font-semibold text-foreground">
                  {customerToDelete.firstName} {customerToDelete.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{customerToDelete.email}</p>
                {customerToDelete.customerNumber && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Código: <code className="rounded bg-destructive/15 px-1.5 py-0.5 text-xs text-destructive">{customerToDelete.customerNumber}</code>
                  </p>
                )}
              </div>
              <p className="mb-4 text-sm font-medium text-destructive">
                Esta acción desactivará al cliente y quedará registrada en los logs del sistema. Solo un Super Administrador puede realizar esta operación.
              </p>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Escribe <span className="font-bold text-destructive">ELIMINAR</span> para confirmar:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="ELIMINAR"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && deleteConfirmText === 'ELIMINAR') handleConfirmDelete();
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border bg-muted/50 px-6 py-4">
              <Button
                variant="outline"
                onClick={() => { setDeleteModalOpen(false); setCustomerToDelete(null); setDeleteConfirmText(''); }}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting || deleteConfirmText !== 'ELIMINAR'}>
                {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Eliminar cliente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
