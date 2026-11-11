'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
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
import { postLoginPath } from '@/lib/auth-area';
import { googleLinkStep, signupCountry } from '@/lib/public-signup';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  authService,
  isEmailLinkRequired,
  isGoogleLinkRequired,
  type GoogleLinkRequired,
  type UserResponse,
} from '@/services/auth.service';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { GoogleSignupConfirm } from '@/components/auth/GoogleSignupConfirm';
import {
  loginAsync,
  logoutAsync,
  selectIsLoading,
  selectAuthError,
  selectEmailLinkRequired,
  clearError,
  setUser,
} from '@/store/slices/authSlice';

/** Mensaje del API (NestJS: message string o lista) o un texto por defecto. */
function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  const message = Array.isArray(data?.message) ? data?.message.join(' ') : data?.message;
  return message || fallback;
}

/** Llegó desde la tienda solo para distribuidores (middleware: ?tienda=1): explica por qué pide sesión. */
function StoreLoginNotice({ text }: { text: string }) {
  const params = useSearchParams();
  if (params.get('tienda') !== '1') return null;
  return (
    <div
      role="status"
      className="mx-auto mt-4 max-w-md rounded-xl border border-[#3E667D]/20 bg-[#3E667D]/5 px-4 py-3 text-left text-sm text-[#3E667D]"
    >
      {text}
    </div>
  );
}

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

  // Google Sign-In: la cuenta de Google no está vinculada → pedir ID + contraseña.
  // Si además nadie tiene cuenta con ese correo (`canSignUp`), se ofrece una segunda
  // salida para quien es nuevo: crear su cuenta de la tienda (`signup`).
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleLink, setGoogleLink] = useState<GoogleLinkRequired | null>(null);
  const [googleMode, setGoogleMode] = useState<'link' | 'signup'>('link');
  const [signupCountryCode, setSignupCountryCode] = useState('MX');
  const [linkForm, setLinkForm] = useState({ identifier: '', password: '' });
  const [linkErrors, setLinkErrors] = useState<Record<string, string>>({});

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

  /** `?redirect=` leído directo de la URL (evita useSearchParams/Suspense). */
  const readRedirect = () => new URLSearchParams(window.location.search).get('redirect');

  const navigateAfterLogin = (user: UserResponse) => {
    // El destino lo decide lib/auth-area.ts con el ÁREA de la sesión — categoría del
    // rol (colaborador→admin, cliente→distribuidor; ver lib/auth-roles.ts, aquí NO hay
    // listas de roles quemadas) y tipo de cuenta: la cuenta del público (cliente
    // final) va a la tienda, nunca al panel del distribuidor. `?redirect=` se respeta
    // solo si es una ruta de este sitio y del área de la persona (no manda a un
    // colaborador a /distribuidor ni al revés por un enlace viejo).
    window.location.href = postLoginPath({ user, redirect: readRedirect() });
  };

  /** Sesión ya creada por el API (Google): guardar en Redux y entrar a su sitio. */
  const finishLogin = (user: UserResponse, created = false) => {
    dispatch(setUser(user));
    toast.success(created ? t('signup.created') : t('toast.welcome'));
    navigateAfterLogin(user);
  };

  const handleGoogleCredential = async (idToken: string) => {
    setGoogleBusy(true);
    try {
      const result = await authService.loginWithGoogle({ idToken, remember: formData.remember });
      if (isGoogleLinkRequired(result)) {
        setLinkForm({ identifier: '', password: '' });
        setLinkErrors({});
        setGoogleMode('link');
        // País de la tienda para una cuenta nueva: el del sitio al que iba o el elegido.
        setSignupCountryCode(signupCountry({ redirect: readRedirect(), storedLocale: getStoredLocale() }));
        setGoogleLink(result);
        return;
      }
      finishLogin(result.user);
    } catch (error) {
      toast.error(apiErrorMessage(error, t('google.error')));
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleGoogleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleLink) return;
    const newErrors: Record<string, string> = {};
    const identifier = linkForm.identifier.trim();
    if (!identifier) newErrors.identifier = t('errors.identifierRequired');
    if (!linkForm.password) newErrors.password = t('errors.passwordRequired');
    if (Object.keys(newErrors).length > 0) {
      setLinkErrors(newErrors);
      return;
    }
    setLinkErrors({});
    setGoogleBusy(true);
    try {
      const result = await authService.linkGoogle({
        linkTicket: googleLink.linkTicket,
        identifier,
        password: linkForm.password,
        remember: formData.remember,
      });
      toast.success(t('google.linkedToast'));
      finishLogin(result.user);
    } catch (error) {
      toast.error(apiErrorMessage(error, t('google.error')));
    } finally {
      setGoogleBusy(false);
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
      navigateAfterLogin(result.user);
    } catch {
      // Error is handled via authError state
    }
  };

  // La cuenta de Google elegida no es de nadie y se puede abrir una nueva con ella.
  const googleCanSignUp = googleLinkStep(googleLink) === 'new_account';

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
            <Suspense fallback={null}>
              <StoreLoginNotice text={t('storeNotice')} />
            </Suspense>
          </div>

          <Card className="rounded-3xl border border-gray-100 bg-white/95 shadow-2xl shadow-gray-200/70 backdrop-blur">
            <CardContent className="p-7 sm:p-8 lg:p-9">
              {googleLink && googleMode === 'signup' ? (
                /* Persona nueva: confirma sus datos y se crea su cuenta de la tienda */
                <GoogleSignupConfirm
                  link={googleLink}
                  countryCode={signupCountryCode}
                  remember={formData.remember}
                  loginHref="/login"
                  onSignedIn={(user) => finishLogin(user, true)}
                  onCancel={() => setGoogleLink(null)}
                  onBack={() => setGoogleMode('link')}
                />
              ) : googleLink ? (
                /* La cuenta de Google no está vinculada: confirmar con ID + contraseña */
                <form onSubmit={handleGoogleLink} className="space-y-6" data-testid="google-link-form">
                  {googleCanSignUp ? (
                    /* Ese correo no es de nadie: aquí llegan distribuidores (que vinculan su
                       cuenta) y personas nuevas (que crean la suya). Las dos salidas, claras. */
                    <>
                      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                        <p className="break-words text-sm font-semibold text-gray-900">
                          {t('google.choiceTitle', { email: googleLink.email })}
                        </p>
                        <p className="mt-1 text-sm text-gray-700">{t('google.choiceText')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{t('google.linkOptionTitle')}</p>
                        <p className="mt-1 text-sm text-gray-600">{t('google.linkOptionText')}</p>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                      <p className="text-sm font-semibold text-gray-900">{t('google.linkTitle')}</p>
                      <p className="mt-1 text-sm text-gray-700">
                        {t('google.linkText', { email: googleLink.email })}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {/* Aquí sí se nombra el número de distribuidor: es con lo que casi todos vinculan. */}
                    <Label>{t('google.linkIdentifierLabel')}</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4"><UserIcon className="h-5 w-5" /></span>
                      <Input
                        type="text"
                        placeholder={t('google.linkIdentifierPlaceholder')}
                        value={linkForm.identifier}
                        onChange={(e) => setLinkForm({ ...linkForm, identifier: e.target.value })}
                        autoComplete="username"
                        disabled={googleBusy}
                        autoFocus
                        className="pl-9"
                        aria-invalid={linkErrors.identifier ? true : undefined}
                      />
                    </div>
                    {linkErrors.identifier && <p className="text-sm text-destructive">{linkErrors.identifier}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label>{t('passwordLabel')}</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4"><LockClosedIcon className="h-5 w-5" /></span>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={linkForm.password}
                        onChange={(e) => setLinkForm({ ...linkForm, password: e.target.value })}
                        autoComplete="current-password"
                        disabled={googleBusy}
                        className="pl-9 pr-10"
                        aria-invalid={linkErrors.password ? true : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:pointer-events-none"
                        disabled={googleBusy}
                        aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                      >
                        {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                      </button>
                    </div>
                    {linkErrors.password && <p className="text-sm text-destructive">{linkErrors.password}</p>}
                  </div>

                  <Button
                    type="submit"
                    variant="default"
                    size="lg"
                    className="w-full h-12 text-base font-semibold"
                    disabled={googleBusy}
                  >
                    {googleBusy ? t('submitting') : t('google.linkSubmit')}
                  </Button>

                  {googleCanSignUp && (
                    <>
                      <div className="flex items-center gap-3" aria-hidden="true">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-xs uppercase tracking-wide text-gray-400">{t('google.or')}</span>
                        <div className="h-px flex-1 bg-gray-200" />
                      </div>
                      <div className="rounded-2xl border border-gray-200 p-4" data-testid="google-new-account-option">
                        <p className="text-sm font-semibold text-gray-900">{t('google.newOptionTitle')}</p>
                        <p className="mt-1 text-sm text-gray-600">{t('google.newOptionText')}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          className="mt-3 h-auto min-h-11 w-full whitespace-normal py-2"
                          disabled={googleBusy}
                          onClick={() => setGoogleMode('signup')}
                        >
                          {t('google.newOptionCta')}
                        </Button>
                      </div>
                    </>
                  )}

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setGoogleLink(null)}
                      className="text-sm font-medium text-gray-500 transition-colors hover:text-[#3E667D]"
                      disabled={googleBusy}
                    >
                      {t('google.linkCancel')}
                    </button>
                  </div>
                </form>
              ) : (
              <>
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

              {/* Google Sign-In: solo aparece si el API lo tiene encendido */}
              <GoogleSignInButton
                className="mt-6"
                onCredential={handleGoogleCredential}
                disabled={isLoading || googleBusy}
                locale={localeLanguage(locale)}
                dividerLabel={t('google.or')}
              />
              </>
              )}

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
