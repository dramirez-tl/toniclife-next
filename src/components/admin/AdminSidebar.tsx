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
  UsersIcon,
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
}

// Navegación con permisos requeridos
const navigation: NavItem[] = [
  { name: 'Panel Principal', href: '/admin', icon: HomeIcon }, // Todos pueden ver el panel principal
  { name: 'Sucursales', href: '/admin/sucursales', icon: BuildingStorefrontIcon, permissions: ['config.branches', 'config.branches.read'] },
  { name: 'Usuarios', href: '/admin/usuarios', icon: UserGroupIcon, permissions: ['users:read', 'config.users', 'config.users.read'] },
  { name: 'Distribuidores', href: '/admin/distribuidores', icon: UsersIcon, permissions: ['customers:read', 'customers', 'customers.list.read'] },
  { name: 'Productos', href: '/admin/productos', icon: ShoppingBagIcon, permissions: ['config.products', 'config.products.read'] },
  { name: 'Pedidos', href: '/admin/pedidos', icon: ClipboardDocumentListIcon, permissions: ['sales.orders', 'sales.orders.read'] },
  {
    name: 'Inventario',
    href: '/admin/inventario',
    icon: CubeIcon,
    permissions: ['inventory', 'inventory.stock'],
    children: [
      { name: 'Existencias General', href: '/admin/inventario' },
      { name: 'Traspasos', href: '/admin/inventario/traspasos' },
      { name: 'Ajustes', href: '/admin/inventario/ajustes' },
    ],
  },
  { name: 'Comisiones', href: '/admin/comisiones', icon: CurrencyDollarIcon, permissions: ['commissions', 'commissions.history'] },
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
  { name: 'Programa Arranque', href: '/admin/programa-arranque', icon: RocketLaunchIcon, permissions: ['startup-program:read', 'startup-program:*', 'config'] },
  {
    name: 'Facturación',
    href: '/admin/facturacion',
    icon: DocumentTextIcon,
    permissions: ['reports.invoices', 'config'],
    children: [
      { name: 'Facturas', href: '/admin/facturacion' },
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
      { name: 'Panel Principal', href: '/admin/reportes' },
      { name: 'Ventas', href: '/admin/reportes/ventas' },
      { name: 'Inventario', href: '/admin/reportes/inventario' },
      { name: 'Comisiones', href: '/admin/reportes/comisiones' },
      { name: 'Clientes', href: '/admin/reportes/clientes' },
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
      { name: 'Asistencia', href: '/admin/rrhh/asistencia' },
      { name: 'Vacaciones', href: '/admin/rrhh/vacaciones' },
      { name: 'Viáticos', href: '/admin/rrhh/viaticos' },
    ],
  },
  { name: 'Cupones', href: '/admin/cupones', icon: TagIcon, permissions: ['customers.promos', 'config'] },
  { name: 'Banners', href: '/admin/banners', icon: PhotoIcon, permissions: ['config'] },
  { name: 'Contenido', href: '/admin/contenido', icon: ComputerDesktopIcon, permissions: ['config'] },
  { name: 'Punto de Venta', href: '/admin/pos', icon: ComputerDesktopIcon, permissions: ['pos:read', 'pos:write', 'pos:*', 'sales.pos', 'sales.pos.read', 'sales.pos.create'] },
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
  onNavigate?: () => void;
}

export function AdminSidebar({ mobile = false, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const userPermissions = useAppSelector(selectUserPermissions);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Roles con acceso al sidebar filtrado por permisos
  const FULL_ACCESS_ROLES = ['super_admin', 'administrador', 'viewer', 'subadmin', 'sucursales', 'auxiliar_sucursal'];

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

    // Super admin ve todo
    if (user?.roles?.includes('super_admin')) {
      return navigation;
    }

    return navigation.filter((item) => hasAnyPermission(userPermissions, item.permissions));
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
        mobile ? 'h-full' : 'fixed left-0 top-0 h-screen'
      }`}
      aria-label="Barra lateral de administración"
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        <Link href="/admin" className="flex items-center" onClick={onNavigate} aria-label="Ir al panel de administración">
          <div className="w-8 h-8 bg-[#C8DDF2] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">TL</span>
          </div>
        </Link>
        {mobile && (
          <button
            onClick={onNavigate}
            className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
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
                          ? 'bg-white/12 text-white ring-1 ring-white/10'
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
                                    ? 'bg-[#3E667D] text-white font-medium shadow-sm'
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
                        ? 'bg-[#3E667D] text-white shadow-sm'
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
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#C8DDF2] rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">{getUserInitials()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{getUserDisplayName()}</p>
            <p className="text-xs text-white/60 truncate">{getUserRoleLabel()}</p>
          </div>
        </div>
        <div className="space-y-1">
          <Link
            href="/"
            onClick={onNavigate}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            <span>Volver al sitio</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
