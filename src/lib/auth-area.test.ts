import { describe, expect, it } from 'vitest';
import {
  areaHome,
  isFinalCustomer,
  isPanelPath,
  isStoreAccount,
  ordersPath,
  portalCookieValue,
  postLoginPath,
  safeRedirectPath,
  sessionArea,
  storePathInsteadOf,
  type AreaUser,
} from './auth-area';

const staff: AreaUser = { roleCategory: 'colaborador', roles: ['sistemas'] };
const distributor: AreaUser = { roleCategory: 'cliente', roles: ['customer'], customerType: 'distributor' };
const preferred: AreaUser = { roleCategory: 'cliente', roles: ['customer'], customerType: 'preferred_customer' };
const finalCustomer: AreaUser = { roleCategory: 'cliente', roles: ['customer'], customerType: 'final_customer' };
/** Sesión iniciada antes de que el API mandara `customerType`. */
const legacyCustomer: AreaUser = { roleCategory: 'cliente', roles: ['customer'] };

describe('auth-area · a qué parte del sitio pertenece la sesión', () => {
  it('la cuenta del público (cliente final) es de la tienda; los demás clientes, del panel', () => {
    expect(sessionArea(finalCustomer)).toBe('store');
    expect(sessionArea(distributor)).toBe('distributor');
    expect(sessionArea(preferred)).toBe('distributor');
    expect(sessionArea(staff)).toBe('admin');
    expect(isFinalCustomer(finalCustomer)).toBe(true);
    expect(isFinalCustomer(distributor)).toBe(false);
    expect(isFinalCustomer(null)).toBe(false);
  });

  it('sin `customerType` (API anterior o sesión vieja) todo sigue como antes', () => {
    expect(sessionArea(legacyCustomer)).toBe('distributor');
    expect(sessionArea({ roleCategory: 'cliente', roles: ['customer'], customerType: null })).toBe('distributor');
    // Token viejo sin categoría: cae a las listas de códigos de rol.
    expect(sessionArea({ roles: ['role12'] })).toBe('distributor');
    expect(sessionArea({ roles: ['administrador'] })).toBe('admin');
    expect(sessionArea({ roles: ['rol-desconocido'] })).toBe('unknown');
    expect(sessionArea(null)).toBe('unknown');
  });

  it('el tipo de cuenta nunca le quita el admin a un colaborador, y sí clasifica a quien no trae categoría', () => {
    expect(sessionArea({ ...staff, customerType: 'final_customer' })).toBe('admin');
    expect(sessionArea({ roles: [], customerType: 'final_customer' })).toBe('store');
  });

  it('las pantallas preguntan por la cuenta de la tienda: el cliente final sí, un colaborador nunca', () => {
    expect(isStoreAccount(finalCustomer)).toBe(true);
    expect(isStoreAccount(distributor)).toBe(false);
    expect(isStoreAccount(preferred)).toBe(false);
    expect(isStoreAccount(legacyCustomer)).toBe(false);
    expect(isStoreAccount(staff)).toBe(false);
    // Colaborador cuyo usuario tiene enlazado un cliente final: conserva su panel.
    expect(isStoreAccount({ ...staff, customerType: 'final_customer' })).toBe(false);
    expect(isStoreAccount(null)).toBe(false);
  });

  it('cada área tiene su inicio; una sesión sin clasificar va al panel, como siempre', () => {
    expect(areaHome('admin')).toBe('/admin');
    expect(areaHome('distributor')).toBe('/distribuidor');
    expect(areaHome('store')).toBe('/');
    expect(areaHome('unknown')).toBe('/distribuidor');
  });

  it('la cookie del middleware lleva el área; sin clasificar no se escribe', () => {
    expect(portalCookieValue('admin')).toBe('admin');
    expect(portalCookieValue('distributor')).toBe('distributor');
    expect(portalCookieValue('store')).toBe('store');
    expect(portalCookieValue('unknown')).toBeNull();
  });
});

describe('auth-area · ?redirect= seguro', () => {
  it('acepta rutas de este sitio, con su consulta y su ancla', () => {
    expect(safeRedirectPath('/checkout')).toBe('/checkout');
    expect(safeRedirectPath(' /es-mx/checkout?paso=2#pago ')).toBe('/es-mx/checkout?paso=2#pago');
    expect(safeRedirectPath('/')).toBe('/');
  });

  it('descarta lo que saca del sitio o no es una ruta', () => {
    expect(safeRedirectPath('//otro.sitio/robo')).toBeNull();
    expect(safeRedirectPath('/\\otro.sitio')).toBeNull();
    expect(safeRedirectPath('https://otro.sitio')).toBeNull();
    expect(safeRedirectPath('javascript:alert(1)')).toBeNull();
    expect(safeRedirectPath('checkout')).toBeNull();
    expect(safeRedirectPath('/ruta\ncon-salto')).toBeNull();
    expect(safeRedirectPath('')).toBeNull();
    expect(safeRedirectPath(null)).toBeNull();
    expect(safeRedirectPath(undefined)).toBeNull();
  });
});

describe('auth-area · a dónde va al iniciar sesión', () => {
  it('sin redirect: cada quien al inicio de su área; el cliente final, a la tienda', () => {
    expect(postLoginPath({ user: staff })).toBe('/admin');
    expect(postLoginPath({ user: distributor })).toBe('/distribuidor');
    expect(postLoginPath({ user: legacyCustomer })).toBe('/distribuidor');
    expect(postLoginPath({ user: finalCustomer })).toBe('/');
    expect(postLoginPath({ user: finalCustomer, redirect: null })).toBe('/');
  });

  it('con un redirect de la tienda todos regresan ahí (el caso del checkout)', () => {
    for (const user of [staff, distributor, finalCustomer]) {
      expect(postLoginPath({ user, redirect: '/es-mx/checkout' })).toBe('/es-mx/checkout');
      expect(postLoginPath({ user, redirect: '/checkout' })).toBe('/checkout');
    }
  });

  it('el cliente final NUNCA va al panel del distribuidor ni al admin', () => {
    expect(postLoginPath({ user: finalCustomer, redirect: '/distribuidor' })).toBe('/');
    expect(postLoginPath({ user: finalCustomer, redirect: '/distribuidor/inscripcion' })).toBe('/');
    expect(postLoginPath({ user: finalCustomer, redirect: '/distribuidor/red' })).toBe('/');
    expect(postLoginPath({ user: finalCustomer, redirect: '/admin/pedidos' })).toBe('/');
    // Sus pedidos sí existen, en la tienda: el enlace del correo del pedido lo lleva ahí.
    expect(postLoginPath({ user: finalCustomer, redirect: '/distribuidor/pedidos' })).toBe('/mis-pedidos');
    expect(postLoginPath({ user: finalCustomer, redirect: '/distribuidor/pedidos?page=2' })).toBe('/mis-pedidos');
    expect(postLoginPath({ user: finalCustomer, redirect: '/mis-pedidos' })).toBe('/mis-pedidos');
  });

  it('colaboradores y distribuidores conservan sus reglas: no cruzan de panel por un enlace viejo', () => {
    expect(postLoginPath({ user: staff, redirect: '/admin/inventario/entregas' })).toBe('/admin/inventario/entregas');
    expect(postLoginPath({ user: staff, redirect: '/distribuidor/red' })).toBe('/admin');
    expect(postLoginPath({ user: distributor, redirect: '/distribuidor/pedidos' })).toBe('/distribuidor/pedidos');
    expect(postLoginPath({ user: distributor, redirect: '/admin/pedidos' })).toBe('/distribuidor');
    // Solo cuenta el segmento completo: /administracion no es /admin.
    expect(postLoginPath({ user: distributor, redirect: '/administracion' })).toBe('/administracion');
  });

  it('un redirect que saca del sitio se ignora', () => {
    expect(postLoginPath({ user: finalCustomer, redirect: '//otro.sitio' })).toBe('/');
    expect(postLoginPath({ user: distributor, redirect: 'https://otro.sitio/distribuidor' })).toBe('/distribuidor');
    expect(postLoginPath({ user: staff, redirect: '/\\otro.sitio' })).toBe('/admin');
  });
});

describe('auth-area · pedidos y rutas del panel', () => {
  it('cada sesión ve sus pedidos en su sitio', () => {
    expect(ordersPath(finalCustomer)).toBe('/mis-pedidos');
    expect(ordersPath(distributor)).toBe('/distribuidor/pedidos');
    expect(ordersPath(legacyCustomer)).toBe('/distribuidor/pedidos');
    expect(ordersPath(null)).toBe('/distribuidor/pedidos');
  });

  it('del panel, al cliente final solo le toca "Mis pedidos"; lo demás lo regresa a la tienda', () => {
    expect(storePathInsteadOf('/distribuidor/pedidos')).toBe('/mis-pedidos');
    expect(storePathInsteadOf('/distribuidor/pedidos/')).toBe('/mis-pedidos');
    expect(storePathInsteadOf('/distribuidor')).toBe('/');
    expect(storePathInsteadOf('/distribuidor/pedidos-especiales')).toBe('/');
    expect(storePathInsteadOf('/admin')).toBe('/');
    expect(isPanelPath('/distribuidor/terminos')).toBe(true);
    expect(isPanelPath('/admin')).toBe(true);
    expect(isPanelPath('/mis-pedidos')).toBe(false);
    expect(isPanelPath('/es-mx/productos')).toBe(false);
  });
});
