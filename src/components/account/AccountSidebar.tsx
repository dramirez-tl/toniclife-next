'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingBagIcon,
  HeartIcon,
  MapPinIcon,
  CreditCardIcon,
  UserCircleIcon,
  BellIcon,
  CogIcon,
  HomeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon,
  ArrowLeftStartOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  ShoppingBagIcon as ShoppingBagSolid,
  HeartIcon as HeartSolid,
  MapPinIcon as MapPinSolid,
  CreditCardIcon as CreditCardSolid,
  UserCircleIcon as UserCircleSolid,
  BellIcon as BellSolid,
  HomeIcon as HomeSolid,
  StarIcon as StarSolid,
} from '@heroicons/react/24/solid';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconSolid: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    title: 'Principal',
    items: [
      {
        name: 'Dashboard',
        href: '/cuenta',
        icon: HomeIcon,
        iconSolid: HomeSolid,
      },
    ],
  },
  {
    title: 'Mis Compras',
    items: [
      {
        name: 'Mis Pedidos',
        href: '/cuenta/pedidos',
        icon: ShoppingBagIcon,
        iconSolid: ShoppingBagSolid,
        badge: 2,
      },
      {
        name: 'Favoritos',
        href: '/cuenta/favoritos',
        icon: HeartIcon,
        iconSolid: HeartSolid,
        badge: 8,
      },
    ],
  },
  {
    title: 'Mi Cuenta',
    items: [
      {
        name: 'Mi Perfil',
        href: '/cuenta/perfil',
        icon: UserCircleIcon,
        iconSolid: UserCircleSolid,
      },
      {
        name: 'Direcciones',
        href: '/cuenta/direcciones',
        icon: MapPinIcon,
        iconSolid: MapPinSolid,
      },
      {
        name: 'Métodos de Pago',
        href: '/cuenta/pagos',
        icon: CreditCardIcon,
        iconSolid: CreditCardSolid,
      },
      {
        name: 'Notificaciones',
        href: '/cuenta/notificaciones',
        icon: BellIcon,
        iconSolid: BellSolid,
        badge: 3,
      },
      {
        name: 'Puntos de Lealtad',
        href: '/cuenta/lealtad',
        icon: StarIcon,
        iconSolid: StarSolid,
      },
    ],
  },
];

// Mock user data
const mockUser = {
  firstName: 'Juan',
  lastName: 'Pérez',
  email: 'juan.perez@email.com',
  loyaltyPoints: 1250,
};

export function AccountSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Auto-collapse on tablets, auto-expand on desktop
      if (window.innerWidth < 1280 && window.innerWidth >= 1024) {
        setIsCollapsed(true);
      } else if (window.innerWidth >= 1280) {
        setIsCollapsed(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/cuenta') {
      return pathname === '/cuenta';
    }
    return pathname.startsWith(href);
  };

  const SidebarContent = ({ collapsed }: { collapsed: boolean }) => (
    <>
      {/* User Profile Section */}
      <div className={`p-4 border-b border-gray-200 ${collapsed ? 'px-2' : ''}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-12 h-12 bg-gradient-to-br from-[#003B7A] to-[#003B7A]/80 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">
              {mockUser.firstName[0]}{mockUser.lastName[0]}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {mockUser.firstName} {mockUser.lastName}
              </h3>
              <p className="text-sm text-gray-500 truncate">{mockUser.email}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="mt-3 flex items-center gap-2 bg-yellow-50 rounded-lg px-3 py-2">
            <StarIcon className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-700">
              {mockUser.loyaltyPoints.toLocaleString()} puntos
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {navigationSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
                {section.title}
              </h4>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = active ? item.iconSolid : item.icon;

                return (
                  <li key={item.name} className="relative">
                    <Link
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                        ${collapsed ? 'justify-center' : ''}
                        ${active
                          ? 'bg-[#003B7A] text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                      title={collapsed ? item.name : undefined}
                    >
                      <Icon className={`h-5 w-5 flex-shrink-0 ${active ? 'text-white' : 'text-gray-500'}`} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 font-medium">{item.name}</span>
                          {item.badge && (
                            <span
                              className={`
                                px-2 py-0.5 rounded-full text-xs font-semibold
                                ${active
                                  ? 'bg-white/20 text-white'
                                  : 'bg-[#7AB82E]/10 text-[#7AB82E]'
                                }
                              `}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                    {collapsed && item.badge && (
                      <span className="absolute -top-1 -right-1 bg-[#7AB82E] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className={`p-4 border-t border-gray-200 space-y-2 ${collapsed ? 'px-2' : ''}`}>
        {/* Settings */}
        <Link
          href="/cuenta/configuracion"
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors
            ${collapsed ? 'justify-center' : ''}
          `}
          title={collapsed ? 'Configuración' : undefined}
        >
          <CogIcon className="h-5 w-5" />
          {!collapsed && <span className="font-medium">Configuración</span>}
        </Link>

        {/* Logout */}
        <button
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors
            ${collapsed ? 'justify-center' : ''}
          `}
          title={collapsed ? 'Cerrar Sesión' : undefined}
        >
          <ArrowLeftStartOnRectangleIcon className="h-5 w-5" />
          {!collapsed && <span className="font-medium">Cerrar Sesión</span>}
        </button>

        {/* Collapse Toggle - Only on desktop */}
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors mt-4
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? (
              <ChevronRightIcon className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeftIcon className="h-5 w-5" />
                <span className="font-medium text-sm">Colapsar menú</span>
              </>
            )}
          </button>
        )}
      </div>
    </>
  );

  // Mobile: Floating button + Slide-out drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile Toggle Button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="fixed bottom-6 left-6 z-40 bg-[#003B7A] text-white p-4 rounded-full shadow-lg hover:bg-[#003B7A]/90 transition-colors lg:hidden"
          aria-label="Abrir menú"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Drawer */}
        <aside
          className={`
            fixed top-0 left-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 ease-in-out lg:hidden
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* Close button */}
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Cerrar menú"
            >
              <XMarkIcon className="h-6 w-6 text-gray-500" />
            </button>
          </div>

          <div className="h-full flex flex-col pt-12">
            <SidebarContent collapsed={false} />
          </div>
        </aside>
      </>
    );
  }

  // Desktop/Tablet: Fixed sidebar
  return (
    <aside
      className={`
        hidden lg:flex bg-white border-r border-gray-200 h-full flex-col transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-72'}
      `}
    >
      <SidebarContent collapsed={isCollapsed} />
    </aside>
  );
}
