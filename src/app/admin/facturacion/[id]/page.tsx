// app/admin/facturacion/[id]/page.tsx — Detalle de una factura CFDI (Fase 2)
// Lee `InvoiceDetailDto` (GET /billing/invoices/:id): receptor, emisor,
// origen, conceptos con desglose por tasa, archivos, correos, cancelación,
// relación/sustitución, global (tickets incluidos/liberados), PPD y pago.
// Las acciones salen de `actions.*` del servidor Y del permiso billing:manage.
// Timbrado ambiguo (`actions.canResolveAmbiguous`): tarjeta AmbiguousStampCard;
// solo super_admin resuelve, el resto la ve en solo lectura.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
  useCfdiUses,
  useDiscardGlobalInvoice,
  useDiscardInvoice,
  useFiscalRegimes,
  useInvoice,
  useInvoiceFiles,
  useRefreshInvoiceStatus,
  useReissueGlobalInvoice,
  useReplaceInvoice,
  useStampInvoice,
} from '@/hooks/useBilling';
import { useAppSelector } from '@/store/hooks';
import { selectUserRoles } from '@/store/slices/authSlice';
import {
  billingErrorGlobalInvoiceId,
  billingErrorMessage,
  billingFieldLabel,
  isBillingErrorCode,
} from '@/lib/billing-error';
import { downloadInvoiceFile, openInvoicePdf } from '@/lib/invoice-download';
import {
  InvoiceStatus,
  cfdiUseLabel,
  fiscalRegimeLabel,
  formatCurrency,
  getPaymentFormName,
  type GlobalDocumentDto,
} from '@/types/billing';
import { useCanManageBilling } from '@/components/admin/billing/readiness/useCanManageBilling';
import { InvoiceStatusBadge, InvoiceTypeBadge, SatStatusBadge } from '@/components/admin/billing/invoices/InvoiceBadges';
import { CancelInvoiceDialog, isCancellationRejected } from '@/components/admin/billing/invoices/CancelInvoiceDialog';
import { AmbiguousStampCard } from '@/components/admin/billing/invoices/AmbiguousStampCard';
import { SendInvoiceEmailDialog } from '@/components/admin/billing/invoices/SendInvoiceEmailDialog';
import { useCustomerFiscalEditor } from '@/components/admin/billing/invoices/useCustomerFiscalEditor';
import { useBranchTimezone, formatIsoDate } from '@/components/admin/billing/invoices/useBranchTimezone';
import {
  CANCELLATION_REASON_INFO,
  PAYMENT_METHOD_LABELS,
  invoiceTypeLabel,
} from '@/components/admin/billing/invoices/labels';

const RECEIVER_FIELD_PREFIXES = ['Receiver.', 'receiver.'];

/** Marca en la URL tras una reexpedición donde el PAC rechazó la relación 04. */
const RELATION_DROPPED_PARAM = 'aviso';
const RELATION_DROPPED_VALUE = 'sin-relacion';

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = String(params.id ?? '');
  return (
    <PermissionGuard permissions={['billing:read', 'billing:*']}>
      <InvoiceDetailContent invoiceId={invoiceId} />
    </PermissionGuard>
  );
}

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-medium text-gray-900 ${mono ? 'font-mono break-all' : ''}`}>{value ?? '—'}</p>
    </div>
  );
}

function GlobalDocumentsTable({ docs, released }: { docs: GlobalDocumentDto[]; released?: boolean }) {
  if (docs.length === 0) {
    return <p className="text-sm text-gray-500">{released ? 'Ningún ticket liberado.' : 'Sin tickets.'}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Documento</TableHead>
            <TableHead>Día</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
            <TableHead className="text-right">IVA</TableHead>
            <TableHead className="text-right">Total</TableHead>
            {released && <TableHead>Liberado</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-mono text-sm">
                {d.documentNumber}
                <span className="ml-1 text-xs text-gray-500">{(d.kind ?? d.sourceType) === 'order' ? 'pedido' : 'ticket'}</span>
              </TableCell>
              <TableCell className="text-sm">{formatIsoDate(d.localDate)}</TableCell>
              <TableCell className="text-right text-sm">{formatCurrency(d.subtotal)}</TableCell>
              <TableCell className="text-right text-sm">{formatCurrency(d.taxAmount)}</TableCell>
              <TableCell className="text-right text-sm font-medium">{formatCurrency(d.total)}</TableCell>
              {released && (
                <TableCell className="text-xs text-gray-600">
                  {d.releasedReason === 'nominative_issued' ? 'Se emitió nominativa' : d.releasedReason === 'global_cancelled' ? 'Global cancelada' : '—'}
                  {d.nominativeInvoiceId && (
                    <>
                      {' · '}
                      <Link href={`/admin/facturacion/${d.nominativeInvoiceId}`} className="text-[#3E667D] hover:underline">
                        ver factura
                      </Link>
                    </>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function InvoiceDetailContent({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const relationDroppedNotice = searchParams.get(RELATION_DROPPED_PARAM) === RELATION_DROPPED_VALUE;
  const { data: invoice, isLoading, isError, error, refetch } = useInvoice(invoiceId);
  const canManage = useCanManageBilling();
  const roles = useAppSelector(selectUserRoles);
  const isSuperAdmin = roles.includes('super_admin');
  const { data: regimeCatalog } = useFiscalRegimes();
  const { data: cfdiUseCatalog } = useCfdiUses();
  const { formatInBranch, timezoneOf } = useBranchTimezone();

  const stamp = useStampInvoice();
  const replace = useReplaceInvoice();
  const refresh = useRefreshInvoiceStatus();
  const discardGlobal = useDiscardGlobalInvoice();
  const discardOther = useDiscardInvoice();
  const reissue = useReissueGlobalInvoice();
  const fiscalEditor = useCustomerFiscalEditor(() => void refetch());

  const [stampOpen, setStampOpen] = useState(false);
  // Reintento de una nominativa cuyo ticket está en una global viva (§5.3.7).
  const [ackGlobalOpen, setAckGlobalOpen] = useState(false);
  const [ackGlobalInvoiceId, setAckGlobalInvoiceId] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refreshOpen, setRefreshOpen] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [reissueOpen, setReissueOpen] = useState(false);

  const filesReady = !!invoice && (invoice.files.pdf || invoice.files.xml);
  const files = useInvoiceFiles(invoiceId, filesReady);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <ExclamationTriangleIcon className="mx-auto mb-4 h-16 w-16 text-yellow-500" aria-hidden />
            <h2 className="mb-2 text-xl font-bold text-gray-900">Factura no encontrada</h2>
            <p className="mb-4 text-gray-600">
              {isError ? billingErrorMessage(error, 'No se pudo cargar la factura') : 'La factura que buscas no existe o fue eliminada.'}
            </p>
            <Button asChild>
              <Link href="/admin/facturacion">Volver a Facturación</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const a = invoice.actions;
  const isGlobal = invoice.invoiceType === 'global';
  const isPaymentComplement = invoice.invoiceType === 'payment';
  const discardPending = discardGlobal.isPending || discardOther.isPending;
  // Global: operaciones que ya no le corresponden (nominativas) y ventas del día sin declarar.
  const nominativeReleased = invoice.global
    ? invoice.global.released.filter((d) => d.releasedReason === 'nominative_issued').length
    : 0;
  const uncoveredCount = invoice.global?.uncoveredCount ?? 0;
  const uncoveredTotal = invoice.global?.uncoveredTotal ?? null;
  const needsReissue = isGlobal && (invoice.global?.reissueState === 'pending_reissue' || uncoveredCount > 0);
  const errorMapped = invoice.providerErrorMapped;
  const errorText = errorMapped?.message ?? invoice.providerError;
  const errorField = errorMapped?.field ?? null;
  const receiverError = !!errorField && RECEIVER_FIELD_PREFIXES.some((p) => errorField.startsWith(p));
  // V2-L3: timbrado ambiguo (candidato dudoso del PAC). Tiene su propia tarjeta,
  // así que la de error genérica no se repite.
  const ambiguousStamp = a.canResolveAmbiguous === true;
  const showError =
    !ambiguousStamp &&
    !!errorText &&
    (invoice.providerStatus === InvoiceStatus.ERROR ||
      invoice.providerStatus === InvoiceStatus.STAMPING ||
      invoice.providerStatus === InvoiceStatus.PENDING);

  const copyUuid = async () => {
    if (!invoice.satUuid) return;
    try {
      await navigator.clipboard.writeText(invoice.satUuid);
      toast.success('UUID copiado');
    } catch {
      toast.error('No se pudo copiar el UUID');
    }
  };

  const run = async (fn: () => Promise<unknown>, close: () => void) => {
    try {
      await fn();
      close();
    } catch {
      // El hook ya avisó.
    }
  };

  /**
   * (Re)timbrado. Si el ticket está en una global viva el API responde 409
   * `CFDI_IN_GLOBAL`: se abre la confirmación de 3 pasos y, si el usuario
   * acepta, se reintenta con `?acknowledgeGlobal=true`.
   */
  const stampNow = async (acknowledgeGlobal: boolean) => {
    try {
      await stamp.mutateAsync({ id: invoice.id, acknowledgeGlobal });
      setStampOpen(false);
      setAckGlobalOpen(false);
    } catch (err) {
      if (!acknowledgeGlobal && isBillingErrorCode(err, 'CFDI_IN_GLOBAL')) {
        // El `invoiceId` del error es ESTA nominativa: la global viene en `details.globalInvoiceId`.
        const globalId = billingErrorGlobalInvoiceId(err);
        setAckGlobalInvoiceId(globalId && globalId !== invoice.id ? globalId : null);
        setStampOpen(false);
        setAckGlobalOpen(true);
      }
      // El resto de los errores ya los avisó el hook.
    }
  };

  const discardNow = async () => {
    try {
      if (isGlobal) {
        await discardGlobal.mutateAsync(invoice.id);
        setDiscardOpen(false);
        router.push('/admin/facturacion/global');
      } else {
        await discardOther.mutateAsync(invoice.id);
        setDiscardOpen(false);
        router.push(isPaymentComplement ? '/admin/facturacion' : '/admin/facturacion?tab=por-facturar');
      }
    } catch {
      // El hook ya avisó.
    }
  };

  const reissueNow = async () => {
    try {
      const result = await reissue.mutateAsync(invoice.id);
      setReissueOpen(false);
      // Solo `reissued` trae una global nueva; con `waiting_sat` o
      // `nothing_to_reissue` la pantalla se queda en esta factura (ya refrescada).
      if (result.state === 'reissued' && result.invoice) {
        const notice = result.relationDropped ? `?${RELATION_DROPPED_PARAM}=${RELATION_DROPPED_VALUE}` : '';
        router.push(`/admin/facturacion/${result.invoice.id}${notice}`);
      }
    } catch {
      // El hook ya avisó.
    }
  };

  const openFiscal = () => {
    if (!invoice.customerId) {
      toast.error('La factura no tiene cliente asociado (receptor genérico)');
      return;
    }
    void fiscalEditor.openFor({
      customerId: invoice.customerId,
      rfc: invoice.receiver.rfc,
      name: invoice.receiver.name,
    });
  };

  const pdfUrl = files.data?.pdf?.url ?? null;
  const xmlUrl = files.data?.xml?.url ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabecera */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white">
                <Link href="/admin/facturacion" aria-label="Volver a facturas">
                  <ArrowLeftIcon className="h-6 w-6" />
                </Link>
              </Button>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <DocumentTextIcon className="h-8 w-8" aria-hidden />
                  <h1 className="text-3xl font-bold">
                    {invoiceTypeLabel(invoice)} {invoice.folioDisplay}
                  </h1>
                  <InvoiceTypeBadge invoice={invoice} />
                </div>
                {invoice.satUuid ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-mono text-white/85 break-all">UUID: {invoice.satUuid}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-white hover:bg-white/10 hover:text-white"
                      onClick={() => void copyUuid()}
                      aria-label="Copiar UUID"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" aria-hidden />
                      Copiar
                    </Button>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-white/70">Sin UUID: la factura aún no se timbra.</p>
                )}
                <p className="mt-1 text-xs text-white/70">
                  {invoice.invoiceNumber && <>Número interno {invoice.invoiceNumber} · </>}
                  {invoice.stampedAt
                    ? `Timbrada ${formatInBranch(invoice.stampedAt, invoice.branchId)} (${timezoneOf(invoice.branchId)})`
                    : `Creada ${formatInBranch(invoice.createdAt, invoice.branchId)}`}
                  {invoice.satCertificateNumber && <> · Certificado SAT {invoice.satCertificateNumber}</>}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <InvoiceStatusBadge status={invoice.providerStatus} satCancellationStatus={invoice.satCancellationStatus} size="lg" />
              <SatStatusBadge status={invoice.satStatus} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Columna principal */}
          <div className="space-y-6 lg:col-span-2">
            {showError && (
              <Card className="border-red-200 bg-red-50" role="alert">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="h-6 w-6 flex-shrink-0 text-red-600" aria-hidden />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-800">
                        {invoice.providerStatus === InvoiceStatus.STAMPING ? 'Timbrado sin confirmar' : 'Error en el timbrado'}
                      </h3>
                      <p className="mt-1 text-sm text-red-700">{errorText}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {errorField && <Badge variant="destructive">Campo: {billingFieldLabel(errorField)}</Badge>}
                        {errorMapped?.providerCode && <Badge variant="outline">Código PAC {errorMapped.providerCode}</Badge>}
                      </div>
                      {receiverError && canManage && invoice.customerId && (
                        <Button variant="outline" size="sm" className="mt-3" onClick={openFiscal} disabled={fiscalEditor.isLoading}>
                          Corregir datos fiscales del cliente
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {ambiguousStamp && <AmbiguousStampCard invoice={invoice} canResolve={isSuperAdmin && canManage} />}

            {isGlobal && relationDroppedNotice && (
              <Card className="border-amber-300 bg-amber-50" role="alert">
                <CardContent className="flex items-start gap-3 p-4 text-sm text-amber-900">
                  <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden />
                  <div>
                    <p className="font-semibold">Esta global se reexpidió SIN relación con la cancelada</p>
                    <p className="mt-1 text-xs">
                      El PAC rechazó la relación 04 (sustitución), así que la nueva global se timbró sin ella para no
                      dejar el día sin declarar. Avisa a Contabilidad para que documente el vínculo entre ambas.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {needsReissue && (
              <Card className="border-purple-200 bg-purple-50" role="status">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="text-sm text-purple-900">
                    <p className="font-semibold">
                      {nominativeReleased > 0
                        ? `Tiene ${nominativeReleased} operación(es) facturada(s) nominativamente`
                        : 'Esta global tiene operaciones que ya no le corresponden o tickets sin declarar: hay que cancelarla y reexpedirla'}
                    </p>
                    {uncoveredCount > 0 && (
                      <p>
                        {uncoveredCount} ticket(s) del día
                        {uncoveredTotal !== null ? ` por ${formatCurrency(uncoveredTotal)}` : ''} no están declarados en esta global.
                      </p>
                    )}
                    <p className="text-xs">
                      {nominativeReleased > 0 && uncoveredCount === 0
                        ? 'Hay que cancelar esta global con el motivo 04 y reexpedirla sin esos tickets (relación 04).'
                        : 'La reexpedición cancela esta global con el motivo 04 y timbra una nueva con las ventas vigentes del día (relación 04).'}
                    </p>
                    {!a.canReissue && invoice.providerStatus === InvoiceStatus.CANCEL_PENDING && (
                      <p className="text-xs">La cancelación está en proceso ante el SAT: usa &quot;Actualizar estatus SAT&quot;; cuando quede cancelada vuelve a pulsar Reexpedir.</p>
                    )}
                  </div>
                  {canManage && a.canReissue && (
                    <Button onClick={() => setReissueOpen(true)} disabled={reissue.isPending}>
                      {nominativeReleased > 0 && uncoveredCount === 0 ? 'Reexpedir sin los tickets facturados' : 'Reexpedir global'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {invoice.replacement?.replacedByInvoiceId && invoice.providerStatus !== InvoiceStatus.CANCELLED && (
              <Card className="border-amber-200 bg-amber-50" role="status">
                <CardContent className="p-4 text-sm text-amber-900">
                  Sustituida por{' '}
                  <Link href={`/admin/facturacion/${invoice.replacement.replacedByInvoiceId}`} className="font-semibold underline">
                    otra factura
                  </Link>
                  : falta cancelar esta con el motivo 01. Usa &quot;Cancelar factura&quot; con el UUID de la sustituta.
                </CardContent>
              </Card>
            )}

            {/* Receptor */}
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Receptor</h2>
                  {canManage && invoice.customerId && a.canStamp && (
                    <Button variant="ghost" size="sm" onClick={openFiscal} disabled={fiscalEditor.isLoading}>
                      Editar datos fiscales
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Razón social" value={invoice.receiver.name} />
                  <Field label="RFC" value={invoice.receiver.rfc} mono />
                  <Field label="Régimen fiscal" value={fiscalRegimeLabel(invoice.receiver.taxRegimeCode, regimeCatalog) || '—'} />
                  <Field label="Uso de CFDI" value={cfdiUseLabel(invoice.receiver.cfdiUseCode, cfdiUseCatalog) || '—'} />
                  <Field label="CP fiscal" value={invoice.receiver.zipCode} mono />
                  <Field label="Correo" value={invoice.receiver.email} />
                </div>
              </CardContent>
            </Card>

            {/* Emisor y expedición */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Emisor y expedición</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Emisor" value={invoice.issuer.name} />
                  <Field label="RFC emisor" value={invoice.issuer.rfcMasked} mono />
                  <Field label="Régimen" value={fiscalRegimeLabel(invoice.issuer.taxRegimeCode, regimeCatalog) || '—'} />
                  <Field label="Lugar de expedición (CP)" value={invoice.issuer.expeditionPlace} mono />
                  <Field label="Sucursal" value={invoice.branchName} />
                  <Field label="Moneda" value={invoice.currencyCode} />
                  <Field label="Método de pago" value={invoice.paymentMethodCode ? PAYMENT_METHOD_LABELS[invoice.paymentMethodCode] ?? invoice.paymentMethodCode : '—'} />
                  <Field label="Forma de pago" value={invoice.paymentFormCode ? `${invoice.paymentFormCode} · ${getPaymentFormName(invoice.paymentFormCode)}` : '—'} />
                </div>
              </CardContent>
            </Card>

            {/* Origen */}
            {(invoice.posSaleId || invoice.orderId || invoice.globalLocalDate) && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-4 text-lg font-semibold text-gray-900">Origen</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {invoice.saleNumber && <Field label="Ticket POS" value={invoice.saleNumber} mono />}
                    {invoice.orderId && (
                      <Field
                        label="Pedido"
                        value={
                          <Link href={`/admin/pedidos/${invoice.orderId}`} className="text-[#3E667D] hover:underline">
                            {invoice.orderNumber ?? invoice.orderId}
                          </Link>
                        }
                      />
                    )}
                    {invoice.globalLocalDate && <Field label="Día de la global (zona sucursal)" value={formatIsoDate(invoice.globalLocalDate)} />}
                    {invoice.global && <Field label="Modo de conceptos" value={invoice.global.conceptMode === 'ticket' ? 'Por ticket' : 'Por producto'} />}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Conceptos */}
            {invoice.items.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-4 text-lg font-semibold text-gray-900">Conceptos</h2>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descripción</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">P. unitario</TableHead>
                          <TableHead className="text-right">Importe</TableHead>
                          <TableHead className="text-right">Desc.</TableHead>
                          <TableHead className="text-right">IVA</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.items.map((item) => (
                          <TableRow key={item.lineNumber}>
                            <TableCell>
                              <p className="font-medium text-gray-900">{item.description}</p>
                              <p className="text-xs text-gray-500">
                                {item.identificationNumber && <>No. ident. {item.identificationNumber} · </>}
                                Clave {item.satProductCode ?? '—'} · Unidad {item.satUnitCode ?? '—'}
                                {item.unitName ? ` (${item.unitName})` : ''} · Obj. imp. {item.taxObject}
                              </p>
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{Number(item.unitPrice).toFixed(6)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                            <TableCell className="text-right">{item.discount > 0 ? formatCurrency(item.discount) : '—'}</TableCell>
                            <TableCell className="text-right">
                              {item.taxes.length === 0
                                ? '—'
                                : item.taxes.map((t, i) => (
                                    <span key={i} className="block whitespace-nowrap">
                                      {t.factorType === 'Exento' ? 'Exento' : `${Math.round(t.rate * 100)}%: ${formatCurrency(t.amount)}`}
                                    </span>
                                  ))}
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={6} className="text-right font-medium">Subtotal</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(invoice.totals.subtotal)}</TableCell>
                        </TableRow>
                        {invoice.totals.discount > 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-right text-gray-600">Descuento</TableCell>
                            <TableCell className="text-right">−{formatCurrency(invoice.totals.discount)}</TableCell>
                          </TableRow>
                        )}
                        {invoice.totals.byRate.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={6} className="text-right text-gray-600">
                              IVA {r.factor === 'Exento' ? 'exento' : `${Math.round(r.rate * 100)}%`} (base {formatCurrency(r.base)})
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(r.tax)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-gray-50">
                          <TableCell colSpan={6} className="text-right font-bold text-gray-900">Total</TableCell>
                          <TableCell className="text-right text-xl font-bold text-[#3E667D]">{formatCurrency(invoice.totals.total)}</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Global: tickets incluidos y liberados */}
            {invoice.global && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-1 text-lg font-semibold text-gray-900">Factura global</h2>
                  <p className="mb-4 text-sm text-gray-600">
                    Día {formatIsoDate(invoice.global.localDate)} · {invoice.global.documentCount ?? invoice.global.documents.length} documento(s) ·{' '}
                    {invoice.global.conceptMode === 'ticket' ? 'un concepto por ticket' : 'agrupada por producto'}
                  </p>
                  {uncoveredCount > 0 && (
                    <p className="mb-4 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900" role="status">
                      <span className="font-semibold">
                        Sin declarar: {uncoveredCount} ticket(s)
                        {uncoveredTotal !== null ? ` por ${formatCurrency(uncoveredTotal)}` : ''}.
                      </span>{' '}
                      Son ventas del día que esta global no incluye; se declaran al reexpedirla.
                    </p>
                  )}
                  <h3 className="mb-2 text-sm font-semibold text-gray-800">Incluidos</h3>
                  <GlobalDocumentsTable docs={invoice.global.documents} />
                  {invoice.global.released.length > 0 && (
                    <>
                      <h3 className="mb-2 mt-6 text-sm font-semibold text-gray-800">Liberados</h3>
                      <GlobalDocumentsTable docs={invoice.global.released} released />
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* PPD: saldos y complementos */}
            {invoice.ppd && (
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">Pago en parcialidades (PPD)</h2>
                    {canManage && (invoice.ppd.outstandingBalance ?? 0) > 0 && invoice.providerStatus === InvoiceStatus.STAMPED && (
                      <Button asChild size="sm">
                        <Link href={`/admin/facturacion/complemento-pago?invoiceId=${invoice.id}`}>Registrar pago</Link>
                      </Button>
                    )}
                  </div>
                  <div className="mb-4 grid gap-4 sm:grid-cols-3">
                    <Field label="Pagado" value={formatCurrency(invoice.ppd.paidAmount)} />
                    <Field label="Saldo insoluto" value={formatCurrency(invoice.ppd.outstandingBalance ?? 0)} />
                    <Field label="Parcialidades" value={invoice.ppd.partialitiesCount} />
                  </div>
                  {invoice.ppd.complements.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Complemento</TableHead>
                            <TableHead>Parcialidad</TableHead>
                            <TableHead>Fecha de pago</TableHead>
                            <TableHead className="text-right">Pagado</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoice.ppd.complements.map((c) => (
                            <TableRow key={c.complementInvoiceId}>
                              <TableCell>
                                <Link href={`/admin/facturacion/${c.complementInvoiceId}`} className="font-mono text-sm text-[#3E667D] hover:underline">
                                  {c.folioDisplay}
                                </Link>
                              </TableCell>
                              <TableCell>{c.partialityNumber}</TableCell>
                              <TableCell className="whitespace-nowrap text-sm">
                                {/* `paymentDate` es un instante UTC: cortarlo a 10 caracteres corre de día los pagos de la tarde. */}
                                {c.paymentLocalDateTime
                                  ? c.paymentLocalDateTime.replace('T', ' ').slice(0, 16)
                                  : formatInBranch(c.paymentDate, invoice.branchId)}
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(c.amountPaid)}</TableCell>
                              <TableCell>{c.providerStatus ? <InvoiceStatusBadge status={c.providerStatus} /> : '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Sin complementos de pago.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* CFDI de pago: documentos relacionados */}
            {invoice.payment && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-4 text-lg font-semibold text-gray-900">Complemento de pago</h2>
                  <div className="mb-4 grid gap-4 sm:grid-cols-3">
                    <Field label="Fecha de pago (local)" value={invoice.payment.paymentLocalDateTime?.replace('T', ' ') ?? '—'} />
                    <Field label="Forma de pago" value={invoice.payment.paymentFormCode ? `${invoice.payment.paymentFormCode} · ${getPaymentFormName(invoice.payment.paymentFormCode)}` : '—'} />
                    <Field label="Monto" value={formatCurrency(invoice.payment.amount)} />
                    {invoice.payment.operationNumber && <Field label="Referencia" value={invoice.payment.operationNumber} mono />}
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Factura</TableHead>
                          <TableHead>Parcialidad</TableHead>
                          <TableHead className="text-right">Saldo anterior</TableHead>
                          <TableHead className="text-right">Pagado</TableHead>
                          <TableHead className="text-right">Saldo insoluto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.payment.documents.map((d) => (
                          <TableRow key={d.invoiceId}>
                            <TableCell>
                              <Link href={`/admin/facturacion/${d.invoiceId}`} className="font-mono text-sm text-[#3E667D] hover:underline">
                                {d.folioDisplay}
                              </Link>
                              <p className="font-mono text-[11px] text-gray-500">{d.satUuid}</p>
                            </TableCell>
                            <TableCell>{d.partialityNumber}</TableCell>
                            <TableCell className="text-right">{formatCurrency(d.previousBalance)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(d.amountPaid)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(d.outstandingBalance)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cancelación */}
            {invoice.cancellation && (
              <Card className="border-orange-200">
                <CardContent className="p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">Cancelación</h2>
                    {invoice.cancellation.acuseAvailable && (
                      <Button variant="outline" size="sm" onClick={() => void downloadInvoiceFile('acuse', invoice.id, invoice.folioDisplay)}>
                        <ArrowDownTrayIcon className="h-4 w-4" aria-hidden />
                        Acuse (PDF)
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Motivo" value={invoice.cancellation.reason ? CANCELLATION_REASON_INFO[invoice.cancellation.reason]?.label ?? invoice.cancellation.reason : '—'} />
                    <Field label="Estatus SAT" value={invoice.cancellation.satCancellationStatus ?? '—'} />
                    <Field label="Solicitada" value={formatInBranch(invoice.cancellation.requestedAt, invoice.branchId)} />
                    <Field label="Confirmada" value={invoice.cancellation.cancelledAt ? formatInBranch(invoice.cancellation.cancelledAt, invoice.branchId) : 'Pendiente'} />
                    {invoice.cancellation.replacementUuid && <Field label="UUID sustituta" value={invoice.cancellation.replacementUuid} mono />}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Relación / sustitución */}
            {(invoice.relation || invoice.replacement) && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-4 text-lg font-semibold text-gray-900">Relación y sustitución</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {invoice.relation && (
                      <>
                        <Field label="Tipo de relación" value={`${invoice.relation.type}${invoice.relation.type === '04' ? ' — Sustitución de CFDI previos' : ''}`} />
                        <Field
                          label="CFDI relacionado"
                          value={
                            invoice.relation.invoiceId ? (
                              <Link href={`/admin/facturacion/${invoice.relation.invoiceId}`} className="font-mono text-[#3E667D] hover:underline">
                                {invoice.relation.uuid ?? 'ver factura relacionada'}
                              </Link>
                            ) : (
                              <span className="font-mono">{invoice.relation.uuid ?? '—'}</span>
                            )
                          }
                        />
                      </>
                    )}
                    {invoice.replacement?.replacesInvoiceId && (
                      <Field
                        label="Sustituye a"
                        value={<Link href={`/admin/facturacion/${invoice.replacement.replacesInvoiceId}`} className="text-[#3E667D] hover:underline">ver factura original</Link>}
                      />
                    )}
                    {invoice.replacement?.replacedByInvoiceId && (
                      <Field
                        label="Sustituida por"
                        value={<Link href={`/admin/facturacion/${invoice.replacement.replacedByInvoiceId}`} className="text-[#3E667D] hover:underline">ver factura sustituta</Link>}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Barra lateral */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Acciones</h2>
                {!canManage ? (
                  <p className="text-sm text-gray-500">Solo lectura: necesitas billing:manage para operar la factura.</p>
                ) : (
                  <div className="space-y-2">
                    {a.canStamp && (
                      <Button className="w-full" onClick={() => setStampOpen(true)} disabled={stamp.isPending}>
                        <CheckCircleIcon className="h-5 w-5" aria-hidden />
                        {invoice.providerStatus === InvoiceStatus.PENDING ? 'Timbrar' : 'Reintentar timbrado'}
                      </Button>
                    )}
                    {a.canEmail && (
                      <Button variant="outline" className="w-full" onClick={() => setEmailOpen(true)}>
                        <EnvelopeIcon className="h-5 w-5" aria-hidden />
                        Reenviar por correo
                      </Button>
                    )}
                    {a.canReplace && (
                      <Button variant="outline" className="w-full" onClick={() => setReplaceOpen(true)} disabled={replace.isPending}>
                        <ArrowsRightLeftIcon className="h-5 w-5" aria-hidden />
                        Sustituir
                      </Button>
                    )}
                    {a.canRefreshStatus && (
                      <Button variant="outline" className="w-full" onClick={() => setRefreshOpen(true)} disabled={refresh.isPending}>
                        <ArrowPathIcon className="h-5 w-5" aria-hidden />
                        Actualizar estatus SAT
                      </Button>
                    )}
                    {a.canReissue && isGlobal && (
                      <Button variant="outline" className="w-full" onClick={() => setReissueOpen(true)} disabled={reissue.isPending}>
                        <ArrowsRightLeftIcon className="h-5 w-5" aria-hidden />
                        Reexpedir global
                      </Button>
                    )}
                    {a.canCancel && (
                      <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setCancelOpen(true)}>
                        <XMarkIcon className="h-5 w-5" aria-hidden />
                        {invoice.providerStatus !== InvoiceStatus.CANCEL_PENDING
                          ? 'Cancelar factura'
                          : isCancellationRejected(invoice.cancellation?.satCancellationStatus ?? invoice.satCancellationStatus)
                            ? 'Volver a solicitar cancelación'
                            : 'Actualizar cancelación'}
                      </Button>
                    )}
                    {a.canDiscard && (
                      <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDiscardOpen(true)} disabled={discardPending}>
                        <TrashIcon className="h-5 w-5" aria-hidden />
                        {isGlobal ? 'Desechar intento' : 'Desechar'}
                      </Button>
                    )}
                    {!a.canStamp && !a.canEmail && !a.canReplace && !a.canRefreshStatus && !a.canCancel && !a.canDiscard && !(a.canReissue && isGlobal) && (
                      <p className="text-sm text-gray-500">No hay acciones disponibles en este estado.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Archivos */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Archivos</h2>
                {invoice.satUuid ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">
                      {invoice.files.storedAt
                        ? `Guardados el ${formatInBranch(invoice.files.storedAt, invoice.branchId)}`
                        : 'Aún no están en el almacén: se descargan del PAC y se guardan.'}
                      {files.data?.provider === 'local' && ' · Almacén local'}
                    </p>
                    {pdfUrl ? (
                      <Button asChild className="w-full">
                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                          <EyeIcon className="h-5 w-5" aria-hidden />
                          Ver PDF
                        </a>
                      </Button>
                    ) : (
                      <Button className="w-full" onClick={() => void openInvoicePdf(invoice.id)}>
                        <EyeIcon className="h-5 w-5" aria-hidden />
                        Ver PDF
                      </Button>
                    )}
                    <Button variant="outline" className="w-full" onClick={() => void downloadInvoiceFile('pdf', invoice.id, invoice.folioDisplay)}>
                      <ArrowDownTrayIcon className="h-5 w-5" aria-hidden />
                      Descargar PDF
                    </Button>
                    {xmlUrl ? (
                      <Button asChild variant="outline" className="w-full">
                        <a href={xmlUrl} download>
                          <DocumentDuplicateIcon className="h-5 w-5" aria-hidden />
                          Descargar XML
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" onClick={() => void downloadInvoiceFile('xml', invoice.id, invoice.folioDisplay)}>
                        <DocumentDuplicateIcon className="h-5 w-5" aria-hidden />
                        Descargar XML
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Los archivos existen cuando la factura está timbrada.</p>
                )}
              </CardContent>
            </Card>

            {/* Correos */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Correos</h2>
                {invoice.emails.count > 0 ? (
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-900">Enviada {invoice.emails.count} vez/veces</p>
                    <p className="text-xs text-gray-500">Último envío: {formatInBranch(invoice.emails.emailedAt, invoice.branchId)}</p>
                    {invoice.emails.emailedTo && <p className="break-all text-xs text-gray-600">A: {invoice.emails.emailedTo}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    {isGlobal ? 'Las globales no se envían automáticamente.' : 'Todavía no se ha enviado por correo.'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Historial */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Historial</h2>
                <ol className="space-y-3">
                  <li className="flex gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-gray-400" aria-hidden />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Creada</p>
                      <p className="text-xs text-gray-500">{formatInBranch(invoice.createdAt, invoice.branchId)}</p>
                    </div>
                  </li>
                  {invoice.stampedAt && (
                    <li className="flex gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-green-500" aria-hidden />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Timbrada</p>
                        <p className="text-xs text-gray-500">{formatInBranch(invoice.stampedAt, invoice.branchId)}</p>
                        {invoice.satStampDate && <p className="text-xs text-gray-500">Fecha SAT: {invoice.satStampDate.replace('T', ' ')}</p>}
                      </div>
                    </li>
                  )}
                  {invoice.cancellation?.requestedAt && (
                    <li className="flex gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-orange-500" aria-hidden />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Cancelación solicitada</p>
                        <p className="text-xs text-gray-500">{formatInBranch(invoice.cancellation.requestedAt, invoice.branchId)}</p>
                      </div>
                    </li>
                  )}
                  {invoice.cancellation?.cancelledAt && (
                    <li className="flex gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-red-500" aria-hidden />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Cancelada</p>
                        <p className="text-xs text-gray-500">{formatInBranch(invoice.cancellation.cancelledAt, invoice.branchId)}</p>
                      </div>
                    </li>
                  )}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Diálogos */}
      <ConfirmDialog
        open={stampOpen}
        onOpenChange={setStampOpen}
        title={invoice.providerStatus === InvoiceStatus.PENDING ? 'Timbrar factura' : 'Reintentar timbrado'}
        description="Se reconstruye el CFDI con los datos fiscales actuales y se envía al PAC. Consume un timbre si el SAT lo acepta."
        confirmLabel="Timbrar"
        isPending={stamp.isPending}
        onConfirm={() => stampNow(false)}
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-gray-50 p-3 text-sm">
          <dt className="text-gray-500">Receptor</dt>
          <dd>{invoice.receiver.name ?? '—'} ({invoice.receiver.rfc ?? '—'})</dd>
          <dt className="text-gray-500">Total</dt>
          <dd className="font-semibold">{formatCurrency(invoice.total)}</dd>
        </dl>
      </ConfirmDialog>

      {/* El ticket ya está en una global viva (§5.3.7): mismos 3 pasos que en "Ventas por facturar". */}
      <ConfirmDialog
        open={ackGlobalOpen}
        onOpenChange={setAckGlobalOpen}
        title={`${invoice.saleNumber ?? 'El ticket'} ya está en una factura global`}
        description="Timbrar esta factura nominativa exige tres pasos. Confirma solo si Contabilidad lo autoriza."
        confirmLabel="Entiendo, timbrar nominativa"
        confirmText="FACTURAR"
        cancelLabel="Volver"
        destructive
        isPending={stamp.isPending}
        onConfirm={() => stampNow(true)}
      >
        <ol className="list-decimal space-y-1 pl-5">
          <li>Se timbra la factura nominativa del ticket y se libera de la global.</li>
          <li>La global queda marcada &quot;por reexpedir&quot;: hay que cancelarla con el motivo 04.</li>
          <li>Desde el detalle de la global se reexpide sin los tickets facturados (relación 04).</li>
        </ol>
        {ackGlobalInvoiceId && (
          <p className="mt-3">
            <Link href={`/admin/facturacion/${ackGlobalInvoiceId}`} className="text-[#3E667D] underline" target="_blank">
              Ver la factura global
            </Link>
          </p>
        )}
      </ConfirmDialog>

      {emailOpen && (
        <SendInvoiceEmailDialog
          open={emailOpen}
          onOpenChange={setEmailOpen}
          invoiceId={invoice.id}
          folio={invoice.folioDisplay}
          defaultEmail={invoice.receiver.email}
        />
      )}

      <ConfirmDialog
        open={replaceOpen}
        onOpenChange={setReplaceOpen}
        title={`Sustituir factura ${invoice.folioDisplay}`}
        description="Para corregir RFC o razón social. Se timbra una factura NUEVA con relación 04 usando los datos fiscales actuales del cliente y después se solicita la cancelación 01 de esta."
        confirmLabel="Sustituir"
        confirmText="SUSTITUIR"
        destructive
        isPending={replace.isPending}
        onConfirm={() =>
          run(
            async () => {
              const result = await replace.mutateAsync(invoice.id);
              router.push(`/admin/facturacion/${result.id}`);
            },
            () => setReplaceOpen(false),
          )
        }
      >
        <ol className="list-decimal space-y-1 pl-5">
          <li>Corrige antes los datos fiscales del cliente (Preparación fiscal o &quot;Editar datos fiscales&quot;).</li>
          <li>Se emite la sustituta (consume un timbre).</li>
          <li>Se cancela esta con motivo 01; si el PAC falla, quedará marcada &quot;falta cancelar&quot; para reintentar.</li>
        </ol>
      </ConfirmDialog>

      {cancelOpen && (
        <CancelInvoiceDialog open={cancelOpen} onOpenChange={setCancelOpen} invoice={invoice} />
      )}

      <ConfirmDialog
        open={refreshOpen}
        onOpenChange={(open) => {
          setRefreshOpen(open);
          if (!open) setForceRefresh(false);
        }}
        title="Actualizar estatus ante el SAT"
        description="Esta consulta usa 1 timbre del saldo de Facturama. Se permite una consulta cada 10 minutos por factura."
        confirmLabel="Consultar (usa 1 timbre)"
        isPending={refresh.isPending}
        onConfirm={() => run(() => refresh.mutateAsync({ id: invoice.id, force: forceRefresh }), () => setRefreshOpen(false))}
      >
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <Checkbox id="force-refresh" checked={forceRefresh} onCheckedChange={(v) => setForceRefresh(v === true)} />
            <Label htmlFor="force-refresh" className="text-sm font-normal">Forzar aunque se consultó hace menos de 10 minutos (super_admin)</Label>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title={
          isGlobal
            ? 'Desechar intento de factura global'
            : isPaymentComplement
              ? 'Desechar intento de complemento de pago'
              : 'Desechar intento de factura'
        }
        description={
          isGlobal
            ? 'Solo para intentos sin UUID (pendientes o con error). Se libera el día para volver a emitir la global.'
            : isPaymentComplement
              ? 'Solo para intentos sin UUID (pendientes o con error). Las facturas PPD de este complemento quedan libres para registrar el pago otra vez.'
              : 'Solo para intentos sin UUID (pendientes o con error). La venta queda libre para volver a facturarse.'
        }
        confirmLabel="Desechar"
        cancelLabel="Volver"
        destructive
        isPending={discardPending}
        onConfirm={discardNow}
      >
        <p>Este intento nunca se timbró: no existe un CFDI ante el SAT, así que no hay nada que cancelar. El registro se conserva en la bitácora de auditoría.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={reissueOpen}
        onOpenChange={setReissueOpen}
        title="Reexpedir la factura global"
        description="Se cancela esta global con el motivo 04 y se timbra una nueva del mismo día con las ventas vigentes (sin los tickets facturados nominativamente y con los que faltaban por declarar), con relación 04 a la cancelada."
        confirmLabel="Reexpedir"
        confirmText="REEXPEDIR"
        cancelLabel="Volver"
        destructive
        isPending={reissue.isPending}
        onConfirm={reissueNow}
      >
        {uncoveredCount > 0 && (
          <p className="mb-2">
            La nueva global dejará declarados <strong>{uncoveredCount}</strong> ticket(s)
            {uncoveredTotal !== null && (
              <> por <strong>{formatCurrency(uncoveredTotal)}</strong></>
            )}{' '}
            que hoy están fuera de esta global.
          </p>
        )}
        <ul className="list-disc space-y-1 pl-5">
          <li>Si la cancelación queda en proceso, usa &quot;Actualizar estatus SAT&quot;; cuando quede cancelada vuelve a pulsar Reexpedir.</li>
          <li>Si el PAC rechaza la relación 04, la nueva global se emite sin ella y se te avisa.</li>
        </ul>
      </ConfirmDialog>

      {fiscalEditor.dialog}
    </div>
  );
}
