'use client';

// PaymentReadinessReview — revisión de datos para pago de UN distribuidor
// (contrato §5.5), compartida por la bandeja /admin/tesoreria/validacion-datos
// (Sheet ancho con cola Anterior/Siguiente y atajos J/K, V/R) y por la ficha
// del distribuidor (pestaña "Datos de pago", en línea).
//
// Izquierda: visor del documento (URL firmada por endpoint con permiso).
// Derecha: alertas (duplicados/formato/bloqueadores), documentos con
// Validar / Rechazar / Revocar, datos capturados vs documento, cuenta bancaria
// (banco, ****1234, titular, verificación con últimos 4), régimen de comisión
// (sugerido por SAT, asignar con motivo, historial), checklist y bitácora.
// Toda mutación con onError → treasuryErrorMessage; nunca innerHTML.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowPathIcon,
  BellAlertIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  UserIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionGuard } from '@/components/auth';
import { useTaxRegimes } from '@/hooks/useTreasury';
import {
  useAssignTaxRegime,
  useReadinessCatalogs,
  useReadinessDetail,
  useReadinessDocumentUrl,
  useRemindDistributors,
  useReviewDocuments,
  useRevokeDocument,
  useSatSuggestions,
  useTaxRegimeHistory,
} from '@/hooks/useTreasuryReadiness';
import type {
  DocumentUrlResult,
  PaymentDocumentKey,
  ReadinessDetail,
  RegimeRef,
} from '@/types/treasury-readiness';
import { ReadinessChip } from '../ReadinessChip';
import { TREASURY_VALIDATE_PERMISSIONS, useTreasuryPermissions } from '../useTreasuryPermissions';
import { treasuryErrorMessage } from '../treasury-error';
import { actorName, blockerLabels, formatDateTime, formatMoney } from '../treasury-format';
import { DocumentViewer } from './DocumentViewer';
import { DocStatusBadge, ProgressBar, ReadinessStatusBadge } from './ReadinessBadges';
import { ReviewChecklist } from './ReviewChecklist';
import { ReviewTimeline } from './ReviewTimeline';
import {
  ApproveDocumentsDialog,
  AssignRegimeDialog,
  RejectDocumentDialog,
  RemindDialog,
  RevokeDocumentDialog,
} from './ReviewDialogs';
import {
  DOCUMENT_LONG_LABELS,
  countryProfileOf,
  daysLabel,
  documentsForCountry,
  isOverSla,
} from './readiness-labels';

const NO_TAX_CODE = 'SIN_IMPUESTO';

export interface ReadinessQueueNav {
  index: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export interface PaymentReadinessReviewProps {
  customerId: string;
  /** Navegación por la cola (solo en la bandeja). */
  queue?: ReadinessQueueNav;
  /** Atajos de teclado J/K (cola) y V/R (validar/rechazar el documento visible). */
  enableShortcuts?: boolean;
  /** Oculta el enlace a la ficha (cuando ya estamos en ella). */
  hideProfileLink?: boolean;
  className?: string;
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable ||
    !!el.closest('[role="dialog"][data-slot="dialog-content"]') ||
    !!el.closest('[cmdk-root]')
  );
}

function Check({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null) return null;
  return ok ? (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
      <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-destructive">
      <XCircleIcon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}

function Field({ label, value, children }: { label: string; value: string | null | undefined; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className={`text-sm ${value ? 'font-mono text-foreground' : 'italic text-muted-foreground'}`}>
          {value ?? 'Sin capturar'}
        </span>
        {children}
      </dd>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PaymentReadinessReview({
  customerId,
  queue,
  enableShortcuts = false,
  hideProfileLink = false,
  className,
}: PaymentReadinessReviewProps) {
  // `key={customerId}` en el que llama reinicia este estado al cambiar de distribuidor.
  const detailQuery = useReadinessDetail(customerId);
  const catalogsQuery = useReadinessCatalogs();
  const suggestionsQuery = useSatSuggestions();
  const regimesQuery = useTaxRegimes();
  const perms = useTreasuryPermissions();

  const urlMutation = useReadinessDocumentUrl();
  const reviewMutation = useReviewDocuments();
  const revokeMutation = useRevokeDocument();
  const assignMutation = useAssignTaxRegime();
  const remindMutation = useRemindDistributors();

  const [selectedDoc, setSelectedDoc] = useState<PaymentDocumentKey | null>(null);
  const [signedUrls, setSignedUrls] = useState<Partial<Record<PaymentDocumentKey, DocumentUrlResult>>>({});
  const [approveTarget, setApproveTarget] = useState<PaymentDocumentKey[] | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PaymentDocumentKey | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<PaymentDocumentKey | null>(null);
  const [regimeOpen, setRegimeOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyQuery = useTaxRegimeHistory(customerId, historyOpen);

  const detail = detailQuery.data;
  const catalogs = catalogsQuery.data;
  const docKeys = useMemo(
    () => documentsForCountry(detail?.customer.countryCode, catalogs, detail?.docs ?? {}),
    [detail, catalogs],
  );
  const uploaded = useCallback(
    (doc: PaymentDocumentKey) => !!detail?.docs[doc]?.status,
    [detail],
  );

  // Documento visible: el elegido, si no el primer pendiente, si no el primero subido.
  const effectiveDoc: PaymentDocumentKey | null = useMemo(() => {
    if (selectedDoc) return selectedDoc;
    const pending = docKeys.find((d) => detail?.docs[d]?.status === 'pending');
    if (pending) return pending;
    const any = docKeys.find((d) => uploaded(d));
    return any ?? docKeys[0] ?? null;
  }, [selectedDoc, docKeys, detail, uploaded]);

  const { mutate: fetchUrl } = urlMutation;
  const loadUrl = useCallback(
    (doc: PaymentDocumentKey) => {
      fetchUrl(
        { customerId, document: doc },
        { onSuccess: (res) => setSignedUrls((prev) => ({ ...prev, [doc]: res })) },
      );
    },
    [customerId, fetchUrl],
  );

  useEffect(() => {
    if (!effectiveDoc || !uploaded(effectiveDoc) || signedUrls[effectiveDoc]) return;
    loadUrl(effectiveDoc);
  }, [effectiveDoc, uploaded, signedUrls, loadUrl]);

  const urlLoadingFor = urlMutation.isPending ? urlMutation.variables?.document : undefined;
  const urlErrorFor = urlMutation.isError ? urlMutation.variables?.document : undefined;

  const reasons = useMemo(() => catalogs?.rejectionReasons ?? [], [catalogs]);
  const reasonLabel = useCallback(
    (code: string | null | undefined) => reasons.find((r) => r.code === code)?.label ?? null,
    [reasons],
  );

  const regimes: RegimeRef[] = useMemo(() => {
    if (catalogs?.commissionRegimes.length) return catalogs.commissionRegimes;
    return (regimesQuery.data ?? []).filter((r) => r.isActive).map((r) => ({ code: r.code, name: r.name }));
  }, [catalogs, regimesQuery.data]);

  const suggestedRegime = useMemo(() => {
    if (!detail) return null;
    if (countryProfileOf(detail.customer.countryCode) !== 'MX') return NO_TAX_CODE;
    const sat = detail.captured.satRegimeCode?.trim();
    return sat ? (suggestionsQuery.data?.[sat] ?? null) : null;
  }, [detail, suggestionsQuery.data]);

  const customerLabel = detail
    ? `${detail.customer.name} · #${detail.customer.customerNumber ?? '—'}`
    : '';

  // ── Acciones ──────────────────────────────────────────────────────────────
  const canValidate = perms.canValidate;
  const pendingDocs = docKeys.filter((d) => detail?.docs[d]?.status === 'pending');

  const openApprove = useCallback(
    (docs: PaymentDocumentKey[]) => {
      if (!canValidate || docs.length === 0) return;
      setApproveTarget(docs);
    },
    [canValidate],
  );
  const openReject = useCallback(
    (doc: PaymentDocumentKey) => {
      if (!canValidate || !uploaded(doc) || detail?.docs[doc]?.status === 'rejected') return;
      setRejectTarget(doc);
    },
    [canValidate, uploaded, detail],
  );

  const submitReview = async (payload: Parameters<typeof reviewMutation.mutateAsync>[0]['payload']) => {
    try {
      const res = await reviewMutation.mutateAsync({ customerId, payload });
      const approved = payload.validations.filter((v) => v.approved).length;
      const rejected = payload.validations.length - approved;
      if (rejected > 0) toast.success('Documento rechazado; se avisó al distribuidor');
      else if (res.readyToPay === true) toast.success('Expediente validado: el distribuidor ya puede cobrar');
      else if (res.documentsValidated === true) toast.success('Todos los documentos requeridos están validados');
      else toast.success(approved === 1 ? 'Documento validado' : `${approved} documentos validados`);
      if (payload.verifyBankAccount && res.bankVerified === false) {
        toast.warning('El documento se validó, pero la cuenta no quedó verificada; revisa la cuenta capturada');
      }
      return true;
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo registrar la revisión'));
      return false;
    }
  };

  // ── Atajos de teclado (solo bandeja) ──────────────────────────────────────
  const dialogOpen = !!approveTarget || !!rejectTarget || !!revokeTarget || regimeOpen || remindOpen;
  useEffect(() => {
    if (!enableShortcuts) return;
    const handler = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (dialogOpen || isEditableTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === 'j' && queue?.hasNext) {
        e.preventDefault();
        queue.onNext();
      } else if (key === 'k' && queue?.hasPrev) {
        e.preventDefault();
        queue.onPrev();
      } else if (key === 'v' && effectiveDoc && detail?.docs[effectiveDoc]?.status === 'pending') {
        e.preventDefault();
        openApprove([effectiveDoc]);
      } else if (key === 'r' && effectiveDoc) {
        e.preventDefault();
        openReject(effectiveDoc);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [enableShortcuts, dialogOpen, queue, effectiveDoc, detail, openApprove, openReject]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (detailQuery.isLoading && !detail) {
    return (
      <div className={`space-y-3 ${className ?? ''}`}>
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (detailQuery.isError || !detail) {
    return (
      <div className={`rounded-lg border border-destructive/40 p-4 text-sm ${className ?? ''}`}>
        <p className="text-destructive">
          {treasuryErrorMessage(detailQuery.error, 'No se pudo cargar el expediente de datos para pago')}
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void detailQuery.refetch()}>
          <ArrowPathIcon className="mr-2 h-4 w-4" aria-hidden />
          Reintentar
        </Button>
      </div>
    );
  }

  const slaDays = catalogs?.slaDays ?? null;
  const overSla = isOverSla(detail.daysInQueue, slaDays);
  const fc = detail.formatChecks;
  const dup = detail.duplicates;
  const bank = detail.bankAccount;
  const mx = countryProfileOf(detail.customer.countryCode) === 'MX';
  const expectedCurrency = detail.customer.payoutCurrency ?? null;
  const alerts: string[] = [];
  if (dup.rfcSharedWith.length > 0) alerts.push(`RFC compartido con ${dup.rfcSharedWith.length} distribuidor(es) más`);
  if (dup.curpSharedWith.length > 0) alerts.push(`CURP compartida con ${dup.curpSharedWith.length} distribuidor(es) más`);
  if (dup.accountSharedWith.length > 0) alerts.push(`Cuenta bancaria compartida con ${dup.accountSharedWith.length} distribuidor(es) más`);
  if (fc.curp === false) alerts.push('CURP con formato o dígito verificador inválido');
  if (fc.rfcGeneric === true) alerts.push('RFC genérico: no sirve para pagar comisiones');
  if (fc.rfc === false) alerts.push('RFC con formato o dígito verificador inválido');
  if (fc.rfcMatchesCurp === false) alerts.push('El RFC no corresponde a la CURP capturada');
  if (fc.clabe === false) alerts.push('CLABE/cuenta con dígito verificador inválido');
  if (fc.holderMatchesName === false) alerts.push('El titular de la cuenta no coincide con el nombre del distribuidor');
  const blockerTexts = blockerLabels(detail.blockers);

  return (
    <div className={`flex flex-col gap-3 ${className ?? ''}`}>
      {/* Cabecera del expediente */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">{detail.customer.name}</h2>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">#{detail.customer.customerNumber ?? '—'}</code>
            {detail.customer.countryCode && <Badge variant="outline">{detail.customer.countryCode}</Badge>}
            <ReadinessStatusBadge status={detail.overallStatus} />
            <ReadinessChip readiness={{ ready: detail.readyToPay, blockers: detail.blockers }} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <ProgressBar progress={detail.progress} />
            <span className={overSla ? 'font-medium text-amber-700' : ''}>
              En cola: {daysLabel(detail.daysInQueue)}
              {overSla && slaDays !== null ? ` (SLA ${slaDays} d)` : ''}
            </span>
            {detail.submittedAt && <span>Enviado {formatDateTime(detail.submittedAt)}</span>}
            {detail.periodCommission && (
              <span>
                Comisión del periodo:{' '}
                <strong className="text-foreground">
                  {formatMoney(detail.periodCommission.amount, detail.periodCommission.currencyCode)}
                </strong>
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!hideProfileLink && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/distribuidores/${detail.customer.customerId}?tab=datos-pago`}>
                <UserIcon className="mr-1 h-4 w-4" aria-hidden />
                Ver ficha
              </Link>
            </Button>
          )}
          <PermissionGuard permissions={TREASURY_VALIDATE_PERMISSIONS} fallback={<></>}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRemindOpen(true)}
              disabled={detail.overallStatus === 'validated'}
              title="Recordatorio al distribuidor para completar sus datos"
            >
              <BellAlertIcon className="mr-1 h-4 w-4" aria-hidden />
              Recordar
            </Button>
          </PermissionGuard>
          {queue && (
            <div className="flex items-center gap-1" aria-label="Navegación de la cola">
              <Button variant="outline" size="sm" onClick={queue.onPrev} disabled={!queue.hasPrev} title="Anterior (K)">
                <ChevronLeftIcon className="h-4 w-4" aria-hidden />
                <span className="sr-only">Anterior</span>
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                {queue.index + 1} / {queue.total}
              </span>
              <Button variant="outline" size="sm" onClick={queue.onNext} disabled={!queue.hasNext} title="Siguiente (J)">
                <ChevronRightIcon className="h-4 w-4" aria-hidden />
                <span className="sr-only">Siguiente</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* Visor */}
        <DocumentViewer
          document={effectiveDoc}
          signed={effectiveDoc ? (signedUrls[effectiveDoc] ?? null) : null}
          isLoading={!!effectiveDoc && urlLoadingFor === effectiveDoc}
          error={effectiveDoc && urlErrorFor === effectiveDoc && !signedUrls[effectiveDoc] ? urlMutation.error : null}
          uploaded={!!effectiveDoc && uploaded(effectiveDoc)}
          onRefresh={() => {
            if (!effectiveDoc) return;
            setSignedUrls((prev) => {
              const next = { ...prev };
              delete next[effectiveDoc];
              return next;
            });
            loadUrl(effectiveDoc);
          }}
        />

        {/* Checklist y acciones */}
        <div className="space-y-3">
          {(alerts.length > 0 || blockerTexts.length > 0) && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900" role="status">
              <p className="mb-1 flex items-center gap-1 font-semibold">
                <ExclamationTriangleIcon className="h-4 w-4" aria-hidden />
                Revisa antes de validar
              </p>
              <ul className="list-disc space-y-0.5 pl-4">
                {alerts.map((a) => (
                  <li key={a}>{a}</li>
                ))}
                {blockerTexts
                  .filter((b) => !alerts.includes(b))
                  .map((b) => (
                    <li key={b} className="text-amber-800/80">
                      {b}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <Section
            title="Documentos"
            action={
              pendingDocs.length > 1 ? (
                <PermissionGuard permissions={TREASURY_VALIDATE_PERMISSIONS} fallback={<></>}>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openApprove(pendingDocs)}>
                    Validar pendientes ({pendingDocs.length})
                  </Button>
                </PermissionGuard>
              ) : null
            }
          >
            <ul className="space-y-2">
              {docKeys.map((doc) => {
                const state = detail.docs[doc];
                const status = state?.status ?? null;
                const isSelected = effectiveDoc === doc;
                const reason = state?.reasonLabel ?? reasonLabel(state?.reasonCode) ?? state?.reasonCode ?? null;
                return (
                  <li
                    key={doc}
                    className={`rounded-md border p-2 ${isSelected ? 'border-primary/50 bg-primary/5' : 'border-border'}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <button
                        type="button"
                        className="text-left text-sm font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setSelectedDoc(doc)}
                        aria-pressed={isSelected}
                      >
                        {DOCUMENT_LONG_LABELS[doc]}
                      </button>
                      <DocStatusBadge document={doc} status={status} showName={false} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {state?.uploadedAt ? `Subido ${formatDateTime(state.uploadedAt)}` : status ? 'Subido' : 'Pendiente de subir por el distribuidor'}
                      {state?.reviewedAt ? ` · Revisado ${formatDateTime(state.reviewedAt)}` : ''}
                    </p>
                    {(status === 'rejected' || status === 'expired') && (reason || state?.notes) && (
                      <p className="mt-1 rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">
                        {reason}
                        {state?.notes ? ` — ${state.notes}` : ''}
                      </p>
                    )}
                    {status && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedDoc(doc)}>
                          <EyeIcon className="mr-1 h-3.5 w-3.5" aria-hidden />
                          Ver
                        </Button>
                        <PermissionGuard permissions={TREASURY_VALIDATE_PERMISSIONS} fallback={<></>}>
                          {status !== 'validated' && (
                            <Button size="sm" className="h-7 text-xs" onClick={() => openApprove([doc])}>
                              <CheckCircleIcon className="mr-1 h-3.5 w-3.5" aria-hidden />
                              Validar{isSelected ? ' (V)' : ''}
                            </Button>
                          )}
                          {status !== 'validated' && status !== 'rejected' && (
                            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => openReject(doc)}>
                              <XCircleIcon className="mr-1 h-3.5 w-3.5" aria-hidden />
                              Rechazar{isSelected ? ' (R)' : ''}
                            </Button>
                          )}
                          {status === 'validated' && (
                            <Button variant="outline" size="sm" className="h-7 text-xs text-destructive" onClick={() => setRevokeTarget(doc)}>
                              Revocar
                            </Button>
                          )}
                        </PermissionGuard>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section title="Datos capturados (coteja con el documento)">
            <dl className="divide-y divide-border">
              <Field label="Correo" value={detail.captured.email} />
              <Field label="Teléfono" value={detail.captured.phone} />
              {mx && (
                <>
                  <Field label="CURP" value={detail.captured.curp}>
                    <Check ok={fc.curp} label={fc.curp ? 'Dígito verificador correcto' : 'CURP inválida'} />
                  </Field>
                  <Field label="RFC" value={detail.captured.rfc}>
                    <Check ok={fc.rfcGeneric === true ? false : fc.rfc} label={fc.rfcGeneric ? 'Genérico' : fc.rfc ? 'RFC válido' : 'RFC inválido'} />
                    <Check ok={fc.rfcMatchesCurp} label={fc.rfcMatchesCurp ? 'Coincide con CURP' : 'No coincide con CURP'} />
                  </Field>
                  <Field label="Número de INE" value={detail.captured.ineNumber} />
                  <Field
                    label="Régimen SAT declarado"
                    value={
                      detail.captured.satRegimeCode
                        ? `${detail.captured.satRegimeCode}${detail.captured.satRegimeName ? ` · ${detail.captured.satRegimeName}` : ''}`
                        : null
                    }
                  />
                  <Field label="CP fiscal" value={detail.captured.fiscalZipCode} />
                </>
              )}
              <Field
                label="Aviso de privacidad"
                value={
                  detail.consent?.acceptedAt
                    ? `Aceptado ${formatDateTime(detail.consent.acceptedAt)} · v${detail.consent.version ?? '?'}`
                    : null
                }
              >
                {detail.consent && (
                  <Check
                    ok={!detail.consent.required}
                    label={detail.consent.required ? `Falta la versión vigente (${detail.consent.currentVersion ?? '—'})` : 'Vigente'}
                  />
                )}
              </Field>
            </dl>
          </Section>

          <Section
            title="Cuenta para depósito"
            action={
              bank && !bank.isVerified && uploaded('bankStatement') ? (
                <PermissionGuard permissions={TREASURY_VALIDATE_PERMISSIONS} fallback={<></>}>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openApprove(['bankStatement'])}>
                    Verificar cuenta
                  </Button>
                </PermissionGuard>
              ) : null
            }
          >
            {!bank ? (
              <p className="text-sm italic text-muted-foreground">Sin cuenta bancaria capturada.</p>
            ) : (
              <dl className="divide-y divide-border">
                <Field label="Banco" value={bank.bankName ? `${bank.bankName}${bank.bankCode ? ` (${bank.bankCode})` : ''}` : bank.bankCode}>
                  {mx && bank.bankCode && <span className="text-xs text-muted-foreground">detectado por la CLABE</span>}
                </Field>
                <Field label={mx ? 'CLABE' : 'Cuenta'} value={bank.accountMasked}>
                  <Check ok={fc.clabe} label={fc.clabe ? 'Dígito verificador correcto' : 'Inválida'} />
                </Field>
                {bank.routingMasked && <Field label="Routing (ABA)" value={bank.routingMasked} />}
                {bank.accountType && <Field label="Tipo" value={bank.accountType === 'checking' ? 'Cheques (checking)' : 'Ahorro (savings)'} />}
                <Field label="Titular" value={bank.holder}>
                  <Check ok={fc.holderMatchesName} label={fc.holderMatchesName ? 'Coincide con el nombre' : 'No coincide con el nombre'} />
                </Field>
                <Field label="Moneda" value={bank.currency}>
                  {expectedCurrency && bank.currency && (
                    <Check
                      ok={bank.currency.toUpperCase() === expectedCurrency.toUpperCase()}
                      label={bank.currency.toUpperCase() === expectedCurrency.toUpperCase() ? 'Moneda de pago' : `Debe recibir ${expectedCurrency}`}
                    />
                  )}
                </Field>
                <div className="py-1.5">
                  {bank.isVerified ? (
                    <p className="inline-flex items-center gap-1 text-sm text-emerald-700">
                      <CheckCircleIcon className="h-4 w-4" aria-hidden />
                      Verificada {bank.verifiedAt ? formatDateTime(bank.verifiedAt) : ''}
                      {bank.verifiedBy ? ` por ${actorName(bank.verifiedBy)}` : ''}
                    </p>
                  ) : (
                    <p className="inline-flex items-center gap-1 text-sm text-amber-700">
                      <ExclamationTriangleIcon className="h-4 w-4" aria-hidden />
                      Sin verificar: se verifica al validar la carátula confirmando los últimos 4 dígitos.
                    </p>
                  )}
                </div>
              </dl>
            )}
          </Section>

          <Section
            title="Régimen de comisión"
            action={
              <PermissionGuard permissions={TREASURY_VALIDATE_PERMISSIONS} fallback={<></>}>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setRegimeOpen(true)}>
                  {detail.taxRegime ? 'Cambiar' : 'Asignar'}
                </Button>
              </PermissionGuard>
            }
          >
            {detail.taxRegime ? (
              <p className="text-sm text-foreground">
                <span className="font-mono">{detail.taxRegime.code}</span>
                {detail.taxRegime.name ? ` · ${detail.taxRegime.name}` : ''}
              </p>
            ) : (
              <p className="inline-flex items-center gap-1 text-sm text-amber-700">
                <ExclamationTriangleIcon className="h-4 w-4" aria-hidden />
                Sin asignar{mx ? ': bloquea la aprobación (TRS_REGIME_MISSING)' : ''}
              </p>
            )}
            {suggestedRegime && suggestedRegime !== detail.taxRegime?.code && (
              <p className="mt-1 text-xs text-muted-foreground">
                Sugerido por el régimen SAT {detail.captured.satRegimeCode ?? '—'}: <span className="font-mono">{suggestedRegime}</span>
              </p>
            )}
            <button
              type="button"
              className="mt-2 text-xs text-primary hover:underline"
              onClick={() => setHistoryOpen((v) => !v)}
              aria-expanded={historyOpen}
            >
              {historyOpen ? 'Ocultar historial' : 'Ver historial de cambios'}
            </button>
            {historyOpen && (
              <div className="mt-2">
                {historyQuery.isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : historyQuery.isError ? (
                  <p className="text-xs text-destructive">
                    {treasuryErrorMessage(historyQuery.error, 'No se pudo cargar el historial del régimen')}
                  </p>
                ) : (historyQuery.data ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin cambios registrados.</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {(historyQuery.data ?? []).map((h, i) => (
                      <li key={h.id ?? `${h.changedAt}-${i}`} className="text-muted-foreground">
                        <span className="text-foreground">
                          {h.previousCode ?? '—'} → {h.newCode ?? '—'}
                        </span>
                        {' · '}
                        {formatDateTime(h.changedAt)} · {actorName(h.changedBy)}
                        {h.reason ? ` · ${h.reason}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Section>

          <Section title="Checklist por país">
            <ReviewChecklist items={detail.checklist} />
          </Section>

          <Section title="Historial de revisiones">
            <ReviewTimeline reviews={detail.reviews} reasonLabel={reasonLabel} />
          </Section>

          {enableShortcuts && (
            <p className="text-[11px] text-muted-foreground">
              Atajos: <kbd className="rounded border px-1">J</kbd> siguiente · <kbd className="rounded border px-1">K</kbd> anterior ·{' '}
              <kbd className="rounded border px-1">V</kbd> validar · <kbd className="rounded border px-1">R</kbd> rechazar el documento visible.
            </p>
          )}
        </div>
      </div>

      {(reviewMutation.isPending || revokeMutation.isPending || assignMutation.isPending) && (
        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Guardando…
        </p>
      )}

      {/* Diálogos (montados solo mientras están abiertos) */}
      {approveTarget && (
        <ApproveDocumentsDialog
          documents={approveTarget}
          detail={detail}
          regimes={regimes}
          suggestedRegime={suggestedRegime}
          isPending={reviewMutation.isPending}
          onOpenChange={(o) => !o && setApproveTarget(null)}
          onConfirm={async (payload) => {
            const ok = await submitReview(payload);
            if (ok) setApproveTarget(null);
          }}
        />
      )}
      {rejectTarget && (
        <RejectDocumentDialog
          document={rejectTarget}
          customerLabel={customerLabel}
          reasons={reasons}
          isPending={reviewMutation.isPending}
          onOpenChange={(o) => !o && setRejectTarget(null)}
          onConfirm={async ({ reasonCode, notes }) => {
            const ok = await submitReview({
              validations: [{ document: rejectTarget, approved: false, reasonCode, notes }],
            });
            if (ok) setRejectTarget(null);
          }}
        />
      )}
      {revokeTarget && (
        <RevokeDocumentDialog
          document={revokeTarget}
          customerLabel={customerLabel}
          reasons={reasons}
          isPending={revokeMutation.isPending}
          onOpenChange={(o) => !o && setRevokeTarget(null)}
          onConfirm={async (payload) => {
            try {
              await revokeMutation.mutateAsync({ customerId, document: revokeTarget, payload });
              toast.success('Validación revocada; se avisó al distribuidor');
              setRevokeTarget(null);
            } catch (err) {
              toast.error(treasuryErrorMessage(err, 'No se pudo revocar la validación'));
            }
          }}
        />
      )}
      {regimeOpen && (
        <AssignRegimeDialog
          detail={detail}
          regimes={regimes}
          suggestedRegime={suggestedRegime}
          isPending={assignMutation.isPending}
          onOpenChange={(o) => !o && setRegimeOpen(false)}
          onConfirm={async (payload) => {
            try {
              await assignMutation.mutateAsync({ customerId, payload });
              toast.success(`Régimen de comisión ${payload.regimeCode} asignado`);
              setRegimeOpen(false);
            } catch (err) {
              toast.error(treasuryErrorMessage(err, 'No se pudo asignar el régimen'));
            }
          }}
        />
      )}
      {remindOpen && (
        <RemindDialog
          scopeLabel={customerLabel}
          whatsappAvailable
          isPending={remindMutation.isPending}
          onOpenChange={(o) => !o && setRemindOpen(false)}
          onConfirm={async (channels) => {
            try {
              const res = await remindMutation.mutateAsync({ customerIds: [customerId], channels });
              if (res.queued > 0) toast.success('Recordatorio enviado');
              else toast.warning(`No se envió: ${res.skipped[0]?.reason ?? 'sin canal disponible'}`);
              setRemindOpen(false);
            } catch (err) {
              toast.error(treasuryErrorMessage(err, 'No se pudo enviar el recordatorio'));
            }
          }}
        />
      )}
    </div>
  );
}

/** Firma del detalle para quien necesite el tipo sin importar el servicio. */
export type { ReadinessDetail };
