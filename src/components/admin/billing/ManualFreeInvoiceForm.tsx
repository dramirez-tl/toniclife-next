'use client';

// ManualFreeInvoiceForm - Factura libre SIN ticket (26-oct-2026): como una
// venta en el punto de venta pero solo el CFDI. Se captura: sucursal que
// expide, distribuidor (opcional; fija el precio de lista y puede ser el
// receptor), productos con cantidad y precio (vacío = precio de lista),
// receptor (público en general, datos fiscales del distribuidor u otros datos
// capturados aquí), método de pago y notas. Vista previa (POST
// manual-invoices/free/preview) → timbrar (POST manual-invoices/free).
// No toca ventas ni inventario: es solo fiscal. Permiso billing:manual.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DocumentPlusIcon, MagnifyingGlassIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useActiveBranches } from '@/hooks/useBranches';
import { useCreateManualFreeInvoice, usePreviewManualFreeInvoice } from '@/hooks/useBilling';
import { useProducts } from '@/hooks/useProducts';
import { billingErrorMessage } from '@/lib/billing-error';
import { customersService } from '@/services/customers.service';
import type { Customer } from '@/types/customer';
import type { Product } from '@/types/product';
import { CFDI_USES, FISCAL_REGIMES, getPaymentFormName } from '@/types/billing';
import type {
  ManualFreeCreateResponse,
  ManualFreeInvoiceRequest,
  ManualFreePreviewResponse,
  ManualFreeReceiverMode,
} from '@/types/billing';

const money = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(v);
const PUE_FORMS = ['01', '03', '04', '28', '06'];
const PRICE_TYPE_LABEL: Record<string, string> = {
  distributor: 'distribuidor',
  public: 'público',
  preferred: 'preferente',
  employee: 'empleado',
  wholesale: 'mayorista',
};
const TH = 'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap';
const TD = 'px-3 py-2 text-sm';

interface PickedCustomer {
  id: string;
  customerNumber: string;
  name: string;
  status: string;
}

interface LineDraft {
  productId: string;
  code: string;
  name: string;
  quantity: string;
  /** Vacío = precio de lista. */
  unitPrice: string;
}

const customerName = (c: Customer) =>
  [c.firstName, c.lastName, c.lastNameMother].filter(Boolean).join(' ').trim() || c.email || '—';

export function ManualFreeInvoiceForm() {
  // 1 · Sucursal y distribuidor
  const [branchId, setBranchId] = useState('');
  const { data: branches } = useActiveBranches();
  const branchOptions = useMemo(
    () => (branches ?? []).map((b) => ({ value: b.id, label: `${b.code} - ${b.name}` })),
    [branches],
  );
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerTerm, setCustomerTerm] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setCustomerTerm(customerSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [customerSearch]);
  const customers = useQuery({
    queryKey: ['customers', 'free-invoice', customerTerm],
    queryFn: () => customersService.getAll({ search: customerTerm, limit: 8 }),
    enabled: !customer && customerTerm.length >= 2,
    staleTime: 60 * 1000,
  });
  const pickCustomer = (c: Customer) => {
    setCustomer({ id: c.id, customerNumber: c.customerNumber ?? '', name: customerName(c), status: c.status ?? '' });
    setCustomerSearch('');
    setCustomerNumber('');
    setPreview(null);
  };
  const lookupByNumber = async () => {
    const n = customerNumber.trim();
    if (!n) return;
    try {
      const res = await customersService.getAll({ customerNumber: n, limit: 1 });
      const c = res.data[0];
      if (!c) {
        toast.error(`No existe el distribuidor #${n}`);
        return;
      }
      pickCustomer(c);
    } catch {
      toast.error('No se pudo buscar al distribuidor');
    }
  };

  // 2 · Productos
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productTerm, setProductTerm] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setProductTerm(productSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [productSearch]);
  const products = useProducts(
    { search: productTerm, isActive: true, limit: 10 },
    { enabled: productTerm.length >= 2 },
  );
  const productResults = productTerm.length >= 2 ? (products.data?.data ?? []) : [];
  const addProduct = (p: Product) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.productId === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: String((Number(next[i].quantity) || 0) + 1) };
        return next;
      }
      return [...prev, { productId: p.id, code: p.code, name: p.name, quantity: '1', unitPrice: '' }];
    });
    setProductSearch('');
    setPreview(null);
  };
  const updateLine = (productId: string, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
    setPreview(null);
  };
  const removeLine = (productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
    setPreview(null);
  };

  // 3 · Receptor, método, notas
  const [receiverMode, setReceiverMode] = useState<ManualFreeReceiverMode>('public');
  const [other, setOther] = useState({ rfc: '', name: '', taxRegimeCode: '', cfdiUseCode: 'G03', zipCode: '', email: '' });
  const [paymentMethod, setPaymentMethod] = useState<'PUE' | 'PPD'>('PUE');
  const [paymentForm, setPaymentForm] = useState('01');
  const [sendEmail, setSendEmail] = useState(true);
  const [notes, setNotes] = useState('');

  // 4 · Vista previa y resultado
  const [preview, setPreview] = useState<ManualFreePreviewResponse | null>(null);
  const [result, setResult] = useState<ManualFreeCreateResponse | null>(null);
  const previewMutation = usePreviewManualFreeInvoice();
  const createMutation = useCreateManualFreeInvoice();

  const request = (): ManualFreeInvoiceRequest | null => {
    if (!branchId) {
      toast.error('Elige la sucursal que expide');
      return null;
    }
    if (lines.length === 0) {
      toast.error('Agrega al menos un producto');
      return null;
    }
    for (const l of lines) {
      const qty = Number(l.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        toast.error(`Cantidad inválida en ${l.code}`);
        return null;
      }
      if (l.unitPrice.trim() !== '' && (!Number.isFinite(Number(l.unitPrice)) || Number(l.unitPrice) < 0)) {
        toast.error(`Precio inválido en ${l.code}`);
        return null;
      }
    }
    if (receiverMode === 'customer' && !customer) {
      toast.error('Elige al distribuidor para facturar con sus datos fiscales');
      return null;
    }
    if (receiverMode === 'other') {
      if (!/^[A-ZÑ&a-zñ]{3,4}\d{6}[A-Za-z0-9]{3}$/.test(other.rfc.trim())) {
        toast.error('RFC inválido');
        return null;
      }
      if (other.name.trim().length < 3 || !other.taxRegimeCode || !other.cfdiUseCode || !/^\d{5}$/.test(other.zipCode.trim())) {
        toast.error('Completa razón social, régimen, uso de CFDI y código postal');
        return null;
      }
    }
    return {
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
    };
  };

  const runPreview = async () => {
    const dto = request();
    if (!dto) return;
    setResult(null);
    try {
      setPreview(await previewMutation.mutateAsync(dto));
    } catch (err) {
      setPreview(null);
      toast.error(billingErrorMessage(err, 'No se pudo generar la vista previa'));
    }
  };

  const runCreate = async () => {
    const dto = request();
    if (!dto || !preview) return;
    if (!window.confirm(`Se timbrará 1 CFDI (${dto.paymentMethod}) a ${preview.receiverName} por ${money(preview.total)}. ¿Continuar?`)) return;
    try {
      const r = await createMutation.mutateAsync(dto);
      setResult(r);
      setPreview(null);
      if (!r.error) {
        toast.success(`CFDI ${r.folioDisplay ?? ''} timbrado`);
        setLines([]);
        setNotes('');
      } else {
        toast.error(r.error);
      }
    } catch (err) {
      toast.error(billingErrorMessage(err, 'No se pudo timbrar'));
    }
  };

  const previewReady = !!preview && preview.warnings.length === 0;

  return (
    <div className="space-y-6">
      {/* 1 · Sucursal y distribuidor */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">1 · Sucursal y distribuidor</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Sucursal que expide</label>
              <SearchableSelect
                options={branchOptions}
                value={branchId}
                onChange={(v) => {
                  setBranchId(v);
                  setPreview(null);
                }}
                showAllOption={false}
                placeholder="Buscar sucursal..."
                className="w-full"
              />
              <p className="mt-1 text-xs text-gray-400">Define el lugar de expedición y el país de los precios de lista.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Distribuidor (opcional)</label>
              {customer ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                  <div>
                    <span className="font-mono text-xs text-gray-500">#{customer.customerNumber}</span>{' '}
                    <span className="font-medium text-gray-900">{customer.name}</span>
                    <span className="ml-2 text-xs text-gray-500">{customer.status}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCustomer(null);
                      if (receiverMode === 'customer') setReceiverMode('public');
                      setPreview(null);
                    }}
                  >
                    Cambiar
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Buscar por nombre o número…"
                      className="bg-gray-50 pl-9"
                      autoComplete="off"
                    />
                    {customerTerm.length >= 2 && (
                      <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                        {customers.isFetching && (customers.data?.data ?? []).length === 0 ? (
                          <p className="px-3 py-2 text-sm text-gray-500">Buscando…</p>
                        ) : (customers.data?.data ?? []).length === 0 ? (
                          <p className="px-3 py-2 text-sm text-gray-500">Sin resultados.</p>
                        ) : (
                          (customers.data?.data ?? []).map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => pickCustomer(c)}
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                            >
                              <span className="font-mono text-xs text-gray-500">#{c.customerNumber}</span>{' '}
                              <span className="font-medium text-gray-900">{customerName(c)}</span>
                              <span className="ml-2 text-xs text-gray-500">{c.status}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <Input
                    value={customerNumber}
                    onChange={(e) => setCustomerNumber(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void lookupByNumber();
                      }
                    }}
                    placeholder="No. exacto + Enter"
                    className="bg-gray-50 sm:w-44"
                    inputMode="numeric"
                  />
                </div>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Con distribuidor, los productos sin precio capturado toman su precio de lista; sin él, el precio público.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2 · Productos */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">2 · Productos</h2>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (productResults.length === 1) addProduct(productResults[0]);
                }
              }}
              placeholder="Buscar producto por clave o nombre (mínimo 2 caracteres)…"
              className="bg-gray-50 pl-9"
              autoComplete="off"
            />
            {productTerm.length >= 2 && (
              <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                {products.isFetching && productResults.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-gray-500">Buscando…</p>
                ) : productResults.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-gray-500">Sin resultados para «{productTerm}».</p>
                ) : (
                  productResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      <span>
                        <span className="font-mono text-xs text-gray-500">{p.code}</span>{' '}
                        <span className="font-medium text-gray-900">{p.name}</span>
                      </span>
                      <PlusIcon className="h-4 w-4 text-[#3E667D]" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {lines.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
              Sin productos. Búscalos arriba como en el punto de venta.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={TH}>Clave</th>
                    <th className={TH}>Producto</th>
                    <th className={`${TH} w-28`}>Cantidad</th>
                    <th className={`${TH} w-44`}>Precio unitario (con IVA)</th>
                    <th className={`${TH} w-12`} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.map((l) => (
                    <tr key={l.productId}>
                      <td className={`${TD} font-mono text-xs`}>{l.code}</td>
                      <td className={TD}>{l.name}</td>
                      <td className={TD}>
                        <Input
                          type="number"
                          min={0.001}
                          step="any"
                          value={l.quantity}
                          onChange={(e) => updateLine(l.productId, { quantity: e.target.value })}
                          className="h-8 bg-gray-50 text-right"
                          aria-label={`Cantidad de ${l.code}`}
                        />
                      </td>
                      <td className={TD}>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={l.unitPrice}
                          onChange={(e) => updateLine(l.productId, { unitPrice: e.target.value })}
                          placeholder="Precio de lista"
                          className="h-8 bg-gray-50 text-right"
                          aria-label={`Precio de ${l.code}`}
                        />
                      </td>
                      <td className={TD}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(l.productId)}
                          className="h-8 w-8 text-gray-400 hover:text-red-600"
                          aria-label={`Quitar ${l.code}`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-gray-400">
            Precio vacío = precio de lista vigente (tipo del distribuidor o público). El IVA sale de la regla fiscal de cada producto. Esta factura NO descuenta inventario ni genera venta.
          </p>
        </CardContent>
      </Card>

      {/* 3 · Receptor y pago */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">3 · A quién se factura y cómo</h2>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-2 lg:col-span-2">
              <p className="text-xs font-medium text-gray-500">Receptor</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="free-receiver" checked={receiverMode === 'public'} onChange={() => { setReceiverMode('public'); setPreview(null); }} />
                Público en general (XAXX010101000)
              </label>
              <label className={`flex items-center gap-2 text-sm ${customer ? '' : 'text-gray-400'}`}>
                <input type="radio" name="free-receiver" disabled={!customer} checked={receiverMode === 'customer'} onChange={() => { setReceiverMode('customer'); setPreview(null); }} />
                Datos fiscales del distribuidor{customer ? ` (#${customer.customerNumber})` : ' — elige uno arriba'}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="free-receiver" checked={receiverMode === 'other'} onChange={() => { setReceiverMode('other'); setPreview(null); }} />
                Otros datos fiscales (capturar aquí)
              </label>
              {receiverMode === 'customer' && (
                <p className="text-xs text-gray-500">
                  Se usan RFC, razón social, régimen, uso y CP guardados en Datos Fiscales; si le faltan, la vista previa lo dirá.
                </p>
              )}
              {receiverMode === 'other' && (
                <div className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">RFC</label>
                    <Input value={other.rfc} onChange={(e) => { setOther({ ...other, rfc: e.target.value.toUpperCase() }); setPreview(null); }} className="bg-white font-mono uppercase" maxLength={13} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Nombre o razón social (como en el SAT)</label>
                    <Input value={other.name} onChange={(e) => { setOther({ ...other, name: e.target.value }); setPreview(null); }} className="bg-white" maxLength={254} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Régimen fiscal</label>
                    <select value={other.taxRegimeCode} onChange={(e) => { setOther({ ...other, taxRegimeCode: e.target.value }); setPreview(null); }} className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm">
                      <option value="">Elegir…</option>
                      {FISCAL_REGIMES.map((r) => (
                        <option key={r.Value} value={r.Value}>{r.Value} · {r.Name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Uso de CFDI</label>
                    <select value={other.cfdiUseCode} onChange={(e) => { setOther({ ...other, cfdiUseCode: e.target.value }); setPreview(null); }} className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm">
                      {CFDI_USES.map((u) => (
                        <option key={u.Value} value={u.Value}>{u.Value} · {u.Name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Código postal fiscal</label>
                    <Input value={other.zipCode} onChange={(e) => { setOther({ ...other, zipCode: e.target.value.replace(/\D/g, '').slice(0, 5) }); setPreview(null); }} className="bg-white font-mono" inputMode="numeric" maxLength={5} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Correo (opcional, para enviar el CFDI)</label>
                    <Input type="email" value={other.email} onChange={(e) => setOther({ ...other, email: e.target.value })} className="bg-white" />
                  </div>
                </div>
              )}
              {receiverMode !== 'public' && (
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
                  Enviar el CFDI por correo al receptor
                </label>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500">Método de pago</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="free-method" checked={paymentMethod === 'PUE'} onChange={() => { setPaymentMethod('PUE'); setPreview(null); }} />
                PUE · pago en una sola exhibición
              </label>
              {paymentMethod === 'PUE' && (
                <select value={paymentForm} onChange={(e) => { setPaymentForm(e.target.value); setPreview(null); }} className="h-9 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm">
                  {PUE_FORMS.map((code) => (
                    <option key={code} value={code}>{code} · {getPaymentFormName(code)}</option>
                  ))}
                </select>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="free-method" checked={paymentMethod === 'PPD'} onChange={() => { setPaymentMethod('PPD'); setPreview(null); }} />
                PPD · parcialidades o diferido (forma 99)
              </label>
              <p className="pt-2 text-xs font-medium text-gray-500">Notas (van en el CFDI)</p>
              <Input value={notes} onChange={(e) => { setNotes(e.target.value); setPreview(null); }} placeholder="Ej. venta del sistema anterior, folio…" className="bg-gray-50" maxLength={300} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => void runPreview()} disabled={lines.length === 0 || !branchId || previewMutation.isPending}>
              {previewMutation.isPending ? 'Calculando…' : 'Vista previa'}
            </Button>
            <Button onClick={() => void runCreate()} disabled={!previewReady || createMutation.isPending} className="gap-2">
              <DocumentPlusIcon className="h-4 w-4" />
              {createMutation.isPending ? 'Timbrando…' : 'Timbrar CFDI'}
            </Button>
            {preview && !previewReady && <span className="text-xs text-amber-700">Corrige los avisos de la vista previa antes de timbrar.</span>}
          </div>
        </CardContent>
      </Card>

      {/* 4 · Vista previa */}
      {preview && (
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">4 · Vista previa · {money(preview.total)}</h2>
            <div className="mb-3 grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-gray-500">Receptor:</span> {preview.receiverName}{' '}
                <span className="font-mono text-xs text-gray-500">{preview.receiverRfc}</span>{' '}
                <span className="text-xs text-gray-500">· régimen {preview.receiverTaxRegimeCode} · uso {preview.receiverCfdiUseCode} · CP {preview.receiverZipCode}</span>
              </p>
              <p>
                <span className="text-gray-500">Expide:</span> {preview.branchCode} {preview.branchName} ·{' '}
                <span className="text-gray-500">Pago:</span> {preview.paymentMethod} · {preview.paymentForm} {getPaymentFormName(preview.paymentForm)} ·{' '}
                <span className="text-gray-500">Precios de lista:</span> {PRICE_TYPE_LABEL[preview.priceType] ?? preview.priceType}
              </p>
            </div>
            {preview.warnings.length > 0 && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="mb-1 font-medium">Avisos:</p>
                <ul className="list-disc pl-5">
                  {preview.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={TH}>Clave</th>
                    <th className={TH}>Concepto</th>
                    <th className={TH}>SAT</th>
                    <th className={`${TH} text-right`}>Cantidad</th>
                    <th className={`${TH} text-right`}>Unitario c/IVA</th>
                    <th className={TH}>IVA</th>
                    <th className={`${TH} text-right`}>Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.lines.map((l) => (
                    <tr key={l.lineNumber}>
                      <td className={`${TD} font-mono text-xs`}>{l.sku}</td>
                      <td className={TD}>{l.name}</td>
                      <td className={`${TD} font-mono text-xs text-gray-500`}>{l.satProductCode} · {l.satUnitCode}</td>
                      <td className={`${TD} text-right tabular-nums`}>{l.quantity}</td>
                      <td className={`${TD} text-right tabular-nums`}>{money(l.unitPrice)}</td>
                      <td className={`${TD} text-xs text-gray-600`}>{l.taxLabel}</td>
                      <td className={`${TD} text-right tabular-nums font-medium`}>{money(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className={TD} colSpan={6}>Subtotal</td>
                    <td className={`${TD} text-right tabular-nums`}>{money(preview.subtotal)}</td>
                  </tr>
                  <tr>
                    <td className={TD} colSpan={6}>IVA</td>
                    <td className={`${TD} text-right tabular-nums`}>{money(preview.taxes)}</td>
                  </tr>
                  <tr className="font-semibold">
                    <td className={TD} colSpan={6}>Total</td>
                    <td className={`${TD} text-right tabular-nums`}>{money(preview.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5 · Resultado */}
      {result && (
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">
              {result.error ? 'Resultado · con error' : 'Resultado · timbrada'}
            </h2>
            {result.error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                {result.error}
                {result.invoiceId && (
                  <>
                    {' '}
                    <Link href={`/admin/facturacion/${result.invoiceId}`} className="underline">ver intento</Link>
                  </>
                )}
              </p>
            ) : (
              <p className="text-sm text-gray-700">
                Folio{' '}
                <Link href={`/admin/facturacion/${result.invoiceId}`} className="font-medium text-[#3E667D] underline-offset-2 hover:underline">
                  {result.folioDisplay}
                </Link>{' '}
                · UUID <span className="font-mono text-xs text-gray-500">{result.satUuid}</span>
                {result.total != null && <> · {money(result.total)}</>}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
