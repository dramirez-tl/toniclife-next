'use client';

// KpiTiles - Mosaicos de cifras clave (mismos textos y estilo que el
// artefacto). Recibe los mosaicos ya armados (`kpisTablero(data)` para una
// campaña, `kpisImpacto()` / `kpisDinero()` para el impacto del periodo).

import type { KpiTile } from '@/lib/whatsapp-campaign/format';
import { cn } from '@/lib/utils';

const COLS: Record<number, string> = {
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
  5: 'xl:grid-cols-5',
  6: 'xl:grid-cols-6',
};

export function KpiTiles({
  tiles,
  label = 'Cifras clave',
  className,
}: {
  tiles: KpiTile[];
  /** aria-label de la sección. */
  label?: string;
  className?: string;
}) {
  const cols = COLS[tiles.length] ?? 'xl:grid-cols-5';
  return (
    <section aria-label={label} className={cn('grid gap-3 sm:grid-cols-3', cols, className)}>
      {tiles.map((k) => (
        <div key={k.id} className="grid gap-0.5 rounded-lg border bg-card px-4 py-3.5 shadow-xs">
          <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">
            {k.etiqueta}
          </span>
          <span className="text-2xl font-semibold tracking-tight tabular-nums sm:text-[1.7rem]">
            {k.valor}
          </span>
          <span className="text-xs text-muted-foreground">{k.detalle}</span>
        </div>
      ))}
    </section>
  );
}
