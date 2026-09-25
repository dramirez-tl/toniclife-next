'use client';

// CompareBar - Barra horizontal de una fracción 0..1 (con campaña o control),
// con marca opcional de la base histórica (cierres anteriores sin campaña).
// Réplica de `.bar` del tablero del artefacto, con los tokens del admin.

import { cn } from '@/lib/utils';
import { clamp01, pct } from '@/lib/whatsapp-campaign/format';

export type CompareTone = 'trat' | 'ctrl';

/** Relleno por grupo: campaña = --chart-1; control = ámbar (#C0862C). */
export const TONE_FILL: Record<CompareTone, string> = {
  trat: 'bg-chart-1',
  ctrl: 'bg-[#C0862C] dark:bg-[#E2AA55]',
};

export function CompareBar({
  value,
  base,
  tone = 'trat',
  size = 'md',
  label,
  className,
}: {
  value: number | null | undefined;
  /** Marca vertical (base histórica), fracción 0..1. */
  base?: number | null;
  tone?: CompareTone;
  size?: 'sm' | 'md';
  /** Texto para lectores de pantalla (se le agrega el porcentaje). */
  label?: string;
  className?: string;
}) {
  const w = clamp01(value) * 100;
  const hasBase = typeof base === 'number' && Number.isFinite(base);
  return (
    <div
      role="img"
      aria-label={`${label ? `${label}: ` : ''}${pct(value, 1)}${hasBase ? ` (sin campaña: ${pct(base)})` : ''}`}
      className={cn(
        'relative w-full rounded bg-muted',
        size === 'sm' ? 'h-2' : 'h-3.5',
        className,
      )}
    >
      <span
        className={cn('absolute inset-y-0 left-0 rounded', TONE_FILL[tone])}
        style={{ width: `${w.toFixed(1)}%` }}
      />
      {hasBase && (
        <span
          aria-hidden
          className="absolute -top-[3px] -bottom-[3px] w-0.5 bg-foreground/55"
          style={{ left: `calc(${(clamp01(base) * 100).toFixed(1)}% - 1px)` }}
        />
      )}
    </div>
  );
}

/** Fila "etiqueta · barra · %" del bloque de comparación. */
export function CompareRow({
  label,
  value,
  base,
  tone,
  dec = 1,
}: {
  label: string;
  value: number | null | undefined;
  base?: number | null;
  tone: CompareTone;
  dec?: number;
}) {
  return (
    <div className="grid grid-cols-[5.6rem_minmax(0,1fr)_3.4rem] items-center gap-2.5 text-sm sm:grid-cols-[8rem_minmax(0,1fr)_3.6rem]">
      <span className="text-muted-foreground">{label}</span>
      <CompareBar value={value} base={base} tone={tone} label={label} />
      <span className="text-right font-semibold tabular-nums">{pct(value, dec)}</span>
    </div>
  );
}

/** Leyenda: con campaña · control · (opcional) base histórica. */
export function CompareLegend({
  pctControl,
  withBase = false,
}: {
  pctControl?: number | null;
  withBase?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <i className={cn('inline-block h-2.5 w-2.5 rounded-sm', TONE_FILL.trat)} />
        Con campaña
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className={cn('inline-block h-2.5 w-2.5 rounded-sm', TONE_FILL.ctrl)} />
        Control ({pct(pctControl ?? null)}, sin mensajes)
      </span>
      {withBase && (
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-0.5 bg-foreground/55" />
          Sin campaña, cierres anteriores
        </span>
      )}
    </div>
  );
}
