'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  PrinterIcon,
  EnvelopeIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  DocumentTextIcon,
  ReceiptRefundIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useOrder,
  useOrderTracking,
  useUpdateOrderStatus,
  useCancelOrder,
} from '@/hooks/useOrders';
import { useCreateInvoice, useInvoices, useFiscalDataByCustomer } from '@/hooks/useBilling';
import { billingService } from '@/services/billing.service';
import { CFDI_USES, PAYMENT_FORMS } from '@/types/billing';
import { OrderStatus } from '@/types/order';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

// ================================
// Helpers
// ================================

const statusOptions = [
  { value: 'pending', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmado', color: 'bg-teal-100 text-teal-800' },
  { value: 'paid', label: 'Pagado', color: 'bg-blue-100 text-blue-800' },
  { value: 'processing', label: 'Procesando', color: 'bg-blue-100 text-blue-800' },
  { value: 'shipped', label: 'Enviado', color: 'bg-purple-100 text-purple-800' },
  { value: 'in_transit', label: 'En Tránsito', color: 'bg-purple-100 text-purple-800' },
  { value: 'delivered', label: 'Entregado', color: 'bg-green-100 text-green-800' },
  { value: 'completed', label: 'Completado', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelado', color: 'bg-red-100 text-red-800' },
];

const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(num);
};

const formatDate = (dateString: string | Date) => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('es-MX', {
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

export default function OrderDetailAdminPage() {
  const params = useParams();
  const id = params.id as string;

  const queryClient = useQueryClient();
  const { data: order, isLoading, error } = useOrder(id);
  const { data: tracking } = useOrderTracking(id);
  const updateStatus = useUpdateOrderStatus();
  const cancelOrderMutation = useCancelOrder();
  const createInvoice = useCreateInvoice();

  // Invoice data
  const { data: orderInvoices } = useInvoices(
    order?.isInvoiced ? { orderId: id } : undefined,
  );
  const invoice = (orderInvoices as any)?.data?.[0] as any; // Backend returns { data, total } with snake_case fields
  const { data: fiscalData } = useFiscalDataByCustomer(order?.customer?.id);

  const [showActions, setShowActions] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    cfdiUse: 'G03',
    paymentForm: '01',
    sendEmail: false,
  });

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus.mutateAsync({
        id,
        dto: { status: newStatus as OrderStatus },
      });
      toast.success(
        `Estado actualizado a: ${statusOptions.find((s) => s.value === newStatus)?.label}`,
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar estado');
    }
  };

  const handleDownloadPdf = async (invoiceId: string) => {
    try {
      const blob = await billingService.downloadInvoicePdf(invoiceId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${invoiceId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar PDF');
    }
  };

  const handleDownloadXml = async (invoiceId: string) => {
    try {
      const blob = await billingService.downloadInvoiceXml(invoiceId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${invoiceId}.xml`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar XML');
    }
  };

  const handleCreateInvoice = async () => {
    try {
      await createInvoice.mutateAsync({
        orderId: id,
        cfdiUse: invoiceForm.cfdiUse,
        paymentForm: invoiceForm.paymentForm,
        sendEmail: invoiceForm.sendEmail,
      });
      setShowInvoiceDialog(false);
      queryClient.invalidateQueries({ queryKey: ['orders', 'admin', id] });
    } catch {
      // hook already shows error toast
    }
  };

  const handlePrint = () => {
    if (order?.invoiceId) {
      handleDownloadPdf(order.invoiceId);
    } else {
      toast.info('No hay factura generada para este pedido');
    }
  };

  const handleSendEmail = () => {
    toast.success('Correo de actualización enviado al cliente');
  };

  const handleCancel = async () => {
    if (!confirm('¿Estás seguro de que deseas cancelar este pedido?')) return;
    try {
      await cancelOrderMutation.mutateAsync({
        id,
        dto: { reason: 'Cancelado por administrador' },
      });
      toast.success('Pedido cancelado');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cancelar pedido');
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#3E667D] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Cargando pedido...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error al cargar el pedido</h2>
          <p className="text-gray-600 mb-4">
            {(error as any)?.response?.data?.message || 'Pedido no encontrado'}
          </p>
          <Link href="/admin/pedidos">
            <button className="px-6 py-2 bg-[#3E667D] text-white rounded-lg hover:bg-[#3E667D]/90">
              Volver a Pedidos
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const currentStatusOption = statusOptions.find((s) => s.value === order.status);
  const subtotal = parseFloat(order.subtotal);
  const taxAmount = parseFloat(order.taxAmount);
  const discountAmount = parseFloat(order.discountAmount);
  const shippingAmount = parseFloat(order.shippingAmount);
  const total = parseFloat(order.total);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/pedidos"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Pedido #{order.orderNumber}
                </h1>
                <p className="text-gray-600">{formatDate(order.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                title="Imprimir"
              >
                <PrinterIcon className="h-5 w-5" />
              </button>
              <button
                onClick={handleSendEmail}
                className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                title="Enviar correo"
              >
                <EnvelopeIcon className="h-5 w-5" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <EllipsisVerticalIcon className="h-5 w-5" />
                </button>
                {showActions && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                    <button
                      onClick={() => {
                        setShowActions(false);
                        handleCancel();
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
                    >
                      <XCircleIcon className="h-4 w-4" />
                      Cancelar Pedido
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Productos</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                      <CubeIcon className="h-8 w-8 text-gray-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900">
                        {item.productName || `Producto ${item.productId.slice(0, 8)}...`}
                      </h3>
                      {(item.productSku || item.productCode) && (
                        <p className="text-sm text-gray-500">
                          {item.productSku && `SKU: ${item.productSku}`}
                          {item.productSku && item.productCode && ' | '}
                          {item.productCode && `Código: ${item.productCode}`}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium text-gray-900">{formatCurrency(item.unitPrice)}</p>
                      <p className="text-sm text-gray-600">
                        Total: {formatCurrency(item.totalPrice)}
                      </p>
                    </div>
                  </div>
                ))}

                {order.items.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No hay productos en este pedido
                  </p>
                )}
              </div>

              {/* Pricing Summary */}
              <div className="mt-6 pt-6 border-t space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Envío</span>
                  <span>{shippingAmount === 0 ? 'GRATIS' : formatCurrency(shippingAmount)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuento</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>Impuestos</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Timeline / Tracking */}
            {tracking && tracking.statusHistory && tracking.statusHistory.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Historial de Envío</h2>
                <div className="space-y-6">
                  {tracking.statusHistory.map((entry, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#3E667D] text-white">
                          <TruckIcon className="h-5 w-5" />
                        </div>
                        {index < tracking.statusHistory.length - 1 && (
                          <div className="w-0.5 h-12 bg-[#C8DDF2]" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <h3 className="font-medium text-gray-900 capitalize">{entry.status}</h3>
                        <p className="text-sm text-gray-600">{formatDate(entry.createdAt)}</p>
                        {entry.notes && (
                          <p className="text-sm text-gray-500 mt-1">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Order metadata */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Detalles Adicionales</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {order.source && (
                  <div>
                    <span className="text-gray-500">Origen:</span>{' '}
                    <span className="font-medium text-gray-900 capitalize">{order.source}</span>
                  </div>
                )}
                {order.orderDate && (
                  <div>
                    <span className="text-gray-500">Fecha de orden:</span>{' '}
                    <span className="font-medium text-gray-900">{formatDate(order.orderDate)}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Puntos MLM:</span>{' '}
                  <span className="font-medium text-gray-900">{order.totalPoints}</span>
                </div>
                <div>
                  <span className="text-gray-500">Valor de Negocio:</span>{' '}
                  <span className="font-medium text-gray-900">
                    {formatCurrency(order.totalBusinessValue)}
                  </span>
                </div>
                {order.observation && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Observación:</span>{' '}
                    <span className="font-medium text-gray-900">{order.observation}</span>
                  </div>
                )}
                {order.confirmationNotes && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Notas de confirmación:</span>{' '}
                    <span className="font-medium text-gray-900">{order.confirmationNotes}</span>
                  </div>
                )}
                {order.cancellationReason && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Motivo de cancelación:</span>{' '}
                    <span className="font-medium text-red-600">{order.cancellationReason}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Estado</h2>
              <SearchableSelect
                options={statusOptions.map((option) => ({ value: option.value, label: option.label }))}
                value={order.status}
                onChange={handleStatusChange}
                showAllOption={false}
                disabled={updateStatus.isPending}
                className="w-full mb-3"
              />
              <div className="flex justify-center">
                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium ${currentStatusOption?.color || 'bg-gray-100 text-gray-800'}`}
                >
                  {currentStatusOption?.label || order.status}
                </span>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Cliente</h2>
              {order.customer ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <UserIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {order.customer.firstName} {order.customer.lastName}
                      </p>
                      {order.customerId && (
                        <Link
                          href={`/admin/distribuidores/${order.customerId}`}
                          className="text-sm text-[#3E667D] hover:underline"
                        >
                          Ver perfil →
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    <a
                      href={`mailto:${order.customer.email}`}
                      className="text-sm text-gray-700 hover:text-[#3E667D]"
                    >
                      {order.customer.email}
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Sin información de cliente</p>
              )}
            </div>

            {/* Shipping Info */}
            {order.shippingAddressSnapshot && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Envío</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Dirección de Envío</p>
                      <p className="text-sm text-gray-600">
                        {order.shippingAddressSnapshot.street}
                        {order.shippingAddressSnapshot.exteriorNumber &&
                          ` #${order.shippingAddressSnapshot.exteriorNumber}`}
                        <br />
                        {order.shippingAddressSnapshot.neighborhood &&
                          `${order.shippingAddressSnapshot.neighborhood}, `}
                        {order.shippingAddressSnapshot.city},{' '}
                        {order.shippingAddressSnapshot.state}{' '}
                        {order.shippingAddressSnapshot.postalCode}
                        <br />
                        {order.shippingAddressSnapshot.country}
                      </p>
                    </div>
                  </div>

                  {tracking && tracking.carrier && (
                    <div className="flex items-start gap-3">
                      <TruckIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Carrier</p>
                        <p className="text-sm text-gray-600">{tracking.carrier}</p>
                      </div>
                    </div>
                  )}

                  {tracking && tracking.trackingNumber && (
                    <div className="flex items-start gap-3">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Tracking</p>
                        <p className="text-sm text-[#3E667D] font-mono">
                          {tracking.trackingNumber}
                        </p>
                      </div>
                    </div>
                  )}

                  {tracking && tracking.estimatedDeliveryDate && (
                    <div className="flex items-start gap-3">
                      <ClockIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Entrega Estimada</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(tracking.estimatedDeliveryDate)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Pago</h2>
              <div className="space-y-3 text-sm">
                {order.paymentReference && (
                  <div>
                    <span className="text-gray-500">Referencia:</span>{' '}
                    <span className="font-mono text-gray-900">{order.paymentReference}</span>
                  </div>
                )}
                {order.paymentAmount1 != null && (
                  <div>
                    <span className="text-gray-500">Monto 1:</span>{' '}
                    <span className="font-medium text-gray-900">
                      {formatCurrency(order.paymentAmount1)}
                    </span>
                  </div>
                )}
                {order.paymentAmount2 != null && order.paymentAmount2 > 0 && (
                  <div>
                    <span className="text-gray-500">Monto 2:</span>{' '}
                    <span className="font-medium text-gray-900">
                      {formatCurrency(order.paymentAmount2)}
                    </span>
                  </div>
                )}
                {!order.paymentReference && !order.paymentAmount1 && (
                  <p className="text-gray-400">Sin información de pago registrada</p>
                )}
              </div>
            </div>

            {/* Invoice / Facturación */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                Facturación
              </h2>

              {order.isInvoiced && invoice ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        invoice.provider_status === 'stamped'
                          ? 'bg-green-100 text-green-800'
                          : invoice.provider_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : invoice.provider_status === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {invoice.provider_status === 'stamped'
                        ? 'Timbrada'
                        : invoice.provider_status === 'pending'
                          ? 'Pendiente'
                          : invoice.provider_status === 'error'
                            ? 'Error'
                            : invoice.provider_status === 'cancelled'
                              ? 'Cancelada'
                              : invoice.provider_status}
                    </span>
                    {invoice.invoice_number && (
                      <span className="text-xs text-gray-500 font-mono">
                        {invoice.invoice_number}
                      </span>
                    )}
                  </div>

                  {invoice.sat_uuid && (
                    <div>
                      <span className="text-gray-500 text-xs">UUID Fiscal:</span>
                      <p className="text-xs font-mono text-gray-700 break-all mt-0.5">
                        {invoice.sat_uuid}
                      </p>
                    </div>
                  )}

                  {invoice.provider_status === 'stamped' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownloadPdf(invoice.id)}
                        className="flex-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => handleDownloadXml(invoice.id)}
                        className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                      >
                        XML
                      </button>
                    </div>
                  )}

                  <Link
                    href={`/admin/facturacion/${invoice.id}`}
                    className="block text-center text-sm text-[#3E667D] hover:underline"
                  >
                    Ver detalle de factura
                  </Link>
                </div>
              ) : order.isInvoiced && !order.invoiceId ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Factura Global v1
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Este pedido fue facturado en el sistema anterior como parte de una factura global.
                  </p>
                  <p className="text-xs text-gray-400">
                    La factura no está vinculada directamente. Consultar el sistema anterior para más detalles.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(fiscalData as any)?.rfc ? (
                    <>
                      <p className="text-sm text-gray-600">
                        RFC:{' '}
                        <span className="font-mono font-medium">
                          {(fiscalData as any).rfc}
                        </span>
                      </p>
                      <button
                        onClick={() => setShowInvoiceDialog(true)}
                        disabled={createInvoice.isPending}
                        className="w-full px-4 py-2 bg-[#3E667D] text-white rounded-lg hover:bg-[#3E667D]/90 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                      >
                        <DocumentTextIcon className="h-4 w-4" />
                        {createInvoice.isPending ? 'Generando...' : 'Generar Factura'}
                      </button>
                    </>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-2">
                        El cliente no tiene datos fiscales registrados
                      </p>
                      <Link
                        href="/admin/facturacion/datos-fiscales"
                        className="text-sm text-[#3E667D] hover:underline"
                      >
                        Registrar datos fiscales
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Creation Dialog */}
      {showInvoiceDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowInvoiceDialog(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Generar Factura CFDI
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Uso del CFDI
                  </label>
                  <SearchableSelect
                    options={CFDI_USES.map((use) => ({ value: use.Value, label: `${use.Value} - ${use.Name}` }))}
                    value={invoiceForm.cfdiUse}
                    onChange={(val) => setInvoiceForm((prev) => ({ ...prev, cfdiUse: val }))}
                    showAllOption={false}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forma de Pago
                  </label>
                  <SearchableSelect
                    options={PAYMENT_FORMS.map((form) => ({ value: form.Value, label: `${form.Value} - ${form.Name}` }))}
                    value={invoiceForm.paymentForm}
                    onChange={(val) => setInvoiceForm((prev) => ({ ...prev, paymentForm: val }))}
                    showAllOption={false}
                    className="w-full"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={invoiceForm.sendEmail}
                    onChange={(e) =>
                      setInvoiceForm((prev) => ({
                        ...prev,
                        sendEmail: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-[#3E667D] focus:ring-[#3E667D]"
                  />
                  Enviar factura por correo al cliente
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowInvoiceDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateInvoice}
                  disabled={createInvoice.isPending}
                  className="flex-1 px-4 py-2 bg-[#3E667D] text-white rounded-lg hover:bg-[#3E667D]/90 disabled:opacity-50 text-sm font-medium transition-colors"
                >
                  {createInvoice.isPending ? 'Generando...' : 'Generar Factura'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
