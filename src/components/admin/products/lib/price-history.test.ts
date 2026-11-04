import { describe, expect, it } from 'vitest';
import type { ProductPriceHistoryEntry } from '@/types/product';
import { priceHistoryChanges, restorePayload, restoreSummary, shortDate } from './price-history';

const entry = (p: Partial<ProductPriceHistoryEntry> = {}): ProductPriceHistoryEntry => ({
  id: 'a1',
  at: '2026-11-04T01:38:10.303Z',
  action: 'UPDATE',
  userName: 'Diego',
  countryId: 'c-fn',
  countryCode: 'FN',
  countryName: 'Frontera MX-USA',
  priceTypeId: 'pt-d',
  priceTypeCode: 'distributor',
  priceTypeName: 'Precio Distribuidor',
  changedFields: ['price'],
  before: { price: 438, points: 378, businessValue: 378, effectiveFrom: '2026-08-05', effectiveTo: null, isActive: true, currencyCode: 'MXN' },
  after: { price: 416, points: 378, businessValue: 378, effectiveFrom: '2026-08-05', effectiveTo: null, isActive: true, currencyCode: 'MXN' },
  restorable: true,
  ...p,
});

describe('price-history (historial de precios de la ficha)', () => {
  it('describe solo lo que cambió, en pesos y con flecha', () => {
    expect(priceHistoryChanges(entry(), 'MXN')).toEqual(['Precio $438.00 → $416.00']);
    expect(
      priceHistoryChanges(
        entry({ after: { ...entry().after!, price: 416, points: 400, isActive: false, effectiveFrom: '2026-11-03' } }),
        'MXN',
      ),
    ).toEqual(['Precio $438.00 → $416.00', 'Puntos 378 → 400', 'Vigente desde 5 ago 2026 → 3 nov 2026', 'Desactivado']);
    expect(priceHistoryChanges(entry({ after: { ...entry().before! } }), 'MXN')).toEqual(['Sin cambio de importe']);
  });

  it('alta y baja', () => {
    expect(priceHistoryChanges(entry({ action: 'INSERT', before: null }), 'MXN')).toEqual([
      'Precio $416.00',
      'Puntos 378',
      'Valor negocio 378',
      'Vigente desde 5 ago 2026',
    ]);
    expect(priceHistoryChanges(entry({ action: 'DELETE', after: null }), 'MXN')).toEqual(['Tenía $438.00', 'Puntos 378', 'Valor negocio 378']);
  });

  it('restablecer manda los valores de antes y respeta restorable', () => {
    expect(restoreSummary(entry(), 'MXN')).toBe('Precio Distribuidor: $438.00 (puntos 378, valor negocio 378)');
    expect(restorePayload(entry(), 'MXN')).toEqual({
      priceTypeId: 'pt-d',
      countryId: 'c-fn',
      currencyCode: 'MXN',
      price: 438,
      points: 378,
      businessValue: 378,
    });
    expect(restorePayload(entry({ restorable: false }), 'MXN')).toBeNull();
    expect(restorePayload(entry({ before: null }), 'MXN')).toBeNull();
    expect(restorePayload(entry({ before: { ...entry().before!, currencyCode: null } }), 'USD')?.currencyCode).toBe('USD');
  });

  it('fecha corta sin desfase de zona horaria', () => {
    expect(shortDate('2026-08-05')).toBe('5 ago 2026');
    expect(shortDate(null)).toBe('—');
    expect(shortDate('x')).toBe('x');
  });
});
