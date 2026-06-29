'use client';

// Sincroniza el locale del panel con la CUENTA del distribuidor:
//  - idioma  = users.language (preferencia de cuenta, fuente de verdad)
//  - país    = país de la cuenta (user.countryCode) si su tienda está lista (ready)
// El panel NO vive bajo /[locale]; usa el provider next-intl global del layout raíz
// que lee la cookie NEXT_LOCALE. Por eso, al entrar al panel ajustamos esa cookie
// al locale de la cuenta y recargamos UNA vez si difiere (tras recargar coinciden →
// sin bucle). Así, al ir a la tienda, el distribuidor ve su país (solo cambia idioma).

import { useEffect, useRef } from 'react';
import { useDistributorPreferences } from '@/hooks/useDistributor';
import { readyAccountCountry } from '@/hooks/useStoreCountry';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import {
  DEFAULT_LOCALE,
  buildLocale,
  localeCountry,
  localeLanguage,
} from '@/i18n/config';
import { getStoredLocale, setStoredLocale } from '@/lib/store-locale';

export function DistributorLocaleSync() {
  const { data } = useDistributorPreferences();
  const user = useAppSelector(selectUser);
  const didSync = useRef(false);

  useEffect(() => {
    if (!data?.language || didSync.current) return;
    const stored = getStoredLocale() || DEFAULT_LOCALE;
    // Idioma = preferencia de cuenta; país = país de la cuenta (si tiene tienda lista),
    // si no, se conserva el de la cookie.
    const country = readyAccountCountry(user?.countryCode) ?? localeCountry(stored);
    const desired = buildLocale(data.language, country);

    didSync.current = true;
    if (desired !== stored) {
      setStoredLocale(desired);
      window.location.reload();
    }
  }, [data?.language, user?.countryCode]);

  return null;
}
