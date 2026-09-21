'use client';

// Chips de los filtros activos. Cada chip es un BOTÓN que quita su filtro
// ("Quitar filtro: Cremas"); "Limpiar filtros" los quita todos.

import { useTranslations } from 'next-intl';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { formatStorePrice } from '@/lib/storefront/price';
import type { LanguageCode } from '@/i18n/config';
import type { CatalogState, StorefrontFacets } from '@/types/storefront';

interface ActiveFilterChipsProps {
  state: CatalogState;
  facets: StorefrontFacets;
  currencyCode: string;
  lang: LanguageCode;
  onChange: (patch: Partial<CatalogState>) => void;
  onClear: () => void;
}

interface Chip {
  key: string;
  label: string;
  patch: Partial<CatalogState>;
}

export function ActiveFilterChips({ state, facets, currencyCode, lang, onChange, onClear }: ActiveFilterChipsProps) {
  const t = useTranslations('storefront.catalog.chips');
  const chips: Chip[] = [];

  if (state.q) chips.push({ key: 'q', label: t('search', { q: state.q }), patch: { q: '' } });
  if (state.categoria) {
    const name = facets.categories.find((c) => c.slug === state.categoria)?.name ?? state.categoria;
    chips.push({ key: 'categoria', label: name, patch: { categoria: null } });
  }
  if (state.tipo) {
    chips.push({ key: 'tipo', label: state.tipo === 'pack' ? t('typePack') : t('typeProduct'), patch: { tipo: null } });
  }
  if (state.min !== null || state.max !== null) {
    const min = state.min !== null ? (formatStorePrice(state.min, currencyCode, lang) ?? `0 ${currencyCode}`) : null;
    const max = state.max !== null ? (formatStorePrice(state.max, currencyCode, lang) ?? `0 ${currencyCode}`) : null;
    const label = min && max ? t('priceRange', { min, max }) : min ? t('priceFrom', { min }) : t('priceTo', { max: max ?? '' });
    chips.push({ key: 'precio', label, patch: { min: null, max: null } });
  }
  if (state.agotados) chips.push({ key: 'agotados', label: t('includeSoldOut'), patch: { agotados: false } });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('groupLabel')}>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onChange(chip.patch)}
          aria-label={t('remove', { label: chip.label })}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-[#3E667D]/30 bg-[#C8DDF2]/30 py-1 pl-3 pr-2 text-sm text-[#1f3a4a] hover:bg-[#C8DDF2]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
        >
          <span className="max-w-[14rem] truncate">{chip.label}</span>
          <XMarkIcon aria-hidden="true" className="size-4 shrink-0" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClear}
          className="min-h-9 cursor-pointer rounded-full px-3 text-sm font-medium text-[#2f5165] underline underline-offset-4 hover:text-[#1f3a4a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
        >
          {t('clearAll')}
        </button>
      )}
    </div>
  );
}
