'use client';

// WithholdingFormSheet — alta y edición de convenio (contrato §4.4 / §5.4).
//
// Alta: distribuidor (SearchableSelect asíncrono), concepto, descripción,
// total (obligatorio en préstamo), abono por periodo, tope % del neto,
// periodo de inicio, folio de autorización, nota de autorización (≥ 5) y
// pagaré opcional (se sube DESPUÉS de crear, a ruta privada).
// Edición: abono (≤ saldo), tope, descripción, folio, nota nueva (se ANEXA)
// y pagaré. Los cambios de estado van aparte (WithholdingStatusDialog).
// Montar con `key` por apertura: el formulario arranca limpio sin efectos.

import { useId, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { FileUpload } from '@/components/ui/FileUpload';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  useCreateWithholdingV2,
  useUpdateWithholdingV2,
  useUploadWithholdingAttachment,
} from '@/hooks/useTreasury';
import type {
  CreateWithholdingPayload,
  UpdateWithholdingPayload,
  WithholdingAgreementRow,
  WithholdingConcept,
} from '@/types/treasury';
import type { MlmPeriod } from '@/types/mlm-periods';
import { treasuryErrorMessage } from '../treasury-error';
import { formatMoney, toNumber } from '../treasury-format';
import { DistributorSearchSelect, type DistributorOption } from './DistributorSearchSelect';
import { withholdingConceptLabel } from './withholding-format';

interface WithholdingFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Con fila = edición; sin fila = alta. */
  agreement?: WithholdingAgreementRow | null;
  /** Periodos visibles (del más reciente al más viejo) para "aplica desde". */
  periods: MlmPeriod[];
  /** Tope global del periodo (ajuste `treasury.withholding_max_pct_per_period`). */
  globalMaxPct?: number | null;
  onSaved?: (row: WithholdingAgreementRow) => void;
}

const CONCEPT_OPTIONS: Array<{ value: WithholdingConcept; label: string }> = [
  { value: 'loan', label: 'Préstamo personal (con saldo)' },
  { value: 'other', label: 'Otro concepto' },
];

function parseAmount(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function FieldError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

export function WithholdingFormSheet({
  open,
  onOpenChange,
  agreement,
  periods,
  globalMaxPct,
  onSaved,
}: WithholdingFormSheetProps) {
  const isEdit = !!agreement;
  const createMutation = useCreateWithholdingV2();
  const updateMutation = useUpdateWithholdingV2();
  const uploadMutation = useUploadWithholdingAttachment();
  const isPending = createMutation.isPending || updateMutation.isPending || uploadMutation.isPending;

  const [distributor, setDistributor] = useState<DistributorOption | null>(
    agreement
      ? {
          id: agreement.customerId,
          name: agreement.customerName ?? 'Distribuidor',
          number: agreement.customerNumber ?? null,
          countryCode: agreement.countryCode ?? null,
        }
      : null,
  );
  const [concept, setConcept] = useState<WithholdingConcept>(agreement?.concept ?? 'loan');
  const [description, setDescription] = useState(agreement?.description ?? '');
  const [totalAmount, setTotalAmount] = useState(
    agreement?.totalAmount !== null && agreement?.totalAmount !== undefined
      ? String(toNumber(agreement.totalAmount))
      : '',
  );
  const [installment, setInstallment] = useState(
    agreement ? String(toNumber(agreement.installmentAmount)) : '',
  );
  const [maxPct, setMaxPct] = useState(agreement ? String(toNumber(agreement.maxPctOfNet)) : '30');
  const [startsPeriodId, setStartsPeriodId] = useState(agreement?.startsPeriodId ?? '');
  const [folio, setFolio] = useState(agreement?.authorizationFolio ?? '');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [touched, setTouched] = useState(false);

  const ids = {
    distributor: useId(),
    concept: useId(),
    description: useId(),
    total: useId(),
    installment: useId(),
    pct: useId(),
    period: useId(),
    folio: useId(),
    notes: useId(),
    file: useId(),
  };

  // ── Validación en vivo ────────────────────────────────────────────────
  const total = parseAmount(totalAmount);
  const inst = parseAmount(installment);
  const pct = parseAmount(maxPct);
  const balance = agreement?.balanceRemaining !== null && agreement?.balanceRemaining !== undefined
    ? toNumber(agreement.balanceRemaining)
    : null;

  const errors = {
    distributor: !isEdit && !distributor ? 'Selecciona un distribuidor.' : null,
    description: description.trim().length === 0 ? 'Captura la descripción.' : null,
    total:
      concept === 'loan' && (total === null || total <= 0)
        ? 'Un préstamo requiere el total a recuperar.'
        : total !== null && inst !== null && total < inst
          ? 'El total no puede ser menor que el abono por periodo.'
          : null,
    installment:
      inst === null || inst <= 0
        ? 'El abono por periodo debe ser mayor a 0.'
        : isEdit && balance !== null && inst > balance
          ? `El abono no puede exceder el saldo (${formatMoney(balance, agreement?.currencyCode)}).`
          : null,
    pct: pct === null || pct < 1 || pct > 100 ? 'El tope debe estar entre 1 y 100 %.' : null,
    notes: !isEdit && notes.trim().length < 5 ? 'La nota de autorización es obligatoria (5+ caracteres).' : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const periodOptions = useMemo(
    () => periods.map((p) => ({ value: p.id, label: p.name, hint: p.isCurrent ? 'Periodo actual' : undefined })),
    [periods],
  );

  const globalNote =
    globalMaxPct !== null && globalMaxPct !== undefined && pct !== null && pct > globalMaxPct
      ? `Además aplica el tope global del periodo (${globalMaxPct} % del neto, sobre el remanente): la retención efectiva nunca lo supera.`
      : `Además aplica el tope global del periodo (${globalMaxPct ?? 30} % del neto) sobre el remanente de la fila.`;

  // ── Envío ─────────────────────────────────────────────────────────────
  const uploadIfAny = async (id: string) => {
    if (!file) return;
    try {
      await uploadMutation.mutateAsync({ id, file });
      toast.success('Pagaré adjuntado');
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'El convenio se guardó pero el pagaré no se pudo adjuntar'));
    }
  };

  const handleSubmit = async () => {
    setTouched(true);
    if (hasErrors || inst === null) return;
    try {
      if (!isEdit) {
        if (!distributor) return;
        const payload: CreateWithholdingPayload = {
          customerId: distributor.id,
          concept,
          description: description.trim(),
          installmentAmount: inst,
          maxPctOfNet: pct ?? 30,
          notes: notes.trim(),
        };
        if (total !== null && total > 0) payload.totalAmount = total;
        if (startsPeriodId) payload.startsPeriodId = startsPeriodId;
        if (folio.trim()) payload.authorizationFolio = folio.trim();
        const row = await createMutation.mutateAsync(payload);
        toast.success(`Convenio creado para ${distributor.name}: se aplica al pagar comisiones`);
        await uploadIfAny(row.id);
        onSaved?.(row);
        onOpenChange(false);
        return;
      }

      const current = agreement as WithholdingAgreementRow;
      const patch: UpdateWithholdingPayload = {};
      if (inst !== toNumber(current.installmentAmount)) patch.installmentAmount = inst;
      if (pct !== null && pct !== toNumber(current.maxPctOfNet)) patch.maxPctOfNet = pct;
      if (description.trim() !== current.description) patch.description = description.trim();
      if (folio.trim() !== (current.authorizationFolio ?? '')) patch.authorizationFolio = folio.trim();
      if (notes.trim()) patch.notes = notes.trim();
      let row = current;
      if (Object.keys(patch).length > 0) {
        row = await updateMutation.mutateAsync({ id: current.id, payload: patch });
        toast.success('Convenio actualizado');
      } else if (!file) {
        toast.info('Sin cambios que guardar');
        return;
      }
      await uploadIfAny(current.id);
      onSaved?.(row);
      onOpenChange(false);
    } catch (err) {
      toast.error(treasuryErrorMessage(err, isEdit ? 'No se pudo actualizar el convenio' : 'No se pudo crear el convenio'));
    }
  };

  const showErr = (key: keyof typeof errors) => (touched ? errors[key] : null);

  return (
    <Sheet open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pb-0">
          <SheetTitle>{isEdit ? 'Editar convenio' : 'Nuevo convenio de retención'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Ajusta abono, tope, descripción o folio; las notas se anexan con fecha y autor. El estado se cambia desde las acciones de la fila.'
              : 'Se descuenta de las comisiones de cada periodo (26→25) al pagarlas, respetando el tope del convenio y el tope global, hasta liquidar el saldo.'}
          </SheetDescription>
        </SheetHeader>

        <form
          className="space-y-4 px-4 pb-6"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          noValidate
        >
          {/* Distribuidor */}
          <div className="space-y-1.5">
            <Label htmlFor={ids.distributor}>Distribuidor {isEdit ? '' : '*'}</Label>
            {isEdit ? (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                <span className="font-medium text-foreground">{distributor?.name}</span>
                {distributor?.number && (
                  <span className="ml-2 font-mono text-xs text-muted-foreground">#{distributor.number}</span>
                )}
                <span className="ml-2 text-xs text-muted-foreground">· {agreement?.currencyCode}</span>
              </p>
            ) : (
              <DistributorSearchSelect
                id={ids.distributor}
                value={distributor}
                onChange={setDistributor}
                disabled={isPending}
                aria-describedby={`${ids.distributor}-help ${ids.distributor}-err`}
                aria-invalid={!!showErr('distributor')}
              />
            )}
            {!isEdit && (
              <p id={`${ids.distributor}-help`} className="text-xs text-muted-foreground">
                La moneda del convenio la fija el sistema (sucursal del distribuidor).
              </p>
            )}
            <FieldError id={`${ids.distributor}-err`} message={showErr('distributor')} />
          </div>

          {/* Concepto + tope */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={ids.concept}>Concepto *</Label>
              <SearchableSelect
                id={ids.concept}
                options={CONCEPT_OPTIONS}
                value={concept}
                onChange={(v) => setConcept(v === 'other' ? 'other' : 'loan')}
                showAllOption={false}
                disabled={isPending || isEdit}
              />
              {isEdit && (
                <p className="text-xs text-muted-foreground">
                  {withholdingConceptLabel(concept)}: el concepto no cambia tras el alta.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ids.pct}>Tope % del neto *</Label>
              <Input
                id={ids.pct}
                type="number"
                min={1}
                max={100}
                step="1"
                inputMode="numeric"
                value={maxPct}
                onChange={(e) => setMaxPct(e.target.value)}
                disabled={isPending}
                aria-describedby={`${ids.pct}-help ${ids.pct}-err`}
                aria-invalid={!!showErr('pct')}
              />
              <p id={`${ids.pct}-help`} className="text-xs text-muted-foreground">
                {globalNote}
              </p>
              <FieldError id={`${ids.pct}-err`} message={showErr('pct')} />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor={ids.description}>Descripción *</Label>
            <Input
              id={ids.description}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              placeholder="Ej. Préstamo personal — convenio 12-jul-2026"
              disabled={isPending}
              aria-describedby={`${ids.description}-err`}
              aria-invalid={!!showErr('description')}
            />
            <FieldError id={`${ids.description}-err`} message={showErr('description')} />
          </div>

          {/* Importes */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={ids.total}>{concept === 'loan' ? 'Total del préstamo *' : 'Total (opcional)'}</Label>
              <Input
                id={ids.total}
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder={concept === 'loan' ? '10000.00' : 'Sin tope'}
                disabled={isPending || isEdit}
                aria-describedby={`${ids.total}-err`}
                aria-invalid={!!showErr('total')}
              />
              {isEdit && (
                <p className="text-xs text-muted-foreground">
                  Saldo: {balance !== null ? formatMoney(balance, agreement?.currencyCode) : '—'}
                </p>
              )}
              <FieldError id={`${ids.total}-err`} message={showErr('total')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ids.installment}>Abono por periodo *</Label>
              <Input
                id={ids.installment}
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={installment}
                onChange={(e) => setInstallment(e.target.value)}
                placeholder="1000.00"
                disabled={isPending}
                aria-describedby={`${ids.installment}-err`}
                aria-invalid={!!showErr('installment')}
              />
              <FieldError id={`${ids.installment}-err`} message={showErr('installment')} />
            </div>
          </div>

          {/* Periodo de inicio + folio */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={ids.period}>Aplica desde</Label>
              <SearchableSelect
                id={ids.period}
                options={periodOptions}
                value={startsPeriodId}
                onChange={setStartsPeriodId}
                allLabel="Desde el siguiente pago"
                allValue=""
                placeholder="Periodo"
                disabled={isPending || isEdit}
              />
              <p className="text-xs text-muted-foreground">Periodo 26→25 a partir del cual se retiene.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ids.folio}>Folio de autorización</Label>
              <Input
                id={ids.folio}
                value={folio}
                onChange={(e) => setFolio(e.target.value)}
                maxLength={60}
                placeholder="Ej. T-0045"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Nota */}
          <div className="space-y-1.5">
            <Label htmlFor={ids.notes}>{isEdit ? 'Nota nueva (se anexa)' : 'Nota de autorización *'}</Label>
            <Textarea
              id={ids.notes}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={
                isEdit
                  ? 'Ej. Se ajusta el abono a petición del distribuidor (correo 18-sep-2026)'
                  : 'Ej. Autorizó Tesorería — convenio firmado 12-jul-2026, folio T-0045'
              }
              disabled={isPending}
              aria-describedby={`${ids.notes}-help ${ids.notes}-err`}
              aria-invalid={!!showErr('notes')}
            />
            <p id={`${ids.notes}-help`} className="text-xs text-muted-foreground">
              Las notas nunca se sobreescriben: el API las anexa con fecha y autor.
            </p>
            <FieldError id={`${ids.notes}-err`} message={showErr('notes')} />
          </div>

          {/* Pagaré */}
          <div className="space-y-1.5">
            <Label htmlFor={ids.file}>
              {isEdit && agreement?.hasAttachment ? 'Reemplazar pagaré / convenio firmado' : 'Pagaré / convenio firmado'}
            </Label>
            <FileUpload
              id={ids.file}
              label=""
              name="attachment"
              maxSizeMB={5}
              onChange={setFile}
              disabled={isPending}
              hideStatus
              aria-describedby={`${ids.file}-help`}
            />
            <p id={`${ids.file}-help`} className="text-xs text-muted-foreground">
              PDF, JPG o PNG (≤ 5 MB). Se guarda en ruta privada; solo se abre con enlace firmado de 15 min.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || (touched && hasErrors)} aria-busy={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {isEdit ? 'Guardar cambios' : 'Crear convenio'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
