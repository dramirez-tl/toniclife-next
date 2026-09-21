import { describe, expect, it } from 'vitest';
import {
  BRANCH_ROUTES_READ_PERMISSIONS,
  branchOffDialogText,
  canReadBranchRoutes,
  deactivateBranchWarning,
  shippingBadgeText,
  shippingCountriesByBranch,
  unverifiedBranchWarning,
} from './branch-routes';
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

  it('eliminar (borrado lógico) usa el MISMO aviso, con su verbo (M-2)', () => {
    const data = seededResponse();
    data.countries[2].routes = [route(WH_205, 1), route(WH_164, 2)]; // US con respaldo
    const map = shippingCountriesByBranch(data);
    const mx164 = map[WH_164.branchId];
    expect(deactivateBranchWarning(mx164.filter((c) => c.resolvesHere), 'delete')).toBe(
      'Esta sucursal surte los envíos de México. Si la eliminas, México se queda sin envío a domicilio.',
    );
    expect(deactivateBranchWarning(map[WH_205.branchId], 'delete')).toBe(
      'Esta sucursal surte los envíos de Estados Unidos. Si la eliminas, los pedidos de Estados Unidos pasan a su almacén de respaldo.',
    );
    expect(deactivateBranchWarning(mx164.filter((c) => !c.resolvesHere), 'delete')).toContain(
      'si la eliminas deja de ser una opción',
    );
    // Sin rutas activas no hay aviso de rutas: eliminar sigue con su confirmación de siempre.
    expect(deactivateBranchWarning([], 'delete')).toBeNull();
  });

  it('la consulta de rutas corre para todo el que puede desactivar o eliminar (M-2)', () => {
    expect([...BRANCH_ROUTES_READ_PERMISSIONS]).toEqual([
      'fulfillment:read',
      'fulfillment:manage',
      'branches:update',
      'branches:delete',
    ]);
    // OPERACIONES / SISTEMAS: solo branches:update, sin ningún permiso de rutas.
    expect(canReadBranchRoutes(['branches:read', 'branches:update'], ['operaciones'])).toBe(true);
    expect(canReadBranchRoutes(['branches:delete'], [])).toBe(true);
    expect(canReadBranchRoutes(['branches:*'], [])).toBe(true);
    expect(canReadBranchRoutes(['fulfillment:read'], [])).toBe(true);
    expect(canReadBranchRoutes(['fulfillment:manage'], [])).toBe(true);
    expect(canReadBranchRoutes(['*'], [])).toBe(true);
    expect(canReadBranchRoutes([], ['super_admin'])).toBe(true);
    // Solo ver sucursales no alcanza: tampoco puede desactivar nada.
    expect(canReadBranchRoutes(['branches:read', 'products:read'], ['administrador'])).toBe(false);
    expect(canReadBranchRoutes([], [])).toBe(false);
  });

  it('diálogo: con rutas conocidas avisa lo de siempre; si no se pudo comprobar, lo dice (M-2)', () => {
    const map = shippingCountriesByBranch(seededResponse());
    expect(branchOffDialogText(map[WH_164.branchId], 'deactivate', true)).toBe(
      'Esta sucursal surte los envíos de México. Si la desactivas, México se queda sin envío a domicilio.',
    );
    expect(branchOffDialogText(map[WH_164.branchId], 'delete', true)).toContain('Si la eliminas');
    // Sucursal sin rutas y rutas conocidas: no hay nada que preguntar.
    expect(branchOffDialogText(undefined, 'deactivate', true)).toBeNull();
    expect(branchOffDialogText([], 'delete', true)).toBeNull();

    // La consulta falló: nunca se calla (el mapa llega vacío).
    const unverified = branchOffDialogText(undefined, 'deactivate', false);
    expect(unverified).toBe(unverifiedBranchWarning('deactivate'));
    expect(unverified).toContain('No se pudo comprobar si esta sucursal surte los envíos');
    expect(unverified).toContain('la desactivas');
    expect(branchOffDialogText(undefined, 'delete', false)).toContain('la eliminas');
  });
});
