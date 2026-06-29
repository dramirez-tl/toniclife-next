'use client';

// Modal selector de país + idioma para la tienda pública (estilo partner.co).
// Presentacional: el padre decide qué hacer en onSelect (persistir + navegar al
// locale). Los países sin precios cargados (ready=false) salen como "Próximamente".

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  COUNTRIES,
  LANGUAGES,
  buildLocale,
  parseLocale,
  type CountryCode,
  type LanguageCode,
} from '@/i18n/config';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** locale actual, p.ej. 'es-mx' (para resaltar la selección). */
  currentLocale?: string;
  /** Se llama con el locale elegido, p.ej. 'en-us'. */
  onSelect: (locale: string) => void;
  /**
   * Si se pasa, el país queda FIJO a ese código y solo se ofrece cambiar idioma
   * (caso distribuidor logueado: su país lo fija la cuenta). Oculta los demás países.
   */
  lockedCountry?: CountryCode;
}

export function CountryLanguageSelector({
  open,
  onOpenChange,
  currentLocale,
  onSelect,
  lockedCountry,
}: Props) {
  const uiLang: LanguageCode = currentLocale
    ? parseLocale(currentLocale).lang
    : 'es';
  const t = (es: string, en: string) => (uiLang === 'en' ? en : es);

  const visibleCountries = lockedCountry
    ? COUNTRIES.filter((c) => c.code === lockedCountry)
    : COUNTRIES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#3E667D]">
            {lockedCountry
              ? t('Elige tu idioma', 'Choose your language')
              : t('Elige tu país e idioma', 'Choose your country and language')}
          </DialogTitle>
          <DialogDescription>
            {lockedCountry
              ? t(
                  'Tu país está definido por tu cuenta. Puedes cambiar el idioma.',
                  'Your country is set by your account. You can change the language.',
                )
              : t(
                  'Verás los productos, precios y disponibilidad de tu país.',
                  'You will see products, prices and availability for your country.',
                )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          {visibleCountries.map((c) => {
            const countryName = uiLang === 'en' ? c.nameEn : c.name;
            return (
              <div
                key={c.code}
                className={`rounded-xl border p-4 ${
                  c.ready ? 'border-gray-200' : 'border-dashed border-gray-200 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl leading-none">{c.flag}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{countryName}</p>
                      <p className="text-xs text-gray-500">{c.currency}</p>
                    </div>
                  </div>

                  {c.ready ? (
                    <div className="flex gap-2">
                      {LANGUAGES.map((l) => {
                        const locale = buildLocale(l.code, c.code);
                        const active = locale === currentLocale;
                        return (
                          <button
                            key={l.code}
                            type="button"
                            onClick={() => onSelect(locale)}
                            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                              active
                                ? 'border-[#3E667D] bg-[#3E667D] text-white'
                                : 'border-gray-300 text-gray-700 hover:border-[#3E667D] hover:text-[#3E667D]'
                            }`}
                          >
                            {l.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">
                      {t('Próximamente', 'Coming soon')}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
