import { describe, expect, it } from 'vitest';
import { internalNavigationTarget, type LinkClickInfo } from './unsaved-navigation';

const currentUrl = 'https://admin.example.com/admin/configuracion/rutas-envio';
const click = (href: string | null, extra: Partial<LinkClickInfo> = {}) =>
  internalNavigationTarget({ href, currentUrl, ...extra });

describe('internalNavigationTarget (L-4: avisar al navegar con cambios sin guardar)', () => {
  it('intercepta los enlaces internos que salen de la página (sidebar, "Configuración")', () => {
    expect(click('/admin/configuracion')).toBe('/admin/configuracion');
    expect(click('/admin/sucursales?tab=usuarios#lista')).toBe('/admin/sucursales?tab=usuarios#lista');
    expect(click('https://admin.example.com/admin/pedidos')).toBe('/admin/pedidos');
    expect(click('../catalogos')).toBe('/admin/catalogos');
    expect(click('/admin/pedidos', { target: '_self' })).toBe('/admin/pedidos');
  });

  it('no intercepta lo que NO pierde el borrador', () => {
    expect(click('#pais-MX')).toBeNull();
    expect(click('/admin/configuracion/rutas-envio#pais-MX')).toBeNull();
    expect(click('/admin/configuracion/rutas-envio')).toBeNull();
    expect(click('/admin/pedidos', { target: '_blank' })).toBeNull();
    expect(click('/admin/pedidos', { ctrlKey: true })).toBeNull();
    expect(click('/admin/pedidos', { metaKey: true })).toBeNull();
    expect(click('/admin/pedidos', { shiftKey: true })).toBeNull();
    expect(click('/admin/pedidos', { button: 1 })).toBeNull();
    expect(click('/archivo.csv', { download: true })).toBeNull();
    expect(click('/admin/pedidos', { defaultPrevented: true })).toBeNull();
  });

  it('no intercepta otros sitios ni otros protocolos (ahí ya actúa beforeunload)', () => {
    expect(click('https://otro.example.com/admin')).toBeNull();
    expect(click('mailto:sistemas@example.com')).toBeNull();
    expect(click('tel:+520000000000')).toBeNull();
    expect(click('')).toBeNull();
    expect(click(null)).toBeNull();
  });

  it('una query distinta en la misma ruta sí cuenta como salir', () => {
    expect(click('/admin/configuracion/rutas-envio?x=1')).toBe('/admin/configuracion/rutas-envio?x=1');
  });

  it('una URL actual inválida no rompe: no intercepta', () => {
    expect(internalNavigationTarget({ href: '/admin', currentUrl: 'no-es-url' })).toBeNull();
  });
});
