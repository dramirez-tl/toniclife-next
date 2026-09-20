'use client';

// ApproveDialogs — confirmaciones con el ALCANCE REAL (contrato §1.10):
//  · ApprovePeriodDialog: aprueba TODO el periodo (solo filas listas) y envía
//    `expectedCount` = listas al momento de abrir (409 TRS_COUNT_MISMATCH si
//    el universo cambió). Muestra N listas · M bloqueadas y Σ bloqueado por moneda.
//  · ApproveSelectionDialog: aprueba las n filas seleccionadas (checkboxes o
//    "todo el filtro"), con Σ por moneda y las que el API omitirá.

import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { CommissionRow, CommissionSummary } from '@/types/treasury';
import { readinessBlockerLabel } from './treasury-error';
import {
  formatInt,
  formatMoney,
  sortByCurrency,
  sumRowsByCurrency,
} from './treasury-format';

interface ApprovePeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: CommissionSummary | undefined;
  onConfirm: (expectedCount: number) => void | Promise<void>;
  isPending: boolean;
}

export function ApprovePeriodDialog({
  open,
  onOpenChange,
  summary,
  onConfirm,
  isPending,
}: ApprovePeriodDialogProps) {
  const readiness = summary?.readiness;
  const readyCount = readiness?.readyCount ?? 0;
  const blockedCount = readiness?.blockedCount ?? 0;
  const blockedAmounts = sortByCurrency(readiness?.blockedAmountByCurrency ?? []);
  const blockers = (readiness?.blockers ?? []).filter((b) => b.count > 0);
  const byCurrency = sortByCurrency(summary?.byCurrency ?? []);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Aprobar el periodo ${summary?.period?.name ?? ''}`.trim()}
      description="Se aprueban SOLO las comisiones listas (datos de pago validados) del periodo completo, no las de la página. Las bloqueadas quedan pendientes hasta que Validación de datos las libere."
      confirmLabel={`Aprobar ${formatInt(readyCount)} comisiones`}
      isPending={isPending}
      disabled={!summary || readyCount === 0}
      onConfirm={() => onConfirm(readyCount)}
      contentClassName="sm:max-w-xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs text-emerald-800">Listas (se aprueban)</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-900">{formatInt(readyCount)}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800">Bloqueadas (se omiten)</p>
            <p className="text-2xl font-bold tabular-nums text-amber-900">{formatInt(blockedCount)}</p>
            {blockedAmounts.length > 0 && (
              <p className="mt-1 text-xs text-amber-800">
                {blockedAmounts.map((a) => formatMoney(a.amount, a.currency)).join(' + ')}
              </p>
            )}
          </div>
        </div>

        {byCurrency.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Totales del periodo por moneda
            </p>
            <ul className="space-y-1 text-sm">
              {byCurrency.map((c) => (
                <li key={c.currency} className="flex items-center justify-between gap-3">
                  <span>
                    <Badge variant="outline" className="mr-2 font-mono">
                      {c.currency}
                    </Badge>
                    {formatInt(c.rows)} filas
                  </span>
                  <span className="tabular-nums">
                    neto {formatMoney(c.net, c.currency)} · a dispersar {formatMoney(c.toDisperse, c.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {blockers.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Bloqueador</th>
                  <th className="px-3 py-2 text-right">Comisiones</th>
                </tr>
              </thead>
              <tbody>
                {blockers.map((b) => (
                  <tr key={b.code} className="border-t border-border">
                    <td className="px-3 py-1.5">{readinessBlockerLabel(b.code)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatInt(b.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Al aprobar se congela la evidencia de readiness por fila. Si el conjunto cambió desde que
          abriste esta ventana, el API responde TRS_COUNT_MISMATCH y no escribe nada.
        </p>
      </div>
    </ConfirmDialog>
  );
}

interface ApproveSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: CommissionRow[];
  /** true cuando la selección vino de "todo el filtro" y se truncó al tope. */
  truncated?: boolean;
  onConfirm: () => void | Promise<void>;
  isPending: boolean;
}

const APPROVABLE = new Set(['calculated', 'ready']);

export function ApproveSelectionDialog({
  open,
  onOpenChange,
  rows,
  truncated,
  onConfirm,
  isPending,
}: ApproveSelectionDialogProps) {
  const approvable = rows.filter((r) => APPROVABLE.has(r.stage));
  const notApprovable = rows.length - approvable.length;
  const blocked = approvable.filter((r) => r.readiness && !r.readiness.ready);
  const totals = sumRowsByCurrency(approvable);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Aprobar ${formatInt(approvable.length)} comisiones seleccionadas`}
      description="Se envían exactamente las filas marcadas. El API aplica los candados (periodo cerrado, corte v2, datos validados) y reporta las omitidas."
      confirmLabel={`Aprobar ${formatInt(approvable.length)}`}
      isPending={isPending}
      disabled={approvable.length === 0}
      onConfirm={onConfirm}
    >
      <div className="space-y-3">
        <ul className="space-y-1 text-sm">
          {totals.map((t) => (
            <li key={t.currency} className="flex items-center justify-between gap-3">
              <span>
                <Badge variant="outline" className="mr-2 font-mono">
                  {t.currency}
                </Badge>
                {formatInt(t.rows)} filas
              </span>
              <span className="tabular-nums">neto {formatMoney(t.net, t.currency)}</span>
            </li>
          ))}
          {totals.length === 0 && <li className="text-muted-foreground">Ninguna fila aprobable.</li>}
        </ul>
        {notApprovable > 0 && (
          <p className="text-xs text-muted-foreground">
            {formatInt(notApprovable)} fila(s) de la selección no están en etapa Calculada/Lista y se ignoran.
          </p>
        )}
        {blocked.length > 0 && (
          <p className="text-xs text-amber-800">
            {formatInt(blocked.length)} fila(s) tienen datos de pago bloqueados: con
            require_validated_data activo el API las omitirá.
          </p>
        )}
        {truncated && (
          <p className="text-xs text-amber-800">
            La selección se limitó al tope de 2,000 filas; repite la acción para el resto.
          </p>
        )}
      </div>
    </ConfirmDialog>
  );
}
