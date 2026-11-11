'use client';

// useSignupTexts — Textos del alta de la cuenta del público (mensajes `auth.signup`), en el
// idioma de la página: el error de cada campo, lo que salió mal al crear la cuenta y los
// textos del teléfono. Los comparten el formulario "Crea tu cuenta" y la confirmación del
// alta con Google. Qué error es cuál lo decide lib/public-signup; aquí solo se le pone texto.

import { useLocale, useTranslations } from 'next-intl';
import type { PhoneInputTexts } from '@/components/ui/PhoneInput';
import { localeLanguage } from '@/i18n/config';
import type { PhoneCountry } from '@/lib/phone';
import {
  signupFailureText,
  type SignupFailure,
  type SignupField,
  type SignupIssue,
} from '@/lib/public-signup';

export function useSignupTexts() {
  const t = useTranslations('auth.signup');
  const lang = localeLanguage(useLocale());

  /** Texto del error de un campo; `null` si el campo está bien. */
  const fieldError = (field: SignupField, issue: SignupIssue | undefined): string | null => {
    if (!issue) return null;
    const key = `errors.${field}.${issue}`;
    return t.has(key) ? t(key) : t('failures.invalid');
  };

  /** Texto de lo que salió mal al crear la cuenta (en español gana el mensaje del API si lo explica). */
  const failureText = (failure: SignupFailure, error: unknown): string =>
    signupFailureText({
      failure,
      error,
      lang,
      texts: {
        ticket_expired: t('failures.ticket_expired'),
        account_exists: t('failures.account_exists'),
        signup_closed: t('failures.signup_closed'),
        too_many: t('failures.too_many'),
        invalid: t('failures.invalid'),
        unavailable: t('failures.unavailable'),
        network: t('failures.network'),
        unknown: t('failures.unknown'),
      },
    });

  // El campo de teléfono rellena él mismo {country}, {digits} y {count}: se le pasa el texto crudo.
  const phoneTexts: PhoneInputTexts = {
    dialLabel: t('phoneDial'),
    hint: t.raw('phoneDigits') as string,
    invalid: t.raw('phoneInvalid') as string,
  };

  /** Nombre del país junto al teléfono, en el idioma de la página (el catálogo lo trae en español). */
  const phoneCountryName = (country: PhoneCountry): string => {
    if (lang === 'es') return country.name;
    try {
      return new Intl.DisplayNames([lang], { type: 'region' }).of(country.code) ?? country.name;
    } catch {
      return country.name;
    }
  };

  return { t, lang, fieldError, failureText, phoneTexts, phoneCountryName };
}
