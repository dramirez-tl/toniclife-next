// Lógica PURA del PAÍS del carrito (contrato ecommerce 6.4 C2, decisión 4). Sin React ni DOM.
//
// Manda el país de la TIENDA elegida: toda alta al carrito lleva `country` (ISO2) y el
// API persiste `shopping_carts.country_id`. Todo lo que C2 agrega es OPCIONAL aquí
// (`cart.countryCode`, `cart.currencyCode`, códigos `CART_COUNTRY_CHANGE`,
// `CART_NO_PRICE_IN_COUNTRY`, `CHK_COUNTRY_MISMATCH`): contra un API que aún no conoce
// `country` cada función degrada al comportamiento previo (carrito sin país).

import { COUNTRIES, buildLocale, type CountryCode, type LanguageCode } from '@/i18n/config';
import { catalogErrorCode, catalogErrorDetails, catalogErrorStatus } from './errors';

/** ISO 3166-1 alfa-2 en mayúsculas, o `null` si no lo parece. */
export function normalizeCountryCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/** ISO 4217 en mayúsculas, o `null` si no lo parece (un código inválido rompería `Intl`). */
export function normalizeCurrencyCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

/**
 * Moneda con la que se pintan los importes del carrito: la del CARRITO si el API la
 * manda (C2); si no, la del país de la tienda (comportamiento previo).
 */
export function cartDisplayCurrency(cartCurrencyCode: unknown, storeCurrency: string): string {
  return normalizeCurrencyCode(cartCurrencyCode) ?? storeCurrency;
}

/**
 * País FIJADO en el carrito (ISO2) o `null`. El API de C2 manda `countryCode` SIEMPRE (si el
 * carrito no tiene país fijado es el que hoy DEDUCE: sucursal > cliente > is_usa > MX) y
 * `countryId` SOLO cuando `shopping_carts.country_id` está fijado. Un carrito sin país fijado
 * (todos los anteriores a C2, o el API previo, que no manda ninguno de los dos) conserva el
 * comportamiento de antes: por eso todo lo de C2 sale de aquí y no de `countryCode` a secas.
 */
export function pinnedCartCountry(cart: { countryId?: unknown; countryCode?: unknown } | null | undefined): string | null {
  if (!cart || typeof cart.countryId !== 'string' || !cart.countryId.trim()) return null;
  return normalizeCountryCode(cart.countryCode);
}

/** `true` = el carrito ya tiene su país FIJADO (C2): se retiran las mitigaciones del carrito sin país. */
export function cartCountryKnown(pinnedCountryCode: unknown): boolean {
  return normalizeCountryCode(pinnedCountryCode) !== null;
}

/** País con el que se resuelven envío, impuesto y topes del carrito: el suyo o, sin dato, el de la tienda. */
export function effectiveCartCountry(cartCountryCode: unknown, storeCountryCode: string): string {
  return normalizeCountryCode(cartCountryCode) ?? storeCountryCode.toUpperCase();
}

function knownCountry(code: string | null): CountryCode | null {
  return COUNTRIES.find((country) => country.code === code)?.code ?? null;
}

/** Nombre del país en el idioma de la UI; un ISO2 fuera del catálogo se muestra tal cual. */
export function countryDisplayName(code: string, lang: LanguageCode): string {
  const meta = COUNTRIES.find((country) => country.code === code.toUpperCase());
  if (!meta) return code.toUpperCase();
  return lang === 'en' ? meta.nameEn : meta.name;
}

/** Locale de la tienda de ese país en el idioma actual (`es-mx`, `en-us`…); `null` = país sin tienda. */
export function storeLocaleFor(lang: LanguageCode, countryCode: string | null | undefined): string | null {
  const country = knownCountry(normalizeCountryCode(countryCode));
  return country ? buildLocale(lang, country) : null;
}

export interface CartCountryMismatch {
  /** País del carrito (ISO2). */
  cartCountry: string;
  /** País de la tienda que se está visitando (ISO2). */
  storeCountry: string;
}

/**
 * Carrito NO vacío de un país distinto al de la tienda visitada. `null` = sin aviso
 * (carrito vacío, carrito sin país —API previo o `country_id` NULL— o mismo país).
 */
export function cartCountryMismatch(input: {
  cartCountryCode: unknown;
  storeCountryCode: string;
  itemCount: number;
}): CartCountryMismatch | null {
  const cartCountry = normalizeCountryCode(input.cartCountryCode);
  const storeCountry = normalizeCountryCode(input.storeCountryCode);
  if (!cartCountry || !storeCountry || input.itemCount <= 0 || cartCountry === storeCountry) return null;
  return { cartCountry, storeCountry };
}

function firstCountry(details: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const code = normalizeCountryCode(details[key]);
    if (code) return code;
  }
  return null;
}

const CART_COUNTRY_KEYS = ['cartCountry', 'cartCountryCode', 'currentCountry', 'currentCountryCode'] as const;
const REQUESTED_COUNTRY_KEYS = [
  'requestedCountry',
  'requestedCountryCode',
  'storeCountry',
  'storeCountryCode',
  'country',
  'countryCode',
] as const;

export interface CountryConflict {
  /** País del carrito; `null` si ni el API ni el respaldo lo dicen. */
  cartCountry: string | null;
  /** País de la tienda desde la que se intentó la operación. */
  requestedCountry: string | null;
}

/**
 * Países de un 409 `CART_COUNTRY_CHANGE` o `CHK_COUNTRY_MISMATCH`: primero `details`
 * del API; si no los trae, el respaldo (el carrito en caché y el país que se mandó).
 */
export function countryConflictOf(
  err: unknown,
  fallback: { cartCountry?: unknown; requestedCountry?: unknown } = {},
): CountryConflict {
  const details = catalogErrorDetails(err);
  return {
    cartCountry: firstCountry(details, CART_COUNTRY_KEYS) ?? normalizeCountryCode(fallback.cartCountry),
    requestedCountry: firstCountry(details, REQUESTED_COUNTRY_KEYS) ?? normalizeCountryCode(fallback.requestedCountry),
  };
}

/** 409 del checkout autenticado: el país del pedido no es el del carrito (fail-closed del API). */
export function isCheckoutCountryMismatch(err: unknown): boolean {
  return catalogErrorCode(err) === 'CHK_COUNTRY_MISMATCH';
}

// ---------------------------------------------------------------------------
// Compatibilidad con un API que aún NO conoce `country`
// ---------------------------------------------------------------------------

function errorMessages(err: unknown): string[] {
  const data = (err as { response?: { data?: unknown } } | null | undefined)?.response?.data;
  const raw = typeof data === 'object' && data !== null ? (data as { message?: unknown }).message : undefined;
  const list = Array.isArray(raw) ? raw : [raw];
  return list.filter((item): item is string => typeof item === 'string');
}

/**
 * El `ValidationPipe` global del API usa `forbidNonWhitelisted`: un API SIN C2 responde
 * 400 "property country should not exist" a un alta con `country`. Se reconoce SOLO ese
 * caso (400, sin `code`, y el texto del validador sobre esa propiedad) para reintentar
 * el alta sin país, que es exactamente la petición de antes.
 */
export function isUnknownCountryFieldError(err: unknown): boolean {
  if (catalogErrorStatus(err) !== 400 || catalogErrorCode(err) !== null) return false;
  return errorMessages(err).some((message) => /\bproperty country should not exist\b/i.test(message));
}

/** El mismo cuerpo SIN `country` (petición previa a C2). */
export function withoutCountry<T extends { country?: string }>(data: T): T {
  const rest = { ...data };
  delete rest.country;
  return rest;
}

export interface CountrySupportMemo {
  /** `true` = mandar `country`. */
  shouldSend: () => boolean;
  markUnsupported: () => void;
  reset: () => void;
}

/**
 * Memoria corta de "este API no acepta `country`": evita pagar un 400 por cada alta
 * mientras C2 no esté desplegado. Caduca sola para que una pestaña abierta durante el
 * despliegue empiece a mandar el país sin recargar.
 */
export function createCountrySupportMemo(ttlMs: number, now: () => number = Date.now): CountrySupportMemo {
  let unsupportedUntil = 0;
  return {
    shouldSend: () => now() >= unsupportedUntil,
    markUnsupported: () => {
      unsupportedUntil = now() + ttlMs;
    },
    reset: () => {
      unsupportedUntil = 0;
    },
  };
}

export interface CountryAwareAddResult<R> {
  result: R;
  /** `false` = el alta se hizo sin país (API previo a C2 o país inválido). */
  countrySent: boolean;
}

/**
 * Alta al carrito con el país de la tienda. Si el API aún no conoce `country`, UN
 * reintento sin él. Cualquier otro error (409 `CART_COUNTRY_CHANGE`, 422…) sigue su camino.
 */
export async function addWithStoreCountry<T extends { country?: string }, R>(
  data: T,
  send: (body: T) => Promise<R>,
  memo: CountrySupportMemo,
): Promise<CountryAwareAddResult<R>> {
  const country = normalizeCountryCode(data.country);
  if (!country || !memo.shouldSend()) return { result: await send(withoutCountry(data)), countrySent: false };
  try {
    return { result: await send({ ...data, country }), countrySent: true };
  } catch (err) {
    if (!isUnknownCountryFieldError(err)) throw err;
    memo.markUnsupported();
    return { result: await send(withoutCountry(data)), countrySent: false };
  }
}
