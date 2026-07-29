'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import {
  HomeIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  CubeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BriefcaseIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  TagIcon,
  PhotoIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
  ComputerDesktopIcon,
  BuildingStorefrontIcon,
  GlobeAltIcon,
  BellIcon,
  XMarkIcon,
  RocketLaunchIcon,
  ReceiptPercentIcon,
  AcademicCapIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutAsync, selectUser, selectUserPermissions } from '@/store/slices/authSlice';
import { toast } from 'sonner';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { name: string; href: string }[];
  // Permisos requeridos para ver este elemento (cualquiera de ellos)
  permissions?: string[];
  // Visible EXCLUSIVAMENTE para el rol super_admin (ignora permisos)
  superAdminOnly?: boolean;
}

// Navegación con permisos requeridos
const navigation: NavItem[] = [
  { name: 'Panel Principal', href: '/admin', icon: HomeIcon }, // Todos pueden ver el panel principal
  { name: 'Sucursales', href: '/admin/sucursales', icon: BuildingStorefrontIcon, permissions: ['config.branches', 'config.branches.read'] },
  { name: 'Usuarios', href: '/admin/usuarios', icon: UserGroupIcon, permissions: ['users:read', 'config.users', 'config.users.read'] },
  { name: 'Productos', href: '/admin/productos', icon: ShoppingBagIcon, permissions: ['config.products', 'config.products.read'] },
  { name: 'Pedidos', href: '/admin/pedidos', icon: ClipboardDocumentListIcon, permissions: ['sales.orders', 'sales.orders.read'] },
  {
    name: 'Inventario',
    href: '/admin/inventario',
    icon: CubeIcon,
    permissions: ['inventory', 'inventory.stock'],
    children: [
      { name: 'Existencias General', href: '/admin/inventario' },
      { name: 'Entradas', href: '/admin/inventario/entradas' },
      { name: 'Salidas', href: '/admin/inventario/salidas' },
      { name: 'Traspasos', href: '/admin/inventario/traspasos' },
      { name: 'Ajustes', href: '/admin/inventario/ajustes' },
    ],
  },
  {
    name: 'Activos TI',
    href: '/admin/activos',
    icon: ComputerDesktopIcon,
    permissions: ['assets', 'assets:read'],
    children: [
      { name: 'Inventario', href: '/admin/activos' },
      { name: 'Categorías', href: '/admin/activos/categorias' },
      { name: 'Ubicaciones', href: '/admin/activos/ubicaciones' },
      { name: 'Facturas de compra', href: '/admin/activos/facturas' },
      { name: 'Etiquetas', href: '/admin/activos/etiquetas' },
    ],
  },
  {
    name: 'Tesorería',
    href: '/admin/tesoreria',
    icon: CurrencyDollarIcon,
    permissions: ['commissions', 'commissions.history', 'customers:read'],
    children: [
      { name: 'Comisiones', href: '/admin/comisiones' },
      { name: 'Validación de Datos', href: '/admin/tesoreria/validacion-datos' },
    ],
  },
  {
    name: 'MLM',
    href: '/admin/mlm',
    icon: GlobeAltIcon,
    permissions: ['mlm:read', 'mlm:admin'],
    children: [
      { name: 'Rangos', href: '/admin/mlm/rangos' },
      { name: 'Periodos', href: '/admin/mlm/periodos' },
      { name: 'Puntos Acumulados', href: '/admin/mlm/rollover' },
      { name: 'Estadísticas de Red', href: '/admin/mlm/estadisticas' },
    ],
  },
  {
    name: 'Facturación',
    href: '/admin/facturacion',
    icon: DocumentTextIcon,
    permissions: ['reports.invoices', 'config'],
    children: [
      { name: 'Facturas', href: '/admin/facturacion' },
      { name: 'Reporte Folios', href: '/admin/facturacion/reporte-folios' },
      { name: 'Datos Fiscales', href: '/admin/facturacion/datos-fiscales' },
      { name: 'Factura Global', href: '/admin/facturacion/global' },
      { name: 'Complemento de Pago', href: '/admin/facturacion/complemento-pago' },
    ],
  },
  {
    name: 'Reportes',
    href: '/admin/reportes',
    icon: ChartBarIcon,
    permissions: ['reports', 'reports.sales'],
    children: [
      { name: 'Ventas', href: '/admin/reportes/ventas' },
      { name: 'Ventas por Sucursal', href: '/admin/reportes/ventas-sucursal' },
      { name: 'Ventas por Usuario', href: '/admin/reportes/ventas-usuario' },
      { name: 'Piezas por Producto', href: '/admin/reportes/piezas-producto' },
    ],
  },
  {
    name: 'RRHH',
    href: '/admin/rrhh',
    icon: BriefcaseIcon,
    permissions: ['hr', 'hr.workers.read'],
    children: [
      { name: 'Panel Principal', href: '/admin/rrhh' },
      { name: 'Empleados', href: '/admin/rrhh/empleados' },
      { name: 'Departamentos', href: '/admin/rrhh/departamentos' },
      { name: 'Organigrama', href: '/admin/rrhh/organigrama' },
      { name: 'Asistencia', href: '/admin/rrhh/asistencia' },
      { name: 'Vacaciones', href: '/admin/rrhh/vacaciones' },
      { name: 'Viáticos', href: '/admin/rrhh/viaticos' },
    ],
  },
  {
    name: 'Comercial',
    href: '/admin/comercial',
    icon: AcademicCapIcon,
    permissions: [
      'config',
      'customers:read',
      'comercial',
      'courses',
      'courses:read',
      'courses:manage',
      'materials',
      'materials:read',
      'materials:manage',
    ],
    children: [
      { name: 'Capacitación', href: '/admin/comercial/capacitacion' },
      { name: 'Materiales', href: '/admin/comercial/materiales' },
      { name: 'Simulaciones', href: '/admin/comercial/simulaciones' },
    ],
  },
  { name: 'Cupones', href: '/admin/cupones', icon: TagIcon, permissions: ['customers.promos', 'config'] },
  { name: 'Banners', href: '/admin/banners', icon: PhotoIcon, permissions: ['config'] },
  { name: 'Contenido', href: '/admin/contenido', icon: ComputerDesktopIcon, permissions: ['config'] },
  { name: 'Punto de Venta', href: '/admin/pos', icon: ComputerDesktopIcon, permissions: ['pos:read', 'pos:create', 'pos:*', 'sales.pos', 'sales.pos.read', 'sales.pos.create'] },
  {
    name: 'Auditoría',
    href: '/admin/auditoria',
    icon: ShieldCheckIcon,
    permissions: ['config'],
    children: [
      { name: 'Panel Principal', href: '/admin/auditoria' },
      { name: 'Logs', href: '/admin/auditoria/logs' },
      { name: 'Alertas', href: '/admin/auditoria/alertas' },
      { name: 'Reportes', href: '/admin/auditoria/reportes' },
      { name: 'Superusuario', href: '/admin/auditoria/superusuario' },
    ],
  },
  { name: 'Notificaciones', href: '/admin/notificaciones', icon: BellIcon, permissions: ['config'] },
  { name: 'Logs', href: '/admin/logs', icon: ClipboardDocumentListIcon, permissions: ['config'] },
  {
    name: 'Seguridad',
    href: '/admin/seguridad',
    icon: ShieldCheckIcon,
    permissions: ['config.roles', 'config.roles.read'],
    children: [
      { name: 'Roles y Permisos', href: '/admin/seguridad/roles' },
    ],
  },
  { name: 'Reglas Fiscales', href: '/admin/reglas-fiscales', icon: ReceiptPercentIcon, permissions: ['config', 'config.catalogs'] },
  {
    name: 'Configuración',
    href: '/admin/configuracion',
    icon: Cog6ToothIcon,
    permissions: ['config', 'config.catalogs'],
    children: [
      { name: 'General', href: '/admin/configuracion' },
      { name: 'Catálogos', href: '/admin/configuracion/catalogos' },
    ],
  },
  {
    name: 'Sistema',
    href: '/admin/sistema',
    icon: WrenchScrewdriverIcon,
    superAdminOnly: true,
    children: [
      { name: 'Limpieza y Carga', href: '/admin/sistema' },
    ],
  },
];

// Función para verificar si el usuario tiene al menos uno de los permisos requeridos
function hasAnyPermission(userPermissions: string[], requiredPermissions?: string[]): boolean {
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
    const [requiredModule, requiredAction] = required.split(':');

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

interface AdminSidebarProps {
  mobile?: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function AdminSidebar({ mobile = false, collapsed = false, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const userPermissions = useAppSelector(selectUserPermissions);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Roles con acceso al sidebar filtrado por permisos
  // 'sistemas' es el código vigente del rol del departamento de Sistemas
  // (la migración 019 renombró 'soporte' → 'sistemas'). Sin él, esos usuarios
  // caerían en isWorkerUser y solo verían el Panel Principal.
  const FULL_ACCESS_ROLES = ['super_admin', 'administrador', 'sistemas', 'viewer', 'subadmin', 'sucursales', 'auxiliar_sucursal', 'contabilidad', 'call_center', 'cedea', 'cedea_two', 'cedeas', 'cedeas2', 'comercial', 'comercial_two', 'comercial_three', 'comercial_usa', 'dircomer'];

  const isWorkerUser = useMemo(() => {
    if (!user?.roles?.length) return true;
    return !user.roles.some((r) => FULL_ACCESS_ROLES.includes(r));
  }, [user?.roles]);

  // Filtrar navegación según permisos
  const filteredNavigation = useMemo(() => {
    // Trabajadores solo ven Panel Principal
    if (isWorkerUser) {
      return navigation.filter((item) => item.href === '/admin');
    }

    // Super admin ve todo (incluidos los items superAdminOnly)
    if (user?.roles?.includes('super_admin')) {
      return navigation;
    }

    return navigation.filter(
      (item) => !item.superAdminOnly && hasAnyPermission(userPermissions, item.permissions),
    );
  }, [user?.roles, userPermissions, isWorkerUser]);

  const handleLogout = async () => {
    try {
      await dispatch(logoutAsync()).unwrap();
      toast.success('Sesión cerrada correctamente');
      router.push('/login');
    } catch {
      toast.error('Error al cerrar sesión');
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return 'AD';
    const first = user.firstName?.[0] || '';
    const last = user.lastName?.[0] || '';
    return (first + last).toUpperCase() || 'AD';
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return 'Admin';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin';
  };

  // Get user role label
  const getUserRoleLabel = () => {
    const code = user?.roles?.[0];
    if (!code) return 'Usuario';
    const roleLabels: Record<string, string> = {
      super_admin: 'Super Administrador',
      administrador: 'Administrador',
      subadmin: 'Sub-Administrador',
      operaciones: 'Operaciones',
      ventas_mostrador: 'Ventas Mostrador',
      call_center: 'Call Center',
      sucursales: 'Sucursales',
      supervisor: 'Supervisor',
      auxiliar_sucursal: 'Auxiliar Sucursal',
      auxiliar: 'Auxiliar',
      contabilidad: 'Contabilidad',
      contabilidad_two: 'Contabilidad',
      contabilidad_viaticos: 'Contabilidad',
      aux_contabilidad: 'Aux. Contabilidad',
      comisiones: 'Comisiones',
      comercial: 'Comercial',
      comercial_two: 'Comercial',
      comercial_three: 'Comercial',
      comercial_usa: 'Comercial USA',
      almacen: 'Almacén',
      laboratorio: 'Laboratorio',
      materia_prima: 'Materia Prima',
      aux_materia_prima: 'Aux. Materia Prima',
      produccion: 'Producción',
      soporte: 'Sistemas',
      mantenimiento: 'Mantenimiento',
      cedea: 'CEDEA',
      cedea_two: 'CEDEA',
      cedeas: 'CEDEAS',
      cedeas2: 'CEDEAS',
      cedeas_viaticos: 'CEDEAS',
      cedis: 'CEDIS',
      rh: 'RRHH',
      rh_viaticos: 'RRHH',
      viaticos: 'Viáticos',
      solicitud_viaticos: 'Viáticos',
      asistente_direccion: 'Asistente Dirección',
      auditor: 'Auditor',
      auditor_two: 'Auditor',
      checador: 'Checador',
      dircomer: 'Dir. Comercial',
      help: 'Soporte Caja',
      jc: 'JC',
      neo: 'Neo',
      usa_admin: 'Admin USA',
      compras: 'Compras',
      viewer: 'Solo Lectura',
    };
    return roleLabels[code] || code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const isChildActive = (children?: { name: string; href: string }[]) => {
    if (!children) return false;
    return children.some((child) => pathname === child.href || pathname.startsWith(child.href + '/'));
  };

  return (
    <aside
      className={`z-40 w-64 bg-[#3E667D] text-white flex flex-col ${
        mobile
          ? 'h-full'
          : `fixed left-0 top-0 h-screen transition-transform duration-300 ${collapsed ? '-translate-x-full' : 'translate-x-0'}`
      }`}
      aria-label="Barra lateral de administración"
    >
      {/* Logo */}
      <div className="relative flex h-16 items-center justify-center border-b border-white/10 px-5">
        <Link href="/admin" className="flex min-w-0 items-center justify-center" onClick={onNavigate} aria-label="Ir al panel de administración">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo/svg/logo-text-white-r.svg"
            alt="Tonic Life"
            className="h-8 w-auto"
          />
        </Link>
        {mobile && (
          <button
            onClick={onNavigate}
            className="absolute right-3 rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Cerrar menú"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
          Navegación
        </p>
        <ul className="space-y-1">
          {filteredNavigation.map((item) => {
            const active = isActive(item.href);
            const childActive = isChildActive(item.children);
            const isExpanded = expandedItems.includes(item.name) || childActive;

            return (
              <li key={item.name}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleExpand(item.name)}
                      aria-expanded={isExpanded}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        active || childActive
                          ? 'bg-white/15 text-white shadow-[inset_3px_0_0_0_#C8DDF2]'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span>{item.name}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </button>
                    {isExpanded && (
                      <ul className="mt-1 ml-8 space-y-1">
                        {item.children.map((child) => {
                          const childIsActive = pathname === child.href;
                          return (
                            <li key={child.name}>
                              <Link
                                href={child.href}
                                onClick={onNavigate}
                                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                                  childIsActive
                                    ? 'bg-white/15 text-white font-medium shadow-[inset_3px_0_0_0_#C8DDF2]'
                                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                {child.name}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-white/15 text-white shadow-[inset_3px_0_0_0_#C8DDF2]'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        {/* Mensaje para trabajadores */}
        {isWorkerUser && (
          <div className="mt-4 mx-1 rounded-lg bg-white/10 p-4 text-center">
            <Cog6ToothIcon className="mx-auto h-8 w-8 text-white/40 mb-2" />
            <p className="text-xs font-medium text-white/70">
              Los módulos de tu área se habilitarán en breve.
            </p>
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C8DDF2] text-sm font-bold text-[#2f5165] ring-1 ring-white/20">
            {getUserInitials()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{getUserDisplayName()}</p>
            <p className="truncate text-xs text-white/60">{getUserRoleLabel()}</p>
          </div>
        </div>
        <div className="space-y-0.5">
          <Link
            href="/"
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            <span>Volver al sitio</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
