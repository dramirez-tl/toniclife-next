// app/admin/pos/page.tsx - Point of Sale main page
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.3 Módulo POS
'use client';

import { useState, useCallback } from 'react';
import {
  Bars3Icon,
  ClockIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { PosProductSearch, PosCart, PaymentModal, SessionManager } from '@/components/pos';
import { usePosCartStore } from '@/stores/pos-cart.store';
import { useActiveSession, useCreateSale, useProcessPayment, useSales } from '@/hooks/usePos';
import type { CreatePaymentInput, PosPaymentMethod } from '@/types/pos';
import { toast } from 'sonner';
import { posService } from '@/services/pos.service';
import { PermissionGuard } from '@/components/auth';

export default function PosPage() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const { cart, clearCart } = usePosCartStore();
  const { data: activeSession, refetch: refetchSession } = useActiveSession();
  const createSale = useCreateSale();
  const processPayment = useProcessPayment();
  const { data: recentSales, refetch: refetchSales } = useSales({
    sessionId: activeSession?.session?.id,
    limit: 5,
  });

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
            // Map to correct payment method
            paymentMethod: p.paymentMethod as PosPaymentMethod,
          })),
        });

        // Clear cart and refresh data
        clearCart();
        refetchSales();
        refetchSession();

        toast.success(`Venta ${sale.saleNumber} completada`);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Error al procesar la venta');
      }
    },
    [activeSession, cart, createSale, processPayment, clearCart, refetchSales, refetchSession]
  );

  return (
    <PermissionGuard permissions={['pos:read', 'pos:*']}>
    <div className="h-screen flex flex-col bg-gray-100">
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
        </div>

        <div className="flex items-center gap-4">
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
            transition-transform duration-300
          `}
        >
          <div className="p-4 border-b">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-gray-500" />
              Ventas Recientes
            </h2>
          </div>
          <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-200px)]">
            {recentSales?.data && recentSales.data.length > 0 ? (
              recentSales.data.map((sale) => (
                <div
                  key={sale.id}
                  className="p-3 bg-gray-50 rounded-lg border cursor-pointer hover:bg-gray-100"
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
                  <p className="text-sm text-gray-600">
                    {sale.items.length} productos
                  </p>
                  <p className="font-bold text-[#3E667D]">
                    {posService.formatCurrency(sale.total)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay ventas recientes
              </p>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
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
          {/* Session Manager */}
          <div className="mb-4">
            <SessionManager
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
                <PosProductSearch autoFocus />
              </div>

              {/* Quick Actions / Numpad could go here */}
              <div className="flex-grow grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-y-auto">
                {/* Category quick buttons or featured products could be displayed here */}
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
        <aside className="w-96 flex-shrink-0 p-4 hidden md:block">
          <PosCart onCheckout={handleCheckout} disabled={!hasActiveSession} />
        </aside>
      </div>

      {/* Mobile Cart Button */}
      <div className="md:hidden fixed bottom-4 right-4 z-30">
        <button
          onClick={handleCheckout}
          disabled={!hasActiveSession || cart.items.length === 0}
          className="flex items-center gap-2 px-6 py-4 bg-[#3E667D] text-white rounded-full shadow-lg hover:bg-[#6aa526] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="font-bold">
            Cobrar {posService.formatCurrency(cart.total)}
          </span>
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
      />
    </div>
    </PermissionGuard>
  );
}
