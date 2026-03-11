// app/admin/pos/page.tsx - Point of Sale main page
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.3 Módulo POS
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

  XMarkIcon,
} from '@heroicons/react/24/outline';
import { PosCart, PaymentModal, PosProductGrid } from '@/components/pos';
import { PosCustomerSelector } from '@/components/pos/PosCustomerSelector';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { usePosCartStore } from '@/stores/pos-cart.store';
import { useActiveSession, useCreateSale, useProcessPayment, useSales } from '@/hooks/usePos';
import { useActiveBranches } from '@/hooks/useBranches';
import { useActiveCurrencies } from '@/hooks/useConfig';
import type { CreatePaymentInput, PosPaymentMethod, Sale } from '@/types/pos';
import type { Branch } from '@/types/branch';
import type { Currency } from '@/types/config';
import type { FiscalData } from '@/types/billing';
import { FISCAL_REGIMES, CFDI_USES } from '@/types/billing';
import { toast } from 'sonner';
import { posService } from '@/services/pos.service';
import { billingService } from '@/services/billing.service';
import { generatePosTicketPdf } from '@/lib/generate-pos-ticket';
import { PermissionGuard } from '@/components/auth';
import { useSelector } from 'react-redux';
import { selectUser, selectUserRoles } from '@/store/slices/authSlice';

const fiscalRegimeOptions = FISCAL_REGIMES.map((r) => ({ value: r.Value, label: `${r.Value} - ${r.Name}` }));
const cfdiUseOptions = CFDI_USES.map((u) => ({ value: u.Value, label: `${u.Value} - ${u.Name}` }));

export default function PosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(searchParams.get('branch') ?? '');
  const today = new Date().toISOString().slice(0, 10);
  const [salesDate, setSalesDate] = useState<string>(today);
  const [appliedSalesDate, setAppliedSalesDate] = useState<string>(today);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);

  // Fiscal edit modal for stamp retry
  const [stampRetrySale, setStampRetrySale] = useState<Sale | null>(null);
  const [stampRetryError, setStampRetryError] = useState('');
  const [stampRetryErrorDetail, setStampRetryErrorDetail] = useState('');
  const [stampRetryFiscal, setStampRetryFiscal] = useState<FiscalData | null>(null);
  const [stampRetryForm, setStampRetryForm] = useState({ rfc: '', legalName: '', fiscalRegime: '', postalCode: '', cfdiUse: 'G03', email: '' });
  const [stampRetryErrors, setStampRetryErrors] = useState<Record<string, string>>({});
  const [stampRetryLoading, setStampRetryLoading] = useState(false);
  const [stampRetrySaving, setStampRetrySaving] = useState(false);

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
      const autoId = (userDefaultBranchId && posBranches.some((b: Branch) => b.id === userDefaultBranchId))
        ? userDefaultBranchId
        : posBranches[0].id;
      setSelectedBranchId(autoId);
      const params = new URLSearchParams(searchParams.toString());
      params.set('branch', autoId);
      router.replace(`/admin/pos?${params.toString()}`);
    }
  }, [selectedBranchId, posBranches, userDefaultBranchId, router, searchParams]);

  const effectiveBranchId = selectedBranchId;

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

  const handleBranchChange = (branchId: string) => {
    if (branchId !== selectedBranchId) {
      clearCart();
      setSelectedBranchId(branchId);
      const params = new URLSearchParams(searchParams.toString());
      params.set('branch', branchId);
      router.replace(`/admin/pos?${params.toString()}`);
    }
  };

  const handleCheckout = () => {
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

  // Auto-open a session if none exists, then create the sale
  const ensureSession = useCallback(async (): Promise<string> => {
    // If there's already an active session for this branch, use it
    if (activeSession?.session) return activeSession.session.id;

    // Find first available register for this branch
    const registers = await posService.getAvailableRegisters(effectiveBranchId);
    const closedRegister = registers.find((r) => r.status === 'closed') || registers[0];
    if (!closedRegister) {
      throw new Error('No hay cajas registradoras disponibles en esta sucursal');
    }

    // Auto-open session with $0
    const session = await posService.openSession({
      cashRegisterId: closedRegister.id,
      openingAmount: 0,
      openingNotes: 'Apertura automática',
      currencyId: currencyId || undefined,
    });

    await refetchSession();
    return session.id;
  }, [activeSession, effectiveBranchId, currencyId, refetchSession]);

  const handlePaymentComplete = useCallback(
    async (payments: CreatePaymentInput[], change: number, requiresInvoice = false) => {
      try {
        const sessionId = await ensureSession();

        // Create sale
        const sale = await createSale.mutateAsync({
          sessionId,
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
          requiresInvoice,
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
        throw error;
      }
    },
    [ensureSession, cart, createSale, processPayment, clearCart, refetchSales, refetchSession],
  );

  const extractStampError = (err: any): { short: string; detail: string } => {
    const data = err?.response?.data;
    if (!data) return { short: err?.message || 'Error desconocido', detail: '' };
    const rawMsg = Array.isArray(data.message) ? data.message.join(', ') : (data.message || '');
    const isGeneric = !rawMsg || rawMsg.toLowerCase() === 'internal server error';
    const short = isGeneric
      ? `Error del servidor (HTTP ${err?.response?.status ?? '?'})`
      : rawMsg;
    const candidates = [data.details, data.cause, data.facturama, data.description, data.reason]
      .filter((v) => typeof v === 'string' && v.length > 0);
    if (isGeneric && rawMsg) candidates.unshift(rawMsg);
    return { short, detail: candidates.join(' · ') };
  };

  // Open fiscal edit modal when stamp fails
  const openStampRetryModal = async (sale: Sale, errorMsg: string, errorDetail = '') => {
    setStampRetrySale(sale);
    setStampRetryError(errorMsg);
    setStampRetryErrorDetail(errorDetail);
    setStampRetryErrors({});
    setStampRetryFiscal(null);
    setStampRetryLoading(true);
    try {
      if (sale.customerId) {
        const data = await billingService.getFiscalDataByCustomer(sale.customerId);
        const defaultRecord = data.find((d) => d.isDefault) || data[0];
        if (defaultRecord) {
          setStampRetryFiscal(defaultRecord);
          setStampRetryForm({
            rfc: defaultRecord.rfc || '',
            legalName: defaultRecord.legalName || '',
            fiscalRegime: defaultRecord.taxRegime || '',
            postalCode: defaultRecord.postalCode || '',
            cfdiUse: defaultRecord.defaultCfdiUse || 'G03',
            email: defaultRecord.email || '',
          });
        } else {
          setStampRetryFiscal(null);
          setStampRetryForm({ rfc: '', legalName: '', fiscalRegime: '', postalCode: '', cfdiUse: 'G03', email: '' });
        }
      }
    } catch {
      setStampRetryFiscal(null);
      setStampRetryForm({ rfc: '', legalName: '', fiscalRegime: '', postalCode: '', cfdiUse: 'G03', email: '' });
    } finally {
      setStampRetryLoading(false);
    }
  };

  const handleStampRetrySave = async () => {
    if (!stampRetrySale?.customerId) return;
    const { rfc, legalName, fiscalRegime, postalCode, cfdiUse, email } = stampRetryForm;

    // Basic validation
    const errs: Record<string, string> = {};
    if (!rfc) errs.rfc = 'RFC es obligatorio';
    if (!legalName) errs.legalName = 'Razón Social es obligatoria';
    if (!fiscalRegime) errs.fiscalRegime = 'Régimen Fiscal es obligatorio';
    if (!postalCode) errs.postalCode = 'Código Postal es obligatorio';
    if (Object.keys(errs).length > 0) { setStampRetryErrors(errs); return; }

    setStampRetrySaving(true);
    setStampRetryErrors({});
    try {
      // Validate with SAT
      const validation = await billingService.validateFiscalData({ rfc, legalName, fiscalRegime, postalCode, cfdiUse, email });
      if (!validation.valid) { setStampRetryErrors(validation.errors); setStampRetrySaving(false); return; }
    } catch {
      // If validation endpoint fails, continue
    }

    try {
      // Save fiscal data
      if (stampRetryFiscal?.id) {
        await billingService.updateFiscalData(stampRetryFiscal.id, { rfc, legalName, fiscalRegime, postalCode, cfdiUse, email });
      } else {
        const created = await billingService.createFiscalData({ customerId: stampRetrySale.customerId, rfc, legalName, fiscalRegime, postalCode, cfdiUse, email });
        setStampRetryFiscal(created);
      }

      // Retry stamp
      await posService.stampSale(stampRetrySale.id);
      toast.success('Datos actualizados y factura timbrada exitosamente');
      setStampRetrySale(null);
      refetchSales();
    } catch (err: any) {
      const { short, detail } = extractStampError(err);
      setStampRetryError(short);
      setStampRetryErrorDetail(detail);
      toast.error(short);
    } finally {
      setStampRetrySaving(false);
    }
  };

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
              <p className="text-sm text-white/80">
                {selectedBranch?.name || 'Sin sucursal'}
                {' • '}
                {recentSales?.data
                  ? `${recentSales.data.length} venta${recentSales.data.length !== 1 ? 's' : ''} hoy • ${formatCurrency(recentSales.data.reduce((sum, s) => sum + s.total, 0))}`
                  : '0 ventas hoy'}
              </p>
            </div>

            {/* Branch Selector (admin: editable / non-admin: locked) */}
            {isAdmin && posBranches.length > 1 && (
              <div className="hidden sm:flex items-center gap-2 ml-4 w-80">
                <MapPinIcon className="h-5 w-5 text-white/60 flex-shrink-0" />
                <SearchableSelect
                  options={branchOptions}
                  value={selectedBranchId}
                  onChange={handleBranchChange}
                  placeholder="Buscar sucursal..."
                  showAllOption={false}
                  className="w-full"
                />
              </div>
            )}
            {!isAdmin && selectedBranch && (
              <div className="hidden sm:flex items-center gap-2 ml-4">
                <MapPinIcon className="h-5 w-5 text-white/60 flex-shrink-0" />
                <span className="px-3 py-1.5 bg-white/15 border border-white/25 rounded-lg text-sm font-medium">
                  {selectedBranch.name}
                </span>
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
                      <span className="font-medium text-sm truncate mr-1">{sale.saleNumber}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {sale.requiresInvoice && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            sale.invoiceUuid
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {sale.invoiceUuid ? 'Timbrada' : 'Factura'}
                          </span>
                        )}
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
                        <div className="flex items-center gap-1">
                          {/* Stamp button — only for sales that need invoice and aren't stamped yet */}
                          {sale.requiresInvoice && !sale.invoiceUuid && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await posService.stampSale(sale.id);
                                  toast.success(`Factura timbrada y enviada por correo`);
                                  refetchSales();
                                } catch (err: any) {
                                  const { short, detail } = extractStampError(err);
                                  toast.error(short);
                                  if (sale.customerId) {
                                    openStampRetryModal(sale, short, detail);
                                  }
                                }
                              }}
                              title="Timbrar factura"
                              className="p-2 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                            >
                              <DocumentTextIcon className="h-5 w-5" />
                            </button>
                          )}
                          {/* Print ticket button */}
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
                        </div>
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
            {isAdmin && posBranches.length > 1 && (
              <div className="sm:hidden mb-3 flex items-center gap-2">
                <MapPinIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <SearchableSelect
                  options={branchOptions}
                  value={selectedBranchId}
                  onChange={handleBranchChange}
                  placeholder="Buscar sucursal..."
                  showAllOption={false}
                  className="flex-1"
                />
              </div>
            )}
            {!isAdmin && selectedBranch && (
              <div className="sm:hidden mb-3 flex items-center gap-2">
                <MapPinIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <span className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                  {selectedBranch.name}
                </span>
              </div>
            )}

            {/* Two-step flow: 1) Select distributor or public price → 2) Search products */}
            {(cart.customerId || cart.isPublicPrice) ? (
                /* STEP 2: Ready to sell → Product search */
                <div className="flex-grow flex flex-col min-h-0 overflow-hidden">
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

                  {/* Product catalog grid */}
                  <div className="flex-grow min-h-0">
                    <PosProductGrid branchId={effectiveBranchId} priceTypeId={cartPriceTypeId} countryId={branchCountryId} currencySymbol={currencySymbol} currencyCode={currencyCode} />
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
            }
          </main>

          {/* Right - Cart */}
          <aside className="w-96 flex-shrink-0 p-4 hidden md:flex md:flex-col">
            <PosCart
              onCheckout={handleCheckout}
              disabled={false}
              currencySymbol={currencySymbol}
              currencyCode={currencyCode}
            />
          </aside>
        </div>

        {/* Mobile Cart Button */}
        <div className="md:hidden fixed bottom-4 right-4 z-30">
          <button
            onClick={handleCheckout}
            disabled={cart.items.length === 0 || (!cart.customerId && !cart.isPublicPrice)}
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
          customerId={cart.customerId}
          onPaymentComplete={handlePaymentComplete}
          currencySymbol={currencySymbol}
          branchConfig={selectedBranch ? {
            ticketName: selectedBranch.ticketName,
            ticketAddress: selectedBranch.ticketAddress,
            ticketHeader: selectedBranch.ticketHeader,
            ticketFooter: selectedBranch.ticketFooter,
            addressPhone: selectedBranch.addressPhone,
          } : undefined}
          branchName={selectedBranch?.name}
          branchCountryName={selectedBranch?.countryName}
          branchCountryId={selectedBranch?.countryId}
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

        {/* Stamp Retry — Edit Fiscal Data Modal */}
        {stampRetrySale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div>
                  <h3 className="font-semibold text-gray-900">Corregir datos fiscales</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Venta {stampRetrySale.saleNumber}</p>
                </div>
                <button
                  onClick={() => setStampRetrySale(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Error message */}
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                  <p className="text-sm text-red-700 font-medium">Error al timbrar:</p>
                  <p className="text-sm text-red-600">{stampRetryError}</p>
                  {stampRetryErrorDetail && (
                    <p className="text-xs text-red-500 font-mono break-words">{stampRetryErrorDetail}</p>
                  )}
                </div>

                {stampRetryLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3E667D]" />
                  </div>
                ) : (
                  <>
                    {/* RFC */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">RFC *</label>
                      <input
                        value={stampRetryForm.rfc}
                        onChange={(e) => { setStampRetryForm((p) => ({ ...p, rfc: e.target.value.toUpperCase() })); setStampRetryErrors((p) => { const n = { ...p }; delete n.rfc; return n; }); }}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${stampRetryErrors.rfc ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                        placeholder="XAXX010101000"
                        maxLength={13}
                      />
                      {stampRetryErrors.rfc && <p className="text-xs text-red-500 mt-1">{stampRetryErrors.rfc}</p>}
                    </div>

                    {/* Legal Name */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Razón Social *</label>
                      <input
                        value={stampRetryForm.legalName}
                        onChange={(e) => { setStampRetryForm((p) => ({ ...p, legalName: e.target.value.toUpperCase() })); setStampRetryErrors((p) => { const n = { ...p }; delete n.legalName; return n; }); }}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${stampRetryErrors.legalName ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                        placeholder="NOMBRE COMPLETO O RAZÓN SOCIAL"
                      />
                      {stampRetryErrors.legalName && <p className="text-xs text-red-500 mt-1">{stampRetryErrors.legalName}</p>}
                    </div>

                    {/* Fiscal Regime */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Régimen Fiscal *</label>
                      <SearchableSelect
                        options={fiscalRegimeOptions}
                        value={stampRetryForm.fiscalRegime}
                        onChange={(v) => { setStampRetryForm((p) => ({ ...p, fiscalRegime: v })); setStampRetryErrors((p) => { const n = { ...p }; delete n.fiscalRegime; return n; }); }}
                        placeholder="Seleccionar régimen..."
                        showAllOption={false}
                      />
                      {stampRetryErrors.fiscalRegime && <p className="text-xs text-red-500 mt-1">{stampRetryErrors.fiscalRegime}</p>}
                    </div>

                    {/* Postal Code */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Código Postal *</label>
                      <input
                        value={stampRetryForm.postalCode}
                        onChange={(e) => { setStampRetryForm((p) => ({ ...p, postalCode: e.target.value.replace(/\D/g, '') })); setStampRetryErrors((p) => { const n = { ...p }; delete n.postalCode; return n; }); }}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${stampRetryErrors.postalCode ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                        placeholder="00000"
                        maxLength={5}
                      />
                      {stampRetryErrors.postalCode && <p className="text-xs text-red-500 mt-1">{stampRetryErrors.postalCode}</p>}
                    </div>

                    {/* CFDI Use */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Uso de CFDI</label>
                      <SearchableSelect
                        options={cfdiUseOptions}
                        value={stampRetryForm.cfdiUse}
                        onChange={(v) => setStampRetryForm((p) => ({ ...p, cfdiUse: v }))}
                        placeholder="Seleccionar uso..."
                        showAllOption={false}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email para factura</label>
                      <input
                        value={stampRetryForm.email}
                        onChange={(e) => setStampRetryForm((p) => ({ ...p, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="correo@ejemplo.com"
                        type="email"
                      />
                    </div>

                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
                      La correspondencia RFC ↔ Razón Social se valida por el SAT al timbrar. Asegúrate de que coincidan exactamente.
                    </p>
                  </>
                )}
              </div>

              {/* Footer */}
              {!stampRetryLoading && (
                <div className="flex items-center gap-3 px-5 py-4 border-t">
                  <button
                    onClick={() => setStampRetrySale(null)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleStampRetrySave}
                    disabled={stampRetrySaving}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#3E667D] rounded-lg hover:bg-[#2d4f63] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {stampRetrySaving ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Timbrando...
                      </>
                    ) : (
                      <>
                        <DocumentTextIcon className="h-4 w-4" />
                        Guardar y Timbrar
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
