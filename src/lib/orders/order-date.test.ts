import { describe, expect, it } from 'vitest';
import { parseOrderDate } from './order-date';

describe('orders/order-date · fechas de Mis pedidos', () => {
  it('la fecha de negocio sin hora es ESE día (no la medianoche UTC, que en México es el día anterior)', () => {
    const date = parseOrderDate('2026-11-11');
    expect(date).not.toBeNull();
    expect([date!.getFullYear(), date!.getMonth() + 1, date!.getDate()]).toEqual([2026, 11, 11]);
    expect(date!.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })).toMatch(/^11 /);
  });

  it('fin de mes y de año no se recorren', () => {
    const lastDay = parseOrderDate('2026-10-31')!;
    expect([lastDay.getMonth() + 1, lastDay.getDate()]).toEqual([10, 31]);
    const newYear = parseOrderDate('2027-01-01')!;
    expect([newYear.getFullYear(), newYear.getMonth() + 1, newYear.getDate()]).toEqual([2027, 1, 1]);
  });

  it('un instante con hora y zona se lee como instante', () => {
    expect(parseOrderDate('2026-11-12T16:00:00.000Z')?.toISOString()).toBe('2026-11-12T16:00:00.000Z');
  });

  it('vacío o ilegible: null', () => {
    expect(parseOrderDate(null)).toBeNull();
    expect(parseOrderDate(undefined)).toBeNull();
    expect(parseOrderDate('  ')).toBeNull();
    expect(parseOrderDate('no es fecha')).toBeNull();
  });
});
