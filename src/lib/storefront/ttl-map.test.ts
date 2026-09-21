import { describe, expect, it } from 'vitest';
import { BoundedTtlMap } from './ttl-map';

const NOW = 1_800_000_000_000;

describe('BoundedTtlMap', () => {
  it('devuelve el valor mientras está vigente y lo olvida al vencer', () => {
    const map = new BoundedTtlMap<number>(60_000, 10);
    map.set('a', 401, NOW);
    expect(map.get('a', NOW)).toBe(401);
    expect(map.get('a', NOW + 59_999)).toBe(401);
    expect(map.get('a', NOW + 60_000)).toBeUndefined();
    expect(map.size).toBe(0);
    expect(map.get('nunca', NOW)).toBeUndefined();
  });

  it('ttl por entrada', () => {
    const map = new BoundedTtlMap<string>(60_000, 10);
    map.set('a', 'x', NOW, 5_000);
    expect(map.get('a', NOW + 4_999)).toBe('x');
    expect(map.get('a', NOW + 5_000)).toBeUndefined();
  });

  it('tamaño acotado: al llenarse tira lo vencido y, si no alcanza, se vacía', () => {
    const map = new BoundedTtlMap<number>(60_000, 3);
    map.set('viejo', 1, NOW - 120_000);
    map.set('b', 2, NOW);
    map.set('c', 3, NOW);
    map.set('d', 4, NOW); // lleno: sale 'viejo' (vencido)
    expect(map.size).toBe(3);
    expect(map.get('b', NOW)).toBe(2);
    map.set('e', 5, NOW); // lleno y todo vigente: se vacía
    expect(map.size).toBe(1);
    expect(map.get('e', NOW)).toBe(5);
    for (let i = 0; i < 1000; i += 1) map.set(`k${i}`, i, NOW);
    expect(map.size).toBeLessThanOrEqual(3);
  });

  it('reescribir una clave existente no dispara la limpieza', () => {
    const map = new BoundedTtlMap<number>(60_000, 2);
    map.set('a', 1, NOW);
    map.set('b', 2, NOW);
    map.set('a', 9, NOW);
    expect(map.size).toBe(2);
    expect(map.get('a', NOW)).toBe(9);
    expect(map.get('b', NOW)).toBe(2);
  });
});
