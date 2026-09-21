// Lógica PURA del carrito web (contrato ecommerce 7.3, bloque C1). Sin React ni DOM.
//
// Todo lo que el API de C1 agrega es OPCIONAL aquí (`pointsPerUnit`, `slug`,
// `maxQuantity`, `showPoints`, códigos `CART_*`): contra el API actual cada función
// degrada al comportamiento previo sin inventar datos.

import { catalogErrorCode, catalogErrorDetails, catalogErrorStatus } from './errors';

/** Tope del DTO del API (`AddCartItemDto.quantity` 1..999) cuando no hay dato de stock. */
export const CART_LINE_HARD_MAX = 999;

/** Forma mínima de una línea que estas funciones necesitan (subconjunto de `CartItem`). */
export interface CartLineLike {
  quantity: number;
  points?: number;
  pointsPerUnit?: number | null;
  slug?: string | null;
  productSlug?: string | null;
  maxQuantity?: number | null;
  /** Motivo del tope que manda el API: máximo por pedido o existencias. */
  maxQuantityReason?: 'order_max' | 'stock' | null;
  availableStock?: number | null;
  inStock?: boolean;
}

function wholeOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null;
}

/** Topes que el API informó para la línea (no negativos). Vacío = sin dato. */
function knownLimits(item: CartLineLike): number[] {
  return [wholeOrNull(item.maxQuantity), wholeOrNull(item.availableStock)].filter(
    (n): n is number => n !== null && n >= 0,
  );
}

// ---------------------------------------------------------------------------
// Tope de cantidad
// ---------------------------------------------------------------------------

/**
 * POR QUÉ la línea tiene ese tope: `order_max` = máximo por pedido de la tienda
 * (`storefront.max_quantity_per_line`), NO falta de existencias; `stock` = existencias.
 */
export type CapReason = 'order_max' | 'stock';

export interface LineLimit {
  /** Máximo que la línea admite (>= 1 para que el campo siga siendo usable). */
  max: number;
  /** `true` si el tope viene del API (maxQuantity o stock); `false` = solo el tope del DTO. */
  known: boolean;
  /** Motivo del tope (para no decir "solo hay 20" cuando hay 400 y el tope es por pedido). */
  reason: CapReason;
}

/**
 * `maxQuantity` (API C1) = existencias topadas por el máximo por pedido. Si el API
 * también manda las existencias y son MAYORES, el tope es el máximo por pedido.
 * Sin ambos datos no se puede afirmar: se trata como existencias (texto previo).
 */
export function capReason(item: CartLineLike): CapReason {
  // El API ya no manda la existencia exacta, así que dice él mismo el motivo del tope.
  if (item.maxQuantityReason === 'order_max' || item.maxQuantityReason === 'stock') return item.maxQuantityReason;
  const max = wholeOrNull(item.maxQuantity);
  const stock = wholeOrNull(item.availableStock);
  return max !== null && stock !== null && max > 0 && max < stock ? 'order_max' : 'stock';
}

/**
 * Tope de la línea: `maxQuantity` (API C1) y/o `availableStock` (API actual); si
 * llegan ambos gana el menor; sin ninguno, 999. Un tope <= 0 (agotado) se reporta
 * como 1: la línea agotada se bloquea por `lineIssue`, no por el stepper.
 */
export function lineLimit(item: CartLineLike): LineLimit {
  const limits = knownLimits(item);
  if (limits.length === 0) return { max: CART_LINE_HARD_MAX, known: false, reason: 'stock' };
  return { max: Math.max(1, Math.min(CART_LINE_HARD_MAX, ...limits)), known: true, reason: capReason(item) };
}

export function clampQuantity(value: number, max: number): number {
  const limit = Math.max(1, Math.min(CART_LINE_HARD_MAX, Math.trunc(max) || 1));
  if (!Number.isFinite(value)) return 1;
  return Math.min(limit, Math.max(1, Math.trunc(value)));
}

export interface QuantityCommit {
  /** Cantidad a mandar al API, o `null` si no hay nada que mandar (sin cambio o texto inválido). */
  next: number | null;
  /** `true` si lo tecleado rebasaba el tope (o era 0) y se recortó. */
  clamped: boolean;
}

/**
 * Commit del campo de cantidad (blur / Enter): UN solo PATCH con el valor final.
 * Vacío, no numérico o igual al actual = sin petición.
 */
export function commitQuantityDraft(draft: string, current: number, max: number): QuantityCommit {
  const digits = draft.trim();
  if (!/^\d{1,4}$/.test(digits)) return { next: null, clamped: false };
  const parsed = Number.parseInt(digits, 10);
  const next = clampQuantity(parsed, max);
  return { next: next === current ? null : next, clamped: parsed !== next };
}

// ---------------------------------------------------------------------------
// Líneas que bloquean el pago
// ---------------------------------------------------------------------------

export type LineIssue = 'sold_out' | 'exceeds_stock';

/** Agotada (`inStock === false` o tope 0) o con más piezas de las disponibles. `null` = sin problema o sin dato. */
export function lineIssue(item: CartLineLike): LineIssue | null {
  if (item.inStock === false) return 'sold_out';
  const limits = knownLimits(item);
  if (limits.length === 0) return null;
  const available = Math.min(...limits);
  if (available <= 0) return 'sold_out';
  return item.quantity > available ? 'exceeds_stock' : null;
}

export interface CartBlockers {
  soldOut: number;
  exceedsStock: number;
  /** `true` = "Proceder al pago" deshabilitado. */
  blocked: boolean;
}

export function cartBlockers(items: readonly CartLineLike[]): CartBlockers {
  let soldOut = 0;
  let exceedsStock = 0;
  for (const item of items) {
    const issue = lineIssue(item);
    if (issue === 'sold_out') soldOut += 1;
    else if (issue === 'exceeds_stock') exceedsStock += 1;
  }
  return { soldOut, exceedsStock, blocked: soldOut + exceedsStock > 0 };
}

export interface CheckoutGate {
  /** Hay agotados o excesos: el aviso se muestra SIEMPRE. */
  showNotice: boolean;
  /** "Proceder al pago" deshabilitado. */
  blocked: boolean;
}

/**
 * El pago solo se BLOQUEA a una sesión de cliente. A un INVITADO se le informa pero
 * puede continuar a iniciar sesión: hasta C2 su carrito se resuelve como MX aunque
 * navegue otra tienda (existencias de otro país), y no hay checkout de invitado ni
 * merge (C3), así que su carrito nunca llega a una orden.
 */
export function checkoutGate(blockers: CartBlockers, hasCustomerSession: boolean): CheckoutGate {
  return { showNotice: blockers.blocked, blocked: blockers.blocked && hasCustomerSession };
}

// ---------------------------------------------------------------------------
// Puntos y slug
// ---------------------------------------------------------------------------

/**
 * ¿Se muestran puntos? Manda `cart.showPoints` (API C1). Sin el campo (API actual):
 * solo a una sesión de CLIENTE (distribuidor/preferente); nunca a invitados.
 */
export function resolveShowPoints(cartShowPoints: boolean | null | undefined, hasCustomerSession: boolean): boolean {
  return typeof cartShowPoints === 'boolean' ? cartShowPoints : hasCustomerSession;
}

/**
 * Puntos POR UNIDAD de la línea. `pointsPerUnit` (API C1) o, sin él, `points / quantity`
 * (`points` es el total de la línea: mostrarlo "por unidad" lo triplicaba con 3 piezas).
 */
export function linePointsPerUnit(item: CartLineLike, showPoints: boolean): number | null {
  if (!showPoints) return null;
  const direct = item.pointsPerUnit;
  let perUnit: number | null = null;
  if (typeof direct === 'number' && Number.isFinite(direct)) perUnit = direct;
  else if (typeof item.points === 'number' && item.quantity > 0) perUnit = item.points / item.quantity;
  if (perUnit === null || !Number.isFinite(perUnit) || perUnit <= 0) return null;
  return Math.round(perUnit * 100) / 100;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

/** Slug del producto de la línea (`slug` de C1 o `productSlug` actual); `null` = sin enlace. */
export function lineSlug(item: CartLineLike): string | null {
  for (const candidate of [item.slug, item.productSlug]) {
    if (typeof candidate === 'string' && SLUG_RE.test(candidate.trim())) return candidate.trim();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Envío gratis por país
// ---------------------------------------------------------------------------

export interface StoreShippingInfo {
  freeThreshold: number | null;
  currencyCode: string;
}

export interface FreeShippingInput {
  /** Envío REAL del país (`system_settings.shipping` vía `/storefront`); `null` = país sin dato. */
  shipping: StoreShippingInfo | null | undefined;
  subtotal: number;
  /** Moneda del carrito si el API la manda (C2). Si no coincide con la del envío, no hay barra. */
  cartCurrencyCode?: string | null;
  /**
   * `false` para quien el checkout NUNCA da envío gratis por monto (distribuidores:
   * `checkout.service` cobra siempre el estándar). No se promete lo que no se cumple.
   */
  eligible: boolean;
}

export interface FreeShippingProgress {
  threshold: number;
  remaining: number;
  reached: boolean;
  /** 0..100, entero. */
  percent: number;
  currencyCode: string;
}

export interface FreeShippingEligibilityInput {
  /** `shipping.freeShippingEligible` del API (false para distribuidores); ausente en el API previo. */
  apiEligible?: boolean | null;
  /** Nivel de precio con el que el API cotizó al viewer. */
  priceTier?: 'public' | 'preferred' | 'distributor' | null;
  hasCustomerSession: boolean;
  /** Sesión cuyo rol/tipo es de distribuidor (portal de cliente). */
  distributorSession: boolean;
  /** Moneda del carrito si el API la manda (C2). */
  cartCurrencyCode?: string | null;
  /** Moneda de la CUENTA del viewer con sesión (`user.currencyCode`). */
  viewerCurrencyCode?: string | null;
  /** País de la tienda visitada (ISO2). */
  countryCode: string;
  /** Moneda del umbral de envío gratis. */
  shippingCurrencyCode?: string | null;
}

/**
 * Moneda en la que se puede GARANTIZAR que está el subtotal del carrito; `null` = no se puede.
 * TODO(C2): cuando el API mande `cart.currencyCode` sobran los dos respaldos.
 */
export function knownCartCurrency(
  input: Pick<FreeShippingEligibilityInput, 'cartCurrencyCode' | 'viewerCurrencyCode' | 'hasCustomerSession' | 'countryCode'>,
): string | null {
  const fromCart = (input.cartCurrencyCode || '').trim().toUpperCase();
  if (fromCart) return fromCart;
  // Con sesión de cliente el carrito se cotiza en el país de SU cuenta.
  const fromViewer = (input.viewerCurrencyCode || '').trim().toUpperCase();
  if (input.hasCustomerSession && fromViewer) return fromViewer;
  // Invitado (o cuenta sin moneda): el API resuelve su carrito como MX aunque navegue /en-us.
  return input.countryCode.toUpperCase() === 'MX' ? 'MXN' : null;
}

/**
 * ¿Se le puede prometer envío gratis por monto? NO cuando no se garantiza que subtotal
 * y umbral están en la misma moneda, ni a quien el checkout nunca se lo da (distribuidor).
 */
export function freeShippingEligible(input: FreeShippingEligibilityInput): boolean {
  const cartCurrency = knownCartCurrency(input);
  const shippingCurrency = (input.shippingCurrencyCode || '').trim().toUpperCase();
  if (!cartCurrency || !shippingCurrency || cartCurrency !== shippingCurrency) return false;
  // Sesión de distribuidor pero el API lo cotizó como anónimo (token vencido): su `true` es
  // de anónimo; no se promete nada hasta que se recupere la sesión.
  if (input.apiEligible && input.hasCustomerSession && input.distributorSession && input.priceTier === 'public') return false;
  if (typeof input.apiEligible === 'boolean') return input.apiEligible;
  // Provisional (API sin `freeShippingEligible`): el rol no distingue distribuidor de
  // preferente, así que con sesión de distribuidor solo es elegible a quien el API ya
  // cotizó como preferente. Un distribuidor cotizado a precio público NO ve la promesa.
  if (input.priceTier === 'distributor') return false;
  if (input.hasCustomerSession && input.distributorSession) return input.priceTier === 'preferred';
  return true;
}

/** `null` = NO se pinta la barra (sin dato del país, umbral inválido, moneda distinta o viewer no elegible). */
export function freeShippingProgress(input: FreeShippingInput): FreeShippingProgress | null {
  const { shipping, eligible, cartCurrencyCode } = input;
  if (!eligible || !shipping) return null;
  const threshold = shipping.freeThreshold;
  if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold <= 0) return null;
  const currencyCode = (shipping.currencyCode || '').toUpperCase();
  if (!currencyCode) return null;
  if (cartCurrencyCode && cartCurrencyCode.toUpperCase() !== currencyCode) return null;
  const subtotal = Number.isFinite(input.subtotal) ? Math.max(0, input.subtotal) : 0;
  const remaining = Math.max(0, Math.round((threshold - subtotal) * 100) / 100);
  const reached = remaining === 0;
  const percent = reached ? 100 : Math.min(99, Math.max(0, Math.floor((subtotal / threshold) * 100)));
  return { threshold, remaining, reached, percent, currencyCode };
}

// ---------------------------------------------------------------------------
// Errores del API de carrito
// ---------------------------------------------------------------------------

export const ENROLLMENT_FALLBACK_HREF = '/registro/distribuidor';

export type CartErrorKind =
  | 'not_sellable'
  | 'enrollment_kit'
  | 'qty_exceeds_stock'
  | 'session_expired'
  | 'other';

export interface CartErrorInfo {
  kind: CartErrorKind;
  /** Solo `enrollment_kit`: ruta INTERNA a donde mandar al visitante. */
  href?: string;
  /** Solo `qty_exceeds_stock`: máximo que admite la línea (0 = agotado); `null` si el API no lo dijo. */
  maxQuantity?: number | null;
}

/** Solo rutas internas (`/algo`): nunca `//host`, `http:`, `javascript:` ni con espacios o backslash. */
export function safeInternalHref(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const href = value.trim();
  if (!/^\/(?!\/)[A-Za-z0-9\-._~/?#=&%]*$/.test(href)) return fallback;
  return href;
}

/** Clasifica un error de `/cart/*` por `code` (nunca por el texto). Sin código (API actual) = 'other'. */
export function mapCartError(err: unknown): CartErrorInfo {
  const code = catalogErrorCode(err);
  if (code === 'CART_NOT_SELLABLE') return { kind: 'not_sellable' };
  if (code === 'CART_ENROLLMENT_KIT') {
    return { kind: 'enrollment_kit', href: safeInternalHref(catalogErrorDetails(err).href, ENROLLMENT_FALLBACK_HREF) };
  }
  if (code === 'CART_QTY_EXCEEDS_STOCK') {
    const raw = catalogErrorDetails(err).maxQuantity;
    const parsed = typeof raw === 'string' && /^\d+$/.test(raw) ? Number.parseInt(raw, 10) : wholeOrNull(raw);
    return {
      kind: 'qty_exceeds_stock',
      maxQuantity: parsed !== null && parsed >= 0 ? Math.min(parsed, CART_LINE_HARD_MAX) : null,
    };
  }
  if (catalogErrorStatus(err) === 401) return { kind: 'session_expired' };
  return { kind: 'other' };
}

export type StockAdjustPlan =
  | { action: 'set'; quantity: number }
  | { action: 'already_max'; quantity: number }
  /** La línea YA estaba por encima del tope: no se baja en silencio, se muestra el error. */
  | { action: 'over_max'; quantity: number }
  | { action: 'sold_out' }
  | { action: 'none' };

/**
 * Qué hacer tras un `CART_QTY_EXCEEDS_STOCK`: dejar la línea en el máximo.
 * `currentQuantity` = piezas que la línea YA tiene en el carrito (0 si no existe).
 */
export function planStockAdjust(maxQuantity: number | null | undefined, currentQuantity: number): StockAdjustPlan {
  if (maxQuantity === null || maxQuantity === undefined) return { action: 'none' };
  if (maxQuantity <= 0) return { action: 'sold_out' };
  if (currentQuantity === maxQuantity) return { action: 'already_max', quantity: maxQuantity };
  if (currentQuantity > maxQuantity) return { action: 'over_max', quantity: maxQuantity };
  return { action: 'set', quantity: maxQuantity };
}

// ---------------------------------------------------------------------------
// Lo que REALMENTE entró al carrito
// ---------------------------------------------------------------------------

/**
 * Piezas que entraron tras un `POST /cart/items`: cantidad de la línea después − antes.
 * `before === null` = no se conocía el carrito: lo pedido, acotado a lo que quedó.
 * 0 = no entró nada (la línea ya estaba en su máximo): NO se anuncia "agregado".
 */
export function addedQuantity(before: number | null, after: number | null, requested: number): number {
  const final = after ?? requested;
  const added = before === null ? Math.min(requested, final) : final - before;
  return Math.max(0, added);
}

export type BundleAddOutcome = 'all' | 'partial' | 'none';

/** Resultado de agregar un paquete producto por producto (cada fallo ya lo avisó el hook). */
export function bundleAddOutcome(addedPerProduct: readonly number[]): BundleAddOutcome {
  const entered = addedPerProduct.filter((n) => n > 0).length;
  if (entered === 0) return 'none';
  return entered === addedPerProduct.length ? 'all' : 'partial';
}

// ---------------------------------------------------------------------------
// Escape dentro del campo de cantidad (drawer)
// ---------------------------------------------------------------------------

/** Atributo que el campo de cantidad lleva SOLO mientras tiene un borrador sin confirmar. */
export const QTY_DRAFT_ATTR = 'data-cart-qty-draft';

/**
 * Radix escucha Escape en `document` (captura), ANTES que el `onKeyDown` de React del
 * campo: un `stopPropagation` ahí no evita que el drawer se cierre. El `SheetContent`
 * pregunta esto en `onEscapeKeyDown` y, si es `true`, hace `preventDefault()`: el primer
 * Escape solo cancela la edición; el siguiente ya cierra el drawer.
 */
export function escapeCancelsQuantityDraft(
  active: { getAttribute?: (name: string) => string | null } | null | undefined,
): boolean {
  return typeof active?.getAttribute === 'function' && active.getAttribute(QTY_DRAFT_ATTR) === 'true';
}

// ---------------------------------------------------------------------------
// "Comprar ahora"
// ---------------------------------------------------------------------------

export interface BuyNowDestination {
  href: '/checkout' | '/carrito';
  /** `checkout_off` = piloto con el pago apagado (se avisa con toast); `blocked_lines` = /carrito lo explica. */
  reason: 'ok' | 'checkout_off' | 'blocked_lines';
}

/**
 * A dónde lleva "Comprar ahora" DESPUÉS de agregar, con el carrito ya actualizado. El
 * checkout no revisa existencias al pintarse (solo el API al pagar): si el carrito trae
 * líneas agotadas o por encima del tope se manda a /carrito, donde se explica cuáles.
 */
export function buyNowDestination(input: { checkoutEnabled: boolean; items: readonly CartLineLike[] }): BuyNowDestination {
  if (!input.checkoutEnabled) return { href: '/carrito', reason: 'checkout_off' };
  if (cartBlockers(input.items).blocked) return { href: '/carrito', reason: 'blocked_lines' };
  return { href: '/checkout', reason: 'ok' };
}
