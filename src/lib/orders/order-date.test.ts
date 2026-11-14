import { describe, expect, it } from 'vitest';
import { parseBusinessDate, parseOrderDate } from './order-date';

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

describe('orders/order-date · fecha de negocio del pedido (Admin › Pedidos)', () => {
  const parts = (date: Date | null) => (date ? [date.getFullYear(), date.getMonth() + 1, date.getDate()] : null);

  it('como la serializa el API (medianoche UTC) sigue siendo ESE día, no las 18:00 del anterior', () => {
    // Caso real (14-nov-2026): pedido hecho el 13 a las 11:23; la pantalla decía "12 nov, 06:00 p.m.".
    const date = parseBusinessDate('2026-11-13T00:00:00.000Z');
    expect(parts(date)).toEqual([2026, 11, 13]);
    expect([date!.getHours(), date!.getMinutes()]).toEqual([0, 0]);
    expect(date!.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })).toMatch(/^13 /);
  });

  it('sin hora también es ese día', () => {
    expect(parts(parseBusinessDate('2026-11-13'))).toEqual([2026, 11, 13]);
    expect(parts(parseBusinessDate(' 2026-10-31 '))).toEqual([2026, 10, 31]);
    expect(parts(parseBusinessDate('2027-01-01T00:00:00.000Z'))).toEqual([2027, 1, 1]);
  });

  it('vacío, ilegible o una fecha que no existe: null', () => {
    expect(parseBusinessDate(null)).toBeNull();
    expect(parseBusinessDate(undefined)).toBeNull();
    expect(parseBusinessDate('')).toBeNull();
    expect(parseBusinessDate('no es fecha')).toBeNull();
    expect(parseBusinessDate('2026-02-31')).toBeNull();
    expect(parseBusinessDate('2026-13-01T00:00:00.000Z')).toBeNull();
    expect(parseBusinessDate('13/11/2026')).toBeNull();
  });
});
