// auth-area.ts — A qué parte del sitio pertenece una sesión y a dónde va al entrar (lógica PURA).
//
// Hasta el 11-nov-2026 había dos destinos, decididos por la CATEGORÍA del rol
// (`lib/auth-roles.ts`): el panel de administración (colaboradores) y el panel del
// distribuidor (todo rol de categoría `cliente`). Desde que el público puede abrir su
// cuenta en la tienda hay un tercero: la cuenta de CLIENTE FINAL
// (`user.customerType === 'final_customer'`). Comparte rol con el distribuidor, pero no
// tiene patrocinador, red, puntos ni kit: su sitio es la TIENDA. Mandarla al panel la
// dejaría frente a la compra del kit de inscripción, el tutorial y "Mi red".
//
// Por eso el destino ya no se decide solo con el rol: se decide con el rol Y el tipo de
// cuenta, aquí, y todo el que rutea (login, registro, encabezado, guardias, middleware)
// pregunta lo mismo. Un API anterior no manda `customerType`: se comporta como siempre.

import { resolvePortal, type Portal } from './auth-roles';

/** `store` = cuenta del público (cliente final): vive en la tienda, sin panel. */
export type SessionArea = Portal | 'store';

/** Lo que hace falta saber de la sesión (`UserResponse` lo cumple). */
export interface AreaUser {
  roleCategory?: string | null;
  roles?: readonly string[] | null;
  /** distributor | preferred_customer | final_customer; ausente en colaboradores y en un API anterior. */
  customerType?: string | null;
}

export const FINAL_CUSTOMER_TYPE = 'final_customer';

/** Inicio de la tienda (el middleware lo lleva al país e idioma del visitante). */
export const STORE_HOME = '/';
/** "Mis pedidos" de la cuenta del público, con el encabezado de la tienda. */
export const STORE_ORDERS_PATH = '/mis-pedidos';
/** "Mis pedidos" dentro del panel del distribuidor (a donde apuntan los correos del pedido). */
export const DISTRIBUTOR_ORDERS_PATH = '/distribuidor/pedidos';

/** Cuenta abierta por el público desde la tienda (formulario "Crea tu cuenta" o Google). */
export function isFinalCustomer(user: Pick<AreaUser, 'customerType'> | null | undefined): boolean {
  return user?.customerType === FINAL_CUSTOMER_TYPE;
}

/**
 * Parte del sitio de la sesión. El rol manda (colaborador → admin); dentro de los
 * clientes, la cuenta del público va a la tienda y las demás al panel del distribuidor.
 */
export function sessionArea(user: AreaUser | null | undefined): SessionArea {
  const portal = resolvePortal(user?.roleCategory, user?.roles?.[0]);
  if (portal !== 'admin' && isFinalCustomer(user)) return 'store';
  return portal;
}

/**
 * ¿La sesión vive en la tienda? Es la pregunta de las pantallas (encabezado, panel,
 * confirmación del pedido): la cuenta del público sí; un colaborador nunca, aunque su
 * usuario tenga enlazado un cliente de ese tipo (el rol manda, como en `sessionArea`).
 */
export function isStoreAccount(user: AreaUser | null | undefined): boolean {
  return sessionArea(user) === 'store';
}

/**
 * Página de inicio de cada área. Una sesión sin clasificar va al panel del distribuidor,
 * como siempre (su guardia le ofrece salir si no le corresponde).
 */
export function areaHome(area: SessionArea): string {
  if (area === 'admin') return '/admin';
  if (area === 'store') return STORE_HOME;
  return '/distribuidor';
}

/** ¿La ruta es `base` o cuelga de ella? (`/admin`, `/admin/x`, `/admin?x`; no `/administracion`). */
function isUnder(path: string, base: string): boolean {
  if (!path.startsWith(base)) return false;
  const next = path.charAt(base.length);
  return next === '' || next === '/' || next === '?' || next === '#';
}

/**
 * `?redirect=` solo si es una ruta de ESTE sitio: empieza con una sola `/`. Lo demás
 * (`//otro.sitio`, `/\otro.sitio`, `https://…`, saltos de línea) se descarta: después de
 * iniciar sesión nunca se manda a la persona a un sitio ajeno.
 */
export function safeRedirectPath(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const path = raw.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(path)) return null;
  return path;
}

/**
 * A dónde va la cuenta del público cuando algo la manda al panel o al admin: sus pedidos
 * tienen página propia en la tienda; todo lo demás, al inicio de la tienda.
 */
export function storePathInsteadOf(path: string): string {
  return isUnder(path, DISTRIBUTOR_ORDERS_PATH) ? STORE_ORDERS_PATH : STORE_HOME;
}

/** ¿La ruta es del panel del distribuidor o del admin? (no son sitio para la cuenta del público). */
export function isPanelPath(path: string): boolean {
  return isUnder(path, '/admin') || isUnder(path, '/distribuidor');
}

/**
 * A dónde va la persona después de iniciar sesión o crear su cuenta.
 *  - Con `redirect` válido se regresa ahí, salvo que sea de OTRA área: un colaborador no
 *    va a `/distribuidor/…` ni un distribuidor a `/admin/…` por un enlace viejo.
 *  - La cuenta del público nunca entra al panel ni al admin: sus pedidos van a
 *    "Mis pedidos" de la tienda y lo demás al inicio de la tienda.
 *  - Sin `redirect`: el inicio de su área.
 */
export function postLoginPath(input: { user: AreaUser | null | undefined; redirect?: string | null }): string {
  const area = sessionArea(input.user);
  const redirect = safeRedirectPath(input.redirect);

  if (area === 'store') {
    if (!redirect) return STORE_HOME;
    return isPanelPath(redirect) ? storePathInsteadOf(redirect) : redirect;
  }

  const isAdmin = area === 'admin';
  if (redirect) {
    const toAdmin = isUnder(redirect, '/admin');
    const toDistributor = isUnder(redirect, '/distribuidor');
    if (isAdmin && toAdmin) return redirect;
    if (!isAdmin && toDistributor) return redirect;
    if (!toAdmin && !toDistributor) return redirect;
  }
  return isAdmin ? '/admin' : '/distribuidor';
}

/** Dónde ve sus pedidos esta sesión: en la tienda (cuenta del público) o en su panel. */
export function ordersPath(user: AreaUser | null | undefined): string {
  return sessionArea(user) === 'store' ? STORE_ORDERS_PATH : DISTRIBUTOR_ORDERS_PATH;
}

/**
 * Valor de la cookie `authPortal` con la que rutea el middleware. `null` = sesión sin
 * clasificar: no se escribe (el middleware la manda a iniciar sesión de nuevo).
 */
export function portalCookieValue(area: SessionArea): 'admin' | 'distributor' | 'store' | null {
  return area === 'unknown' ? null : area;
}
