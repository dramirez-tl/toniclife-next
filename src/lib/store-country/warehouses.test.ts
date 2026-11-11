import { describe, expect, it } from 'vitest';
import { WH_164, WH_205, WH_400, WH_INACTIVE, country, route, seededResponse } from '@/lib/fulfillment/fixtures';
import { storeCountry } from './countries';
import { storeWarehouses, warehouseReadiness } from './warehouses';

describe('store-country/warehouses · almacenes que surten, por país de la tienda', () => {
  it('México hoy: México surte desde 164 y Frontera no tiene almacén', () => {
    const places = storeWarehouses(seededResponse(), storeCountry('MX'));
    expect(places.map((p) => [p.code, p.name, p.isZone, p.status, p.warehouse])).toEqual([
      ['MX', 'México', false, 'ready', '164 · Irapuato Almacén General'],
      ['FN', 'Frontera', true, 'no_warehouse', null],
    ]);
    expect(places[0].routes).toEqual([
      { branchId: 'b-164', label: '164 · Irapuato Almacén General', city: 'Irapuato', position: 1, blocked: null, current: true },
    ]);
    expect(places[1].routes).toEqual([]);
    expect(warehouseReadiness(places)).toEqual([
      { code: 'MX', name: 'México', isZone: false, status: 'ready', warehouse: '164 · Irapuato Almacén General' },
      { code: 'FN', name: 'Frontera', isZone: true, status: 'no_warehouse', warehouse: null },
    ]);
  });

  it('Frontera con los mismos almacenes que México queda lista (no es "entre países")', () => {
    const data = seededResponse();
    data.countries = data.countries.map((c) => (c.countryCode === 'FN' ? country('FN', 'Frontera', [route(WH_164)], { fiscalCode: 'MX' }) : c));
    const frontera = storeWarehouses(data, storeCountry('MX'))[1];
    expect(frontera.status).toBe('ready');
    expect(frontera.warehouse).toBe('164 · Irapuato Almacén General');
    expect(frontera.routes[0]).toMatchObject({ blocked: null, current: true });
  });

  it('un país sin zonas es un solo lugar', () => {
    const places = storeWarehouses(seededResponse(), storeCountry('US'));
    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({ code: 'US', name: 'Estados Unidos', status: 'ready', warehouse: '205 · Tulsa Almacén' });
  });

  it('respeta el orden de preferencia y dice por qué un almacén no surte', () => {
    const data = seededResponse();
    data.countries = data.countries.map((c) =>
      c.countryCode === 'CO'
        ? country('CO', 'Colombia', [
            route(WH_400, 2),
            route(WH_164, 1), // de México: entre países, bloqueado
            route(WH_205, 3, { isActive: false }),
            route(WH_INACTIVE, 4),
          ])
        : c,
    );
    const colombia = storeWarehouses(data, storeCountry('CO'))[0];
    expect(colombia.routes.map((r) => [r.position, r.label, r.blocked, r.current])).toEqual([
      [1, '164 · Irapuato Almacén General', 'cross_country', false],
      [2, '400 · Colombia Bogotá', null, true],
      [3, '205 · Tulsa Almacén', 'paused', false],
      [4, '999 · Sucursal cerrada', 'branch_inactive', false],
    ]);
    expect(colombia.status).toBe('ready');
    expect(colombia.warehouse).toBe('400 · Colombia Bogotá');
  });

  it('solo almacenes que no pueden surtir: el país se queda sin envío y se dice por qué', () => {
    const data = seededResponse();
    data.countries = data.countries.map((c) =>
      c.countryCode === 'GT' ? country('GT', 'Guatemala', [route(WH_164)], { currencyCode: 'GTQ' }) : c,
    );
    const guatemala = storeWarehouses(data, storeCountry('GT'))[0];
    expect(guatemala.status).toBe('cross_pending');
    expect(guatemala.warehouse).toBeNull();
    expect(guatemala.routes[0]).toMatchObject({ blocked: 'cross_country', current: false });
  });

  it('un país que el API no lista se ve sin almacén', () => {
    const data = seededResponse();
    data.countries = data.countries.filter((c) => c.countryCode !== 'CO');
    expect(storeWarehouses(data, storeCountry('CO'))[0]).toMatchObject({ status: 'no_warehouse', warehouse: null, routes: [] });
  });
});
