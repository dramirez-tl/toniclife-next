import { describe, expect, it } from 'vitest';
import {
  isStoreCountryCode,
  paymentPlan,
  storeCountries,
  storeCountry,
  storeCountryOfCode,
  storeCountryScope,
  stripeAccountsState,
} from './countries';

describe('store-country/countries · países de la tienda', () => {
  it('son los cuatro de la tienda, en su orden, y solo México abarca una zona (Frontera)', () => {
    const all = storeCountries();
    expect(all.map((c) => c.code)).toEqual(['MX', 'US', 'CO', 'GT']);
    expect(all[0].zones).toEqual([{ code: 'FN', name: 'Frontera' }]);
    expect(all.slice(1).every((c) => c.zones.length === 0)).toBe(true);
    // Publicada = `ready` de i18n/config: México y Estados Unidos sí; Colombia y Guatemala todavía no.
    expect(all.map((c) => c.published)).toEqual([true, true, false, false]);
    expect(all.map((c) => c.currency)).toEqual(['MXN', 'USD', 'COP', 'GTQ']);
  });

  it('busca por código sin importar mayúsculas; uno desconocido cae en México', () => {
    expect(storeCountry('us').name).toBe('Estados Unidos');
    expect(storeCountry(' co ').code).toBe('CO');
    expect(storeCountry('SV').code).toBe('MX');
    expect(storeCountry(null).code).toBe('MX');
    expect(isStoreCountryCode('gt')).toBe(true);
    expect(isStoreCountryCode('FN')).toBe(false);
    expect(isStoreCountryCode('')).toBe(false);
  });

  it('Frontera pertenece a la tienda de México; un país sin tienda no pertenece a ninguna', () => {
    expect(storeCountryOfCode('FN')).toBe('MX');
    expect(storeCountryOfCode('fn')).toBe('MX');
    expect(storeCountryOfCode('MX')).toBe('MX');
    expect(storeCountryOfCode('US')).toBe('US');
    expect(storeCountryOfCode('SV')).toBeNull();
    expect(storeCountryOfCode('')).toBeNull();
    expect(storeCountryOfCode(undefined)).toBeNull();
  });

  it('dice qué abarca el país', () => {
    expect(storeCountryScope(storeCountry('MX'))).toBe('México (incluye Frontera)');
    expect(storeCountryScope(storeCountry('CO'))).toBe('Colombia');
  });
});

describe('store-country/countries · cobro en línea', () => {
  it('México y Estados Unidos cobran con Stripe, cada uno en su cuenta', () => {
    expect(paymentPlan('MX')).toEqual({ kind: 'stripe', account: 'mx', accountName: 'México' });
    expect(paymentPlan('US')).toEqual({ kind: 'stripe', account: 'us', accountName: 'Estados Unidos' });
  });

  it('Colombia usará Mercado Pago; Guatemala no tiene pasarela definida', () => {
    expect(paymentPlan('CO')).toEqual({ kind: 'planned', gatewayName: 'Mercado Pago' });
    expect(paymentPlan('GT')).toEqual({ kind: 'none' });
  });

  it('lee qué cuentas de Stripe tienen llaves', () => {
    expect(
      stripeAccountsState({ enabled: true, publishableKey: 'pk', accounts: { mx: { enabled: true }, us: { enabled: false } } }),
    ).toEqual({ mx: true, us: false });
    // Solo un `true` expreso cuenta.
    expect(stripeAccountsState({ accounts: { mx: { enabled: 'yes' }, us: {} } })).toEqual({ mx: false, us: false });
    expect(stripeAccountsState({ accounts: {} })).toEqual({ mx: false, us: false });
  });

  it('un API sin `accounts` solo conoce la cuenta de México; sin nada útil no se sabe', () => {
    expect(stripeAccountsState({ enabled: true })).toEqual({ mx: true, us: false });
    expect(stripeAccountsState({ enabled: false })).toEqual({ mx: false, us: false });
    expect(stripeAccountsState({})).toBeNull();
    expect(stripeAccountsState(null)).toBeNull();
    expect(stripeAccountsState('ok')).toBeNull();
  });
});
