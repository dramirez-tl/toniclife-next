'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui';
import {
  Bars3Icon,
  XMarkIcon,
  ShoppingCartIcon,
  UserIcon,
  GlobeAltIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { useCartSummary } from '@/hooks/useCart';
import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated, selectUserRoles, selectUser } from '@/store/slices/authSlice';

const navigation = [
  { name: 'Inicio', href: '/' },
  {
    name: 'Productos',
    href: '/productos',
    children: [
      { name: 'Energía', href: '/productos/energia' },
      { name: 'Detox', href: '/productos/detox' },
      { name: 'Belleza', href: '/productos/belleza' },
      { name: 'Estrés & Sueño', href: '/productos/estres' },
      { name: 'Salud Femenina', href: '/productos/hormonal' },
      { name: 'Salud Masculina', href: '/productos/masculino' },
      { name: 'Ver todos', href: '/productos' }
    ]
  },
  { name: 'Evaluación de Salud', href: '/quiz', highlight: true },
  { name: 'Distribuidores', href: '/#reconocimientos' }
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const closeDropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get cart item count from API
  const { data: cartSummary } = useCartSummary();
  const cartItemCount = cartSummary?.itemCount || 0;

  // Get user authentication state, roles, and profile
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const userRoles = useAppSelector(selectUserRoles);
  const user = useAppSelector(selectUser);

  // Determine the correct dashboard URL based on user roles
  const dashboardUrl = useMemo(() => {
    if (!isAuthenticated) return '/login';

    // Admin roles that should access the admin panel (database role codes)
    const adminRoles = ['super_admin', 'administrador', 'subadmin', 'almacen', 'ventas_mostrador', 'rh', 'contabilidad', 'auditor', 'viewer'];
    if (userRoles.some(role => adminRoles.includes(role))) return '/admin';

    // All authenticated users go to distributor dashboard
    return '/distribuidor';
  }, [isAuthenticated, userRoles]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const clearCloseDropdownTimeout = () => {
    if (closeDropdownTimeoutRef.current) {
      clearTimeout(closeDropdownTimeoutRef.current);
      closeDropdownTimeoutRef.current = null;
    }
  };

  const handleDropdownEnter = (name: string) => {
    clearCloseDropdownTimeout();
    setActiveDropdown(name);
  };

  const handleDropdownLeave = () => {
    clearCloseDropdownTimeout();
    closeDropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 120);
  };

  useEffect(() => {
    return () => clearCloseDropdownTimeout();
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm">
      {/* Top bar */}
      <div className="bg-[#3E667D] text-white text-sm py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <p className="hidden sm:block">Bienestar natural desde 2004 — Tonic Life</p>
          <p className="sm:hidden text-center w-full">Bienestar natural — Tonic Life</p>
          <div className="hidden sm:flex items-center gap-4">
            <button
              onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
              className="flex items-center gap-1 hover:text-[#3E667D] transition-colors"
            >
              <GlobeAltIcon className="h-4 w-4" />
              {language === 'es' ? 'ES' : 'EN'}
            </button>
            <span>|</span>
            <Link href="/ayuda" className="hover:text-[#3E667D] transition-colors">
              Ayuda
            </Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-[4.5rem] xl:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo/logo-text-dark.png"
              alt="Tonic Life - Tu Centro de Bienestar"
              width={280}
              height={90}
              priority
              className="h-20 lg:h-24 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-0.5 rounded-full border border-gray-100 bg-white/70 px-1.5 py-1 shadow-sm">
            {navigation.map((item) => (
              <div
                key={item.name}
                className="relative"
                onMouseEnter={() => item.children && handleDropdownEnter(item.name)}
                onMouseLeave={handleDropdownLeave}
              >
                {item.children ? (
                  <>
                    <button
                      className={`
                        flex items-center gap-1 px-3 xl:px-4 py-2 rounded-full
                        text-sm xl:text-base text-[#3E667D] font-medium
                        hover:bg-[#3E667D]/5 transition-colors
                        ${activeDropdown === item.name || isActive(item.href) ? 'bg-[#3E667D]/8 text-[#3E667D]' : ''}
                        ${item.highlight ? 'bg-[#C8DDF2]/10 text-[#3E667D]' : ''}
                      `}
                      aria-expanded={activeDropdown === item.name}
                    >
                      {item.name}
                      <ChevronDownIcon className="h-4 w-4" />
                    </button>

                    {/* Dropdown */}
                    {activeDropdown === item.name && (
                      <div
                        className="absolute top-full left-0 z-20 w-56 pt-2"
                        onMouseEnter={() => handleDropdownEnter(item.name)}
                        onMouseLeave={handleDropdownLeave}
                      >
                        <div className="rounded-xl border border-gray-100 bg-white py-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                          {item.children.map((child) => (
                            <Link
                              key={child.name}
                              href={child.href}
                              className="block px-4 py-2 text-gray-700 hover:bg-[#C8DDF2]/10 hover:text-[#3E667D] transition-colors"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={`
                      px-3 xl:px-4 py-2 rounded-full
                      text-sm xl:text-base font-medium transition-colors
                      ${item.highlight
                        ? 'bg-[#3E667D] text-white hover:bg-[#2f5165]'
                        : isActive(item.href)
                          ? 'bg-[#3E667D]/8 text-[#3E667D]'
                          : 'text-[#3E667D] hover:bg-[#3E667D]/5'
                      }
                    `}
                  >
                    {item.name}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Cart */}
            <Link
              href="/carrito"
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ShoppingCartIcon className="h-6 w-6 text-[#3E667D]" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#3E667D] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* User */}
            <Link
              href={dashboardUrl}
              className="hidden sm:flex items-center justify-center p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              {isAuthenticated && user ? (
                user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={`${user.firstName} ${user.lastName}`}
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-full object-cover ring-2 ring-[#3E667D]/20"
                  />
                ) : (
                  <span className="h-7 w-7 rounded-full bg-[#3E667D] text-white text-xs font-bold flex items-center justify-center ring-2 ring-[#3E667D]/20">
                    {user.firstName?.charAt(0)?.toUpperCase()}{user.lastName?.charAt(0)?.toUpperCase()}
                  </span>
                )
              ) : (
                <UserIcon className="h-6 w-6 text-[#3E667D]" />
              )}
            </Link>

            {/* CTA Button - Desktop */}
            <div className="hidden xl:block ml-2">
              <Link href="/quiz">
                <Button size="md">
                  Mi Evaluación
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6 text-[#3E667D]" />
              ) : (
                <Bars3Icon className="h-6 w-6 text-[#3E667D]" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {navigation.map((item) => (
              <div key={item.name}>
                {item.children ? (
                  <>
                    <button
                      onClick={() =>
                        setActiveDropdown(activeDropdown === item.name ? null : item.name)
                      }
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[#3E667D] font-medium hover:bg-gray-50"
                    >
                      {item.name}
                      <ChevronDownIcon
                        className={`h-5 w-5 transition-transform ${
                          activeDropdown === item.name ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {activeDropdown === item.name && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.name}
                            href={child.href}
                            className="block px-4 py-2 text-gray-600 hover:text-[#3E667D]"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={`
                      block px-4 py-3 rounded-xl font-medium
                      ${item.highlight
                        ? 'bg-[#3E667D] text-white'
                        : isActive(item.href)
                          ? 'bg-[#3E667D]/10 text-[#3E667D]'
                          : 'text-[#3E667D] hover:bg-gray-50'
                      }
                    `}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                )}
              </div>
            ))}

            <div className="pt-4 border-t border-gray-100 mt-4 space-y-3">
              <Link href={dashboardUrl} onClick={() => setMobileMenuOpen(false)}>
                <Button fullWidth size="lg" variant={isAuthenticated ? 'outline' : 'primary'}>
                  {isAuthenticated ? 'Mi Cuenta' : 'Iniciar Sesión'}
                </Button>
              </Link>
              <Link href="/quiz" onClick={() => setMobileMenuOpen(false)}>
                <Button fullWidth size="lg" variant={isAuthenticated ? 'primary' : 'outline'}>
                  Mi Evaluación
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
