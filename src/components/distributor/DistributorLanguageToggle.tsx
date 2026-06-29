'use client';

// Selector compacto ES/EN para el chrome del panel del distribuidor. Persiste el
// idioma en la cuenta (users.language) y ajusta la cookie NEXT_LOCALE, luego
// recarga para reaplicar el idioma en todo el panel. Misma fuente de verdad que
// el toggle de Configuración (useDistributor preferences) y que DistributorLocaleSync.

import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import {
  useDistributorPreferences,
  useUpdateDistributorPreferences,
} from '@/hooks/useDistributor';
import {
  DEFAULT_LOCALE,
  buildLocale,
  localeCountry,
  localeLanguage,
} from '@/i18n/config';
import { getStoredLocale, setStoredLocale } from '@/lib/store-locale';

const LANGS: { code: 'es' | 'en'; label: string }[] = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
];

interface Props {
  /** 'dark' para el sidebar (fondo teal), 'light' para el menú "Más". */
  tone?: 'dark' | 'light';
  className?: string;
}

export function DistributorLanguageToggle({ tone = 'dark', className }: Props) {
  const { data: prefs } = useDistributorPreferences();
  const updatePrefs = useUpdateDistributorPreferences();

  // Idioma actual: preferencia de la cuenta; si aún no carga, el de la cookie.
  const current =
    prefs?.language ?? localeLanguage(getStoredLocale() || DEFAULT_LOCALE);

  const change = (lang: 'es' | 'en') => {
    if (lang === current || updatePrefs.isPending) return;
    updatePrefs.mutate(lang, {
      onSuccess: () => {
        const stored = getStoredLocale() || DEFAULT_LOCALE;
        setStoredLocale(buildLocale(lang, localeCountry(stored)));
        window.location.reload();
      },
    });
  };

  const isDark = tone === 'dark';

  return (
    <div
      className={cn('flex items-center gap-2 px-3 py-2', className)}
      role="group"
      aria-label="Idioma / Language"
    >
      <GlobeAltIcon
        className={cn('h-5 w-5 shrink-0', isDark ? 'text-white/70' : 'text-gray-500')}
      />
      <div
        className={cn(
          'flex items-center rounded-lg p-0.5',
          isDark ? 'bg-white/10' : 'bg-gray-100',
        )}
      >
        {LANGS.map((l) => {
          const active = l.code === current;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => change(l.code)}
              disabled={updatePrefs.isPending}
              aria-pressed={active}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-60',
                active
                  ? isDark
                    ? 'bg-white text-[#3E667D]'
                    : 'bg-[#3E667D] text-white'
                  : isDark
                    ? 'text-white/70 hover:text-white'
                    : 'text-gray-600 hover:text-gray-900',
              )}
            >
              {l.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
