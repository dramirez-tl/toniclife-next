'use client';

// useGoogleAccess — Lo que pasa al pulsar el botón de Google, igual en /login, en
// "Crea tu cuenta" (/registro) y en la puerta del checkout.
//
// El botón entrega el ID token y el API (POST /auth/google) decide:
//   · la cuenta de Google ya es de alguien → sesión iniciada (`onSignedIn`);
//   · no es de nadie → `pending` con el ticket para terminar. Qué se ofrece con ese
//     ticket lo dice `googleLinkStep` (lib/public-signup): crear la cuenta del público
//     (`GoogleSignupConfirm`) o vincular una cuenta que ya existe.
// Este hook no navega ni guarda nada en el store: eso lo decide cada pantalla.

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { localeLanguage } from '@/i18n/config';
import { googleSignInErrorText } from '@/lib/public-signup';
import {
  authService,
  isGoogleLinkRequired,
  type GoogleLinkRequired,
  type UserResponse,
} from '@/services/auth.service';

interface GoogleAccessOptions {
  /**
   * Sesión que sobrevive al cierre del navegador. Por defecto sí, como la casilla
   * "Recordarme" de /login: quien compra en la tienda no vuelve a entrar en cada visita.
   */
  remember?: boolean;
  /** La cuenta de Google ya tenía cuenta con nosotros: la sesión quedó iniciada. */
  onSignedIn: (user: UserResponse) => void;
}

export function useGoogleAccess({ remember = true, onSignedIn }: GoogleAccessOptions) {
  const t = useTranslations('auth.google');
  const lang = localeLanguage(useLocale());
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<GoogleLinkRequired | null>(null);

  const handleCredential = async (idToken: string) => {
    setBusy(true);
    try {
      const result = await authService.loginWithGoogle({ idToken, remember });
      if (isGoogleLinkRequired(result)) setPending(result);
      else onSignedIn(result.user);
    } catch (error) {
      toast.error(
        googleSignInErrorText({
          error,
          lang,
          texts: { generic: t('error'), tooMany: t('tooMany'), network: t('network') },
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  return {
    /** Se está consultando al API con la cuenta de Google elegida. */
    busy,
    /** Cuenta de Google sin vincular (con su ticket); `null` = aún no se elige o ya se entró. */
    pending,
    handleCredential,
    /** "Usar otra cuenta": olvida la cuenta de Google elegida y vuelve al botón. */
    reset: () => setPending(null),
  };
}
