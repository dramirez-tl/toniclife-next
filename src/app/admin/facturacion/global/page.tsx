// app/admin/facturacion/global/page.tsx - Factura Global (Orders)
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.5 Facturación
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import {
  GlobeAltIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  MapPinIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useCreateGlobalInvoice } from '@/hooks/useBilling';
import { useOrders } from '@/hooks/useOrders';
import { useActiveBranches } from '@/hooks/useBranches';
import { PAYMENT_FORMS, formatCurrency } from '@/types/billing';
import { OrderStatus } from '@/types/order';
import type { Branch } from '@/types/branch';
import type { Order } from '@/types/order';

const PAYMENT_METHODS_FACTURAMA = [
  { value: 'PUE', label: 'PUE - Pago en Una sola Exhibición' },
  { value: 'PPD', label: 'PPD - Pago en Parcialidades o Diferido' },
];

export default function GlobalInvoicePage() {
  const createGlobalInvoice = useCreateGlobalInvoice();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read initial values from URL query params
  const initialBranchId = searchParams.get('branchId') || '';
  const initialDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const initialAutoSearch = !!searchParams.get('branchId') && !!searchParams.get('date');

  // Filter state
  const [selectedBranchId, setSelectedBranchId] = useState(initialBranchId);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [searchTriggered, setSearchTriggered] = useState(initialAutoSearch);

  // Sync filters to URL
  const updateUrl = useCallback((branchId: string, date: string) => {
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', branchId);
    if (date) params.set('date', date);
    const qs = params.toString();
    router.replace(`/admin/facturacion/global${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [router]);

  // Selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Payment config state
  const [paymentForm, setPaymentForm] = useState('01'); // Efectivo
  const [paymentMethodFact, setPaymentMethodFact] = useState('PUE');

  // Success state
  const [createdInvoice, setCreatedInvoice] = useState<{
    id: string;
    uuid?: string;
    total: string;
    ordersCount: number;
    status: string;
  } | null>(null);

  // Branches
  const { data: allBranches } = useActiveBranches();
  const branchOptions = useMemo(
    () => (allBranches || []).map((b: Branch) => ({ value: b.id, label: b.name })),
    [allBranches],
  );

  // Orders query — only run when search is triggered
  const ordersQuery = useOrders(
    {
      branchId: selectedBranchId,
      dateFrom: selectedDate,
      dateTo: selectedDate,
      status: OrderStatus.CONFIRMED,
      isInvoiced: false,
      limit: 100,
      sortBy: 'orderDate',
      sortOrder: 'desc',
    },
    searchTriggered && !!selectedBranchId,
  );
  // Filter out orders with total <= 0
  const orders: Order[] = useMemo(
    () => (ordersQuery.data?.data || []).filter((o) => parseFloat(o.total) > 0),
    [ordersQuery.data],
  );

  // Selection helpers
  const allSelected = orders.length > 0 && selectedOrderIds.size === orders.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(orders.map((o) => o.id)));
    }
  };

  const toggleOrder = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  // Selection totals
  const selectedOrders = orders.filter((o) => selectedOrderIds.has(o.id));
  const selectedTotal = selectedOrders.reduce((sum, o) => sum + parseFloat(o.total), 0);

  // Search handler
  const handleSearch = () => {
    if (!selectedBranchId) {
      toast.error('Selecciona una sucursal');
      return;
    }
    setSelectedOrderIds(new Set());
    setCreatedInvoice(null);
    setSearchTriggered(true);
    updateUrl(selectedBranchId, selectedDate);
  };

  // Submit handler
  const handleSubmit = async () => {
    if (selectedOrderIds.size === 0) {
      toast.error('Selecciona al menos una venta');
      return;
    }

    const date = new Date(selectedDate + 'T12:00:00');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());

    try {
      const result = await createGlobalInvoice.mutateAsync({
        periodicity: '01', // Diario
        month,
        year,
        branchId: selectedBranchId,
        orderIds: Array.from(selectedOrderIds),
        paymentForm,
        paymentMethod: paymentMethodFact,
      });

      setCreatedInvoice({
        id: result.id,
        uuid: (result as any).uuid || (result as any).invoice?.uuid,
        total: result.total,
        ordersCount: selectedOrderIds.size,
        status: result.status || 'stamped',
      });
      setSelectedOrderIds(new Set());
      // Refetch to remove invoiced orders
      ordersQuery.refetch();
    } catch {
      // Error handled by the mutation hook
    }
  };

  // Reset to search again
  const handleNewSearch = () => {
    setCreatedInvoice(null);
    setSearchTriggered(false);
    setSelectedOrderIds(new Set());
  };

  // Get customer display name
  const getCustomerName = (order: Order) => {
    if (order.customer) {
      return `${order.customer.firstName} ${order.customer.lastName}`.trim();
    }
    return 'Público General';
  };

  // Get order number display (strip prefix if present)
  const getOrderDisplay = (order: Order) => {
    const num = order.orderNumber.replace(/^M-/, '');
    return num;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/facturacion"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <GlobeAltIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Factura Global</h1>
              </div>
              <p className="text-white/80 text-lg">
                Generar factura global para ventas al público en general
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <DocumentTextIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Sobre la Factura Global</p>
                <p>
                  La factura global se emite para amparar las ventas realizadas a clientes
                  que no solicitaron factura individual. Se emite a nombre del{' '}
                  <strong>PUBLICO EN GENERAL</strong> con RFC genérico XAXX010101000.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {createdInvoice ? (
          /* Success State */
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Factura Global {createdInvoice.status === 'stamped' ? 'Timbrada' : 'Creada'}
                </h2>
                {createdInvoice.uuid && (
                  <p className="text-sm text-gray-500 mt-1">UUID: {createdInvoice.uuid}</p>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Ventas Incluidas</p>
                  <p className="text-2xl font-bold text-gray-900">{createdInvoice.ordersCount}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-[#3E667D]">
                    {formatCurrency(createdInvoice.total)}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Estado</p>
                  <p className={`text-lg font-bold ${
                    createdInvoice.status === 'stamped' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {createdInvoice.status === 'stamped' ? 'Timbrada' : 'Pendiente'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <Link href="/admin/facturacion">
                  <Button variant="outline">Ver Lista de Facturas</Button>
                </Link>
                <Button variant="default" onClick={handleNewSearch}>
                  Nueva Búsqueda
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filter Bar */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MagnifyingGlassIcon className="h-5 w-5 text-[#3E667D]" />
                  Buscar Ventas
                </h2>
                <div className="grid md:grid-cols-3 gap-4 items-end">
                  {/* Branch */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="h-4 w-4" />
                        Sucursal *
                      </span>
                    </label>
                    <SearchableSelect
                      options={branchOptions}
                      value={selectedBranchId}
                      onChange={(val) => {
                        setSelectedBranchId(val);
                        setSearchTriggered(false);
                        setSelectedOrderIds(new Set());
                      }}
                      placeholder="Seleccionar sucursal..."
                      showAllOption={false}
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        Fecha *
                      </span>
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSearchTriggered(false);
                        setSelectedOrderIds(new Set());
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    />
                  </div>

                  {/* Search Button */}
                  <div>
                    <Button
                      variant="default"
                      onClick={handleSearch}
                      disabled={ordersQuery.isLoading}
                      className="w-full"
                    >
                      {ordersQuery.isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                      <MagnifyingGlassIcon className="h-5 w-5" />
                      Buscar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Orders Table */}
            {searchTriggered && (
              <Card>
                <CardContent className="p-0">
                  {ordersQuery.isLoading ? (
                    <div className="p-12 text-center text-gray-500">
                      <div className="animate-spin h-8 w-8 border-4 border-[#3E667D] border-t-transparent rounded-full mx-auto mb-4" />
                      Buscando ventas...
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No se encontraron ventas sin facturar</p>
                      <p className="text-sm mt-1">
                        No hay ventas confirmadas sin factura para esta sucursal y fecha
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b">
                              <th className="px-4 py-3 text-left w-12">
                                <input
                                  type="checkbox"
                                  checked={allSelected}
                                  onChange={toggleSelectAll}
                                  className="rounded border-gray-300 text-[#3E667D] focus:ring-[#3E667D]"
                                />
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                ID Venta
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                Cliente
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                Método de Pago
                              </th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {orders.map((order) => (
                              <tr
                                key={order.id}
                                className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                                  selectedOrderIds.has(order.id) ? 'bg-[#3E667D]/5' : ''
                                }`}
                                onClick={() => toggleOrder(order.id)}
                              >
                                <td className="px-4 py-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedOrderIds.has(order.id)}
                                    onChange={() => toggleOrder(order.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="rounded border-gray-300 text-[#3E667D] focus:ring-[#3E667D]"
                                  />
                                </td>
                                <td className="px-4 py-3 text-sm font-medium">
                                  <a
                                    href={`/admin/pedidos/${order.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[#3E667D] hover:text-[#2d4f63] hover:underline"
                                  >
                                    {getOrderDisplay(order)}
                                  </a>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {getCustomerName(order)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {order.paymentMethodName || 'Sin definir'}
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                                  {formatCurrency(order.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer: Selection summary + Payment config + Submit */}
                      <div className="border-t bg-gray-50 p-4 space-y-4">
                        {/* Selection summary */}
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">
                            {orders.length} venta{orders.length !== 1 ? 's' : ''} encontrada{orders.length !== 1 ? 's' : ''}
                            {selectedOrderIds.size > 0 && (
                              <span className="font-semibold text-[#3E667D] ml-2">
                                — {selectedOrderIds.size} seleccionada{selectedOrderIds.size !== 1 ? 's' : ''}
                              </span>
                            )}
                          </p>
                          {selectedOrderIds.size > 0 && (
                            <p className="text-lg font-bold text-[#3E667D]">
                              Total: {formatCurrency(selectedTotal)}
                            </p>
                          )}
                        </div>

                        {/* Payment config + Submit */}
                        {selectedOrderIds.size > 0 && (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 pt-2 border-t border-gray-200">
                            {/* Forma de Pago SAT */}
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Forma de Pago (SAT)
                              </label>
                              <SearchableSelect
                                options={PAYMENT_FORMS.map((p) => ({
                                  value: p.Value,
                                  label: `${p.Value} - ${p.Name}`,
                                }))}
                                value={paymentForm}
                                onChange={setPaymentForm}
                                showAllOption={false}
                              />
                            </div>

                            {/* Método de Pago Facturama */}
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Método de Pago (Facturama)
                              </label>
                              <SearchableSelect
                                options={PAYMENT_METHODS_FACTURAMA.map((p) => ({
                                  value: p.value,
                                  label: p.label,
                                }))}
                                value={paymentMethodFact}
                                onChange={setPaymentMethodFact}
                                showAllOption={false}
                              />
                            </div>

                            {/* Submit */}
                            <div className="sm:flex-shrink-0">
                              <Button
                                variant="default"
                                onClick={handleSubmit}
                                disabled={createGlobalInvoice.isPending}
                                className="w-full sm:w-auto"
                              >
                                {createGlobalInvoice.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                                <GlobeAltIcon className="h-5 w-5" />
                                Enviar a Facturama
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
