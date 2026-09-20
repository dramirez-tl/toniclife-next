'use client';

// WithholdingKpis — 4 tarjetas: convenios (activos/pausados/liquidados),
// saldo por recuperar POR MONEDA, retenido en el periodo y proyectado (preview).
// Cuando el API aún no manda `kpis`, se calculan los conteos y el saldo con
// las filas cargadas y se avisa que es parcial (nunca se inventan importes).

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { AmountByCurrency, WithholdingAgreementRow, WithholdingKpis as Kpis } from '@/types/treasury';
import { formatInt, formatMoney, sortByCurrency, toNumber } from '../treasury-format';

interface WithholdingKpisProps {
  kpis: Kpis | null | undefined;
  /** Filas de la página actual (fallback de conteo/saldo sin `kpis`). */
  rows: WithholdingAgreementRow[];
  isLoading: boolean;
  periodName?: string | null;
  onStatusClick?: (status: 'active' | 'paused' | 'settled') => void;
}

function sumBalanceByCurrency(rows: WithholdingAgreementRow[]): AmountByCurrency[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.status !== 'active' && r.status !== 'paused') continue;
    const cur = (r.currencyCode || 'MXN').toUpperCase();
    map.set(cur, (map.get(cur) ?? 0) + toNumber(r.balanceRemaining));
  }
  return sortByCurrency(Array.from(map, ([currency, amount]) => ({ currency, amount })));
}

function AmountList({ items, empty }: { items: AmountByCurrency[]; empty: string }) {
  if (items.length === 0) return <p className="text-lg font-bold text-foreground">{empty}</p>;
  return (
    <ul className="space-y-0.5">
      {sortByCurrency(items).map((a) => (
        <li key={a.currency} className="text-lg font-bold tabular-nums text-foreground">
          {formatMoney(a.amount, a.currency)}
        </li>
      ))}
    </ul>
  );
}

export function WithholdingKpis({ kpis, rows, isLoading, periodName, onStatusClick }: WithholdingKpisProps) {
  if (isLoading && rows.length === 0 && !kpis) {
    return (
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  const partial = !kpis;
  const active = kpis?.active ?? rows.filter((r) => r.status === 'active').length;
  const paused = kpis?.paused ?? rows.filter((r) => r.status === 'paused').length;
  const settled = kpis?.settled ?? rows.filter((r) => r.status === 'settled').length;
  const balance = kpis?.balanceByCurrency ?? sumBalanceByCurrency(rows);
  const withheld = kpis?.withheldThisPeriodByCurrency ?? [];
  const projected = kpis?.projectedThisPeriodByCurrency ?? [];
  const periodLabel = periodName ? ` · ${periodName}` : '';

  const statusButton = (label: string, count: number, status: 'active' | 'paused' | 'settled') => (
    <button
      type="button"
      className="rounded-md px-1.5 py-0.5 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onStatusClick?.(status)}
      aria-label={`Filtrar ${label.toLowerCase()}`}
    >
      <span className="text-lg font-bold tabular-nums text-foreground">{formatInt(count)}</span>
      <span className="ml-1 text-xs text-muted-foreground">{label}</span>
    </button>
  );

  return (
    <div className="mb-6 space-y-2">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Convenios</p>
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1">
              {statusButton('activos', active, 'active')}
              {statusButton('pausados', paused, 'paused')}
              {statusButton('liquidados', settled, 'settled')}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Saldo por recuperar
            </p>
            <div className="mt-1">
              <AmountList items={balance} empty="—" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Activos y pausados, por moneda del convenio</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Retenido en el periodo{periodLabel}
            </p>
            <div className="mt-1">
              <AmountList items={withheld} empty={partial ? 'Sin dato' : '—'} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Abonos ya aplicados al pagar</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Proyectado{periodLabel}
            </p>
            <div className="mt-1">
              <AmountList items={projected} empty={partial ? 'Sin dato' : '—'} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Por aplicar al pagar (preview, tope global)</p>
          </CardContent>
        </Card>
      </div>
      {partial && (
        <p className="text-xs text-muted-foreground">
          KPIs parciales: el API aún no expone <code className="font-mono">kpis</code>; conteos y saldo se
          calculan con las filas cargadas.
        </p>
      )}
    </div>
  );
}
