import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AUTH_COOKIE_MAX_AGE_SECONDS, clearAuthCookies, writeAuthCookies } from './auth-cookies';

/** JWT de mentira (solo importa el cuerpo: las cookies de ruteo se leen de ahí). */
function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64');
  return `${b64({ alg: 'none' })}.${b64(payload)}.x`;
}

describe('cookies de ruteo de la sesión', () => {
  let written: string[] = [];
  let remembered: string | null = null;

  beforeEach(() => {
    written = [];
    remembered = null;
    const g = globalThis as Record<string, unknown>;
    g.window = {};
    g.localStorage = { getItem: (key: string) => (key === 'rememberMe' ? remembered : null) };
    g.document = {
      set cookie(value: string) {
        written.push(value);
      },
    };
  });

  afterEach(() => {
    const g = globalThis as Record<string, unknown>;
    delete g.window;
    delete g.localStorage;
    delete g.document;
  });

  it('duran 30 días, igual que la ventana de inactividad de la sesión en el servidor', () => {
    expect(AUTH_COOKIE_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
  });

  it('con "Recordarme" se escriben con 30 días de vida', () => {
    remembered = '1';
    writeAuthCookies(fakeJwt({ roles: ['call_center'], roleCategory: 'colaborador' }));
    expect(written).toEqual([
      'accessToken=1; path=/; max-age=2592000; SameSite=Lax',
      'authRole=call_center; path=/; max-age=2592000; SameSite=Lax',
      'authPortal=admin; path=/; max-age=2592000; SameSite=Lax',
    ]);
  });

  it('sin "Recordarme" son cookies de sesión (se van al cerrar el navegador)', () => {
    writeAuthCookies(fakeJwt({ roles: ['distributor'], roleCategory: 'cliente' }));
    expect(written).toEqual([
      'accessToken=1; path=/; SameSite=Lax',
      'authRole=distributor; path=/; SameSite=Lax',
      'authPortal=distributor; path=/; SameSite=Lax',
    ]);
  });

  it('al cerrar sesión las tres cookies se borran', () => {
    clearAuthCookies();
    expect(written).toEqual([
      'accessToken=; path=/; max-age=0',
      'authRole=; path=/; max-age=0',
      'authPortal=; path=/; max-age=0',
    ]);
  });
});
