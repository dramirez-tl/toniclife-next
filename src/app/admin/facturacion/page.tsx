// app/admin/facturacion/page.tsx - Lista de facturas CFDI
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.5 Facturación
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  EyeIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useInvoices, useFacturamaStatus, useCancelInvoice } from '@/hooks/useBilling';
import { billingService } from '@/services/billing.service';
import {
  InvoiceStatus,
  INVOICE_STATUS_CONFIG,
  formatInvoiceNumber,
  formatCurrency,
  getPaymentFormName,
  type InvoiceQueryDto,
} from '@/types/billing';
import { PermissionGuard } from '@/components/auth';

export default function FacturacionPage() {
  const [filters, setFilters] = useState<InvoiceQueryDto>({
    limit: 50,
    offset: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');

  const { data: invoices, isLoading, refetch } = useInvoices({
    ...filters,
    status: statusFilter || undefined,
  });

  const { data: facturamaStatus } = useFacturamaStatus();
  const cancelInvoice = useCancelInvoice();

  const filteredInvoices = invoices?.filter((inv) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      inv.uuid?.toLowerCase().includes(search) ||
      inv.series?.toLowerCase().includes(search) ||
      inv.folio?.toLowerCase().includes(search) ||
      inv.receiverRfc.toLowerCase().includes(search) ||
      inv.receiverName.toLowerCase().includes(search) ||
      inv.order?.orderNumber?.toLowerCase().includes(search)
    );
  });

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
    } catch (error) {
      toast.error('Error al descargar PDF');
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
    } catch (error) {
      toast.error('Error al descargar XML');
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
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Stats
  const stats = {
    total: invoices?.length || 0,
    stamped: invoices?.filter((i) => i.status === InvoiceStatus.STAMPED).length || 0,
    pending: invoices?.filter((i) => i.status === InvoiceStatus.PENDING).length || 0,
    cancelled: invoices?.filter((i) => i.status === InvoiceStatus.CANCELLED).length || 0,
  };

  return (
    <PermissionGuard permissions={['billing:read', 'billing:*']}>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
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
                  className="border-white text-white hover:bg-white/10"
                  leftIcon={<BuildingOfficeIcon className="h-5 w-5" />}
                >
                  Datos Fiscales
                </Button>
              </Link>
              <Link href="/admin/facturacion/global">
                <Button
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
                  leftIcon={<GlobeAltIcon className="h-5 w-5" />}
                >
                  Factura Global
                </Button>
              </Link>
              <Link href="/admin/facturacion/complemento-pago">
                <Button
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
                  leftIcon={<DocumentDuplicateIcon className="h-5 w-5" />}
                >
                  Complemento de Pago
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
        {/* Facturama Status */}
        {facturamaStatus && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      facturamaStatus.configured ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="text-sm font-medium">
                    Facturama:{' '}
                    {facturamaStatus.configured ? 'Conectado' : 'No configurado'}
                  </span>
                </div>
                {facturamaStatus.configured && facturamaStatus.Balance >= 0 && (
                  <div className="text-sm">
                    <span className="text-gray-600">Timbres disponibles: </span>
                    <span className="font-bold text-[#3E667D]">
                      {facturamaStatus.Balance}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Timbradas</p>
                  <p className="text-2xl font-bold text-green-600">{stats.stamped}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <ClockIcon className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <XMarkIcon className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Canceladas</p>
                  <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por UUID, folio, RFC, razón social..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                >
                  <option value="">Todos los estados</option>
                  <option value={InvoiceStatus.PENDING}>Pendientes</option>
                  <option value={InvoiceStatus.STAMPED}>Timbradas</option>
                  <option value={InvoiceStatus.SENT}>Enviadas</option>
                  <option value={InvoiceStatus.CANCELLED}>Canceladas</option>
                  <option value={InvoiceStatus.ERROR}>Con error</option>
                </select>
              </div>

              {/* Refresh */}
              <Button variant="outline" onClick={() => refetch()}>
                Actualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 border-4 border-[#3E667D] border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600">Cargando facturas...</p>
              </div>
            ) : filteredInvoices && filteredInvoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                        Folio
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                        Receptor
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                        Pedido
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                        Total
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">
                        Estado
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                        Fecha
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => {
                      const statusConfig =
                        INVOICE_STATUS_CONFIG[invoice.status as InvoiceStatus];
                      return (
                        <tr
                          key={invoice.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <div>
                              <span className="font-mono text-sm font-medium text-[#3E667D]">
                                {formatInvoiceNumber(invoice.series, invoice.folio)}
                              </span>
                              {invoice.uuid && (
                                <div className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">
                                  UUID: {invoice.uuid}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium text-gray-900">
                                {invoice.receiverName}
                              </p>
                              <p className="text-sm text-gray-500">
                                RFC: {invoice.receiverRfc}
                              </p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {invoice.order?.orderNumber || '-'}
                            </code>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="font-bold text-gray-900">
                              {formatCurrency(invoice.total)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusConfig?.color}`}
                            >
                              {getStatusIcon(invoice.status as InvoiceStatus)}
                              {statusConfig?.label}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {formatDate(invoice.stampedAt || invoice.createdAt)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/admin/facturacion/${invoice.id}`}>
                                <button
                                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Ver detalle"
                                >
                                  <EyeIcon className="h-5 w-5" />
                                </button>
                              </Link>
                              {invoice.status === InvoiceStatus.STAMPED && (
                                <>
                                  <button
                                    onClick={() => handleDownloadPdf(invoice.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Descargar PDF"
                                  >
                                    <ArrowDownTrayIcon className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDownloadXml(invoice.id)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Descargar XML"
                                  >
                                    <DocumentDuplicateIcon className="h-5 w-5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No hay facturas registradas
                </h3>
                <p className="text-gray-600">
                  Las facturas se generan desde los pedidos completados
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </PermissionGuard>
  );
}
