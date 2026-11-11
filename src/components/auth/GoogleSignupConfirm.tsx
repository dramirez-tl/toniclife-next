'use client';

// GoogleSignupConfirm — "Crea tu cuenta con <correo>": el paso corto con el que una persona
// nueva termina de abrir su cuenta de la tienda después de elegir su cuenta de Google.
//
// Entrar con Google nunca crea una cuenta por sí solo: cuando el API dice que esa cuenta de
// Google no es de nadie y que se puede abrir una (`canSignUp`), la persona confirma aquí
// nombre y apellidos (prellenados con los de Google), deja si quiere un teléfono y acepta
// los términos. No hay contraseña: su correo ya lo verificó Google.
//
// Se usa igual en /registro, en la puerta del checkout y en /login. La pantalla decide qué
// hacer con la sesión ya iniciada (`onSignedIn`); este componente no navega.

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/PhoneInput';
import {
  NAME_MAX,
  buildGoogleSignupBody,
  firstSignupError,
  hasSignupErrors,
  signupFailure,
  splitFullName,
  validateGoogleSignup,
  type GoogleSignupValues,
  type SignupErrors,
  type SignupFailure,
} from '@/lib/public-signup';
import { authService, type GoogleLinkRequired, type UserResponse } from '@/services/auth.service';
import { useSignupTexts } from './useSignupTexts';

interface GoogleSignupConfirmProps {
  /** Cuenta de Google elegida, con el ticket (10 min) para crear la cuenta. */
  link: GoogleLinkRequired;
  /** País de la tienda desde la que se registra (MX, US, CO, GT): define el país de la cuenta. */
  countryCode: string;
  /** Sesión que sobrevive al cierre del navegador (por defecto sí). */
  remember?: boolean;
  /** A dónde lleva "Iniciar sesión" si resulta que ese correo ya tiene cuenta. */
  loginHref: string;
  /** La cuenta quedó creada y la sesión iniciada. */
  onSignedIn: (user: UserResponse) => void;
  /** "Usar otra cuenta de Google" (y también cuando el paso con Google caducó): volver al botón. */
  onCancel: () => void;
  /** "Volver" a la pantalla anterior sin soltar la cuenta de Google elegida (solo donde hay una). */
  onBack?: () => void;
}

const FIELD_IDS = {
  firstName: 'google-signup-first-name',
  lastName: 'google-signup-last-name',
  phone: 'google-signup-phone',
  acceptTerms: 'google-signup-terms',
} as const;

export function GoogleSignupConfirm({
  link,
  countryCode,
  remember = true,
  loginHref,
  onSignedIn,
  onCancel,
  onBack,
}: GoogleSignupConfirmProps) {
  const { t, fieldError, failureText, phoneTexts, phoneCountryName } = useSignupTexts();
  const [values, setValues] = useState<GoogleSignupValues>(() => ({
    ...splitFullName(link.name),
    phone: '',
    acceptTerms: false,
  }));
  const [errors, setErrors] = useState<SignupErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<{ failure: SignupFailure; text: string } | null>(null);

  const change = (patch: Partial<GoogleSignupValues>) => {
    setValues((current) => ({ ...current, ...patch }));
    // El aviso de un campo se quita en cuanto la persona lo corrige.
    setErrors((current) => {
      const next = { ...current };
      for (const field of Object.keys(patch) as (keyof GoogleSignupValues)[]) delete next[field];
      return next;
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const found = validateGoogleSignup(values);
    setErrors(found);
    if (hasSignupErrors(found)) {
      const first = firstSignupError(found);
      if (first && first in FIELD_IDS) document.getElementById(FIELD_IDS[first as keyof typeof FIELD_IDS])?.focus();
      return;
    }

    setProblem(null);
    setSubmitting(true);
    try {
      const result = await authService.signUpWithGoogle(
        buildGoogleSignupBody(link.linkTicket, values, countryCode),
        { remember },
      );
      onSignedIn(result.user);
    } catch (error) {
      const failure = signupFailure(error, 'google');
      const text = failureText(failure, error);
      if (failure === 'ticket_expired') {
        // El ticket dura 10 minutos: no hay nada que reintentar aquí, se vuelve al botón.
        toast.error(text, { duration: 8000 });
        onCancel();
        return;
      }
      setProblem({ failure, text });
    } finally {
      setSubmitting(false);
    }
  };

  const firstNameError = fieldError('firstName', errors.firstName);
  const lastNameError = fieldError('lastName', errors.lastName);
  const phoneError = fieldError('phone', errors.phone);
  const termsError = fieldError('acceptTerms', errors.acceptTerms);
  const legalLink = 'font-medium text-[#3E667D] underline underline-offset-2 hover:text-[#2f5165]';

  return (
    <form onSubmit={submit} noValidate className="space-y-5 text-left" data-testid="google-signup-form">
      <div className="rounded-2xl border border-[#3E667D]/20 bg-[#C8DDF2]/25 p-4">
        <h2 className="break-words text-base font-semibold text-gray-900">{t('title', { email: link.email })}</h2>
        <p className="mt-1 text-sm text-gray-700">{t('hint')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={FIELD_IDS.firstName}>{t('firstName')}</Label>
          <Input
            id={FIELD_IDS.firstName}
            type="text"
            value={values.firstName}
            onChange={(e) => change({ firstName: e.target.value })}
            autoComplete="given-name"
            maxLength={NAME_MAX}
            disabled={submitting}
            aria-invalid={firstNameError ? true : undefined}
            aria-describedby={firstNameError ? `${FIELD_IDS.firstName}-error` : undefined}
          />
          {firstNameError && (
            <p id={`${FIELD_IDS.firstName}-error`} className="text-sm text-destructive">
              {firstNameError}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={FIELD_IDS.lastName}>{t('lastName')}</Label>
          <Input
            id={FIELD_IDS.lastName}
            type="text"
            value={values.lastName}
            onChange={(e) => change({ lastName: e.target.value })}
            autoComplete="family-name"
            maxLength={NAME_MAX}
            disabled={submitting}
            aria-invalid={lastNameError ? true : undefined}
            aria-describedby={lastNameError ? `${FIELD_IDS.lastName}-error` : undefined}
          />
          {lastNameError && (
            <p id={`${FIELD_IDS.lastName}-error`} className="text-sm text-destructive">
              {lastNameError}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={FIELD_IDS.phone}>{t('phone')}</Label>
        <PhoneInput
          id={FIELD_IDS.phone}
          value={values.phone}
          onChange={(phone) => change({ phone })}
          disabled={submitting}
          texts={phoneTexts}
          getCountryName={phoneCountryName}
          aria-invalid={phoneError ? true : undefined}
        />
        {phoneError ? (
          <p className="text-sm text-destructive">{phoneError}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{t('phoneHint')}</p>
        )}
      </div>

      <div>
        <label htmlFor={FIELD_IDS.acceptTerms} className="flex cursor-pointer items-start gap-3">
          <input
            id={FIELD_IDS.acceptTerms}
            type="checkbox"
            checked={values.acceptTerms}
            onChange={(e) => change({ acceptTerms: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-[#3E667D] focus:ring-[#a7c1e2]"
            disabled={submitting}
            aria-invalid={termsError ? true : undefined}
            aria-describedby={termsError ? `${FIELD_IDS.acceptTerms}-error` : undefined}
          />
          <span className="text-sm text-gray-600">
            {t.rich('terms', {
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
        {termsError && (
          <p id={`${FIELD_IDS.acceptTerms}-error`} className="mt-1.5 text-sm text-destructive">
            {termsError}
          </p>
        )}
      </div>

      {problem && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p>{problem.text}</p>
          {(problem.failure === 'account_exists' || problem.failure === 'signup_closed') && (
            <Link href={loginHref} className="mt-1 inline-block font-semibold underline underline-offset-2">
              {t('signInCta')}
            </Link>
          )}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {submitting ? t('submitting') : t('submit')}
      </Button>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="font-medium text-gray-500 transition-colors hover:text-[#3E667D]"
          >
            {t('back')}
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="font-medium text-gray-500 transition-colors hover:text-[#3E667D]"
        >
          {t('otherAccount')}
        </button>
      </div>
    </form>
  );
}

interface AccountNoticeProps {
  /**
   * `exists`: esa cuenta de Google (su correo) ya tiene cuenta con nosotros.
   * `closed`: la tienda está en "solo miembros" y por ahora no se abren cuentas nuevas.
   */
  kind: 'exists' | 'closed';
  /** Correo de la cuenta de Google elegida (solo en `exists`). */
  email?: string;
  /** A dónde lleva "Iniciar sesión" (ahí se vincula Google con ID y contraseña). */
  loginHref: string;
  /** "Usar otra cuenta de Google": volver al botón. Sin él no se ofrece. */
  onCancel?: () => void;
}

/** Aviso de que no toca crear una cuenta nueva, con la salida: iniciar sesión. */
export function SignupAccountNotice({ kind, email, loginHref, onCancel }: AccountNoticeProps) {
  const { t } = useSignupTexts();
  return (
    <div className="space-y-5 text-left" role="status" data-testid={`signup-notice-${kind}`}>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-base font-semibold text-amber-950">{t(`${kind}.title`)}</h2>
        <p className="mt-1 break-words text-sm text-amber-900">
          {kind === 'exists' ? t('exists.body', { email: email ?? '' }) : t('closed.body')}
        </p>
      </div>
      <Button asChild size="lg" className="w-full">
        <Link href={loginHref}>{t('signInCta')}</Link>
      </Button>
      {onCancel && (
        <div className="text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-gray-500 transition-colors hover:text-[#3E667D]"
          >
            {t('otherAccount')}
          </button>
        </div>
      )}
    </div>
  );
}
