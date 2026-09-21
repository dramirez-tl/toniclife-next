'use client';

// Filtros del catálogo (columna de escritorio y contenido del Sheet móvil).
// Cada faceta llega del API con su conteo REAL. Precio: dos campos + "Aplicar"
// (sin slider). Todo cambio se refleja en la URL a través de `onChange`.

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import type { CatalogState, StorefrontFacets, StorefrontProductType } from '@/types/storefront';

const ALL = '__all__';

interface CatalogFiltersProps {
  state: CatalogState;
  facets: StorefrontFacets;
  currencyCode: string;
  onChange: (patch: Partial<CatalogState>) => void;
}

function priceInput(value: number | null): string {
  return value === null ? '' : String(value);
}

function parsePriceInput(raw: string): number | null {
  const text = raw.trim().replace(',', '.');
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export function CatalogFilters({ state, facets, currencyCode, onChange }: CatalogFiltersProps) {
  const t = useTranslations('storefront.catalog.filters');
  const uid = useId();
  const [minText, setMinText] = useState(priceInput(state.min));
  const [maxText, setMaxText] = useState(priceInput(state.max));
  const [syncedRange, setSyncedRange] = useState(`${state.min}|${state.max}`);

  // El rango cambió por fuera (chip, "Limpiar", atrás/adelante): los campos lo siguen.
  const rangeKey = `${state.min}|${state.max}`;
  if (rangeKey !== syncedRange) {
    setSyncedRange(rangeKey);
    setMinText(priceInput(state.min));
    setMaxText(priceInput(state.max));
  }

  const countFor = (type: StorefrontProductType) => facets.types.find((f) => f.type === type)?.count ?? null;
  const typeOptions: { value: StorefrontProductType; label: string }[] = [
    { value: 'product', label: t('typeProduct') },
    { value: 'pack', label: t('typePack') },
  ];
  // La categoría activa siempre aparece aunque el API no la devuelva en las facetas.
  const categories =
    state.categoria && !facets.categories.some((c) => c.slug === state.categoria)
      ? [...facets.categories, { slug: state.categoria, name: state.categoria, count: 0 }]
      : facets.categories;

  const applyPrice = () => {
    let min = parsePriceInput(minText);
    let max = parsePriceInput(maxText);
    if (min !== null && max !== null && min > max) [min, max] = [max, min];
    onChange({ min, max });
  };

  const priceDirty = parsePriceInput(minText) !== state.min || parsePriceInput(maxText) !== state.max;

  return (
    <div className="flex flex-col gap-7">
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-gray-900">{t('category')}</legend>
        <RadioGroup
          value={state.categoria ?? ALL}
          onValueChange={(value) => onChange({ categoria: value === ALL ? null : value })}
          className="gap-0"
        >
          <FilterRadio id={`${uid}-cat-all`} value={ALL} label={t('allCategories')} count={null} />
          {categories.map((category) => (
            <FilterRadio
              key={category.slug}
              id={`${uid}-cat-${category.slug}`}
              value={category.slug}
              label={category.name}
              count={category.count}
            />
          ))}
        </RadioGroup>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-gray-900">{t('type')}</legend>
        <RadioGroup
          value={state.tipo ?? ALL}
          onValueChange={(value) => onChange({ tipo: value === ALL ? null : (value as StorefrontProductType) })}
          className="gap-0"
        >
          <FilterRadio id={`${uid}-type-all`} value={ALL} label={t('allTypes')} count={null} />
          {typeOptions.map((option) => (
            <FilterRadio
              key={option.value}
              id={`${uid}-type-${option.value}`}
              value={option.value}
              label={option.label}
              count={countFor(option.value)}
            />
          ))}
        </RadioGroup>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-gray-900">{t('price', { currency: currencyCode })}</legend>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            applyPrice();
          }}
        >
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Label htmlFor={`${uid}-min`} className="mb-1 block text-xs text-gray-700">
                {t('priceMin')}
              </Label>
              <Input
                id={`${uid}-min`}
                inputMode="decimal"
                autoComplete="off"
                value={minText}
                onChange={(event) => setMinText(event.target.value.replace(/[^\d.,]/g, '').slice(0, 10))}
                placeholder={facets.price.min !== null ? String(Math.floor(facets.price.min)) : '0'}
                className="h-11"
              />
            </div>
            <span aria-hidden="true" className="pb-3 text-gray-600">
              –
            </span>
            <div className="min-w-0 flex-1">
              <Label htmlFor={`${uid}-max`} className="mb-1 block text-xs text-gray-700">
                {t('priceMax')}
              </Label>
              <Input
                id={`${uid}-max`}
                inputMode="decimal"
                autoComplete="off"
                value={maxText}
                onChange={(event) => setMaxText(event.target.value.replace(/[^\d.,]/g, '').slice(0, 10))}
                placeholder={facets.price.max !== null ? String(Math.ceil(facets.price.max)) : ''}
                className="h-11"
              />
            </div>
          </div>
          <Button type="submit" variant="outline" disabled={!priceDirty} className="min-h-11 cursor-pointer">
            {t('priceApply')}
          </Button>
        </form>
      </fieldset>

      <div className="flex min-h-11 items-center justify-between gap-3">
        <Label htmlFor={`${uid}-soldout`} className="text-sm font-medium text-gray-900">
          {t('includeSoldOut')}
          {facets.availability.outOfStock > 0 && (
            <span className="ml-1 font-normal text-gray-600">({facets.availability.outOfStock})</span>
          )}
        </Label>
        <Switch
          id={`${uid}-soldout`}
          checked={state.agotados}
          onCheckedChange={(checked) => onChange({ agotados: checked })}
        />
      </div>
    </div>
  );
}

function FilterRadio({ id, value, label, count }: { id: string; value: string; label: string; count: number | null }) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <RadioGroupItem id={id} value={value} />
      <Label htmlFor={id} className="flex flex-1 cursor-pointer items-center justify-between gap-2 py-2 text-sm font-normal text-gray-800">
        <span>{label}</span>
        {count !== null && <span className="text-xs tabular-nums text-gray-600">{count}</span>}
      </Label>
    </div>
  );
}
