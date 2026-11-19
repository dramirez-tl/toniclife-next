import { describe, expect, it } from 'vitest';
import {
  LEGACY_CHECKER_CODE_MAX,
  isValidLegacyCheckerCode,
  normalizeLegacyCheckerCode,
} from './legacy-checker-code';

describe('normalizeLegacyCheckerCode', () => {
  it('recorta y pasa a mayúsculas, como lo guarda el API', () => {
    expect(normalizeLegacyCheckerCode('  ab-77 ')).toBe('AB-77');
    expect(normalizeLegacyCheckerCode(null)).toBe('');
    expect(normalizeLegacyCheckerCode(undefined)).toBe('');
  });

  it('un código que solo cambia de mayúsculas o espacios es el mismo (no se vuelve a mandar)', () => {
    expect(normalizeLegacyCheckerCode(' ab-77')).toBe(normalizeLegacyCheckerCode('AB-77 '));
  });
});

describe('isValidLegacyCheckerCode', () => {
  it('letras, dígitos, punto y guiones; sin espacios ni símbolos', () => {
    for (const ok of ['1042', '00017', 'AB-77', 'A.B_C-1']) {
      expect(isValidLegacyCheckerCode(ok)).toBe(true);
    }
    for (const bad of ['10 42', 'MUÑOZ', '10/42', '#12', '']) {
      expect(isValidLegacyCheckerCode(bad)).toBe(false);
    }
    expect(isValidLegacyCheckerCode('9'.repeat(LEGACY_CHECKER_CODE_MAX))).toBe(true);
    expect(isValidLegacyCheckerCode('9'.repeat(LEGACY_CHECKER_CODE_MAX + 1))).toBe(false);
  });
});
