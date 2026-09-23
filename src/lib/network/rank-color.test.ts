import { describe, expect, it } from 'vitest';
import { RANK_NONE_CLASS, initialsOf, rankColorByNumber } from './rank-color';

describe('rankColorByNumber', () => {
  it('cada rango 1..10 tiene su tono y son distintos entre sí', () => {
    const tones = Array.from({ length: 10 }, (_, i) => rankColorByNumber(i + 1));
    expect(new Set(tones).size).toBe(10);
    for (const tone of tones) {
      expect(tone).toMatch(/^bg-[a-z]+-\d+ text-[a-z]+-\d+$/);
      expect(tone).not.toBe(RANK_NONE_CLASS);
    }
  });

  it('sin rango, 0, negativo, decimal o fuera de tabla ⇒ tono neutro', () => {
    expect(rankColorByNumber(null)).toBe(RANK_NONE_CLASS);
    expect(rankColorByNumber(undefined)).toBe(RANK_NONE_CLASS);
    expect(rankColorByNumber(0)).toBe(RANK_NONE_CLASS);
    expect(rankColorByNumber(-1)).toBe(RANK_NONE_CLASS);
    expect(rankColorByNumber(2.5)).toBe(RANK_NONE_CLASS);
    expect(rankColorByNumber(11)).toBe(RANK_NONE_CLASS);
    expect(rankColorByNumber(Number.NaN)).toBe(RANK_NONE_CLASS);
  });
});

describe('initialsOf', () => {
  it('toma las dos primeras palabras en mayúsculas', () => {
    expect(initialsOf('Ana María López')).toBe('AM');
    expect(initialsOf('  juan  pérez ')).toBe('JP');
    expect(initialsOf('Sol')).toBe('S');
  });

  it('vacío o nulo ⇒ "?"', () => {
    expect(initialsOf('')).toBe('?');
    expect(initialsOf('   ')).toBe('?');
    expect(initialsOf(null)).toBe('?');
    expect(initialsOf(undefined)).toBe('?');
  });
});
