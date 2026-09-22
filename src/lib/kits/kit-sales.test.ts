import { describe, expect, it } from 'vitest';
import {
  CHANNEL_LABEL,
  normalizeKitSales,
  periodSentence,
  periodTitle,
  periodTotals,
  saleHref,
  saleStatusLabel,
  shortPeriodDate,
  topBranchesSentence,
  totalPaid,
} from './kit-sales';

const API_BODY = {
  productId: 'p-1',
  code: 'KPM06',
  name: 'Kit Premium 06',
  generatedAt: '2026-09-22T10:00:00.000Z',
  periods: [
    {
      periodId: 'per-74',
      periodNumber: 74,
      name: 'Septiembre 2026',
      startDate: '2026-08-26',
      endDate: '2026-09-25',
      isCurrent: true,
      isClosed: false,
      units: { paid: 77, cancelled: 1 },
      byChannel: { pos: 77, posMigrated: 0, web: 0 },
      topBranches: [
        { branchId: 'b-268', code: '268', name: 'Sucursal 268', units: 30 },
        { branchId: 'b-164', code: '164', name: 'Sucursal 164', units: 12 },
      ],
      lastSales: [
        { id: 's-1', folio: 'V-000123', at: '2026-09-21T15:00:00.000Z', branchCode: '268', status: 'completed', quantity: 1, channel: 'pos' },
        { id: 'o-1', folio: 'ORD-9', at: '2026-09-20T15:00:00.000Z', branchCode: null, status: 'cancelled', quantity: '2', channel: 'web' },
        { id: 'm-1', folio: 'M-77', at: '2026-09-19T15:00:00.000Z', branchCode: '164', status: 'completed', quantity: 1, channel: 'pos_migrated' },
      ],
    },
    {
      periodId: 'per-73',
      periodNumber: 73,
      name: 'Agosto 2026',
      startDate: '2026-07-26',
      endDate: '2026-08-25',
      isCurrent: false,
      isClosed: true,
      units: { paid: 40, cancelled: 0 },
      byChannel: { pos: 38, posMigrated: 2, web: 0 },
      topBranches: [],
      lastSales: [],
    },
  ],
};

describe('normalizeKitSales', () => {
  it('lee la forma real del API (KitSalesDto) y conserva las fechas tal cual', () => {
    const s = normalizeKitSales(API_BODY);
    expect(s?.periods).toHaveLength(2);
    const [current] = s!.periods;
    expect(current.startDate).toBe('2026-08-26');
    expect(current.endDate).toBe('2026-09-25');
    expect(current.units).toEqual({ paid: 77, cancelled: 1 });
    expect(current.byChannel).toEqual({ pos: 77, posMigrated: 0, web: 0 });
    expect(current.topBranches[0].units).toBe(30);
    expect(current.lastSales.map((l) => l.channel)).toEqual(['pos', 'web', 'pos_migrated']);
    expect(current.lastSales[1].quantity).toBe(2);
  });

  it('degrada cuerpos parciales y descarta renglones sin id', () => {
    const s = normalizeKitSales({ productId: 'p', periods: [{ name: 'X', lastSales: [{ folio: 'sin id' }, 'basura'], topBranches: [{}] }] });
    expect(s?.periods[0].units).toEqual({ paid: 0, cancelled: 0 });
    expect(s?.periods[0].lastSales).toEqual([]);
    expect(s?.periods[0].topBranches).toEqual([]);
    expect(normalizeKitSales({})).toBeNull();
    expect(normalizeKitSales(null)).toBeNull();
  });
});

describe('textos', () => {
  it('shortPeriodDate lee la cadena sin Date (sin desfase de zona)', () => {
    expect(shortPeriodDate('2026-08-26')).toBe('26-ago');
    expect(shortPeriodDate('2026-09-25')).toBe('25-sep');
    expect(shortPeriodDate('2026-12-26T00:00:00.000Z')).toBe('26-dic');
    expect(shortPeriodDate('sin fecha')).toBe('sin fecha');
  });

  it('periodTitle / periodTotals / periodSentence siguen el contrato', () => {
    const [current] = normalizeKitSales(API_BODY)!.periods;
    expect(periodTitle(current)).toBe('Septiembre 2026 (26-ago → 25-sep)');
    expect(periodTotals(current)).toBe('77 cobradas, 1 cancelada · POS 77 · Migradas 0 · En línea 0');
    expect(periodSentence(current)).toBe('Septiembre 2026 (26-ago → 25-sep): 77 cobradas, 1 cancelada · POS 77 · Migradas 0 · En línea 0');
    expect(periodTitle({ name: 'Sin fechas', startDate: '', endDate: '' })).toBe('Sin fechas');
  });

  it('topBranchesSentence, canal, estado y liga', () => {
    const [current] = normalizeKitSales(API_BODY)!.periods;
    expect(topBranchesSentence(current.topBranches)).toBe('Sucursal 268: 30 · Sucursal 164: 12');
    expect(topBranchesSentence([])).toBe('Sin ventas por sucursal.');
    expect(CHANNEL_LABEL.pos_migrated).toBe('Migrada');
    expect(saleStatusLabel('cancelled')).toBe('Cancelada');
    expect(saleStatusLabel('completed')).toBe('Cobrada');
    expect(saleHref({ id: 'o-1', channel: 'web' })).toBe('/admin/pedidos/o-1');
    expect(saleHref({ id: 's-1', channel: 'pos' })).toBe('/admin/pos');
    expect(totalPaid(normalizeKitSales(API_BODY)!.periods)).toBe(117);
  });
});
