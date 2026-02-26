// app/admin/facturacion/[id]/page.tsx - Detalle de factura CFDI
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.5 Facturación
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  DocumentTextIcon,
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  EnvelopeIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useInvoice, useStampInvoice, useCancelInvoice } from '@/hooks/useBilling';
import { billingService } from '@/services/billing.service';
import {
  InvoiceStatus,
  INVOICE_STATUS_CONFIG,
  CANCELLATION_REASONS,
  formatInvoiceNumber,
  formatCurrency,
  getCfdiUseName,
  getPaymentFormName,
  getFiscalRegimeName,
} from '@/types/billing';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const stampInvoice = useStampInvoice();
  const cancelInvoice = useCancelInvoice();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('02');
  const [replacementUuid, setReplacementUuid] = useState('');

  const handleStamp = async (sendEmail = false) => {
    try {
      await stampInvoice.mutateAsync({ id: invoiceId, sendEmail });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCancel = async () => {
    if (cancelReason === '01' && !replacementUuid) {
      toast.error('El UUID de sustitución es requerido para el motivo 01');
      return;
    }

    try {
      await cancelInvoice.mutateAsync({
        id: invoiceId,
        data: {
          reason: cancelReason,
          replacementUuid: cancelReason === '01' ? replacementUuid : undefined,
        },
      });
      setShowCancelModal(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await billingService.downloadInvoicePdf(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${invoice?.folio || invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF descargado');
    } catch (error) {
      toast.error('Error al descargar PDF');
    }
  };

  const handleDownloadXml = async () => {
    try {
      const blob = await billingService.downloadInvoiceXml(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${invoice?.folio || invoiceId}.xml`;
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
        return <CheckCircleIcon className="h-6 w-6" />;
      case InvoiceStatus.CANCELLED:
        return <XMarkIcon className="h-6 w-6" />;
      case InvoiceStatus.ERROR:
        return <ExclamationTriangleIcon className="h-6 w-6" />;
      default:
        return <ClockIcon className="h-6 w-6" />;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#3E667D] border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-600">Cargando factura...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Factura no encontrada
            </h2>
            <p className="text-gray-600 mb-4">
              La factura que buscas no existe o fue eliminada.
            </p>
            <Link href="/admin/facturacion">
              <Button variant="primary">Volver a Facturación</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = INVOICE_STATUS_CONFIG[invoice.status as InvoiceStatus];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/facturacion"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <DocumentTextIcon className="h-8 w-8" />
                  <h1 className="text-3xl font-bold">
                    Factura {formatInvoiceNumber(invoice.series, invoice.folio)}
                  </h1>
                </div>
                {invoice.uuid && (
                  <p className="text-white/80 mt-1 font-mono text-sm">
                    UUID: {invoice.uuid}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${statusConfig?.color}`}
              >
                {getStatusIcon(invoice.status as InvoiceStatus)}
                {statusConfig?.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Error Message */}
            {invoice.status === InvoiceStatus.ERROR && invoice.errorMessage && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-red-800">Error en timbrado</h3>
                      <p className="text-sm text-red-700 mt-1">{invoice.errorMessage}</p>
                      {invoice.errorCode && (
                        <p className="text-xs text-red-600 mt-1">
                          Código: {invoice.errorCode}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Receiver Info */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Datos del Receptor
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Razón Social</p>
                    <p className="font-medium text-gray-900">{invoice.receiverName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">RFC</p>
                    <p className="font-mono font-medium text-gray-900">
                      {invoice.receiverRfc}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Régimen Fiscal</p>
                    <p className="font-medium text-gray-900">
                      {getFiscalRegimeName(invoice.receiverTaxRegime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Código Postal</p>
                    <p className="font-medium text-gray-900">{invoice.receiverPostalCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Uso de CFDI</p>
                    <p className="font-medium text-gray-900">
                      {getCfdiUseName(invoice.cfdiUse)}
                    </p>
                  </div>
                  {invoice.receiverEmail && (
                    <div>
                      <p className="text-sm text-gray-600">Correo electrónico</p>
                      <p className="font-medium text-gray-900">{invoice.receiverEmail}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Invoice Items */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Conceptos</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">
                          Descripción
                        </th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">
                          Cantidad
                        </th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">
                          P. Unitario
                        </th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">
                          Importe
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items?.map((item, index) => (
                        <tr key={item.id || index} className="border-b border-gray-100">
                          <td className="py-3 px-3">
                            <p className="font-medium text-gray-900">{item.description}</p>
                            <p className="text-xs text-gray-500">
                              Clave: {item.productCode} | Unidad: {item.unitCode}
                            </p>
                          </td>
                          <td className="py-3 px-3 text-right text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-3 text-right text-gray-900">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-gray-900">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200">
                        <td colSpan={3} className="py-3 px-3 text-right font-medium">
                          Subtotal:
                        </td>
                        <td className="py-3 px-3 text-right font-medium">
                          {formatCurrency(invoice.subtotal)}
                        </td>
                      </tr>
                      {parseFloat(invoice.discount) > 0 && (
                        <tr>
                          <td colSpan={3} className="py-2 px-3 text-right text-gray-600">
                            Descuento:
                          </td>
                          <td className="py-2 px-3 text-right text-red-600">
                            -{formatCurrency(invoice.discount)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan={3} className="py-2 px-3 text-right text-gray-600">
                          IVA (16%):
                        </td>
                        <td className="py-2 px-3 text-right">
                          {formatCurrency(invoice.taxAmount)}
                        </td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td
                          colSpan={3}
                          className="py-3 px-3 text-right font-bold text-gray-900"
                        >
                          Total:
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-xl text-[#3E667D]">
                          {formatCurrency(invoice.total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones</h2>
                <div className="space-y-3">
                  {invoice.status === InvoiceStatus.PENDING && (
                    <>
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={() => handleStamp(false)}
                        isLoading={stampInvoice.isPending}
                        leftIcon={<CheckCircleIcon className="h-5 w-5" />}
                      >
                        Timbrar Factura
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleStamp(true)}
                        isLoading={stampInvoice.isPending}
                        leftIcon={<EnvelopeIcon className="h-5 w-5" />}
                      >
                        Timbrar y Enviar
                      </Button>
                    </>
                  )}

                  {invoice.status === InvoiceStatus.STAMPED && (
                    <>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleDownloadPdf}
                        leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
                      >
                        Descargar PDF
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleDownloadXml}
                        leftIcon={<DocumentDuplicateIcon className="h-5 w-5" />}
                      >
                        Descargar XML
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full text-red-600 hover:bg-red-50"
                        onClick={() => setShowCancelModal(true)}
                        leftIcon={<XMarkIcon className="h-5 w-5" />}
                      >
                        Cancelar Factura
                      </Button>
                    </>
                  )}

                  {invoice.status === InvoiceStatus.ERROR && (
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => handleStamp(false)}
                      isLoading={stampInvoice.isPending}
                      leftIcon={<CheckCircleIcon className="h-5 w-5" />}
                    >
                      Reintentar Timbrado
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalles</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Tipo de Comprobante</p>
                    <p className="font-medium text-gray-900">
                      {invoice.invoiceType === 'I' ? 'Ingreso' : invoice.invoiceType}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Método de Pago</p>
                    <p className="font-medium text-gray-900">
                      {invoice.paymentMethod === 'PUE'
                        ? 'Pago en Una Exhibición'
                        : 'Pago en Parcialidades'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Forma de Pago</p>
                    <p className="font-medium text-gray-900">
                      {getPaymentFormName(invoice.paymentForm)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Moneda</p>
                    <p className="font-medium text-gray-900">{invoice.currency}</p>
                  </div>
                  {invoice.order && (
                    <div>
                      <p className="text-sm text-gray-600">Pedido Relacionado</p>
                      <Link
                        href={`/admin/pedidos/${invoice.orderId}`}
                        className="font-medium text-[#3E667D] hover:underline"
                      >
                        {invoice.order.orderNumber}
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial</h2>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-400 mt-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Creada</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(invoice.createdAt)}
                      </p>
                    </div>
                  </div>
                  {invoice.stampedAt && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Timbrada</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(invoice.stampedAt)}
                        </p>
                      </div>
                    </div>
                  )}
                  {invoice.sentAt && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Enviada</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(invoice.sentAt)}
                        </p>
                      </div>
                    </div>
                  )}
                  {invoice.cancelledAt && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Cancelada</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(invoice.cancelledAt)}
                        </p>
                        {invoice.cancellationReason && (
                          <p className="text-xs text-gray-500">
                            Motivo:{' '}
                            {
                              CANCELLATION_REASONS.find(
                                (r) => r.Value === invoice.cancellationReason
                              )?.Name
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Cancelar Factura</h2>
              <p className="text-gray-600 mb-4">
                Esta acción no se puede deshacer. La factura será cancelada ante el SAT.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo de Cancelación *
                  </label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  >
                    {CANCELLATION_REASONS.map((reason) => (
                      <option key={reason.Value} value={reason.Value}>
                        {reason.Value} - {reason.Name}
                      </option>
                    ))}
                  </select>
                </div>

                {cancelReason === '01' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      UUID de Sustitución *
                    </label>
                    <input
                      type="text"
                      value={replacementUuid}
                      onChange={(e) => setReplacementUuid(e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCancelModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleCancel}
                  isLoading={cancelInvoice.isPending}
                >
                  Confirmar Cancelación
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
