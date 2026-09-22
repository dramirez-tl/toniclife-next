import { describe, expect, it } from 'vitest';
import {
  READINESS_SECTION,
  kitPositionLabel,
  normalizeKitReadiness,
  notReadyCritical,
  readinessChecklist,
  readinessSummary,
  recipeLockSentence,
} from './kit-readiness';

const API_BODY = {
  productId: 'p-1',
  code: 'KPM05',
  name: 'Kit Premium',
  productType: 'kit',
  isActive: false,
  isEnrollmentKit: true,
  kitPosition: 'premium',
  stockMode: 'assemble_on_sale',
  critical: [{ code: 'recipe_empty', severity: 'critical', label: 'Se arma al vender pero no tiene receta' }],
  warnings: [
    { code: 'no_bonus', severity: 'warning', label: 'Sin bono de inscripción vigente en FN', details: { countries: ['FN'] } },
    { code: 'own_stock_phantom', severity: 'warning', label: 'Tiene 20 piezas propias en 69 sucursales que ninguna venta usa' },
  ],
  canActivate: false,
  recipeLock: { pendingSales: 2, pendingOrders: 1, locked: true },
  ownStock: { rows: 69, units: 1380, reserved: 0 },
  generatedAt: '2026-09-22T10:00:00.000Z',
};

describe('normalizeKitReadiness', () => {
  it('lee la forma real del API (KitReadinessDto)', () => {
    const r = normalizeKitReadiness(API_BODY);
    expect(r).not.toBeNull();
    expect(r?.stockMode).toBe('assemble_on_sale');
    expect(r?.critical).toHaveLength(1);
    expect(r?.warnings.map((w) => w.code)).toEqual(['no_bonus', 'own_stock_phantom']);
    expect(r?.warnings[0].details).toEqual({ countries: ['FN'] });
    expect(r?.recipeLock).toEqual({ pendingSales: 2, pendingOrders: 1, locked: true });
    expect(r?.ownStock).toEqual({ rows: 69, units: 1380, reserved: 0 });
    expect(r?.canActivate).toBe(false);
  });

  it('degrada cuerpos parciales sin lanzar (canActivate y locked derivados)', () => {
    const r = normalizeKitReadiness({ productId: 'p-2', critical: [], recipeLock: { pendingSales: '1' }, ownStock: null });
    expect(r?.canActivate).toBe(true);
    expect(r?.recipeLock).toEqual({ pendingSales: 1, pendingOrders: 0, locked: true });
    expect(r?.ownStock).toEqual({ rows: 0, units: 0, reserved: 0 });
    expect(r?.stockMode).toBeNull();
    expect(r?.kitPosition).toBeNull();
  });

  it('devuelve null sin productId o con basura', () => {
    expect(normalizeKitReadiness(null)).toBeNull();
    expect(normalizeKitReadiness('x')).toBeNull();
    expect(normalizeKitReadiness({ code: 'KPM05' })).toBeNull();
  });

  it('descarta renglones sin código', () => {
    const r = normalizeKitReadiness({ productId: 'p', critical: [{ label: 'sin código' }, 'x'], warnings: [{ code: 'no_image' }] });
    expect(r?.critical).toEqual([]);
    expect(r?.warnings[0]).toEqual({ code: 'no_image', severity: 'warning', label: 'no_image', details: null });
  });
});

describe('readinessChecklist', () => {
  it('mezcla ✔ derivados con ✘ y ⚠ del API en el orden del contrato', () => {
    const r = normalizeKitReadiness(API_BODY)!;
    const lines = readinessChecklist(r);
    expect(lines.map((l) => `${l.state}:${l.code}`)).toEqual([
      'ok:distributor_price',
      'critical:recipe_empty',
      'ok:position',
      'warning:no_bonus',
      'warning:own_stock_phantom',
    ]);
    expect(lines[2].label).toBe('Posición Premium');
  });

  it('un prearmado no necesita receta y un paquete no tiene posición', () => {
    const r = normalizeKitReadiness({ ...API_BODY, productType: 'pack', isEnrollmentKit: false, stockMode: 'prebuilt', critical: [] })!;
    const lines = readinessChecklist(r);
    expect(lines.map((l) => l.code)).toEqual(['distributor_price', 'recipe', 'no_bonus', 'own_stock_phantom']);
    expect(lines[1].label).toContain('Prearmado');
  });

  it('un crítico desconocido del API no se pierde', () => {
    const r = normalizeKitReadiness({ ...API_BODY, critical: [{ code: 'nueva_regla', label: 'Regla nueva' }] })!;
    expect(readinessChecklist(r).some((l) => l.code === 'nueva_regla' && l.state === 'critical')).toBe(true);
  });
});

describe('textos', () => {
  it('readinessSummary distingue listo / no se puede activar', () => {
    const r = normalizeKitReadiness(API_BODY)!;
    expect(readinessSummary(r)).toBe('No se puede activar: se arma al vender pero no tiene receta.');
    expect(readinessSummary({ ...r, critical: [] })).toBe('Listo para activar');
    expect(readinessSummary({ ...r, critical: [], isActive: true })).toBe('Listo para vender');
  });

  it('recipeLockSentence suma ventas y pedidos y calla en cero', () => {
    expect(recipeLockSentence({ pendingSales: 2, pendingOrders: 1 })).toBe('Hay 3 ventas/pedidos sin cobrar con este kit.');
    expect(recipeLockSentence({ pendingSales: 1, pendingOrders: 0 })).toBe('Hay 1 venta o pedido sin cobrar con este kit.');
    expect(recipeLockSentence({ pendingSales: 0, pendingOrders: 0 })).toBeNull();
  });

  it('kitPositionLabel usa los valores reales de kit_position', () => {
    expect(kitPositionLabel('basic')).toBe('Básico');
    expect(kitPositionLabel('premium')).toBe('Premium');
    expect(kitPositionLabel('preferred')).toBe('Preferente');
    expect(kitPositionLabel(null)).toBe('Sin posición');
  });

  it('notReadyCritical lee details.critical del 422 KIT_NOT_READY', () => {
    expect(notReadyCritical({ critical: [{ code: 'recipe_empty', label: 'Sin receta' }, { code: 'x' }, 'basura'] })).toEqual([
      { code: 'recipe_empty', label: 'Sin receta' },
      { code: 'x', label: 'x' },
    ]);
    expect(notReadyCritical(null)).toEqual([]);
  });

  it('cada regla del API apunta a una sección de la ficha', () => {
    for (const code of [
      'no_distributor_price',
      'recipe_empty',
      'position_missing',
      'public_below_distributor',
      'points_mismatch',
      'no_bonus',
      'bonus_too_low',
      'prebuilt_no_kardex',
      'own_stock_phantom',
      'no_image',
      'no_sat_code',
      'no_tax_rule',
      'no_category',
    ]) {
      expect(READINESS_SECTION[code], code).toBeTruthy();
    }
  });
});
