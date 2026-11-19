import { describe, expect, it } from 'vitest';

import {
  BRANCH_MODE_OPTIONS,
  addBranchIds,
  branchIdsForPayload,
  branchScopeHint,
  branchScopeSummary,
  eligibleBranchOptions,
  filterBranchOptions,
  groupBranchOptions,
  promotionCountryIds,
  pruneBranchIdsByCountry,
  removeBranchIds,
  unavailableSelectedBranches,
  validatePromotionBranches,
} from './seasonal-promotion-branches';

const MX = { id: 'c-mx', code: 'MX', name: 'Mexico' };
const FN = { id: 'c-fn', code: 'FN', name: 'Frontera MX-USA' };
const US = { id: 'c-us', code: 'US', name: 'Estados Unidos' };
const SEASON = [MX, FN];

const BRANCHES = [
  { id: 'b-254', code: '254', name: 'Irapuato Álvaro Obregón TL', countryId: 'c-mx' },
  { id: 'b-125', code: '125', name: 'Tijuana TL', countryId: 'c-fn' },
  { id: 'b-90', code: '90', name: 'Xalapa TL', countryId: 'c-mx' },
  { id: 'b-205', code: '205', name: 'USA Tulsa Almacen TL', countryId: 'c-us' },
  { id: 'b-164', code: '164', name: 'Irapuato Call Center/Almacen General TL', countryId: 'c-mx' },
  { id: 'b-x', code: '999', name: 'Sin país', countryId: null },
];

describe('sucursales de una promoción de temporada', () => {
  it('ofrece "Todas las sucursales" y "Solo algunas"', () => {
    expect(BRANCH_MODE_OPTIONS).toEqual([
      { value: 'all', label: 'Todas las sucursales' },
      { value: 'some', label: 'Solo algunas' },
    ]);
  });

  it('los países de la promoción son los suyos o, sin restringir, los de la temporada', () => {
    expect(promotionCountryIds(SEASON, [])).toEqual(['c-mx', 'c-fn']);
    expect(promotionCountryIds(SEASON, ['c-fn'])).toEqual(['c-fn']);
    // Un país que no es de la temporada no cuenta.
    expect(promotionCountryIds(SEASON, ['c-us'])).toEqual(['c-mx', 'c-fn']);
  });

  it('se pueden elegir las sucursales de esos países, por país y por clave (numérica)', () => {
    const options = eligibleBranchOptions(BRANCHES, SEASON, []);
    expect(options.map((o) => `${o.countryCode} ${o.code}`)).toEqual(['MX 90', 'MX 164', 'MX 254', 'FN 125']);
    expect(options[0]).toEqual({
      id: 'b-90',
      code: '90',
      name: 'Xalapa TL',
      countryId: 'c-mx',
      countryCode: 'MX',
      countryName: 'Mexico',
    });
  });

  it('con países propios solo se ofrecen las sucursales de esos países', () => {
    expect(eligibleBranchOptions(BRANCHES, SEASON, ['c-fn']).map((o) => o.code)).toEqual(['125']);
    expect(eligibleBranchOptions(BRANCHES, [MX, FN, US], ['c-us']).map((o) => o.code)).toEqual(['205']);
  });

  it('busca por clave o por nombre, sin importar acentos ni mayúsculas', () => {
    const options = eligibleBranchOptions(BRANCHES, SEASON, []);
    expect(filterBranchOptions(options, 'alvaro').map((o) => o.code)).toEqual(['254']);
    expect(filterBranchOptions(options, 'IRAPUATO').map((o) => o.code)).toEqual(['164', '254']);
    expect(filterBranchOptions(options, '125').map((o) => o.code)).toEqual(['125']);
    expect(filterBranchOptions(options, '  ').length).toBe(4);
    expect(filterBranchOptions(options, 'tulsa')).toEqual([]);
  });

  it('agrupa por país en el orden de la temporada', () => {
    const groups = groupBranchOptions(eligibleBranchOptions(BRANCHES, SEASON, []));
    expect(groups.map((g) => [g.countryCode, g.options.map((o) => o.code)])).toEqual([
      ['MX', ['90', '164', '254']],
      ['FN', ['125']],
    ]);
  });

  it('marcar y quitar varias a la vez no repite ni desordena', () => {
    expect(addBranchIds(['b-254'], ['b-90', 'b-254', 'b-164'])).toEqual(['b-254', 'b-90', 'b-164']);
    expect(removeBranchIds(['b-254', 'b-90', 'b-164'], ['b-90', 'b-x'])).toEqual(['b-254', 'b-164']);
  });

  it('al quitar un país de la promoción salen sus sucursales elegidas; las que no están en el catálogo se conservan', () => {
    const selected = ['b-254', 'b-125', 'b-vieja'];
    expect(pruneBranchIdsByCountry(selected, BRANCHES, SEASON, ['c-mx'])).toEqual({
      kept: ['b-254', 'b-vieja'],
      removed: ['b-125'],
    });
    expect(pruneBranchIdsByCountry(selected, BRANCHES, SEASON, [])).toEqual({
      kept: ['b-254', 'b-125', 'b-vieja'],
      removed: [],
    });
    // Una sucursal sin país nunca es de los países de la promoción.
    expect(pruneBranchIdsByCountry(['b-x'], BRANCHES, SEASON, []).removed).toEqual(['b-x']);
  });

  it('avisa de las elegidas que ya no se pueden elegir (inactivas o de otro país)', () => {
    const options = eligibleBranchOptions(BRANCHES, SEASON, ['c-mx']);
    const known = [
      { id: 'b-125', code: '125', name: 'Tijuana TL' },
      { id: 'b-vieja', code: '77', name: 'Sucursal cerrada' },
    ];
    expect(unavailableSelectedBranches(['b-254', 'b-125', 'b-vieja', 'b-rara'], options, known)).toEqual([
      { id: 'b-125', code: '125', name: 'Tijuana TL' },
      { id: 'b-vieja', code: '77', name: 'Sucursal cerrada' },
      { id: 'b-rara', code: '', name: 'Sucursal que ya no está en el catálogo' },
    ]);
    expect(unavailableSelectedBranches(['b-254'], options, known)).toEqual([]);
  });

  it('explica qué significa la elección según los canales', () => {
    expect(branchScopeHint('all', ['pos', 'online'])).toBe(
      'Vale en todas las sucursales de los países de la promoción.',
    );
    expect(branchScopeHint('some', ['pos', 'online'])).toContain('En la tienda en línea sigue valiendo para todo el país');
    expect(branchScopeHint('some', ['pos'])).toContain('No se anuncia en la tienda en línea');
    expect(branchScopeHint('some', ['online'])).toContain('solo cuenta en la caja');
  });

  it('"Solo algunas" exige al menos una sucursal y el canal de caja', () => {
    expect(validatePromotionBranches({ branchMode: 'all', branchIds: [], channels: ['online'] })).toEqual([]);
    expect(validatePromotionBranches({ branchMode: 'some', branchIds: [], channels: ['pos'] })).toEqual([
      'Elige al menos una sucursal, o cambia a "Todas las sucursales".',
    ]);
    expect(validatePromotionBranches({ branchMode: 'some', branchIds: ['b-254'], channels: ['online'] })).toHaveLength(1);
    expect(validatePromotionBranches({ branchMode: 'some', branchIds: ['b-254'], channels: ['pos'] })).toEqual([]);
    expect(validatePromotionBranches({ branchMode: 'some', branchIds: ['b-254'], channels: ['pos', 'online'] })).toEqual(
      [],
    );
  });

  it('al guardar: sin límite (ni antes ni ahora) el campo no viaja; para quitar el límite viaja vacío', () => {
    expect(branchIdsForPayload({ branchMode: 'all', branchIds: [] }, false)).toBeUndefined();
    expect(branchIdsForPayload({ branchMode: 'all', branchIds: ['b-254'] }, false)).toBeUndefined();
    expect(branchIdsForPayload({ branchMode: 'all', branchIds: ['b-254'] }, true)).toEqual([]);
    expect(branchIdsForPayload({ branchMode: 'some', branchIds: ['b-254', 'b-254', 'b-90'] }, false)).toEqual([
      'b-254',
      'b-90',
    ]);
    expect(branchIdsForPayload({ branchMode: 'some', branchIds: ['b-90'] }, true)).toEqual(['b-90']);
  });

  it('resume el límite para la lista de promociones', () => {
    expect(branchScopeSummary([])).toBeNull();
    expect(branchScopeSummary(undefined)).toBeNull();
    expect(branchScopeSummary([{ code: '205', name: 'USA Tulsa Almacen TL' }])).toBe('Solo 205 · USA Tulsa Almacen TL');
    expect(
      branchScopeSummary([
        { code: '205', name: 'a' },
        { code: '253', name: 'b' },
        { code: '254', name: 'c' },
      ]),
    ).toBe('Solo 3 sucursales: 205, 253, 254');
    expect(branchScopeSummary(Array.from({ length: 12 }, (_, i) => ({ code: String(i), name: 'x' })))).toBe(
      'Solo 12 sucursales',
    );
  });
});
