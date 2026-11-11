// countries.ts — Países de la tienda en línea vistos desde el admin (lógica PURA).
//
// "Tienda en línea por país" reúne, por país, lo que la tienda necesita para vender.
// Los países con tienda son los de `i18n/config` (México, Estados Unidos, Colombia y
// Guatemala). Para el negocio "México" es UN solo país: México + Frontera (la zona de
// precios `FN`, sin tienda propia, que compra y recibe en la tienda de México).

import { COUNTRIES, type CountryCode } from '@/i18n/config';

/** Zona de precios que vive dentro de la tienda de un país (hoy solo Frontera en México). */
export interface StoreZone {
  code: string;
  name: string;
}

export interface StoreCountryInfo {
  code: CountryCode;
  name: string;
  flag: string;
  /** Moneda del país según `i18n/config` (la que dice el API manda si difiere). */
  currency: string;
  /** La tienda de ese país está publicada (`ready` en `i18n/config`); si no, sale como "próximamente". */
  published: boolean;
  /** Zonas que compran y reciben en esta tienda. */
  zones: StoreZone[];
}

const ZONES: Partial<Record<CountryCode, StoreZone[]>> = {
  MX: [{ code: 'FN', name: 'Frontera' }],
};

export function storeCountries(): StoreCountryInfo[] {
  return COUNTRIES.map((c) => ({
    code: c.code,
    name: c.name,
    flag: c.flag,
    currency: c.currency,
    published: c.ready,
    zones: ZONES[c.code] ?? [],
  }));
}

const norm = (code: string | null | undefined): string => (code ?? '').trim().toUpperCase();

export function isStoreCountryCode(code: string | null | undefined): code is CountryCode {
  const upper = norm(code);
  return COUNTRIES.some((c) => c.code === upper);
}

/** País de la tienda por código; uno desconocido (o vacío) cae en el primero (México). */
export function storeCountry(code: string | null | undefined): StoreCountryInfo {
  const all = storeCountries();
  const upper = norm(code);
  return all.find((c) => c.code === upper) ?? all[0];
}

/**
 * País de la TIENDA al que pertenece un código de país o de zona: `FN` → `MX`.
 * `null` si no es de ninguna tienda (El Salvador, vacío…).
 */
export function storeCountryOfCode(code: string | null | undefined): CountryCode | null {
  const upper = norm(code);
  if (!upper) return null;
  for (const country of storeCountries()) {
    if (country.code === upper || country.zones.some((z) => z.code === upper)) return country.code;
  }
  return null;
}

/** "México (incluye Frontera)": cómo se nombra el país cuando abarca zonas. */
export function storeCountryScope(country: Pick<StoreCountryInfo, 'name' | 'zones'>): string {
  if (country.zones.length === 0) return country.name;
  return `${country.name} (incluye ${country.zones.map((z) => z.name).join(' y ')})`;
}

// ===== cobro en línea =====

/**
 * Con qué se cobra en cada país. Espejo de lo que hace el API al crear el pedido: una
 * cuenta de Stripe por país (México y Frontera → `mx`, Estados Unidos → `us`); el resto
 * no tiene con qué cobrar. Colombia usará Mercado Pago cuando se conecte.
 */
export type PaymentPlan =
  | { kind: 'stripe'; account: 'mx' | 'us'; accountName: string }
  | { kind: 'planned'; gatewayName: string }
  | { kind: 'none' };

const PAYMENT_PLAN: Record<CountryCode, PaymentPlan> = {
  MX: { kind: 'stripe', account: 'mx', accountName: 'México' },
  US: { kind: 'stripe', account: 'us', accountName: 'Estados Unidos' },
  CO: { kind: 'planned', gatewayName: 'Mercado Pago' },
  GT: { kind: 'none' },
};

export function paymentPlan(code: CountryCode): PaymentPlan {
  return PAYMENT_PLAN[code] ?? { kind: 'none' };
}

/** Cuentas de Stripe con llaves en el servidor (`GET /checkout/stripe-config`). */
export interface StripeAccountsState {
  mx: boolean;
  us: boolean;
}

/** Lee `accounts.mx.enabled` / `accounts.us.enabled`; un API sin `accounts` usa `enabled` para México. */
export function stripeAccountsState(raw: unknown): StripeAccountsState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const body = raw as { enabled?: unknown; accounts?: Record<string, { enabled?: unknown } | undefined> };
  const accounts = typeof body.accounts === 'object' && body.accounts !== null ? body.accounts : null;
  if (!accounts) return typeof body.enabled === 'boolean' ? { mx: body.enabled, us: false } : null;
  return { mx: accounts.mx?.enabled === true, us: accounts.us?.enabled === true };
}
