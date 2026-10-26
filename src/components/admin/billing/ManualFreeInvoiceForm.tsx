'use client';

// ManualFreeInvoiceForm - Factura libre SIN ticket (26-oct-2026): pantalla
// tipo punto de venta en dos columnas. Izquierda, en orden: quién compra
// (sucursal que expide + distribuidor opcional, que fija el precio de lista),
// productos (búsqueda por clave o nombre, o una lista pegada "clave,cantidad",
// de uno o varios renglones), a quién se factura (público en general, datos
// fiscales del distribuidor u otros capturados aquí) y cómo se paga. Derecha:
// resumen VIVO = vista previa automática del API (POST manual-invoices/free/
// preview, que resuelve precios de lista e IVA de cada producto) y el botón
// de timbrar (POST manual-invoices/free). Solo fiscal: NO genera venta, NO
// descuenta inventario ni suma puntos. Permiso billing:manual.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardDocumentListIcon,
  DocumentPlusIcon,
  ExclamationTriangleIcon,
  IdentificationIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Textarea } from '@/components/ui/textarea';
import { CustomerFiscalDataDialog } from '@/components/admin/billing/CustomerFiscalDataDialog';
import { useActiveBranches } from '@/hooks/useBranches';
import { useCreateManualFreeInvoice, usePreviewManualFreeInvoice } from '@/hooks/useBilling';
import { useProducts } from '@/hooks/useProducts';
import { billingErrorMessage } from '@/lib/billing-error';
import {
  customerStatusLabel,
  exactCodeMatch,
  freeDraftBlockers,
  inlineBatchLine,
  moneyMx as money,
  parseBatchLines,
  priceTypeLabel,
  receiverBlockers,
  sortProductMatches,
  type FreeLineDraft,
  type FreeOtherReceiver,
} from '@/lib/billing/manual-free';
import { billingService } from '@/services/billing.service';
import { productsService } from '@/services/products.service';
import type { Product } from '@/types/product';
import { CFDI_USES, FISCAL_REGIMES, getPaymentFormName } from '@/types/billing';
import type {
  ManualCustomerLookup,
  ManualFreeCreateResponse,
  ManualFreeInvoiceRequest,
  ManualFreePreviewResponse,
  ManualFreeReceiverMode,
} from '@/types/billing';

const PUE_FORMS = ['01', '03', '04', '28', '06'];
const TH = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap';
const TD = 'px-3 py-2 text-sm align-middle';
const EMPTY_OTHER: FreeOtherReceiver = { rfc: '', name: '', taxRegimeCode: '', cfdiUseCode: 'G03', zipCode: '', email: '' };

interface PickedCustomer {
  id: string;
  customerNumber: string;
  name: string;
  status: string;
  hasRfc: boolean;
}

interface PreviewState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: ManualFreePreviewResponse | null;
  error: string | null;
}

/** Clave + nombre tal como los devuelve products/code/:code (mismo DTO del catálogo). */
type ProductLike = Pick<Product, 'id' | 'code' | 'name' | 'isActive'>;

export function ManualFreeInvoiceForm({ onViewList }: { onViewList?: () => void } = {}) {
  // 1 · Quién compra
  const [branchId, setBranchId] = useState('');
  const { data: branches } = useActiveBranches();
  const branchOptions = useMemo(
    () => (branches ?? []).map((b) => ({ value: b.id, label: `${b.code} - ${b.name}` })),
    [branches],
  );
  const branchLabel = branchOptions.find((b) => b.value === branchId)?.label ?? '';
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerTerm, setCustomerTerm] = useState('');
  const [customerBusy, setCustomerBusy] = useState(false);
  // Ver o editar los datos fiscales del distribuidor sin salir de aquí; al
  // guardar, `fiscalRev` fuerza otra vista previa (el receptor cambió en BD).
  const [fiscalOpen, setFiscalOpen] = useState(false);
  const [fiscalRev, setFiscalRev] = useState(0);
  const onFiscalSaved = () => {
    setCustomer((c) => (c ? { ...c, hasRfc: true } : c));
    setFiscalRev((r) => r + 1);
  };
  useEffect(() => {
    const t = setTimeout(() => setCustomerTerm(customerSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [customerSearch]);
  // Buscador propio de facturación (GET billing/manual-invoices/customers,
  // permiso billing:manual): Contabilidad no tiene customers:read.
  const customers = useQuery({
    queryKey: ['billing', 'manual-invoices', 'customers', customerTerm],
    queryFn: () => billingService.searchManualInvoiceCustomers({ search: customerTerm, limit: 8 }),
    enabled: !customer && customerTerm.length >= 2,
    staleTime: 60 * 1000,
  });
  const customerResults = customerTerm.length >= 2 ? (customers.data?.data ?? []) : [];
  const customersApproximate = customerTerm.length >= 2 && customers.data?.approximate === true;
  const pickCustomer = (c: ManualCustomerLookup) => {
    setCustomer({ id: c.id, customerNumber: c.customerNumber, name: c.name, status: c.status, hasRfc: c.hasRfc });
    setCustomerSearch('');
  };
  const clearCustomer = () => {
    setCustomer(null);
    setReceiverMode((m) => (m === 'customer' ? 'public' : m));
  };
  // Enter con puro número = búsqueda exacta por número de distribuidor.
  const lookupCustomer = async () => {
    const term = customerSearch.trim();
    if (!term) return;
    if (!/^\d+$/.test(term)) {
      if (customerResults.length === 1) pickCustomer(customerResults[0]);
      return;
    }
    setCustomerBusy(true);
    try {
      const res = await billingService.searchManualInvoiceCustomers({ customerNumber: term, limit: 1 });
      const c = res.data[0];
      if (!c) toast.error(`No existe el distribuidor #${term}`);
      else pickCustomer(c);
    } catch {
      toast.error('No se pudo buscar al distribuidor');
    } finally {
      setCustomerBusy(false);
    }
  };

  // 2 · Productos
  const [lines, setLines] = useState<FreeLineDraft[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productTerm, setProductTerm] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => setProductTerm(productSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [productSearch]);
  const searchable = productTerm.length >= 2 && !/[,;]/.test(productTerm);
  const products = useProducts({ search: productTerm, isActive: true, limit: 12 }, { enabled: searchable });
  const productResults = useMemo(
    () => (searchable ? sortProductMatches(products.data?.data ?? [], productTerm) : []),
    [searchable, products.data, productTerm],
  );
  const exact = exactCodeMatch(productResults, productTerm);

  const addLines = (adds: { product: ProductLike; quantity: number }[]) => {
    setLines((prev) => {
      const next = [...prev];
      for (const { product, quantity } of adds) {
        const i = next.findIndex((l) => l.productId === product.id);
        if (i >= 0) next[i] = { ...next[i], quantity: String((Number(next[i].quantity) || 0) + quantity) };
        else next.push({ productId: product.id, code: product.code, name: product.name, quantity: String(quantity), unitPrice: '' });
      }
      return next;
    });
  };
  const addProduct = (p: ProductLike, quantity = 1) => {
    addLines([{ product: p, quantity }]);
    setProductSearch('');
    setProductTerm('');
    searchRef.current?.focus();
  };
  const updateLine = (productId: string, patch: Partial<FreeLineDraft>) =>
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  const stepQuantity = (l: FreeLineDraft, delta: number) => {
    const next = Math.max(1, Math.round((Number(l.quantity) || 0) + delta));
    updateLine(l.productId, { quantity: String(next) });
  };
  const removeLine = (productId: string) => setLines((prev) => prev.filter((l) => l.productId !== productId));

  // Lista pegada "clave,cantidad" (uno o varios renglones) y el mismo formato
  // tecleado en el cuadro de búsqueda. Resuelve cada clave con
  // GET products/code/:code (no depende de la sucursal: es solo el CFDI).
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchBusy, setBatchBusy] = useState(false);
  const batch = useMemo(() => parseBatchLines(batchText), [batchText]);
  const resolveByCode = async (items: { sku: string; quantity: number }[]) => {
    const settled = await Promise.allSettled(
      items.map(async ({ sku, quantity }) => ({ product: await productsService.getProductByCode(sku), quantity, sku })),
    );
    const adds: { product: ProductLike; quantity: number }[] = [];
    const notFound: string[] = [];
    const inactive: string[] = [];
    settled.forEach((r, i) => {
      if (r.status === 'rejected' || !r.value.product?.id) {
        notFound.push(items[i].sku);
      } else if (r.value.product.isActive === false) {
        inactive.push(r.value.product.code);
      } else {
        adds.push({ product: r.value.product, quantity: r.value.quantity });
      }
    });
    if (adds.length > 0) addLines(adds);
    return { added: adds.length, notFound, inactive };
  };
  const runBatch = async () => {
    if (batch.lines.length === 0) return;
    setBatchBusy(true);
    try {
      const { added, notFound, inactive } = await resolveByCode(batch.lines);
      if (added > 0) toast.success(`${added} producto${added > 1 ? 's' : ''} agregado${added > 1 ? 's' : ''}`);
      if (inactive.length > 0) toast.warning(`Inactivos (no se pueden facturar): ${inactive.join(', ')}`);
      if (notFound.length > 0) toast.error(`Claves no encontradas: ${notFound.join(', ')}`);
      // Quedan en el cuadro solo los renglones que no se resolvieron, para corregirlos.
      const keep = new Set(notFound.map((s) => s.toUpperCase()));
      const rest = batchText
        .split(/\r?\n/)
        .filter((row) => {
          const parsed = parseBatchLines(row);
          return parsed.invalid.length > 0 || (parsed.lines[0] && keep.has(parsed.lines[0].sku));
        });
      setBatchText(rest.join('\n'));
      if (rest.length === 0) setBatchOpen(false);
    } finally {
      setBatchBusy(false);
    }
  };
  const onSearchEnter = async () => {
    const inline = inlineBatchLine(productSearch);
    if (inline) {
      const { added, notFound, inactive } = await resolveByCode([inline]);
      if (added > 0) {
        setProductSearch('');
        setProductTerm('');
      }
      if (inactive.length > 0) toast.warning(`${inactive[0]} está inactivo: no se puede facturar`);
      if (notFound.length > 0) toast.error(`No existe la clave ${notFound[0]}`);
      return;
    }
    if (exact) addProduct(exact);
    else if (productResults.length === 1) addProduct(productResults[0]);
  };

  // 3 · Receptor y pago
  const [receiverMode, setReceiverMode] = useState<ManualFreeReceiverMode>('public');
  const [other, setOther] = useState<FreeOtherReceiver>(EMPTY_OTHER);
  const [paymentMethod, setPaymentMethod] = useState<'PUE' | 'PPD'>('PUE');
  const [paymentForm, setPaymentForm] = useState('01');
  const [sendEmail, setSendEmail] = useState(true);
  const [notes, setNotes] = useState('');

  // Vista previa automática (resumen vivo) y timbrado
  const blockers = useMemo(
    () => freeDraftBlockers({ branchId, hasCustomer: !!customer, lines, receiverMode, other }),
    [branchId, customer, lines, receiverMode, other],
  );
  const buildRequest = (): ManualFreeInvoiceRequest => ({
    branchId,
    customerId: customer?.id ?? null,
    receiverMode,
    receiver:
      receiverMode === 'other'
        ? {
            rfc: other.rfc.trim().toUpperCase(),
            name: other.name.trim(),
            taxRegimeCode: other.taxRegimeCode,
            cfdiUseCode: other.cfdiUseCode,
            zipCode: other.zipCode.trim(),
            email: other.email.trim() || null,
          }
        : null,
    paymentMethod,
    paymentForm: paymentMethod === 'PUE' ? paymentForm : undefined,
    lines: lines.map((l) => ({
      productId: l.productId,
      quantity: Number(l.quantity),
      unitPrice: l.unitPrice.trim() === '' ? null : Number(l.unitPrice),
    })),
    sendEmail: receiverMode === 'public' ? false : sendEmail,
    notes: notes.trim() || undefined,
  });
  // Notas y correo no cambian cifras: fuera de la llave para no recalcular al
  // teclear. `rev` no viaja al API: solo fuerza otra vista previa cuando se
  // guardaron datos fiscales del distribuidor.
  const previewKey =
    blockers.length === 0 ? JSON.stringify({ req: { ...buildRequest(), notes: undefined, sendEmail: undefined }, rev: fiscalRev }) : '';
  const [preview, setPreview] = useState<PreviewState>({ status: 'idle', data: null, error: null });
  const [result, setResult] = useState<ManualFreeCreateResponse | null>(null);
  const { mutateAsync: previewAsync } = usePreviewManualFreeInvoice();
  const createMutation = useCreateManualFreeInvoice();
  const previewSeq = useRef(0);
  useEffect(() => {
    if (!previewKey) {
      setPreview({ status: 'idle', data: null, error: null });
      return;
    }
    const seq = ++previewSeq.current;
    setPreview((p) => ({ ...p, status: 'loading', error: null }));
    const t = setTimeout(async () => {
      try {
        const { req } = JSON.parse(previewKey) as { req: ManualFreeInvoiceRequest };
        const data = await previewAsync(req);
        if (previewSeq.current === seq) setPreview({ status: 'ready', data, error: null });
      } catch (err) {
        if (previewSeq.current === seq)
          setPreview({ status: 'error', data: null, error: billingErrorMessage(err, 'No se pudo calcular la vista previa') });
      }
    }, 600);
    return () => clearTimeout(t);
  }, [previewKey, previewAsync]);

  const previewLines = preview.data && preview.data.lines.length === lines.length ? preview.data.lines : null;
  const warnings = preview.data?.warnings ?? [];
  const readyToStamp = blockers.length === 0 && preview.status === 'ready' && warnings.length === 0 && !createMutation.isPending;

  const runCreate = async () => {
    if (!readyToStamp || !preview.data) return;
    const dto = buildRequest();
    if (!window.confirm(`Se timbrará 1 CFDI ${dto.paymentMethod} a ${preview.data.receiverName} por ${money(preview.data.total)}. ¿Continuar?`)) return;
    try {
      const r = await createMutation.mutateAsync(dto);
      setResult(r);
      if (!r.error) {
        toast.success(`CFDI ${r.folioDisplay ?? ''} timbrado`);
        setLines([]);
        setNotes('');
        setBatchText('');
        setBatchOpen(false);
      } else {
        toast.error(r.error);
      }
    } catch (err) {
      toast.error(billingErrorMessage(err, 'No se pudo timbrar'));
    }
  };
  const resetAll = () => {
    setResult(null);
    setLines([]);
    setNotes('');
    setBatchText('');
    setBatchOpen(false);
    setCustomer(null);
    setCustomerSearch('');
    setReceiverMode('public');
    setOther(EMPTY_OTHER);
    setPaymentMethod('PUE');
    setPaymentForm('01');
    searchRef.current?.focus();
  };

  const step1Done = !!branchId;
  const step2Done = lines.length > 0;
  const step3Done = receiverBlockers(receiverMode, !!customer, other).length === 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
      {/* ───── Columna de captura ───── */}
      <div className="min-w-0 space-y-5">
        {/* 1 · Quién compra */}
        <Card>
          <CardContent className="p-5">
            <StepHeader n={1} title="¿Quién compra?" done={step1Done} hint="Sucursal que expide y, si aplica, el distribuidor" />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Sucursal que expide</label>
                <SearchableSelect
                  options={branchOptions}
                  value={branchId}
                  onChange={setBranchId}
                  showAllOption={false}
                  placeholder="Buscar sucursal…"
                  className="w-full"
                />
                <p className="mt-1 text-xs text-gray-400">Lugar de expedición del CFDI y país de los precios de lista.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  Distribuidor <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                {customer ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-[#3E667D]/30 bg-[#3E667D]/5 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        <span className="mr-1.5 font-mono text-xs text-gray-500">#{customer.customerNumber}</span>
                        {customer.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        <span className={customer.status === 'active' ? 'text-emerald-700' : 'text-amber-700'}>{customerStatusLabel(customer.status)}</span>
                        {' · '}
                        {customer.status === 'active' ? 'sus precios de lista' : 'precio público'}
                        {' · '}
                        {customer.hasRfc ? 'con RFC' : 'sin RFC en su ficha'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button type="button" variant="outline" size="sm" onClick={() => setFiscalOpen(true)} className="gap-1">
                        <IdentificationIcon className="h-4 w-4" />
                        Datos fiscales
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={clearCustomer} className="text-gray-500">
                        <XMarkIcon className="h-4 w-4" />
                        Quitar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void lookupCustomer();
                        }
                      }}
                      placeholder="Número de distribuidor + Enter, o nombre…"
                      className="bg-gray-50 pl-9"
                      autoComplete="off"
                      disabled={customerBusy}
                    />
                    {customerTerm.length >= 2 && (
                      <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                        {customers.isFetching && customerResults.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-gray-500">Buscando…</p>
                        ) : customerResults.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-gray-500">Sin resultados. Con el número exacto presiona Enter.</p>
                        ) : (
                          <>
                            {customersApproximate && (
                              <p className="border-b border-amber-100 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                                Sin coincidencia exacta; ¿quisiste decir…?
                              </p>
                            )}
                            {customerResults.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => pickCustomer(c)}
                                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                              >
                                <span className="min-w-0 truncate">
                                  <span className="mr-1.5 font-mono text-xs text-gray-500">#{c.customerNumber}</span>
                                  <span className="font-medium text-gray-900">{c.name}</span>
                                </span>
                                <span className="shrink-0 text-xs text-gray-500">
                                  {customerStatusLabel(c.status)} · {c.hasRfc ? 'con RFC' : 'sin RFC'}
                                </span>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-400">Con distribuidor activo, los precios vacíos toman SU lista; sin él, el precio público.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2 · Productos */}
        <Card>
          <CardContent className="p-5">
            <StepHeader
              n={2}
              title="Productos"
              done={step2Done}
              hint={lines.length > 0 ? `${lines.length} concepto${lines.length > 1 ? 's' : ''}` : 'Como en la caja: clave o nombre, Enter agrega'}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  ref={searchRef}
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void onSearchEnter();
                    } else if (e.key === 'Escape') {
                      setProductSearch('');
                      setProductTerm('');
                    }
                  }}
                  placeholder="Clave o nombre del producto…  (también «clave,cantidad» + Enter)"
                  className="bg-gray-50 pl-9"
                  autoComplete="off"
                />
                {searchable && (
                  <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                    {products.isFetching && productResults.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-500">Buscando…</p>
                    ) : productResults.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-500">Sin resultados para «{productTerm}».</p>
                    ) : (
                      <>
                        {productResults.map((p) => {
                          const isExact = exact?.id === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => addProduct(p)}
                              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 ${isExact ? 'bg-[#3E667D]/5' : ''}`}
                            >
                              <span className="min-w-0 truncate">
                                <span className="mr-2 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700">{p.code}</span>
                                <span className="text-gray-900">{p.name}</span>
                              </span>
                              <span className="flex shrink-0 items-center gap-2 text-xs text-gray-400">
                                {isExact && <span className="rounded border border-gray-200 px-1 font-mono">Enter</span>}
                                <PlusIcon className="h-4 w-4 text-[#3E667D]" />
                              </span>
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant={batchOpen ? 'default' : 'outline'}
                onClick={() => setBatchOpen((o) => !o)}
                className="shrink-0 gap-2"
              >
                <ClipboardDocumentListIcon className="h-4 w-4" />
                Pegar lista
              </Button>
            </div>

            {batchOpen && (
              <div className="mt-3 rounded-lg border border-[#3E667D]/30 bg-[#3E667D]/5 p-3">
                <p className="mb-2 text-xs text-gray-600">
                  Un producto por renglón: <span className="rounded bg-white px-1 font-mono">clave,cantidad</span> (sin cantidad = 1). Sirve para uno o varios; también
                  acepta tabulador o punto y coma, por si lo pegas desde Excel.
                </p>
                <Textarea
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder={'9019,2\n8451\nKI9019,1'}
                  rows={5}
                  className="bg-white font-mono text-sm"
                  disabled={batchBusy}
                  autoFocus
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button type="button" onClick={() => void runBatch()} disabled={batchBusy || batch.lines.length === 0} className="gap-2">
                    {batchBusy ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlusIcon className="h-4 w-4" />}
                    {batchBusy ? 'Buscando claves…' : `Agregar${batch.lines.length > 0 ? ` ${batch.lines.length}` : ''}`}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => { setBatchOpen(false); setBatchText(''); }} disabled={batchBusy}>
                    Cancelar
                  </Button>
                  <span className="text-xs text-gray-500">
                    {batch.lines.length > 0 && `${batch.lines.length} clave${batch.lines.length > 1 ? 's' : ''} detectada${batch.lines.length > 1 ? 's' : ''}`}
                    {batch.invalid.length > 0 && (
                      <span className="ml-2 text-amber-700">
                        {batch.invalid.length} renglón{batch.invalid.length > 1 ? 'es' : ''} con cantidad inválida: {batch.invalid.join(' · ')}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {lines.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center">
                <p className="text-sm text-gray-500">Todavía no hay productos.</p>
                <p className="mt-1 text-xs text-gray-400">Búscalos por clave o nombre, o pega una lista «clave,cantidad».</p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={TH}>Producto</th>
                      <th className={`${TH} w-36 text-center`}>Cantidad</th>
                      <th className={`${TH} w-44`}>Unitario c/IVA</th>
                      <th className={`${TH} w-28 text-right`}>Importe</th>
                      <th className={`${TH} w-10`} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lines.map((l, i) => {
                      const pl = previewLines?.[i] ?? null;
                      const captured = l.unitPrice.trim() === '' ? null : Number(l.unitPrice);
                      const unit = captured ?? pl?.unitPrice ?? null;
                      const qty = Number(l.quantity) || 0;
                      return (
                        <tr key={l.productId} className="hover:bg-gray-50/60">
                          <td className={TD}>
                            <span className="mr-2 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700">{l.code}</span>
                            <span className="text-gray-900">{l.name}</span>
                            {pl && <span className="ml-2 text-xs text-gray-400">{pl.taxLabel}</span>}
                          </td>
                          <td className={TD}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => stepQuantity(l, -1)}
                                className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-100"
                                aria-label={`Menos ${l.code}`}
                              >
                                <MinusIcon className="h-3.5 w-3.5" />
                              </button>
                              <Input
                                type="number"
                                min={0.001}
                                step="any"
                                value={l.quantity}
                                onChange={(e) => updateLine(l.productId, { quantity: e.target.value })}
                                className="h-7 w-16 bg-white px-1 text-center"
                                aria-label={`Cantidad de ${l.code}`}
                              />
                              <button
                                type="button"
                                onClick={() => stepQuantity(l, 1)}
                                className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-100"
                                aria-label={`Más ${l.code}`}
                              >
                                <PlusIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className={TD}>
                            <div className="relative">
                              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={l.unitPrice}
                                onChange={(e) => updateLine(l.productId, { unitPrice: e.target.value })}
                                placeholder={pl && captured === null ? `${pl.unitPrice.toFixed(2)} lista` : 'Precio de lista'}
                                className="h-7 bg-white pl-5 pr-2 text-right"
                                aria-label={`Precio de ${l.code}`}
                              />
                            </div>
                          </td>
                          <td className={`${TD} text-right tabular-nums font-medium text-gray-900`}>{unit != null && qty > 0 ? money(qty * unit) : '—'}</td>
                          <td className={TD}>
                            <button
                              type="button"
                              onClick={() => removeLine(l.productId)}
                              className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600"
                              aria-label={`Quitar ${l.code}`}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-xs text-gray-400">
              Precio vacío = precio de lista vigente{preview.data ? ` (${priceTypeLabel(preview.data.priceType)})` : ''}; captura uno solo para sobrescribirlo. El IVA sale de la regla fiscal de cada producto.
            </p>
          </CardContent>
        </Card>

        {/* 3 · Receptor y pago */}
        <Card>
          <CardContent className="p-5">
            <StepHeader n={3} title="¿A quién se factura y cómo se pagó?" done={step3Done} />
            <div className="grid gap-3 sm:grid-cols-3">
              <ReceiverOption
                selected={receiverMode === 'public'}
                onSelect={() => setReceiverMode('public')}
                title="Público en general"
                subtitle="RFC XAXX010101000 · sin correo"
              />
              <ReceiverOption
                selected={receiverMode === 'customer'}
                disabled={!customer}
                onSelect={() => setReceiverMode('customer')}
                title={customer ? `Distribuidor #${customer.customerNumber}` : 'Datos del distribuidor'}
                subtitle={!customer ? 'Elige uno en el paso 1' : customer.hasRfc ? 'Sus Datos Fiscales guardados' : 'Sin RFC en su ficha: usa «Otros datos»'}
              />
              <ReceiverOption
                selected={receiverMode === 'other'}
                onSelect={() => setReceiverMode('other')}
                title="Otros datos fiscales"
                subtitle="Captura RFC, razón social, régimen, uso y CP"
              />
            </div>
            {customer && (
              <p className="mt-2 text-xs text-gray-500">
                {receiverMode === 'customer' && 'Se usan RFC, razón social, régimen, uso y CP de su ficha de Datos Fiscales; si le falta algo, el resumen lo dirá. '}
                <button type="button" onClick={() => setFiscalOpen(true)} className="font-medium text-[#3E667D] underline-offset-2 hover:underline">
                  Ver o editar los datos fiscales de #{customer.customerNumber}
                </button>
              </p>
            )}
            {receiverMode === 'other' && (
              <div className="mt-3 grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-2">
                <Field label="RFC">
                  <Input value={other.rfc} onChange={(e) => setOther({ ...other, rfc: e.target.value.toUpperCase() })} className="bg-white font-mono uppercase" maxLength={13} placeholder="XAXX010101000" />
                </Field>
                <Field label="Nombre o razón social (como en el SAT)">
                  <Input value={other.name} onChange={(e) => setOther({ ...other, name: e.target.value })} className="bg-white" maxLength={254} />
                </Field>
                <Field label="Régimen fiscal">
                  <select value={other.taxRegimeCode} onChange={(e) => setOther({ ...other, taxRegimeCode: e.target.value })} className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm">
                    <option value="">Elegir…</option>
                    {FISCAL_REGIMES.map((r) => (
                      <option key={r.Value} value={r.Value}>{r.Value} · {r.Name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Uso de CFDI">
                  <select value={other.cfdiUseCode} onChange={(e) => setOther({ ...other, cfdiUseCode: e.target.value })} className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm">
                    {CFDI_USES.map((u) => (
                      <option key={u.Value} value={u.Value}>{u.Value} · {u.Name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Código postal fiscal">
                  <Input value={other.zipCode} onChange={(e) => setOther({ ...other, zipCode: e.target.value.replace(/\D/g, '').slice(0, 5) })} className="bg-white font-mono" inputMode="numeric" maxLength={5} />
                </Field>
                <Field label="Correo (opcional, para enviar el CFDI)">
                  <Input type="email" value={other.email} onChange={(e) => setOther({ ...other, email: e.target.value })} className="bg-white" />
                </Field>
              </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs font-medium text-gray-600">Método de pago</p>
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm">
                  <Segment active={paymentMethod === 'PUE'} onClick={() => setPaymentMethod('PUE')} label="PUE" hint="una exhibición" />
                  <Segment active={paymentMethod === 'PPD'} onClick={() => setPaymentMethod('PPD')} label="PPD" hint="parcialidades · forma 99" />
                </div>
                {paymentMethod === 'PUE' && (
                  <select value={paymentForm} onChange={(e) => setPaymentForm(e.target.value)} className="mt-2 h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" aria-label="Forma de pago">
                    {PUE_FORMS.map((code) => (
                      <option key={code} value={code}>{code} · {getPaymentFormName(code)}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-gray-600">Notas <span className="font-normal text-gray-400">(van en el CFDI)</span></p>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. venta del sistema anterior, folio…" className="bg-gray-50" maxLength={300} />
                {receiverMode !== 'public' && (
                  <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                    <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
                    Enviar el CFDI por correo al receptor
                  </label>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ───── Resumen (tipo ticket) ───── */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        {result ? (
          <Card className={result.error ? 'border-red-200' : 'border-emerald-200'}>
            <CardContent className="p-5">
              {result.error ? (
                <>
                  <div className="mb-3 flex items-center gap-2 text-red-700">
                    <ExclamationTriangleIcon className="h-6 w-6" />
                    <h2 className="text-base font-semibold">No se timbró</h2>
                  </div>
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                    {result.error}
                  </p>
                  {result.invoiceId && (
                    <Link href={`/admin/facturacion/${result.invoiceId}`} className="mt-2 inline-block text-sm text-[#3E667D] underline-offset-2 hover:underline">
                      Ver el intento registrado
                    </Link>
                  )}
                  <p className="mt-3 text-xs text-gray-500">La captura sigue abajo: corrige y vuelve a timbrar.</p>
                  <div className="mt-4 flex flex-col gap-2">
                    <Button type="button" onClick={() => setResult(null)}>Corregir y reintentar</Button>
                    <Button type="button" variant="ghost" onClick={resetAll}>Empezar de cero</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-3 flex items-center gap-2 text-emerald-700">
                    <CheckCircleIcon className="h-6 w-6" />
                    <h2 className="text-base font-semibold">CFDI timbrado</h2>
                  </div>
                  <dl className="space-y-1.5 text-sm">
                    <Row k="Folio">
                      <Link href={`/admin/facturacion/${result.invoiceId}`} className="font-medium text-[#3E667D] underline-offset-2 hover:underline">
                        {result.folioDisplay}
                      </Link>
                    </Row>
                    {result.total != null && <Row k="Total">{money(result.total)}</Row>}
                    <Row k="UUID"><span className="break-all font-mono text-xs text-gray-600">{result.satUuid}</span></Row>
                  </dl>
                  <div className="mt-4 flex flex-col gap-2">
                    <Link href={`/admin/facturacion/${result.invoiceId}`}>
                      <Button type="button" className="w-full">Ver la factura</Button>
                    </Link>
                    <Button type="button" variant="outline" onClick={resetAll}>Nueva factura</Button>
                    {onViewList && (
                      <Button type="button" variant="ghost" onClick={onViewList}>Ver facturas emitidas</Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Resumen</h2>
                <StatusPill blockers={blockers.length} status={preview.status} warnings={warnings.length} />
              </div>

              <dl className="space-y-1.5 text-sm">
                <Row k="Expide">{branchLabel || <span className="text-gray-400">—</span>}</Row>
                <Row k="Receptor">
                  {preview.data ? (
                    <>
                      <span className="block truncate" title={preview.data.receiverName}>{preview.data.receiverName}</span>
                      <span className="font-mono text-xs text-gray-500">
                        {preview.data.receiverRfc} · {preview.data.receiverTaxRegimeCode} · {preview.data.receiverCfdiUseCode} · CP {preview.data.receiverZipCode}
                      </span>
                    </>
                  ) : receiverMode === 'public' ? (
                    'Público en general'
                  ) : receiverMode === 'customer' ? (
                    customer ? `#${customer.customerNumber} ${customer.name}` : <span className="text-gray-400">—</span>
                  ) : (
                    other.name.trim() || <span className="text-gray-400">—</span>
                  )}
                </Row>
                <Row k="Pago">
                  {paymentMethod === 'PPD' ? 'PPD · 99 Por definir' : `PUE · ${paymentForm} ${getPaymentFormName(paymentForm)}`}
                </Row>
                {preview.data && <Row k="Lista">{priceTypeLabel(preview.data.priceType)}</Row>}
              </dl>

              <div className={`mt-4 space-y-1 border-t border-dashed border-gray-200 pt-3 text-sm ${preview.status === 'loading' ? 'opacity-60' : ''}`}>
                <div className="flex justify-between text-gray-600">
                  <span>{lines.length} concepto{lines.length === 1 ? '' : 's'}</span>
                  {preview.status === 'loading' && <span className="text-xs text-gray-400">Calculando…</span>}
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{preview.data ? money(preview.data.subtotal) : '—'}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>IVA</span>
                  <span className="tabular-nums">{preview.data ? money(preview.data.taxes) : '—'}</span>
                </div>
                <div className="flex items-baseline justify-between pt-1 text-gray-900">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold tabular-nums">{preview.data ? money(preview.data.total) : '—'}</span>
                </div>
              </div>

              {blockers.length > 0 && (
                <ul className="mt-4 space-y-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                  {blockers.map((b) => (
                    <li key={b} className="flex items-start gap-1.5">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
              {preview.status === 'error' && preview.error && (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800" role="alert">{preview.error}</p>
              )}
              {warnings.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <p className="mb-1 font-medium">Antes de timbrar:</p>
                  <ul className="list-disc space-y-0.5 pl-4">
                    {warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button type="button" onClick={() => void runCreate()} disabled={!readyToStamp} className="mt-4 w-full gap-2">
                {createMutation.isPending ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <DocumentPlusIcon className="h-4 w-4" />}
                {createMutation.isPending ? 'Timbrando…' : 'Timbrar CFDI'}
              </Button>
              {(lines.length > 0 || customer) && (
                <Button type="button" variant="ghost" size="sm" onClick={resetAll} className="mt-1 w-full text-gray-500">
                  Limpiar captura
                </Button>
              )}

              <p className="mt-4 flex items-start gap-1.5 text-xs text-gray-500">
                <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                Solo emite el CFDI: no genera venta, no descuenta inventario ni suma puntos.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {customer && (
        <CustomerFiscalDataDialog
          open={fiscalOpen}
          onOpenChange={setFiscalOpen}
          customerId={customer.id}
          customerNumber={customer.customerNumber}
          customerName={customer.name}
          onSaved={onFiscalSaved}
        />
      )}
    </div>
  );
}

function StepHeader({ n, title, done, hint }: { n: number; title: string; done: boolean; hint?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-emerald-600 text-white' : 'bg-[#3E667D] text-white'}`}
        aria-hidden
      >
        {done ? <CheckIcon className="h-4 w-4" /> : n}
      </span>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {hint && <span className="ml-auto hidden text-xs text-gray-400 sm:inline">{hint}</span>}
    </div>
  );
}

function ReceiverOption({
  selected,
  disabled,
  onSelect,
  title,
  subtitle,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`rounded-lg border p-3 text-left transition-colors ${
        selected
          ? 'border-[#3E667D] bg-[#3E667D]/5 ring-1 ring-[#3E667D]'
          : disabled
            ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <span className="flex items-center gap-2">
        <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${selected ? 'border-[#3E667D] bg-[#3E667D]' : 'border-gray-300 bg-white'}`}>
          {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
        </span>
        <span className={`text-sm font-medium ${disabled ? '' : 'text-gray-900'}`}>{title}</span>
      </span>
      <span className="mt-1 block pl-6 text-xs text-gray-500">{subtitle}</span>
    </button>
  );
}

function Segment({ active, onClick, label, hint }: { active: boolean; onClick: () => void; label: string; hint: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-3 py-1.5 transition-colors ${active ? 'bg-[#3E667D] text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}
    >
      <span className="font-semibold">{label}</span>
      <span className={`ml-1.5 text-xs ${active ? 'text-white/80' : 'text-gray-400'}`}>{hint}</span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-500">{label}</label>
      {children}
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
      <dt className="text-gray-500">{k}</dt>
      <dd className="min-w-0 text-gray-900">{children}</dd>
    </div>
  );
}

function StatusPill({ blockers, status, warnings }: { blockers: number; status: PreviewState['status']; warnings: number }) {
  const [cls, text] =
    blockers > 0
      ? ['bg-gray-100 text-gray-600', 'Capturando']
      : status === 'loading'
        ? ['bg-blue-50 text-blue-700', 'Calculando…']
        : status === 'error'
          ? ['bg-red-50 text-red-700', 'Con error']
          : warnings > 0
            ? ['bg-amber-50 text-amber-700', 'Revisa avisos']
            : status === 'ready'
              ? ['bg-emerald-50 text-emerald-700', 'Lista para timbrar']
              : ['bg-gray-100 text-gray-600', 'Capturando'];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{text}</span>;
}
