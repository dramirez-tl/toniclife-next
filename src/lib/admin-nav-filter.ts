// admin-nav-filter.ts - Qué módulos del AdminSidebar ve cada usuario (lógica
// pura, sin React ni store, para poder probarla).
//
// Los MÓDULOS visibles los deciden los PERMISOS del rol, sin listas de roles
// (regla del portal por categoría, ago-2026): conceder un permiso en
// Seguridad → Roles hace aparecer el módulo sin tocar código. Excepciones:
//  - superAdminOnly: módulo exclusivo de super_admin (Sistema).
//  - access: hijo que se muestra cuando el API concede la lectura (sonda de
//    un GET; hoy solo "Sincronización legacy", D12). Sirve para módulos que el
//    API gatea por rol sin un permiso sembrado; así el front no copia la lista
//    de roles del API. Un hijo con `access` puede asomar dentro de un módulo
//    superAdminOnly (el padre aparece solo con esos hijos).

import type { ComponentType } from 'react';

/** Accesos que se deciden con una sonda al API (no con permisos). */
export type NavAccessKey = 'legacySyncRead';
export type NavAccess = Partial<Record<NavAccessKey, boolean>>;

export interface NavChild {
  name: string;
  href: string;
  // Permisos PROPIOS del hijo (cualquiera de ellos). Sin ellos hereda los del
  // padre. Con ellos se muestra aunque el rol no tenga los del padre (y el
  // padre aparece solo con los hijos permitidos).
  permissions?: string[];
  // Acceso decidido por el API (sonda). Manda sobre `permissions`.
  access?: NavAccessKey;
}

export interface NavItem {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  children?: NavChild[];
  // Permisos requeridos para ver este elemento (cualquiera de ellos)
  permissions?: string[];
  // Visible EXCLUSIVAMENTE para el rol super_admin (ignora permisos); solo
  // asoman para otros los hijos con `access` concedido.
  superAdminOnly?: boolean;
}

// Función para verificar si el usuario tiene al menos uno de los permisos requeridos
export function hasAnyPermission(userPermissions: string[], requiredPermissions?: string[]): boolean {
  // Si no hay permisos requeridos, mostrar el elemento
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  // Verificar si tiene permiso wildcard total
  if (userPermissions.includes('*')) {
    return true;
  }

  // Verificar cada permiso requerido
  return requiredPermissions.some((required) => {
    const [requiredModule] = required.split(':');

    return userPermissions.some((userPerm) => {
      const [userModule, userAction] = userPerm.split(':');

      // Coincidencia exacta
      if (userPerm === required) return true;

      // Wildcard de módulo (ej: "inventory:*" permite "inventory:read")
      if (userModule === requiredModule && userAction === '*') return true;

      // Wildcard global
      if (userModule === '*' && userAction === '*') return true;

      return false;
    });
  });
}

export function filterNavigation(
  items: readonly NavItem[],
  ctx: { isSuperAdmin: boolean; permissions: string[]; access?: NavAccess },
): NavItem[] {
  // Super admin ve todo (incluidos los items superAdminOnly)
  if (ctx.isSuperAdmin) return [...items];

  const access = ctx.access ?? {};
  const byAccess = (child: NavChild) =>
    child.access !== undefined && access[child.access] === true;

  return items.flatMap((item) => {
    if (item.superAdminOnly) {
      const children = (item.children ?? []).filter(byAccess);
      return children.length ? [{ ...item, children }] : [];
    }
    const parentAllowed = hasAnyPermission(ctx.permissions, item.permissions);
    if (!item.children) return parentAllowed ? [item] : [];
    // Hijo con acceso por sonda: se decide por ella. Con permisos propios: por
    // ellos. Sin nada propio: hereda al padre.
    const children = item.children.filter((child) =>
      child.access !== undefined
        ? byAccess(child)
        : child.permissions
          ? hasAnyPermission(ctx.permissions, child.permissions)
          : parentAllowed,
    );
    if (children.length === 0) return parentAllowed ? [{ ...item, children: undefined }] : [];
    return [{ ...item, children }];
  });
}
