// auth-roles.ts — CLASIFICACIÓN ÚNICA de a qué portal pertenece una sesión.
//
// Historia (ago-2026): el front tenía SIETE listas de códigos de rol quemadas
// y desincronizadas (middleware, login, admin/layout, distribuidor/layout,
// AdminSidebar, Header, vincular-correo). Un rol corporativo ausente de la
// lista equivocada (SISTEMAS, TESORERÍA, MARKETING…) caía en un ciclo de
// redirecciones donde ni /login ni el logout eran alcanzables y el usuario
// tenía que borrar caché para escapar — con cookie de 7 días.
//
// REGLA NUEVA: el portal se decide por la CATEGORÍA del rol
// (roles.category, migs 059-060), que el API incluye en el JWT y en la
// respuesta de login como `roleCategory`:
//   'colaborador' → panel /admin   (los módulos visibles los deciden sus
//                                   PERMISOS, no su nombre de rol)
//   'cliente'     → portal /distribuidor
// Un rol NUEVO creado en Seguridad → Roles funciona solo, sin tocar código.
//
// Las listas legacy de abajo existen SOLO como fallback para sesiones cuyo
// token se firmó ANTES de que el API incluyera roleCategory. NO agregues
// roles nuevos aquí: la categoría los clasifica automáticamente.

export type Portal = 'admin' | 'distributor' | 'unknown';

/** Unión de TODAS las listas admin históricas del front (fallback legacy). */
export const LEGACY_ADMIN_ROLE_CODES = [
  // Core
  'super_admin', 'administrador', 'subadmin', 'admin',
  // Operación
  'operaciones', 'ventas_mostrador', 'call_center', 'sucursales', 'supervisor',
  'auxiliar_sucursal', 'auxiliar',
  // Finanzas / contabilidad
  'contabilidad', 'contabilidad_two', 'contabilidad_viaticos', 'aux_contabilidad',
  'comisiones', 'comercial', 'comercial_two', 'comercial_three', 'comercial_usa',
  // Almacén / producción
  'almacen', 'laboratorio', 'materia_prima', 'aux_materia_prima', 'produccion',
  // Sistemas ('sistemas' = código vigente; 'soporte' = código pre-mig-019)
  'sistemas', 'soporte', 'mantenimiento',
  // Centros de distribución
  'cedea', 'cedea_two', 'cedeas', 'cedeas2', 'cedeas_viaticos', 'cedis',
  // RH y apoyo
  'rh', 'rh_viaticos', 'viaticos', 'solicitud_viaticos', 'asistente_direccion',
  // Auditoría y especiales
  'auditor', 'auditor_two', 'checador', 'dircomer',
  // Otros
  'help', 'jc', 'neo', 'usa_admin', 'compras', 'viewer',
  // Códigos de la migración legacy (default_module usado como role.code)
  'ventas', 'asistencia', 'clientes', 'solicitud-viaticos', 'productos',
  'ventas-totales-sucursal', 'documentos', 'aprobacion-viaticos',
  'corte-caja-sucursal', 'inventario', 'rrhh-trabajadores', 'puntos-periodo',
  'factura-libre',
];

/** Roles de distribuidor/cliente conocidos (fallback legacy). */
export const LEGACY_DISTRIBUTOR_ROLE_CODES = [
  'distribuidor', 'distributor', 'customer', 'dashboard', 'cliente-dashboard',
];

// La migración legacy creó códigos genéricos "role1"…"role46" para ~170k
// distribuidores; se matchea el patrón en vez de listar los 46.
const LEGACY_DISTRIBUTOR_ROLE_PATTERN = /^role\d+$/;

/** Portal según la categoría del rol (la fuente de verdad). */
export function portalFromCategory(category?: string | null): Portal {
  if (category === 'colaborador') return 'admin';
  if (category === 'cliente') return 'distributor';
  return 'unknown';
}

/** Portal según el código de rol (SOLO fallback para tokens sin categoría). */
export function portalFromLegacyRole(roleCode?: string | null): Portal {
  if (!roleCode) return 'unknown';
  if (LEGACY_ADMIN_ROLE_CODES.includes(roleCode)) return 'admin';
  if (
    LEGACY_DISTRIBUTOR_ROLE_CODES.includes(roleCode) ||
    LEGACY_DISTRIBUTOR_ROLE_PATTERN.test(roleCode)
  ) {
    return 'distributor';
  }
  return 'unknown';
}

/** Clasificación combinada: categoría primero, código legacy como fallback. */
export function resolvePortal(
  category?: string | null,
  roleCode?: string | null,
): Portal {
  const byCategory = portalFromCategory(category);
  return byCategory !== 'unknown' ? byCategory : portalFromLegacyRole(roleCode);
}
