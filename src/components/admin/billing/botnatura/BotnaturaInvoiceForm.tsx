'use client';

// BotnaturaInvoiceForm - Factura de Tonic Life a Botnatura (17-nov-2026). El receptor SIEMPRE
// es Botnatura (sus datos fiscales se guardan una vez en "Datos de Botnatura") y los conceptos
// salen del catálogo propio de Botnatura, no del de Tonic Life. Contabilidad elige en cada
// factura con qué precio sale: "Precio" o "Precio venta" (los dos ya incluyen IVA), y puede
// cambiarlo o capturar otro en un concepto. Derecha: resumen VIVO (POST billing/botnatura/
// invoices/preview) y el botón de timbrar (POST billing/botnatura/invoices).
// Solo fiscal: no genera venta, no descuenta inventario ni suma puntos. Permiso billing:manual.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  DocumentPlusIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { BotnaturaBatchDialog } from './BotnaturaBatchDialog';
import { useActiveBranches } from '@/hooks/useBranches';
import {
  useBotnaturaProducts,
  useBotnaturaSettings,
  useCreateBotnaturaInvoice,
  usePreviewBotnaturaInvoice,
} from '@/hooks/useBotnatura';
import { billingErrorMessage } from '@/lib/billing-error';
import {
  BOTNATURA_LINE_LABEL,
  BOTNATURA_PRICE_LABEL,
  LINE_BADGE,
  draftBlockers,
  draftTotal,
  lineOf,
  lineProblem,
  lineTotal,
  lineUnitPrice,
  priceModeLabel,
  toInvoiceRequest,
  type BotnaturaDraft,
  type BotnaturaInvoiceMode,
  type BotnaturaLineDraft,
} from '@/lib/billing/botnatura';
import { addBatchToLines, type BatchRow } from '@/lib/billing/botnatura-batch';
import { moneyMx as money } from '@/lib/billing/manual-free';
import { downloadInvoiceFile } from '@/lib/invoice-download';
import { getPaymentFormName } from '@/types/billing';
import type {
  BotnaturaCreateResponse,
  BotnaturaInvoiceRequest,
  BotnaturaLine,
  BotnaturaPreview,
  BotnaturaPriceMode,
  BotnaturaProduct,
} from '@/types/botnatura';

const PUE_FORMS = ['03', '01', '02', '04', '28'];
const TH = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap';
const TD = 'px-3 py-2 text-sm align-top';
const SELECT = 'h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm';

type PreviewState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: BotnaturaPreview | null;
  error: string | null;
};

interface Props {
  onViewList: () => void;
  onEditSettings: () => void;
  onEditCatalog: () => void;
}

export function BotnaturaInvoiceForm({ onViewList, onEditSettings, onEditCatalog }: Props) {
  const settings = useBotnaturaSettings();
  const receiver = settings.data?.receiver;
  const { data: branches } = useActiveBranches();
  const branchOptions = useMemo(
    () => (branches ?? []).map((b) => ({ value: b.id, label: `${b.code} - ${b.name}` })),
    [branches],
  );
  // Sin elegir a mano, la sucursal que expide es la guardada en "Datos de Botnatura".
  const [branchChoice, setBranchChoice] = useState<string | null>(null);
  const branchId = branchChoice ?? settings.data?.defaultBranchId ?? '';
  const [invoiceMode, setInvoiceMode] = useState<BotnaturaInvoiceMode | null>(null);
  const [lines, setLines] = useState<BotnaturaLineDraft[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'PUE' | 'PPD'>('PPD');
  const [paymentForm, setPaymentForm] = useState('03');
  const [notes, setNotes] = useState('');
  const [sendEmailChoice, setSendEmailChoice] = useState<boolean | null>(null);
  const sendEmail = !!receiver?.email && (sendEmailChoice ?? true);

  // Buscador del catálogo de Botnatura (clave o parte del nombre).
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  // En cuál línea se busca ('' = las dos): la misma clave existe en ambas con otro producto.
  const [searchLine, setSearchLine] = useState<BotnaturaLine | ''>('');
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const searchable = term.length >= 2;
  const results = useBotnaturaProducts(
    { search: term, limit: 12, ...(searchLine ? { line: searchLine } : {}) },
    { enabled: searchable },
  );
  const matches = searchable && term === search.trim() ? (results.data?.data ?? []) : [];

  const addProduct = (p: BotnaturaProduct) => {
    setLines((prev) => {
      const at = prev.findIndex((l) => l.product.id === p.id && l.priceMode === null);
      if (at >= 0) {
        return prev.map((l, i) => (i === at ? { ...l, quantity: String((Number(l.quantity) || 0) + 1) } : l));
      }
      return [...prev, { product: p, quantity: '1', priceMode: null, customPrice: '' }];
    });
    setSearch('');
    searchRef.current?.focus();
  };
  // Captura por lote: renglones "clave,cantidad" pegados de una vez.
  const [batchOpen, setBatchOpen] = useState(false);
  const addBatch = (rows: BatchRow[]) => setLines((prev) => addBatchToLines(prev, rows));
  const updateLine = (index: number, patch: Partial<BotnaturaLineDraft>) =>
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));

  const draft: BotnaturaDraft = useMemo(
    () => ({
      settingsReady: !!settings.data?.ready,
      missing: settings.data?.missing ?? [],
      branchId,
      invoiceMode,
      paymentMethod,
      paymentForm,
      lines,
    }),
    [settings.data, branchId, invoiceMode, paymentMethod, paymentForm, lines],
  );
  const blockers = useMemo(() => (settings.isLoading ? [] : draftBlockers(draft)), [settings.isLoading, draft]);
  const localTotal = draftTotal(lines, invoiceMode);

  // Vista previa automática: notas y correo no cambian cifras, van fuera de la llave.
  const previewKey =
    !settings.isLoading && blockers.length === 0
      ? JSON.stringify(toInvoiceRequest(draft, { sendEmail: false, notes: '' }))
      : '';
  // El resultado se guarda con la llave que lo produjo: el estado (calculando, lista, con error)
  // se deduce comparándola con la llave actual, sin tocar el estado dentro del efecto.
  const [previewResult, setPreviewResult] = useState<{
    key: string;
    data: BotnaturaPreview | null;
    error: string | null;
  } | null>(null);
  const [result, setResult] = useState<BotnaturaCreateResponse | null>(null);
  const { mutateAsync: previewAsync } = usePreviewBotnaturaInvoice();
  const createMutation = useCreateBotnaturaInvoice();
  useEffect(() => {
    if (!previewKey) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const data = await previewAsync(JSON.parse(previewKey) as BotnaturaInvoiceRequest);
        if (!cancelled) setPreviewResult({ key: previewKey, data, error: null });
      } catch (err) {
        if (!cancelled) {
          setPreviewResult({
            key: previewKey,
            data: null,
            error: billingErrorMessage(err, 'No se pudo calcular la vista previa'),
          });
        }
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [previewKey, previewAsync]);
  const preview: PreviewState = !previewKey
    ? { status: 'idle', data: null, error: null }
    : previewResult?.key === previewKey
      ? { status: previewResult.error ? 'error' : 'ready', data: previewResult.data, error: previewResult.error }
      : { status: 'loading', data: null, error: null };

  const warnings = preview.data?.warnings ?? [];
  const readyToStamp =
    blockers.length === 0 && preview.status === 'ready' && warnings.length === 0 && !createMutation.isPending;

  const runCreate = async () => {
    if (!readyToStamp || !preview.data) return;
    const question = `Se timbrará 1 CFDI ${paymentMethod} a ${preview.data.receiverName} por ${money(preview.data.total)} (${priceModeLabel(preview.data.priceMode)}). ¿Continuar?`;
    if (!window.confirm(question)) return;
    try {
      const r = await createMutation.mutateAsync(toInvoiceRequest(draft, { sendEmail, notes }));
      setResult(r);
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

  if (settings.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
        {billingErrorMessage(settings.error, 'No se pudieron leer los datos de Botnatura')}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <Card>
          <CardContent className="p-5">
            <StepTitle n={1} title="A quién se factura" />
            {settings.isLoading ? (
              <div className="h-16 animate-pulse rounded-lg bg-gray-100" />
            ) : settings.data?.ready && receiver ? (
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-gray-900">{receiver.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-gray-600">{receiver.rfc}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Régimen {receiver.taxRegimeCode} · Uso {receiver.cfdiUseCode} · C.P. {receiver.zipCode}
                    {receiver.email ? ` · ${receiver.email}` : ''}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onEditSettings}>
                  <PencilSquareIcon className="h-4 w-4" />
                  Editar datos
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>
                    Antes de facturar hay que capturar los datos fiscales de Botnatura
                    {settings.data?.missing.length ? `: falta ${settings.data.missing.join(', ')}.` : '.'}
                  </span>
                </p>
                <Button type="button" size="sm" onClick={onEditSettings}>
                  Capturar datos fiscales
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <StepTitle n={2} title="Sucursal y precio" />
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Sucursal que expide</label>
                <SearchableSelect
                  options={branchOptions}
                  value={branchId}
                  onChange={setBranchChoice}
                  showAllOption={false}
                  placeholder="Buscar sucursal…"
                  className="w-full"
                />
                <p className="mt-1 text-xs text-gray-400">Lugar de expedición y serie del CFDI.</p>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-gray-600">¿Con qué precio se factura?</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['sale', 'list'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={invoiceMode === mode}
                      onClick={() => setInvoiceMode(mode)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        invoiceMode === mode
                          ? 'border-[#3E667D] bg-[#3E667D]/5 ring-1 ring-[#3E667D]'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="block text-sm font-semibold text-gray-900">{BOTNATURA_PRICE_LABEL[mode]}</span>
                      <span className="mt-0.5 block text-xs text-gray-500">
                        {mode === 'sale' ? 'La mitad del "Precio"' : 'El precio completo del catálogo'}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Los dos ya incluyen IVA. Se puede cambiar en cada producto.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <StepTitle n={3} title="Productos" />
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-xs font-medium text-gray-600">Buscar en</span>
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1" role="tablist" aria-label="Línea de producto">
                {(
                  [
                    ['', 'Las dos líneas'],
                    ['regular', BOTNATURA_LINE_LABEL.regular],
                    ['line2', BOTNATURA_LINE_LABEL.line2],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={searchLine === value}
                    onClick={() => setSearchLine(value)}
                    className={`rounded-md px-3 py-1 font-medium transition-colors ${searchLine === value ? 'bg-[#3E667D] text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => setBatchOpen(true)}
                title="Pega renglones clave,cantidad (por ejemplo 1020,100) y agrégalos de una vez"
              >
                <ClipboardDocumentListIcon className="h-4 w-4" />
                Agregar por lote
              </Button>
            </div>
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar en el catálogo de Botnatura por clave o nombre…"
                className="bg-gray-50 pl-9"
                aria-label="Buscar producto de Botnatura"
              />
              {searchable && term === search.trim() && (
                <div className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {results.isFetching && matches.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500">Buscando…</p>
                  ) : matches.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500">
                      Nada con “{term}” en el catálogo de Botnatura.{' '}
                      <button type="button" className="font-medium text-[#3E667D] underline" onClick={onEditCatalog}>
                        Ver el catálogo
                      </button>
                    </p>
                  ) : (
                    matches.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProduct(p)}
                        className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-gray-50"
                      >
                        <span className="min-w-0">
                          <span className="font-mono text-xs text-gray-500">{p.code}</span>{' '}
                          <span className="text-gray-900">{p.name}</span>{' '}
                          <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${LINE_BADGE[lineOf(p)]}`}>
                            {BOTNATURA_LINE_LABEL[lineOf(p)]}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-xs text-gray-500">
                          {p.salePrice === null && p.listPrice === null
                            ? 'Sin precio'
                            : `${p.salePrice !== null ? money(p.salePrice) : '—'} · ${p.listPrice !== null ? money(p.listPrice) : '—'}`}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {lines.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                Busca un producto de Botnatura y elígelo para agregarlo a la factura, o usa «Agregar por lote» para pegar
                varios renglones clave,cantidad.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={TH}>Producto</th>
                      <th className={`${TH} w-24`}>Cantidad</th>
                      <th className={`${TH} w-72`}>Precio</th>
                      <th className={`${TH} text-right`}>Unitario</th>
                      <th className={`${TH} text-right`}>Importe</th>
                      <th className={TH} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {lines.map((line, i) => (
                      <LineRow
                        key={`${line.product.id}-${i}`}
                        line={line}
                        invoiceMode={invoiceMode}
                        onChange={(patch) => updateLine(i, patch)}
                        onRemove={() => removeLine(i)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-xs text-gray-400">Los precios y los importes ya incluyen IVA (16 %).</p>
            {batchOpen && (
              <BotnaturaBatchDialog defaultLine={searchLine} onAdd={addBatch} onClose={() => setBatchOpen(false)} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <StepTitle n={4} title="Pago" />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs font-medium text-gray-600">Método de pago</p>
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm">
                  <Segment
                    active={paymentMethod === 'PPD'}
                    onClick={() => setPaymentMethod('PPD')}
                    label="PPD"
                    hint="a crédito · forma 99"
                  />
                  <Segment
                    active={paymentMethod === 'PUE'}
                    onClick={() => setPaymentMethod('PUE')}
                    label="PUE"
                    hint="una exhibición"
                  />
                </div>
                {paymentMethod === 'PPD' ? (
                  <p className="mt-2 text-xs text-gray-500">
                    Sale con forma de pago 99 · Por definir: queda con saldo por cobrar y se liquida después con un
                    complemento de pago.
                  </p>
                ) : (
                  <select
                    value={paymentForm}
                    onChange={(e) => setPaymentForm(e.target.value)}
                    className={`${SELECT} mt-2`}
                    aria-label="Forma de pago"
                  >
                    {PUE_FORMS.map((code) => (
                      <option key={code} value={code}>
                        {code} · {getPaymentFormName(code)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-gray-600">
                  Notas <span className="font-normal text-gray-400">(van en el CFDI)</span>
                </p>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. pedido, orden de compra…"
                  className="bg-gray-50"
                  maxLength={300}
                />
                <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    disabled={!receiver?.email}
                    onChange={(e) => setSendEmailChoice(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  {receiver?.email
                    ? `Enviar el CFDI a ${receiver.email}`
                    : 'Sin correo de Botnatura guardado: no se envía por correo'}
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        {result && !result.error ? (
          <Card className="border-emerald-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircleIcon className="h-6 w-6" />
                <h2 className="text-base font-semibold">CFDI timbrado</h2>
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900">{result.folioDisplay ?? 'Sin folio'}</p>
              <p className="text-sm text-gray-600">
                A Botnatura por {result.total !== null ? money(result.total) : '—'}
              </p>
              {result.satUuid && <p className="mt-1 break-all font-mono text-xs text-gray-500">{result.satUuid}</p>}
              {result.invoiceId && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void downloadInvoiceFile('pdf', result.invoiceId as string, result.folioDisplay)}
                  >
                    PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void downloadInvoiceFile('xml', result.invoiceId as string, result.folioDisplay)}
                  >
                    XML
                  </Button>
                  <Button asChild variant="outline" className="col-span-2">
                    <Link href={`/admin/facturacion/${result.invoiceId}`}>Ver la factura</Link>
                  </Button>
                </div>
              )}
              <Button type="button" className="mt-2 w-full" onClick={() => setResult(null)}>
                Nueva factura
              </Button>
              <Button type="button" variant="ghost" size="sm" className="mt-1 w-full text-gray-500" onClick={onViewList}>
                Ver facturas de Botnatura
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Summary
            preview={preview}
            blockers={blockers}
            warnings={warnings}
            localTotal={localTotal}
            concepts={lines.length}
            paymentLabel={
              paymentMethod === 'PPD' ? 'PPD · 99 Por definir' : `PUE · ${paymentForm} ${getPaymentFormName(paymentForm)}`
            }
            priceLabel={invoiceMode ? BOTNATURA_PRICE_LABEL[invoiceMode] : 'Sin elegir'}
            failed={result?.error ? result : null}
            stamping={createMutation.isPending}
            canStamp={readyToStamp}
            onStamp={() => void runCreate()}
          />
        )}
      </div>
    </div>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#3E667D] text-xs font-bold text-white"
        aria-hidden
      >
        {n}
      </span>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
    </div>
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

function LineRow({
  line,
  invoiceMode,
  onChange,
  onRemove,
}: {
  line: BotnaturaLineDraft;
  invoiceMode: BotnaturaInvoiceMode | null;
  onChange: (patch: Partial<BotnaturaLineDraft>) => void;
  onRemove: () => void;
}) {
  const problem = lineProblem(line, invoiceMode);
  const unit = lineUnitPrice(line, invoiceMode);
  const total = lineTotal(line, invoiceMode);
  const priced = (value: number | null) => (value !== null ? ` ${money(value)}` : ' (sin precio)');
  return (
    <tr>
      <td className={TD}>
        <span className="font-mono text-xs text-gray-500">{line.product.code}</span>{' '}
        <span className="text-gray-900">{line.product.name}</span>{' '}
        <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${LINE_BADGE[lineOf(line.product)]}`}>
          {BOTNATURA_LINE_LABEL[lineOf(line.product)]}
        </span>
        {problem && <p className="mt-0.5 text-xs text-red-600">{problem}</p>}
      </td>
      <td className={TD}>
        <Input
          value={line.quantity}
          onChange={(e) => onChange({ quantity: e.target.value.replace(/[^\d.]/g, '') })}
          inputMode="decimal"
          className="h-9 w-20 text-right tabular-nums"
          aria-label={`Cantidad de ${line.product.name}`}
        />
      </td>
      <td className={TD}>
        <select
          value={line.priceMode ?? ''}
          onChange={(e) => onChange({ priceMode: (e.target.value || null) as BotnaturaPriceMode | null })}
          className={SELECT}
          aria-label={`Precio de ${line.product.name}`}
        >
          <option value="">El de la factura{invoiceMode ? ` (${BOTNATURA_PRICE_LABEL[invoiceMode]})` : ''}</option>
          <option value="sale">Precio venta{priced(line.product.salePrice)}</option>
          <option value="list">Precio{priced(line.product.listPrice)}</option>
          <option value="custom">Otro precio</option>
        </select>
        {line.priceMode === 'custom' && (
          <Input
            value={line.customPrice}
            onChange={(e) => onChange({ customPrice: e.target.value.replace(/[^\d.]/g, '') })}
            inputMode="decimal"
            placeholder="Precio con IVA"
            className="mt-1 h-9 text-right tabular-nums"
            aria-label={`Precio con IVA de ${line.product.name}`}
          />
        )}
      </td>
      <td className={`${TD} text-right tabular-nums text-gray-700`}>{unit !== null ? money(unit) : '—'}</td>
      <td className={`${TD} text-right font-medium tabular-nums text-gray-900`}>{total !== null ? money(total) : '—'}</td>
      <td className={`${TD} text-right`}>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
          aria-label={`Quitar ${line.product.name}`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function Summary({
  preview,
  blockers,
  warnings,
  localTotal,
  concepts,
  paymentLabel,
  priceLabel,
  failed,
  stamping,
  canStamp,
  onStamp,
}: {
  preview: PreviewState;
  blockers: string[];
  warnings: string[];
  localTotal: number | null;
  concepts: number;
  paymentLabel: string;
  priceLabel: string;
  failed: BotnaturaCreateResponse | null;
  stamping: boolean;
  canStamp: boolean;
  onStamp: () => void;
}) {
  const data = preview.status === 'ready' ? preview.data : null;
  const total = data ? data.total : localTotal;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Resumen</h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {blockers.length > 0
              ? 'Capturando'
              : preview.status === 'loading'
                ? 'Calculando…'
                : preview.status === 'error'
                  ? 'Con error'
                  : warnings.length > 0
                    ? 'Revisa avisos'
                    : preview.status === 'ready'
                      ? 'Lista para timbrar'
                      : 'Capturando'}
          </span>
        </div>
        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Receptor</dt>
            <dd className="text-right text-gray-900">{data?.receiverName ?? 'Botnatura'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Precio</dt>
            <dd className="text-right text-gray-900">{data ? priceModeLabel(data.priceMode) : priceLabel}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Pago</dt>
            <dd className="text-right text-gray-900">{paymentLabel}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Conceptos</dt>
            <dd className="text-right tabular-nums text-gray-900">{concepts}</dd>
          </div>
        </dl>
        <div className="mt-4 space-y-1 border-t border-gray-100 pt-4 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="tabular-nums">{data ? money(data.subtotal) : '—'}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>IVA</span>
            <span className="tabular-nums">{data ? money(data.taxes) : '—'}</span>
          </div>
          <div className="flex items-baseline justify-between pt-1 text-gray-900">
            <span className="font-semibold">Total</span>
            <span className="text-2xl font-bold tabular-nums">{total !== null ? money(total) : '—'}</span>
          </div>
        </div>

        {blockers.length > 0 && (
          <ul className="mt-4 space-y-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            {blockers.map((b) => (
              <li key={b} className="flex items-start gap-1.5">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                {b}
              </li>
            ))}
          </ul>
        )}
        {preview.status === 'error' && preview.error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800" role="alert">
            {preview.error}
          </p>
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
        {failed && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800" role="alert">
            <p className="font-medium">No se timbró</p>
            <p className="mt-0.5">{failed.error}</p>
            {failed.invoiceId && (
              <Link href={`/admin/facturacion/${failed.invoiceId}`} className="mt-1 inline-block font-medium underline">
                Ver la factura con error
              </Link>
            )}
          </div>
        )}

        <Button type="button" onClick={onStamp} disabled={!canStamp} className="mt-4 w-full gap-2">
          {stamping ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <DocumentPlusIcon className="h-4 w-4" />}
          {stamping ? 'Timbrando…' : 'Timbrar CFDI'}
        </Button>
        <p className="mt-4 flex items-start gap-1.5 text-xs text-gray-500">
          <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          Solo emite el CFDI a Botnatura: no genera venta, no descuenta inventario ni suma puntos.
        </p>
      </CardContent>
    </Card>
  );
}
