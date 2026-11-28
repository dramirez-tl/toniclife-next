'use client';

// SettlePaidDialog — "Pasar a «Pagada»" las comisiones ya depositadas fuera de
// los lotes de dispersión (Tesorería › Comisiones, Diego, 28-nov-2026): "que sí
// salga el pago hecho en su panel del distribuidor… pasar a etapa Pagada esos
// que pagamos".
//
// Octubre se depositó por fuera y el pago se registró aparte para timbrar el
// recibo; el embudo y el panel del distribuidor siguieron en "Calculada". Aquí
// se asientan: primero la vista previa (cuántas, cuánto, por día de depósito y
// cuáles NO pasan y por qué) y solo después de confirmar se aplica. El servidor
// exige el mismo número que enseñó la vista previa; si algo cambió, no escribe.
//
// No avisa al distribuidor, no aplica convenios y no toca importes ni recibos.

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { BanknotesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApplyExternalSettlement, usePreviewExternalSettlement } from '@/hooks/useExternalSettlement';
import { apiErrorStatus } from '@/lib/api-error';
import { settlementNotice, skippedGroups } from '@/lib/treasury/external-settlement';
import { treasuryErrorMessage } from './treasury-error';
import { formatDateOnly, formatInt, formatMoney } from './treasury-format';

const money = (n: number) => formatMoney(n, 'MXN');

/** Cuántos números de distribuidor se enseñan por motivo antes de resumir. */
const NUMBERS_SHOWN = 12;

function errorText(err: unknown, fallback: string): string {
  const status = apiErrorStatus(err);
  if (status === 404) return 'El servidor todavía no trae esta función. Avisa a Sistemas.';
  if (status === 403) return 'Tu cuenta no tiene permiso para registrar pagos de comisiones (mlm:pay).';
  return treasuryErrorMessage(err, fallback);
}

interface SettlePaidButtonProps {
  periodId: string;
  periodName: string;
  /** Con pago registrado y todavía sin pasar a «Pagada» (lo que se ve en la lista). */
  pending: number;
}

/** Botón + ventana de confirmación. Solo se monta para quien puede pagar (mlm:pay). */
export function SettlePaidButton({ periodId, periodName, pending }: SettlePaidButtonProps) {
  const preview = usePreviewExternalSettlement();
  const apply = useApplyExternalSettlement();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const loadPreview = () => {
    setConfirmed(false);
    preview.reset();
    preview.mutate(periodId);
  };

  const openDialog = () => {
    setOpen(true);
    loadPreview();
  };

  const data = preview.data;
  const groups = data ? skippedGroups(data) : [];
  const nothingToDo = !!data && data.eligible === 0;

  const submit = async () => {
    if (!data || data.eligible === 0) return;
    try {
      const result = await apply.mutateAsync({ periodId, expectedCount: data.eligible });
      const notice = settlementNotice(result, formatInt);
      if (notice.tone === 'success') toast.success(notice.text, { duration: 12000 });
      else if (notice.tone === 'warning') toast.warning(notice.text, { duration: 12000 });
      else toast.info(notice.text);
      setOpen(false);
    } catch (err) {
      toast.error(errorText(err, 'No se pudieron pasar a «Pagada». No se escribió nada.'), { duration: 12000 });
      // Lo más común es que el universo cambió: se vuelve a calcular la vista previa.
      loadPreview();
    }
  };

  return (
    <>
      <Button type="button" size="sm" onClick={openDialog} className="gap-1.5">
        <BanknotesIcon className="h-4 w-4" aria-hidden />
        Pasar a «Pagada» ({formatInt(pending)})
      </Button>

      <Dialog open={open} onOpenChange={(o) => !apply.isPending && setOpen(o)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Pasar a «Pagada» las comisiones ya depositadas</DialogTitle>
            <DialogDescription>
              {periodName}. Solo las que tienen su pago registrado; las demás se quedan como están.
            </DialogDescription>
          </DialogHeader>

          {preview.isPending && (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Revisando los pagos registrados…
            </p>
          )}

          {preview.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <p>{errorText(preview.error, 'No se pudo revisar qué comisiones se pueden pasar a «Pagada».')}</p>
              <button type="button" onClick={loadPreview} className="mt-2 text-xs font-medium underline">
                Volver a intentar
              </button>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <dl className="divide-y divide-border rounded-lg border border-border px-3 text-sm">
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Se pasan a «Pagada»</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatInt(data.eligible)} {data.eligible === 1 ? 'comisión' : 'comisiones'}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Neto depositado</dt>
                  <dd className="font-semibold tabular-nums">{money(data.amount)}</dd>
                </div>
                {data.alreadyPaid > 0 && (
                  <div className="flex justify-between py-2">
                    <dt className="text-muted-foreground">Ya estaban como «Pagada»</dt>
                    <dd className="tabular-nums">{formatInt(data.alreadyPaid)}</dd>
                  </div>
                )}
              </dl>

              {data.byPaymentDate.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Por día de depósito</p>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-border">
                      {data.byPaymentDate.map((d) => (
                        <tr key={d.date}>
                          <td className="py-1.5">{formatDateOnly(d.date)}</td>
                          <td className="py-1.5 text-right tabular-nums text-muted-foreground">{formatInt(d.count)}</td>
                          <td className="py-1.5 text-right tabular-nums">{money(d.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {groups.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                  <p className="mb-1 flex items-center gap-1.5 font-medium">
                    <ExclamationTriangleIcon className="h-4 w-4 shrink-0" aria-hidden />
                    No se pasan (se quedan como están)
                  </p>
                  <ul className="list-disc space-y-1 pl-5">
                    {groups.map((g) => (
                      <li key={g.code}>
                        <span className="font-medium tabular-nums">{formatInt(g.count)}</span>: {g.label}.
                        {g.customerNumbers.length > 0 && (
                          <span className="block text-xs text-amber-900/80">
                            {g.customerNumbers
                              .slice(0, NUMBERS_SHOWN)
                              .map((n) => `#${n}`)
                              .join(', ')}
                            {g.count > NUMBERS_SHOWN ? ` y ${formatInt(g.count - NUMBERS_SHOWN)} más` : ''}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {nothingToDo ? (
                <p className="text-sm text-muted-foreground">No hay comisiones por pasar a «Pagada» en este periodo.</p>
              ) : (
                <>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Quedan como «Pagada» con la fecha de su depósito, aquí y en el panel de cada distribuidor.</li>
                    <li>No se manda ningún aviso al distribuidor.</li>
                    <li>No cambian importes ni recibos: lo pendiente de timbrar sigue pendiente.</li>
                    <li>Si algo se pasó por error, Sistemas lo puede regresar a «Calculada» mientras no esté conciliado.</li>
                  </ul>
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={confirmed}
                      onCheckedChange={(v) => setConfirmed(v === true)}
                      className="mt-0.5"
                      aria-label="Confirmo que estos depósitos ya se hicieron"
                    />
                    <span>Confirmo que estos depósitos ya se hicieron en el banco.</span>
                  </label>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={apply.isPending}>
              {nothingToDo ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!nothingToDo && (
              <Button onClick={() => void submit()} disabled={!data || !confirmed || apply.isPending || preview.isPending}>
                {apply.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />}
                {data ? `Pasar ${formatInt(data.eligible)} a «Pagada»` : 'Pasar a «Pagada»'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
