// price-dates.test.ts — "Vigente desde" no admite fechas futuras (seguridad M2).

import { describe, expect, it } from 'vitest';
import { FUTURE_EFFECTIVE_FROM_MESSAGE, effectiveFromError, todayInMexico } from './price-dates';

describe('todayInMexico', () => {
  it('usa la fecha de México, no la UTC ni la del navegador', () => {
    // 03:30 UTC del 22-sep = 21:30 del 21-sep en Ciudad de México (UTC-6).
    expect(todayInMexico(new Date('2026-09-22T03:30:00Z'))).toBe('2026-09-21');
    expect(todayInMexico(new Date('2026-09-22T06:00:00Z'))).toBe('2026-09-22');
  });

  it('formato YYYY-MM-DD con ceros', () => {
    expect(todayInMexico(new Date('2026-01-05T18:00:00Z'))).toBe('2026-01-05');
  });
});

describe('effectiveFromError', () => {
  const today = '2026-09-21';

  it('rechaza una fecha futura capturada por el usuario', () => {
    expect(effectiveFromError('2026-09-22', '2026-08-01', today)).toBe(FUTURE_EFFECTIVE_FROM_MESSAGE);
    expect(effectiveFromError('2026-10-01', '', today)).toBe(FUTURE_EFFECTIVE_FROM_MESSAGE);
  });

  it('acepta hoy y fechas pasadas', () => {
    expect(effectiveFromError('2026-09-21', '2026-08-01', today)).toBeNull();
    expect(effectiveFromError('2026-08-26', '', today)).toBeNull();
  });

  it('no valida lo que el usuario no tocó (no viaja al API) ni el vacío', () => {
    expect(effectiveFromError('2027-01-01', '2027-01-01', today)).toBeNull();
    expect(effectiveFromError('', '2026-08-01', today)).toBeNull();
  });
});
