/**
 * Filtros de la bandeja "Entregas a domicilio" que viven en la URL (17-nov-2026).
 *
 * Forma de entrega (`mode`): Almacén separa lo que sale por paquetería (envío a domicilio)
 * de lo que se entrega en mostrador (recoger en sucursal). El filtro lo aplica el API,
 * así los conteos de las pestañas y la paginación salen del mismo conjunto.
 *
 * País (`country`, 18-nov-2026): una pestaña por país con tienda en línea, según el país de
 * la SUCURSAL QUE SURTE. México abarca Frontera, igual que en "Tienda en línea por país".
 */
import type { CountryCode } from '@/i18n/config';
import { storeCountries, storeCountryOfCode } from '@/lib/store-country/countries';
import { DELIVERY_MODE_LABELS, type DeliveryMode } from '@/types/deliveries';

export type DeliveryModeFilter = 'all' | DeliveryMode;

export const DELIVERY_MODE_FILTER_OPTIONS: { value: DeliveryModeFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'shipping', label: DELIVERY_MODE_LABELS.shipping },
  { value: 'pickup', label: DELIVERY_MODE_LABELS.pickup },
];

/** Lee el parámetro `mode` de la URL; cualquier valor desconocido es "Todas". */
export function parseDeliveryModeFilter(raw: string | null | undefined): DeliveryModeFilter {
  return raw === 'shipping' || raw === 'pickup' ? raw : 'all';
}

/** Valor para la URL: "Todas" no deja parámetro (la liga queda limpia). */
export function deliveryModeUrlValue(filter: DeliveryModeFilter): string {
  return filter === 'all' ? '' : filter;
}

/** Valor para el API: "Todas" no manda nada (el API de antes no conoce `mode`). */
export function deliveryModeQueryValue(filter: DeliveryModeFilter): DeliveryMode | undefined {
  return filter === 'all' ? undefined : filter;
}

// ===== pestañas por país =====

export type DeliveryCountryFilter = 'all' | CountryCode;

export interface DeliveryCountryTab {
  value: DeliveryCountryFilter;
  label: string;
}

/** "Todas" y un país por tienda en línea; el país nombra también sus zonas: "México/Frontera". */
export function deliveryCountryTabs(): DeliveryCountryTab[] {
  return [
    { value: 'all', label: 'Todas' },
    ...storeCountries().map((country) => ({
      value: country.code,
      label: [country.name, ...country.zones.map((zone) => zone.name)].join('/'),
    })),
  ];
}

/**
 * Lee el parámetro `country` de la URL. Acepta el código en minúsculas y el de una zona
 * (`FN` abre México/Frontera); cualquier otro valor es "Todas".
 */
export function parseDeliveryCountryFilter(raw: string | null | undefined): DeliveryCountryFilter {
  return storeCountryOfCode(raw) ?? 'all';
}

/** Valor para la URL: "Todas" no deja parámetro. */
export function deliveryCountryUrlValue(filter: DeliveryCountryFilter): string {
  return filter === 'all' ? '' : filter;
}

/** Valor para el API: "Todas" no manda nada (el API de antes no conoce `country`). */
export function deliveryCountryQueryValue(filter: DeliveryCountryFilter): string | undefined {
  return filter === 'all' ? undefined : filter;
}

/**
 * Número de la pestaña. `null` = el API no mandó el conteo por país (uno anterior): la pestaña
 * sale sin número. El API ya junta Frontera en `MX`; si llegara suelta se suma a su país.
 */
export function deliveryCountryCount(
  counts: Record<string, number> | null | undefined,
  filter: DeliveryCountryFilter,
): number | null {
  if (!counts) return null;
  let total = 0;
  for (const [code, n] of Object.entries(counts)) {
    if (filter === 'all' || storeCountryOfCode(code) === filter) total += Number(n) || 0;
  }
  return total;
}

/** ¿La sucursal (por el código de su país o zona) entra en la pestaña? */
export function branchInDeliveryCountry(
  branchCountryCode: string | null | undefined,
  filter: DeliveryCountryFilter,
): boolean {
  return filter === 'all' || storeCountryOfCode(branchCountryCode) === filter;
}
