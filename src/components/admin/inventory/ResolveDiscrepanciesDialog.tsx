'use client';

// ResolveDiscrepanciesDialog - "Aclarar diferencias" de un traspaso ya recibido
// (13-nov-2026, Almacén). Las piezas que faltaron al recibir salieron del origen
// y no entraron al destino; aquí se dice qué pasó con cada producto:
//   Sí llegó     -> entra al inventario del destino
//   Se devolvió  -> regresa al inventario del origen
//   Se extravió  -> se da de baja (exige nota)
// Se puede aclarar por partes: lo que queda en "Sigue pendiente" no cambia.
// Se monta solo mientras está abierto: cada apertura arranca limpia.

import { useId, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useResolveTransferDiscrepancies } from '@/hooks/useInventory';
import { apiErrorMessage } from '@/lib/api-error';
import {
  CHOICE_OPTIONS,
  NOTHING_CHOSEN_MESSAGE,
  RESOLUTION_KINDS,
  buildResolvePayload,
  discrepancyMissing,
  discrepancyPending,
  effectLines,
  formatPieces,
  initialDrafts,
  successMessage,
  type DiscrepancyChoice,
  type DiscrepancyDrafts,
} from '@/lib/inventory/transfer-discrepancies';
import { cn } from '@/lib/utils';
import type { TransferDto } from '@/types/inventory';

const isChoice = (value: string): value is DiscrepancyChoice =>
  CHOICE_OPTIONS.some((o) => o.value === value);

export function ResolveDiscrepanciesDialog({
  transfer,
  onClose,
}: {
  transfer: TransferDto;
  onClose: () => void;
}) {
  const id = useId();
  const resolve = useResolveTransferDiscrepancies();
  const rows = useMemo(
    () => (transfer.discrepancies ?? []).filter((d) => discrepancyPending(d) > 0),
    [transfer.discrepancies],
  );
  const [drafts, setDrafts] = useState<DiscrepancyDrafts>(() => initialDrafts(rows));
  const [notes, setNotes] = useState('');

  const branches = useMemo(
    () => ({
      origin: transfer.branch.name,
      destination: transfer.destinationBranch.name,
    }),
    [transfer.branch.name, transfer.destinationBranch.name],
  );
  const result = useMemo(
    () => buildResolvePayload(rows, drafts, notes),
    [rows, drafts, notes],
  );
  const effects = effectLines(result, branches);
  const problems = result.errors.filter((e) => e !== NOTHING_CHOSEN_MESSAGE);
  const busy = resolve.isPending;

  const setDraft = (
    discrepancyId: string,
    patch: Partial<DiscrepancyDrafts[string]>,
  ) =>
    setDrafts((prev) => ({
      ...prev,
      [discrepancyId]: {
        ...(prev[discrepancyId] ?? { choice: 'pending', quantity: '' }),
        ...patch,
      },
    }));

  const submit = async () => {
    if (result.errors.length > 0 || busy) return;
    try {
      await resolve.mutateAsync({ id: transfer.id, payload: result.payload });
      toast.success(successMessage(result.totals, branches));
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudieron aclarar las diferencias.'));
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
    >
      {/* Encabezado y pie fijos; solo la lista de productos se desplaza, para
          que "Confirmar" quede siempre a la vista aunque haya muchas líneas.
          El foco inicial va al cuadro (no al primer botón, que parecería ya
          elegido). */}
      <DialogContent
        className="flex max-h-[92vh] flex-col sm:max-w-3xl"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Aclarar diferencias · {transfer.movementNumber}</DialogTitle>
          <DialogDescription>
            Estas piezas salieron de {branches.origin} y no entraron a{' '}
            {branches.destination}. Di qué pasó con cada producto; lo que dejes en
            «Sigue pendiente» no cambia y lo puedes aclarar después.
          </DialogDescription>
        </DialogHeader>

        {rows.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Marcar todo como:</span>
            {RESOLUTION_KINDS.map((kind) => (
              <Button
                key={kind}
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setDrafts(initialDrafts(rows, kind))}
              >
                {CHOICE_OPTIONS.find((o) => o.value === kind)?.label}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setDrafts(initialDrafts(rows))}
            >
              Limpiar
            </Button>
          </div>
        )}

        <div className="-mr-2 min-h-32 flex-1 space-y-3 overflow-y-auto pr-2">
          {rows.map((d) => {
            const draft = drafts[d.id] ?? { choice: 'pending', quantity: '' };
            const pending = discrepancyPending(d);
            const missing = discrepancyMissing(d);
            const option = CHOICE_OPTIONS.find((o) => o.value === draft.choice);
            const typed = Number(draft.quantity);
            const left =
              Number.isFinite(typed) && typed > 0 && typed < pending
                ? Math.round((pending - typed) * 100) / 100
                : 0;
            const quantityId = `${id}-${d.id}-quantity`;
            return (
              <div
                key={d.id}
                role="group"
                aria-labelledby={`${id}-${d.id}-name`}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <p id={`${id}-${d.id}-name`} className="font-medium text-foreground">
                      {d.productName}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">{d.productCode}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Por aclarar:{' '}
                    <span className="font-semibold text-amber-700 tabular-nums">
                      {formatPieces(pending)}
                    </span>
                    {pending < missing && <> de {formatPieces(missing)} que faltaron</>}
                  </p>
                </div>

                <RadioGroup
                  value={draft.choice}
                  onValueChange={(value) => {
                    if (isChoice(value)) setDraft(d.id, { choice: value });
                  }}
                  disabled={busy}
                  aria-label={`Qué pasó con ${d.productName}`}
                  className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
                >
                  {CHOICE_OPTIONS.map((opt) => {
                    const optionId = `${id}-${d.id}-${opt.value}`;
                    return (
                      <Label
                        key={opt.value}
                        htmlFor={optionId}
                        className={cn(
                          'cursor-pointer rounded-md border border-border px-3 py-2 text-sm font-normal',
                          draft.choice === opt.value &&
                            'border-primary bg-primary/5 font-medium text-foreground',
                        )}
                      >
                        <RadioGroupItem id={optionId} value={opt.value} />
                        {opt.label}
                      </Label>
                    );
                  })}
                </RadioGroup>

                {draft.choice !== 'pending' && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Label htmlFor={quantityId}>Cantidad</Label>
                    <Input
                      id={quantityId}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={pending}
                      step={Number.isInteger(pending) ? 1 : 0.01}
                      value={draft.quantity}
                      disabled={busy}
                      onChange={(e) => setDraft(d.id, { quantity: e.target.value })}
                      className="h-9 w-24 text-right tabular-nums"
                    />
                    <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                      {option?.effect(branches)}
                      {left > 0 && <> Quedarán {formatPieces(left)} por aclarar.</>}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${id}-notes`}>
            Nota{' '}
            <span className="font-normal text-muted-foreground">
              {result.totals.lost > 0
                ? '(obligatoria: qué pasó con lo extraviado)'
                : '(opcional)'}
            </span>
          </Label>
          <Textarea
            id={`${id}-notes`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={1}
            disabled={busy}
            placeholder="Paquetería, número de guía, quién avisó…"
            className="min-h-9"
          />
        </div>

        {/* Pie fijo: a la izquierda qué va a pasar (o qué falta para poder
            confirmar); a la derecha los botones. */}
        <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1 text-sm" aria-live="polite">
            {problems.length > 0 ? (
              <ul role="alert" className="space-y-0.5 text-destructive">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            ) : effects.length > 0 ? (
              <>
                <ul className="space-y-0.5 text-foreground">
                  {effects.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-muted-foreground">
                  No se deshace desde aquí: una captura equivocada se corrige con un
                  ajuste de inventario.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">{NOTHING_CHOSEN_MESSAGE}</p>
            )}
          </div>
          <div className="flex flex-shrink-0 justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Volver
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={busy || result.errors.length > 0}
            >
              {busy ? 'Guardando…' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
