'use client';

// ReviewDialogs — confirmaciones de Validación de Datos sobre ConfirmDialog
// (nunca window.confirm): validar (con régimen de comisión obligatorio para la
// constancia MX/FN y verificación de cuenta con los 4 últimos dígitos para la
// carátula), rechazar (motivo estándar del catálogo + nota), revocar
// (destructivo, confirmText), asignar régimen (motivo 5-300) y recordar
// (canales). Cada diálogo se monta solo mientras está abierto: su estado
// nace limpio sin resetear en useEffect.

import { useId, useMemo, useState } from 'react';
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type {
  AssignTaxRegimePayload,
  PaymentDocumentKey,
  ReadinessDetail,
  RegimeRef,
  RejectionReasonItem,
  RemindChannel,
  ReviewPayload,
  RevokePayload,
} from '@/types/treasury-readiness';
import { REMIND_CHANNELS } from '@/types/treasury-readiness';
import { DOCUMENT_LONG_LABELS, REMIND_CHANNEL_LABELS, countryProfileOf } from './readiness-labels';

const REASON_MIN = 5;
const REASON_MAX = 300;
const NOTES_MAX = 500;
const NO_TAX_CODE = 'SIN_IMPUESTO';

function regimeOptions(regimes: RegimeRef[], countryCode: string | null | undefined) {
  const mx = countryProfileOf(countryCode) === 'MX';
  const list = mx ? regimes : regimes.filter((r) => r.code === NO_TAX_CODE);
  return list.map((r) => ({ value: r.code, label: r.name ? `${r.code} · ${r.name}` : r.code }));
}

// ── Validar ────────────────────────────────────────────────────────────────

interface ApproveDocumentsDialogProps {
  documents: PaymentDocumentKey[];
  detail: ReadinessDetail;
  regimes: RegimeRef[];
  /** Régimen de comisión sugerido por el régimen SAT declarado (o null). */
  suggestedRegime: string | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: ReviewPayload) => void | Promise<void>;
}

export function ApproveDocumentsDialog({
  documents,
  detail,
  regimes,
  suggestedRegime,
  isPending,
  onOpenChange,
  onConfirm,
}: ApproveDocumentsDialogProps) {
  const mx = countryProfileOf(detail.customer.countryCode) === 'MX';
  const includesTaxId = documents.includes('taxId');
  const includesBank = documents.includes('bankStatement');
  const currentRegime = detail.taxRegime?.code ?? null;
  const needsRegime = mx && includesTaxId && !currentRegime;

  const [regimeCode, setRegimeCode] = useState<string>(currentRegime ?? suggestedRegime ?? '');
  const [last4Ok, setLast4Ok] = useState(false);
  const [notes, setNotes] = useState('');
  const regimeId = useId();
  const last4Id = useId();
  const notesId = useId();

  const options = useMemo(
    () => regimeOptions(regimes, detail.customer.countryCode),
    [regimes, detail.customer.countryCode],
  );
  const bank = detail.bankAccount;
  const bankSuffix = bank?.accountMasked ? bank.accountMasked.slice(-4) : null;
  const canVerifyBank = includesBank && !!bank && !bank.isVerified;
  const regimeOk = !needsRegime || regimeCode.trim().length > 0;
  const title =
    documents.length === 1
      ? `Validar: ${DOCUMENT_LONG_LABELS[documents[0]]}`
      : `Validar ${documents.length} documentos`;

  return (
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title={title}
      description={`${detail.customer.name} · #${detail.customer.customerNumber ?? '—'}. La validación queda en la bitácora con tu usuario.`}
      confirmLabel="Validar"
      isPending={isPending}
      disabled={!regimeOk}
      onConfirm={() =>
        onConfirm({
          validations: documents.map((document) => ({
            document,
            approved: true,
            notes: notes.trim() || undefined,
          })),
          regimeCode: mx && includesTaxId && regimeCode && regimeCode !== currentRegime ? regimeCode : undefined,
          verifyBankAccount: canVerifyBank && last4Ok ? true : undefined,
          bankLast4Confirmed: canVerifyBank && last4Ok ? true : undefined,
        })
      }
    >
      <div className="space-y-4">
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-foreground">
          {documents.map((d) => (
            <li key={d}>{DOCUMENT_LONG_LABELS[d]}</li>
          ))}
        </ul>

        {mx && includesTaxId && (
          <div className="space-y-1.5">
            <Label htmlFor={regimeId}>
              Régimen de comisión {needsRegime ? '(obligatorio para validar la constancia)' : ''}
            </Label>
            <SearchableSelect
              id={regimeId}
              options={options}
              value={regimeCode}
              onChange={setRegimeCode}
              showAllOption={false}
              placeholder="Elegir régimen de comisión"
              aria-invalid={!regimeOk}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              {currentRegime
                ? `Asignado hoy: ${currentRegime}. Cambiarlo aquí queda en el historial del régimen.`
                : suggestedRegime
                  ? `Sugerido por el régimen SAT declarado (${detail.captured.satRegimeCode ?? '—'}): ${suggestedRegime}. Tesorería decide.`
                  : 'Nunca SIN_IMPUESTO por omisión: sin régimen la comisión no se aprueba (TRS_REGIME_MISSING).'}
            </p>
          </div>
        )}

        {includesBank && (
          <div
            className={`rounded-md border p-3 text-sm ${
              canVerifyBank ? 'border-amber-300 bg-amber-50' : 'border-border bg-muted/40'
            }`}
          >
            {canVerifyBank ? (
              <div className="flex items-start gap-2">
                <Checkbox
                  id={last4Id}
                  checked={last4Ok}
                  onCheckedChange={(v) => setLast4Ok(v === true)}
                  disabled={isPending}
                />
                <Label htmlFor={last4Id} className="cursor-pointer leading-snug">
                  Los últimos 4 dígitos de la cuenta capturada{' '}
                  <span className="font-mono">{bankSuffix ? `****${bankSuffix}` : '****'}</span>{' '}
                  coinciden con la carátula y el titular es el distribuidor. Al marcarlo la cuenta
                  queda VERIFICADA para dispersión{bank?.currency ? ` en ${bank.currency}` : ''}.
                </Label>
              </div>
            ) : bank?.isVerified ? (
              <p className="flex items-center gap-2 text-emerald-700">
                <InformationCircleIcon className="h-4 w-4" aria-hidden />
                La cuenta ya está verificada.
              </p>
            ) : (
              <p className="flex items-start gap-2 text-amber-800">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                No hay cuenta bancaria capturada: la carátula se puede validar, pero la cuenta seguirá sin
                verificar hasta que el distribuidor la capture.
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor={notesId}>Nota (opcional)</Label>
          <Textarea
            id={notesId}
            value={notes}
            maxLength={NOTES_MAX}
            rows={2}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones internas de la revisión"
            disabled={isPending}
          />
        </div>
      </div>
    </ConfirmDialog>
  );
}

// ── Rechazar / Revocar ─────────────────────────────────────────────────────

interface ReasonDialogProps {
  document: PaymentDocumentKey;
  customerLabel: string;
  reasons: RejectionReasonItem[];
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
}

function useReasonForm(reasons: RejectionReasonItem[]) {
  const [reasonCode, setReasonCode] = useState('');
  const [notes, setNotes] = useState('');
  const selected = reasons.find((r) => r.code === reasonCode) ?? null;
  const notesRequired = selected?.notesRequired === true || reasons.length === 0;
  const notesOk = !notesRequired || notes.trim().length >= REASON_MIN;
  const reasonOk = reasons.length === 0 ? notes.trim().length >= REASON_MIN : reasonCode.length > 0;
  return { reasonCode, setReasonCode, notes, setNotes, selected, notesRequired, valid: reasonOk && notesOk };
}

function ReasonFields({
  reasons,
  form,
  isPending,
  notesLabel,
}: {
  reasons: RejectionReasonItem[];
  form: ReturnType<typeof useReasonForm>;
  isPending: boolean;
  notesLabel: string;
}) {
  const reasonId = useId();
  const notesId = useId();
  return (
    <div className="space-y-4">
      {reasons.length > 0 ? (
        <div className="space-y-1.5">
          <Label htmlFor={reasonId}>Motivo estándar</Label>
          <SearchableSelect
            id={reasonId}
            options={reasons.map((r) => ({ value: r.code, label: r.label, hint: r.code }))}
            value={form.reasonCode}
            onChange={form.setReasonCode}
            showAllOption={false}
            placeholder="Elegir motivo"
            aria-invalid={form.reasonCode.length === 0}
            disabled={isPending}
          />
        </div>
      ) : (
        <p className="text-xs text-amber-800">
          El catálogo de motivos no cargó: describe el motivo en la nota (mínimo {REASON_MIN} caracteres).
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor={notesId}>
          {notesLabel} {form.notesRequired ? '(obligatoria)' : '(opcional)'}
        </Label>
        <Textarea
          id={notesId}
          value={form.notes}
          maxLength={NOTES_MAX}
          rows={3}
          onChange={(e) => form.setNotes(e.target.value)}
          placeholder="Explica al distribuidor qué debe corregir"
          aria-invalid={form.notesRequired && form.notes.trim().length < REASON_MIN}
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          El distribuidor verá el motivo y la nota en Datos para Comisiones.
        </p>
      </div>
    </div>
  );
}

export function RejectDocumentDialog({
  document,
  customerLabel,
  reasons,
  isPending,
  onOpenChange,
  onConfirm,
}: ReasonDialogProps & { onConfirm: (input: { reasonCode: string; notes?: string }) => void | Promise<void> }) {
  const form = useReasonForm(reasons);
  return (
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title={`Rechazar: ${DOCUMENT_LONG_LABELS[document]}`}
      description={`${customerLabel}. El documento vuelve a "rechazado" y el distribuidor debe subirlo de nuevo.`}
      confirmLabel="Rechazar documento"
      destructive
      isPending={isPending}
      disabled={!form.valid}
      onConfirm={() =>
        onConfirm({
          reasonCode: form.reasonCode || 'OTRO',
          notes: form.notes.trim() || undefined,
        })
      }
    >
      <ReasonFields reasons={reasons} form={form} isPending={isPending} notesLabel="Nota para el distribuidor" />
    </ConfirmDialog>
  );
}

export function RevokeDocumentDialog({
  document,
  customerLabel,
  reasons,
  isPending,
  onOpenChange,
  onConfirm,
}: ReasonDialogProps & { onConfirm: (payload: RevokePayload) => void | Promise<void> }) {
  const form = useReasonForm(reasons);
  return (
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title={`Revocar validación: ${DOCUMENT_LONG_LABELS[document]}`}
      description={`${customerLabel}. El documento pasa a rechazado, documents_validated se apaga${
        document === 'bankStatement' ? ' y la cuenta bancaria deja de estar verificada' : ''
      }; se avisa al distribuidor.`}
      confirmLabel="Revocar"
      confirmText="REVOCAR"
      destructive
      isPending={isPending}
      disabled={!form.valid}
      onConfirm={() =>
        onConfirm({
          reasonCode: form.reasonCode || 'OTRO',
          notes: form.notes.trim() || undefined,
        })
      }
    >
      <ReasonFields reasons={reasons} form={form} isPending={isPending} notesLabel="Nota" />
    </ConfirmDialog>
  );
}

// ── Asignar régimen de comisión ────────────────────────────────────────────

interface AssignRegimeDialogProps {
  detail: ReadinessDetail;
  regimes: RegimeRef[];
  suggestedRegime: string | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: AssignTaxRegimePayload) => void | Promise<void>;
}

export function AssignRegimeDialog({
  detail,
  regimes,
  suggestedRegime,
  isPending,
  onOpenChange,
  onConfirm,
}: AssignRegimeDialogProps) {
  const current = detail.taxRegime?.code ?? null;
  const mx = countryProfileOf(detail.customer.countryCode) === 'MX';
  const [regimeCode, setRegimeCode] = useState(current ?? (mx ? (suggestedRegime ?? '') : NO_TAX_CODE));
  const [reason, setReason] = useState('');
  const regimeId = useId();
  const reasonId = useId();
  const reasonHelpId = `${reasonId}-help`;
  const options = useMemo(
    () => regimeOptions(regimes, detail.customer.countryCode),
    [regimes, detail.customer.countryCode],
  );
  const reasonOk = reason.trim().length >= REASON_MIN && reason.trim().length <= REASON_MAX;
  const changed = regimeCode.length > 0 && regimeCode !== current;

  return (
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title={current ? 'Cambiar régimen de comisión' : 'Asignar régimen de comisión'}
      description={`${detail.customer.name} · #${detail.customer.customerNumber ?? '—'}. Fuente de verdad: customers.commission_tax_regime_id; el trigger guarda el historial con tu usuario y el motivo.`}
      confirmLabel={current ? 'Cambiar régimen' : 'Asignar régimen'}
      confirmText={current ? regimeCode || undefined : undefined}
      isPending={isPending}
      disabled={!changed || !reasonOk}
      onConfirm={() => onConfirm({ regimeCode, reason: reason.trim() })}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={regimeId}>Régimen de comisión</Label>
          <SearchableSelect
            id={regimeId}
            options={options}
            value={regimeCode}
            onChange={setRegimeCode}
            showAllOption={false}
            placeholder="Elegir régimen"
            disabled={isPending || (!mx && options.length <= 1)}
          />
          <p className="text-xs text-muted-foreground">
            {!mx
              ? 'País distinto de MX/FN: solo admite SIN_IMPUESTO (el motor no aplica impuestos mexicanos).'
              : suggestedRegime
                ? `Sugerencia por régimen SAT ${detail.captured.satRegimeCode ?? '—'}: ${suggestedRegime}. Es una decisión de la empresa (opción LISR 94-VI), no una función del régimen SAT.`
                : 'Sin régimen SAT declarado no hay sugerencia; revisa la constancia antes de asignar.'}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={reasonId}>Motivo (5 a 300 caracteres)</Label>
          <Textarea
            id={reasonId}
            value={reason}
            maxLength={REASON_MAX}
            rows={3}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. Constancia de situación fiscal del 2026-09 indica régimen 612"
            aria-describedby={reasonHelpId}
            aria-invalid={reason.length > 0 && !reasonOk}
            disabled={isPending}
          />
          <p id={reasonHelpId} className="text-xs text-muted-foreground">
            Queda en customer_tax_regime_history (audit.tax_regime_change_reason).
          </p>
        </div>
      </div>
    </ConfirmDialog>
  );
}

// ── Recordatorio ───────────────────────────────────────────────────────────

interface RemindDialogProps {
  /** Texto del alcance: "3 distribuidores seleccionados" o "earners del periodo X con datos incompletos". */
  scopeLabel: string;
  whatsappAvailable: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (channels: RemindChannel[]) => void | Promise<void>;
}

export function RemindDialog({ scopeLabel, whatsappAvailable, isPending, onOpenChange, onConfirm }: RemindDialogProps) {
  const [channels, setChannels] = useState<RemindChannel[]>(['inApp', 'email']);
  const baseId = useId();
  const toggle = (c: RemindChannel, on: boolean) =>
    setChannels((prev) => (on ? Array.from(new Set([...prev, c])) : prev.filter((x) => x !== c)));

  return (
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="Recordar captura de datos para pago"
      description={`Se enviará la plantilla payment-data-reminder a ${scopeLabel}. Se omiten quienes no tienen cuenta de acceso o pidieron no recibir WhatsApp.`}
      confirmLabel="Enviar recordatorio"
      isPending={isPending}
      disabled={channels.length === 0}
      onConfirm={() => onConfirm(channels)}
    >
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Canales</legend>
        {REMIND_CHANNELS.map((c) => {
          const id = `${baseId}-${c}`;
          const disabled = isPending || (c === 'whatsapp' && !whatsappAvailable);
          return (
            <div key={c} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={channels.includes(c)}
                onCheckedChange={(v) => toggle(c, v === true)}
                disabled={disabled}
              />
              <Label htmlFor={id} className={disabled ? 'text-muted-foreground' : 'cursor-pointer'}>
                {REMIND_CHANNEL_LABELS[c]}
                {c === 'whatsapp' && !whatsappAvailable ? ' — sin plantilla configurada' : ''}
              </Label>
            </div>
          );
        })}
      </fieldset>
    </ConfirmDialog>
  );
}
