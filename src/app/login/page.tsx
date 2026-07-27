'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  UserIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  SparklesIcon,
  LifebuoyIcon,
  GlobeAltIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { CountryLanguageSelector } from '@/components/public/CountryLanguageSelector';
import { DEFAULT_LOCALE, countryMeta, localeCountry, localeLanguage } from '@/i18n/config';
import { getStoredLocale, setStoredLocale } from '@/lib/store-locale';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { isEmailLinkRequired } from '@/services/auth.service';
import {
  loginAsync,
  logoutAsync,
  selectIsLoading,
  selectAuthError,
  selectEmailLinkRequired,
  clearError,
} from '@/store/slices/authSlice';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const t = useTranslations('auth');

  const isLoading = useAppSelector(selectIsLoading);
  const authError = useAppSelector(selectAuthError);
  const emailLinkRequired = useAppSelector(selectEmailLinkRequired);

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    // ON por defecto: guarda los tokens en localStorage, que SÍ se comparte
    // entre pestañas (abrir un módulo en otra pestaña ya no pide re-login).
    // El usuario puede desmarcarlo para una sesión que muera con el navegador.
    remember: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // País + idioma seleccionados en la tienda (cookie NEXT_LOCALE). El login no
  // vive bajo /[locale], pero el provider de i18n del layout raíz lee esa misma
  // cookie, así que el login respeta lo elegido en la página principal. Aquí solo
  // permitimos verlo/cambiarlo y recargar para re-aplicar el idioma.
  const [locale, setLocale] = useState<string>(DEFAULT_LOCALE);
  const [selectorOpen, setSelectorOpen] = useState(false);

  useEffect(() => {
    const stored = getStoredLocale();
    if (stored) setLocale(stored);
  }, []);

  const handleSelectLocale = (loc: string) => {
    setStoredLocale(loc);
    setSelectorOpen(false);
    // Recarga completa: el layout raíz re-lee la cookie y rehidrata el idioma.
    // Se conservan los query params (p. ej. ?redirect=...).
    window.location.reload();
  };

  const currentCountry = countryMeta(localeCountry(locale));

  // Show auth error as toast
  useEffect(() => {
    if (authError) {
      toast.error(authError);
      dispatch(clearError());
    }
  }, [authError, dispatch]);

  // Redirect to email linking page when required
  useEffect(() => {
    if (emailLinkRequired) {
      window.location.href = '/vincular-correo';
    }
  }, [emailLinkRequired]);

  const navigateAfterLogin = (roleCode?: string) => {
    // Admin roles that should access the admin panel (canonical + legacy-migration codes)
    const adminRoles = [
      'super_admin', 'administrador', 'subadmin', 'almacen', 'ventas_mostrador',
      'rh', 'contabilidad', 'auditor', 'viewer', 'call_center',
      'operaciones', 'sucursales', 'supervisor', 'auxiliar_sucursal', 'auxiliar',
      'soporte', 'cedea', 'cedea_two', 'cedeas', 'cedeas2', 'comisiones',
      'comercial', 'produccion', 'laboratorio', 'compras',
      'ventas', 'asistencia', 'clientes', 'solicitud-viaticos', 'productos',
      'ventas-totales-sucursal', 'documentos', 'aprobacion-viaticos',
      'corte-caja-sucursal', 'inventario', 'rrhh-trabajadores', 'puntos-periodo', 'factura-libre',
    ];
    const isAdmin = roleCode && adminRoles.includes(roleCode);

    // Read redirect param directly from the URL (avoids useSearchParams/Suspense)
    const params = new URLSearchParams(window.location.search);
    const redirectPath = params.get('redirect');

    // Honor the redirect only if it matches the user's section
    // (don't send admins to /distribuidor or vice versa from a stale redirect)
    if (redirectPath && redirectPath.startsWith('/')) {
      const isAdminRedirect = redirectPath.startsWith('/admin');
      const isDistribuidorRedirect = redirectPath.startsWith('/distribuidor');

      if (isAdmin && isAdminRedirect) {
        window.location.href = redirectPath;
        return;
      }
      if (!isAdmin && isDistribuidorRedirect) {
        window.location.href = redirectPath;
        return;
      }
      // For neutral redirects (not /admin or /distribuidor), honor them
      if (!isAdminRedirect && !isDistribuidorRedirect) {
        window.location.href = redirectPath;
        return;
      }
    }

    // Default: route based on role
    if (isAdmin) {
      window.location.href = '/admin';
    } else {
      window.location.href = '/distribuidor';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: acepta email, número de distribuidor o nombre de usuario
    const newErrors: Record<string, string> = {};
    const trimmedId = formData.identifier.trim();
    if (!trimmedId) {
      newErrors.identifier = t('errors.identifierRequired');
    }
    if (!formData.password) {
      newErrors.password = t('errors.passwordRequired');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      const result = await dispatch(loginAsync({
        identifier: trimmedId,
        password: formData.password,
        remember: formData.remember,
      })).unwrap();

      // Si requiere vincular email, el useEffect se encarga del redirect
      if (isEmailLinkRequired(result)) {
        return;
      }

      // Si inició sesión con usuario/legacy ID pero ya tiene correo verificado,
      // bloquear el login y obligar a usar el correo vinculado
      const usedEmail = trimmedId.includes('@');
      if (!usedEmail && result.user.emailVerifiedAt && result.user.email) {
        // Cerrar la sesión recién creada
        dispatch(logoutAsync());
        toast.error(t('toast.emailLinked'), { duration: 8000 });
        setFormData({ identifier: '', password: '', remember: true });
        return;
      }

      toast.success(t('toast.welcome'));
      navigateAfterLogin(result.user.roles?.[0]);
    } catch {
      // Error is handled via authError state
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#3E667D]/10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {/* Selector país + idioma (respeta lo elegido en la tienda; permite cambiarlo) */}
      <button
        type="button"
        onClick={() => setSelectorOpen(true)}
        className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm backdrop-blur transition hover:border-[#3E667D] hover:text-[#3E667D] sm:right-6 lg:right-8"
        aria-label={t('regionLabel')}
      >
        <GlobeAltIcon className="h-4 w-4" />
        <span className="text-base leading-none">{currentCountry.flag}</span>
        <span className="hidden sm:inline">{localeLanguage(locale).toUpperCase()}</span>
        <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
      </button>

      <div className="mx-auto flex w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <Link href="/">
              <Image
                src="/images/logo/svg/logo-text-blue-r.svg"
                alt="Tonic Life"
                width={400}
                height={130}
                className="mx-auto mb-4 h-32 w-auto sm:h-36"
              />
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#3E667D]/8 px-3 py-1 text-xs font-medium text-[#3E667D]">
              <ShieldCheckIcon className="h-3.5 w-3.5" />
              {t('secureAccess')}
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-[2rem] lg:text-[2.2rem]">
              {t('title')}
            </h2>
            <p className="mt-2 max-w-md text-sm text-gray-600 lg:max-w-none">
              {t('subtitle')}
            </p>
          </div>

          <Card className="rounded-3xl border border-gray-100 bg-white/95 shadow-2xl shadow-gray-200/70 backdrop-blur">
            <CardContent className="p-7 sm:p-8 lg:p-9">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Identifier (email o usuario) */}
                <div className="space-y-1.5">
                  <Label>{t('identifierLabel')}</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4"><UserIcon className="h-5 w-5" /></span>
                    <Input
                      type="text"
                      placeholder={t('identifierPlaceholder')}
                      value={formData.identifier}
                      onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                      autoComplete="username"
                      disabled={isLoading}
                      className="pl-9"
                      aria-invalid={errors.identifier ? true : undefined}
                    />
                  </div>
                  {errors.identifier && <p className="text-sm text-destructive">{errors.identifier}</p>}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label>{t('passwordLabel')}</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4"><LockClosedIcon className="h-5 w-5" /></span>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      autoComplete="current-password"
                      disabled={isLoading}
                      className="pl-9 pr-10"
                      aria-invalid={errors.password ? true : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:pointer-events-none"
                      disabled={isLoading}
                      aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.remember}
                      onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-[#3E667D] focus:ring-[#a7c1e2]"
                      disabled={isLoading}
                    />
                    <span className="ml-2 text-sm text-gray-600">{t('remember')}</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-[#3E667D] transition-colors hover:text-[#3E667D]"
                  >
                    {t('forgot')}
                  </Link>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  className="w-full h-12 text-base font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? t('submitting') : t('submit')}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <SparklesIcon className="h-4 w-4 text-[#3E667D]" />
                  {t('roleHint')}
                </div>
              </form>

              <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                <Link
                  href="/contacto"
                  className="group block transition-colors"
                >
                  <div className="mb-1 flex items-center gap-2 text-[#3E667D]">
                    <LifebuoyIcon className="h-4 w-4" />
                    <span className="text-sm font-semibold">{t('supportTitle')}</span>
                  </div>
                  <p className="text-xs text-gray-500 group-hover:text-gray-600">
                    {t('supportText')}
                  </p>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <CountryLanguageSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        currentLocale={locale}
        onSelect={handleSelectLocale}
      />
    </div>
  );
}
