import { describe, expect, it } from 'vitest';
import {
  LEGACY_CHECKER_CODE_MAX,
  isValidLegacyCheckerCode,
  legacyCodeClashNotice,
  legacyCodeNoiClash,
  normalizeLegacyCheckerCode,
} from './legacy-checker-code';

const emp = (id: string, noiNumber: string | null, isActive = true) => ({
  id,
  employeeNumber: noiNumber ? `NOI-${noiNumber}` : `EXT-${id}`,
  noiNumber,
  isActive,
});

describe('normalizeLegacyCheckerCode', () => {
  it('recorta y pasa a mayúsculas, como lo guarda el API', () => {
    expect(normalizeLegacyCheckerCode('  ab-77 ')).toBe('AB-77');
    expect(normalizeLegacyCheckerCode(null)).toBe('');
    expect(normalizeLegacyCheckerCode(undefined)).toBe('');
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

describe('legacyCodeNoiClash', () => {
  const list = [emp('a', '436'), emp('b', '900'), emp('c', null), emp('d', '77', false)];

  it('avisa cuando el código es el número de nómina de OTRO colaborador activo', () => {
    expect(legacyCodeNoiClash('436', list, 'b')?.id).toBe('a');
    expect(legacyCodeNoiClash(' 436 ', list, null)?.id).toBe('a');
  });

  it('no avisa si el número de nómina es el suyo', () => {
    expect(legacyCodeNoiClash('436', list, 'a')).toBeNull();
  });

  it('no avisa por parecidos: la búsqueda del listado trae coincidencias parciales', () => {
    expect(legacyCodeNoiClash('43', list, 'b')).toBeNull();
    expect(legacyCodeNoiClash('4360', list, 'b')).toBeNull();
  });

  it('los inactivos no cuentan (el checador solo busca entre activos) ni el campo vacío', () => {
    expect(legacyCodeNoiClash('77', list, 'b')).toBeNull();
    expect(legacyCodeNoiClash('', list, 'b')).toBeNull();
  });
});

describe('legacyCodeClashNotice', () => {
  it('dice con quién choca, qué pasará en el checador y cómo confirmarlo', () => {
    const q = legacyCodeClashNotice(' ab-77 ', 'NOI-436');
    expect(q).toContain('El código AB-77 ');
    expect(q).toContain('(NOI-436)');
    expect(q).toContain('número de empleado completo');
    expect(q.endsWith('toca Guardar otra vez.')).toBe(true);
  });
});
