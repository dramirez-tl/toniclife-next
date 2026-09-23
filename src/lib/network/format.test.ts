import { describe, expect, it } from 'vitest';
import {
  daysLeft,
  fmtDate,
  fmtInt,
  fmtPeriodRange,
  fmtPoints,
  fmtRelativeTime,
  intlLocale,
  minutesSince,
  parseDateInput,
  todayInCdmx,
} from './format';

describe('intlLocale', () => {
  it('mapea el locale de la app al de Intl por idioma', () => {
    expect(intlLocale('es-mx')).toBe('es-MX');
    expect(intlLocale('es')).toBe('es-MX');
    expect(intlLocale('en-us')).toBe('en-US');
    expect(intlLocale('en')).toBe('en-US');
    expect(intlLocale(undefined)).toBe('es-MX');
    expect(intlLocale('')).toBe('es-MX');
  });
});

describe('fmtInt / fmtPoints', () => {
  it('separa miles por idioma y tolera null/NaN', () => {
    expect(fmtInt(80603, 'es-mx')).toBe('80,603');
    expect(fmtInt(80603, 'en-us')).toBe('80,603');
    expect(fmtInt(0, 'es')).toBe('0');
    expect(fmtInt(null, 'es')).toBe('0');
    expect(fmtInt(Number.NaN, 'en')).toBe('0');
    expect(fmtInt(3300.7, 'es')).toBe('3,301');
  });

  it('puntos con hasta 2 decimales', () => {
    expect(fmtPoints(3300, 'es')).toBe('3,300');
    expect(fmtPoints(1234.5, 'en')).toBe('1,234.5');
    expect(fmtPoints(1234.567, 'es')).toBe('1,234.57');
    expect(fmtPoints(undefined, 'es')).toBe('0');
  });
});

describe('parseDateInput', () => {
  it('YYYY-MM-DD es día calendario local (sin desfase de zona)', () => {
    const d = parseDateInput('2026-09-25');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(8);
    expect(d!.getDate()).toBe(25);
  });

  it('ISO completo e inválidos', () => {
    expect(parseDateInput('2026-09-22T15:04:05.000Z')?.toISOString()).toBe('2026-09-22T15:04:05.000Z');
    expect(parseDateInput('')).toBeNull();
    expect(parseDateInput(null)).toBeNull();
    expect(parseDateInput('no-es-fecha')).toBeNull();
    expect(parseDateInput('2026-13-45')).toBeNull();
    expect(parseDateInput('2026-02-30')).toBeNull();
    expect(daysLeft('2026-02-30', '2026-02-01')).toBeNull();
  });
});

describe('fmtDate', () => {
  it('formatea fechas texto por idioma sin correr el día', () => {
    const es = fmtDate('2026-09-25', 'es-mx');
    const en = fmtDate('2026-09-25', 'en-us');
    expect(es).toContain('25');
    expect(es).toContain('2026');
    expect(es.toLowerCase()).toContain('sep');
    expect(en).toBe('Sep 25, 2026');
    // El día 1 tampoco se corre al mes anterior (el clásico bug UTC→CDMX).
    expect(fmtDate('2026-09-01', 'en')).toBe('Sep 1, 2026');
    expect(fmtDate('2026-12-26', 'es')).toContain('26');
  });

  it('estilos dayMonth, time y dateTime', () => {
    expect(fmtDate('2026-08-26', 'en', 'dayMonth')).toBe('Aug 26');
    expect(fmtDate('2026-08-26', 'es', 'dayMonth')).toContain('26');
    const time = fmtDate(new Date(2026, 8, 22, 18, 42), 'es', 'time');
    expect(time).toMatch(/18:42|6:42/);
    expect(fmtDate(new Date(2026, 8, 22, 18, 42), 'en', 'dateTime')).toContain('2026');
  });

  it('inválida ⇒ cadena vacía', () => {
    expect(fmtDate(null, 'es')).toBe('');
    expect(fmtDate('', 'en')).toBe('');
    expect(fmtDate('basura', 'en')).toBe('');
  });
});

describe('fmtPeriodRange', () => {
  it('línea de periodo 26→25', () => {
    expect(fmtPeriodRange('2026-08-26', '2026-09-25', 'en')).toEqual({ start: 'Aug 26', end: 'Sep 25' });
    const es = fmtPeriodRange('2026-08-26', '2026-09-25', 'es');
    expect(es.start).toContain('26');
    expect(es.end).toContain('25');
  });
});

describe('daysLeft', () => {
  it('cuenta días entre fechas texto sin zona', () => {
    expect(daysLeft('2026-09-25', '2026-09-22')).toBe(3);
    expect(daysLeft('2026-09-25', '2026-09-25')).toBe(0);
    expect(daysLeft('2026-09-25', '2026-09-26')).toBe(-1);
    // Cruce de año: periodo ENERO 2027 = 26-dic → 25-ene.
    expect(daysLeft('2027-01-25', '2026-12-26')).toBe(30);
  });

  it('inválidos ⇒ null', () => {
    expect(daysLeft(null, '2026-09-22')).toBeNull();
    expect(daysLeft('2026-09-25', undefined)).toBeNull();
    expect(daysLeft('2026-09-25T00:00:00Z', '2026-09-22')).toBeNull();
  });
});

describe('todayInCdmx', () => {
  it('devuelve el día calendario de CDMX (UTC-6/-5) en YYYY-MM-DD', () => {
    // 2026-09-23 03:00 UTC = 2026-09-22 21:00 en CDMX (sin horario de verano desde 2022).
    expect(todayInCdmx(new Date('2026-09-23T03:00:00Z'))).toBe('2026-09-22');
    expect(todayInCdmx(new Date('2026-09-23T12:00:00Z'))).toBe('2026-09-23');
    expect(todayInCdmx()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('minutesSince / fmtRelativeTime', () => {
  const now = Date.parse('2026-09-22T18:00:00.000Z');

  it('minutos enteros, nunca negativos', () => {
    expect(minutesSince('2026-09-22T17:55:30.000Z', now)).toBe(4);
    expect(minutesSince('2026-09-22T18:10:00.000Z', now)).toBe(0);
    expect(minutesSince(null, now)).toBeNull();
  });

  it('texto relativo por idioma y escala', () => {
    expect(fmtRelativeTime('2026-09-22T17:55:00.000Z', 'en', now)).toBe('5 min. ago');
    expect(fmtRelativeTime('2026-09-22T17:55:00.000Z', 'es', now)).toMatch(/hace 5 ?min/);
    expect(fmtRelativeTime('2026-09-22T16:00:00.000Z', 'en', now)).toMatch(/2 ?hr?\.? ago/);
    expect(fmtRelativeTime('2026-09-19T18:00:00.000Z', 'en', now)).toMatch(/3 ?days? ago/);
    expect(fmtRelativeTime('2026-09-22T17:59:50.000Z', 'en', now)).toMatch(/now|this minute|0 min/i);
    expect(fmtRelativeTime('', 'en', now)).toBe('');
  });
});
