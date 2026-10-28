// launch-countdown.test.ts - lanzamiento del 2-nov-2026 06:00 CDMX.
import { describe, expect, it } from 'vitest';
import { DEFAULT_LAUNCH_AT, formatLaunchLabel, getTimeLeft, resolveLaunchAt } from './launch-countdown';

describe('resolveLaunchAt', () => {
  it('usa la variable de entorno cuando es una fecha válida y la de código si no', () => {
    expect(resolveLaunchAt(undefined)).toBe(DEFAULT_LAUNCH_AT);
    expect(resolveLaunchAt('  ')).toBe(DEFAULT_LAUNCH_AT);
    expect(resolveLaunchAt('no es fecha')).toBe(DEFAULT_LAUNCH_AT);
    expect(resolveLaunchAt('2026-12-01T06:00:00-06:00')).toBe('2026-12-01T06:00:00-06:00');
  });

  it('la fecha por defecto es el lunes 2 de noviembre de 2026 a las 6:00 de CDMX (12:00 UTC)', () => {
    expect(new Date(DEFAULT_LAUNCH_AT).toISOString()).toBe('2026-11-02T12:00:00.000Z');
    expect(new Date(DEFAULT_LAUNCH_AT).getUTCDay()).toBe(1); // lunes
  });
});

describe('getTimeLeft', () => {
  it('descompone lo que falta en días, horas, minutos y segundos', () => {
    const now = Date.UTC(2026, 9, 28, 16, 30, 15); // 28-oct 16:30:15Z
    expect(getTimeLeft(DEFAULT_LAUNCH_AT, now)).toEqual({
      days: 4,
      hours: 19,
      minutes: 29,
      seconds: 45,
      done: false,
    });
  });

  it('en cero (o pasado) marca done', () => {
    expect(getTimeLeft(DEFAULT_LAUNCH_AT, Date.UTC(2026, 10, 2, 12, 0, 0))).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      done: true,
    });
    expect(getTimeLeft(DEFAULT_LAUNCH_AT, Date.UTC(2026, 10, 3)).done).toBe(true);
    expect(getTimeLeft('basura', 0).done).toBe(true);
  });
});

describe('formatLaunchLabel', () => {
  it('escribe la fecha y la hora en la zona de la Ciudad de México', () => {
    const label = formatLaunchLabel(DEFAULT_LAUNCH_AT);
    expect(label).toMatch(/^lunes,? 2 de noviembre · 6:00/);
    expect(label).toContain('(hora de la Ciudad de México)');
    expect(formatLaunchLabel('basura')).toBe('');
  });
});
