'use client';

import { useState, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, DataTablePagination } from '@/components/ui/DataTable';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  ShoppingCartIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TruckIcon,
  ArrowDownTrayIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useOrders, useUpdateOrderStatus, useCancelOrder } from '@/hooks/useOrders';
import { useActiveBranches } from '@/hooks/useBranches';
import { OrderStatus } from '@/types/order';
import type { Order, OrderQueryParams } from '@/types/order';
import { PermissionGuard } from '@/components/auth';

// ================================
// Helpers
// ================================

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    paid: 'Pagado',
    processing: 'Procesando',
    shipped: 'Enviado',
    in_transit: 'En Tránsito',
    delivered: 'Entregado',
    completed: 'Completado',
    cancelled: 'Cancelado',
  };
  return labels[status] || status;
};

const statusBadgeStyles: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  delivered: 'bg-green-100 text-green-700',
  processing: 'bg-blue-100 text-blue-700',
  paid: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  in_transit: 'bg-purple-100 text-purple-700',
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-red-100 text-red-700',
};

const StatusIcon = ({ status }: { status: string }) => {
  const iconClass = 'h-3 w-3';
  switch (status) {
    case 'completed':
    case 'delivered':
    case 'confirmed':
      return <CheckCircleIcon className={iconClass} />;
    case 'shipped':
    case 'in_transit':
      return <TruckIcon className={iconClass} />;
    case 'cancelled':
      return <XCircleIcon className={iconClass} />;
    default:
      return <ClockIcon className={iconClass} />;
  }
};

const paymentLabels: Record<string, string> = {
  paid: 'Pagado',
  pending: 'Pendiente',
  refunded: 'Reembolsado',
  failed: 'Fallido',
};

const paymentBadgeStyles: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  refunded: 'bg-gray-100 text-gray-700',
  failed: 'bg-red-100 text-red-700',
};

const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(num);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ================================
// Page Component
// ================================

export default function PedidosPage() {
  return (
    <Suspense>
      <PedidosContent />
    </Suspense>
  );
}

function PedidosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read initial values from URL search params
  const searchQuery = searchParams.get('search') || '';
  const filterStatus = searchParams.get('status') || 'all';
  const filterPayment = searchParams.get('payment') || 'all';
  const filterBranch = searchParams.get('branch') || 'all';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = Number(searchParams.get('limit')) || 20;

  const [searchInput, setSearchInput] = useState(searchQuery);

  // Helper to update URL search params
  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === '' || val === 'all') {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      }
      // Reset to page 1 when changing filters (unless page is explicitly in updates)
      if (!('page' in updates)) {
        params.delete('page');
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  // Branches for dropdown
  const { data: branches = [] } = useActiveBranches();

  // Build query params
  const queryParams: OrderQueryParams = useMemo(() => {
    const params: OrderQueryParams = {
      page: currentPage,
      limit: pageSize,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    if (searchQuery) params.search = searchQuery;
    if (filterStatus !== 'all') params.status = filterStatus as OrderStatus;
    if (filterBranch !== 'all') params.branchId = filterBranch;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    return params;
  }, [currentPage, pageSize, searchQuery, filterStatus, filterBranch, dateFrom, dateTo]);

  // API hooks
  const { data: ordersData, isLoading, isFetching, error, refetch } = useOrders(queryParams);
  const updateStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();

  const orders = ordersData?.data || [];
  const totalOrders = ordersData?.total || 0;

  // Stats from current page (note: for accurate global stats, an endpoint would be needed)
  const stats = useMemo(() => {
    return {
      total: totalOrders,
      pending: orders.filter((o) => o.status === 'pending').length,
      processing: orders.filter((o) => o.status === 'processing').length,
      completed: orders.filter((o) => o.status === 'completed').length,
    };
  }, [orders, totalOrders]);

  const totalRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status === 'paid' || o.status === 'completed')
      .reduce((sum, o) => sum + parseFloat(o.total), 0);
  }, [orders]);

  // Client-side payment filter (payment_status not yet in API response; filter kept for future use)
  const filteredOrders = useMemo(() => {
    if (filterPayment === 'all') return orders;
    return orders.filter((o) => (o as any).paymentStatus === filterPayment);
  }, [orders, filterPayment]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({
        id: orderId,
        dto: { status: newStatus },
      });
      toast.success(`Pedido actualizado a: ${getStatusLabel(newStatus)}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar el pedido');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrder.mutateAsync({
        id: orderId,
        dto: { reason: 'Cancelado por administrador' },
      });
      toast.success('Pedido cancelado');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cancelar el pedido');
    }
  };

  const handleExport = () => {
    toast.success('Exportando datos de pedidos...');
  };

  const handleSearch = () => {
    setParams({ search: searchInput });
  };

  const handlePageSizeChange = (size: number) => {
    setParams({ limit: String(size), page: null });
  };

  // ================================
  // Table columns
  // ================================

  const columns: DataTableColumn<Order>[] = useMemo(
    () => [
      {
        key: 'orderNumber',
        header: 'Pedido',
        sortable: true,
        sortValue: (order) => order.orderNumber,
        render: (order) => (
          <div>
            <Link
              href={`/admin/pedidos/${order.id}`}
              className="font-semibold text-[#3E667D] hover:underline"
            >
              {order.orderNumber}
            </Link>
            <p className="text-xs text-gray-500 mt-0.5">{formatDate(order.createdAt)}</p>
          </div>
        ),
      },
      {
        key: 'customer',
        header: 'Cliente',
        sortable: true,
        sortValue: (order) =>
          order.customer
            ? `${order.customer.firstName} ${order.customer.lastName}`
            : '',
        render: (order) =>
          order.customer ? (
            <div>
              <p className="font-medium text-gray-900 text-sm">
                {order.customer.firstName} {order.customer.lastName}
              </p>
              <p className="text-xs text-gray-500">{order.customer.email}</p>
            </div>
          ) : (
            <span className="text-xs text-gray-400">Sin cliente</span>
          ),
      },
      {
        key: 'status',
        header: 'Estado',
        sortable: true,
        sortValue: (order) => order.status,
        render: (order) => (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              statusBadgeStyles[order.status] || 'bg-gray-100 text-gray-700'
            }`}
          >
            <StatusIcon status={order.status} />
            {getStatusLabel(order.status)}
          </span>
        ),
      },
      {
        key: 'payment',
        header: 'Pago',
        render: (order) => {
          const ps = (order as any).paymentStatus;
          if (!ps) return <span className="text-xs text-gray-400">—</span>;
          return (
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                paymentBadgeStyles[ps] || 'bg-gray-100 text-gray-700'
              }`}
            >
              {paymentLabels[ps] || ps}
            </span>
          );
        },
      },
      {
        key: 'invoice',
        header: 'Factura',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        render: (order) => {
          if (order.isInvoiced && order.invoiceId) {
            return (
              <Link href={`/admin/facturacion/${order.invoiceId}`}>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                  <DocumentTextIcon className="h-3 w-3" />
                  Facturada
                </span>
              </Link>
            );
          }
          if (order.isInvoiced && !order.invoiceId) {
            return (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700"
                title="Facturada en sistema anterior (factura global)"
              >
                <DocumentTextIcon className="h-3 w-3" />
                Global v1
              </span>
            );
          }
          return (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
              Sin factura
            </span>
          );
        },
      },
      {
        key: 'items',
        header: 'Productos',
        cellClassName: 'text-center',
        headerClassName: 'text-center',
        render: (order) => (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
            {order.items?.length || 0}
          </span>
        ),
      },
      {
        key: 'total',
        header: 'Total',
        sortable: true,
        sortValue: (order) => parseFloat(order.total),
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (order) => (
          <span className="font-semibold text-gray-900">{formatCurrency(order.total)}</span>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        render: (order) => (
          <div className="flex items-center justify-center gap-1">
            <Link href={`/admin/pedidos/${order.id}`}>
              <Button variant="ghost" size="sm" title="Ver detalles">
                <EyeIcon className="h-4 w-4" />
              </Button>
            </Link>

            {order.status === 'pending' && (
              <Button
                variant="ghost"
                size="sm"
                title="Marcar Procesando"
                onClick={() => handleUpdateStatus(order.id, OrderStatus.PROCESSING)}
                disabled={updateStatus.isPending}
                className="text-blue-600 hover:bg-blue-50"
              >
                <ClockIcon className="h-4 w-4" />
              </Button>
            )}
            {order.status === 'processing' && (
              <Button
                variant="ghost"
                size="sm"
                title="Marcar Enviado"
                onClick={() => handleUpdateStatus(order.id, OrderStatus.SHIPPED)}
                disabled={updateStatus.isPending}
                className="text-purple-600 hover:bg-purple-50"
              >
                <TruckIcon className="h-4 w-4" />
              </Button>
            )}
            {order.status === 'shipped' && (
              <Button
                variant="ghost"
                size="sm"
                title="Marcar Completado"
                onClick={() => handleUpdateStatus(order.id, OrderStatus.COMPLETED)}
                disabled={updateStatus.isPending}
                className="text-green-600 hover:bg-green-50"
              >
                <CheckCircleIcon className="h-4 w-4" />
              </Button>
            )}
            {(order.status === 'pending' || order.status === 'processing') && (
              <Button
                variant="ghost"
                size="sm"
                title="Cancelar pedido"
                onClick={() => handleCancelOrder(order.id)}
                disabled={cancelOrder.isPending}
                className="text-red-600 hover:bg-red-50"
              >
                <XCircleIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [updateStatus.isPending, cancelOrder.isPending],
  );

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error al cargar pedidos</h2>
          <p className="text-gray-600 mb-4">
            {(error as any)?.response?.data?.message || 'Ocurrió un error inesperado'}
          </p>
          <Button onClick={() => refetch()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permissions={['orders:read', 'orders:*']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <ShoppingCartIcon className="h-10 w-10" />
                  <h1 className="text-4xl font-bold">Gestión de Pedidos</h1>
                </div>
                <p className="text-white/80 text-lg">
                  Administra y procesa todos los pedidos del sistema
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/admin">
                  <Button variant="secondary">Volver al Panel Principal</Button>
                </Link>
                <Button
                  variant="primary"
                  leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
                  onClick={handleExport}
                >
                  Exportar Pedidos
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Pedidos</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <ShoppingCartIcon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pendientes</p>
                    <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <ClockIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Procesando</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.processing}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <TruckIcon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Completados</p>
                    <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Card */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Ingresos Totales (Pedidos Pagados)</p>
                  <p className="text-3xl font-bold text-[#3E667D]">
                    {formatCurrency(totalRevenue)}
                  </p>
                </div>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters and Search */}
          <Card className="mb-6">
            <CardContent className="p-6">
              {/* Row 1: Search + Status + Payment */}
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar por número de orden o email..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSearch();
                        }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                      />
                    </div>
                    <Button variant="primary" onClick={handleSearch}>
                      Buscar
                    </Button>
                  </div>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-5 w-5 text-gray-400" />
                  <SearchableSelect
                    options={[
                      { value: 'pending', label: 'Pendientes' },
                      { value: 'confirmed', label: 'Confirmados' },
                      { value: 'paid', label: 'Pagados' },
                      { value: 'processing', label: 'Procesando' },
                      { value: 'shipped', label: 'Enviados' },
                      { value: 'in_transit', label: 'En Transito' },
                      { value: 'delivered', label: 'Entregados' },
                      { value: 'completed', label: 'Completados' },
                      { value: 'cancelled', label: 'Cancelados' },
                    ]}
                    value={filterStatus}
                    onChange={(val) => setParams({ status: val })}
                    allLabel="Todos los Estados"
                    allValue="all"
                  />
                </div>

                {/* Payment Filter */}
                <div>
                  <SearchableSelect
                    options={[
                      { value: 'paid', label: 'Pagados' },
                      { value: 'pending', label: 'Pago Pendiente' },
                      { value: 'refunded', label: 'Reembolsados' },
                      { value: 'failed', label: 'Fallidos' },
                    ]}
                    value={filterPayment}
                    onChange={(val) => setParams({ payment: val })}
                    allLabel="Todos los Pagos"
                    allValue="all"
                  />
                </div>
              </div>

              {/* Row 2: Branch + Date range */}
              <div className="flex flex-col lg:flex-row gap-4 mt-4">
                {/* Branch Filter */}
                <SearchableSelect
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  value={filterBranch}
                  onChange={(val) => setParams({ branch: val })}
                  placeholder="Buscar sucursal..."
                  allLabel="Todas las Sucursales"
                  className="w-[220px]"
                />

                {/* Date From */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-500 whitespace-nowrap">Desde</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setParams({ dateFrom: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>

                {/* Date To */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-500 whitespace-nowrap">Hasta</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setParams({ dateTo: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>

                {/* Clear dates */}
                {(dateFrom || dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500"
                    onClick={() => setParams({ dateFrom: null, dateTo: null })}
                  >
                    Limpiar fechas
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={columns}
                data={filteredOrders}
                isLoading={isLoading}
                loadingRows={pageSize > 10 ? 10 : pageSize}
                getRowKey={(order) => order.id}
                minWidthClassName="min-w-[900px]"
                emptyState={
                  <div className="text-center py-12">
                    <ShoppingCartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      No se encontraron pedidos
                    </h3>
                    <p className="text-sm text-gray-500">
                      Intenta ajustar los filtros de búsqueda
                    </p>
                  </div>
                }
              />
            </CardContent>
          </Card>

          {/* Pagination */}
          <DataTablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalOrders}
            isLoading={isLoading || isFetching}
            onPageChange={(p) => setParams({ page: String(p) })}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={[10, 20, 50, 100]}
          />
        </div>
      </div>
    </PermissionGuard>
  );
}
