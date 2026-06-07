// app/admin/facturacion/[id]/page.tsx - Detalle de factura CFDI
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.5 Facturación
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  EyeIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useInvoice, useStampInvoice, useCancelInvoice } from '@/hooks/useBilling';
import { billingService } from '@/services/billing.service';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
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

  const { data: invoiceRaw, isLoading } = useInvoice(invoiceId);
  // Backend returns snake_case fields; cast to any for direct access
  const invoice = invoiceRaw as any;
  const stampInvoice = useStampInvoice();
  const cancelInvoice = useCancelInvoice();

  const currentUser = useAppSelector(selectUser);

  const [showStampModal, setShowStampModal] = useState(false);
  const [stampSendEmail, setStampSendEmail] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('02');
  const [replacementUuid, setReplacementUuid] = useState('');
  const [cancelConfirmText, setCancelConfirmText] = useState('');

  const openStampModal = (sendEmail: boolean) => {
    setStampSendEmail(sendEmail);
    setShowStampModal(true);
  };

  const handleStamp = async () => {
    try {
      await stampInvoice.mutateAsync({ id: invoiceId, sendEmail: stampSendEmail });
      setShowStampModal(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCancel = async () => {
    if (cancelConfirmText !== 'CANCELAR') {
      toast.error('Escribe CANCELAR para confirmar');
      return;
    }

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
      setCancelConfirmText('');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const openCancelModal = () => {
    setCancelConfirmText('');
    setCancelReason('02');
    setReplacementUuid('');
    setShowCancelModal(true);
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await billingService.downloadInvoicePdf(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${invoice?.invoice_number || invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF descargado');
    } catch (error: any) {
      const msg = error?.response?.data?.message || '';
      if (msg.includes('LEGACY_INVOICE')) {
        toast.error('Esta factura fue generada en el sistema anterior y no está disponible para descarga.');
      } else {
        toast.error('Error al descargar PDF');
      }
    }
  };

  const handleViewPdf = async () => {
    try {
      const blob = await billingService.downloadInvoicePdf(invoiceId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (error: any) {
      const msg = error?.response?.data?.message || '';
      if (msg.includes('LEGACY_INVOICE')) {
        toast.error('Esta factura fue generada en el sistema anterior y no está disponible para descarga.');
      } else {
        toast.error('Error al visualizar PDF');
      }
    }
  };

  const handleDownloadXml = async () => {
    try {
      const blob = await billingService.downloadInvoiceXml(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${invoice?.invoice_number || invoiceId}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('XML descargado');
    } catch (error: any) {
      const msg = error?.response?.data?.message || '';
      if (msg.includes('LEGACY_INVOICE')) {
        toast.error('Esta factura fue generada en el sistema anterior y no está disponible para descarga.');
      } else {
        toast.error('Error al descargar XML');
      }
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
              <Button variant="default">Volver a Facturación</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = INVOICE_STATUS_CONFIG[invoice.provider_status as InvoiceStatus] ||
    INVOICE_STATUS_CONFIG[invoice.status as InvoiceStatus];

  // Legacy invoices from v1.0 migration don't have provider_invoice_id — can't download from Facturama
  const isLegacyInvoice = !invoice.provider_invoice_id && invoice.provider_status === 'stamped';

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
                    Factura {invoice.invoice_number || formatInvoiceNumber(invoice.series, invoice.folio)}
                  </h1>
                </div>
                {invoice.sat_uuid && (
                  <p className="text-white/80 mt-1 font-mono text-sm">
                    UUID: {invoice.sat_uuid}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${statusConfig?.color || 'bg-gray-100 text-gray-800'}`}
              >
                {getStatusIcon((invoice.provider_status || invoice.status) as InvoiceStatus)}
                {statusConfig?.label || invoice.provider_status || invoice.status}
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
            {invoice.provider_status === 'error' && invoice.provider_error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-red-800">Error en timbrado</h3>
                      <p className="text-sm text-red-700 mt-1">{invoice.provider_error}</p>
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
                    <p className="font-medium text-gray-900">{invoice.receiver_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">RFC</p>
                    <p className="font-mono font-medium text-gray-900">
                      {invoice.receiver_rfc}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Régimen Fiscal</p>
                    <p className="font-medium text-gray-900">
                      {getFiscalRegimeName(invoice.receiver_tax_regime_code || '')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Código Postal</p>
                    <p className="font-medium text-gray-900">{invoice.receiver_zip_code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Uso de CFDI</p>
                    <p className="font-medium text-gray-900">
                      {getCfdiUseName(invoice.receiver_cfdi_use_code || '')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Items */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Conceptos</h2>
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="border-b border-gray-200">
                        <TableHead className="text-left py-2 px-3 text-sm font-medium text-gray-600">
                          Descripción
                        </TableHead>
                        <TableHead className="text-right py-2 px-3 text-sm font-medium text-gray-600">
                          Cantidad
                        </TableHead>
                        <TableHead className="text-right py-2 px-3 text-sm font-medium text-gray-600">
                          P. Unitario
                        </TableHead>
                        <TableHead className="text-right py-2 px-3 text-sm font-medium text-gray-600">
                          Importe
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.items?.map((item: any, index: number) => (
                        <TableRow key={item.id || index} className="border-b border-gray-100">
                          <TableCell className="py-3 px-3">
                            <p className="font-medium text-gray-900">{item.description}</p>
                            <p className="text-xs text-gray-500">
                              Clave: {item.sat_product_code} | Unidad: {item.sat_unit_code}
                            </p>
                          </TableCell>
                          <TableCell className="py-3 px-3 text-right text-gray-900">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-right text-gray-900">
                            {formatCurrency(item.unit_price || 0)}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-right font-medium text-gray-900">
                            {formatCurrency(item.total || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="border-t-2 border-gray-200">
                        <TableCell colSpan={3} className="py-3 px-3 text-right font-medium">
                          Subtotal:
                        </TableCell>
                        <TableCell className="py-3 px-3 text-right font-medium">
                          {formatCurrency(invoice.subtotal || 0)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={3} className="py-2 px-3 text-right text-gray-600">
                          IVA ({((Number(invoice.tax_rate) || 0.16) * 100).toFixed(0)}%):
                        </TableCell>
                        <TableCell className="py-2 px-3 text-right">
                          {formatCurrency(invoice.tax_amount || 0)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-gray-50">
                        <TableCell
                          colSpan={3}
                          className="py-3 px-3 text-right font-bold text-gray-900"
                        >
                          Total:
                        </TableCell>
                        <TableCell className="py-3 px-3 text-right font-bold text-xl text-[#3E667D]">
                          {formatCurrency(invoice.total || 0)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
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
                  {invoice.provider_status === 'pending' && (
                    <>
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => openStampModal(false)}
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        Timbrar Factura
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => openStampModal(true)}
                      >
                        <EnvelopeIcon className="h-5 w-5" />
                        Timbrar y Enviar
                      </Button>
                    </>
                  )}

                  {invoice.provider_status === 'stamped' && (
                    <>
                      {isLegacyInvoice && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-1">
                          <div className="flex items-start gap-2">
                            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700">
                              Esta factura fue migrada del sistema anterior. La descarga de PDF/XML no está disponible.
                            </p>
                          </div>
                        </div>
                      )}
                      {!isLegacyInvoice && (
                        <>
                          <Button
                            variant="default"
                            className="w-full"
                            onClick={handleViewPdf}
                          >
                            <EyeIcon className="h-5 w-5" />
                            Visualizar PDF
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleDownloadPdf}
                          >
                            <ArrowDownTrayIcon className="h-5 w-5" />
                            Descargar PDF
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleDownloadXml}
                          >
                            <DocumentDuplicateIcon className="h-5 w-5" />
                            Descargar XML
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        className="w-full text-red-600 hover:bg-red-50"
                        onClick={openCancelModal}
                      >
                        <XMarkIcon className="h-5 w-5" />
                        Cancelar Factura
                      </Button>
                    </>
                  )}

                  {invoice.provider_status === 'error' && (
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => openStampModal(false)}
                    >
                      <CheckCircleIcon className="h-5 w-5" />
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
                      {invoice.cfdi_type === 'I' ? 'Ingreso' : invoice.cfdi_type === 'E' ? 'Egreso' : invoice.cfdi_type === 'P' ? 'Pago' : invoice.cfdi_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Método de Pago</p>
                    <p className="font-medium text-gray-900">
                      {invoice.payment_method_code === 'PUE'
                        ? 'Pago en Una Exhibición'
                        : invoice.payment_method_code === 'PPD'
                          ? 'Pago en Parcialidades'
                          : invoice.payment_method_code || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Forma de Pago</p>
                    <p className="font-medium text-gray-900">
                      {getPaymentFormName(invoice.payment_form_code || '')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Moneda</p>
                    <p className="font-medium text-gray-900">{invoice.currency_code || 'MXN'}</p>
                  </div>
                  {invoice.order && (
                    <div>
                      <p className="text-sm text-gray-600">Pedido Relacionado</p>
                      <Link
                        href={`/admin/pedidos/${invoice.order_id}`}
                        className="font-medium text-[#3E667D] hover:underline"
                      >
                        {invoice.order.order_number}
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
                        {formatDate(invoice.created_at)}
                      </p>
                    </div>
                  </div>
                  {invoice.stamped_at && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Timbrada</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(invoice.stamped_at)}
                        </p>
                      </div>
                    </div>
                  )}
                  {invoice.cancelled_at && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Cancelada</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(invoice.cancelled_at)}
                        </p>
                        {invoice.cancellation_reason && (
                          <p className="text-xs text-gray-500">
                            Motivo:{' '}
                            {
                              CANCELLATION_REASONS.find(
                                (r) => r.Value === invoice.cancellation_reason
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

      {/* Stamp Confirmation Modal */}
      {showStampModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-lg w-full mx-4">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#3E667D]/10 rounded-full">
                  <CheckCircleIcon className="h-6 w-6 text-[#3E667D]" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {stampSendEmail ? 'Timbrar y Enviar Factura' : 'Timbrar Factura'}
                </h2>
              </div>

              {/* Invoice summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Factura:</span>
                  <span className="font-semibold text-gray-900">{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Receptor:</span>
                  <span className="font-medium text-gray-900">{invoice.receiver_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">RFC:</span>
                  <span className="font-mono text-gray-900">{invoice.receiver_rfc}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(invoice.total || 0)}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700">
                  {stampSendEmail
                    ? 'La factura será timbrada ante el SAT y enviada por correo electrónico al receptor.'
                    : 'La factura será timbrada ante el SAT. Esta acción genera un CFDI con validez fiscal.'}
                </p>
              </div>

              {/* Who is stamping */}
              <div className="text-sm text-gray-600 mb-4">
                Timbrando como: <span className="font-semibold text-gray-900">{currentUser?.firstName} {currentUser?.lastName}</span>
                <span className="text-gray-400 ml-1">({currentUser?.email})</span>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowStampModal(false)}
                >
                  Volver
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={handleStamp}
                  disabled={stampInvoice.isPending}
                >
                  {stampInvoice.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {stampSendEmail ? <EnvelopeIcon className="h-5 w-5" /> : <CheckCircleIcon className="h-5 w-5" />}
                  {stampSendEmail ? 'Timbrar y Enviar' : 'Confirmar Timbrado'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-lg w-full mx-4">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <ShieldExclamationIcon className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Cancelar Factura</h2>
              </div>

              {/* Invoice summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Factura:</span>
                  <span className="font-semibold text-gray-900">{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Receptor:</span>
                  <span className="font-medium text-gray-900">{invoice.receiver_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">RFC:</span>
                  <span className="font-mono text-gray-900">{invoice.receiver_rfc}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(invoice.total || 0)}</span>
                </div>
                {invoice.sat_uuid && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">UUID:</span>
                    <span className="font-mono text-xs text-gray-900">{invoice.sat_uuid}</span>
                  </div>
                )}
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700 font-medium">
                  Esta acción no se puede deshacer. La factura será cancelada ante el SAT.
                </p>
              </div>

              {/* Who is cancelling */}
              <div className="text-sm text-gray-600 mb-4">
                Cancelando como: <span className="font-semibold text-gray-900">{currentUser?.firstName} {currentUser?.lastName}</span>
                <span className="text-gray-400 ml-1">({currentUser?.email})</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo de Cancelación *
                  </label>
                  <SearchableSelect
                    options={CANCELLATION_REASONS.map((reason) => ({
                      value: reason.Value,
                      label: `${reason.Value} - ${reason.Name}`,
                    }))}
                    value={cancelReason}
                    onChange={setCancelReason}
                    showAllOption={false}
                  />
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Escribe <span className="font-bold text-red-600">CANCELAR</span> para confirmar
                  </label>
                  <input
                    type="text"
                    value={cancelConfirmText}
                    onChange={(e) => setCancelConfirmText(e.target.value)}
                    placeholder="CANCELAR"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCancelModal(false)}
                >
                  Volver
                </Button>
                <Button
                  variant="default"
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300"
                  onClick={handleCancel}
                  disabled={cancelInvoice.isPending || (cancelConfirmText !== 'CANCELAR' || cancelInvoice.isPending)}
                >
                  {cancelInvoice.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
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
