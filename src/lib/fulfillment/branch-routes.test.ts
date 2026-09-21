import { describe, expect, it } from 'vitest';
import { deactivateBranchWarning, shippingBadgeText, shippingCountriesByBranch } from './branch-routes';
import { WH_164, WH_205, route, seededResponse } from './fixtures';

describe('branch-routes', () => {
  it('agrupa por sucursal solo las rutas activas', () => {
    const data = seededResponse();
    data.countries[1].routes = [route(WH_164, 1)]; // FN
    data.countries[1].resolvesTo = { branchId: WH_164.branchId, branchCode: '164' };
    data.countries[2].routes = [route(WH_205, 1), route(WH_164, 2, { isActive: false, usable: false })];
    const map = shippingCountriesByBranch(data);
    expect(map[WH_164.branchId].map((c) => c.countryCode)).toEqual(['MX', 'FN']);
    expect(shippingBadgeText(map[WH_164.branchId])).toBe('Envía a: MX, FN');
    expect(shippingCountriesByBranch(undefined)).toEqual({});
  });

  it('aviso: sin respaldo se queda sin envío; con respaldo pasa al respaldo', () => {
    const data = seededResponse();
    data.countries[2].routes = [route(WH_205, 1), route(WH_164, 2)]; // US con respaldo
    const map = shippingCountriesByBranch(data);
    expect(deactivateBranchWarning(map[WH_205.branchId])).toBe(
      'Esta sucursal surte los envíos de Estados Unidos. Si la desactivas, los pedidos de Estados Unidos pasan a su almacén de respaldo.',
    );
    const mx164 = map[WH_164.branchId];
    expect(deactivateBranchWarning(mx164.filter((c) => c.resolvesHere))).toBe(
      'Esta sucursal surte los envíos de México. Si la desactivas, México se queda sin envío a domicilio.',
    );
    expect(deactivateBranchWarning(mx164.filter((c) => !c.resolvesHere))).toContain('almacén de respaldo para los envíos de Estados Unidos');
    expect(deactivateBranchWarning([])).toBeNull();
  });
});
