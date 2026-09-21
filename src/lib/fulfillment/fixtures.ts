// fixtures.ts — Datos de prueba de las rutas de surtido (solo para los *.test.ts).
// Espejo del sembrado real: MX→164, US→205, CO→400, GT→411; FN sin ruta (FN es fiscalmente MX).

import type { FulfillmentCountry, FulfillmentRoute, FulfillmentRoutesResponse } from '@/types/fulfillment';
import type { DraftWarehouse } from './route-draft';

export const WH_164: DraftWarehouse = {
  branchId: 'b-164',
  branchCode: '164',
  branchName: 'Irapuato Almacén General',
  branchCountryCode: 'MX',
  branchCity: 'Irapuato',
  branchIsActive: true,
};
export const WH_205: DraftWarehouse = {
  branchId: 'b-205',
  branchCode: '205',
  branchName: 'Tulsa Almacén',
  branchCountryCode: 'US',
  branchCity: 'Tulsa',
  branchIsActive: true,
};
export const WH_400: DraftWarehouse = {
  branchId: 'b-400',
  branchCode: '400',
  branchName: 'Colombia Bogotá',
  branchCountryCode: 'CO',
  branchCity: 'Bogotá',
  branchIsActive: true,
};
export const WH_411: DraftWarehouse = {
  branchId: 'b-411',
  branchCode: '411',
  branchName: 'Guatemala',
  branchCountryCode: 'GT',
  branchCity: 'Guatemala',
  branchIsActive: true,
};
export const WH_INACTIVE: DraftWarehouse = {
  branchId: 'b-999',
  branchCode: '999',
  branchName: 'Sucursal cerrada',
  branchCountryCode: 'MX',
  branchCity: null,
  branchIsActive: false,
};

export function route(
  wh: DraftWarehouse,
  priority = 1,
  overrides: Partial<FulfillmentRoute> = {},
): FulfillmentRoute {
  return {
    id: `r-${wh.branchCode}-${priority}`,
    branchId: wh.branchId,
    branchCode: wh.branchCode,
    branchName: wh.branchName,
    branchCountryCode: wh.branchCountryCode,
    branchCity: wh.branchCity,
    branchIsActive: wh.branchIsActive,
    priority,
    isActive: true,
    isCrossCountry: false,
    usable: true,
    notes: null,
    updatedAt: '2026-09-21T12:00:00.000Z',
    ...overrides,
  };
}

export function country(
  countryCode: string,
  countryName: string,
  routes: FulfillmentRoute[],
  overrides: Partial<FulfillmentCountry> = {},
): FulfillmentCountry {
  return {
    countryCode,
    countryName,
    currencyCode: 'MXN',
    fiscalCode: countryCode,
    isActive: true,
    sellableProducts: 10,
    customers: 100,
    resolvesTo: routes[0] ? { branchId: routes[0].branchId, branchCode: routes[0].branchCode } : null,
    routes,
    ...overrides,
  };
}

export function seededResponse(): FulfillmentRoutesResponse {
  return {
    version: 'v1',
    settings: { stockMode: 'full_order', crossCountry: 'block', sharedCartMode: 'home_branch' },
    countries: [
      country('MX', 'México', [route(WH_164)], { sellableProducts: 286, customers: 182276 }),
      country('FN', 'Frontera', [], { fiscalCode: 'MX', sellableProducts: 176, customers: 16219 }),
      country('US', 'Estados Unidos', [route(WH_205)], { currencyCode: 'USD', sellableProducts: 190 }),
      country('GT', 'Guatemala', [route(WH_411)], { currencyCode: 'GTQ', sellableProducts: 42 }),
      country('CO', 'Colombia', [route(WH_400)], { currencyCode: 'COP', sellableProducts: 65 }),
      country('PE', 'Perú', [], { currencyCode: 'PEN', sellableProducts: 0, customers: 0 }),
    ],
    warehouses: [],
  };
}
