import { describe, expect, it } from 'vitest';
import type { FulfillmentDiagnosticsResponse } from '@/types/fulfillment';
import {
  MAX_ROUTES_PER_COUNTRY,
  addRoute,
  addRouteError,
  buildDraftWarnings,
  buildRoutingContext,
  buildSavePayload,
  buildSimulateDraft,
  canActivateRoute,
  canMove,
  changedCountryCodes,
  copyCountryRoutes,
  copyableRoutes,
  countryStatus,
  draftFromServer,
  fiscalParentName,
  isActivationLocked,
  isCrossCountryRoute,
  isDraftDirty,
  isSimulateDraftTrimmed,
  mergeWarnings,
  moveRoute,
  normalizeNotes,
  removeRoute,
  resolveCountry,
  setRouteActive,
  setRouteNotes,
  setStockMode,
  setWarehouseCountries,
  validateDraft,
  warehousesFromDraft,
} from './route-draft';
import { WH_164, WH_205, WH_400, WH_INACTIVE, country, route, seededResponse } from './fixtures';

const data = seededResponse();
const ctx = buildRoutingContext(data);
const base = draftFromServer(data);

describe('draftFromServer', () => {
  it('ordena por prioridad, luego código y luego id (estable al permutar la entrada)', () => {
    const resp = seededResponse();
    resp.countries[0].routes = [route(WH_205, 2), route(WH_400, 1, { id: 'z' }), route(WH_164, 1, { id: 'a' })];
    expect(draftFromServer(resp).countries.MX.map((r) => r.branchCode)).toEqual(['164', '400', '205']);
    resp.countries[0].routes.reverse();
    expect(draftFromServer(resp).countries.MX.map((r) => r.branchCode)).toEqual(['164', '400', '205']);
  });

  it('incluye los países sin rutas y trata un modo desconocido como full_order', () => {
    const resp = seededResponse();
    (resp.settings as { stockMode: string }).stockMode = 'otro';
    const draft = draftFromServer(resp);
    expect(draft.countries.FN).toEqual([]);
    expect(draft.stockMode).toBe('full_order');
  });

  it('un candado desconocido se trata como block', () => {
    const resp = seededResponse();
    (resp.settings as { crossCountry: string }).crossCountry = 'raro';
    expect(buildRoutingContext(resp).crossCountry).toBe('block');
  });
});

describe('reglas estructurales', () => {
  it('164 (MX) → FN no es entre países; 164 → CO sí', () => {
    expect(isCrossCountryRoute(WH_164, 'FN', ctx)).toBe(false);
    expect(isCrossCountryRoute(WH_164, 'fn', ctx)).toBe(false);
    expect(isCrossCountryRoute(WH_164, 'CO', ctx)).toBe(true);
  });

  it('almacén sin país conocido = entre países (lo seguro)', () => {
    expect(isCrossCountryRoute({ branchCountryCode: null }, 'MX', ctx)).toBe(true);
  });

  it('paridad de sembrado: cada país resuelve su almacén y FN no resuelve', () => {
    expect(resolveCountry(base.countries.MX, 'MX', ctx)?.branchCode).toBe('164');
    expect(resolveCountry(base.countries.US, 'US', ctx)?.branchCode).toBe('205');
    expect(resolveCountry(base.countries.CO, 'CO', ctx)?.branchCode).toBe('400');
    expect(resolveCountry(base.countries.GT, 'GT', ctx)?.branchCode).toBe('411');
    expect(resolveCountry(base.countries.FN, 'FN', ctx)).toBeNull();
    expect(resolveCountry(undefined, 'ZZ', ctx)).toBeNull();
  });

  it('ruta bloqueada al frente + ruta local de respaldo → surte la local', () => {
    const draft = moveRoute(addRoute(base, 'CO', WH_164).draft, 'CO', 1, -1);
    expect(draft.countries.CO.map((r) => r.branchCode)).toEqual(['164', '400']);
    expect(resolveCountry(draft.countries.CO, 'CO', ctx)?.branchCode).toBe('400');
    expect(resolveCountry(draft.countries.CO, 'CO', { ...ctx, crossCountry: 'allow' })?.branchCode).toBe('164');
  });

  it('countryStatus distingue cada caso', () => {
    expect(countryStatus(base.countries.MX, 'MX', ctx)).toBe('ready');
    expect(countryStatus([], 'FN', ctx)).toBe('no_warehouse');
    expect(countryStatus(setRouteActive(base, 'MX', WH_164.branchId, false).countries.MX, 'MX', ctx)).toBe('paused');
    const onlyCross = addRoute(removeRoute(base, 'CO', WH_400.branchId), 'CO', WH_164).draft;
    expect(countryStatus(onlyCross.countries.CO, 'CO', ctx)).toBe('cross_pending');
    const resp = seededResponse();
    resp.countries[0].routes = [route(WH_INACTIVE)];
    expect(countryStatus(draftFromServer(resp).countries.MX, 'MX', ctx)).toBe('branch_inactive');
  });
});

describe('reordenamiento', () => {
  const two = addRoute(base, 'MX', WH_205).draft;

  it('sube y baja; el orden de la lista es la prioridad', () => {
    const moved = moveRoute(two, 'MX', 1, -1);
    expect(moved.countries.MX.map((r) => r.branchCode)).toEqual(['205', '164']);
    expect(moveRoute(moved, 'MX', 0, 1).countries.MX.map((r) => r.branchCode)).toEqual(['164', '205']);
  });

  it('no muta el borrador original ni toca otros países', () => {
    const moved = moveRoute(two, 'MX', 0, 1);
    expect(two.countries.MX.map((r) => r.branchCode)).toEqual(['164', '205']);
    expect(moved.countries.US).toBe(two.countries.US);
  });

  it('fuera de rango devuelve el mismo borrador', () => {
    expect(moveRoute(two, 'MX', 0, -1)).toBe(two);
    expect(moveRoute(two, 'MX', 1, 1)).toBe(two);
    expect(moveRoute(two, 'MX', 9, 1)).toBe(two);
    expect(moveRoute(two, 'ZZ', 0, 1)).toBe(two);
  });

  it('canMove habilita solo los botones con sentido', () => {
    expect(canMove(two.countries.MX, 0, -1)).toBe(false);
    expect(canMove(two.countries.MX, 0, 1)).toBe(true);
    expect(canMove(two.countries.MX, 1, 1)).toBe(false);
    expect(canMove(base.countries.MX, 0, 1)).toBe(false);
  });
});

describe('agregar, quitar, pausar y notas', () => {
  it('un almacén nuevo entra al final, activo y sin nota', () => {
    const { draft, error } = addRoute(base, 'MX', WH_205);
    expect(error).toBeNull();
    expect(draft.countries.MX[1]).toMatchObject({ branchCode: '205', isActive: true, notes: null });
  });

  it('valida duplicado, tope de 5 y sucursal desactivada', () => {
    expect(addRouteError(base, 'MX', WH_164)).toBe('duplicate');
    expect(addRoute(base, 'MX', WH_164).draft).toBe(base);
    expect(addRouteError(base, 'FN', WH_INACTIVE)).toBe('branch_inactive');
    let full = base;
    for (let i = 0; i < MAX_ROUTES_PER_COUNTRY; i += 1) {
      full = addRoute(full, 'FN', { ...WH_164, branchId: `x-${i}`, branchCode: `9${i}` }).draft;
    }
    expect(full.countries.FN).toHaveLength(MAX_ROUTES_PER_COUNTRY);
    expect(addRouteError(full, 'FN', WH_205)).toBe('too_many');
  });

  it('pausar, reactivar, quitar y notas devuelven el mismo objeto si nada cambia', () => {
    expect(setRouteActive(base, 'MX', WH_164.branchId, true)).toBe(base);
    expect(setRouteNotes(base, 'MX', WH_164.branchId, '   ')).toBe(base);
    expect(removeRoute(base, 'MX', 'no-existe')).toBe(base);
    expect(setStockMode(base, 'full_order')).toBe(base);
    const paused = setRouteActive(base, 'MX', WH_164.branchId, false);
    expect(paused.countries.MX[0].isActive).toBe(false);
    expect(setRouteNotes(base, 'MX', WH_164.branchId, '  Hola  ').countries.MX[0].notes).toBe('Hola');
    expect(removeRoute(base, 'MX', WH_164.branchId).countries.MX).toEqual([]);
  });

  it('normalizeNotes: vacío = null', () => {
    expect(normalizeNotes('  ')).toBeNull();
    expect(normalizeNotes(undefined)).toBeNull();
    expect(normalizeNotes(' a ')).toBe('a');
  });

  it('"Usar los mismos almacenes que México" copia orden y estado, sin notas', () => {
    const mx = setRouteNotes(addRoute(base, 'MX', WH_205).draft, 'MX', WH_164.branchId, 'nota');
    const copied = copyCountryRoutes(mx, 'MX', 'FN');
    expect(copied.countries.FN.map((r) => [r.branchCode, r.notes])).toEqual([
      ['164', null],
      ['205', null],
    ]);
    expect(copyCountryRoutes(base, 'PE', 'FN')).toBe(base);
  });

  it('al copiar se excluyen las rutas hacia sucursales desactivadas (L-7)', () => {
    // MX = [999 (sucursal desactivada), 164, 205 en pausa]: en FN cada copia es un ALTA
    // y el API rechaza dar de alta una ruta hacia una sucursal desactivada.
    const resp = seededResponse();
    resp.countries[0] = country('MX', 'México', [route(WH_INACTIVE, 1), route(WH_164, 2), route(WH_205, 3, { isActive: false })]);
    const draft = draftFromServer(resp);
    expect(copyableRoutes(draft, 'MX').map((r) => r.branchCode)).toEqual(['164', '205']);
    const copied = copyCountryRoutes(draft, 'MX', 'FN');
    expect(copied.countries.FN.map((r) => [r.branchCode, r.isActive])).toEqual([
      ['164', true],
      ['205', false], // una ruta EN PAUSA de sucursal activa sí se copia, con su estado
    ]);

    // Si lo único que hay son sucursales desactivadas no hay nada que copiar.
    resp.countries[0] = country('MX', 'México', [route(WH_INACTIVE, 1)]);
    const onlyInactive = draftFromServer(resp);
    expect(copyableRoutes(onlyInactive, 'MX')).toEqual([]);
    expect(copyCountryRoutes(onlyInactive, 'MX', 'FN')).toBe(onlyInactive);
  });
});

describe('atajo "Elegir países" de un almacén', () => {
  it('164 → MX + FN + CO: conserva MX, entra al final en CO y crea FN', () => {
    const { draft, skipped } = setWarehouseCountries(base, WH_164, ['MX', 'FN', 'CO']);
    expect(skipped).toEqual([]);
    expect(draft.countries.MX).toBe(base.countries.MX);
    expect(draft.countries.FN.map((r) => r.branchCode)).toEqual(['164']);
    expect(draft.countries.CO.map((r) => r.branchCode)).toEqual(['400', '164']);
  });

  it('desmarcar quita la ruta; lo que no cabe se reporta', () => {
    const { draft } = setWarehouseCountries(base, WH_164, []);
    expect(draft.countries.MX).toEqual([]);
    let full = base;
    for (let i = 0; i < MAX_ROUTES_PER_COUNTRY; i += 1) {
      full = addRoute(full, 'FN', { ...WH_205, branchId: `x-${i}`, branchCode: `9${i}` }).draft;
    }
    expect(setWarehouseCountries(full, WH_164, ['MX', 'FN']).skipped).toEqual([
      { countryCode: 'FN', error: 'too_many' },
    ]);
  });

  it('vista inversa: almacén → países, en el orden de los países', () => {
    const { draft } = setWarehouseCountries(base, WH_164, ['MX', 'FN', 'CO']);
    const list = warehousesFromDraft(draft, ['MX', 'FN', 'US', 'GT', 'CO']);
    expect(list.map((w) => w.branchCode)).toEqual(['164', '205', '400', '411']);
    expect(list[0].countryCodes).toEqual(['MX', 'FN', 'CO']);
  });
});

describe('validación y cuerpo del PUT', () => {
  it('sin cambios: no está sucio y no manda países', () => {
    expect(isDraftDirty(base, draftFromServer(seededResponse()))).toBe(false);
    expect(buildSavePayload({ base, draft: base, expectedVersion: 'v1' })).toEqual({
      expectedVersion: 'v1',
      countries: [],
    });
  });

  it('manda SOLO los países que cambiaron, en orden de lista, sin números de prioridad', () => {
    const draft = moveRoute(addRoute(addRoute(base, 'FN', WH_164).draft, 'MX', WH_205).draft, 'MX', 1, -1);
    expect(changedCountryCodes(base, draft)).toEqual(['FN', 'MX']);
    const payload = buildSavePayload({ base, draft, expectedVersion: 'v1', reason: '  ' });
    expect(payload).toEqual({
      expectedVersion: 'v1',
      countries: [
        { countryCode: 'FN', routes: [{ branchId: 'b-164', isActive: true, notes: null }] },
        {
          countryCode: 'MX',
          routes: [
            { branchId: 'b-205', isActive: true, notes: null },
            { branchId: 'b-164', isActive: true, notes: null },
          ],
        },
      ],
    });
  });

  it('incluye ajustes, confirmación y motivo solo cuando aplican', () => {
    const draft = setStockMode(removeRoute(base, 'MX', WH_164.branchId), 'first_active');
    const payload = buildSavePayload({
      base,
      draft,
      expectedVersion: 'v9',
      confirmEmptyCountries: ['mx', 'MX'],
      reason: ' Cierre temporal ',
    });
    expect(payload.settings).toEqual({ stockMode: 'first_active' });
    expect(payload.confirmEmptyCountries).toEqual(['MX']);
    expect(payload.reason).toBe('Cierre temporal');
    expect(payload.countries).toEqual([{ countryCode: 'MX', routes: [] }]);
  });

  it('solo cambiar el modo de existencias ensucia el borrador', () => {
    expect(isDraftDirty(base, setStockMode(base, 'first_active'))).toBe(true);
  });

  it('validateDraft espeja FUL_DUPLICATE_ROUTE, FUL_TOO_MANY_ROUTES y FUL_NOTES_TOO_LONG', () => {
    expect(validateDraft(base)).toEqual([]);
    const r = base.countries.MX[0];
    const bad = {
      ...base,
      countries: {
        ...base.countries,
        MX: [r, r],
        US: Array.from({ length: 6 }, (_, i) => ({ ...r, branchId: `u-${i}` })),
        CO: [{ ...r, notes: 'x'.repeat(301) }],
      },
    };
    expect(
      validateDraft(bad)
        .map((i) => `${i.countryCode}:${i.code}`)
        .sort(),
    ).toEqual(['CO:FUL_NOTES_TOO_LONG', 'MX:FUL_DUPLICATE_ROUTE', 'US:FUL_TOO_MANY_ROUTES']);
  });

  it('borrador para el simulador: solo almacén y estado del país pedido', () => {
    const draft = setRouteActive(addRoute(base, 'MX', WH_205).draft, 'MX', WH_205.branchId, false);
    expect(buildSimulateDraft(draft, 'mx')).toEqual({
      countryCode: 'MX',
      routes: [
        { branchId: 'b-164', isActive: true },
        { branchId: 'b-205', isActive: false },
      ],
    });
    expect(isSimulateDraftTrimmed(draft, 'MX')).toBe(false);
  });

  it('borrador para el simulador: sin almacenes repetidos y máximo 5 (el API lo rechaza: FUL_DUPLICATE_ROUTE / FUL_TOO_MANY_ROUTES)', () => {
    const row = (n: number, isActive = true) => ({
      ...draftFromServer(seededResponse()).countries.MX[0],
      branchId: `b-${n}`,
      branchCode: String(n),
      isActive,
    });
    // Forzado por fuera de la pantalla (p. ej. filas metidas por SQL): repetido + 7 almacenes.
    const forced = {
      ...base,
      countries: { ...base.countries, MX: [row(1), row(1, false), row(2), row(3), row(4), row(5), row(6)] },
    };
    const sim = buildSimulateDraft(forced, 'MX');
    expect(sim.routes.map((r) => r.branchId)).toEqual(['b-1', 'b-2', 'b-3', 'b-4', 'b-5']);
    expect(sim.routes).toHaveLength(MAX_ROUTES_PER_COUNTRY);
    // Del repetido gana el PRIMERO (su estado es el que cuenta).
    expect(sim.routes[0]).toEqual({ branchId: 'b-1', isActive: true });
    expect(new Set(sim.routes.map((r) => r.branchId)).size).toBe(sim.routes.length);
    expect(isSimulateDraftTrimmed(forced, 'MX')).toBe(true);
    expect(buildSimulateDraft(base, 'PE')).toEqual({ countryCode: 'PE', routes: [] });
  });
});

describe('interruptor "Activa" con la sucursal desactivada (M-4)', () => {
  const withInactive = (isActive: boolean) => {
    const data = seededResponse();
    data.countries[0].routes = [route(WH_164, 1), route(WH_INACTIVE, 2, { isActive, usable: false })];
    return draftFromServer(data);
  };

  it('una ruta en pausa hacia una sucursal desactivada NO se puede reactivar (el API daría 422 FUL_BRANCH_INACTIVE)', () => {
    const draft = withInactive(false);
    expect(canActivateRoute(draft.countries.MX[1])).toBe(false);
    expect(isActivationLocked(draft.countries.MX[1])).toBe(true);
    expect(setRouteActive(draft, 'MX', WH_INACTIVE.branchId, true)).toBe(draft);
  });

  it('una ruta que ya estaba activa hacia una sucursal desactivada sí se puede pausar (y quitar)', () => {
    const draft = withInactive(true);
    expect(isActivationLocked(draft.countries.MX[1])).toBe(false);
    const paused = setRouteActive(draft, 'MX', WH_INACTIVE.branchId, false);
    expect(paused.countries.MX[1].isActive).toBe(false);
    // Una vez en pausa ya no se puede volver a activar hasta que la sucursal se active.
    expect(isActivationLocked(paused.countries.MX[1])).toBe(true);
    expect(setRouteActive(paused, 'MX', WH_INACTIVE.branchId, true)).toBe(paused);
    expect(removeRoute(draft, 'MX', WH_INACTIVE.branchId).countries.MX).toHaveLength(1);
  });

  it('con la sucursal activa el interruptor funciona en ambos sentidos', () => {
    const paused = setRouteActive(base, 'MX', WH_164.branchId, false);
    expect(isActivationLocked(paused.countries.MX[0])).toBe(false);
    expect(setRouteActive(paused, 'MX', WH_164.branchId, true).countries.MX[0].isActive).toBe(true);
  });
});

describe('avisos sobre el borrador', () => {
  const codesOf = (draft: typeof base, mode: 'block' | 'allow' = 'block') =>
    buildDraftWarnings(draft, data.countries, { ...ctx, crossCountry: mode }).map(
      (w) => `${w.countryCode}:${w.code}`,
    );

  it('sembrado: solo FN avisa (tiene productos y ningún almacén); Perú no avisa', () => {
    expect(codesOf(base)).toEqual(['FN:SELLABLE_NO_ROUTE']);
  });

  it('país sin tienda propia (Frontera): aviso INFORMATIVO que dice la verdad (L-3)', () => {
    expect(fiscalParentName('FN', data.countries, ctx)).toBe('México');
    expect(fiscalParentName('fn', data.countries, ctx)).toBe('México');
    expect(fiscalParentName('MX', data.countries, ctx)).toBeNull();
    expect(fiscalParentName('ZZ', data.countries, ctx)).toBeNull();

    const [fn] = buildDraftWarnings(base, data.countries, ctx);
    expect(fn).toMatchObject({ code: 'SELLABLE_NO_ROUTE', severity: 'info', countryCode: 'FN' });
    expect(fn.message).toBe(
      'Frontera no tiene tienda propia: sus clientes compran en la tienda de México y hoy les surte el almacén de México. Agregar un almacén aquí solo cambia las existencias que ven en su carrito.',
    );
    expect(fn.message).not.toContain('no se puede enviar');
  });

  it('un país CON tienda propia que se queda sin almacén sigue siendo error rojo', () => {
    const draft = removeRoute(base, 'CO', WH_400.branchId);
    const co = buildDraftWarnings(draft, data.countries, ctx).find((w) => w.countryCode === 'CO');
    expect(co).toMatchObject({ code: 'SELLABLE_NO_ROUTE', severity: 'error' });
    expect(co?.message).toContain('hoy no se puede enviar a Colombia');
  });

  it('164 → CO con candado: aviso claro de que se guarda pero no surte', () => {
    const draft = addRoute(base, 'CO', WH_164).draft;
    const warning = buildDraftWarnings(draft, data.countries, ctx).find((w) => w.code === 'CROSS_COUNTRY_BLOCKED');
    expect(warning).toMatchObject({ severity: 'warning', countryCode: 'CO', branchId: 'b-164' });
    expect(warning?.message).toContain('todavía no surte pedidos');
    expect(codesOf(draft, 'allow')).toContain('CO:CROSS_COUNTRY_ROUTE');
    expect(codesOf(draft, 'allow')).not.toContain('CO:CROSS_COUNTRY_BLOCKED');
  });

  it('todas pausadas, sucursal desactivada y país sin productos', () => {
    expect(codesOf(setRouteActive(base, 'MX', WH_164.branchId, false))).toContain('MX:ALL_ROUTES_PAUSED');
    const resp = seededResponse();
    resp.countries[0] = country('MX', 'México', [route(WH_INACTIVE)]);
    const inactive = buildDraftWarnings(draftFromServer(resp), resp.countries, ctx).map((w) => w.code);
    expect(inactive).toEqual(expect.arrayContaining(['ALL_ROUTES_PAUSED', 'ROUTE_BRANCH_INACTIVE']));
    expect(codesOf(addRoute(base, 'PE', WH_164).draft)).toContain('PE:ROUTE_NO_SELLABLE_PRODUCTS');
  });

  it('mergeWarnings: estructurales del borrador + datos del diagnóstico, errores primero', () => {
    const diagnostics = {
      generatedAt: '',
      countries: [
        {
          countryCode: 'MX',
          warnings: [
            { code: 'LOW_COVERAGE', severity: 'info', message: 'cobertura', countryCode: 'MX', branchId: 'b-164' },
            { code: 'SELLABLE_NO_ROUTE', severity: 'error', message: 'viejo', countryCode: 'MX', branchId: null },
          ],
        },
        {
          countryCode: 'CO',
          warnings: [
            { code: 'SHIPPING_COSTS_MISSING', severity: 'warning', message: 'envío', countryCode: 'CO', branchId: null },
            { code: 'PLACEHOLDER_STOCK', severity: 'info', message: 'placeholder', countryCode: 'CO', branchId: 'b-400' },
          ],
        },
      ],
      global: [{ code: 'NO_PICKUP_POINTS', severity: 'info', message: 'pickup', countryCode: null, branchId: null }],
    } as unknown as FulfillmentDiagnosticsResponse;

    const draft = removeRoute(base, 'CO', WH_400.branchId);
    const merged = mergeWarnings(buildDraftWarnings(draft, data.countries, ctx), diagnostics, draft);
    expect(merged.map((w) => `${w.countryCode}:${w.code}`)).toEqual([
      'CO:SELLABLE_NO_ROUTE', // borrador: se quitó su único almacén (error)
      'CO:SHIPPING_COSTS_MISSING',
      'FN:SELLABLE_NO_ROUTE', // sin tienda propia: informativo (L-3)
      'MX:LOW_COVERAGE',
      'null:NO_PICKUP_POINTS',
    ]);
    expect(merged.some((w) => w.message === 'viejo' || w.message === 'placeholder')).toBe(false);
    expect(mergeWarnings([], null, base)).toEqual([]);
  });
});
