'use client';

import { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DataTable, DataTablePagination } from '@/components/ui/DataTable';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQueryFilters } from '@/hooks/useQueryFilters';
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
  EllipsisVerticalIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  useOrders,
  useOrderStats,
  useUpdateOrderStatus,
  useCancelOrder,
  useExportOrders,
} from '@/hooks/useOrders';
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
  partial: 'Parcial',
  pending: 'Pendiente',
  refunded: 'Reembolsado',
  failed: 'Fallido',
};

const paymentBadgeStyles: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  partial: 'bg-amber-100 text-amber-700',
  pending: 'bg-yellow-100 text-yellow-700',
  refunded: 'bg-gray-100 text-gray-700',
  failed: 'bg-red-100 text-red-700',
};

// Grafo de transiciones válido — espejo del backend (orders.service.ts).
// La cancelación se maneja aparte (con diálogo de razón).
const STATUS_TRANSITIONS: Record<string, OrderStatus[]> = {
  pending: [OrderStatus.PAID, OrderStatus.PROCESSING],
  paid: [OrderStatus.PROCESSING],
  processing: [OrderStatus.SHIPPED],
  shipped: [OrderStatus.DELIVERED, OrderStatus.IN_TRANSIT],
  in_transit: [OrderStatus.DELIVERED],
  delivered: [OrderStatus.COMPLETED],
  confirmed: [],
  completed: [],
  cancelled: [],
};

// Estados desde los que NO se puede cancelar (espejo del backend).
const NON_CANCELLABLE = new Set<string>([
  'shipped',
  'delivered',
  'completed',
  'cancelled',
]);

const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(num);
};

const formatNumber = (n: number) => new Intl.NumberFormat('es-MX').format(n);

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
  const { get, getNumber, setParams } = useQueryFilters({
    status: 'all',
    payment: 'all',
    branch: 'all',
    page: '1',
    limit: '20',
  });

  // Read values from URL via hook
  const searchQuery = get('search');
  const filterStatus = get('status');
  const filterPayment = get('payment');
  const filterBranch = get('branch');
  const dateFrom = get('dateFrom');
  const dateTo = get('dateTo');
  const currentPage = getNumber('page') || 1;
  const pageSize = getNumber('limit') || 20;

  const [searchInput, setSearchInput] = useState(searchQuery);

  // Cancel dialog
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Branches for dropdown
  const { data: branches = [] } = useActiveBranches();

  const hasActiveFilters =
    filterStatus !== 'all' ||
    filterPayment !== 'all' ||
    filterBranch !== 'all' ||
    !!searchQuery ||
    !!dateFrom ||
    !!dateTo;

  // Build query params for the list
  const queryParams: OrderQueryParams = useMemo(() => {
    const params: OrderQueryParams = {
      page: currentPage,
      limit: pageSize,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    if (searchQuery) params.search = searchQuery;
    if (filterStatus !== 'all') params.status = filterStatus as OrderStatus;
    if (filterPayment !== 'all')
      params.paymentStatus = filterPayment as OrderQueryParams['paymentStatus'];
    if (filterBranch !== 'all') params.branchId = filterBranch;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    return params;
  }, [
    currentPage,
    pageSize,
    searchQuery,
    filterStatus,
    filterPayment,
    filterBranch,
    dateFrom,
    dateTo,
  ]);

  // Stats: single aggregated call (counts by status + real revenue), honoring
  // every filter EXCEPT status (we want all status counts).
  const statsParams: OrderQueryParams = useMemo(
    () => ({
      ...(searchQuery && { search: searchQuery }),
      ...(filterPayment !== 'all' && {
        paymentStatus: filterPayment as OrderQueryParams['paymentStatus'],
      }),
      ...(filterBranch !== 'all' && { branchId: filterBranch }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
    }),
    [searchQuery, filterPayment, filterBranch, dateFrom, dateTo],
  );

  // API hooks
  const { data: statsData, isLoading: statsLoading } = useOrderStats(statsParams);
  const { data: ordersData, isLoading, isFetching, error, refetch } =
    useOrders(queryParams);
  const updateStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();
  const exportOrders = useExportOrders();

  const orders = ordersData?.data || [];
  const totalOrders = ordersData?.total || 0;

  const stats = useMemo(
    () => ({
      total: statsData?.total ?? 0,
      pending: statsData?.byStatus.pending ?? 0,
      processing: statsData?.byStatus.processing ?? 0,
      completed: statsData?.byStatus.completed ?? 0,
      revenue: statsData?.revenue ?? 0,
    }),
    [statsData],
  );

  // ================================
  // Handlers
  // ================================

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({ id: orderId, dto: { status: newStatus } });
      toast.success(`Pedido actualizado a: ${getStatusLabel(newStatus)}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar el pedido');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    const reason = cancelReason.trim();
    if (!reason) {
      toast.error('Indica el motivo de la cancelación');
      return;
    }
    try {
      await cancelOrder.mutateAsync({ id: cancelTarget.id, dto: { reason } });
      toast.success('Pedido cancelado');
      setCancelTarget(null);
      setCancelReason('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cancelar el pedido');
    }
  };

  const handleExport = async () => {
    try {
      const { page, limit, ...exportParams } = queryParams;
      await exportOrders.mutateAsync(exportParams);
      toast.success('CSV de pedidos descargado');
    } catch {
      toast.error('No se pudo exportar el CSV');
    }
  };

  const handleSearch = () => {
    setParams({ search: searchInput, page: null });
  };

  const handlePageSizeChange = (size: number) => {
    setParams({ limit: String(size), page: null });
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setParams({
      search: null,
      status: 'all',
      payment: 'all',
      branch: 'all',
      dateFrom: null,
      dateTo: null,
      page: null,
    });
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
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDate(order.createdAt)}
            </p>
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
          const ps = order.paymentStatus;
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
          <span className="font-semibold text-gray-900">
            {formatCurrency(order.total)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        render: (order) => {
          const transitions = STATUS_TRANSITIONS[order.status] || [];
          const canCancel = !NON_CANCELLABLE.has(order.status);
          const hasMenu = transitions.length > 0 || canCancel;
          return (
            <div className="flex items-center justify-center gap-1">
              <Link href={`/admin/pedidos/${order.id}`}>
                <Button variant="ghost" size="icon-sm" title="Ver detalles">
                  <EyeIcon className="h-4 w-4" />
                </Button>
              </Link>

              {hasMenu && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Cambiar estado"
                      disabled={updateStatus.isPending || cancelOrder.isPending}
                    >
                      <EllipsisVerticalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Cambiar estado</DropdownMenuLabel>
                    {transitions.length > 0 ? (
                      transitions.map((next) => (
                        <DropdownMenuItem
                          key={next}
                          onClick={() => handleUpdateStatus(order.id, next)}
                        >
                          <StatusIcon status={next} />
                          Marcar {getStatusLabel(next)}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>
                        Sin cambios disponibles
                      </DropdownMenuItem>
                    )}
                    {canCancel && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            setCancelReason('');
                            setCancelTarget(order);
                          }}
                        >
                          <XCircleIcon className="h-4 w-4" />
                          Cancelar pedido
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        },
      },
    ],
    [updateStatus.isPending, cancelOrder.isPending],
  );

  // ================================
  // Stat card (clickable -> filter by status)
  // ================================
  const StatCard = ({
    label,
    value,
    iconBg,
    iconColor,
    valueColor,
    icon: Icon,
    statusValue,
  }: {
    label: string;
    value: number;
    iconBg: string;
    iconColor: string;
    valueColor: string;
    icon: React.ComponentType<{ className?: string }>;
    statusValue: string;
  }) => {
    const active = filterStatus === statusValue;
    return (
      <button
        type="button"
        onClick={() => setParams({ status: statusValue, page: null })}
        className={`text-left rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D] ${
          active ? 'ring-2 ring-[#3E667D]' : 'hover:-translate-y-0.5'
        }`}
        aria-pressed={active}
      >
        <Card className="h-full">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{label}</p>
                <p className={`text-3xl font-bold ${valueColor}`}>
                  {statsLoading ? '—' : formatNumber(value)}
                </p>
              </div>
              <div
                className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center`}
              >
                <Icon className={`h-6 w-6 ${iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </button>
    );
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Error al cargar pedidos
          </h2>
          <p className="text-gray-600 mb-4">
            {(error as any)?.response?.data?.message ||
              'Ocurrió un error inesperado'}
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <ShoppingCartIcon className="h-8 w-8 lg:h-10 lg:w-10" />
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                    Gestión de Pedidos
                  </h1>
                </div>
                <p className="text-white/80 text-sm sm:text-base lg:text-lg">
                  Administra y procesa todos los pedidos del sistema
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <Link href="/admin">
                  <Button variant="secondary">Volver al Panel Principal</Button>
                </Link>
                <Button
                  className="bg-white text-[#3E667D] hover:bg-white/90"
                  onClick={handleExport}
                  disabled={exportOrders.isPending}
                >
                  {exportOrders.isPending ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    <ArrowDownTrayIcon className="h-5 w-5" />
                  )}
                  Exportar Pedidos
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards (clickable) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard
              label="Total Pedidos"
              value={stats.total}
              icon={ShoppingCartIcon}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              valueColor="text-gray-900"
              statusValue="all"
            />
            <StatCard
              label="Pendientes"
              value={stats.pending}
              icon={ClockIcon}
              iconBg="bg-yellow-100"
              iconColor="text-yellow-600"
              valueColor="text-yellow-600"
              statusValue="pending"
            />
            <StatCard
              label="Procesando"
              value={stats.processing}
              icon={TruckIcon}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              valueColor="text-blue-600"
              statusValue="processing"
            />
            <StatCard
              label="Completados"
              value={stats.completed}
              icon={CheckCircleIcon}
              iconBg="bg-green-100"
              iconColor="text-green-600"
              valueColor="text-green-600"
              statusValue="completed"
            />
          </div>

          {/* Revenue Card (real, server-side) */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    Ingresos Totales (Pedidos Pagados)
                  </p>
                  <p className="text-3xl font-bold text-[#3E667D]">
                    {statsLoading ? '—' : formatCurrency(stats.revenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Con los filtros aplicados
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
                    <Button variant="default" onClick={handleSearch}>
                      Buscar
                    </Button>
                  </div>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-5 w-5 text-gray-400 shrink-0" />
                  <SearchableSelect
                    options={[
                      { value: 'pending', label: 'Pendientes' },
                      { value: 'confirmed', label: 'Confirmados' },
                      { value: 'paid', label: 'Pagados' },
                      { value: 'processing', label: 'Procesando' },
                      { value: 'shipped', label: 'Enviados' },
                      { value: 'in_transit', label: 'En Tránsito' },
                      { value: 'delivered', label: 'Entregados' },
                      { value: 'completed', label: 'Completados' },
                      { value: 'cancelled', label: 'Cancelados' },
                    ]}
                    value={filterStatus}
                    onChange={(val) => setParams({ status: val, page: null })}
                    allLabel="Todos los Estados"
                    allValue="all"
                    className="w-[190px]"
                  />
                </div>

                {/* Payment Filter (server-side) */}
                <SearchableSelect
                  options={[
                    { value: 'paid', label: 'Pagados' },
                    { value: 'partial', label: 'Pago Parcial' },
                    { value: 'pending', label: 'Pago Pendiente' },
                    { value: 'refunded', label: 'Reembolsados' },
                    { value: 'failed', label: 'Fallidos' },
                  ]}
                  value={filterPayment}
                  onChange={(val) => setParams({ payment: val, page: null })}
                  allLabel="Todos los Pagos"
                  allValue="all"
                  className="w-[180px]"
                />
              </div>

              {/* Row 2: Branch + Date range + clear */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 mt-4">
                <SearchableSelect
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  value={filterBranch}
                  onChange={(val) => setParams({ branch: val, page: null })}
                  placeholder="Buscar sucursal..."
                  allLabel="Todas las Sucursales"
                  className="w-[220px]"
                />

                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-500 whitespace-nowrap">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) =>
                      setParams({ dateFrom: e.target.value, page: null })
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-500 whitespace-nowrap">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) =>
                      setParams({ dateTo: e.target.value, page: null })
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 lg:ml-auto"
                    onClick={clearAllFilters}
                  >
                    <XCircleIcon className="h-4 w-4" />
                    Limpiar filtros
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
                data={orders}
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
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={clearAllFilters}
                      >
                        Limpiar filtros
                      </Button>
                    )}
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

      {/* Cancel confirmation dialog */}
      <Dialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
            setCancelReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar pedido</DialogTitle>
            <DialogDescription>
              {cancelTarget
                ? `Vas a cancelar el pedido ${cancelTarget.orderNumber}. Esta acción no se puede deshacer.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Motivo de la cancelación</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Describe por qué se cancela el pedido..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelTarget(null);
                setCancelReason('');
              }}
              disabled={cancelOrder.isPending}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={cancelOrder.isPending || !cancelReason.trim()}
            >
              {cancelOrder.isPending ? 'Cancelando...' : 'Cancelar pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
}
