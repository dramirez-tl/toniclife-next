import { describe, expect, it } from 'vitest';
import {
  addRoute,
  buildRoutingContext,
  draftFromServer,
  moveRoute,
  removeRoute,
  setRouteActive,
  setRouteNotes,
} from './route-draft';
import {
  changesLabel,
  confirmTextForCountries,
  countChanges,
  countriesChangingWarehouse,
  countriesLosingShipping,
  describeChange,
  describeStockModeChange,
  diffRoutes,
} from './route-diff';
import { WH_164, WH_205, WH_400, WH_INACTIVE, route, seededResponse } from './fixtures';

const data = seededResponse();
const ctx = buildRoutingContext(data);
const base = draftFromServer(data);

describe('diffRoutes', () => {
  it('sin cambios → []', () => {
    expect(diffRoutes(base.countries, draftFromServer(seededResponse()).countries)).toEqual([]);
  });

  it('detecta los 6 tipos de cambio', () => {
    const resp = seededResponse();
    resp.countries[0].routes = [route(WH_164, 1), route(WH_205, 2), route(WH_400, 3, { isActive: false })];
    const before = draftFromServer(resp);

    let after = moveRoute(before, 'MX', 1, -1); // reordered
    after = setRouteActive(after, 'MX', WH_164.branchId, false); // paused
    after = setRouteActive(after, 'MX', WH_400.branchId, true); // resumed
    after = setRouteNotes(after, 'MX', WH_205.branchId, 'Temporada alta'); // notes_changed
    after = removeRoute(after, 'US', WH_205.branchId); // removed
    after = addRoute(after, 'FN', WH_164).draft; // added

    const changes = diffRoutes(before.countries, after.countries);
    expect(changes.map((c) => `${c.countryCode}:${c.type}:${c.branchCode ?? '-'}`)).toEqual([
      'FN:added:164',
      'MX:notes_changed:205',
      'MX:paused:164',
      'MX:resumed:400',
      'MX:reordered:-',
      'US:removed:205',
    ]);
    expect(changes[0].position).toBe(1);
    expect(changes[4].order?.map((l) => l.split(' ')[0])).toEqual(['205', '164', '400']);
  });

  it('agregar o quitar NO cuenta como reordenar', () => {
    const added = addRoute(base, 'MX', WH_205).draft;
    expect(diffRoutes(base.countries, added.countries).map((c) => c.type)).toEqual(['added']);
    expect(diffRoutes(added.countries, base.countries).map((c) => c.type)).toEqual(['removed']);
    const replaced = addRoute(removeRoute(base, 'MX', WH_164.branchId), 'MX', WH_205).draft;
    expect(diffRoutes(base.countries, replaced.countries).map((c) => c.type)).toEqual(['removed', 'added']);
  });

  it('una nota vacía es igual a no tener nota', () => {
    const blank = { ...base.countries, MX: [{ ...base.countries.MX[0], notes: '   ' }] };
    expect(diffRoutes(base.countries, blank)).toEqual([]);
  });
});

describe('countriesLosingShipping', () => {
  it('por pausar y por quitar', () => {
    const paused = setRouteActive(base, 'MX', WH_164.branchId, false);
    expect(countriesLosingShipping(base.countries, paused.countries, ctx)).toEqual(['MX']);
    const removed = removeRoute(base, 'US', WH_205.branchId);
    expect(countriesLosingShipping(base.countries, removed.countries, ctx)).toEqual(['US']);
  });

  it('por dejar solo un almacén desactivado o solo rutas entre países', () => {
    const inactiveOnly = {
      ...base.countries,
      MX: [{ ...base.countries.MX[0], branchId: WH_INACTIVE.branchId, branchIsActive: false }],
    };
    expect(countriesLosingShipping(base.countries, inactiveOnly, ctx)).toEqual(['MX']);
    const crossOnly = addRoute(removeRoute(base, 'CO', WH_400.branchId), 'CO', WH_164).draft;
    expect(countriesLosingShipping(base.countries, crossOnly.countries, ctx)).toEqual(['CO']);
    expect(countriesLosingShipping(base.countries, crossOnly.countries, { ...ctx, crossCountry: 'allow' })).toEqual([]);
  });

  it('no marca a un país que ya no resolvía, ni a uno que conserva un respaldo', () => {
    const fnPaused = setRouteActive(addRoute(base, 'FN', WH_164).draft, 'FN', WH_164.branchId, false);
    expect(countriesLosingShipping(base.countries, fnPaused.countries, ctx)).toEqual([]);

    const backup = { ...base.countries.MX[0], branchId: 'mx-2', branchCode: '193' };
    const two = { ...base.countries, MX: [...base.countries.MX, backup] };
    const pausedFirst = { ...two, MX: [{ ...two.MX[0], isActive: false }, two.MX[1]] };
    expect(countriesLosingShipping(two, pausedFirst, ctx)).toEqual([]);
    expect(
      countriesChangingWarehouse(two, pausedFirst, ctx).map(
        (c) => `${c.countryCode}:${c.from?.branchCode}>${c.to.branchCode}`,
      ),
    ).toEqual(['MX:164>193']);
  });

  it('un país que gana envío aparece como cambio de almacén desde "ninguno"', () => {
    const fn = addRoute(base, 'FN', WH_164).draft;
    expect(countriesChangingWarehouse(base.countries, fn.countries, ctx)).toEqual([
      { countryCode: 'FN', from: null, to: fn.countries.FN[0] },
    ]);
  });
});

describe('textos del resumen', () => {
  it('describe cada cambio sin ids ni códigos internos', () => {
    const change = { countryCode: 'MX', branchId: 'b-164', branchCode: '164', branchName: 'Irapuato' };
    expect(describeChange({ type: 'added', ...change, position: 1 }, 'México')).toBe(
      'México: se agrega 164 · Irapuato como almacén principal.',
    );
    expect(describeChange({ type: 'added', ...change, position: 2 }, 'México')).toContain('como respaldo (lugar 2');
    expect(describeChange({ type: 'removed', ...change }, 'México')).toBe('México: se quita 164 · Irapuato.');
    expect(describeChange({ type: 'paused', ...change }, 'México')).toContain('se pausa 164 · Irapuato');
    expect(describeChange({ type: 'resumed', ...change }, 'México')).toContain('se reactiva');
    expect(describeChange({ type: 'notes_changed', ...change }, 'México')).toContain('cambia la nota');
    const text = describeChange(
      {
        type: 'reordered',
        countryCode: 'MX',
        branchId: null,
        branchCode: null,
        branchName: null,
        order: ['205 · Tulsa', '164 · Irapuato'],
      },
      'México',
    );
    expect(text).toBe('México: cambia el orden → 1) 205 · Tulsa, 2) 164 · Irapuato.');
    expect(text).not.toContain('b-164');
  });

  it('contador y etiquetas', () => {
    expect(countChanges([], false)).toBe(0);
    expect(countChanges(diffRoutes(base.countries, addRoute(base, 'FN', WH_164).draft.countries), true)).toBe(2);
    expect(changesLabel(1)).toBe('1 cambio sin guardar');
    expect(changesLabel(3)).toBe('3 cambios sin guardar');
    expect(describeStockModeChange('first_active')).toContain('usar siempre el primero de la lista');
  });

  it('texto a teclear = nombre del país', () => {
    expect(confirmTextForCountries(['México'])).toBe('México');
    expect(confirmTextForCountries(['México', ' Estados Unidos '])).toBe('México, Estados Unidos');
    expect(confirmTextForCountries([])).toBeUndefined();
  });
});
