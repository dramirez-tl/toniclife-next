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
  { name: 'Comisiones', href: '/distribuidor/comisiones', icon: CurrencyDollarIcon },
  { name: 'Ventas', href: '/distribuidor/ventas', icon: ChartBarIcon },
];

// Secundarios, agrupados bajo "Más".
export const MORE_GROUPS: NavGroup[] = [
  {
    title: 'Mi Negocio',
    items: [
      { name: 'Mis Pedidos', href: '/distribuidor/pedidos', icon: ClipboardDocumentListIcon },
      { name: 'Compartir carrito', href: '/distribuidor/compartir-carrito', icon: ShoppingCartIcon },
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
// Reportes/Metas/Ranking/Actividad se liberarán poco a poco.
export const COMING_SOON: { name: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { name: 'Reportes', icon: ChartBarIcon },
  { name: 'Metas', icon: FlagIcon },
  { name: 'Ranking', icon: TrophyIcon },
  { name: 'Actividad', icon: ClockIcon },
  { name: 'Prospectos', icon: UserGroupIcon },
  { name: 'Scripts de Venta', icon: DocumentDuplicateIcon },
  { name: 'Eventos', icon: CalendarIcon },
  { name: 'Comunicación', icon: ChatBubbleLeftRightIcon },
  { name: 'Soporte', icon: PhoneIcon },
];
