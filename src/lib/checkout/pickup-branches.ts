// pickup-branches.ts — Sucursales para RECOGER del checkout de la tienda (lógica PURA, 11-nov-2026).
//
// El comprador elige en qué sucursal recoge su pedido. La lista la da el API
// (GET /checkout/pickup-branches?countryId=…): solo las sucursales de SU zona de precios
// y, si tiene carrito, en cuáles hay existencias para todo el pedido (`availability`) y qué
// le falta a las que no (`missingItems`). Aquí vive lo que la pantalla no decide por su
// cuenta:
//  1. LIMPIAR lo capturado: muchas sucursales traen "." o nada en calle, ciudad o estado.
//  2. Cómo se PINTA la sucursal: "Ciudad, Estado", el renglón de dirección, el teléfono
//     que se puede marcar y el enlace al mapa.
//  3. La BÚSQUEDA (sin acentos ni mayúsculas) y el ORDEN (las que no tienen todo, al final).
//  4. Si una sucursal se PUEDE ELEGIR, qué le falta y qué pasó con la elegida cuando la
//     lista se vuelve a pedir.
//  5. La FIRMA del carrito con la que se vuelve a pedir la disponibilidad.
//
// No toca montos ni pagos. La autoridad sigue siendo el API: al pagar responde 400
// CHK_PICKUP_BRANCH_UNAVAILABLE si la sucursal no es de las que se le ofrecen al comprador
// y 400 "Stock insuficiente para: …" si ya no hay existencias. Esto evita que el cliente
// llene todo para enterarse hasta ese momento. Mis pedidos (lib/orders/pickup-progress)
// reutiliza la limpieza y la presentación para la sucursal del pedido.

import type { PickupBranch } from '@/types/cart';

// ===== limpieza de lo capturado =====

/** Textos que en la captura significan "no hay dato". */
const PLACEHOLDER_TEXTS: ReadonlySet<string> = new Set(['n/a', 'na', 's/d', 'null', 'undefined']);

/**
 * Texto capturado de una sucursal, limpio. Lo que no trae ni una letra ni un número
 * (".", "-", "..", vacío) es "sin dato" y queda en '': así la pantalla no pinta "(.)" ni
 * comas sueltas.
 */
export function cleanBranchText(value: unknown): string {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value !== 'string') return '';
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text || !/[\p{L}\p{N}]/u.test(text)) return '';
  return PLACEHOLDER_TEXTS.has(text.toLowerCase()) ? '' : text;
}

/** Teléfono capturado, limpio. Sin al menos 7 dígitos, o con puros ceros, no es un teléfono. */
export function cleanBranchPhone(value: unknown): string {
  const text = cleanBranchText(value);
  const digits = text.replace(/\D/g, '');
  return digits.length >= 7 && !/^0+$/.test(digits) ? text : '';
}

/**
 * Enlace `tel:` del teléfono de la sucursal. Si vienen varios ("222 123 4567 / 222 765
 * 4321") se marca el primero que sea un número completo; la extensión no se marca y los
 * prefijos de larga distancia que ya no se usan (01, 044, 045) se quitan. `null` = no hay
 * un número que se pueda marcar.
 */
export function pickupPhoneHref(phone: unknown): string | null {
  const numbers = cleanBranchPhone(phone)
    .split(/\s*ext.*$/i)[0]
    .split(/[/,;]|\s+y\s+/i);
  for (const number of numbers) {
    const digits = number.replace(/\D/g, '').replace(/^(?:01|044|045)(?=\d{10}$)/, '');
    if (digits.length >= 7) return `tel:${number.trim().startsWith('+') ? '+' : ''}${digits}`;
  }
  return null;
}

/** Código postal sin la etiqueta que a veces viene capturada con él ("C.P. 72000", "CP: 72000"). */
function cleanBranchZip(value: unknown): string {
  return cleanBranchText(cleanBranchText(value).replace(/^c\.?\s*p\.?\s*:?\s*/i, ''));
}

function coordinate(value: unknown, limit: number): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  // 0 es un dato sin capturar, no una coordenada (ninguna sucursal está en el ecuador ni en Greenwich).
  return Number.isFinite(n) && n !== 0 && Math.abs(n) <= limit ? n : null;
}

// ===== la sucursal, lista para pintarse =====

/** Datos de una sucursal tal como llegan, vengan del checkout o del pedido (Mis pedidos). */
export interface BranchPlaceInput {
  name?: unknown;
  /** Clave de la sucursal: es su nombre cuando no trae uno. */
  code?: unknown;
  street?: unknown;
  city?: unknown;
  state?: unknown;
  zip?: unknown;
  phone?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  countryName?: unknown;
}

/** Datos LIMPIOS de una sucursal: lo que no hay queda en '' (o `null` en las coordenadas). */
export interface BranchPlace {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  /** Las dos coordenadas o ninguna. */
  latitude: number | null;
  longitude: number | null;
  /** Nombre del país; solo se usa para ubicarla en el mapa por dirección. */
  country: string;
}

export function branchPlace(raw: BranchPlaceInput | null | undefined): BranchPlace {
  const latitude = coordinate(raw?.latitude, 90);
  const longitude = coordinate(raw?.longitude, 180);
  const located = latitude !== null && longitude !== null;
  return {
    name: cleanBranchText(raw?.name) || cleanBranchText(raw?.code),
    street: cleanBranchText(raw?.street),
    city: cleanBranchText(raw?.city),
    state: cleanBranchText(raw?.state),
    zip: cleanBranchZip(raw?.zip),
    phone: cleanBranchPhone(raw?.phone),
    latitude: located ? latitude : null,
    longitude: located ? longitude : null,
    country: cleanBranchText(raw?.countryName),
  };
}

/** Sucursal del checkout (GET /checkout/pickup-branches), limpia. */
export function pickupPlace(branch: PickupBranch): BranchPlace {
  return branchPlace({
    name: branch.name,
    code: branch.code,
    street: branch.addressStreet,
    city: branch.addressCity,
    state: branch.addressState,
    zip: branch.addressZip,
    phone: branch.phone,
    latitude: branch.latitude,
    longitude: branch.longitude,
    countryName: branch.countryName,
  });
}

/**
 * "Ciudad, Estado" sin huecos ni comas sueltas. Si la ciudad ya trae el estado al final
 * ("Tehuacán, Puebla" + "Puebla") no se repite; "Puebla, Puebla" sí son dos datos.
 */
export function pickupCityState(place: Pick<BranchPlace, 'city' | 'state'>): string {
  const city = foldSearchText(place.city);
  const state = foldSearchText(place.state);
  const repeated = !!state && city !== state && city.endsWith(` ${state}`);
  return [place.city, repeated ? '' : place.state].filter(Boolean).join(', ');
}

/**
 * Dirección completa en un renglón: "Av. Juárez 123, Tehuacán, Puebla, C. P. 75700". Lo
 * que falta no deja hueco; '' si la sucursal no trae nada. `formatZip` pone la etiqueta
 * del código postal en el idioma de la pantalla.
 */
export function pickupAddressLine(
  place: Pick<BranchPlace, 'street' | 'city' | 'state' | 'zip'>,
  formatZip: (zip: string) => string = (zip) => `C. P. ${zip}`,
): string {
  return [place.street, pickupCityState(place), place.zip ? formatZip(place.zip) : ''].filter(Boolean).join(', ');
}

const MAPS_SEARCH_URL = 'https://www.google.com/maps/search/?api=1&query=';

/**
 * Enlace a Google Maps de la sucursal: por coordenadas si las tiene; si no, por su
 * dirección (hace falta la calle: con solo la ciudad el mapa mostraría la ciudad, no la
 * sucursal). `null` = no hay con qué ubicarla y no se ofrece el enlace.
 */
export function pickupMapUrl(
  place: Pick<BranchPlace, 'street' | 'city' | 'state' | 'zip'> &
    Partial<Pick<BranchPlace, 'latitude' | 'longitude' | 'country'>>,
): string | null {
  if (typeof place.latitude === 'number' && typeof place.longitude === 'number') {
    return `${MAPS_SEARCH_URL}${encodeURIComponent(`${place.latitude},${place.longitude}`)}`;
  }
  if (!place.street) return null;
  const address = [place.street, pickupCityState(place), place.zip, place.country].filter(Boolean).join(', ');
  return `${MAPS_SEARCH_URL}${encodeURIComponent(address)}`;
}

// ===== búsqueda =====

/** Sin acentos, mayúsculas, signos ni espacios de sobra: "  Tehuacán, PUE. " = "tehuacan pue". */
export function foldSearchText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * ¿La sucursal coincide con lo que se escribió? Se busca en su nombre, su clave, la
 * ciudad, el estado y el código postal; cada palabra escrita debe aparecer en alguno
 * ("puebla centro", "72000", "tehuacan"). Sin texto, todas coinciden.
 */
export function matchesPickupSearch(branch: PickupBranch, query: string | null | undefined): boolean {
  const words = foldSearchText(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const place = pickupPlace(branch);
  const haystack = foldSearchText(
    [place.name, cleanBranchText(branch.code), place.city, place.state, place.zip].join(' '),
  );
  return words.every((word) => haystack.includes(word));
}

export function filterPickupBranches<T extends PickupBranch>(
  branches: readonly T[] | null | undefined,
  query: string | null | undefined,
): T[] {
  return (branches ?? []).filter((branch) => matchesPickupSearch(branch, query));
}

// ===== disponibilidad =====

/**
 * ¿Se puede elegir? Solo NO cuando el API dijo expresamente que ahí no alcanzan las
 * existencias. Sin `availability` (no se revisó, o es un API anterior) se puede.
 */
export function isPickupBranchSelectable(branch: Pick<PickupBranch, 'availability'>): boolean {
  return branch.availability !== 'unavailable';
}

/**
 * Orden en que se pintan: las que no tienen todo el pedido, al final. Dentro de cada
 * grupo se respeta el orden del API (estado, ciudad y nombre).
 */
export function sortPickupBranches<T extends Pick<PickupBranch, 'availability'>>(
  branches: readonly T[] | null | undefined,
): T[] {
  const list = branches ?? [];
  return [...list.filter(isPickupBranchSelectable), ...list.filter((b) => !isPickupBranchSelectable(b))];
}

/** Hay sucursales, pero NINGUNA tiene todo el pedido: se sugiere envío a domicilio o ajustar el carrito. */
export function noPickupBranchAvailable(
  branches: readonly Pick<PickupBranch, 'availability'>[] | null | undefined,
): boolean {
  return !!branches && branches.length > 0 && branches.every((b) => !isPickupBranchSelectable(b));
}

export interface MissingItemsSummary {
  /** Los primeros nombres (hasta `max`). */
  names: string[];
  /** Cuántos más faltan además de esos ("y N más"). */
  more: number;
}

/**
 * Lo que le falta a una sucursal para surtir el pedido, listo para "Falta: A, B y 2 más".
 * `null` = el API no dijo qué falta (solo se pinta la etiqueta).
 */
export function missingItemsSummary(items: readonly unknown[] | null | undefined, max = 3): MissingItemsSummary | null {
  const names = [...new Set((Array.isArray(items) ? items : []).map(cleanBranchText).filter(Boolean))];
  if (names.length === 0) return null;
  return { names: names.slice(0, max), more: Math.max(0, names.length - max) };
}

// ===== la sucursal elegida =====

export function findPickupBranch<T extends Pick<PickupBranch, 'id'>>(
  branches: readonly T[] | null | undefined,
  id: string | null | undefined,
): T | undefined {
  return id ? (branches ?? []).find((branch) => branch.id === id) : undefined;
}

/**
 * Por qué la sucursal elegida ya no sirve: `gone` = dejó de ofrecerse (ya no viene en la
 * lista); `unavailable` = sigue en la lista pero ya no tiene existencias suficientes.
 */
export type PickupSelectionProblem = { kind: 'gone' } | { kind: 'unavailable'; name: string };

/**
 * Qué pasó con la sucursal elegida cuando la lista se volvió a pedir. `null` = se puede
 * seguir con ella (o no hay sucursal elegida, o la lista aún no llega). Con un problema,
 * la pantalla quita la selección y avisa.
 */
export function pickupSelectionProblem(
  branches: readonly PickupBranch[] | null | undefined,
  selectedId: string | null | undefined,
): PickupSelectionProblem | null {
  if (!selectedId || !branches) return null;
  const chosen = findPickupBranch(branches, selectedId);
  if (!chosen) return { kind: 'gone' };
  return isPickupBranchSelectable(chosen) ? null : { kind: 'unavailable', name: pickupPlace(chosen).name };
}

// ===== carrito =====

/**
 * Firma del carrito: qué productos lleva y cuántas piezas de cada uno. Va en la clave de
 * la consulta de sucursales para que la disponibilidad se vuelva a pedir cuando el
 * carrito cambia (aquí o en otra sesión de la misma cuenta). No depende del orden de las
 * líneas, y dos líneas del mismo producto (otra personalización) suman. Vacío = ''.
 */
export function pickupCartSignature(
  items: ReadonlyArray<{ productId: string; quantity: number | string }> | null | undefined,
): string {
  const units = new Map<string, number>();
  for (const item of items ?? []) {
    const quantity = Number(item?.quantity);
    if (!item?.productId || !Number.isFinite(quantity) || quantity <= 0) continue;
    units.set(item.productId, (units.get(item.productId) ?? 0) + quantity);
  }
  return [...units.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([productId, quantity]) => `${productId}:${quantity}`)
    .join('|');
}

// ===== al pagar =====

/** La sucursal elegida no es de las que el API le ofrece a ese comprador. */
export const PICKUP_BRANCH_UNAVAILABLE_CODE = 'CHK_PICKUP_BRANCH_UNAVAILABLE';

/** Lo que se lee del error del API al crear el pedido. */
export interface CheckoutFailure {
  status: number | null;
  code: string | null;
  message: string | string[] | null | undefined;
}

/**
 * ¿El API rechazó el pedido por la SUCURSAL para recoger? Un 400 con el código de
 * sucursal no disponible, o un 400 "Stock insuficiente para: …" estando en "recoger" (ahí
 * las existencias que cuentan son las de la sucursal). El pedido no se creó: la pantalla
 * regresa al paso de envío, vuelve a pedir las sucursales y muestra el mensaje del API.
 */
export function isPickupCheckoutRejection(failure: CheckoutFailure, isPickup: boolean): boolean {
  if (failure.status !== 400) return false;
  if (failure.code === PICKUP_BRANCH_UNAVAILABLE_CODE) return true;
  const message = Array.isArray(failure.message) ? failure.message.join(', ') : (failure.message ?? '');
  return isPickup && /^stock insuficiente/i.test(message.trim());
}
