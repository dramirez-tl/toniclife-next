// app/admin/pos/page.tsx - Point of Sale main page
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.3 Módulo POS
'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  NoSymbolIcon,
  EyeIcon,
  ChartBarIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { PosCart, PaymentModal, PosProductGrid, KitProspectModal, PosAvailablePromotions } from '@/components/pos';
import type { QuickProduct } from '@/types/pos';
import type { KitEnrollmentResponse } from '@/types/kit';
import { CorteDiaModal } from '@/components/pos/CorteDiaModal';
import { PosCustomerSelector } from '@/components/pos/PosCustomerSelector';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { usePosCartStore } from '@/stores/pos-cart.store';
import { useActiveSession, useCreateSale, useProcessPayment, useSales, useDailySalesSummary } from '@/hooks/usePos';
import { useActiveBranches } from '@/hooks/useBranches';
import { useBranchPosLock } from '@/hooks/useInventory';
import { useActiveCurrencies, useActivePriceTypes } from '@/hooks/useConfig';
import type { CreatePaymentInput, PosPaymentMethod, Sale, CancelSaleInput } from '@/types/pos';
import { PosSaleStatus } from '@/types/pos';
import type { Branch } from '@/types/branch';
import type { Currency } from '@/types/config';
import type { FiscalData } from '@/types/billing';
import { FISCAL_REGIMES, CFDI_USES, PAYMENT_FORMS } from '@/types/billing';
import { toast } from 'sonner';
import { posService } from '@/services/pos.service';
import { billingService } from '@/services/billing.service';
import { generatePosTicketPdf } from '@/lib/generate-pos-ticket';
import { getTimezoneShortLabel, formatDateTimeLocal, resolveTimeZone } from '@/lib/timezone-utils';
import { PermissionGuard } from '@/components/auth';
import { useSelector } from 'react-redux';
import { selectUser, selectUserRoles } from '@/store/slices/authSlice';

const fiscalRegimeOptions = FISCAL_REGIMES.map((r) => ({ value: r.Value, label: `${r.Value} - ${r.Name}` }));
const cfdiUseOptions = CFDI_USES.map((u) => ({ value: u.Value, label: `${u.Value} - ${u.Name}` }));
const paymentFormOptions = PAYMENT_FORMS.map((f) => ({ value: f.Value, label: `${f.Value} - ${f.Name}` }));

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
  const [stampRetryForm, setStampRetryForm] = useState({ rfc: '', legalName: '', fiscalRegime: '', postalCode: '', cfdiUse: 'G03', email: '', paymentFormCode: '01' });
  const [stampRetryPaymentMethod, setStampRetryPaymentMethod] = useState<'PUE' | 'PPD'>('PUE');
  const [stampRetryErrors, setStampRetryErrors] = useState<Record<string, string>>({});
  const [stampRetryLoading, setStampRetryLoading] = useState(false);
  const [stampRetrySaving, setStampRetrySaving] = useState(false);
  const [stampingId, setStampingId] = useState<string | null>(null);

  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);

  // Cancel sale modal
  const [cancelModalSale, setCancelModalSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelCfdiMotive, setCancelCfdiMotive] = useState<'01' | '02' | '03' | '04'>('03');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Sale detail modal
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  // Corte del día
  const [showCorte, setShowCorte] = useState(false);

  // Kit de inscripción detectado en el carrito (dispara modal de prospecto)
  const [pendingKit, setPendingKit] = useState<QuickProduct | null>(null);

  const user = useSelector(selectUser);
  const userRoles = useSelector(selectUserRoles);
  const isAdmin = userRoles.some((r) => r === 'super_admin' || r === 'admin' || r === 'call_center');
  const isSuperAdmin = userRoles.includes('super_admin');
  const userDefaultBranchId = user?.defaultBranchId;

  const { cart, clearCart } = usePosCartStore();
  const cartPriceTypeId = usePosCartStore((s) => s.cart.priceTypeId);
  const sessionBranchId = selectedBranchId || userDefaultBranchId;
  const { data: activeSession, refetch: refetchSession } = useActiveSession(sessionBranchId);
  const queryClient = useQueryClient();
  const createSale = useCreateSale();
  const processPayment = useProcessPayment();

  // Intento de cobro en curso: conserva la venta creada y su clave de
  // idempotencia entre reintentos para no duplicar ventas/cobros si
  // processPayment falla por timeout o red.
  const saleAttemptRef = useRef<{
    clientRequestId: string;
    saleId?: string;
    saleNumber?: string;
    fingerprint: string;
  } | null>(null);

  // Fetch branches (POS-enabled only), currencies, and price types
  const { data: allBranches } = useActiveBranches();
  const { data: currencies } = useActiveCurrencies();
  const { data: activePriceTypes } = useActivePriceTypes();

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

  // Find the distributor price type ID (fallback for customers with no priceTypeId assigned)
  // Use code === 'distributor' as the primary check (most reliable), appliesTo as fallback
  const distributorPriceTypeId = useMemo(
    () => (activePriceTypes || []).find((pt) => pt.code === 'distributor' || pt.appliesTo?.includes('distributor'))?.id,
    [activePriceTypes],
  );

  // Race-condition fix: if price types loaded AFTER the customer was already selected,
  // assign the distributor price type retroactively so the product grid shows correct prices.
  useEffect(() => {
    if (!distributorPriceTypeId) return;
    const s = usePosCartStore.getState();
    if (s.cart.customerId && !s.cart.priceTypeId) {
      s.setCustomer(s.cart.customerId, s.cart.customerName, s.cart.customerRfc, distributorPriceTypeId);
    }
  }, [distributorPriceTypeId]);

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

  // Bloqueo del POS por inventario (mismo estado que el POS de Electron).
  // Polling rápido para que el bloqueo aparezca casi de inmediato a call center.
  const { data: posLock } = useBranchPosLock(effectiveBranchId || null, {
    refetchInterval: 7000,
  });

  // Recent sales — filtered by branch and date
  const { data: recentSales, refetch: refetchSales, isLoading: isLoadingSales, isFetching: isFetchingSales } = useSales({
    branchId: effectiveBranchId || undefined,
    fromDate: appliedSalesDate || undefined,
    toDate: appliedSalesDate || undefined,
    limit: 50,
  });

  // Corte del día — only fetch when modal is open
  const { data: corteSummary, isLoading: isLoadingCorte } = useDailySalesSummary(
    effectiveBranchId || '',
    appliedSalesDate,
  );

  // Resolve currency from branch
  const selectedBranch = posBranches.find((b: Branch) => b.id === effectiveBranchId);
  const currencyCode = selectedBranch?.currencyCode || 'MXN';
  const currency = currencyMap.get(currencyCode);
  const currencySymbol = currency?.symbol || '$';
  const currencyId = currency?.id;
  const branchCountryId = selectedBranch?.countryId;
  const branchTimezone = resolveTimeZone(selectedBranch?.timezone);

  // Live branch clock
  const [branchClock, setBranchClock] = useState('');
  useEffect(() => {
    const update = () =>
      setBranchClock(
        new Date().toLocaleTimeString('es-MX', {
          timeZone: branchTimezone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [branchTimezone]);

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

  // Open fiscal edit modal when stamp fails
  const openStampRetryModal = useCallback(async (sale: Sale, errorMsg: string, errorDetail = '', paymentMethod: 'PUE' | 'PPD' = 'PUE') => {
    setStampRetrySale(sale);
    setStampRetryError(errorMsg);
    setStampRetryErrorDetail(errorDetail);
    setStampRetryErrors({});
    setStampRetryFiscal(null);
    setStampRetryPaymentMethod(paymentMethod);
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
            paymentFormCode: defaultRecord.paymentFormCode || '01',
          });
        } else {
          setStampRetryFiscal(null);
          setStampRetryForm({ rfc: '', legalName: '', fiscalRegime: '', postalCode: '', cfdiUse: 'G03', email: '', paymentFormCode: '01' });
        }
      }
    } catch {
      setStampRetryFiscal(null);
      setStampRetryForm({ rfc: '', legalName: '', fiscalRegime: '', postalCode: '', cfdiUse: 'G03', email: '', paymentFormCode: '01' });
    } finally {
      setStampRetryLoading(false);
    }
  }, []);

  const handlePaymentComplete = useCallback(
    async (payments: CreatePaymentInput[], change: number, requiresInvoice = false, invoicePaymentMethod = 'PUE') => {
      try {
        const sessionId = await ensureSession();

        // Intento de cobro idempotente: si processPayment falla por timeout y
        // el cajero reintenta, se reutiliza la MISMA venta (el API ignora
        // duplicados por clientRequestId). El fingerprint invalida el intento
        // si el carrito cambió entre reintentos.
        const fingerprint = JSON.stringify({
          customerId: cart.customerId,
          items: cart.items.map((it) => [it.productId, it.quantity, it.discountPercent ?? null, it.discountAmount ?? null]),
          discountPercent: cart.discountPercent ?? null,
          discountAmount: cart.discountAmount ?? null,
        });
        if (!saleAttemptRef.current || saleAttemptRef.current.fingerprint !== fingerprint) {
          saleAttemptRef.current = { clientRequestId: crypto.randomUUID(), fingerprint };
        }
        const attempt = saleAttemptRef.current;

        // Create sale (o reusar la del intento anterior fallido)
        let saleId = attempt.saleId;
        let saleNumber = attempt.saleNumber;
        if (!saleId) {
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
            clientRequestId: attempt.clientRequestId,
          });
          attempt.saleId = sale.id;
          attempt.saleNumber = sale.saleNumber;
          saleId = sale.id;
          saleNumber = sale.saleNumber;
        }

        // Process payment
        const paymentResult = await processPayment.mutateAsync({
          saleId,
          payments: payments.map((p) => ({
            ...p,
            paymentMethod: p.paymentMethod as PosPaymentMethod,
          })),
        });

        // Cobro exitoso: liberar el intento
        saleAttemptRef.current = null;

        // Fetch the full sale (with items and payments populated)
        const fullSale = await posService.getSaleById(saleId);
        if (paymentResult.accumulatedPoints != null) {
          fullSale.accumulatedPoints = paymentResult.accumulatedPoints;
        }

        // Clear cart and refresh data
        clearCart();
        refetchSales();
        refetchSession();
        // Invalidar puntos del cliente para que PosPointsBar muestre datos actualizados.
        // Tambien invalidar promos disponibles porque la venta pudo haber:
        //   - sumado puntos que desbloquean nuevas promos, o
        //   - canjeado una promo con consumes_points=true que descuenta.
        if (cart.customerId) {
          queryClient.invalidateQueries({ queryKey: ['customer-period-stats', cart.customerId] });
          queryClient.invalidateQueries({ queryKey: ['promotions', 'available', cart.customerId] });
        }

        toast.success(`Venta ${saleNumber ?? fullSale.saleNumber} completada`);
        if (requiresInvoice) {
          toast.info('Usa el ícono de timbrar en Ventas Recientes para generar la factura', { duration: 5000 });
        }

        return fullSale;
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Error al procesar la venta');
        throw error;
      }
    },
    [ensureSession, cart, createSale, processPayment, clearCart, refetchSales, refetchSession, queryClient],
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

  const handleStampRetrySave = async () => {
    if (!stampRetrySale?.customerId) return;
    const { rfc, legalName, fiscalRegime, postalCode, cfdiUse, email, paymentFormCode } = stampRetryForm;

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
        await billingService.updateFiscalData(stampRetryFiscal.id, { rfc, legalName, fiscalRegime, postalCode, cfdiUse, paymentFormCode, email });
      } else {
        const created = await billingService.createFiscalData({ customerId: stampRetrySale.customerId, rfc, legalName, fiscalRegime, postalCode, cfdiUse, paymentFormCode, email });
        setStampRetryFiscal(created);
      }

      // Retry stamp
      await posService.stampSale(stampRetrySale.id, stampRetryPaymentMethod);
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
        <header className="relative z-50 bg-[#3E667D] text-white px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(!showSidebar)}
              className="text-white hover:bg-white/10 hover:text-white lg:hidden"
            >
              <Bars3Icon className="h-6 w-6" />
            </Button>

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

            <div className="hidden sm:flex flex-col items-end text-white/80">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <ClockIcon className="h-4 w-4 flex-shrink-0" />
                {branchClock}
              </div>
              <span className="text-xs text-white/50 leading-none">
                {getTimezoneShortLabel(branchTimezone)}
              </span>
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
        <div className="relative flex-grow flex overflow-hidden">
          {/* Bloqueo por inventario: cubre solo el área de trabajo del POS.
              Deja libres el selector de sucursal (header) y el sidebar del admin,
              para poder cambiar de sucursal o navegar a otra parte. */}
          {posLock?.locked && (
            <div className="absolute inset-0 z-[45] flex flex-col items-center justify-center gap-6 bg-[#3E667D] p-8 text-center text-white">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
                <LockClosedIcon className="h-10 w-10" />
              </div>
              <div className="max-w-md">
                <h2 className="text-3xl font-bold">POS bloqueado</h2>
                {selectedBranch?.name && (
                  <p className="mt-1 text-sm text-white/70">{selectedBranch.name}</p>
                )}
                <p className="mt-4 text-base leading-relaxed text-white/85">
                  {posLock.message ||
                    'Inventario en progreso. No se pueden registrar ventas en esta sucursal hasta que finalice el conteo.'}
                </p>
                <p className="mt-4 text-sm text-white/70">
                  Puedes cambiar de sucursal arriba o navegar a otra sección desde el menú.
                </p>
                <p className="mt-8 flex items-center justify-center gap-2 text-xs text-white/50">
                  <span className="inline-block size-2 rounded-full bg-white/80 animate-pulse" />
                  El POS se reactivará automáticamente cuando Operaciones termine.
                </p>
              </div>
            </div>
          )}

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
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                  Ventas Recientes
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCorte(true)}
                  title="Corte del día"
                  className="text-[#3E667D] border-[#3E667D] hover:bg-[#3E667D]/5 hover:text-[#3E667D]"
                >
                  <ChartBarIcon className="h-3.5 w-3.5" />
                  Corte
                </Button>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={salesDate}
                  onChange={(e) => setSalesDate(e.target.value)}
                  className="flex-1 min-w-0"
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setAppliedSalesDate(salesDate)}
                  disabled={salesDate === appliedSalesDate}
                  className="flex-shrink-0"
                >
                  Buscar
                </Button>
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
                    onClick={async () => {
                      setLoadingDetailId(sale.id);
                      try {
                        const full = await posService.getSaleById(sale.id);
                        setDetailSale(full);
                      } catch {
                        toast.error('Error al cargar detalle de venta');
                      } finally {
                        setLoadingDetailId(null);
                      }
                    }}
                    className="p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 cursor-pointer relative"
                  >
                    {loadingDetailId === sale.id && (
                      <div className="absolute inset-0 bg-white/60 rounded-lg flex items-center justify-center z-10">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-[#3E667D]" />
                      </div>
                    )}
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
                            sale.status === PosSaleStatus.COMPLETED
                              ? 'bg-green-100 text-green-700'
                              : sale.status === PosSaleStatus.CANCELLED
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {sale.status === PosSaleStatus.COMPLETED
                            ? 'Completada'
                            : sale.status === PosSaleStatus.CANCELLED
                              ? 'Cancelada'
                              : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatDateTimeLocal(sale.createdAt, branchTimezone)}
                      <span className="text-gray-300"> · {getTimezoneShortLabel(branchTimezone)}</span>
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <div>
                        <p className="text-sm text-gray-600">{sale.itemsCount || sale.items.length} productos</p>
                        <p className="font-bold text-[#3E667D]">{formatCurrency(sale.total)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {sale.status === PosSaleStatus.COMPLETED && (
                          <>
                            {/* Stamp button — only for sales that need invoice and aren't stamped yet */}
                            {sale.requiresInvoice && !sale.invoiceUuid && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (stampingId) return;
                                  setStampingId(sale.id);
                                  try {
                                    await posService.stampSale(sale.id);
                                    toast.success(`Factura timbrada exitosamente`);
                                    refetchSales();
                                  } catch (err: any) {
                                    const { short, detail } = extractStampError(err);
                                    toast.error(short);
                                    if (sale.customerId) {
                                      openStampRetryModal(sale, short, detail);
                                    }
                                  } finally {
                                    setStampingId(null);
                                  }
                                }}
                                disabled={stampingId === sale.id}
                                title="Timbrar factura"
                                className="text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                              >
                                {stampingId === sale.id ? (
                                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-300 border-t-orange-500" />
                                ) : (
                                  <DocumentTextIcon className="h-5 w-5" />
                                )}
                              </Button>
                            )}
                            {/* View invoice PDF — only for stamped sales */}
                            {sale.invoiceUuid && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (loadingPdfId) return;
                                  setLoadingPdfId(sale.id);
                                  try {
                                    const url = await posService.getInvoicePdfUrl(sale.id);
                                    window.open(url, '_blank');
                                  } catch {
                                    toast.error('Error al obtener PDF de la factura');
                                  } finally {
                                    setLoadingPdfId(null);
                                  }
                                }}
                                disabled={loadingPdfId === sale.id}
                                title="Ver factura PDF"
                                className="text-purple-500 hover:text-purple-700 hover:bg-purple-50"
                              >
                                {loadingPdfId === sale.id ? (
                                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-300 border-t-purple-500" />
                                ) : (
                                  <EyeIcon className="h-5 w-5" />
                                )}
                              </Button>
                            )}
                            {/* Print ticket button */}
                            <Button
                              variant="ghost"
                              size="icon"
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
                              className="text-gray-400 hover:text-[#3E667D] hover:bg-white"
                            >
                              {isLoadingTicket ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-[#3E667D]" />
                              ) : (
                                <PrinterIcon className="h-5 w-5" />
                              )}
                            </Button>
                          </>
                        )}
                        {/* Cancel sale — Super Admin only, for any non-cancelled sale */}
                        {isSuperAdmin && sale.status !== PosSaleStatus.CANCELLED && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelReason('');
                              setCancelCfdiMotive('03');
                              setCancelModalSale(sale);
                            }}
                            disabled={cancellingId === sale.id}
                            title="Cancelar venta"
                            className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <NoSymbolIcon className="h-5 w-5" />
                          </Button>
                        )}
                      </div>
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
              <Button
                variant="ghost"
                onClick={() => refetchSales()}
                className="w-full text-gray-600"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Actualizar
              </Button>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const store = usePosCartStore.getState();
                        store.clearCart();
                        store.setCustomer(undefined, undefined, undefined, undefined);
                        store.setPublicPrice(false);
                      }}
                      className="text-[#3E667D] border-[#3E667D]/20 hover:bg-[#3E667D]/10 hover:text-[#3E667D]"
                    >
                      <ArrowsRightLeftIcon className="h-3.5 w-3.5" />
                      Cambiar
                    </Button>
                  </div>

                  {/* Available promotions strip — solo cuando hay distribuidor y pais */}
                  {cart.customerId && branchCountryId && (
                    <PosAvailablePromotions
                      customerId={cart.customerId}
                      countryId={branchCountryId}
                    />
                  )}

                  {/* Product catalog grid */}
                  <div className="flex-grow min-h-0">
                    <PosProductGrid
                      key={cart.customerId || 'public'}
                      branchId={effectiveBranchId}
                      priceTypeId={cartPriceTypeId}
                      countryId={branchCountryId}
                      currencySymbol={currencySymbol}
                      currencyCode={currencyCode}
                      onKitDetected={(kit) => {
                        // Solo permitir si hay un distribuidor seleccionado (no precio público)
                        if (!cart.customerId) {
                          toast.error('Selecciona primero al distribuidor patrocinador para vender un kit de inscripción');
                          return;
                        }
                        setPendingKit(kit);
                      }}
                    />
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
                    <PosCustomerSelector prominent countryId={branchCountryId} distributorPriceTypeId={distributorPriceTypeId} />

                    {/* Public price divider and switch */}
                    <div className="mt-6 flex items-center gap-3">
                      <div className="flex-grow border-t border-gray-200" />
                      <span className="text-xs text-gray-400 uppercase tracking-wider">o</span>
                      <div className="flex-grow border-t border-gray-200" />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => usePosCartStore.getState().setPublicPrice(true)}
                      className="mt-4 w-full py-3 h-auto bg-amber-50 border-2 border-amber-200 rounded-xl text-amber-700 hover:bg-amber-100 hover:border-amber-300 hover:text-amber-700"
                    >
                      <CurrencyDollarIcon className="h-5 w-5" />
                      Vender a Precio Público
                    </Button>
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
          <Button
            variant="default"
            onClick={handleCheckout}
            disabled={cart.items.length === 0 || (!cart.customerId && !cart.isPublicPrice)}
            className="px-6 py-4 h-auto rounded-full shadow-lg"
          >
            <span className="font-bold">{cart.customerId || cart.isPublicPrice ? `Cobrar ${formatCurrency(cart.total)}` : 'Seleccione distribuidor'}</span>
            {cart.items.length > 0 && (
              <span className="bg-white text-[#3E667D] px-2 py-0.5 rounded-full text-sm font-bold">
                {cart.items.length}
              </span>
            )}
          </Button>
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

        {/* Kit Enrollment Modal — se abre al detectar product_type=kit en la búsqueda */}
        <KitProspectModal
          open={!!pendingKit}
          onClose={() => setPendingKit(null)}
          sponsor={
            cart.customerId && cart.customerName
              ? {
                  id: cart.customerId,
                  customerNumber: undefined,
                  // El customerName guarda nombre completo. Lo separamos en first/last
                  // de forma simple para mostrarlo; la validación dura es del backend.
                  firstName: (cart.customerName || '').split(' ')[0] || cart.customerName || '',
                  lastName: (cart.customerName || '').split(' ').slice(1).join(' ') || '',
                  // customerType/status no están en la store; el backend valida.
                }
              : null
          }
          kit={
            pendingKit
              ? {
                  id: pendingKit.id,
                  code: pendingKit.sku,
                  name: pendingKit.name,
                  kitPosition: pendingKit.kitPosition,
                }
              : null
          }
          branchId={effectiveBranchId}
          onEnrolled={(result: KitEnrollmentResponse) => {
            // 1. Cambiar cliente del POS al nuevo distribuidor inscrito.
            //    El kit se factura al nuevo, no al sponsor.
            const store = usePosCartStore.getState();
            const currentPriceTypeId = store.cart.priceTypeId;
            store.setCustomer(
              result.customerId,
              `${result.fullName} (${result.customerNumber})`,
              undefined,
              currentPriceTypeId,
            );

            // 2. Agregar el kit al carrito.
            if (pendingKit) {
              store.addItem(pendingKit, 1);
              toast.success(`Kit ${pendingKit.sku} agregado para ${result.fullName}`);
            }
            setPendingKit(null);
          }}
        />

        {/* Ticket Preview Modal */}
        {ticketUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl flex flex-col w-[95vw] max-w-md h-[90vh] max-h-[700px]">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-900">Vista previa del ticket</h3>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => { URL.revokeObjectURL(ticketUrl); setTicketUrl(null); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-grow overflow-hidden">
                <iframe
                  src={ticketUrl}
                  className="w-full h-full border-0"
                  title="Ticket de venta"
                />
              </div>
              <div className="flex items-center gap-2 px-4 py-3 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = ticketUrl;
                    link.download = 'ticket.pdf';
                    link.click();
                  }}
                  className="flex-1 text-[#3E667D] border-[#3E667D] hover:bg-[#3E667D]/5 hover:text-[#3E667D]"
                >
                  Descargar
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    const win = window.open(ticketUrl, '_blank');
                    win?.print();
                  }}
                  className="flex-1"
                >
                  <PrinterIcon className="h-4 w-4" />
                  Imprimir
                </Button>
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
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setStampRetrySale(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </Button>
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
                      <Input
                        value={stampRetryForm.rfc}
                        onChange={(e) => { setStampRetryForm((p) => ({ ...p, rfc: e.target.value.toUpperCase() })); setStampRetryErrors((p) => { const n = { ...p }; delete n.rfc; return n; }); }}
                        className={stampRetryErrors.rfc ? 'border-red-300 bg-red-50' : ''}
                        placeholder="XAXX010101000"
                        maxLength={13}
                      />
                      {stampRetryErrors.rfc && <p className="text-xs text-red-500 mt-1">{stampRetryErrors.rfc}</p>}
                    </div>

                    {/* Legal Name */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Razón Social *</label>
                      <Input
                        value={stampRetryForm.legalName}
                        onChange={(e) => { setStampRetryForm((p) => ({ ...p, legalName: e.target.value.toUpperCase() })); setStampRetryErrors((p) => { const n = { ...p }; delete n.legalName; return n; }); }}
                        className={stampRetryErrors.legalName ? 'border-red-300 bg-red-50' : ''}
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
                      <Input
                        value={stampRetryForm.postalCode}
                        onChange={(e) => { setStampRetryForm((p) => ({ ...p, postalCode: e.target.value.replace(/\D/g, '') })); setStampRetryErrors((p) => { const n = { ...p }; delete n.postalCode; return n; }); }}
                        className={stampRetryErrors.postalCode ? 'border-red-300 bg-red-50' : ''}
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
                      <Input
                        value={stampRetryForm.email}
                        onChange={(e) => setStampRetryForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="correo@ejemplo.com"
                        type="email"
                      />
                    </div>

                    {/* Forma de Pago */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Forma de Pago</label>
                      <SearchableSelect
                        options={paymentFormOptions}
                        value={stampRetryForm.paymentFormCode}
                        onChange={(v) => setStampRetryForm((p) => ({ ...p, paymentFormCode: v }))}
                        placeholder="Seleccionar forma de pago..."
                        showAllOption={false}
                      />
                    </div>

                    {/* Método de Pago (PUE / PPD) */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Método de Pago</label>
                      <div className="flex gap-2">
                        {(['PUE', 'PPD'] as const).map((method) => (
                          <Button
                            key={method}
                            type="button"
                            variant="ghost"
                            onClick={() => setStampRetryPaymentMethod(method)}
                            className={`flex-1 px-3 py-2 text-sm rounded-lg border-2 font-medium transition-all ${
                              stampRetryPaymentMethod === method
                                ? 'border-[#3E667D] bg-[#3E667D] text-white hover:bg-[#3E667D] hover:text-white'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {method === 'PUE' ? 'PUE · Una exhibición' : 'PPD · Diferido'}
                          </Button>
                        ))}
                      </div>
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
                  <Button
                    variant="outline"
                    onClick={() => setStampRetrySale(null)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleStampRetrySave}
                    disabled={stampRetrySaving}
                    className="flex-1"
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
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sale Detail Modal */}
        {detailSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDetailSale(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{detailSale.saleNumber}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDateTimeLocal(detailSale.createdAt, branchTimezone)}
                    {' · '}<span className="text-gray-400">{getTimezoneShortLabel(branchTimezone)}</span>
                    {' · '}{detailSale.branchName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    detailSale.status === PosSaleStatus.COMPLETED ? 'bg-green-100 text-green-700'
                    : detailSale.status === PosSaleStatus.CANCELLED ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {detailSale.status === PosSaleStatus.COMPLETED ? 'Completada' : detailSale.status === PosSaleStatus.CANCELLED ? 'Cancelada' : 'Pendiente'}
                  </span>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDetailSale(null)} className="text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                {/* Customer & Seller */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Cliente</p>
                    <p className="text-sm font-medium text-gray-800">{detailSale.customerName || 'Público general'}</p>
                    {detailSale.customerNumber && <p className="text-xs text-gray-500">{detailSale.customerNumber}</p>}
                    {detailSale.customerRfc && <p className="text-xs text-gray-500">{detailSale.customerRfc}</p>}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Vendedor</p>
                    <p className="text-sm font-medium text-gray-800">{detailSale.sellerName}</p>
                    {detailSale.cashRegisterName && <p className="text-xs text-gray-500">{detailSale.cashRegisterName}</p>}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Productos</p>
                  <div className="space-y-1">
                    {detailSale.items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                          <p className="text-xs text-gray-400">{item.productSku} · {item.quantity} × {formatCurrency(item.unitPrice)}</p>
                          {item.discountAmount > 0 && (
                            <p className="text-xs text-green-600">Descuento: -{formatCurrency(item.discountAmount)}</p>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-900 flex-shrink-0">{formatCurrency(item.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span><span>{formatCurrency(detailSale.subtotal)}</span>
                  </div>
                  {detailSale.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Descuento{detailSale.discountReason ? ` (${detailSale.discountReason})` : ''}</span>
                      <span>-{formatCurrency(detailSale.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>IVA</span><span>{formatCurrency(detailSale.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
                    <span>Total</span><span className="text-[#3E667D]">{formatCurrency(detailSale.total)}</span>
                  </div>
                  {detailSale.accumulatedPoints != null && detailSale.accumulatedPoints > 0 && (
                    <div className="flex justify-between text-xs text-purple-600">
                      <span>Puntos acumulados</span><span>+{detailSale.accumulatedPoints.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Payments */}
                {detailSale.payments.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pagos</p>
                    <div className="space-y-1.5">
                      {detailSale.payments.map((pmt) => (
                        <div key={pmt.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                          <div>
                            <p className="text-sm text-gray-700 capitalize">{pmt.paymentMethod.replace(/_/g, ' ')}{pmt.cardType ? ` · ${pmt.cardType}` : ''}{pmt.cardLast4 ? ` ****${pmt.cardLast4}` : ''}</p>
                            {pmt.changeGiven != null && pmt.changeGiven > 0 && (
                              <p className="text-xs text-gray-400">Cambio: {formatCurrency(pmt.changeGiven)}</p>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900">{formatCurrency(pmt.amount)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invoice info */}
                {detailSale.requiresInvoice && (
                  <div className={`rounded-lg p-3 ${detailSale.invoiceUuid ? 'bg-purple-50 border border-purple-100' : 'bg-orange-50 border border-orange-100'}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${detailSale.invoiceUuid ? 'text-purple-600' : 'text-orange-600'}`}>Factura</p>
                    {detailSale.invoiceUuid ? (
                      <>
                        <p className="text-xs text-purple-700 font-medium">Timbrada</p>
                        <p className="text-[10px] text-purple-500 font-mono mt-0.5 break-all">{detailSale.invoiceUuid}</p>
                      </>
                    ) : (
                      <p className="text-xs text-orange-700">Pendiente de timbrar</p>
                    )}
                  </div>
                )}

                {/* Cancellation info */}
                {detailSale.status === PosSaleStatus.CANCELLED && (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Cancelación</p>
                    {detailSale.cancelledByName && <p className="text-xs text-red-700">Por: {detailSale.cancelledByName}</p>}
                    {detailSale.cancelledAt && <p className="text-xs text-red-500">{formatDateTimeLocal(detailSale.cancelledAt, branchTimezone)}<span className="text-red-300"> · {getTimezoneShortLabel(branchTimezone)}</span></p>}
                    {detailSale.cancellationReason && <p className="text-xs text-red-700 mt-1">{detailSale.cancellationReason}</p>}
                  </div>
                )}

                {/* Notes */}
                {detailSale.notes && (
                  <p className="text-xs text-gray-500 italic">Notas: {detailSale.notes}</p>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setDetailSale(null)}
                  className="w-full"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Corte del Día Modal */}
        {showCorte && (
          <CorteDiaModal
            summary={corteSummary}
            sales={recentSales?.data ?? []}
            isLoading={isLoadingCorte}
            date={appliedSalesDate}
            branchName={selectedBranch?.name ?? ''}
            timezone={branchTimezone}
            onClose={() => setShowCorte(false)}
          />
        )}

        {/* Cancel Sale Modal — Super Admin only */}
        {cancelModalSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-5 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <NoSymbolIcon className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Cancelar venta</h3>
                    <p className="text-xs text-gray-500">{cancelModalSale.saleNumber}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setCancelModalSale(null)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-5 w-5" />
                </Button>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">
                  Esta acción es <span className="font-semibold text-red-600">irreversible</span>. Se cancelará la venta y se revertirá el inventario.
                </p>

                {/* CFDI warning — only shown when the sale is stamped */}
                {cancelModalSale?.invoiceUuid && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-700">Esta venta tiene factura timbrada</p>
                    <p className="text-xs text-amber-600">Se solicitará la cancelación del CFDI ante el SAT. El receptor deberá aceptarla si aplica.</p>
                    <div>
                      <label className="block text-xs font-medium text-amber-700 mb-1">Motivo SAT de cancelación</label>
                      <Select
                        value={cancelCfdiMotive}
                        onValueChange={(v) => setCancelCfdiMotive(v as '01' | '02' | '03' | '04')}
                      >
                        <SelectTrigger className="w-full text-xs border-amber-300 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="03">03 - No se llevó a cabo la operación</SelectItem>
                          <SelectItem value="02">02 - Comprobante con errores sin relación</SelectItem>
                          <SelectItem value="01">01 - Comprobante con errores con relación</SelectItem>
                          <SelectItem value="04">04 - Operación nominativa en factura global</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo de cancelación <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={3}
                    placeholder="Describe el motivo de la cancelación..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 p-5 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCancelModalSale(null)}
                  className="flex-1"
                >
                  Volver
                </Button>
                <Button
                  variant="destructive"
                  disabled={!cancelReason.trim() || cancellingId === cancelModalSale.id}
                  onClick={async () => {
                    if (!cancelReason.trim()) return;
                    setCancellingId(cancelModalSale.id);
                    try {
                      const cancelledSaleCustomerId = cancelModalSale.customerId;
                      const hasInvoice = !!cancelModalSale.invoiceUuid;
                      await posService.cancelSale(cancelModalSale.id, {
                        cancellationReason: cancelReason.trim(),
                        ...(hasInvoice && { cfdiMotive: cancelCfdiMotive }),
                      });
                      toast.success(`Venta ${cancelModalSale.saleNumber} cancelada${hasInvoice ? ' — cancelación CFDI enviada al SAT' : ''}`);
                      setCancelModalSale(null);
                      refetchSales();
                      if (cancelledSaleCustomerId) {
                        queryClient.invalidateQueries({ queryKey: ['customer-period-stats', cancelledSaleCustomerId] });
                        queryClient.invalidateQueries({ queryKey: ['promotions', 'available', cancelledSaleCustomerId] });
                      }
                    } catch (err: any) {
                      const msg = err?.response?.data?.message || 'Error al cancelar la venta';
                      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
                    } finally {
                      setCancellingId(null);
                    }
                  }}
                  className="flex-1"
                >
                  {cancellingId === cancelModalSale.id ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Cancelando...
                    </>
                  ) : (
                    <>
                      <NoSymbolIcon className="h-4 w-4" />
                      Confirmar cancelación
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
