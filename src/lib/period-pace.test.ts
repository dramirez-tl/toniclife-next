import { describe, expect, it } from 'vitest';
import type { PanelPaceComparison, PanelPacePeriod } from '@/types/reports';
import {
  addDays,
  money,
  moneyCompact,
  paceAxisDays,
  paceChartRows,
  paceDayTicks,
  paceEndPoint,
  paceFigures,
  paceHeadline,
  paceProgressText,
  paceYAxis,
  periodLabel,
  shortDate,
  signedMoney,
} from './period-pace';

// NOVIEMBRE 2026 al 14-nov (día 14, 13 completos), con las cifras reales de ese día.
const NOV: PanelPacePeriod = {
  id: 'p-75',
  number: 75,
  name: 'NOVIEMBRE 2026',
  startDate: '2026-11-01',
  endDate: '2026-11-30',
  totalDays: 30,
  dayNumber: 14,
  closedDay: 13,
};

/** El mismo periodo en su primer día y ya terminado. */
const NOV_DAY_1: PanelPacePeriod = { ...NOV, dayNumber: 1, closedDay: 0 };
const NOV_CLOSED: PanelPacePeriod = { ...NOV, dayNumber: 30, closedDay: 30 };

/** Curva de prueba: `perDay` pesos por día. */
const line = (days: number, perDay: number) => Array.from({ length: days }, (_, i) => (i + 1) * perDay);

function comparison(over: Partial<PanelPaceComparison> = {}): PanelPaceComparison {
  return {
    name: 'NOVIEMBRE 2025',
    startDate: '2025-11-01',
    endDate: '2025-11-30',
    totalDays: 30,
    progressPct: 35.5,
    referenceAtSameDayPct: 30.1,
    pacePct: 108.6,
    signal: 'ahead',
    current: [],
    reference: [],
    amounts: {
      currency: 'MXN',
      currentToDate: 17_195_299,
      currentClosed: 15_019_954,
      referenceAtClosedDay: 13_834_126,
      referenceTotal: 48_484_866,
    },
    series: { current: line(14, 1_000_000), reference: line(30, 1_500_000) },
    ...over,
  };
}

describe('formatos', () => {
  it('nombre del periodo como se lee: "NOVIEMBRE 2026" → "Noviembre 2026"', () => {
    expect(periodLabel('NOVIEMBRE 2026')).toBe('Noviembre 2026');
    expect(periodLabel('  octubre 2026 ')).toBe('Octubre 2026');
    expect(periodLabel(null)).toBe('');
  });

  it('pesos enteros, con signo y cortos para la gráfica', () => {
    expect(money(16_371_044.4)).toBe('$16,371,044');
    expect(signedMoney(1_185_828)).toBe('+$1,185,828');
    expect(signedMoney(-6_876)).toBe('−$6,876');
    expect(signedMoney(0.3)).toBe('$0');
    expect(moneyCompact(16_371_044)).toBe('$16.4 M');
    expect(moneyCompact(48_484_866)).toBe('$48.5 M');
    expect(moneyCompact(20_000_000)).toBe('$20 M');
    expect(moneyCompact(143_600_000)).toBe('$144 M');
    expect(moneyCompact(850_300)).toBe('$850 mil');
    expect(moneyCompact(950)).toBe('$950');
    expect(moneyCompact(0)).toBe('$0');
  });

  it('fechas: sumar días cruza meses y años; día y mes cortos', () => {
    expect(addDays('2026-11-01', 13)).toBe('2026-11-14');
    expect(addDays('2026-09-26', 12)).toBe('2026-10-08');
    expect(addDays('2025-12-26', 30)).toBe('2026-01-25');
    expect(shortDate('2026-11-14')).toBe('14 nov');
    expect(shortDate('2025-11-14', true)).toBe('14 nov 2025');
    expect(shortDate(null)).toBe('');
  });
});

describe('paceHeadline: el titular', () => {
  const base = { period: NOV, minSignalDay: 5 };

  it('en curso: las mismas frases de la app según vaya arriba, cerca o abajo', () => {
    expect(paceHeadline({ ...base, phase: 'current', comparison: comparison() })).toEqual({
      tone: 'ahead',
      title: 'Vamos al 109 % del ritmo de Noviembre 2025. ¡Arriba!',
      subtitle: 'Mismos días transcurridos, al cierre de ayer.',
    });
    expect(
      paceHeadline({
        ...base,
        phase: 'current',
        comparison: comparison({ name: 'OCTUBRE 2026', pacePct: 99.95, signal: 'close' }),
      }),
    ).toMatchObject({ tone: 'close', title: 'Vamos al 100 % del ritmo de Octubre 2026. Muy cerca.' });
    expect(
      paceHeadline({ ...base, phase: 'current', comparison: comparison({ pacePct: 82.4, signal: 'behind' }) }),
    ).toMatchObject({ tone: 'behind', title: 'Vamos al 82 % del ritmo de Noviembre 2025. A cerrar la brecha.' });
  });

  it('los primeros días no hay veredicto', () => {
    expect(
      paceHeadline({ ...base, phase: 'current', comparison: comparison({ pacePct: null, signal: 'starting' }) }),
    ).toEqual({
      tone: 'neutral',
      title: 'El periodo va arrancando. El ritmo se compara a partir del día 5.',
      subtitle: null,
    });
  });

  it('terminado: con cuánto cerró contra el total de la referencia', () => {
    const oct = { name: 'OCTUBRE 2026', totalDays: 36 };
    expect(
      paceHeadline({
        phase: 'closed',
        period: oct,
        minSignalDay: 5,
        comparison: comparison({ name: 'SEPTIEMBRE 2026', totalDays: 30, progressPct: 105.1, pacePct: 105.1 }),
      }),
    ).toEqual({
      tone: 'ahead',
      title: 'Octubre 2026 cerró al 105 % de Septiembre 2026.',
      subtitle: 'Octubre 2026 duró 36 días; Septiembre 2026, 30.',
    });
    // Misma duración; abajo del 90 % ya es "abajo".
    expect(
      paceHeadline({
        phase: 'closed',
        period: { name: 'NOVIEMBRE 2025', totalDays: 30 },
        minSignalDay: 5,
        comparison: comparison({ name: 'NOVIEMBRE 2024', progressPct: 88.2 }),
      }),
    ).toEqual({
      tone: 'behind',
      title: 'Noviembre 2025 cerró al 88 % de Noviembre 2024.',
      subtitle: 'Periodo completo contra periodo completo.',
    });
    expect(
      paceHeadline({
        phase: 'closed',
        period: { name: 'X 2026', totalDays: 30 },
        minSignalDay: 5,
        comparison: comparison({ progressPct: 93 }),
      }).tone,
    ).toBe('close');
  });

  it('el avance del periodo solo se dice mientras está en curso', () => {
    expect(paceProgressText('current', comparison())).toBe(
      'Hoy llevamos el 36 % de todo lo que se logró en Noviembre 2025.',
    );
    expect(paceProgressText('closed', comparison())).toBeNull();
  });
});

describe('paceFigures: las cifras junto a la gráfica', () => {
  it('en curso: hasta hoy, cierre de ayer contra la referencia, diferencia y con cuánto cerró', () => {
    expect(paceFigures({ phase: 'current', period: NOV, comparison: comparison() })).toEqual([
      { label: 'Noviembre 2026, hasta hoy', value: '$17,195,299', strong: true },
      { label: 'Al cierre de ayer (día 13)', value: '$15,019,954' },
      { label: 'Noviembre 2025 al cierre de su día 13', value: '$13,834,126' },
      { label: 'Diferencia', value: '+$1,185,828', tone: 'positive' },
      { label: 'Noviembre 2025 cerró en', value: '$48,484,866' },
    ]);
  });

  it('"hasta hoy" puede venir de la tarjeta de ingresos del panel (el mismo número en pantalla)', () => {
    const figures = paceFigures({ phase: 'current', period: NOV, comparison: comparison(), currentToDate: 17_201_450 });
    expect(figures[0]).toEqual({ label: 'Noviembre 2026, hasta hoy', value: '$17,201,450', strong: true });
    // Lo de los días completos no cambia.
    expect(figures[1].value).toBe('$15,019,954');
  });

  it('abajo de la referencia la diferencia sale en contra', () => {
    const figures = paceFigures({
      phase: 'current',
      period: NOV,
      comparison: comparison({
        name: 'OCTUBRE 2026',
        amounts: {
          currency: 'MXN',
          currentToDate: 17_195_299,
          currentClosed: 15_019_954,
          referenceAtClosedDay: 15_026_830,
          referenceTotal: 43_664_015,
        },
      }),
    });
    expect(figures[3]).toEqual({ label: 'Diferencia', value: '−$6,876', tone: 'negative' });
  });

  it('el primer día todavía no hay cierre que comparar', () => {
    expect(
      paceFigures({ phase: 'current', period: NOV_DAY_1, comparison: comparison() }),
    ).toEqual([
      { label: 'Noviembre 2026, hasta hoy', value: '$17,195,299', strong: true },
      { label: 'Noviembre 2025 cerró en', value: '$48,484,866' },
    ]);
  });

  it('terminado: cierre contra cierre; si la referencia duró más, lo que llevaba a los mismos días', () => {
    const closed = comparison({
      name: 'OCTUBRE 2026',
      totalDays: 36,
      amounts: {
        currency: 'MXN',
        currentToDate: 40_000_000,
        currentClosed: 40_000_000,
        referenceAtClosedDay: 36_500_000,
        referenceTotal: 43_664_015,
      },
    });
    expect(
      paceFigures({ phase: 'closed', period: NOV_CLOSED, comparison: closed }),
    ).toEqual([
      { label: 'Noviembre 2026 cerró en', value: '$40,000,000', strong: true },
      { label: 'Octubre 2026 cerró en', value: '$43,664,015' },
      { label: 'Diferencia', value: '−$3,664,015', tone: 'negative' },
      { label: 'Octubre 2026 al cierre de su día 30', value: '$36,500,000' },
    ]);
    // Misma duración: solo cierre contra cierre. El consolidado del panel no aplica aquí.
    expect(
      paceFigures({
        phase: 'closed',
        period: NOV_CLOSED,
        comparison: { ...closed, totalDays: 30 },
        currentToDate: 1,
      }),
    ).toHaveLength(3);
  });

  it('sin importes no hay cifras', () => {
    expect(paceFigures({ phase: 'current', period: NOV, comparison: comparison({ amounts: undefined }) })).toEqual([]);
  });
});

describe('paceChartRows: los puntos de la gráfica y de la tabla', () => {
  it('en curso: días completos en línea sólida y el día de hoy en un tramo aparte', () => {
    const rows = paceChartRows(NOV, 'current', comparison());
    expect(rows).toHaveLength(30);
    expect(rows[0]).toEqual({
      day: 1,
      closed: 1_000_000,
      today: null,
      reference: 1_500_000,
      date: '2026-11-01',
      referenceDate: '2025-11-01',
    });
    // Día 13 (ayer): cierra la línea sólida y de ahí arranca el tramo de hoy.
    expect(rows[12]).toMatchObject({ day: 13, closed: 13_000_000, today: 13_000_000 });
    // Día 14 (hoy): solo el tramo en curso.
    expect(rows[13]).toMatchObject({ day: 14, closed: null, today: 14_000_000, date: '2026-11-14' });
    // Después de hoy solo sigue la referencia.
    expect(rows[14]).toMatchObject({ day: 15, closed: null, today: null, reference: 22_500_000 });
    expect(rows[29]).toMatchObject({ day: 30, reference: 45_000_000, referenceDate: '2025-11-30' });
  });

  it('el primer día solo hay un punto: el de hoy', () => {
    const rows = paceChartRows(
      { ...NOV, dayNumber: 1, closedDay: 0 },
      'current',
      comparison({ series: { current: [400_000], reference: line(30, 1_500_000) } }),
    );
    expect(rows[0]).toMatchObject({ closed: null, today: 400_000 });
    expect(rows[1]).toMatchObject({ closed: null, today: null });
  });

  it('terminado: toda la curva es de días completos, sin tramo de hoy', () => {
    const rows = paceChartRows(
      { ...NOV, dayNumber: 30, closedDay: 30 },
      'closed',
      comparison({ series: { current: line(30, 1_000_000), reference: line(30, 1_500_000) } }),
    );
    expect(rows.every((r) => r.closed !== null && r.today === null)).toBe(true);
  });

  it('referencia más larga que el periodo: el eje llega hasta el último día de la referencia', () => {
    const oct = comparison({
      name: 'OCTUBRE 2026',
      startDate: '2026-09-26',
      endDate: '2026-10-31',
      totalDays: 36,
      series: { current: line(14, 1_000_000), reference: line(36, 1_200_000) },
    });
    expect(paceAxisDays(NOV, oct)).toBe(36);
    const rows = paceChartRows(NOV, 'current', oct);
    expect(rows).toHaveLength(36);
    // El día 13 de OCTUBRE 2026 fue el 8 de octubre (empezó el 26 de septiembre).
    expect(rows[12].referenceDate).toBe('2026-10-08');
    // Del día 31 en adelante NOVIEMBRE ya no tiene fecha; la referencia sí.
    expect(rows[30]).toMatchObject({ day: 31, date: null, referenceDate: '2026-10-26', reference: 37_200_000 });
  });

  it('referencia más corta: después de su último día ya no tiene punto', () => {
    const rows = paceChartRows(
      { ...NOV, totalDays: 36, startDate: '2026-09-26', dayNumber: 36, closedDay: 36 },
      'closed',
      comparison({ totalDays: 30, series: { current: line(36, 1_000_000), reference: line(30, 1_500_000) } }),
    );
    expect(rows).toHaveLength(36);
    expect(rows[30]).toMatchObject({ day: 31, closed: 31_000_000, reference: null, referenceDate: null });
  });

  it('con el consolidado del panel, el punto de hoy lleva ese importe (ayer no cambia)', () => {
    const rows = paceChartRows(NOV, 'current', comparison(), 14_250_000);
    expect(rows[12]).toMatchObject({ day: 13, closed: 13_000_000, today: 13_000_000 });
    expect(rows[13]).toMatchObject({ day: 14, closed: null, today: 14_250_000 });
    // En un periodo terminado no hay día en curso que ajustar.
    const closed = paceChartRows(
      { ...NOV, dayNumber: 30, closedDay: 30 },
      'closed',
      comparison({ series: { current: line(30, 1_000_000), reference: line(30, 1_500_000) } }),
      99,
    );
    expect(closed[29]).toMatchObject({ closed: 30_000_000, today: null });
  });

  it('eje de pesos: marcas redondas y tope en la primera que cubre lo más alto', () => {
    expect(paceYAxis(48_484_866)).toEqual({
      max: 50_000_000,
      ticks: [0, 10_000_000, 20_000_000, 30_000_000, 40_000_000, 50_000_000],
    });
    expect(paceYAxis(43_664_015).max).toBe(50_000_000);
    expect(paceYAxis(17_202_366)).toEqual({
      max: 20_000_000,
      ticks: [0, 5_000_000, 10_000_000, 15_000_000, 20_000_000],
    });
    expect(paceYAxis(20_000_000).max).toBe(20_000_000);
    expect(paceYAxis(1_180_000)).toEqual({
      max: 1_250_000,
      ticks: [0, 250_000, 500_000, 750_000, 1_000_000, 1_250_000],
    });
    expect(paceYAxis(0)).toEqual({ max: 1, ticks: [0, 1] });
  });

  it('marcas del eje: 1, cada 5 y el último, sin encimar', () => {
    expect(paceDayTicks(30)).toEqual([1, 5, 10, 15, 20, 25, 30]);
    expect(paceDayTicks(31)).toEqual([1, 5, 10, 15, 20, 25, 31]);
    expect(paceDayTicks(36)).toEqual([1, 5, 10, 15, 20, 25, 30, 36]);
    expect(paceDayTicks(28)).toEqual([1, 5, 10, 15, 20, 25, 28]);
    expect(paceDayTicks(1)).toEqual([1]);
  });

  it('punto final: hoy (o el último día), con el consolidado del panel si se le da', () => {
    expect(paceEndPoint(NOV, comparison())).toEqual({ day: 14, value: 14_000_000 });
    expect(paceEndPoint(NOV, comparison(), 14_250_000)).toEqual({ day: 14, value: 14_250_000 });
    expect(paceEndPoint({ dayNumber: 0 }, comparison())).toBeNull();
    expect(paceEndPoint(NOV, comparison({ series: { current: [], reference: [] } }))).toBeNull();
  });
});
