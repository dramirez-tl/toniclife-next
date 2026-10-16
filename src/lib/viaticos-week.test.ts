import { describe, expect, it } from 'vitest';
import {
  addDaysIso,
  dayHeader,
  daysOfRange,
  diffDaysIso,
  mondayOf,
  rangeLabel,
  weekDays,
  weekLabel,
} from './viaticos-week';

describe('viaticos-week', () => {
  it('mondayOf: cualquier día de la semana cae en su lunes (domingo incluido)', () => {
    expect(mondayOf('2026-10-12')).toBe('2026-10-12'); // lunes
    expect(mondayOf('2026-10-15')).toBe('2026-10-12'); // jueves
    expect(mondayOf('2026-10-18')).toBe('2026-10-12'); // domingo
    expect(mondayOf('2026-11-01')).toBe('2026-10-26'); // domingo que cruza de mes
  });

  it('weekDays: 7 días de lunes a domingo', () => {
    const d = weekDays('2026-10-26');
    expect(d).toHaveLength(7);
    expect(d[0]).toBe('2026-10-26');
    expect(d[6]).toBe('2026-11-01');
  });

  it('aritmética de fechas sin desfase por zona horaria', () => {
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysIso('2026-10-12', -7)).toBe('2026-10-05');
    expect(diffDaysIso('2026-10-12', '2026-10-18')).toBe(6);
    expect(daysOfRange('2026-10-12', '2026-10-12')).toEqual(['2026-10-12']);
  });

  it('etiquetas en español', () => {
    expect(weekLabel('2026-10-12')).toBe('12 – 18 oct 2026');
    expect(rangeLabel('2026-10-26', '2026-11-01')).toBe('26 oct – 1 nov 2026');
    expect(dayHeader('2026-10-14')).toEqual({ weekday: 'Mié', day: '14', month: 'oct' });
  });
});
