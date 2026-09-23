import { describe, expect, it } from 'vitest';
import { filterNavigation, hasAnyPermission, type NavItem } from './admin-nav-filter';

const Icon = () => null;

const NAV: NavItem[] = [
  { name: 'Panel Principal', href: '/admin', icon: Icon },
  { name: 'Productos', href: '/admin/productos', icon: Icon, permissions: ['products:read'] },
  {
    name: 'Configuración',
    href: '/admin/configuracion',
    icon: Icon,
    permissions: ['config'],
    children: [
      { name: 'General', href: '/admin/configuracion' },
      { name: 'Almacenes y envíos', href: '/admin/configuracion/rutas-envio', permissions: ['fulfillment:read'] },
    ],
  },
  {
    name: 'Sistema',
    href: '/admin/sistema',
    icon: Icon,
    superAdminOnly: true,
    children: [
      { name: 'Limpieza y Carga', href: '/admin/sistema' },
      { name: 'Tesorería (ajustes)', href: '/admin/sistema?tab=tesoreria' },
      { name: 'Sincronización legacy', href: '/admin/sistema/sync', access: 'legacySyncRead' },
    ],
  },
];

const names = (items: NavItem[]) =>
  items.map((i) => (i.children ? `${i.name}[${i.children.map((c) => c.name).join(',')}]` : i.name));

describe('filterNavigation', () => {
  it('super_admin ve todo, incluido Sistema completo', () => {
    expect(filterNavigation(NAV, { isSuperAdmin: true, permissions: [] })).toEqual(NAV);
  });

  it('sin acceso por sonda, Sistema (superAdminOnly) no aparece', () => {
    const out = filterNavigation(NAV, { isSuperAdmin: false, permissions: ['products:read'] });
    expect(names(out)).toEqual(['Panel Principal', 'Productos']);
    const denied = filterNavigation(NAV, {
      isSuperAdmin: false,
      permissions: ['products:read'],
      access: { legacySyncRead: false },
    });
    expect(names(denied)).toEqual(['Panel Principal', 'Productos']);
  });

  it('con lectura de la sync (D12), Sistema asoma SOLO con Sincronización legacy', () => {
    const out = filterNavigation(NAV, {
      isSuperAdmin: false,
      permissions: [],
      access: { legacySyncRead: true },
    });
    expect(names(out)).toEqual(['Panel Principal', 'Sistema[Sincronización legacy]']);
    expect(out[1].children?.[0].href).toBe('/admin/sistema/sync');
  });

  it('se conserva el filtrado por permisos de padres e hijos', () => {
    expect(
      names(filterNavigation(NAV, { isSuperAdmin: false, permissions: ['config'] })),
    ).toEqual(['Panel Principal', 'Configuración[General]']);
    expect(
      names(filterNavigation(NAV, { isSuperAdmin: false, permissions: ['fulfillment:read'] })),
    ).toEqual(['Panel Principal', 'Configuración[Almacenes y envíos]']);
    const onlyParent = filterNavigation(
      [{ ...NAV[2], children: [NAV[2].children![1]] }],
      { isSuperAdmin: false, permissions: ['config'] },
    );
    expect(onlyParent).toEqual([{ ...NAV[2], children: undefined }]);
  });
});

describe('hasAnyPermission', () => {
  it('exacto, comodín de módulo y global', () => {
    expect(hasAnyPermission([], undefined)).toBe(true);
    expect(hasAnyPermission(['products:read'], ['products:read'])).toBe(true);
    expect(hasAnyPermission(['products:*'], ['products:update'])).toBe(true);
    expect(hasAnyPermission(['*'], ['x:y'])).toBe(true);
    expect(hasAnyPermission(['*:*'], ['x:y'])).toBe(true);
    expect(hasAnyPermission(['orders:read'], ['products:read'])).toBe(false);
  });
});
