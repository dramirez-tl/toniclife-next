'use client';

// Sincroniza el idioma de la CUENTA (users.language, fuente de verdad) con la
// cookie NEXT_LOCALE que lee el provider next-intl del layout raíz. El panel del
// distribuidor NO vive bajo /[locale]; usa el provider global. Así, al entrar al
// panel, si el idioma guardado en la cuenta difiere del de la cookie, ajustamos
// la cookie y recargamos UNA vez (tras recargar coinciden → sin bucle).

import { useEffect, useRef } from 'react';
import { useDistributorPreferences } from '@/hooks/useDistributor';
import {
  DEFAULT_LOCALE,
  buildLocale,
  localeCountry,
  localeLanguage,
} from '@/i18n/config';
import { getStoredLocale, setStoredLocale } from '@/lib/store-locale';

export function DistributorLocaleSync() {
  const { data } = useDistributorPreferences();
  const didSync = useRef(false);

  useEffect(() => {
    if (!data?.language || didSync.current) return;
    const stored = getStoredLocale() || DEFAULT_LOCALE;
    const currentLang = localeLanguage(stored);
    if (data.language === currentLang) {
      didSync.current = true;
      return;
    }
    // Conserva el país del locale actual y solo cambia el idioma.
    didSync.current = true;
    setStoredLocale(buildLocale(data.language, localeCountry(stored)));
    window.location.reload();
  }, [data?.language]);

  return null;
}
