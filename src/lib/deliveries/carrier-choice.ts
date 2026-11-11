// carrier-choice.ts — Elegir la paquetería de un envío desde el catálogo (lógica PURA).
//
// Almacén tecleaba la paquetería en cada envío. Con el catálogo por país
// (`GET /pos/deliveries/carriers`, mig 200) se le ofrecen las del país del envío, con la
// predeterminada ya elegida cuando el envío no tiene ninguna, y "Otra…" para escribir
// una que no esté en la lista. Lo que se guarda sigue siendo el NOMBRE, como texto.
//
// Sin catálogo (API anterior, migración pendiente o ninguna registrada) la lista llega
// vacía y la pantalla conserva el campo de texto de siempre.

import { COUNTRIES } from '@/i18n/config';
import { carrierKey } from '@/lib/store-country/carriers';
import { storeCountryOfCode } from '@/lib/store-country/countries';
import type { DeliveryCarrierOption } from '@/types/deliveries';

/** Valor del selector para "Otra…" (no es el id de ninguna paquetería). */
export const OTHER_CARRIER = '__other__';

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Lee `{ carriers: [...] }` (o la lista suelta) sin fiarse de su forma; lo ilegible se ignora. */
export function normalizeDeliveryCarriers(raw: unknown): DeliveryCarrierOption[] {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'object' && raw !== null && Array.isArray((raw as { carriers?: unknown }).carriers)
      ? ((raw as { carriers: unknown[] }).carriers)
      : [];
  const seen = new Set<string>();
  const options: DeliveryCarrierOption[] = [];
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue;
    const row = item as Record<string, unknown>;
    const id = text(row.id);
    const name = text(row.name);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    options.push({ id, name, countryCode: text(row.countryCode).toUpperCase(), isDefault: row.isDefault === true });
  }
  return options;
}

/**
 * País de la TIENDA al que pertenece un envío: el de la dirección (Frontera cuenta como
 * México) o, si la dirección no trae país, el de la moneda de la venta. `null` = no se
 * pudo saber.
 */
export function deliveryStoreCountry(input: {
  addressCountryCode?: string | null;
  currencyCode?: string | null;
}): string | null {
  const byAddress = storeCountryOfCode(input.addressCountryCode);
  if (byAddress) return byAddress;
  const currency = text(input.currencyCode).toUpperCase();
  return currency ? (COUNTRIES.find((c) => c.currency === currency)?.code ?? null) : null;
}

/**
 * Paqueterías que se ofrecen para un envío: las de su país, con la predeterminada
 * primero. Si no se sabe el país se ofrecen todas, una vez cada nombre y sin
 * predeterminada (no se adivina cuál toca). Lista vacía = se escribe a mano.
 */
export function carriersForDelivery(
  options: readonly DeliveryCarrierOption[],
  storeCountryCode: string | null,
): DeliveryCarrierOption[] {
  if (storeCountryCode) {
    const code = storeCountryCode.trim().toUpperCase();
    return options
      .filter((o) => o.countryCode === code)
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  }
  const seen = new Set<string>();
  const all: DeliveryCarrierOption[] = [];
  for (const option of options) {
    const key = carrierKey(option.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    all.push({ ...option, isDefault: false });
  }
  return all;
}

export interface CarrierChoice {
  /** `text` = campo de texto de siempre (no hay catálogo para este envío); `select` = lista + "Otra…". */
  mode: 'text' | 'select';
  /** Valor del selector: id de la paquetería, `OTHER_CARRIER` o '' (nada elegido). */
  selectValue: string;
  /** Se muestra el campo para escribir otra paquetería. */
  showOtherInput: boolean;
  /** Nombre que se guardaría (sin recortar: es lo que se ve en el campo de texto). */
  carrier: string;
}

/**
 * Qué se muestra y qué se guardaría.
 *  - `typed` = lo que la persona eligió o escribió; `null` = no ha tocado el campo.
 *  - `other` = pidió "Otra…" (true), eligió una de la lista (false) o no ha tocado (null).
 * Sin tocar: sale la paquetería que ya tenía el envío; si no tenía, la predeterminada
 * del país. Una paquetería guardada que no está en el catálogo aparece como "Otra…".
 */
export function resolveCarrierChoice(input: {
  options: readonly DeliveryCarrierOption[];
  saved: string | null | undefined;
  typed: string | null;
  other: boolean | null;
}): CarrierChoice {
  const saved = input.saved ?? '';
  if (input.options.length === 0) {
    return { mode: 'text', selectValue: '', showOtherInput: false, carrier: input.typed ?? saved };
  }
  const fallback = saved.trim() ? saved : (input.options.find((o) => o.isDefault)?.name ?? '');
  const carrier = input.typed ?? fallback;
  const key = carrierKey(carrier);
  const matched = key ? input.options.find((o) => carrierKey(o.name) === key) : undefined;
  const other = input.other ?? (carrier.trim() !== '' && !matched);
  if (other) return { mode: 'select', selectValue: OTHER_CARRIER, showOtherInput: true, carrier };
  return { mode: 'select', selectValue: matched?.id ?? '', showOtherInput: false, carrier: matched ? carrier : '' };
}

/** Lo que cambia al elegir en el selector: una paquetería de la lista o "Otra…" (que empieza en blanco). */
export function pickCarrier(
  options: readonly DeliveryCarrierOption[],
  selectValue: string,
): { typed: string; other: boolean } {
  if (selectValue === OTHER_CARRIER) return { typed: '', other: true };
  return { typed: options.find((o) => o.id === selectValue)?.name ?? '', other: false };
}
