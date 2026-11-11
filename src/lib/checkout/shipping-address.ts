// shipping-address.ts — Dirección de envío del checkout de la tienda (lógica PURA, 10-nov-2026).
//
// Tres cosas que la pantalla no decide por su cuenta:
//  1. Direcciones GUARDADAS (GET /checkout/addresses): cuáles se ofrecen en la tienda de
//     un país, cuál queda elegida y a cuál le faltan datos antes de poder usarse.
//  2. El FORMULARIO por país: los campos de `lib/address-forms` (los mismos del alta en
//     POS, portal y admin) con los topes del DTO del checkout, y el estado / departamento
//     del catálogo del API (GET /states) en vez de listas fijas.
//  3. El CUERPO del pedido: dirección guardada (`shippingAddressId` + quién recibe) o
//     dirección nueva (`shippingAddress` + `saveShippingAddress`).
//
// No toca montos ni pagos. La autoridad sigue siendo el API (422 CHK_ADDRESS_NOT_USABLE
// si la guardada es de otro país o le faltan datos): esto evita ofrecerla tal cual y que
// el cliente se entere hasta el momento de pagar.

import { getAddressForm, type AddressFieldSpec } from '@/lib/address-forms';
import type { AuthenticatedCheckoutInput, CheckoutAddress, SavedAddress } from '@/types/cart';

export type AddressFieldKey = AddressFieldSpec['key'];
/** Campos del formulario: los del país más el estado / departamento. */
export type AddressFormKey = AddressFieldKey | 'state';

/** Lo que se captura de una dirección (quién recibe va aparte). */
export type AddressDraft = Record<AddressFormKey, string>;

export const EMPTY_ADDRESS_DRAFT: AddressDraft = {
  street: '',
  extNumber: '',
  intNumber: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  reference: '',
};

/** Topes de `CheckoutAddressDto` del API: el alta admite calles y referencias más largas que el checkout. */
const CHECKOUT_MAX_LENGTH: Record<AddressFormKey, number> = {
  street: 200,
  extNumber: 20,
  intNumber: 20,
  neighborhood: 100,
  city: 100,
  state: 100,
  zipCode: 10,
  reference: 255,
};

// ===== helpers =====

function text(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Sin acentos, mayúsculas ni espacios de sobra: "  PUEBLA " = "Puebla", "Mexico" = "México". */
function fold(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// ===== respuesta del API =====

/**
 * Lista limpia de direcciones guardadas. Lee SOLO las claves del contrato; lo que no sea
 * una lista de objetos con `id` se descarta. Contra un API anterior (filas crudas, sin
 * `isComplete` ni `postalCode`) todas quedan como incompletas: se pueden usar para
 * prellenar el formulario, nunca tal cual.
 */
export function normalizeSavedAddresses(raw: unknown): SavedAddress[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: SavedAddress[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const row = item as Record<string, unknown>;
    const id = text(row.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      street: text(row.street),
      extNumber: text(row.extNumber),
      intNumber: text(row.intNumber),
      neighborhood: text(row.neighborhood),
      city: text(row.city),
      state: text(row.state),
      postalCode: text(row.postalCode),
      countryId: text(row.countryId),
      countryCode: text(row.countryCode)?.toUpperCase() ?? null,
      phone: text(row.phone),
      reference: text(row.reference),
      isDefault: row.isDefault === true,
      isComplete: row.isComplete === true,
      createdAt: text(row.createdAt),
    });
  }
  return out;
}

// ===== país =====

/** Zonas de precio que compran y reciben en la tienda de otro país: Frontera MX-USA (`FN`) es México. El API compara igual (país fiscal). */
const STORE_COUNTRY_OF_ZONE: Record<string, string> = { FN: 'MX' };

function storeCountryOf(code: string | null | undefined): string | null {
  const upper = (code ?? '').trim().toUpperCase();
  if (!upper) return null;
  return STORE_COUNTRY_OF_ZONE[upper] ?? upper;
}

/**
 * ¿La dirección es del país de la tienda? Una dirección SIN país guardado se deja pasar
 * (el API tampoco la rechaza por país); el código postal la filtra después.
 */
export function isStoreCountryAddress(
  addressCountryCode: string | null | undefined,
  storeCountryCode: string | null | undefined,
): boolean {
  const address = storeCountryOf(addressCountryCode);
  const store = storeCountryOf(storeCountryCode);
  return !address || !store || address === store;
}

// ===== estados / departamentos =====

/** Lo que se lee del catálogo `GET /states?countryId=`. */
export interface StateCatalogEntry {
  code: string;
  name: string;
}

export interface StateOption {
  value: string;
  label: string;
}

/**
 * Países donde el estado viaja como CÓDIGO de 2 letras y no como nombre. En EE. UU. el
 * API busca el sales tax del pedido por ese código (`tax_rules.state_codes`): con "Texas"
 * no encuentra la regla de TX y el pedido saldría sin impuesto. En el resto viaja el
 * nombre, como siempre.
 */
const STATE_AS_CODE: ReadonlySet<string> = new Set(['US']);

export function stateValueIsCode(countryCode: string | null | undefined): boolean {
  return STATE_AS_CODE.has((countryCode ?? '').trim().toUpperCase());
}

function stateValueOf(entry: StateCatalogEntry, countryCode: string): string {
  return stateValueIsCode(countryCode) ? entry.code.trim().toUpperCase() : entry.name.trim();
}

/**
 * Opciones del selector de estado. Donde viaja el nombre, un estado ya capturado que no
 * está en el catálogo (capturas antiguas) se conserva como opción para no perderlo.
 */
export function stateSelectOptions(
  states: readonly StateCatalogEntry[] | null | undefined,
  countryCode: string,
  current = '',
): StateOption[] {
  const seen = new Set<string>();
  const options: StateOption[] = [];
  for (const entry of states ?? []) {
    const value = stateValueOf(entry, countryCode);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: entry.name.trim() || value });
  }
  const kept = current.trim();
  if (kept && options.length > 0 && !seen.has(kept) && !stateValueIsCode(countryCode)) {
    options.unshift({ value: kept, label: kept });
  }
  return options;
}

/** Valor del catálogo para un estado escrito como sea ("PUEBLA", "tx", "Texas"); `null` si no está. */
export function matchStateValue(
  states: readonly StateCatalogEntry[] | null | undefined,
  raw: string | null | undefined,
  countryCode: string,
): string | null {
  const wanted = fold(raw);
  if (!wanted) return null;
  for (const entry of states ?? []) {
    if (fold(entry.name) === wanted || fold(entry.code) === wanted) return stateValueOf(entry, countryCode) || null;
  }
  return null;
}

// ===== formulario por país =====

/** Ancho del campo en la rejilla del formulario (6 columnas). */
export type AddressFieldSpan = 'wide' | 'companion' | 'half' | 'third' | 'full';

export interface CheckoutAddressField {
  key: AddressFormKey;
  required: boolean;
  maxLength: number;
  placeholder?: string;
  /** RegExp (source) que debe cumplir el valor si se captura. */
  pattern?: string;
  span: AddressFieldSpan;
}

/** Campos cortos que comparten renglón con la calle (número exterior en MX, depto en US, zona en GT). */
const STREET_COMPANIONS: ReadonlySet<AddressFormKey> = new Set<AddressFormKey>(['extNumber', 'intNumber', 'neighborhood']);
/** Renglón de ubicación: ciudad, estado y código postal, a tercios. */
const PLACE_ROW: ReadonlySet<AddressFormKey> = new Set<AddressFormKey>(['city', 'state', 'zipCode']);

function spanOf(keys: readonly AddressFormKey[], index: number): AddressFieldSpan {
  const key = keys[index];
  if (key === 'reference') return 'full';
  if (key === 'street') return STREET_COMPANIONS.has(keys[index + 1]) ? 'wide' : 'full';
  if (keys[index - 1] === 'street' && STREET_COMPANIONS.has(key)) return 'companion';
  if (PLACE_ROW.has(key)) return 'third';
  return 'half';
}

/**
 * Campos del formulario de envío del país, en el orden en que se capturan: los de
 * `address-forms` + el estado justo después de la ciudad + las referencias al final.
 *  - El código postal es obligatorio en TODOS los países: el API lo exige en un pedido
 *    con envío, aunque el alta lo deje opcional (Guatemala, Colombia).
 *  - Las longitudes se recortan a las del DTO del checkout.
 */
export function checkoutAddressFields(countryCode: string | null | undefined): CheckoutAddressField[] {
  const fields: Omit<CheckoutAddressField, 'span'>[] = [];
  for (const spec of getAddressForm(countryCode).fields) {
    if (spec.key === 'reference') continue;
    fields.push({
      key: spec.key,
      required: spec.key === 'zipCode' ? true : spec.required,
      maxLength: Math.min(spec.maxLength ?? CHECKOUT_MAX_LENGTH[spec.key], CHECKOUT_MAX_LENGTH[spec.key]),
      ...(spec.placeholder ? { placeholder: spec.placeholder } : {}),
      ...(spec.pattern ? { pattern: spec.pattern } : {}),
    });
    if (spec.key === 'city') fields.push({ key: 'state', required: true, maxLength: CHECKOUT_MAX_LENGTH.state });
  }
  if (!fields.some((f) => f.key === 'state')) {
    fields.push({ key: 'state', required: true, maxLength: CHECKOUT_MAX_LENGTH.state });
  }
  fields.push({ key: 'reference', required: false, maxLength: CHECKOUT_MAX_LENGTH.reference });
  const keys = fields.map((f) => f.key);
  return fields.map((f, i) => ({ ...f, span: spanOf(keys, i) }));
}

export interface AddressDraftError {
  field: AddressFormKey;
  reason: 'required' | 'pattern';
}

/** Primer problema de la dirección capturada (en el orden del formulario) o `null` si se puede continuar. */
export function validateAddressDraft(countryCode: string | null | undefined, draft: AddressDraft): AddressDraftError | null {
  for (const field of checkoutAddressFields(countryCode)) {
    const value = (draft[field.key] ?? '').trim();
    if (field.required && !value) return { field: field.key, reason: 'required' };
    if (value && field.pattern && !new RegExp(field.pattern).test(value)) return { field: field.key, reason: 'pattern' };
  }
  return null;
}

/** ¿El código postal cumple el formato del país? Vacío nunca. Un país sin formato definido acepta cualquiera. */
export function isValidPostalCode(countryCode: string | null | undefined, value: string | null | undefined): boolean {
  const zip = (value ?? '').trim();
  if (!zip) return false;
  const pattern = getAddressForm(countryCode).fields.find((f) => f.key === 'zipCode')?.pattern;
  return !pattern || new RegExp(pattern).test(zip);
}

// ===== direcciones guardadas =====

export type SavedAddressStatus =
  /** Se puede usar tal cual (`shippingAddressId`). */
  | 'ready'
  /** Le faltan o le fallan datos: se ofrece para COMPLETARLA en el formulario. */
  | 'incomplete'
  /** Es de otro país: no se ofrece en esta tienda. */
  | 'other_country';

export interface SavedAddressContext {
  /** País de la tienda (ISO2). */
  countryCode: string;
  /** Catálogo de estados del país; sin él no se revisa el estado guardado. */
  states?: readonly StateCatalogEntry[] | null;
  /** Guardadas que el API rechazó al pagar (422 CHK_ADDRESS_NOT_USABLE): ya no se ofrecen tal cual. */
  rejectedIds?: readonly string[];
}

/** Por qué una guardada no se puede usar tal cual: le FALTAN datos o hay que REVISAR los que tiene. */
export type SavedAddressIssue = 'missing' | 'review';

function inspectSavedAddress(
  address: SavedAddress,
  ctx: SavedAddressContext,
): { status: SavedAddressStatus; issue?: SavedAddressIssue } {
  if (!isStoreCountryAddress(address.countryCode, ctx.countryCode)) return { status: 'other_country' };
  if (!address.isComplete || !address.street || !address.city || !address.state || !address.postalCode) {
    return { status: 'incomplete', issue: 'missing' };
  }
  if (ctx.rejectedIds?.includes(address.id)) return { status: 'incomplete', issue: 'review' };
  if (!isValidPostalCode(ctx.countryCode, address.postalCode)) return { status: 'incomplete', issue: 'review' };
  // Donde el estado viaja como código (EE. UU.), un estado guardado por nombre ("Texas")
  // dejaría el pedido sin sales tax: se pide confirmarlo en el formulario.
  if (stateValueIsCode(ctx.countryCode) && ctx.states && ctx.states.length > 0) {
    const code = address.state.trim().toUpperCase();
    if (!ctx.states.some((entry) => entry.code.trim().toUpperCase() === code)) {
      return { status: 'incomplete', issue: 'review' };
    }
  }
  return { status: 'ready' };
}

export function savedAddressStatus(address: SavedAddress, ctx: SavedAddressContext): SavedAddressStatus {
  return inspectSavedAddress(address, ctx).status;
}

export interface SavedAddressOption {
  address: SavedAddress;
  status: Exclude<SavedAddressStatus, 'other_country'>;
  /** Solo en las incompletas: qué se le dice al cliente. */
  issue?: SavedAddressIssue;
}

/**
 * Direcciones que se ofrecen en la tienda del país: primero las que se pueden usar tal
 * cual y después las incompletas, cada grupo en el orden del API (predeterminada y más
 * recientes primero). Las de otro país no salen.
 */
export function savedAddressOptions(
  addresses: readonly SavedAddress[] | null | undefined,
  ctx: SavedAddressContext,
): SavedAddressOption[] {
  const ready: SavedAddressOption[] = [];
  const incomplete: SavedAddressOption[] = [];
  for (const address of addresses ?? []) {
    const { status, issue } = inspectSavedAddress(address, ctx);
    if (status === 'ready') ready.push({ address, status });
    else if (status === 'incomplete') incomplete.push({ address, status, issue: issue ?? 'missing' });
  }
  return [...ready, ...incomplete];
}

/**
 * Formulario prellenado con una dirección guardada (para completarla). Un país cuyo
 * formulario no tiene campo de número lo lleva en la línea de la calle: no se pierde.
 * El estado se ajusta al valor del catálogo ("PUEBLA" → "Puebla", "Texas" → "TX"); donde
 * viaja como código y no se reconoce queda vacío para que se elija.
 */
export function draftFromSavedAddress(address: SavedAddress, ctx: SavedAddressContext): AddressDraft {
  const fields = checkoutAddressFields(ctx.countryCode);
  const has = (key: AddressFormKey) => fields.some((f) => f.key === key);
  const cut = (key: AddressFormKey, value: string | null | undefined) =>
    (value ?? '').slice(0, fields.find((f) => f.key === key)?.maxLength ?? CHECKOUT_MAX_LENGTH[key]);
  const street = [
    address.street,
    has('extNumber') ? null : address.extNumber,
    has('intNumber') ? null : address.intNumber,
  ]
    .filter(Boolean)
    .join(' ');
  const state =
    matchStateValue(ctx.states, address.state, ctx.countryCode) ??
    (stateValueIsCode(ctx.countryCode) ? '' : (address.state ?? ''));
  return {
    street: cut('street', street),
    extNumber: has('extNumber') ? cut('extNumber', address.extNumber) : '',
    intNumber: has('intNumber') ? cut('intNumber', address.intNumber) : '',
    neighborhood: has('neighborhood') ? cut('neighborhood', address.neighborhood) : '',
    city: cut('city', address.city),
    state: cut('state', state),
    zipCode: cut('zipCode', address.postalCode),
    reference: cut('reference', address.reference),
  };
}

// ===== elección =====

export type AddressChoice =
  /** Una guardada, tal cual. */
  | { kind: 'saved'; id: string }
  /** Una guardada a la que le faltan datos: se captura completa en el formulario. */
  | { kind: 'complete'; id: string }
  /** Otra dirección. */
  | { kind: 'new' };

export function sameAddressChoice(a: AddressChoice | null, b: AddressChoice | null): boolean {
  if (!a || !b) return a === b;
  if (a.kind === 'new' || b.kind === 'new') return a.kind === b.kind;
  return a.kind === b.kind && a.id === b.id;
}

/** Sin elección del cliente: la primera que se puede usar tal cual (predeterminada o más reciente); si no hay, una nueva. */
export function defaultAddressChoice(options: readonly SavedAddressOption[]): AddressChoice {
  const first = options.find((option) => option.status === 'ready');
  return first ? { kind: 'saved', id: first.address.id } : { kind: 'new' };
}

/**
 * Elección VIGENTE contra la lista actual: una guardada que ya no existe (se eliminó)
 * vuelve a la de por defecto y una que dejó de poder usarse tal cual pasa a completarse.
 */
export function resolveAddressChoice(
  choice: AddressChoice | null,
  options: readonly SavedAddressOption[],
): AddressChoice {
  if (!choice) return defaultAddressChoice(options);
  if (choice.kind === 'new') return choice;
  const option = options.find((o) => o.address.id === choice.id);
  if (!option) return defaultAddressChoice(options);
  if (choice.kind === 'saved' && option.status !== 'ready') return { kind: 'complete', id: choice.id };
  return choice;
}

// ===== estado de la pantalla =====

export interface ShippingAddressState {
  /** Lo que eligió el cliente; `null` = aún no elige (aplica la de por defecto). */
  choice: AddressChoice | null;
  /** Lo capturado en "Usar otra dirección". */
  newDraft: AddressDraft;
  /** Lo capturado al completar una guardada (se conserva si vuelve a elegirla). */
  completion: { id: string; draft: AddressDraft } | null;
  /** "Guardar esta dirección para mis próximas compras". */
  saveAddress: boolean;
  /** Guardadas que el API rechazó al pagar. */
  rejectedIds: string[];
}

export const INITIAL_SHIPPING_ADDRESS_STATE: ShippingAddressState = {
  choice: null,
  newDraft: EMPTY_ADDRESS_DRAFT,
  completion: null,
  saveAddress: true,
  rejectedIds: [],
};

/** El cliente elige una opción. Al completar OTRA guardada el formulario parte de sus datos. */
export function chooseAddress(state: ShippingAddressState, choice: AddressChoice): ShippingAddressState {
  const completion =
    choice.kind === 'complete' && state.completion?.id !== choice.id ? null : state.completion;
  return { ...state, choice, completion };
}

/** Formulario vigente para la elección YA resuelta (`resolveAddressChoice`). */
export function activeAddressDraft(
  state: ShippingAddressState,
  choice: AddressChoice,
  options: readonly SavedAddressOption[],
  ctx: SavedAddressContext,
): AddressDraft {
  if (choice.kind !== 'complete') return state.newDraft;
  if (state.completion?.id === choice.id) return state.completion.draft;
  const option = options.find((o) => o.address.id === choice.id);
  return option ? draftFromSavedAddress(option.address, ctx) : EMPTY_ADDRESS_DRAFT;
}

/**
 * El cliente escribe en el formulario. Además FIJA la elección vigente: si la lista de
 * guardadas cambia después (otra pestaña, un refresco), lo que está capturando no se
 * cambia solo por una dirección guardada.
 */
export function editAddressDraft(
  state: ShippingAddressState,
  choice: AddressChoice,
  patch: Partial<AddressDraft>,
  options: readonly SavedAddressOption[],
  ctx: SavedAddressContext,
): ShippingAddressState {
  if (choice.kind === 'saved') return state;
  const draft = { ...activeAddressDraft(state, choice, options, ctx), ...patch };
  if (choice.kind === 'complete') return { ...state, choice, completion: { id: choice.id, draft } };
  return { ...state, choice, newDraft: draft };
}

/**
 * El cliente continúa al pago: se FIJAN la elección y lo capturado con lo que vio en
 * pantalla (también la elección por defecto, que hasta aquí no había tocado).
 */
export function pinAddressChoice(
  state: ShippingAddressState,
  choice: AddressChoice,
  options: readonly SavedAddressOption[],
  ctx: SavedAddressContext,
): ShippingAddressState {
  return choice.kind === 'saved' ? chooseAddress(state, choice) : editAddressDraft(state, choice, {}, options, ctx);
}

/** El API rechazó esa guardada al pagar: deja de ofrecerse tal cual y se pasa a completarla. */
export function rejectSavedAddress(state: ShippingAddressState, id: string): ShippingAddressState {
  const rejectedIds = state.rejectedIds.includes(id) ? state.rejectedIds : [...state.rejectedIds, id];
  return chooseAddress({ ...state, rejectedIds }, { kind: 'complete', id });
}

/** Cambió el país de la tienda: el estado capturado es de otro catálogo. */
export function clearDraftStates(state: ShippingAddressState): ShippingAddressState {
  const newDraft = state.newDraft.state ? { ...state.newDraft, state: '' } : state.newDraft;
  const completion =
    state.completion && state.completion.draft.state
      ? { ...state.completion, draft: { ...state.completion.draft, state: '' } }
      : state.completion;
  return newDraft === state.newDraft && completion === state.completion ? state : { ...state, newDraft, completion };
}

// ===== cuerpo del pedido =====

export interface ShippingRecipient {
  name: string;
  phone: string;
}

export interface ShippingCountry {
  /** ISO2 del país de la tienda. */
  code: string;
  /** Nombre que viaja en `shippingAddress.country`. */
  name: string;
}

export type ShippingAddressPayload = Pick<
  AuthenticatedCheckoutInput,
  'shippingAddressId' | 'recipientName' | 'recipientPhone' | 'shippingAddress' | 'saveShippingAddress'
>;

/** `shippingAddress` del pedido (misma forma de siempre): solo los campos del país, sin espacios de sobra ni opcionales vacíos. */
export function buildCheckoutAddress(
  draft: AddressDraft,
  recipient: ShippingRecipient,
  country: ShippingCountry,
): CheckoutAddress {
  const fields = checkoutAddressFields(country.code);
  const value = (key: AddressFormKey) => (fields.some((f) => f.key === key) ? (draft[key] ?? '').trim() : '');
  const optional = (key: AddressFormKey) => value(key) || undefined;
  return {
    fullName: recipient.name.trim(),
    phone: recipient.phone.trim(),
    street: value('street'),
    exteriorNumber: optional('extNumber'),
    interiorNumber: optional('intNumber'),
    neighborhood: optional('neighborhood'),
    city: value('city'),
    state: value('state'),
    postalCode: value('zipCode'),
    country: country.name,
    references: optional('reference'),
  };
}

/**
 * Parte de envío del pedido (POST /checkout/authenticated):
 *  - guardada → `shippingAddressId` + quién recibe, SIN `shippingAddress`;
 *  - nueva o completada → `shippingAddress` + `saveShippingAddress`.
 */
export function buildShippingAddressPayload(input: {
  choice: AddressChoice;
  draft: AddressDraft;
  recipient: ShippingRecipient;
  country: ShippingCountry;
  saveAddress: boolean;
}): ShippingAddressPayload {
  if (input.choice.kind === 'saved') {
    return {
      shippingAddressId: input.choice.id,
      recipientName: input.recipient.name.trim(),
      recipientPhone: input.recipient.phone.trim(),
    };
  }
  return {
    shippingAddress: buildCheckoutAddress(input.draft, input.recipient, input.country),
    saveShippingAddress: input.saveAddress,
  };
}

// ===== presentación =====

export interface AddressParts {
  street: string | null;
  extNumber: string | null;
  intNumber: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}

export function draftAddressParts(draft: AddressDraft): AddressParts {
  return {
    street: text(draft.street),
    extNumber: text(draft.extNumber),
    intNumber: text(draft.intNumber),
    neighborhood: text(draft.neighborhood),
    city: text(draft.city),
    state: text(draft.state),
    postalCode: text(draft.zipCode),
  };
}

/** Calle con su número: "Av. Reforma 1250". */
export function streetWithNumber(parts: Pick<AddressParts, 'street' | 'extNumber'>): string {
  return [parts.street, parts.extNumber].filter(Boolean).join(' ');
}

/**
 * ¿El interior necesita su prefijo al mostrarse? "4B" sí ("int. 4B"); "Suite 300" o
 * "Depto 5" ya dicen lo que son.
 */
export function interiorNeedsPrefix(intNumber: string): boolean {
  return !/\s/.test(intNumber.trim());
}

/** "Puebla, Puebla". */
export function cityWithState(parts: Pick<AddressParts, 'city' | 'state'>): string {
  return [parts.city, parts.state].filter(Boolean).join(', ');
}

/** Dirección en un renglón, sin huecos: "Av. Reforma 1250, La Paz, Puebla, Puebla 72160". */
export function formatAddressLine(parts: AddressParts): string {
  const place = [cityWithState(parts), parts.postalCode].filter(Boolean).join(' ');
  return [streetWithNumber(parts), parts.neighborhood, place].filter(Boolean).join(', ');
}

/**
 * Código postal y estado con los que se cotizan el envío y el impuesto del resumen: los de
 * la guardada elegida o los del formulario. Los de la guardada van TAL CUAL están
 * guardados, porque con esos mismos datos el API arma el pedido.
 */
export function shippingAreaOf(
  choice: AddressChoice,
  options: readonly SavedAddressOption[],
  draft: AddressDraft,
): { postalCode: string; state: string } {
  if (choice.kind === 'saved') {
    const saved = options.find((o) => o.address.id === choice.id)?.address;
    if (saved) return { postalCode: saved.postalCode ?? '', state: saved.state ?? '' };
  }
  return { postalCode: draft.zipCode, state: draft.state };
}
