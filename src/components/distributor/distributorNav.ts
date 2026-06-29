// Configuración de navegación del portal del distribuidor.
// Fuente única usada por DistributorTopNav (móvil), DistributorSidebar (escritorio)
// y DistributorMoreMenu (panel "Más"), para que las tres se mantengan en sync.

import {
  HomeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  FlagIcon,
  TrophyIcon,
  ClockIcon,
  FolderIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  BellIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  PhoneIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

export interface NavLink {
  // key = clave i18n bajo distributor.nav.* ; name = fallback en español.
  key: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavGroup {
  // key = clave i18n bajo distributor.groups.* ; title = fallback en español.
  key: string;
  title: string;
  items: NavLink[];
}

// Destinos núcleo (pestañas principales + tope del sidebar).
export const CORE_NAV: NavLink[] = [
  { key: 'home', name: 'Inicio', href: '/distribuidor', icon: HomeIcon },
  { key: 'network', name: 'Mi Red', href: '/distribuidor/red', icon: UsersIcon },
  { key: 'commissions', name: 'Comisiones', href: '/distribuidor/comisiones', icon: CurrencyDollarIcon },
  { key: 'sales', name: 'Ventas', href: '/distribuidor/ventas', icon: ChartBarIcon },
];

// Secundarios, agrupados bajo "Más".
export const MORE_GROUPS: NavGroup[] = [
  {
    key: 'business',
    title: 'Mi Negocio',
    items: [
      { key: 'orders', name: 'Mis Pedidos', href: '/distribuidor/pedidos', icon: ClipboardDocumentListIcon },
      { key: 'shareCart', name: 'Compartir carrito', href: '/distribuidor/compartir-carrito', icon: ShoppingCartIcon },
    ],
  },
  {
    key: 'tools',
    title: 'Herramientas',
    items: [
      { key: 'materials', name: 'Materiales', href: '/distribuidor/materiales', icon: FolderIcon },
      { key: 'training', name: 'Capacitación', href: '/distribuidor/capacitacion', icon: AcademicCapIcon },
    ],
  },
  {
    key: 'account',
    title: 'Mi cuenta',
    items: [
      { key: 'payments', name: 'Pagos', href: '/distribuidor/pagos', icon: DocumentTextIcon },
      { key: 'notifications', name: 'Notificaciones', href: '/distribuidor/notificaciones', icon: BellIcon },
      { key: 'settings', name: 'Configuración', href: '/distribuidor/configuracion', icon: Cog6ToothIcon },
    ],
  },
];

// Módulos aún no habilitados (se muestran como "Próximamente", no clickeables).
// Reportes/Metas/Ranking/Actividad se liberarán poco a poco.
export const COMING_SOON: { key: string; name: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'reports', name: 'Reportes', icon: ChartBarIcon },
  { key: 'goals', name: 'Metas', icon: FlagIcon },
  { key: 'ranking', name: 'Ranking', icon: TrophyIcon },
  { key: 'activity', name: 'Actividad', icon: ClockIcon },
  { key: 'prospects', name: 'Prospectos', icon: UserGroupIcon },
  { key: 'salesScripts', name: 'Scripts de Venta', icon: DocumentDuplicateIcon },
  { key: 'events', name: 'Eventos', icon: CalendarIcon },
  { key: 'communication', name: 'Comunicación', icon: ChatBubbleLeftRightIcon },
  { key: 'support', name: 'Soporte', icon: PhoneIcon },
];
