import { describe, expect, it } from 'vitest';
import type { ShippingSettings } from '@/services/config.service';
import {
  DEFAULT_SHIPPING_FORM,
  buildShippingPayload,
  freeShippingEffect,
  isShippingFormDirty,
  shippingCostsOrigin,
  shippingFlagsSupported,
  shippingFormValues,
  zoneShippingNote,
} from './shipping-costs';

const settings = (over: Partial<ShippingSettings> = {}): ShippingSettings => ({
  standardCost: 150,
  expressCost: 250,
  freeThreshold: 1500,
  kitCost: 150,
  freeShippingEnabled: true,
  freeShippingForDistributors: false,
  ...over,
});

describe('store-country/shipping-costs · formulario', () => {
  it('pasa los ajustes del API a los campos del formulario', () => {
    expect(shippingFormValues(settings({ standardCost: 12, expressCost: 25, freeThreshold: 100, kitCost: 12 }))).toEqual({
      standardShippingCost: 12,
      expressShippingCost: 25,
      freeShippingThreshold: 100,
      kitShippingCost: 12,
      freeShippingEnabled: true,
      freeShippingForDistributors: false,
    });
    expect(shippingFormValues(settings())).toEqual(DEFAULT_SHIPPING_FORM);
  });

  it('un API anterior a los interruptores vale lo de siempre y no los manda al guardar', () => {
    const old: ShippingSettings = { standardCost: 150, expressCost: 250, freeThreshold: 1500, kitCost: 150 };
    expect(shippingFormValues(old).freeShippingEnabled).toBe(true);
    expect(shippingFormValues(old).freeShippingForDistributors).toBe(false);
    expect(shippingFlagsSupported(old)).toBe(false);
    expect(shippingFlagsSupported(settings())).toBe(true);
    // Mientras carga se da por hecho que sí.
    expect(shippingFlagsSupported(undefined)).toBe(true);

    const values = { ...DEFAULT_SHIPPING_FORM, standardShippingCost: 180, freeShippingEnabled: false };
    expect(buildShippingPayload(values, false)).toEqual({
      standardCost: 180,
      expressCost: 250,
      freeThreshold: 1500,
      kitCost: 150,
    });
    expect(buildShippingPayload(values, true)).toEqual({
      standardCost: 180,
      expressCost: 250,
      freeThreshold: 1500,
      kitCost: 150,
      freeShippingEnabled: false,
      freeShippingForDistributors: false,
    });
  });

  it('el cuerpo del guardado nunca lleva lo que solo viene en la lectura', () => {
    const payload = buildShippingPayload(shippingFormValues(settings({ hasOwnSettings: false, inheritedFrom: 'MX' })), true);
    expect(Object.keys(payload).sort()).toEqual([
      'expressCost',
      'freeShippingEnabled',
      'freeShippingForDistributors',
      'freeThreshold',
      'kitCost',
      'standardCost',
    ]);
  });

  it('sabe si hay cambios sin guardar', () => {
    const saved = settings();
    expect(isShippingFormDirty(shippingFormValues(saved), saved)).toBe(false);
    expect(isShippingFormDirty({ ...shippingFormValues(saved), kitShippingCost: 0 }, saved)).toBe(true);
    expect(isShippingFormDirty({ ...shippingFormValues(saved), freeShippingForDistributors: true }, saved)).toBe(true);
    // Sin ajustes cargados no hay con qué comparar.
    expect(isShippingFormDirty(DEFAULT_SHIPPING_FORM, undefined)).toBe(false);
    // Con un API sin interruptores, moverlos no cuenta (no se guardarían).
    const old: ShippingSettings = { standardCost: 150, expressCost: 250, freeThreshold: 1500, kitCost: 150 };
    expect(isShippingFormDirty({ ...shippingFormValues(old), freeShippingEnabled: false }, old)).toBe(false);
  });

  it('dice en llano qué pasa con el envío estándar', () => {
    expect(freeShippingEffect(false, false, 1500, '$1,500.00')).toBe('Todas las compras pagan envío estándar, sin importar el monto.');
    expect(freeShippingEffect(true, false, 1500, '$1,500.00')).toBe(
      'Los clientes que no son distribuidores no pagan envío estándar en compras de $1,500.00 o más. Los distribuidores lo pagan siempre.',
    );
    expect(freeShippingEffect(true, true, 1500, '$1,500.00')).toBe(
      'Nadie paga envío estándar en compras de $1,500.00 o más: ni clientes ni distribuidores.',
    );
    expect(freeShippingEffect(true, true, 0, '$0.00')).toContain('gratis en todas las compras');
    expect(freeShippingEffect(true, false, 0, '$0.00')).toContain('Los distribuidores lo pagan siempre.');
  });
});

describe('store-country/shipping-costs · de dónde salen los montos', () => {
  it('con montos capturados son propios', () => {
    expect(shippingCostsOrigin({ countryCode: 'MX', settings: settings({ hasOwnSettings: true, inheritedFrom: null }) })).toEqual({
      kind: 'own',
    });
    // API anterior (sin hasOwnSettings): lo dice el diagnóstico.
    expect(shippingCostsOrigin({ countryCode: 'US', settings: settings(), diagnosticsSource: 'settings' })).toEqual({ kind: 'own' });
  });

  it('Frontera hereda de México mientras no tenga los suyos', () => {
    expect(
      shippingCostsOrigin({ countryCode: 'FN', settings: settings({ hasOwnSettings: false, inheritedFrom: 'MX' }) }),
    ).toEqual({ kind: 'inherited', from: 'MX' });
    // Sin poder leer sus ajustes (403) pero con el diagnóstico: una zona que cae en México, hereda.
    expect(shippingCostsOrigin({ countryCode: 'FN', diagnosticsSource: 'defaults_mx' })).toEqual({ kind: 'inherited', from: 'MX' });
    expect(shippingCostsOrigin({ countryCode: 'FN', diagnosticsSource: 'settings' })).toEqual({ kind: 'own' });
  });

  it('México y Estados Unidos sin capturar usan SUS montos de fábrica: aviso suave', () => {
    expect(
      shippingCostsOrigin({
        countryCode: 'US',
        settings: settings({ standardCost: 12, expressCost: 25, freeThreshold: 100, kitCost: 12, hasOwnSettings: false, inheritedFrom: null }),
        diagnosticsSource: 'defaults_country',
      }),
    ).toEqual({ kind: 'defaults', mexicoAmounts: false });
    expect(
      shippingCostsOrigin({ countryCode: 'MX', settings: settings({ hasOwnSettings: false, inheritedFrom: null }), diagnosticsSource: 'defaults_country' }),
    ).toEqual({ kind: 'defaults', mexicoAmounts: false });
    // México nunca "cae en los montos de México en otra moneda".
    expect(shippingCostsOrigin({ countryCode: 'MX', settings: settings({ hasOwnSettings: false }) })).toEqual({
      kind: 'defaults',
      mexicoAmounts: false,
    });
  });

  it('Colombia y Guatemala sin capturar cobrarían los montos de México en su moneda', () => {
    const co = settings({ hasOwnSettings: false, inheritedFrom: null });
    expect(shippingCostsOrigin({ countryCode: 'CO', settings: co, diagnosticsSource: 'defaults_mx' })).toEqual({
      kind: 'defaults',
      mexicoAmounts: true,
    });
    // Sin diagnóstico, los números de fábrica de México lo delatan.
    expect(shippingCostsOrigin({ countryCode: 'GT', settings: co })).toEqual({ kind: 'defaults', mexicoAmounts: true });
    // Estados Unidos sin diagnóstico: sus montos no son los de México.
    expect(
      shippingCostsOrigin({
        countryCode: 'US',
        settings: settings({ standardCost: 12, expressCost: 25, freeThreshold: 100, kitCost: 12, hasOwnSettings: false }),
      }),
    ).toEqual({ kind: 'defaults', mexicoAmounts: false });
    // API anterior: solo el diagnóstico.
    expect(shippingCostsOrigin({ countryCode: 'CO', diagnosticsSource: 'defaults_mx' })).toEqual({ kind: 'defaults', mexicoAmounts: true });
  });

  it('sin ninguna de las dos fuentes no se sabe', () => {
    expect(shippingCostsOrigin({ countryCode: 'CO' })).toEqual({ kind: 'unknown' });
    expect(shippingCostsOrigin({ countryCode: 'CO', settings: settings(), diagnosticsSource: null })).toEqual({ kind: 'unknown' });
  });

  it('dice qué pasa con Frontera junto a los costos de México', () => {
    expect(zoneShippingNote('Frontera', 'México', { kind: 'inherited', from: 'MX' })).toBe(
      'Frontera usa estos mismos costos y las mismas reglas de envío gratis, salvo que tenga los suyos. Hoy no los tiene: cobra lo mismo que México.',
    );
    expect(zoneShippingNote('Frontera', 'México', { kind: 'unknown' })).toBe(
      'Frontera usa estos mismos costos y las mismas reglas de envío gratis, salvo que tenga los suyos.',
    );
    expect(zoneShippingNote('Frontera', 'México', { kind: 'own' })).toContain('tiene sus propios costos de envío');
  });
});
