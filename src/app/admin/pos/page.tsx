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
  UserGroupIcon,
  UserIcon,
  ArrowsRightLeftIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { PosProductSearch, PosCart, PaymentModal, SessionManager } from '@/components/pos';
import { PosCustomerSelector } from '@/components/pos/PosCustomerSelector';
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
import { selectUser, selectUserRoles } from '@/store/slices/authSlice';

export default function PosPage() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const today = new Date().toISOString().slice(0, 10);
  const [salesDate, setSalesDate] = useState<string>(today);
  const [appliedSalesDate, setAppliedSalesDate] = useState<string>(today);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);

  const user = useSelector(selectUser);
  const userRoles = useSelector(selectUserRoles);
  const isAdmin = userRoles.some((r) => r === 'super_admin' || r === 'admin' || r === 'call_center');
  const userDefaultBranchId = user?.defaultBranchId;

  const { cart, clearCart } = usePosCartStore();
  const cartPriceTypeId = usePosCartStore((s) => s.cart.priceTypeId);
  const sessionBranchId = selectedBranchId || userDefaultBranchId;
  const { data: activeSession, refetch: refetchSession } = useActiveSession(sessionBranchId);
  const createSale = useCreateSale();
  const processPayment = useProcessPayment();

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

  // Auto-select branch: user's default branch (non-admin) or first available
  useEffect(() => {
    if (!selectedBranchId && posBranches.length > 0) {
      if (userDefaultBranchId && posBranches.some((b: Branch) => b.id === userDefaultBranchId)) {
        setSelectedBranchId(userDefaultBranchId);
      } else {
        setSelectedBranchId(posBranches[0].id);
      }
    }
  }, [selectedBranchId, posBranches, userDefaultBranchId]);

  // When session is active, lock branch to session's branch
  // Call center and super_admin only observe — never locked to a remote session
  const canSwitchFreely = userRoles.includes('call_center') || userRoles.includes('super_admin');
  const activeBranchId = canSwitchFreely ? undefined : activeSession?.session?.branchId;
  const effectiveBranchId = activeBranchId || selectedBranchId;

  // Recent sales — filtered by branch and date
  const { data: recentSales, refetch: refetchSales, isLoading: isLoadingSales, isFetching: isFetchingSales } = useSales({
    branchId: effectiveBranchId || undefined,
    fromDate: appliedSalesDate || undefined,
    toDate: appliedSalesDate || undefined,
    limit: 50,
  });

  // Resolve currency from branch
  const selectedBranch = posBranches.find((b: Branch) => b.id === effectiveBranchId);
  const currencyCode = selectedBranch?.currencyCode || 'MXN';
  const currency = currencyMap.get(currencyCode);
  const currencySymbol = currency?.symbol || '$';
  const currencyId = currency?.id;
  const branchCountryId = selectedBranch?.countryId;

  const hasActiveSession = !!activeSession?.session;
  // canSwitchFreely users are read-only when:
  // - viewing a session opened by someone else, OR
  // - viewing a branch with no session that isn't their default branch
  const isOwnSession = hasActiveSession && activeSession?.session?.openedBy === user?.id;
  const isObserving = canSwitchFreely && !isOwnSession && (hasActiveSession || effectiveBranchId !== userDefaultBranchId);

  const handleCheckout = () => {
    if (!hasActiveSession) {
      toast.error('Debes abrir una sesión de caja primero');
      return;
    }
    if (cart.items.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }
    if (!cart.customerId && !cart.isPublicPrice) {
      toast.error('Debes seleccionar un distribuidor o activar precio público');
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

            {/* Branch Selector (admin: editable / non-admin with default branch: locked) */}
            {/* Call center can always switch — they only observe remote sessions */}
            {(!hasActiveSession || canSwitchFreely) && (
              isAdmin && posBranches.length > 1 ? (
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
              ) : selectedBranch ? (
                <div className="hidden sm:flex items-center gap-2 ml-4">
                  <MapPinIcon className="h-5 w-5 text-white/60 flex-shrink-0" />
                  <span className="px-3 py-1.5 bg-white/15 border border-white/25 rounded-lg text-sm font-medium">
                    {selectedBranch.name}
                  </span>
                </div>
              ) : null
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
            <div className="p-4 border-b space-y-2">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                Ventas Recientes
              </h2>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={salesDate}
                  onChange={(e) => setSalesDate(e.target.value)}
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#3E667D] focus:border-[#3E667D] outline-none"
                />
                <button
                  onClick={() => setAppliedSalesDate(salesDate)}
                  disabled={salesDate === appliedSalesDate}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-[#3E667D] rounded-lg hover:bg-[#2d4f63] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  Buscar
                </button>
              </div>
            </div>
            <div className="flex-grow p-4 space-y-3 overflow-y-auto">
              {(isLoadingSales || isFetchingSales) ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3E667D] mb-2" />
                  <p className="text-xs text-gray-400">Cargando ventas...</p>
                </div>
              ) : recentSales?.data && recentSales.data.length > 0 ? (
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
                            setIsLoadingTicket(true);
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
                              setTicketUrl(url);
                            } catch {
                              toast.error('Error al generar ticket');
                            } finally {
                              setIsLoadingTicket(false);
                            }
                          }}
                          disabled={isLoadingTicket}
                          title="Ver ticket"
                          className="p-2 text-gray-400 hover:text-[#3E667D] hover:bg-white rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isLoadingTicket ? (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-[#3E667D]" />
                          ) : (
                            <PrinterIcon className="h-5 w-5" />
                          )}
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
            <div className="flex-shrink-0 p-4 border-t bg-white space-y-2">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <InformationCircleIcon className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  Módulo de facturación pendiente de liberar.
                </p>
              </div>
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
            {isAdmin && (!hasActiveSession || canSwitchFreely) && posBranches.length > 1 && (
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
            {!isAdmin && !hasActiveSession && selectedBranch && (
              <div className="sm:hidden mb-3 flex items-center gap-2">
                <MapPinIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <span className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                  {selectedBranch.name}
                </span>
              </div>
            )}

            {/* Session Manager */}
            <div className="mb-4">
              <SessionManager
                branchId={effectiveBranchId}
                currencyId={currencyId}
                currencySymbol={currencySymbol}
                currencyCode={currencyCode}
                readOnly={isObserving}
                onSessionChange={() => {
                  refetchSession();
                  refetchSales();
                  // Clear cart and remove selected distributor when session closes
                  const store = usePosCartStore.getState();
                  store.clearCart();
                  store.setCustomer(undefined, undefined, undefined, undefined);
                  store.setPublicPrice(false);
                }}
              />
            </div>

            {/* Two-step flow: 1) Select distributor or public price → 2) Search products */}
            {hasActiveSession ? (
              (cart.customerId || cart.isPublicPrice) ? (
                /* STEP 2: Ready to sell → Product search */
                <div className="flex-grow flex flex-col">
                  {/* Customer/Public badge */}
                  <div className="mb-3 flex items-center gap-3 px-4 py-2.5 bg-[#C8DDF2]/30 border border-[#3E667D]/20 rounded-xl">
                    {cart.isPublicPrice ? (
                      <>
                        <CurrencyDollarIcon className="h-5 w-5 text-amber-600 flex-shrink-0" />
                        <div className="flex-grow min-w-0">
                          <p className="text-sm font-semibold text-amber-700">Precio Público</p>
                          <p className="text-xs text-gray-500">Venta sin distribuidor</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <UserIcon className="h-5 w-5 text-[#3E667D] flex-shrink-0" />
                        <div className="flex-grow min-w-0">
                          <p className="text-sm font-semibold text-[#3E667D] truncate">{cart.customerName}</p>
                          {cart.customerRfc && (
                            <p className="text-xs text-gray-500">RFC: {cart.customerRfc}</p>
                          )}
                        </div>
                      </>
                    )}
                    <button
                      onClick={() => {
                        const store = usePosCartStore.getState();
                        store.clearCart();
                        store.setCustomer(undefined, undefined, undefined, undefined);
                        store.setPublicPrice(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#3E667D] bg-white border border-[#3E667D]/20 rounded-lg hover:bg-[#3E667D]/10 transition-colors"
                    >
                      <ArrowsRightLeftIcon className="h-3.5 w-3.5" />
                      Cambiar
                    </button>
                  </div>

                  <div className="mb-4">
                    <PosProductSearch autoFocus branchId={effectiveBranchId} priceTypeId={cartPriceTypeId} countryId={branchCountryId} />
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
                /* STEP 1: Select distributor or public price */
                <div className="flex-grow flex items-center justify-center">
                  <div className="w-full max-w-md text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-[#C8DDF2]/30 rounded-full flex items-center justify-center">
                      <UserGroupIcon className="h-10 w-10 text-[#3E667D]/60" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      Selecciona un Distribuidor
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                      Llena al menos un campo y presiona buscar
                    </p>
                    <PosCustomerSelector prominent countryId={branchCountryId} />

                    {/* Public price divider and switch */}
                    <div className="mt-6 flex items-center gap-3">
                      <div className="flex-grow border-t border-gray-200" />
                      <span className="text-xs text-gray-400 uppercase tracking-wider">o</span>
                      <div className="flex-grow border-t border-gray-200" />
                    </div>
                    <button
                      onClick={() => usePosCartStore.getState().setPublicPrice(true)}
                      className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 border-2 border-amber-200 rounded-xl text-amber-700 font-medium hover:bg-amber-100 hover:border-amber-300 transition-colors"
                    >
                      <CurrencyDollarIcon className="h-5 w-5" />
                      Vender a Precio Público
                    </button>
                  </div>
                </div>
              )
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
              currencyCode={currencyCode}
            />
          </aside>
        </div>

        {/* Mobile Cart Button */}
        <div className="md:hidden fixed bottom-4 right-4 z-30">
          <button
            onClick={handleCheckout}
            disabled={!hasActiveSession || cart.items.length === 0 || (!cart.customerId && !cart.isPublicPrice)}
            className="flex items-center gap-2 px-6 py-4 bg-[#3E667D] text-white rounded-full shadow-lg hover:bg-[#2d4f63] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="font-bold">{cart.customerId || cart.isPublicPrice ? `Cobrar ${formatCurrency(cart.total)}` : 'Seleccione distribuidor'}</span>
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

        {/* Ticket Preview Modal */}
        {ticketUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl flex flex-col w-[95vw] max-w-md h-[90vh] max-h-[700px]">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-900">Vista previa del ticket</h3>
                <button
                  onClick={() => { URL.revokeObjectURL(ticketUrl); setTicketUrl(null); }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-grow overflow-hidden">
                <iframe
                  src={ticketUrl}
                  className="w-full h-full border-0"
                  title="Ticket de venta"
                />
              </div>
              <div className="flex items-center gap-2 px-4 py-3 border-t">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = ticketUrl;
                    link.download = 'ticket.pdf';
                    link.click();
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-[#3E667D] border border-[#3E667D] rounded-lg hover:bg-[#3E667D]/5 transition-colors"
                >
                  Descargar
                </button>
                <button
                  onClick={() => {
                    const win = window.open(ticketUrl, '_blank');
                    win?.print();
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#3E667D] rounded-lg hover:bg-[#2d4f63] transition-colors flex items-center justify-center gap-2"
                >
                  <PrinterIcon className="h-4 w-4" />
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
