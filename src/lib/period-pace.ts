// Panel Principal › "Ritmo del periodo" (Diego, 14-nov-2026): la misma gráfica del Inicio de
// la app, con la venta consolidada del periodo que se esté viendo contra el periodo anterior
// y contra el mismo periodo del año pasado. Aquí vive lo que no depende de React: los textos
// (titular, cifras), los renglones de la gráfica y de la tabla, y los formatos. Puro y con
// pruebas. Los datos llegan de GET /reports/dashboard/pace.

import type { PanelPaceComparison, PanelPacePeriod, PacePhase } from '@/types/reports';

/** "NOVIEMBRE 2026" → "Noviembre 2026". */
export function periodLabel(name: string | null | undefined): string {
  const text = (name ?? '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/** $16,371,044 (pesos enteros). */
export function money(amount: number): string {
  return `$${Math.round(amount).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
}

/** +$1,208,330 / −$20,000 / $0. */
export function signedMoney(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return '$0';
  return `${rounded > 0 ? '+' : '−'}${money(Math.abs(rounded))}`;
}

/** Importe corto para la gráfica: $16.4 M · $850 mil · $1,234. */
export function moneyCompact(amount: number): string {
  const value = Math.abs(amount);
  const sign = amount < 0 ? '−' : '';
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    // Un decimal hasta 100 M; arriba, sin decimales. "16.0" se queda en "16".
    const text = millions >= 100 ? Math.round(millions).toString() : (Math.round(millions * 10) / 10).toString();
    return `${sign}$${text} M`;
  }
  if (value >= 1_000) return `${sign}$${Math.round(value / 1_000)} mil`;
  return `${sign}$${Math.round(value)}`;
}

/** YYYY-MM-DD + n días (sin zonas horarias). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "13 nov" (o "13 nov 2025" con año) a partir de YYYY-MM-DD. */
export function shortDate(date: string | null | undefined, withYear = false): string {
  const [y, m, d] = (date ?? '').split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ''}`;
}

// ---------------------------------------------------------------- titular

/** Cómo va: arriba, cerca, abajo; o sin veredicto (arrancando / sin base). */
export type PaceTone = 'ahead' | 'close' | 'behind' | 'neutral';

export interface PaceHeadline {
  tone: PaceTone;
  title: string;
  subtitle: string | null;
}

function toneOf(pct: number): PaceTone {
  if (pct >= 100) return 'ahead';
  if (pct >= 90) return 'close';
  return 'behind';
}

/**
 * El titular de la tarjeta. Periodo en curso: el ritmo a los mismos días transcurridos (al
 * cierre de ayer), con las mismas palabras de la app. Periodo terminado: con cuánto cerró
 * contra el total de la referencia.
 */
export function paceHeadline(input: {
  phase: PacePhase;
  period: Pick<PanelPacePeriod, 'name' | 'totalDays'>;
  comparison: Pick<PanelPaceComparison, 'name' | 'totalDays' | 'pacePct' | 'progressPct' | 'signal'>;
  minSignalDay: number;
}): PaceHeadline {
  const { phase, comparison, minSignalDay } = input;
  const ref = periodLabel(comparison.name);
  const own = periodLabel(input.period.name);

  if (phase === 'closed') {
    const pct = Math.round(comparison.progressPct);
    const sameLength = input.period.totalDays === comparison.totalDays;
    return {
      tone: toneOf(comparison.progressPct),
      title: `${own} cerró al ${pct} % de ${ref}.`,
      subtitle: sameLength
        ? 'Periodo completo contra periodo completo.'
        : `${own} duró ${input.period.totalDays} días; ${ref}, ${comparison.totalDays}.`,
    };
  }

  if (comparison.signal === 'starting' || comparison.pacePct == null) {
    return {
      tone: 'neutral',
      title: `El periodo va arrancando. El ritmo se compara a partir del día ${minSignalDay}.`,
      subtitle: null,
    };
  }
  const pct = Math.round(comparison.pacePct);
  const closing =
    comparison.signal === 'ahead' ? '¡Arriba!' : comparison.signal === 'close' ? 'Muy cerca.' : 'A cerrar la brecha.';
  return {
    tone: comparison.signal === 'ahead' ? 'ahead' : comparison.signal === 'close' ? 'close' : 'behind',
    title: `Vamos al ${pct} % del ritmo de ${ref}. ${closing}`,
    subtitle: 'Mismos días transcurridos, al cierre de ayer.',
  };
}

/** "Hoy llevamos el 34 % de todo lo que se logró en Noviembre 2025." (solo con el periodo en curso). */
export function paceProgressText(
  phase: PacePhase,
  comparison: Pick<PanelPaceComparison, 'name' | 'progressPct'>,
): string | null {
  if (phase !== 'current') return null;
  return `Hoy llevamos el ${Math.round(comparison.progressPct)} % de todo lo que se logró en ${periodLabel(comparison.name)}.`;
}

// ---------------------------------------------------------------- cifras

export interface PaceFigure {
  label: string;
  value: string;
  /** La cifra principal (lo vendido). */
  strong?: boolean;
  /** Diferencia a favor o en contra. */
  tone?: 'positive' | 'negative';
}

/**
 * Las cifras al lado de la gráfica. `currentToDate` deja usar el consolidado que ya muestra la
 * tarjeta de ingresos del panel, para que en pantalla sea literalmente el mismo número (los dos
 * se piden por separado y entre uno y otro se sigue vendiendo).
 */
export function paceFigures(input: {
  phase: PacePhase;
  period: Pick<PanelPacePeriod, 'name' | 'totalDays' | 'closedDay'>;
  comparison: Pick<PanelPaceComparison, 'name' | 'totalDays' | 'amounts'>;
  currentToDate?: number | null;
}): PaceFigure[] {
  const { phase, period, comparison } = input;
  const amounts = comparison.amounts;
  if (!amounts) return [];
  const own = periodLabel(period.name);
  const ref = periodLabel(comparison.name);
  const toDate = input.currentToDate ?? amounts.currentToDate;
  const diffFigure = (diff: number): PaceFigure => ({
    label: 'Diferencia',
    value: signedMoney(diff),
    tone: Math.round(diff) >= 0 ? 'positive' : 'negative',
  });

  if (phase === 'closed') {
    const figures: PaceFigure[] = [
      { label: `${own} cerró en`, value: money(amounts.currentToDate), strong: true },
      { label: `${ref} cerró en`, value: money(amounts.referenceTotal) },
      diffFigure(amounts.currentToDate - amounts.referenceTotal),
    ];
    // Referencia más larga: lo que llevaba a los mismos días da contexto al cierre.
    if (comparison.totalDays > period.totalDays) {
      figures.push({
        label: `${ref} al cierre de su día ${period.totalDays}`,
        value: money(amounts.referenceAtClosedDay),
      });
    }
    return figures;
  }

  const figures: PaceFigure[] = [{ label: `${own}, hasta hoy`, value: money(toDate), strong: true }];
  if (period.closedDay >= 1) {
    figures.push(
      { label: `Al cierre de ayer (día ${period.closedDay})`, value: money(amounts.currentClosed) },
      { label: `${ref} al cierre de su día ${period.closedDay}`, value: money(amounts.referenceAtClosedDay) },
      diffFigure(amounts.currentClosed - amounts.referenceAtClosedDay),
    );
  }
  figures.push({ label: `${ref} cerró en`, value: money(amounts.referenceTotal) });
  return figures;
}

// ---------------------------------------------------------------- gráfica y tabla

/** Un día del eje: lo acumulado por el periodo que se ve y por la referencia. */
export interface PaceChartRow {
  day: number;
  /** Acumulado al cierre de ese día (días completos). */
  closed: number | null;
  /** Tramo del día en curso: del cierre de ayer a este momento (línea punteada). */
  today: number | null;
  /** Acumulado de la referencia al cierre de su mismo día. */
  reference: number | null;
  /** Fecha de ese día en el periodo que se ve y en la referencia (YYYY-MM-DD). */
  date: string | null;
  referenceDate: string | null;
}

/** Días del eje: el periodo, la referencia o lo ya recorrido, lo que sea más largo. */
export function paceAxisDays(period: Pick<PanelPacePeriod, 'totalDays'>, comparison: PanelPaceComparison): number {
  return Math.max(period.totalDays, comparison.totalDays, comparison.series.current.length, 1);
}

/**
 * `currentToDate` (opcional): lo vendido hasta este momento según la tarjeta de ingresos del
 * panel; si viene, es el valor del día de hoy (así la gráfica, la tabla y las cifras dicen lo
 * mismo que esa tarjeta).
 */
export function paceChartRows(
  period: Pick<PanelPacePeriod, 'startDate' | 'totalDays' | 'dayNumber' | 'closedDay'>,
  phase: PacePhase,
  comparison: PanelPaceComparison,
  currentToDate?: number | null,
): PaceChartRow[] {
  const { current, reference } = comparison.series;
  const days = paceAxisDays(period, comparison);
  const inProgress = phase === 'current';
  const rows: PaceChartRow[] = [];
  for (let day = 1; day <= days; day += 1) {
    const value = day <= current.length ? current[day - 1] : null;
    const closed = value !== null && day <= period.closedDay ? value : null;
    // El tramo punteado va del último día completo al día de hoy.
    const today =
      inProgress && value !== null && (day === period.dayNumber || (day === period.closedDay && day >= 1))
        ? day === period.dayNumber && currentToDate != null
          ? currentToDate
          : value
        : null;
    rows.push({
      day,
      closed,
      today,
      reference: day <= reference.length ? reference[day - 1] : null,
      date: day <= period.totalDays ? addDays(period.startDate, day - 1) : null,
      referenceDate: day <= comparison.totalDays ? addDays(comparison.startDate, day - 1) : null,
    });
  }
  return rows;
}

/** Marcas del eje de días: 1, cada 5 y el último (sin encimar el último con su vecino). */
export function paceDayTicks(days: number): number[] {
  const ticks = [1];
  for (let d = 5; d < days; d += 5) ticks.push(d);
  if (days > 1) {
    if (days - ticks[ticks.length - 1] < 2 && ticks.length > 1) ticks.pop();
    ticks.push(days);
  }
  return ticks;
}

/**
 * Tope y marcas del eje de pesos: pasos redondos (1, 2, 2.5 o 5 × 10ⁿ) y unas cinco marcas,
 * con el tope en la primera marca que cubre el valor más alto (48.5 M → 0, 10, … 50 M).
 */
export function paceYAxis(maxValue: number): { max: number; ticks: number[] } {
  if (!(maxValue > 0)) return { max: 1, ticks: [0, 1] };
  const rough = maxValue / 5;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? 10 * power;
  const count = Math.ceil(maxValue / step - 1e-9);
  const ticks = Array.from({ length: count + 1 }, (_, i) => Math.round(i * step));
  return { max: ticks[ticks.length - 1], ticks };
}

/** Punto final de la curva propia (hoy, o el último día si ya terminó), para rotularlo. */
export function paceEndPoint(
  period: Pick<PanelPacePeriod, 'dayNumber'>,
  comparison: PanelPaceComparison,
  currentToDate?: number | null,
): { day: number; value: number } | null {
  const { current } = comparison.series;
  if (current.length === 0 || period.dayNumber < 1) return null;
  const day = Math.min(period.dayNumber, current.length);
  return { day, value: currentToDate ?? current[day - 1] };
}
