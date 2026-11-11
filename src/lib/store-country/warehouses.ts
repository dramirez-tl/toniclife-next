// warehouses.ts — Almacenes que surten a un país de la tienda, de solo lectura (lógica PURA).
//
// Resume lo que guarda la pantalla "Almacenes y envíos" (`GET /fulfillment/routes`)
// para un país de la tienda y sus zonas: México se ve como México y Frontera por
// separado, cada uno con su lista en orden de preferencia y cuál surte hoy. Las reglas
// (qué ruta sirve, cuál resuelve) son las de `lib/fulfillment/route-draft`: aquí no se
// repiten, solo se leen. Para cambiarlas está esa pantalla.

import {
  buildRoutingContext,
  countryStatus,
  draftFromServer,
  isCrossCountryRoute,
  resolveCountry,
  type CountryShippingStatus,
  type DraftRoute,
} from '@/lib/fulfillment/route-draft';
import type { FulfillmentRoutesResponse } from '@/types/fulfillment';
import type { StoreCountryInfo } from './countries';
import type { WarehouseReadiness } from './readiness';

/** Por qué un almacén de la lista no surte hoy. */
export type WarehouseBlock = 'paused' | 'branch_inactive' | 'cross_country';

export interface StoreWarehouseRoute {
  branchId: string;
  /** "164 · Irapuato Almacén General". */
  label: string;
  city: string | null;
  /** Lugar en la lista (1 = principal). */
  position: number;
  /** null = puede surtir. */
  blocked: WarehouseBlock | null;
  /** Es el que surte hoy: el primero de la lista que puede. */
  current: boolean;
}

export interface StoreWarehousePlace {
  code: string;
  name: string;
  /** Zona sin tienda propia (Frontera). */
  isZone: boolean;
  status: CountryShippingStatus;
  /** Almacén que surte hoy; null si ninguno. */
  warehouse: string | null;
  routes: StoreWarehouseRoute[];
}

const label = (r: Pick<DraftRoute, 'branchCode' | 'branchName'>): string => `${r.branchCode} · ${r.branchName}`;

/** El país de la tienda y sus zonas, cada uno con sus almacenes en orden de preferencia. */
export function storeWarehouses(data: FulfillmentRoutesResponse, country: StoreCountryInfo): StoreWarehousePlace[] {
  const draft = draftFromServer(data);
  const ctx = buildRoutingContext(data);
  const places = [
    { code: country.code as string, name: country.name, isZone: false },
    ...country.zones.map((z) => ({ code: z.code, name: z.name, isZone: true })),
  ];
  return places.map((place) => {
    // Un país que el API no lista (no existe o está desactivado) se ve como sin almacén.
    const routes = draft.countries[place.code] ?? [];
    const resolved = resolveCountry(routes, place.code, ctx);
    return {
      ...place,
      status: countryStatus(routes, place.code, ctx),
      warehouse: resolved ? label(resolved) : null,
      routes: routes.map((route, index) => ({
        branchId: route.branchId,
        label: label(route),
        city: route.branchCity,
        position: index + 1,
        blocked: !route.isActive
          ? 'paused'
          : !route.branchIsActive
            ? 'branch_inactive'
            : ctx.crossCountry !== 'allow' && isCrossCountryRoute(route, place.code, ctx)
              ? 'cross_country'
              : null,
        current: resolved?.branchId === route.branchId,
      })),
    };
  });
}

/** Lo que "¿Lista para vender?" necesita de cada lugar. */
export function warehouseReadiness(places: readonly StoreWarehousePlace[]): WarehouseReadiness[] {
  return places.map(({ code, name, isZone, status, warehouse }) => ({ code, name, isZone, status, warehouse }));
}

export const WAREHOUSE_BLOCK_LABELS: Record<WarehouseBlock, string> = {
  paused: 'En pausa',
  branch_inactive: 'Sucursal desactivada',
  cross_country: 'De otro país: aún no surte',
};
