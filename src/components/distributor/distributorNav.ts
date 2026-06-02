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
} from '@heroicons/react/24/outline';

export interface NavLink {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavGroup {
  title: string;
  items: NavLink[];
}

// Destinos núcleo (pestañas principales + tope del sidebar).
export const CORE_NAV: NavLink[] = [
  { name: 'Inicio', href: '/distribuidor', icon: HomeIcon },
  { name: 'Mi Red', href: '/distribuidor/red', icon: UsersIcon },
  { name: 'Ganancias', href: '/distribuidor/comisiones', icon: CurrencyDollarIcon },
  { name: 'Vender', href: '/distribuidor/ventas', icon: ShoppingCartIcon },
];

// Secundarios, agrupados bajo "Más".
export const MORE_GROUPS: NavGroup[] = [
  {
    title: 'Mi Negocio',
    items: [
      { name: 'Reportes', href: '/distribuidor/reportes', icon: ChartBarIcon },
      { name: 'Metas', href: '/distribuidor/metas', icon: FlagIcon },
      { name: 'Ranking', href: '/distribuidor/ranking', icon: TrophyIcon },
      { name: 'Actividad', href: '/distribuidor/actividad', icon: ClockIcon },
    ],
  },
  {
    title: 'Herramientas',
    items: [
      { name: 'Materiales', href: '/distribuidor/materiales', icon: FolderIcon },
      { name: 'Capacitación', href: '/distribuidor/capacitacion', icon: AcademicCapIcon },
    ],
  },
  {
    title: 'Mi cuenta',
    items: [
      { name: 'Pagos', href: '/distribuidor/pagos', icon: DocumentTextIcon },
      { name: 'Notificaciones', href: '/distribuidor/notificaciones', icon: BellIcon },
      { name: 'Configuración', href: '/distribuidor/configuracion', icon: Cog6ToothIcon },
    ],
  },
];

// Módulos aún no habilitados (se muestran como "Próximamente", no clickeables).
export const COMING_SOON: { name: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { name: 'Prospectos', icon: UserGroupIcon },
  { name: 'Scripts de Venta', icon: DocumentDuplicateIcon },
  { name: 'Eventos', icon: CalendarIcon },
  { name: 'Comunicación', icon: ChatBubbleLeftRightIcon },
  { name: 'Soporte', icon: PhoneIcon },
];
