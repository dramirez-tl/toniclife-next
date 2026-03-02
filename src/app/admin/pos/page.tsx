// app/admin/pos/page.tsx - Point of Sale main page
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.3 Módulo POS
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Bars3Icon,
  ClockIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  MapPinIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { PosProductSearch, PosCart, PaymentModal, SessionManager } from '@/components/pos';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { usePosCartStore } from '@/stores/pos-cart.store';
import { useActiveSession, useCreateSale, useProcessPayment, useSales } from '@/hooks/usePos';
import { useActiveBranches } from '@/hooks/useBranches';
import { useActiveCurrencies } from '@/hooks/useConfig';
import type { CreatePaymentInput, PosPaymentMethod } from '@/types/pos';
import type { Branch } from '@/types/branch';
import type { Currency } from '@/types/config';
import { toast } from 'sonner';
import { posService } from '@/services/pos.service';
import { generatePosTicketPdf } from '@/lib/generate-pos-ticket';
import { PermissionGuard } from '@/components/auth';
import { useSelector } from 'react-redux';
import { selectUserRoles } from '@/store/slices/authSlice';

export default function PosPage() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  const userRoles = useSelector(selectUserRoles);
  const isAdmin = userRoles.some((r) => r === 'super_admin' || r === 'admin');

  const { cart, clearCart } = usePosCartStore();
  const cartPriceTypeId = usePosCartStore((s) => s.cart.priceTypeId);
  const { data: activeSession, refetch: refetchSession } = useActiveSession();
  const createSale = useCreateSale();
  const processPayment = useProcessPayment();
  const { data: recentSales, refetch: refetchSales } = useSales({
    sessionId: activeSession?.session?.id,
    limit: 5,
  });

  // Fetch branches (POS-enabled only) and currencies
  const { data: allBranches } = useActiveBranches();
  const { data: currencies } = useActiveCurrencies();

  const posBranches = useMemo(
    () => (allBranches || []).filter((b: Branch) => b.isPosEnabled),
    [allBranches],
  );

  const branchOptions = useMemo(
    () => posBranches.map((b: Branch) => ({ value: b.id, label: b.name })),
    [posBranches],
  );

  // Build currency lookup: code → Currency
  const currencyMap = useMemo(() => {
    const map = new Map<string, Currency>();
    (currencies || []).forEach((c: Currency) => map.set(c.code, c));
    return map;
  }, [currencies]);

  // Auto-select first branch if none selected
  useEffect(() => {
    if (!selectedBranchId && posBranches.length > 0) {
      setSelectedBranchId(posBranches[0].id);
    }
  }, [selectedBranchId, posBranches]);

  // When session is active, lock branch to session's branch
  const activeBranchId = activeSession?.session?.branchId;
  const effectiveBranchId = activeBranchId || selectedBranchId;

  // Resolve currency from branch
  const selectedBranch = posBranches.find((b: Branch) => b.id === effectiveBranchId);
  const currencyCode = selectedBranch?.currencyCode || 'MXN';
  const currency = currencyMap.get(currencyCode);
  const currencySymbol = currency?.symbol || '$';
  const currencyId = currency?.id;

  const hasActiveSession = !!activeSession?.session;

  const handleCheckout = () => {
    if (!hasActiveSession) {
      toast.error('Debes abrir una sesión de caja primero');
      return;
    }
    if (cart.items.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }
    if (!cart.customerId) {
      toast.error('Debes seleccionar un distribuidor primero');
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = useCallback(
    async (payments: CreatePaymentInput[], change: number) => {
      if (!activeSession?.session) return;

      try {
        // Create sale
        const sale = await createSale.mutateAsync({
          sessionId: activeSession.session.id,
          customerId: cart.customerId,
          customerName: cart.customerName,
          customerRfc: cart.customerRfc,
          items: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            notes: item.notes,
          })),
          discountPercent: cart.discountPercent,
          discountAmount: cart.discountAmount,
          discountReason: cart.discountReason,
          requiresInvoice: cart.requiresInvoice,
          notes: cart.notes,
        });

        // Process payment
        await processPayment.mutateAsync({
          saleId: sale.id,
          payments: payments.map((p) => ({
            ...p,
            paymentMethod: p.paymentMethod as PosPaymentMethod,
          })),
        });

        // Fetch the full sale (with items and payments populated)
        const fullSale = await posService.getSaleById(sale.id);

        // Clear cart and refresh data
        clearCart();
        refetchSales();
        refetchSession();

        toast.success(`Venta ${sale.saleNumber} completada`);
        return fullSale;
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Error al procesar la venta');
        throw error; // Re-throw so PaymentModal knows the payment failed
      }
    },
    [activeSession, cart, createSale, processPayment, clearCart, refetchSales, refetchSession],
  );

  const formatCurrency = (amount: number) =>
    `${currencySymbol}${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <PermissionGuard permissions={['pos:read', 'pos:*']}>
      <div className="h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-3rem)] flex flex-col bg-gray-100">
        {/* Top Bar */}
        <header className="bg-[#3E667D] text-white px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors lg:hidden"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            <div>
              <h1 className="text-xl font-bold">Punto de Venta</h1>
              {activeSession?.cashRegister && (
                <p className="text-sm text-white/80">
                  {activeSession.cashRegister.name} • {activeSession.cashRegister.branchName}
                </p>
              )}
            </div>

            {/* Branch Selector (admin only, when no session) */}
            {isAdmin && !hasActiveSession && posBranches.length > 1 && (
              <div className="hidden sm:flex items-center gap-2 ml-4 w-80">
                <MapPinIcon className="h-5 w-5 text-white/60 flex-shrink-0" />
                <SearchableSelect
                  options={branchOptions}
                  value={selectedBranchId}
                  onChange={setSelectedBranchId}
                  placeholder="Buscar sucursal..."
                  showAllOption={false}
                  className="w-full"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Currency Badge - always visible */}
            <span className="px-3 py-1 bg-white/15 border border-white/25 rounded-full text-sm font-semibold tracking-wide">
              {currencyCode} {currencySymbol}
            </span>

            <div className="hidden sm:flex items-center gap-2 text-sm text-white/80">
              <ClockIcon className="h-5 w-5" />
              {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <a
              href="/admin"
              className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm font-medium"
            >
              Salir del POS
            </a>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-grow flex overflow-hidden">
          {/* Left Sidebar - Recent Sales (Desktop) */}
          <aside
            className={`
              ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
              lg:translate-x-0 lg:relative absolute inset-y-0 left-0 z-40
              w-72 bg-white border-r shadow-lg lg:shadow-none
              transition-transform duration-300 flex flex-col
            `}
          >
            <div className="p-4 border-b">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                Ventas Recientes
              </h2>
            </div>
            <div className="flex-grow p-4 space-y-3 overflow-y-auto">
              {recentSales?.data && recentSales.data.length > 0 ? (
                recentSales.data.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3 bg-gray-50 rounded-lg border hover:bg-gray-100"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{sale.saleNumber}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          sale.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : sale.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {sale.status === 'completed'
                          ? 'Completada'
                          : sale.status === 'cancelled'
                            ? 'Cancelada'
                            : 'Pendiente'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(sale.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}{' '}
                      {new Date(sale.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <div>
                        <p className="text-sm text-gray-600">{sale.itemsCount || sale.items.length} productos</p>
                        <p className="font-bold text-[#3E667D]">{formatCurrency(sale.total)}</p>
                      </div>
                      {sale.status === 'completed' && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const fullSale = await posService.getSaleById(sale.id);
                              const url = await generatePosTicketPdf(fullSale, {
                                branch: selectedBranch ? {
                                  ticketName: selectedBranch.ticketName,
                                  ticketAddress: selectedBranch.ticketAddress,
                                  ticketHeader: selectedBranch.ticketHeader,
                                  ticketFooter: selectedBranch.ticketFooter,
                                  addressPhone: selectedBranch.addressPhone,
                                } : undefined,
                              });
                              window.open(url, '_blank');
                            } catch {
                              toast.error('Error al generar ticket');
                            }
                          }}
                          title="Imprimir ticket"
                          className="p-2 text-gray-400 hover:text-[#3E667D] hover:bg-white rounded-lg transition-colors"
                        >
                          <PrinterIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No hay ventas recientes
                </p>
              )}
            </div>
            <div className="flex-shrink-0 p-4 border-t bg-white">
              <button
                onClick={() => refetchSales()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Actualizar
              </button>
            </div>
          </aside>

          {/* Overlay for mobile sidebar */}
          {showSidebar && (
            <div
              className="fixed inset-0 bg-black/50 z-30 lg:hidden"
              onClick={() => setShowSidebar(false)}
            />
          )}

          {/* Center - Product Search */}
          <main className="flex-grow flex flex-col p-4 overflow-hidden">
            {/* Mobile branch selector */}
            {isAdmin && !hasActiveSession && posBranches.length > 1 && (
              <div className="sm:hidden mb-3 flex items-center gap-2">
                <MapPinIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <SearchableSelect
                  options={branchOptions}
                  value={selectedBranchId}
                  onChange={setSelectedBranchId}
                  placeholder="Buscar sucursal..."
                  showAllOption={false}
                  className="flex-1"
                />
              </div>
            )}

            {/* Session Manager */}
            <div className="mb-4">
              <SessionManager
                branchId={effectiveBranchId}
                currencyId={currencyId}
                currencySymbol={currencySymbol}
                currencyCode={currencyCode}
                onSessionChange={() => {
                  refetchSession();
                  refetchSales();
                }}
              />
            </div>

            {/* Product Search */}
            {hasActiveSession ? (
              <div className="flex-grow flex flex-col">
                <div className="mb-4">
                  <PosProductSearch autoFocus branchId={effectiveBranchId} priceTypeId={cartPriceTypeId} />
                </div>

                {/* Quick Actions / Numpad could go here */}
                <div className="flex-grow grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-y-auto">
                  <div className="col-span-full flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <CurrencyDollarIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>Busca productos por nombre o escanea el código de barras</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <CurrencyDollarIcon className="h-24 w-24 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Abre una sesión de caja para comenzar a vender</p>
                </div>
              </div>
            )}
          </main>

          {/* Right - Cart */}
          <aside className="w-96 flex-shrink-0 p-4 hidden md:flex md:flex-col">
            <PosCart
              onCheckout={handleCheckout}
              disabled={!hasActiveSession}
              currencySymbol={currencySymbol}
            />
          </aside>
        </div>

        {/* Mobile Cart Button */}
        <div className="md:hidden fixed bottom-4 right-4 z-30">
          <button
            onClick={handleCheckout}
            disabled={!hasActiveSession || cart.items.length === 0 || !cart.customerId}
            className="flex items-center gap-2 px-6 py-4 bg-[#3E667D] text-white rounded-full shadow-lg hover:bg-[#2d4f63] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="font-bold">{cart.customerId ? `Cobrar ${formatCurrency(cart.total)}` : 'Seleccione distribuidor'}</span>
            {cart.items.length > 0 && (
              <span className="bg-white text-[#3E667D] px-2 py-0.5 rounded-full text-sm font-bold">
                {cart.items.length}
              </span>
            )}
          </button>
        </div>

        {/* Payment Modal */}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          total={cart.total}
          onPaymentComplete={handlePaymentComplete}
          currencySymbol={currencySymbol}
          branchConfig={selectedBranch ? {
            ticketName: selectedBranch.ticketName,
            ticketAddress: selectedBranch.ticketAddress,
            ticketHeader: selectedBranch.ticketHeader,
            ticketFooter: selectedBranch.ticketFooter,
            addressPhone: selectedBranch.addressPhone,
          } : undefined}
        />
      </div>
    </PermissionGuard>
  );
}
