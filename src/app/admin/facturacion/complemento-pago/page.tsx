// app/admin/facturacion/complemento-pago/page.tsx — Complemento de pago (CFDI P)
// Paso 1: buscador de facturas PPD con saldo (mismo RFC, selección múltiple).
// Paso 2: fecha/hora local, forma de pago (sin 99), monto, referencia e
// importe por documento (default = saldo; Σ = monto en vivo).
// Paso 3: vista previa de parcialidades calculada en el cliente (la BD manda)
// → ConfirmDialog → POST /billing/payment-complements con `idempotencyKey`
// (uuid v4 generado al abrir el formulario; se regenera solo tras éxito) →
// detalle del CFDI P. El API crea y timbra en la misma llamada: no hay
// botón "Timbrar" posterior.
'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  ArrowLeftIcon,
  DocumentDuplicateIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { PermissionGuard } from '@/components/auth';
import {
  useBillingStatus,
  useCreatePaymentComplement,
  useInvoice,
  useInvoices,
  usePaymentForms,
} from '@/hooks/useBilling';
import { billingErrorMessage, isBillingFlowDisabled } from '@/lib/billing-error';
import {
  buildPartialitiesPreview,
  parseAmount,
  round2,
  sum2,
  uuidV4,
  validateComplementDraft,
  type ComplementDocumentDraft,
} from '@/lib/payment-complement';
import { InvoiceStatus, SAT_PAYMENT_FORMS, formatCurrency, type InvoiceSummary } from '@/types/billing';
import { V2FlowsBanner } from '@/components/admin/billing/invoices/BillingStatusCards';
import { InvoiceStatusBadge } from '@/components/admin/billing/invoices/InvoiceBadges';
import { localDateInZone, useBranchTimezone } from '@/components/admin/billing/invoices/useBranchTimezone';

export default function ComplementoPagoPage() {
  return (
    <PermissionGuard permissions={['billing:manage', 'billing:*']}>
      <Suspense fallback={<div className="p-6"><Skeleton className="h-64 w-full" /></div>}>
        <ComplementoPagoContent />
      </Suspense>
    </PermissionGuard>
  );
}

function ComplementoPagoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillInvoiceId = searchParams.get('invoiceId');
  const { data: status } = useBillingStatus();
  const { branches, timezoneOf } = useBranchTimezone();
  const { data: paymentForms } = usePaymentForms();

  // Paso 1: buscador PPD
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);
  const ppd = useInvoices({
    paymentMethod: 'PPD',
    withBalance: true,
    status: InvoiceStatus.STAMPED,
    search: search || undefined,
    branchId: branchId || undefined,
    limit: 25,
  });

  // Selección (mismo RFC) con importes por documento
  const [selected, setSelected] = useState<Map<string, ComplementDocumentDraft>>(new Map());
  const selectedList = useMemo(() => Array.from(selected.values()), [selected]);
  const selectedRfc = selectedList[0]?.invoice.receiverRfc ?? null;

  // Prefill desde el detalle ("Registrar pago")
  const prefill = useInvoice(prefillInvoiceId ?? undefined);
  useEffect(() => {
    const inv = prefill.data;
    if (!inv || selected.has(inv.id)) return;
    if (inv.paymentMethodCode !== 'PPD' || !inv.outstandingBalance) return;
    setSelected((prev) => new Map(prev).set(inv.id, { invoice: inv, amountPaid: String(inv.outstandingBalance ?? 0) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill.data]);

  const toggle = (inv: InvoiceSummary) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(inv.id)) {
        next.delete(inv.id);
      } else {
        next.set(inv.id, { invoice: inv, amountPaid: String(inv.outstandingBalance ?? 0) });
      }
      return next;
    });
  };
  const setDocAmount = (id: string, amountPaid: string) =>
    setSelected((prev) => {
      const next = new Map(prev);
      const cur = next.get(id);
      if (cur) next.set(id, { ...cur, amountPaid });
      return next;
    });

  // Paso 2: datos del pago
  const firstBranchId = selectedList[0]?.invoice.branchId ?? null;
  const tz = timezoneOf(firstBranchId);
  const today = localDateInZone(tz);
  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentTime, setPaymentTime] = useState('12:00');
  const [paymentFormCode, setPaymentFormCode] = useState('03');
  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [operationNumber, setOperationNumber] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => uuidV4());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [flowDisabled, setFlowDisabled] = useState(false);

  // Monto = Σ documentos mientras el usuario no lo haya tocado.
  const docsSum = sum2(selectedList.map((d) => parseAmount(d.amountPaid)));
  useEffect(() => {
    if (!amountTouched) setAmount(docsSum > 0 ? docsSum.toFixed(2) : '');
  }, [docsSum, amountTouched]);

  const paymentFormOptions = useMemo(() => {
    const source = (paymentForms && paymentForms.length > 0 ? paymentForms : SAT_PAYMENT_FORMS).filter((f) => f.Value !== '99');
    return source.map((f) => ({ value: f.Value, label: `${f.Value} · ${f.Name}` }));
  }, [paymentForms]);

  // Paso 3: vista previa
  const rows = useMemo(() => buildPartialitiesPreview(selectedList), [selectedList]);
  const latestStampDate = selectedList.reduce<string | null>((acc, d) => {
    const s = d.invoice.stampedAt;
    return s && (!acc || s > acc) ? s : acc;
  }, null);
  const errors = validateComplementDraft({ amount, paymentDate, paymentFormCode, rows, latestStampDate, today });
  const canSubmit = errors.length === 0 && !flowDisabled;

  const create = useCreatePaymentComplement();
  const submit = async () => {
    try {
      const invoice = await create.mutateAsync({
        idempotencyKey,
        paymentDate,
        paymentTime: paymentTime || undefined,
        paymentFormCode,
        amount: parseAmount(amount),
        operationNumber: operationNumber.trim() || undefined,
        documents: rows.map((r) => ({ invoiceId: r.invoiceId, amountPaid: r.amountPaid })),
      });
      setIdempotencyKey(uuidV4()); // solo tras éxito: un reintento reutiliza la misma llave
      setConfirmOpen(false);
      router.push(`/admin/facturacion/${invoice.id}`);
    } catch (err) {
      if (isBillingFlowDisabled(err)) setFlowDisabled(true);
    }
  };

  const branchOptions = useMemo(() => branches.map((b) => ({ value: b.id, label: b.name, hint: b.code })), [branches]);

  const columns: DataTableColumn<InvoiceSummary>[] = [
    {
      key: 'folio',
      header: 'Factura',
      render: (inv) => (
        <div>
          <Link href={`/admin/facturacion/${inv.id}`} className="font-mono text-sm font-semibold text-[#3E667D] hover:underline" target="_blank">{inv.folioDisplay}</Link>
          <p className="max-w-[220px] truncate font-mono text-[11px] text-gray-500" title={inv.satUuid ?? undefined}>{inv.satUuid}</p>
        </div>
      ),
    },
    {
      key: 'receiver',
      header: 'Receptor',
      render: (inv) => (
        <div>
          <p className="font-mono text-sm">{inv.receiverRfc}</p>
          <p className="max-w-[220px] truncate text-xs text-gray-600">{inv.receiverName}</p>
        </div>
      ),
    },
    { key: 'branch', header: 'Sucursal', render: (inv) => <span className="text-sm">{inv.branchName ?? '—'}</span> },
    { key: 'total', header: 'Total', headerClassName: 'text-right', cellClassName: 'text-right', render: (inv) => formatCurrency(inv.total) },
    { key: 'paid', header: 'Pagado', headerClassName: 'text-right', cellClassName: 'text-right', render: (inv) => formatCurrency(inv.paidAmount) },
    { key: 'balance', header: 'Saldo', headerClassName: 'text-right', cellClassName: 'text-right', render: (inv) => <span className="font-semibold text-amber-700">{formatCurrency(inv.outstandingBalance ?? 0)}</span> },
    { key: 'parc', header: 'Parcialidades', headerClassName: 'text-center', cellClassName: 'text-center', render: (inv) => inv.partialitiesCount },
    { key: 'status', header: 'Estado', render: (inv) => <InvoiceStatusBadge status={inv.providerStatus} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white">
              <Link href="/admin/facturacion" aria-label="Volver a facturas"><ArrowLeftIcon className="h-6 w-6" /></Link>
            </Button>
            <div>
              <div className="mb-1 flex items-center gap-3">
                <DocumentDuplicateIcon className="h-10 w-10" aria-hidden />
                <h1 className="text-4xl font-bold">Complemento de pago</h1>
              </div>
              <p className="text-lg text-white/80">Registra un pago recibido sobre facturas PPD y timbra el CFDI de pago</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <V2FlowsBanner status={status} />
        {flowDisabled && status?.v2FlowsEnabled !== false && (
          <Card className="border-amber-200 bg-amber-50" role="status">
            <CardContent className="p-4 text-sm text-amber-900">Los flujos de v2 están cerrados; el sistema anterior sigue facturando.</CardContent>
          </Card>
        )}

        {/* Paso 1 */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">1. Facturas PPD con saldo</h2>
            <p className="mb-4 text-sm text-gray-600">Elige una o varias facturas del <strong>mismo receptor</strong>. Cada una aporta un documento relacionado al CFDI de pago.</p>
            <div className="mb-4 grid gap-3 md:grid-cols-12">
              <div className="md:col-span-8">
                <Label htmlFor="pc-search" className="sr-only">Buscar</Label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
                  <Input id="pc-search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Folio, UUID, RFC o razón social" className="pl-10" autoComplete="off" />
                </div>
              </div>
              <div className="md:col-span-4">
                <SearchableSelect aria-label="Sucursal" options={branchOptions} value={branchId} onChange={setBranchId} allLabel="Todas las sucursales" />
              </div>
            </div>
            {ppd.isError ? (
              <p className="text-sm text-red-700" role="alert">{billingErrorMessage(ppd.error, 'No se pudieron cargar las facturas PPD')}</p>
            ) : (
              <DataTable
                columns={columns}
                data={ppd.data?.data ?? []}
                isLoading={ppd.isLoading}
                getRowKey={(inv) => inv.id}
                minWidthClassName="min-w-[960px]"
                enableRowSelection
                selectedRowKeys={selectedList.map((d) => d.invoice.id)}
                onSelectedRowKeysChange={(keys) => {
                  const visible = ppd.data?.data ?? [];
                  setSelected((prev) => {
                    const next = new Map(prev);
                    for (const inv of visible) {
                      const want = keys.includes(inv.id);
                      if (want && !next.has(inv.id)) next.set(inv.id, { invoice: inv, amountPaid: String(inv.outstandingBalance ?? 0) });
                      if (!want && next.has(inv.id)) next.delete(inv.id);
                    }
                    return next;
                  });
                }}
                emptyMessage="No hay facturas PPD timbradas con saldo pendiente."
              />
            )}
            {selectedRfc && (
              <p className="mt-3 text-xs text-gray-600">
                Receptor seleccionado: <span className="font-mono">{selectedRfc}</span>. Las facturas de otro RFC se rechazan al confirmar.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Paso 2 */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">2. Datos del pago</h2>
            <div className="grid gap-4 md:grid-cols-12">
              <div className="md:col-span-3">
                <Label htmlFor="pc-date">Fecha de pago (zona {tz})</Label>
                <Input id="pc-date" type="date" value={paymentDate} max={today} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="pc-time">Hora</Label>
                <Input id="pc-time" type="time" value={paymentTime} onChange={(e) => setPaymentTime(e.target.value)} />
              </div>
              <div className="md:col-span-4">
                <Label htmlFor="pc-form">Forma de pago (SAT)</Label>
                <SearchableSelect id="pc-form" options={paymentFormOptions} value={paymentFormCode} onChange={setPaymentFormCode} showAllOption={false} />
              </div>
              <div className="md:col-span-3">
                <Label htmlFor="pc-amount">Monto del pago</Label>
                <Input
                  id="pc-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => {
                    setAmountTouched(true);
                    setAmount(e.target.value);
                  }}
                  aria-describedby="pc-amount-help"
                />
                <p id="pc-amount-help" className="mt-1 text-xs text-gray-500">
                  Suma de documentos: {formatCurrency(docsSum)}
                  {amountTouched && (
                    <>
                      {' · '}
                      <button type="button" className="text-[#3E667D] underline" onClick={() => { setAmountTouched(false); setAmount(docsSum.toFixed(2)); }}>
                        igualar
                      </button>
                    </>
                  )}
                </p>
              </div>
              <div className="md:col-span-6">
                <Label htmlFor="pc-ref">Referencia / número de operación (opcional)</Label>
                <Input id="pc-ref" value={operationNumber} onChange={(e) => setOperationNumber(e.target.value)} maxLength={100} autoComplete="off" />
              </div>
            </div>

            {selectedList.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 text-sm font-semibold text-gray-800">Importe por documento</h3>
                <div className="space-y-2">
                  {selectedList.map((d) => (
                    <div key={d.invoice.id} className="grid items-center gap-2 rounded-lg border p-3 md:grid-cols-12">
                      <div className="md:col-span-5">
                        <p className="font-mono text-sm font-medium">{d.invoice.folioDisplay}</p>
                        <p className="text-xs text-gray-500">{d.invoice.receiverRfc} · saldo {formatCurrency(d.invoice.outstandingBalance ?? 0)}</p>
                      </div>
                      <div className="md:col-span-4">
                        <Label htmlFor={`pc-doc-${d.invoice.id}`} className="sr-only">Importe pagado de {d.invoice.folioDisplay}</Label>
                        <Input
                          id={`pc-doc-${d.invoice.id}`}
                          type="number"
                          inputMode="decimal"
                          min="0.01"
                          step="0.01"
                          max={round2(Number(d.invoice.outstandingBalance ?? 0))}
                          value={d.amountPaid}
                          onChange={(e) => setDocAmount(d.invoice.id, e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end md:col-span-3">
                        <Button variant="ghost" size="sm" onClick={() => toggle(d.invoice)}>Quitar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paso 3 */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">3. Vista previa de parcialidades</h2>
            <p className="mb-4 text-sm text-gray-600">Calculada aquí para revisión; el API vuelve a calcular saldos y parcialidades desde la base de datos al timbrar.</p>
            {rows.length === 0 ? (
              <p className="text-sm text-gray-500">Selecciona facturas en el paso 1.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Factura</TableHead>
                      <TableHead className="text-center">Parcialidad</TableHead>
                      <TableHead className="text-right">Saldo anterior</TableHead>
                      <TableHead className="text-right">Pagado</TableHead>
                      <TableHead className="text-right">Saldo insoluto</TableHead>
                      <TableHead>Revisión</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.invoiceId}>
                        <TableCell className="font-mono text-sm">{r.folioDisplay}</TableCell>
                        <TableCell className="text-center">{r.partialityNumber}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.previousBalance)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.amountPaid)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.outstandingBalance)}</TableCell>
                        <TableCell>{r.error ? <Badge variant="destructive">{r.error}</Badge> : <Badge variant="success">Correcto</Badge>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium">Total del pago</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(sum2(rows.map((r) => r.amountPaid)))}</TableCell>
                      <TableCell colSpan={2} className="text-sm text-gray-600">Monto capturado: {formatCurrency(parseAmount(amount))}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
            {errors.length > 0 && rows.length > 0 && (
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-red-700" role="alert">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button asChild variant="outline"><Link href="/admin/facturacion">Cancelar</Link></Button>
              <Button onClick={() => setConfirmOpen(true)} disabled={!canSubmit || create.isPending}>
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Timbrar complemento
              </Button>
            </div>
          </CardContent>
        </Card>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Timbrar complemento de pago"
          description="Se crea el CFDI de pago y se envía al PAC en la misma operación (consume un timbre). Los saldos de las facturas se actualizan al confirmar el SAT."
          confirmLabel="Timbrar"
          isPending={create.isPending}
          onConfirm={submit}
        >
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-gray-50 p-3 text-sm">
            <dt className="text-gray-500">Receptor</dt>
            <dd className="font-mono">{selectedRfc ?? '—'}</dd>
            <dt className="text-gray-500">Fecha de pago</dt>
            <dd>{paymentDate} {paymentTime}</dd>
            <dt className="text-gray-500">Forma de pago</dt>
            <dd>{paymentFormOptions.find((o) => o.value === paymentFormCode)?.label ?? paymentFormCode}</dd>
            <dt className="text-gray-500">Monto</dt>
            <dd className="font-semibold">{formatCurrency(parseAmount(amount))}</dd>
            <dt className="text-gray-500">Documentos</dt>
            <dd>{rows.length}</dd>
          </dl>
          <p className="mt-2 font-mono text-[11px] text-gray-400">Llave de idempotencia: {idempotencyKey}</p>
        </ConfirmDialog>
      </div>
    </div>
  );
}
