import { describe, expect, it } from 'vitest';
import {
  PERSONALIZATION_HARD_MAX,
  clampPersonalization,
  normalizePersonalization,
  personalizationLength,
  personalizationLimit,
  personalizationOf,
  samePersonalization,
} from './personalization';

describe('normalizePersonalization (misma limpieza que el API)', () => {
  it('recorta, colapsa espacios y quita saltos de línea y tabuladores', () => {
    expect(normalizePersonalization('  Ana   María ')).toBe('Ana María');
    expect(normalizePersonalization('Ana\nMaría\t\r\nLópez')).toBe('Ana María López');
  });

  it('vacío o no texto = null', () => {
    expect(normalizePersonalization('')).toBeNull();
    expect(normalizePersonalization('   \n ')).toBeNull();
    expect(normalizePersonalization(null)).toBeNull();
    expect(normalizePersonalization(undefined)).toBeNull();
    expect(normalizePersonalization(42)).toBeNull();
  });
});

describe('personalizationLength (caracteres visibles, no bytes ni UTF-16)', () => {
  it('un emoji cuenta uno; un acento compuesto cuenta uno', () => {
    expect(personalizationLength('Ana')).toBe(3);
    expect(personalizationLength('😀')).toBe(1);
    expect('😀'.length).toBe(2); // unidades UTF-16: lo que NO se cuenta
    expect(personalizationLength('é')).toBe(1); // e + acento combinante = é
    expect(personalizationLength('')).toBe(0);
  });
});

describe('clampPersonalization', () => {
  it('recorta por caracteres visibles sin partir un emoji', () => {
    expect(clampPersonalization('Ana María', 3)).toBe('Ana');
    expect(clampPersonalization('😀😀😀', 2)).toBe('😀😀');
    expect(clampPersonalization('Ana', 10)).toBe('Ana');
    expect(clampPersonalization('Ana', 0)).toBe('');
  });

  it('sin tope válido no recorta', () => {
    expect(clampPersonalization('Ana', Number.NaN)).toBe('Ana');
    expect(clampPersonalization('Ana', -1)).toBe('Ana');
  });
});

describe('personalizationLimit (tope del producto)', () => {
  it('entero 1..60; se trunca y se topa al máximo de la columna', () => {
    expect(personalizationLimit(20)).toBe(20);
    expect(personalizationLimit('15')).toBe(15);
    expect(personalizationLimit(12.9)).toBe(12);
    expect(personalizationLimit(999)).toBe(PERSONALIZATION_HARD_MAX);
  });

  it('0, negativo, null, basura = el producto no se personaliza', () => {
    for (const junk of [0, -5, null, undefined, '', 'veinte', Number.NaN, {}]) {
      expect(personalizationLimit(junk)).toBeNull();
    }
  });
});

describe('personalizationOf / samePersonalization (líneas del API)', () => {
  it('lee y limpia el texto de la línea; sin texto o sin objeto = null', () => {
    expect(personalizationOf({ personalization: ' Ana ' })).toBe('Ana');
    expect(personalizationOf({ personalization: '' })).toBeNull();
    expect(personalizationOf({ personalization: null })).toBeNull();
    expect(personalizationOf({})).toBeNull();
    expect(personalizationOf(null)).toBeNull();
    expect(personalizationOf('Ana')).toBeNull();
  });

  it('misma línea = mismo texto limpio; vacío, null y ausente son lo mismo', () => {
    expect(samePersonalization('Ana', ' Ana  ')).toBe(true);
    expect(samePersonalization('Ana', 'ana')).toBe(false);
    expect(samePersonalization(null, '')).toBe(true);
    expect(samePersonalization(undefined, '   ')).toBe(true);
    expect(samePersonalization('Ana', null)).toBe(false);
  });
});
