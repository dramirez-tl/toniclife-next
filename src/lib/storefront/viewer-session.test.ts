import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RECOVERY_COOLDOWN_MS,
  attemptViewerPriceRecovery,
  getViewerSessionStatus,
  isAccessTokenExpired,
  resetViewerSessionForTests,
  shouldRecoverViewerPrice,
} from './viewer-session';

const NOW = 1_800_000_000_000;

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.firma`;
}

const EXPIRED = jwt({ sub: 'u1', exp: NOW / 1000 - 60 });
const VALID = jwt({ sub: 'u1', exp: NOW / 1000 + 900 });

beforeEach(() => resetViewerSessionForTests());

describe('isAccessTokenExpired', () => {
  it('vigente, vencido y por vencer (margen de 5 s)', () => {
    expect(isAccessTokenExpired(VALID, NOW)).toBe(false);
    expect(isAccessTokenExpired(EXPIRED, NOW)).toBe(true);
    expect(isAccessTokenExpired(jwt({ exp: NOW / 1000 + 3 }), NOW)).toBe(true);
  });

  it('ausente o ilegible = vencido (nunca lanza)', () => {
    for (const token of [null, undefined, '', 'abc', 'a.b', 'a.%%%.c', jwt({ sub: 'sin-exp' }), jwt({ exp: 'mañana' })]) {
      expect(isAccessTokenExpired(token, NOW)).toBe(true);
    }
  });
});

describe('shouldRecoverViewerPrice', () => {
  const base = {
    hasCustomerSession: true,
    tier: 'public' as const,
    accessToken: EXPIRED,
    nowMs: NOW,
    lastAttemptAt: null,
    inFlight: false,
  };

  it('cliente con sesión + tier público + token vencido = refrescar', () => {
    expect(shouldRecoverViewerPrice(base)).toBe(true);
  });

  it('invitados y staff sin customerId: nunca', () => {
    expect(shouldRecoverViewerPrice({ ...base, hasCustomerSession: false })).toBe(false);
  });

  it('ya cotizó por rol, o aún no hay respuesta real: nunca', () => {
    expect(shouldRecoverViewerPrice({ ...base, tier: 'distributor' })).toBe(false);
    expect(shouldRecoverViewerPrice({ ...base, tier: 'preferred' })).toBe(false);
    expect(shouldRecoverViewerPrice({ ...base, tier: undefined })).toBe(false);
  });

  it('token vigente + tier público = es su precio real (sin bucle de refresh)', () => {
    expect(shouldRecoverViewerPrice({ ...base, accessToken: VALID })).toBe(false);
  });

  it('guarda anti-bucle: en vuelo o dentro del minuto', () => {
    expect(shouldRecoverViewerPrice({ ...base, inFlight: true })).toBe(false);
    expect(shouldRecoverViewerPrice({ ...base, lastAttemptAt: NOW - RECOVERY_COOLDOWN_MS + 1 })).toBe(false);
    expect(shouldRecoverViewerPrice({ ...base, lastAttemptAt: NOW - RECOVERY_COOLDOWN_MS })).toBe(true);
  });
});

describe('attemptViewerPriceRecovery', () => {
  it('UN solo refresh aunque lo pidan varios hooks a la vez; solo el iniciador recibe true', async () => {
    let release: () => void = () => {};
    const refresh = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
    const input = { hasCustomerSession: true, tier: 'public' as const, getAccessToken: () => EXPIRED, refresh, now: () => NOW };

    const first = attemptViewerPriceRecovery(input);
    const second = attemptViewerPriceRecovery(input);
    expect(getViewerSessionStatus()).toBe('recovering');
    release();
    expect(await Promise.all([first, second])).toEqual([true, false]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(getViewerSessionStatus()).toBe('recovered');

    // La respuesta siguiente vuelve a llegar 'public' (p. ej. refresh sin efecto): dentro del minuto NO se repite.
    expect(await attemptViewerPriceRecovery(input)).toBe(false);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refresh rechazado: estado expired, sin reintentos dentro del minuto y sin lanzar', async () => {
    const refresh = vi.fn().mockRejectedValue(new Error('401'));
    let now = NOW;
    const input = { hasCustomerSession: true, tier: 'public' as const, getAccessToken: () => EXPIRED, refresh, now: () => now };
    expect(await attemptViewerPriceRecovery(input)).toBe(false);
    expect(getViewerSessionStatus()).toBe('expired');
    now += 30_000;
    expect(await attemptViewerPriceRecovery(input)).toBe(false);
    expect(refresh).toHaveBeenCalledTimes(1);
    now += 31_000;
    await attemptViewerPriceRecovery(input);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('invitado: jamás llama al refresh', async () => {
    const refresh = vi.fn();
    const result = await attemptViewerPriceRecovery({
      hasCustomerSession: false,
      tier: 'public',
      getAccessToken: () => null,
      refresh,
      now: () => NOW,
    });
    expect(result).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
    expect(getViewerSessionStatus()).toBe('idle');
  });
});
