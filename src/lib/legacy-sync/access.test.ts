import { describe, expect, it } from 'vitest';
import {
  canManageLegacySync,
  LEGACY_SYNC_PAGE,
  legacySyncReadAccess,
  sistemaRedirectFor,
} from './access';

const forbidden = { response: { status: 403, data: {} } };

describe('legacySyncReadAccess (D12: lee quien el API deje leer)', () => {
  it('super_admin siempre puede abrir la página, aun sin datos o con error', () => {
    expect(legacySyncReadAccess({ isSuperAdmin: true, hasData: false })).toBe('allowed');
    expect(legacySyncReadAccess({ isSuperAdmin: true, hasData: false, error: forbidden })).toBe('allowed');
  });

  it('otro rol: con respuesta del API puede (p. ej. Sistemas); con 403 no', () => {
    expect(legacySyncReadAccess({ isSuperAdmin: false, hasData: true })).toBe('allowed');
    expect(legacySyncReadAccess({ isSuperAdmin: false, hasData: false, error: forbidden })).toBe('denied');
  });

  it('consultando o con otro error no se decide', () => {
    expect(legacySyncReadAccess({ isSuperAdmin: false, hasData: false, loading: true })).toBe('checking');
    expect(
      legacySyncReadAccess({ isSuperAdmin: false, hasData: false, error: { message: 'Network Error' } }),
    ).toBe('unknown');
    expect(
      legacySyncReadAccess({ isSuperAdmin: false, hasData: false, error: { response: { status: 503, data: {} } } }),
    ).toBe('unknown');
    expect(legacySyncReadAccess({ isSuperAdmin: false, hasData: false })).toBe('unknown');
  });
});

describe('canManageLegacySync (interruptor y retenciones)', () => {
  it('solo super_admin escribe; leer no basta', () => {
    expect(canManageLegacySync(['super_admin'])).toBe(true);
    expect(canManageLegacySync(['sistemas'])).toBe(false);
    expect(canManageLegacySync([])).toBe(false);
    expect(canManageLegacySync(null)).toBe(false);
    expect(canManageLegacySync(undefined)).toBe(false);
  });
});

describe('sistemaRedirectFor', () => {
  it('?tab=sync va a la ruta propia; las demás pestañas no se redirigen', () => {
    expect(LEGACY_SYNC_PAGE).toBe('/admin/sistema/sync');
    expect(sistemaRedirectFor('sync')).toBe(LEGACY_SYNC_PAGE);
    expect(sistemaRedirectFor('limpieza')).toBeNull();
    expect(sistemaRedirectFor(null)).toBeNull();
    expect(sistemaRedirectFor(undefined)).toBeNull();
  });
});
