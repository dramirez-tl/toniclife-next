import { describe, expect, it } from 'vitest';
import {
  BRANCH_SCOPED_ROLE_CODES,
  checkedBranchesLabel,
  filterBranchChoices,
  isBranchScopedRoleCode,
} from './branch-scope';

const BRANCHES = [
  { id: 'a', code: '102', name: 'Acapulco Oviedo TL' },
  { id: 'b', code: '427', name: 'MX ACAPULCO DIAMANTE TL' },
  { id: 'c', code: '119', name: 'Queretaro TL' },
  { id: 'd', code: '341', name: 'Cuautitlan TL' },
  { id: 'e', code: '428', name: 'MX INDIOS VERDES TL' },
  { id: 'f', code: null, name: 'Almacén De Pruebas' },
];
const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

describe('roles acotados por sucursal', () => {
  it('Supervisión de zona es uno de ellos (el formulario muestra sus sucursales)', () => {
    expect(BRANCH_SCOPED_ROLE_CODES).toContain('supervisor_zona');
    expect(isBranchScopedRoleCode('supervisor_zona')).toBe(true);
    expect(isBranchScopedRoleCode('viaticos')).toBe(false);
    expect(isBranchScopedRoleCode(undefined)).toBe(false);
  });
});

describe('buscador de "Sucursales que puede ver"', () => {
  it('sin texto salen todas, en su orden', () => {
    expect(ids(filterBranchChoices(BRANCHES, ''))).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(ids(filterBranchChoices(BRANCHES, '   '))).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('encuentra por nombre sin importar mayúsculas ni acentos', () => {
    expect(ids(filterBranchChoices(BRANCHES, 'acapulco'))).toEqual(['a', 'b']);
    expect(ids(filterBranchChoices(BRANCHES, 'QUERÉTARO'))).toEqual(['c']);
    expect(ids(filterBranchChoices(BRANCHES, 'cuautitlán'))).toEqual(['d']);
    expect(ids(filterBranchChoices(BRANCHES, 'almacen'))).toEqual(['f']);
  });

  it('encuentra por número de sucursal', () => {
    expect(ids(filterBranchChoices(BRANCHES, '428'))).toEqual(['e']);
    expect(ids(filterBranchChoices(BRANCHES, '42'))).toEqual(['b', 'e']);
  });

  it('con varias palabras deben estar todas, en cualquier orden', () => {
    expect(ids(filterBranchChoices(BRANCHES, 'diamante acapulco'))).toEqual(['b']);
    expect(ids(filterBranchChoices(BRANCHES, 'indios 428'))).toEqual(['e']);
    expect(ids(filterBranchChoices(BRANCHES, 'acapulco toluca'))).toEqual([]);
  });

  it('"ver solo las marcadas" se combina con el texto', () => {
    expect(ids(filterBranchChoices(BRANCHES, '', ['b', 'c']))).toEqual(['b', 'c']);
    expect(ids(filterBranchChoices(BRANCHES, 'acapulco', ['b', 'c']))).toEqual(['b']);
    expect(ids(filterBranchChoices(BRANCHES, '', []))).toEqual([]);
    expect(ids(filterBranchChoices(BRANCHES, 'acapulco', null))).toEqual(['a', 'b']);
  });

  it('no cambia la lista original', () => {
    const copy = [...BRANCHES];
    filterBranchChoices(BRANCHES, 'tl', ['a']);
    expect(BRANCHES).toEqual(copy);
  });
});

describe('contador de marcadas', () => {
  it('singular, plural y ninguna', () => {
    expect(checkedBranchesLabel(0)).toBe('Ninguna marcada');
    expect(checkedBranchesLabel(1)).toBe('1 marcada');
    expect(checkedBranchesLabel(11)).toBe('11 marcadas');
  });
});
