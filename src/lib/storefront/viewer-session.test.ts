import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RECOVERY_COOLDOWN_MS,
  attemptViewerPriceRecovery,
  getViewerSessionStatus,
  isAccessTokenExpired,
  isRefreshRejected,
  reconcileViewerSession,
  resetViewerSessionForTests,
  shouldRecoverViewerPrice,
  subscribeViewerSession,
} from './viewer-session';

const NOW = 1_800_000_000_000;

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.firma`;
}

const EXPIRED = jwt({ sub: 'u1', exp: NOW / 1000 - 60 });
const VALID = jwt({ sub: 'u1', exp: NOW / 1000 + 900 });

/** Error con la forma de un AxiosError respondido por el API. */
function rejected(status: number): Error & { response: { status: number } } {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status } });
}

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
    const refresh = vi.fn().mockRejectedValue(rejected(401));
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

describe('refresh fallido: rechazo del API vs. fallo de red (L-5)', () => {
  const input = (refresh: () => Promise<unknown>, now: () => number = () => NOW) => ({
    hasCustomerSession: true,
    tier: 'public' as const,
    getAccessToken: () => EXPIRED,
    refresh,
    now,
  });

  it('isRefreshRejected: solo response.status 401 o 403', () => {
    expect(isRefreshRejected(rejected(401))).toBe(true);
    expect(isRefreshRejected(rejected(403))).toBe(true);
    for (const error of [
      rejected(429),
      rejected(500),
      rejected(503),
      new Error('Network Error'),
      Object.assign(new Error('timeout'), { code: 'ECONNABORTED' }),
      { response: null },
      { response: { status: '401' } },
      null,
      undefined,
      'boom',
    ]) {
      expect(isRefreshRejected(error)).toBe(false);
    }
  });

  it('403 también marca la sesión como vencida', async () => {
    expect(await attemptViewerPriceRecovery(input(vi.fn().mockRejectedValue(rejected(403))))).toBe(false);
    expect(getViewerSessionStatus()).toBe('expired');
  });

  it('sin red, timeout o 5xx: NO hay aviso; vuelve a idle, respeta el minuto y no lanza', async () => {
    for (const error of [new Error('Network Error'), rejected(500), rejected(429)]) {
      resetViewerSessionForTests();
      const refresh = vi.fn().mockRejectedValue(error);
      let now = NOW;
      expect(await attemptViewerPriceRecovery(input(refresh, () => now))).toBe(false);
      expect(getViewerSessionStatus()).toBe('idle');
      now += 30_000;
      expect(await attemptViewerPriceRecovery(input(refresh, () => now))).toBe(false);
      expect(refresh).toHaveBeenCalledTimes(1);
    }
  });
});

describe('reconcileViewerSession: el aviso se apaga al volver a iniciar sesión', () => {
  const expire = () =>
    attemptViewerPriceRecovery({
      hasCustomerSession: true,
      tier: 'public',
      getAccessToken: () => EXPIRED,
      refresh: vi.fn().mockRejectedValue(rejected(401)),
      now: () => NOW,
    });

  it('sin estado expired no hace nada', () => {
    expect(reconcileViewerSession(VALID, NOW)).toBe(false);
    expect(getViewerSessionStatus()).toBe('idle');
  });

  it('mismo token rechazado, sin token o token vencido: el aviso sigue', async () => {
    await expire();
    for (const token of [EXPIRED, null, undefined, '', jwt({ sub: 'u1', exp: NOW / 1000 - 5 })]) {
      expect(reconcileViewerSession(token, NOW)).toBe(false);
      expect(getViewerSessionStatus()).toBe('expired');
    }
  });

  it('token nuevo y vigente: vuelve a idle, avisa a los suscriptores y libera el minuto', async () => {
    await expire();
    const listener = vi.fn();
    const unsubscribe = subscribeViewerSession(listener);
    expect(reconcileViewerSession(VALID, NOW)).toBe(true);
    expect(getViewerSessionStatus()).toBe('idle');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();

    // Sesión nueva: si otra vez vence, el intento no espera el minuto del anterior.
    const refresh = vi.fn().mockResolvedValue(undefined);
    expect(
      await attemptViewerPriceRecovery({
        hasCustomerSession: true,
        tier: 'public',
        getAccessToken: () => EXPIRED,
        refresh,
        now: () => NOW + 1_000,
      }),
    ).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
