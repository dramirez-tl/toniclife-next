'use client';

// EffectInterval - Punto (efecto estimado) con su intervalo de confianza 95%
// sobre un eje centrado en 0. Verde si todo el intervalo queda arriba de 0,
// rojo si queda abajo, color de marca si cruza el 0 (no se decide nada).

import { signed, toneEfecto } from '@/lib/whatsapp-campaign/format';
import { cn } from '@/lib/utils';

const W = 420;
const H = 64;
const PAD = 18;

const TONE_CLASS = {
  bien: 'fill-emerald-700 stroke-emerald-700 dark:fill-emerald-400 dark:stroke-emerald-400',
  mal: 'fill-[#B0432D] stroke-[#B0432D] dark:fill-[#EE8B74] dark:stroke-[#EE8B74]',
  neutro: 'fill-chart-1 stroke-chart-1',
} as const;

export function EffectInterval({
  est,
  lo,
  hi,
  unidad,
}: {
  est: number | null | undefined;
  lo: number | null | undefined;
  hi: number | null | undefined;
  unidad: string;
}) {
  if (est == null || lo == null || hi == null) return null;
  const m = Math.max(Math.abs(lo), Math.abs(hi), Math.abs(est), 1) * 1.25;
  const x = (v: number) => PAD + ((v + m) / (2 * m)) * (W - 2 * PAD);
  const tone = TONE_CLASS[toneEfecto(lo, hi)];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block h-auto w-full"
      role="img"
      aria-label={`Efecto estimado ${signed(est, 1)} ${unidad}, intervalo de ${signed(lo, 1)} a ${signed(hi, 1)}`}
    >
      <line x1={PAD} x2={W - PAD} y1={26} y2={26} className="stroke-border" strokeWidth={1} />
      <line
        x1={x(0)}
        x2={x(0)}
        y1={8}
        y2={44}
        className="stroke-muted-foreground"
        strokeDasharray="3 3"
      />
      <line
        x1={x(lo)}
        x2={x(hi)}
        y1={26}
        y2={26}
        className={cn(tone)}
        strokeWidth={6}
        strokeLinecap="round"
        opacity={0.45}
      />
      <circle cx={x(est)} cy={26} r={7} className={cn(tone)} strokeWidth={0} />
      {[
        { v: 0, t: '0' },
        { v: lo, t: signed(lo, 0) },
        { v: hi, t: signed(hi, 0) },
      ].map((l) => (
        <text
          key={l.t + l.v}
          x={x(l.v)}
          y={58}
          textAnchor="middle"
          className="fill-muted-foreground text-[11px]"
        >
          {l.t}
        </text>
      ))}
    </svg>
  );
}
