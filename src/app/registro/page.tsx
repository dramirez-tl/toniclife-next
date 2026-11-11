'use client';

// /registro — "Crea tu cuenta": la cuenta que abre el público para comprar en la tienda
// (cliente final: ve y compra lo marcado para el público, a precio público, sin puntos,
// red ni panel de distribuidor). Dos caminos:
//   · Google (si el servidor lo tiene encendido): elige su cuenta y, si es nueva, confirma
//     nombre, apellidos y términos (`GoogleSignupConfirm`). Si ese correo ya tiene cuenta
//     se le manda a iniciar sesión; si su cuenta de Google ya estaba vinculada, entra.
//   · El formulario con correo y contraseña (POST /auth/register).
// Al terminar la sesión queda iniciada y la persona va a `?redirect=` (p. ej. de vuelta al
// checkout) o al inicio de la tienda; nunca al panel del distribuidor (lib/auth-area).
// Las reglas (validación, cuerpos, errores) viven en lib/public-signup.

import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import {
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { GoogleSignupConfirm, SignupAccountNotice } from '@/components/auth/GoogleSignupConfirm';
import { useGoogleAccess } from '@/components/auth/useGoogleAccess';
import { useSignupTexts } from '@/components/auth/useSignupTexts';
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStorefrontAccess } from '@/hooks/useStorefrontAccess';
import { postLoginPath, safeRedirectPath } from '@/lib/auth-area';
import {
  NAME_MAX,
  PASSWORD_MAX,
  buildRegisterBody,
  firstSignupError,
  googleLinkStep,
  hasSignupErrors,
  passwordChecks,
  signupCountry,
  signupFailure,
  validateRegister,
  type RegisterValues,
  type SignupErrors,
  type SignupFailure,
  type SignupField,
} from '@/lib/public-signup';
import { getStoredLocale } from '@/lib/store-locale';
import { authService, type UserResponse } from '@/services/auth.service';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectIsInitialized, selectUser, setUser } from '@/store/slices/authSlice';

const EMPTY_FORM: RegisterValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false,
};

const FIELD_IDS: Record<SignupField, string> = {
  firstName: 'register-first-name',
  lastName: 'register-last-name',
  email: 'register-email',
  phone: 'register-phone',
  password: 'register-password',
  confirmPassword: 'register-confirm-password',
  acceptTerms: 'register-terms',
};

const PAGE_CLASS = 'min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8';

export default function RegistroPage() {
  // `useSearchParams` (el `?redirect=`) pide un límite de Suspense.
  return (
    <Suspense fallback={<div className={PAGE_CLASS} />}>
      <RegistroContent />
    </Suspense>
  );
}

function RegistroContent() {
  const t = useTranslations('auth.register');
  const tAuth = useTranslations('auth');
  const { t: tSignup, lang, fieldError, failureText, phoneTexts, phoneCountryName } = useSignupTexts();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  // A dónde regresa la persona al terminar (p. ej. `/es-mx/checkout`); solo rutas de este sitio.
  const redirect = safeRedirectPath(searchParams.get('redirect'));
  const loginHref = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login';

  const isInitialized = useAppSelector(selectIsInitialized);
  const sessionUser = useAppSelector(selectUser);
  // La tienda puede estar en "solo miembros": entonces no se abren cuentas nuevas.
  const { membersOnly } = useStorefrontAccess();

  const [values, setValues] = useState<RegisterValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<{ failure: SignupFailure; text: string } | null>(null);
  // Mensaje mientras el navegador carga la página de destino (la sesión ya quedó iniciada).
  const [entering, setEntering] = useState<string | null>(null);
  const leaving = useRef(false);

  /** Sesión iniciada: se guarda en el store y se va al destino con carga completa (como /login). */
  const enter = (user: UserResponse, message: string) => {
    leaving.current = true;
    setEntering(message);
    dispatch(setUser(user));
    window.location.assign(postLoginPath({ user, redirect }));
  };

  // Quien llega con la sesión ya iniciada no necesita esta página (el middleware suele
  // mandarlo antes; esto cubre una sesión que solo vive en esta pestaña).
  useEffect(() => {
    if (!isInitialized || !sessionUser || leaving.current) return;
    leaving.current = true;
    window.location.replace(postLoginPath({ user: sessionUser, redirect }));
  }, [isInitialized, sessionUser, redirect]);

  const google = useGoogleAccess({ onSignedIn: (user) => enter(user, tSignup('signedIn')) });
  const googleStep = google.pending ? googleLinkStep(google.pending) : null;
  // País de la tienda desde la que se registra: el del checkout del que venía o el elegido.
  const countryCode = signupCountry({ redirect, storedLocale: getStoredLocale() });

  const change = (patch: Partial<RegisterValues>) => {
    setValues((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const field of Object.keys(patch) as SignupField[]) delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const found = validateRegister(values);
    setErrors(found);
    if (hasSignupErrors(found)) {
      const first = firstSignupError(found);
      if (first) document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }

    setProblem(null);
    setSubmitting(true);
    try {
      const result = await authService.register(buildRegisterBody(values, countryCode), { remember: true });
      enter(result.user, tSignup('createdVerify', { email: result.user.email || values.email.trim() }));
    } catch (error) {
      const failure = signupFailure(error, 'form');
      setProblem({ failure, text: failureText(failure, error) });
      if (failure === 'account_exists') document.getElementById(FIELD_IDS.email)?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const checks = passwordChecks(values.password);
  const errorOf = (field: SignupField) => fieldError(field, errors[field]);
  const legalLink = 'text-[#3E667D] hover:text-[#3E667D] underline';
  const iconSlot = 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4';
  const eyeButton =
    'absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:pointer-events-none';

  return (
    <div className={PAGE_CLASS}>
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <Image
              src="/images/logo/svg/logo-text-blue-r.svg"
              alt="Tonic Life"
              width={200}
              height={80}
              className="h-12 w-auto mx-auto mb-6"
            />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-2 text-sm text-gray-600">
            {t('haveAccount')}{' '}
            <Link href={loginHref} className="font-medium text-[#3E667D] hover:text-[#3E667D] transition-colors">
              {t('signIn')}
            </Link>
          </p>
        </div>

        <Card>
          <CardContent className="p-8">
            {entering ? (
              /* La sesión ya quedó iniciada: se ve mientras carga la página de destino. */
              <div role="status" className="py-8 text-center">
                <CheckCircleIcon aria-hidden className="mx-auto h-12 w-12 text-emerald-600" />
                <p className="mt-4 text-lg font-semibold text-gray-900">{entering}</p>
                <p className="mt-2 flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {tSignup('entering')}
                </p>
              </div>
            ) : membersOnly ? (
              <SignupAccountNotice kind="closed" loginHref={loginHref} />
            ) : google.pending && googleStep === 'new_account' ? (
              <GoogleSignupConfirm
                link={google.pending}
                countryCode={countryCode}
                loginHref={loginHref}
                onSignedIn={(user) => enter(user, tSignup('created'))}
                onCancel={google.reset}
              />
            ) : google.pending ? (
              <SignupAccountNotice kind="exists" email={google.pending.email} loginHref={loginHref} onCancel={google.reset} />
            ) : (
              <>
                {/* Con Google no hay contraseña que inventar ni correo que verificar.
                    Solo aparece si el servidor lo tiene encendido; el separador va con él. */}
                <GoogleSignInButton
                  className="mb-6"
                  text="signup_with"
                  onCredential={google.handleCredential}
                  disabled={submitting || google.busy}
                  locale={lang}
                  dividerLabel={t('googleDivider')}
                  dividerPosition="below"
                />

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  {/* Name Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor={FIELD_IDS.firstName}>{t('firstName')}</Label>
                      <div className="relative">
                        <span className={iconSlot}>
                          <UserIcon className="h-5 w-5" />
                        </span>
                        <Input
                          id={FIELD_IDS.firstName}
                          type="text"
                          placeholder={t('firstNamePlaceholder')}
                          value={values.firstName}
                          onChange={(e) => change({ firstName: e.target.value })}
                          autoComplete="given-name"
                          maxLength={NAME_MAX}
                          disabled={submitting}
                          className="pl-9"
                          aria-invalid={errors.firstName ? true : undefined}
                        />
                      </div>
                      {errorOf('firstName') && <p className="text-sm text-destructive">{errorOf('firstName')}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={FIELD_IDS.lastName}>{t('lastName')}</Label>
                      <Input
                        id={FIELD_IDS.lastName}
                        type="text"
                        placeholder={t('lastNamePlaceholder')}
                        value={values.lastName}
                        onChange={(e) => change({ lastName: e.target.value })}
                        autoComplete="family-name"
                        maxLength={NAME_MAX}
                        disabled={submitting}
                        aria-invalid={errors.lastName ? true : undefined}
                      />
                      {errorOf('lastName') && <p className="text-sm text-destructive">{errorOf('lastName')}</p>}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor={FIELD_IDS.email}>{t('email')}</Label>
                    <div className="relative">
                      <span className={iconSlot}>
                        <EnvelopeIcon className="h-5 w-5" />
                      </span>
                      <Input
                        id={FIELD_IDS.email}
                        type="email"
                        placeholder={t('emailPlaceholder')}
                        value={values.email}
                        onChange={(e) => {
                          change({ email: e.target.value });
                          // "Ya existe una cuenta con ese correo" deja de valer al cambiarlo.
                          if (problem?.failure === 'account_exists') setProblem(null);
                        }}
                        autoComplete="email"
                        disabled={submitting}
                        className="pl-9"
                        aria-invalid={errors.email || problem?.failure === 'account_exists' ? true : undefined}
                      />
                    </div>
                    {errorOf('email') && <p className="text-sm text-destructive">{errorOf('email')}</p>}
                  </div>

                  {/* Phone (Optional) */}
                  <div className="space-y-1.5">
                    <Label htmlFor={FIELD_IDS.phone}>{t('phone')}</Label>
                    <PhoneInput
                      id={FIELD_IDS.phone}
                      value={values.phone}
                      onChange={(phone) => change({ phone })}
                      disabled={submitting}
                      texts={phoneTexts}
                      getCountryName={phoneCountryName}
                      aria-invalid={errors.phone ? true : undefined}
                    />
                    {errorOf('phone') ? (
                      <p className="text-sm text-destructive">{errorOf('phone')}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('phoneHint')}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor={FIELD_IDS.password}>{t('password')}</Label>
                    <div className="relative">
                      <span className={iconSlot}>
                        <LockClosedIcon className="h-5 w-5" />
                      </span>
                      <Input
                        id={FIELD_IDS.password}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={values.password}
                        onChange={(e) => change({ password: e.target.value })}
                        autoComplete="new-password"
                        maxLength={PASSWORD_MAX}
                        disabled={submitting}
                        className="pl-9 pr-10"
                        aria-invalid={errors.password ? true : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={eyeButton}
                        disabled={submitting}
                        aria-label={showPassword ? tAuth('hidePassword') : tAuth('showPassword')}
                      >
                        {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                      </button>
                    </div>
                    {errorOf('password') && <p className="text-sm text-destructive">{errorOf('password')}</p>}
                  </div>

                  {/* Password Requirements */}
                  {values.password && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <p className="text-sm font-medium text-gray-700">{t('passwordRequirements')}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {checks.map((check) => (
                          <div key={check.rule} className="flex items-center gap-2">
                            <CheckCircleIcon className={`h-4 w-4 ${check.met ? 'text-[#3E667D]' : 'text-gray-300'}`} />
                            <span className={`text-xs ${check.met ? 'text-gray-700' : 'text-gray-400'}`}>
                              {t(`passwordRules.${check.rule}`)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor={FIELD_IDS.confirmPassword}>{t('confirmPassword')}</Label>
                    <div className="relative">
                      <span className={iconSlot}>
                        <LockClosedIcon className="h-5 w-5" />
                      </span>
                      <Input
                        id={FIELD_IDS.confirmPassword}
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={values.confirmPassword}
                        onChange={(e) => change({ confirmPassword: e.target.value })}
                        autoComplete="new-password"
                        maxLength={PASSWORD_MAX}
                        disabled={submitting}
                        className="pl-9 pr-10"
                        aria-invalid={errors.confirmPassword ? true : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={eyeButton}
                        disabled={submitting}
                        aria-label={showConfirmPassword ? tAuth('hidePassword') : tAuth('showPassword')}
                      >
                        {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                      </button>
                    </div>
                    {errorOf('confirmPassword') && (
                      <p className="text-sm text-destructive">{errorOf('confirmPassword')}</p>
                    )}
                  </div>

                  {/* Terms */}
                  <div>
                    <label htmlFor={FIELD_IDS.acceptTerms} className="flex items-start gap-3 cursor-pointer">
                      <input
                        id={FIELD_IDS.acceptTerms}
                        type="checkbox"
                        checked={values.acceptTerms}
                        onChange={(e) => change({ acceptTerms: e.target.checked })}
                        className="mt-1 h-4 w-4 text-[#3E667D] border-gray-300 rounded focus:ring-[#a7c1e2]"
                        disabled={submitting}
                        aria-invalid={errors.acceptTerms ? true : undefined}
                      />
                      <span className="text-sm text-gray-600">
                        {tSignup.rich('terms', {
                          terms: (chunks) => (
                            <Link href="/terminos" target="_blank" rel="noopener noreferrer" className={legalLink}>
                              {chunks}
                            </Link>
                          ),
                          privacy: (chunks) => (
                            <Link href="/privacidad" target="_blank" rel="noopener noreferrer" className={legalLink}>
                              {chunks}
                            </Link>
                          ),
                        })}
                      </span>
                    </label>
                    {errorOf('acceptTerms') && <p className="mt-1.5 text-sm text-red-500">{errorOf('acceptTerms')}</p>}
                  </div>

                  {problem && (
                    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                      <p>{problem.text}</p>
                      {(problem.failure === 'account_exists' || problem.failure === 'signup_closed') && (
                        <Link href={loginHref} className="mt-1 inline-block font-semibold underline underline-offset-2">
                          {tSignup('signInCta')}
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button type="submit" variant="default" size="lg" className="w-full" disabled={submitting || google.busy}>
                    {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {submitting ? t('submitting') : t('submit')}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        {/* Distributor CTA */}
        <Card className="mt-6 bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg mb-1">{t('distributorTitle')}</h3>
                <p className="text-sm text-white/80">{t('distributorText')}</p>
              </div>
              <Link href="/registro/distribuidor">
                <Button variant="secondary" size="sm">
                  {t('distributorCta')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
