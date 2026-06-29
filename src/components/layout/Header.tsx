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
  ChevronDownIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useCartSummary } from '@/hooks/useCart';
import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated, selectUserRoles, selectUser, selectIsInitialized } from '@/store/slices/authSlice';
import { useTranslations } from 'next-intl';
import { CountryLanguageSelector } from '@/components/public/CountryLanguageSelector';
import { DEFAULT_LOCALE, buildLocale, countryMeta, localeCountry, localeLanguage } from '@/i18n/config';
import { getStoredLocale, setStoredLocale } from '@/lib/store-locale';
import { readyAccountCountry } from '@/hooks/useStoreCountry';

interface NavItem {
  name: string;
  href: string;
  children?: { name: string; href: string }[];
  highlight?: boolean;
}

// `name` = clave i18n estable (nav.<name>); el texto visible lo resuelve t().
const navigation: NavItem[] = [
  { name: 'home', href: '/' },
  { name: 'products', href: '/productos' },
  { name: 'evaluation', href: '/quiz', highlight: true },
];

export function Header() {
  const t = useTranslations();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  // País + idioma de la tienda (locale 'es-mx', 'en-us', …). Arranca en el
  // default (igual en SSR y 1er render) y se ajusta desde la cookie al montar.
  const [locale, setLocale] = useState<string>(DEFAULT_LOCALE);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const closeDropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = getStoredLocale();
    if (stored) setLocale(stored);
  }, []);

  const handleSelectLocale = (loc: string) => {
    setStoredLocale(loc);
    setSelectorOpen(false);
    // Navega a la home del locale elegido (recarga completa: re-lee la cookie y
    // re-hidrata). El middleware sirve /{loc} y deja los precios/UI de ese país.
    window.location.href = `/${loc}`;
  };

  // Get cart item count from API
  const { data: cartSummary } = useCartSummary();
  const cartItemCount = cartSummary?.itemCount || 0;

  // Get user authentication state, roles, and profile
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isInitialized = useAppSelector(selectIsInitialized);
  const userRoles = useAppSelector(selectUserRoles);
  const user = useAppSelector(selectUser);

  // Si el usuario está logueado y su país tiene tienda lista, el país lo fija su
  // cuenta (solo puede cambiar idioma). El locale efectivo usa ese país.
  const accountCountry = isAuthenticated
    ? readyAccountCountry(user?.countryCode)
    : undefined;
  const effectiveLocale = accountCountry
    ? buildLocale(localeLanguage(locale), accountCountry)
    : locale;
  const currentCountry = countryMeta(localeCountry(effectiveLocale));

  // Determine the correct dashboard URL based on user roles
  const dashboardUrl = useMemo(() => {
    if (!isAuthenticated) return '/login';

    // Admin roles that should access the admin panel (database role codes)
    const adminRoles = [
      'super_admin', 'administrador', 'subadmin',
      'almacen', 'ventas_mostrador', 'rh', 'contabilidad', 'auditor', 'viewer',
      'comercial', 'comercial_two', 'comercial_three', 'comercial_usa', 'dircomer',
      'call_center', 'sucursales', 'auxiliar_sucursal', 'supervisor', 'auxiliar',
      'cedea', 'cedea_two', 'cedeas', 'cedeas2', 'compras',
    ];
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
    <>
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#2f5165] text-white text-sm py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <p className="hidden sm:block text-white/90">{t('common.tagline')}</p>
          <p className="sm:hidden text-center w-full text-white/90">{t('common.tagline')}</p>
          <div className="hidden sm:flex items-center gap-4">
            <button
              onClick={() => setSelectorOpen(true)}
              className="flex items-center gap-1.5 text-white/90 hover:text-[#C8DDF2] transition-colors"
              aria-label="Cambiar país e idioma"
            >
              <span className="text-base leading-none">{currentCountry.flag}</span>
              <span>{localeLanguage(effectiveLocale).toUpperCase()}</span>
              <ChevronDownIcon className="h-3.5 w-3.5" />
            </button>
            <span className="text-white/30">|</span>
            <Link href="/faq" className="text-white/90 hover:text-[#C8DDF2] transition-colors">
              {t('nav.help')}
            </Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 lg:h-24">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo/svg/logo-text-blue.svg"
              alt="Tonic Life - Tu Centro de Bienestar"
              className="w-[160px] lg:w-[200px] xl:w-[220px] h-auto"
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
                      {t(`nav.${item.name}`)}
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
                      flex items-center gap-1.5 px-3 xl:px-4 py-2 rounded-full
                      text-sm xl:text-base font-medium transition-all
                      ${item.highlight
                        ? 'bg-[#C8DDF2] text-[#2f5165] ring-1 ring-[#3E667D]/15 hover:bg-[#b6d2ec] hover:ring-[#3E667D]/25'
                        : isActive(item.href)
                          ? 'bg-[#3E667D]/10 text-[#3E667D] font-semibold'
                          : 'text-[#3E667D] hover:bg-[#3E667D]/5'
                      }
                    `}
                  >
                    {item.highlight && <SparklesIcon className="h-4 w-4" />}
                    {t(`nav.${item.name}`)}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <span className="hidden lg:block h-6 w-px bg-gray-200 mr-1" aria-hidden="true" />
            {/* Cart */}
            <Link
              href="/carrito"
              aria-label={`Carrito${cartItemCount > 0 ? ` (${cartItemCount})` : ''}`}
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ShoppingCartIcon className="h-6 w-6 text-[#3E667D]" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#3E667D] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-white">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* CTA / Auth Button - Desktop */}
            <div className="hidden sm:block ml-2">
              {!isInitialized ? (
                <div className="h-9 w-28 rounded-full bg-gray-100 animate-pulse" />
              ) : (
              <Link href={isAuthenticated ? dashboardUrl : '/login'} className="cursor-pointer">
                {isAuthenticated && user ? (
                  <span className="flex items-center gap-2 bg-[#3E667D] hover:bg-[#2f5165] text-white text-sm font-medium px-3 py-1.5 rounded-full transition-colors cursor-pointer">
                    {user.avatarUrl ? (
                      <Image
                        src={user.avatarUrl}
                        alt={`${user.firstName} ${user.lastName}`}
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <span className="h-6 w-6 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {user.firstName?.charAt(0)?.toUpperCase()}{user.lastName?.charAt(0)?.toUpperCase()}
                      </span>
                    )}
                    {t('nav.goToPanel')}
                  </span>
                ) : (
                  <Button size="md" className="cursor-pointer">
                    {t('nav.login')}
                  </Button>
                )}
              </Link>
              )}
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
        <div className="lg:hidden relative z-50 bg-white border-t border-gray-100 shadow-xl rounded-b-2xl animate-in slide-in-from-top-2 duration-200">
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
                      {t(`nav.${item.name}`)}
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
                      flex items-center gap-2 px-4 py-3 rounded-xl font-medium
                      ${item.highlight
                        ? 'bg-[#C8DDF2] text-[#2f5165] ring-1 ring-[#3E667D]/15'
                        : isActive(item.href)
                          ? 'bg-[#3E667D]/10 text-[#3E667D] font-semibold'
                          : 'text-[#3E667D] hover:bg-gray-50'
                      }
                    `}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.highlight && <SparklesIcon className="h-5 w-5" />}
                    {t(`nav.${item.name}`)}
                  </Link>
                )}
              </div>
            ))}

            <div className="pt-4 mt-2 border-t border-gray-100">
              <Link
                href={dashboardUrl}
                onClick={() => setMobileMenuOpen(false)}
                className="block"
              >
                <Button size="lg" variant="default" className="w-full">
                  {isAuthenticated ? 'Mi Cuenta' : 'Iniciar Sesión'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>

      {/* Backdrop del menú móvil — atenúa el contenido para efecto modal */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        />
      )}

      {/* Selector de país + idioma */}
      <CountryLanguageSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        currentLocale={effectiveLocale}
        onSelect={handleSelectLocale}
        lockedCountry={accountCountry}
      />
    </>
  );
}
