// app/admin/facturacion/page.tsx - Lista de facturas CFDI
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.5 Facturación
'use client';

import { Suspense, useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  ArrowPathIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useInvoices, useFacturamaStatus } from '@/hooks/useBilling';
import { billingService } from '@/services/billing.service';
import {
  InvoiceStatus,
  INVOICE_STATUS_CONFIG,
  formatCurrency,
  type BillingStatus,
  type InvoiceQueryDto,
} from '@/types/billing';
import { billingErrorMessage } from '@/lib/billing-error';
import { PermissionGuard } from '@/components/auth';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { DEFAULT_TIMEZONE } from '@/lib/timezone-utils';

export default function FacturacionPage() {
  return <Suspense><FacturacionContent /></Suspense>;
}

function FacturacionContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    page: '1',
    limit: '20',
  });

  const searchTerm = get('search');
  const statusFilter = get('status') as InvoiceStatus | '';
  const currentPage = getNumber('page') || 1;
  const pageSize = getNumber('limit') || 20;

  const [searchInput, setSearchInput] = useState(searchTerm);

  const filters: InvoiceQueryDto = useMemo(() => ({
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    status: statusFilter || undefined,
  }), [pageSize, currentPage, statusFilter]);

  const {
    data: invoicesResponse,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useInvoices(filters);

  const { data: facturamaStatus } = useFacturamaStatus();

  // Estado real del PAC. El contrato nuevo de GET /billing/status trae ambiente,
  // RFC emisor enmascarado y el error legible; se lee como parcial para tolerar
  // el contrato anterior (solo `Balance`, -1 cuando el PAC no responde).
  const pac = facturamaStatus as Partial<BillingStatus> | undefined;
  const pacBalance =
    pac?.balance ?? (typeof pac?.Balance === 'number' && pac.Balance >= 0 ? pac.Balance : null);
  const pacReachable = pac?.facturamaReachable ?? pacBalance !== null;
  const pacEnvironmentLabel =
    pac?.environment === 'production'
      ? 'Producción'
      : pac?.environment === 'sandbox'
        ? 'Pruebas (sandbox)'
        : 'Ambiente no informado';

  // Backend returns { data: [...], total: number, stats: {} } with snake_case fields
  const paginatedResult = invoicesResponse as any;
  const invoicesList: any[] | undefined = paginatedResult?.data;
  const totalInvoices: number = paginatedResult?.total ?? 0;
  const invoiceStats: Record<string, number> = paginatedResult?.stats ?? {};

  const filteredInvoices = useMemo(() => {
    if (!invoicesList) return [];
    if (!searchTerm) return invoicesList;
    const search = searchTerm.toLowerCase();
    return invoicesList.filter((inv: any) =>
      inv.sat_uuid?.toLowerCase().includes(search) ||
      inv.invoice_number?.toLowerCase().includes(search) ||
      inv.receiver_rfc?.toLowerCase().includes(search) ||
      inv.receiver_name?.toLowerCase().includes(search) ||
      inv.order_number?.toLowerCase().includes(search)
    );
  }, [invoicesList, searchTerm]);

  const handleDownloadPdf = async (invoiceId: string) => {
    try {
      const blob = await billingService.downloadInvoicePdf(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF descargado');
    } catch (err) {
      toast.error(billingErrorMessage(err, 'No se pudo descargar el PDF'));
    }
  };

  const handleDownloadXml = async (invoiceId: string) => {
    try {
      const blob = await billingService.downloadInvoiceXml(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${invoiceId}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('XML descargado');
    } catch (err) {
      toast.error(billingErrorMessage(err, 'No se pudo descargar el XML'));
    }
  };

  const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.STAMPED:
      case InvoiceStatus.SENT:
        return <CheckCircleIcon className="h-4 w-4" />;
      case InvoiceStatus.CANCELLED:
        return <XMarkIcon className="h-4 w-4" />;
      case InvoiceStatus.ERROR:
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: DEFAULT_TIMEZONE,
    });
  };

  const handleSearch = () => {
    setParams({ search: searchInput.trim() });
  };

  const handleStatusFilter = (value: string) => {
    setParams({ status: value });
  };

  const handlePageSizeChange = (size: number) => {
    setParams({ limit: String(size), page: null });
  };

  const resetFilters = () => {
    setSearchInput('');
    setParams({ search: null, status: null, page: null });
  };

  const hasActiveFilters = Boolean(searchTerm || statusFilter);

  // Stats from backend aggregation (across all invoices, not just current page)
  const allStatusTotal = Object.values(invoiceStats).reduce((sum, n) => sum + n, 0);
  const stats = {
    total: allStatusTotal || totalInvoices,
    stamped: (invoiceStats['stamped'] || 0) + (invoiceStats['sent'] || 0),
    pending: invoiceStats['pending'] || 0,
    cancelled: invoiceStats['cancelled'] || 0,
  };

  // Column definitions
  const invoiceColumns: DataTableColumn<any>[] = [
    {
      key: 'folio',
      header: 'Folio',
      sortable: true,
      sortValue: (inv) => inv.invoice_number || '',
      render: (inv) => (
        <div>
          <span className="font-mono text-sm font-medium text-[#3E667D]">
            {inv.invoice_number || '-'}
          </span>
          {inv.sat_uuid && (
            <div className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">
              UUID: {inv.sat_uuid}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'receiver',
      header: 'Receptor',
      sortable: true,
      sortValue: (inv) => inv.receiver_name || '',
      render: (inv) => (
        <div>
          <p className="font-medium text-gray-900">{inv.receiver_name}</p>
          <p className="text-sm text-gray-500">RFC: {inv.receiver_rfc || '-'}</p>
        </div>
      ),
    },
    {
      key: 'order',
      header: 'Pedido',
      sortable: true,
      sortValue: (inv) => inv.order_number || '',
      render: (inv) => (
        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
          {inv.order_number || '-'}
        </code>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      sortable: true,
      sortValue: (inv) => Number(inv.total) || 0,
      render: (inv) => (
        <span className="font-bold text-gray-900">
          {formatCurrency(inv.total || 0)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      sortable: true,
      sortValue: (inv) => inv.provider_status || '',
      render: (inv) => {
        const statusConfig = INVOICE_STATUS_CONFIG[inv.provider_status as InvoiceStatus];
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusConfig?.color || 'bg-gray-100 text-gray-800'}`}
          >
            {getStatusIcon(inv.provider_status as InvoiceStatus)}
            {statusConfig?.label || inv.provider_status}
          </span>
        );
      },
    },
    {
      key: 'date',
      header: 'Fecha',
      sortable: true,
      sortValue: (inv) => inv.stamped_at || inv.created_at || '',
      render: (inv) => (
        <span className="text-sm text-gray-600">
          {formatDate(inv.stamped_at || inv.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (inv) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/admin/facturacion/${inv.id}`}>
            <button
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Ver detalle"
            >
              <EyeIcon className="h-5 w-5" />
            </button>
          </Link>
          {inv.provider_status === 'stamped' && (
            <>
              <button
                onClick={() => handleDownloadPdf(inv.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Descargar PDF"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDownloadXml(inv.id)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Descargar XML"
              >
                <DocumentDuplicateIcon className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <PermissionGuard permissions={['billing:read', 'billing:*']}>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <DocumentTextIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Facturación CFDI</h1>
              </div>
              <p className="text-white/80 text-lg">
                Gestión de facturas electrónicas
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/facturacion/datos-fiscales">
                <Button
                  variant="outline"
                  className="border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <BuildingOfficeIcon className="h-5 w-5" />
                  Datos Fiscales
                </Button>
              </Link>
              <Link href="/admin/facturacion/global">
                <Button
                  variant="outline"
                  className="border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <GlobeAltIcon className="h-5 w-5" />
                  Factura Global
                </Button>
              </Link>
              <Link href="/admin/facturacion/complemento-pago">
                <Button
                  variant="outline"
                  className="border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <DocumentDuplicateIcon className="h-5 w-5" />
                  Complemento de Pago
                </Button>
              </Link>
              <Link href="/admin/facturacion/reporte-folios">
                <Button
                  variant="outline"
                  className="border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <ChartBarIcon className="h-5 w-5" />
                  Reporte Folios
                </Button>
              </Link>
              <Link href="/admin">
                <Button variant="secondary">Volver</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estado del PAC: conectividad real, ambiente y saldo de timbres */}
        {pac && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${
                      !pac.configured
                        ? 'bg-red-500'
                        : pacReachable
                          ? 'bg-green-500'
                          : 'bg-amber-500'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium">
                      Facturama:{' '}
                      {!pac.configured
                        ? 'No configurado'
                        : pacReachable
                          ? 'Conectado'
                          : 'Sin respuesta'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {pacEnvironmentLabel}
                      {pac.issuerRfcMasked ? ` · Emisor ${pac.issuerRfcMasked}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-sm sm:text-right">
                  {pacBalance !== null ? (
                    <>
                      <span className="text-gray-600">Timbres disponibles: </span>
                      <span
                        className={`font-bold ${pacBalance < 100 ? 'text-red-600' : 'text-[#3E667D]'}`}
                      >
                        {pacBalance.toLocaleString('es-MX')}
                      </span>
                    </>
                  ) : (
                    <span className="text-amber-700">
                      {pac.error || 'Saldo de timbres no disponible'}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Timbradas</p>
                  <p className="text-3xl font-bold text-green-600">{stats.stamped}</p>
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
                  <p className="text-sm text-gray-600 mb-1">Pendientes</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Canceladas</p>
                  <p className="text-3xl font-bold text-red-600">{stats.cancelled}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <XMarkIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6 border-gray-100 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-gray-700">Busqueda y filtros</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-gray-600"
                  onClick={() => refetch()}
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
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearch();
                        }
                      }}
                      placeholder="Buscar por UUID, folio, RFC, razón social, pedido..."
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

              {/* Status Filter */}
              <div className="lg:col-span-4">
                <SearchableSelect
                  options={[
                    { value: InvoiceStatus.PENDING, label: 'Pendientes' },
                    { value: InvoiceStatus.STAMPED, label: 'Timbradas' },
                    { value: InvoiceStatus.CANCELLED, label: 'Canceladas' },
                    { value: InvoiceStatus.ERROR, label: 'Con error' },
                  ]}
                  value={statusFilter}
                  onChange={handleStatusFilter}
                  allLabel="Todos los estados"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                  Filtros activos
                </span>
                {searchTerm && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                    Busqueda: {searchTerm}
                  </span>
                )}
                {statusFilter && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                    Estado: {INVOICE_STATUS_CONFIG[statusFilter]?.label || statusFilter}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900">Listado de facturas</h2>
              <p className="text-sm text-gray-600">
                Mostrando {filteredInvoices.length} de {totalInvoices}
              </p>
            </div>
            {isFetching && (
              <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                Actualizando resultados...
              </div>
            )}
            {isError ? (
              /* Un 400/500 ya no se dibuja igual que "no hay facturas" */
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
                <ExclamationTriangleIcon className="mx-auto mb-3 h-10 w-10 text-red-500" />
                <h3 className="mb-1 text-base font-bold text-red-900">
                  No se pudo cargar el listado de facturas
                </h3>
                <p className="text-sm text-red-700">
                  {billingErrorMessage(error, 'Error al consultar las facturas')}
                </p>
                <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                  Reintentar
                </Button>
              </div>
            ) : (
              <>
                <DataTable
                  columns={invoiceColumns}
                  data={filteredInvoices}
                  isLoading={isLoading && !paginatedResult}
                  getRowKey={(inv) => inv.id}
                  minWidthClassName="min-w-[920px]"
                  emptyState={
                    <div className="py-2 text-center">
                      <DocumentTextIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                      <h3 className="mb-2 text-xl font-bold text-gray-900">
                        No hay facturas registradas
                      </h3>
                      <p className="text-gray-600">
                        Hoy solo se factura desde el POS, y únicamente en las
                        terminales con la facturación en v2 encendida: el resto
                        de las sucursales sigue facturando en el sistema anterior.
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
                {filteredInvoices.length > 0 && (
                  <DataTablePagination
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalItems={totalInvoices}
                    isLoading={isLoading || isFetching}
                    onPageChange={(p) => setParams({ page: String(p) })}
                    onPageSizeChange={handlePageSizeChange}
                    pageSizeOptions={[10, 20, 50, 100]}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </PermissionGuard>
  );
}
