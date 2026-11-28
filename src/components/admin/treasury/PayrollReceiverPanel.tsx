'use client';

// PayrollReceiverPanel — formulario de los datos del recibo de nómina de UN
// distribuidor (Tesorería, Diego, 27-nov-2026): RFC, CURP y código postal
// propios, cómo va a salir el recibo y, si ya está todo, timbrarlo ahí mismo.
//
// "Aquí puedo revisarlos pero no puedo completarlos o editarlos": la columna
// Comprobante de Bono de Inscripción decía "Faltan datos" y la revisión de
// Validación de datos era de solo consulta. Este formulario se usa en los dos
// lados: dentro del panel lateral de Bono de Inscripción (PayrollReceiverSheet)
// y en un diálogo desde la revisión (PaymentReadinessReview).
//
// Solo se escribe el perfil de NÓMINA del distribuidor (su RFC propio). El de
// facturación de sus compras se enseña de consulta y no se modifica: en Tonic
// Life suele ser el de la líder de la red.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { usePayrollReceiver, useUpdatePayrollReceiver } from '@/hooks/usePayrollReceiver';
import { apiErrorMessage } from '@/lib/api-error';
import {
  RFC_SOURCE_LABEL,
  cleanFiscalId,
  cleanZip,
  draftChanges,
  draftFromReceiver,
  draftHints,
  hasChanges,
  readReceiverSaveError,
  rfcMatchesCurp,
  satRejectionHint,
  type PayrollReceiverDraft,
} from '@/lib/treasury/payroll-receiver';
import type { PayrollReceiver, PayrollReceiverField } from '@/types/payroll-receiver';

/** Lo que el panel necesita saber del recibo pendiente para ofrecer "timbrar". */
export interface PayrollReceiverStampContext {
  /** Se puede (re)intentar el timbre de este pago: está pagado, es de nómina y no tiene recibo vivo. */
  canStamp: boolean;
  /** "Timbrar", "Reintentar" o "Timbrar de nuevo". */
  label: string;
  /** Último rechazo del SAT o del PAC, si lo hubo. */
  lastError: string | null;
  /** Renglones de contexto: bonos, subtotal, ISR, neto, fecha de pago. */
  facts: Array<{ label: string; value: string }>;
  /** Timbra; true si quedó timbrado. Los avisos los da quien lo implementa. */
  onStamp: () => Promise<boolean>;
}

interface PayrollReceiverPanelProps {
  customerId: string;
  stamp?: PayrollReceiverStampContext | null;
  /** Se llama cuando el recibo quedó timbrado desde aquí (para cerrar el panel). */
  onStamped?: () => void;
  /** Sin permiso para guardar: solo consulta. */
  readOnly?: boolean;
}

const FIELD_LABEL: Record<PayrollReceiverField, string> = {
  rfc: 'RFC del distribuidor',
  curp: 'CURP',
  zipCode: 'Código postal fiscal',
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-gray-900">{children}</dd>
    </div>
  );
}

function Card({ title, children, tone = 'plain' }: { title: string; children: React.ReactNode; tone?: 'plain' | 'muted' }) {
  return (
    <section className={`rounded-xl border border-gray-200 p-4 ${tone === 'muted' ? 'bg-gray-50' : 'bg-white'}`}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      {children}
    </section>
  );
}

const missing = <span className="font-normal italic text-gray-400">Sin capturar</span>;

/** Datos del recibo de UN distribuidor: los pide y, ya cargados, pinta el formulario. */
export function PayrollReceiverPanel({ customerId, stamp, onStamped, readOnly = false }: PayrollReceiverPanelProps) {
  const query = usePayrollReceiver(customerId);
  const receiver = query.data;

  if (query.isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  if (query.isError || !receiver) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-medium">No se pudieron cargar los datos del recibo.</p>
        <p className="mt-1">
          {apiErrorMessage(query.error, 'Intenta de nuevo.', {
            forbidden: 'Tu cuenta no tiene permiso para ver los datos del recibo (commissions:validate).',
            notFound: 'El servidor todavía no trae esta función. Avisa a Sistemas.',
          })}
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void query.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  // `key`: con otro distribuidor el formulario nace limpio, con lo guardado de ese.
  return (
    <PayrollReceiverForm
      key={receiver.customerId}
      receiver={receiver}
      stamp={stamp}
      onStamped={onStamped}
      readOnly={readOnly}
      onRefresh={() => void query.refetch()}
    />
  );
}

interface PayrollReceiverFormProps {
  receiver: PayrollReceiver;
  stamp?: PayrollReceiverStampContext | null;
  onStamped?: () => void;
  readOnly: boolean;
  /** Vuelve a pedir los datos (tras un timbrado rechazado). */
  onRefresh: () => void;
}

function PayrollReceiverForm({ receiver, stamp, onStamped, readOnly, onRefresh }: PayrollReceiverFormProps) {
  const customerId = receiver.customerId;
  const save = useUpdatePayrollReceiver();

  // Abre con lo guardado en su perfil de nómina.
  const [draft, setDraft] = useState<PayrollReceiverDraft>(() => draftFromReceiver(receiver));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PayrollReceiverField, string>>>({});
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [stamping, setStamping] = useState(false);

  const changes = useMemo(() => draftChanges(receiver, draft), [receiver, draft]);
  const dirty = hasChanges(changes);
  const hints = draftHints(draft);
  const busy = save.isPending || stamping;

  // Aviso mientras se teclea: el RFC y la CURP deben ser de la misma persona.
  const curpForCheck = cleanFiscalId(draft.curp) || receiver.payroll.curp || receiver.generalCurp || '';
  const rfcForCheck = cleanFiscalId(draft.rfc);
  const looksMismatch = rfcForCheck.length === 13 && curpForCheck.length === 18 && !rfcMatchesCurp(rfcForCheck, curpForCheck);

  const set = (field: PayrollReceiverField, value: string) => {
    setDraft((d) => ({ ...d, [field]: field === 'zipCode' ? cleanZip(value) : cleanFiscalId(value) }));
    setFieldErrors((e) => ({ ...e, [field]: undefined }));
    if (field !== 'zipCode') {
      setNeedsConfirm(false);
      setConfirmed(false);
    }
  };

  /** Guarda lo que cambió. Devuelve los datos como quedaron, o null si no se pudo. */
  const persist = async (): Promise<PayrollReceiver | null> => {
    if (!dirty) return receiver;
    try {
      const result = await save.mutateAsync({
        customerId,
        input: { ...changes, ...(needsConfirm && confirmed ? { confirmMismatch: true } : {}) },
      });
      setDraft(draftFromReceiver(result));
      setFieldErrors({});
      setNeedsConfirm(false);
      setConfirmed(false);
      toast.success(
        result.changedLabel
          ? `Se guardó ${result.changedLabel} de ${result.customerNumber ?? 'el distribuidor'}.${result.ready ? ' Ya se puede timbrar su recibo.' : ''}`
          : 'No había nada que cambiar.',
      );
      return result;
    } catch (err) {
      const read = readReceiverSaveError(err, apiErrorMessage(err, 'No se pudieron guardar los datos.'));
      setFieldErrors(Object.fromEntries(read.errors.map((e) => [e.field, e.message])));
      setNeedsConfirm(read.needsConfirm);
      if (!read.needsConfirm) toast.error(read.message, { duration: 8000 });
      return null;
    }
  };

  const runStamp = async () => {
    if (!stamp) return;
    setStamping(true);
    try {
      const done = await stamp.onStamp();
      if (done) onStamped?.();
      else onRefresh();
    } finally {
      setStamping(false);
    }
  };

  const saveAndStamp = async () => {
    const result = await persist();
    if (!result) return;
    if (!result.ready) {
      toast.warning('Se guardó, pero todavía falta algo para timbrar: revisa la lista de arriba.');
      return;
    }
    await runStamp();
  };

  const r = receiver;
  const receipt = r.receipt;
  const canOfferStamp = !!stamp && stamp.canStamp && !readOnly;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {/* ---- Izquierda: qué falta y la captura ---- */}
      <div className="space-y-4">
        {r.ready ? (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">Sus datos están completos.</p>
              <p>Con lo que hay guardado, el recibo ya se puede timbrar.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="mb-1 flex items-center gap-1.5 font-medium">
              <ExclamationTriangleIcon className="h-5 w-5" aria-hidden />
              Falta para poder timbrar
            </p>
            <ul className="list-disc space-y-1 pl-6">
              {(r.issues.length ? r.issues : ['Faltan datos del distribuidor.']).map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {stamp?.lastError &&
          (() => {
            const hint = satRejectionHint(stamp.lastError);
            return (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                <p className="mb-1 font-medium">El SAT rechazó el último intento de timbrado</p>
                {hint ? (
                  <>
                    <p>{hint.text}</p>
                    <p className="mt-2 break-words text-xs text-red-800/80">Mensaje del SAT: {stamp.lastError}</p>
                  </>
                ) : (
                  <p className="break-words">{stamp.lastError}</p>
                )}
              </div>
            );
          })()}

        <Card title="Datos con los que sale su recibo">
          <p className="mb-3 text-sm text-gray-600">
            Captura los datos <span className="font-medium">del propio distribuidor</span>, como aparecen en su Constancia de Situación Fiscal. Un campo vacío no cambia nada.
          </p>
          <div className="space-y-3">
            {(['rfc', 'curp', 'zipCode'] as const).map((field) => {
              const error = fieldErrors[field];
              const hint = hints[field];
              const saved = field === 'rfc' ? r.payroll.rfc : field === 'curp' ? r.payroll.curp : r.payroll.zipCode;
              return (
                <div key={field} className="space-y-1">
                  <Label htmlFor={`payroll-receiver-${field}`}>{FIELD_LABEL[field]}</Label>
                  <Input
                    id={`payroll-receiver-${field}`}
                    value={draft[field]}
                    onChange={(e) => set(field, e.target.value)}
                    disabled={readOnly || busy}
                    inputMode={field === 'zipCode' ? 'numeric' : 'text'}
                    maxLength={field === 'rfc' ? 13 : field === 'curp' ? 18 : 5}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={field === 'rfc' ? '13 caracteres' : field === 'curp' ? (r.generalCurp ? `En su cuenta: ${r.generalCurp}` : '18 caracteres') : '5 dígitos'}
                    aria-invalid={!!error}
                    className={`font-mono uppercase tracking-wide ${error ? 'border-red-400 focus-visible:ring-red-200' : ''}`}
                  />
                  {error ? (
                    <p className="text-xs text-red-700">{error}</p>
                  ) : hint ? (
                    <p className="text-xs text-amber-700">{hint}</p>
                  ) : field === 'curp' && !saved && r.generalCurp ? (
                    <p className="text-xs text-gray-500">Si la dejas vacía se usa la CURP de su cuenta ({r.generalCurp}).</p>
                  ) : field === 'zipCode' ? (
                    <p className="text-xs text-gray-500">El del domicilio fiscal de su constancia: el SAT rechaza el recibo si no coincide.</p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {(looksMismatch || needsConfirm) && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p>
                El RFC y la CURP no parecen de la misma persona (las dos primeras letras y la fecha de nacimiento deben coincidir). Revisa que no sea el RFC de otra persona.
              </p>
              {needsConfirm && !readOnly && (
                <label className="mt-2 flex items-start gap-2 text-sm">
                  <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} aria-label="Confirmo que el RFC es de este distribuidor" className="mt-0.5" />
                  <span>Ya lo revisé contra su constancia: es el RFC de este distribuidor. Guardar de todos modos.</span>
                </label>
              )}
            </div>
          )}

          {!readOnly && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => void persist()} disabled={!dirty || busy || (needsConfirm && !confirmed)} variant={canOfferStamp ? 'outline' : 'default'}>
                {save.isPending && !stamping ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Guardar
              </Button>
              {canOfferStamp &&
                (dirty ? (
                  <Button onClick={() => void saveAndStamp()} disabled={busy || (needsConfirm && !confirmed)}>
                    {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                    Guardar y timbrar
                  </Button>
                ) : (
                  <Button onClick={() => void runStamp()} disabled={busy || !r.ready} title={r.ready ? 'Emitir el recibo de nómina de este pago' : 'Primero completa lo que falta'}>
                    {stamping ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                    {stamping ? 'Timbrando…' : `${stamp!.label} el recibo`}
                  </Button>
                ))}
            </div>
          )}
          {readOnly && <p className="mt-3 text-xs text-gray-500">Solo lectura: guardar requiere el permiso de Tesorería (commissions:validate).</p>}
        </Card>

        {r.sharedRfcWith.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p>
              Ese mismo RFC de nómina lo {r.sharedRfcWith.length === 1 ? 'tiene otra cuenta' : 'tienen otras cuentas'}: {r.sharedRfcWith.map((n) => `#${n}`).join(', ')}. Puede ser la misma persona con dos números, o un RFC capturado en la cuenta equivocada.
            </p>
          </div>
        )}
      </div>

      {/* ---- Derecha: cómo va a salir y de dónde sale cada dato ---- */}
      <div className="space-y-4">
        <Card title="Así saldrá el recibo">
          {receipt ? (
            <dl className="divide-y divide-gray-100">
              <Row label="Nombre">{receipt.name}</Row>
              <Row label="RFC">
                <span className="font-mono">{receipt.rfc}</span>
                <span className="block text-xs font-normal text-gray-500">{RFC_SOURCE_LABEL[receipt.rfcSource]}</span>
              </Row>
              <Row label="CURP">{receipt.curp ? <span className="font-mono">{receipt.curp}</span> : missing}</Row>
              <Row label="Código postal">{receipt.zipCode ? <span className="font-mono">{receipt.zipCode}</span> : missing}</Row>
              <Row label="Régimen">605 · Sueldos y salarios e ingresos asimilados</Row>
              <Row label="Se envía a">{receipt.email ?? <span className="font-normal italic text-gray-400">Sin correo: no se envía</span>}</Row>
            </dl>
          ) : (
            <p className="text-sm text-gray-600">Todavía no hay con qué armar el recibo: falta un RFC que sea del distribuidor.</p>
          )}
          <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-500">
            <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              El nombre sale de la cuenta del distribuidor y el SAT lo compara contra su RFC. Si lo rechaza por nombre, se corrige en{' '}
              <Link href={`/admin/distribuidores/${r.customerId}`} target="_blank" className="inline-flex items-center gap-0.5 font-medium text-[#3E667D] hover:underline">
                su ficha
                <ArrowTopRightOnSquareIcon className="h-3 w-3" aria-hidden />
              </Link>
              .
            </span>
          </p>
        </Card>

        {stamp && stamp.facts.length > 0 && (
          <Card title="Pago que se va a comprobar">
            <dl className="divide-y divide-gray-100">
              {stamp.facts.map((f) => (
                <Row key={f.label} label={f.label}>
                  {f.value}
                </Row>
              ))}
            </dl>
          </Card>
        )}

        <Card title="Facturación de sus compras · solo consulta" tone="muted">
          <dl className="divide-y divide-gray-200">
            <Row label="RFC">
              {r.billing.rfc ? (
                <>
                  <span className="font-mono">{r.billing.rfc}</span>
                  {r.billing.isOwn === false && <span className="block text-xs font-normal text-amber-700">No es el suyo: no cuadra con su CURP</span>}
                  {r.billing.isOwn === true && <span className="block text-xs font-normal text-emerald-700">Es el suyo</span>}
                </>
              ) : (
                missing
              )}
            </Row>
            <Row label="Razón social">{r.billing.legalName ?? missing}</Row>
            <Row label="Código postal">{r.billing.zipCode ? <span className="font-mono">{r.billing.zipCode}</span> : missing}</Row>
          </dl>
          <p className="mt-2 text-xs text-gray-500">
            Es a quién se le facturan sus compras (muchas veces, la líder de su red). Aquí no se modifica y el recibo de nómina no lo usa, salvo que sea el suyo.
          </p>
        </Card>
      </div>
    </div>
  );
}
