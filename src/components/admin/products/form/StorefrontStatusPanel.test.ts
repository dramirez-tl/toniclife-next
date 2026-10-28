// StorefrontStatusPanel.test.ts — la frase de "Dónde se vende" por país
// (`storefrontSentence`): sufijo de audiencia en línea (Bloque 2, mig 177) y
// razones bloqueantes vs. informativas (`members_only`, `out_of_stock`).

import { describe, expect, it } from 'vitest';
import type { StorefrontStatusEntry } from '@/services/products-admin.service';
import { storefrontSentence } from './StorefrontStatusPanel';

const entry = (over: Partial<StorefrontStatusEntry>): StorefrontStatusEntry => ({
  countryCode: 'MX',
  locale: 'es-mx',
  sellable: true,
  reasons: [],
  url: 'https://tienda.example/es-mx/productos/x',
  audience: 'members',
  ...over,
});

describe('storefrontSentence', () => {
  it('aparece: dice para quién está en línea', () => {
    expect(storefrontSentence(entry({ audience: 'members' }))).toBe(
      'Aparece en la tienda de México (solo distribuidores y clientes con sesión)',
    );
    expect(storefrontSentence(entry({ audience: 'public' }))).toBe('Aparece en la tienda de México (público y distribuidores)');
    expect(storefrontSentence(entry({ countryCode: 'US', audience: 'public' }))).toBe(
      'Aparece en la tienda de Estados Unidos (público y distribuidores)',
    );
  });

  it('agotado: sigue apareciendo, con el sufijo de audiencia', () => {
    expect(storefrontSentence(entry({ reasons: ['out_of_stock'], audience: 'members' }))).toBe(
      'Aparece en México como Agotado (solo distribuidores y clientes con sesión)',
    );
    expect(storefrontSentence(entry({ reasons: ['members_only', 'out_of_stock'], audience: 'members' }))).toBe(
      'Aparece en México como Agotado (solo distribuidores y clientes con sesión)',
    );
  });

  it('members_only es informativo: no se lista como razón de no aparecer', () => {
    expect(
      storefrontSentence(entry({ sellable: false, reasons: ['members_only', 'no_public_price'], countryCode: 'US' })),
    ).toBe('No aparece en Estados Unidos: no tiene precio público vigente');
  });

  it('not_online bloquea y se explica en claro, en el orden del API', () => {
    expect(storefrontSentence(entry({ sellable: false, reasons: ['not_online'], audience: 'none' }))).toBe(
      'No aparece en México: está marcado como "No se vende en línea"',
    );
    expect(storefrontSentence(entry({ sellable: false, reasons: ['inactive', 'not_online'], audience: 'none' }))).toBe(
      'No aparece en México: el producto está inactivo; está marcado como "No se vende en línea"',
    );
  });

  it('sin razones: frase corta; una razón nueva del API sale con su código, no se pierde', () => {
    expect(storefrontSentence(entry({ sellable: false }))).toBe('No aparece en México');
    expect(storefrontSentence(entry({ sellable: false, reasons: ['otra_razon'] }))).toBe('No aparece en México: otra_razon');
  });
});
