'use client';

// Selector de variantes del detalle (Para / Color / Talla), al estilo Nike o
// Mercado Libre. Cada botón lleva a la PÁGINA de otra variante (`router.replace`
// sin perder el scroll): título, precio, existencia y "Agregar al carrito" siguen
// siendo los del producto que se está viendo. La regla de "a cuál voy" vive en
// `lib/storefront/variants.ts`. Las agotadas se marcan pero siguen siendo
// clicables: tienen página.

import { useId, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import type { LanguageCode } from '@/i18n/config';
import { useRouter } from '@/i18n/routing';
import { productPath } from '@/lib/storefront/slug';
import { VARIANT_AXES, axisChips, type CurrentVariant, type VariantChip } from '@/lib/storefront/variants';
import { cn } from '@/lib/utils';
import type { StorefrontAvailability, StorefrontVariants } from '@/types/storefront';
import { SizeGuideDialog } from './SizeGuideDialog';

interface VariantPickerProps {
  variants: StorefrontVariants;
  /** `product.id` de la página actual. */
  currentId: string;
  /** Existencia del producto actual (por si no viniera entre las opciones). */
  currentAvailability: StorefrontAvailability;
  lang: LanguageCode;
  className?: string;
}

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]';

export function VariantPicker({ variants, currentId, currentAvailability, lang, className }: VariantPickerProps) {
  const t = useTranslations('storefront.product.variants');
  const router = useRouter();
  const baseId = useId();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Mientras llega la página elegida, el selector ya la marca (sin esperar al servidor).
  const pending = isPending && pendingId ? (variants.options.find((option) => option.id === pendingId) ?? null) : null;
  const current: CurrentVariant = pending
    ? { id: pending.id, gender: pending.gender, color: pending.color, size: pending.size }
    : { id: currentId, gender: variants.current.gender, color: variants.current.color, size: variants.current.size };
  const availability = pending ? pending.availability : currentAvailability;

  const go = (chip: VariantChip) => {
    const target = chip.target;
    if (!target || isPending) return;
    setPendingId(target.id);
    startTransition(() => {
      router.replace(productPath(target.slug), { scroll: false });
    });
  };

  const axes = VARIANT_AXES.filter((axis) => variants.axes[axis]);
  const guide = variants.sizeGuide;
  const soldOutLabel = (chip: VariantChip) => (chip.soldOut ? t('optionSoldOut', { label: chip.label }) : undefined);

  return (
    <div
      role="group"
      aria-label={t('label')}
      aria-busy={isPending}
      className={cn('flex flex-col gap-4 transition-opacity', isPending && 'opacity-70', className)}
    >
      {axes.map((axis) => {
        const chips = axisChips(variants.options, current, axis, lang, availability);
        if (chips.length === 0) return null;
        const labelId = `${baseId}-${axis}`;
        const selected = chips.find((chip) => chip.selected);
        return (
          <div key={axis} role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
            <p id={labelId} className="text-sm font-medium text-gray-900">
              {t(axis)}
              {selected && <span className="font-normal text-gray-700">: {selected.label}</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) =>
                axis === 'color' && chip.colorHex ? (
                  <Swatch
                    key={chip.value}
                    chip={chip}
                    ariaLabel={soldOutLabel(chip) ?? chip.label}
                    onSelect={() => go(chip)}
                  />
                ) : (
                  <Chip
                    key={chip.value}
                    chip={chip}
                    shape={axis === 'size' ? 'square' : 'pill'}
                    ariaLabel={soldOutLabel(chip)}
                    onSelect={() => go(chip)}
                  />
                ),
              )}
            </div>
            {axis === 'size' && guide && <SizeGuideDialog guide={guide} className="-ml-2" />}
          </div>
        );
      })}
      {!variants.axes.size && guide && <SizeGuideDialog guide={guide} className="-ml-2" />}
      <span className="sr-only" aria-live="polite">
        {isPending ? t('navigating') : ''}
      </span>
    </div>
  );
}

interface ChipProps {
  chip: VariantChip;
  /** Píldora (Para, color sin muestra) o cuadrado (talla). */
  shape: 'pill' | 'square';
  /** Solo cuando el texto visible no basta (agotado). */
  ariaLabel?: string;
  onSelect: () => void;
}

/** Botón de texto: mínimo 44 px de alto; la agotada va tachada y en gris. */
function Chip({ chip, shape, ariaLabel, onSelect }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={chip.selected}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex min-h-11 cursor-pointer items-center justify-center border text-sm transition-colors',
        shape === 'pill' ? 'rounded-full px-4 font-medium' : 'min-w-11 rounded-md px-3 font-semibold',
        chip.selected
          ? 'border-[#3E667D] bg-[#C8DDF2]/40 text-[#2f5165] ring-1 ring-inset ring-[#3E667D]'
          : 'border-gray-200 bg-white text-gray-800 hover:border-[#3E667D]',
        chip.soldOut &&
          (chip.selected ? 'text-gray-500 line-through' : 'border-dashed bg-gray-50 text-gray-400 line-through hover:border-gray-400'),
        FOCUS,
      )}
    >
      {chip.label}
    </button>
  );
}

interface SwatchProps {
  chip: VariantChip;
  ariaLabel: string;
  onSelect: () => void;
}

/** Muestra circular del color (el nombre va en el tooltip y en el aria-label). */
function Swatch({ chip, ariaLabel, onSelect }: SwatchProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={chip.selected}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cn(
        'relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-colors',
        chip.selected ? 'border-[#3E667D]' : 'border-transparent hover:border-gray-300',
        FOCUS,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('block size-8 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]', chip.soldOut && 'opacity-50')}
        style={{ backgroundColor: chip.colorHex ?? undefined }}
      />
      {chip.soldOut && <span aria-hidden="true" className="absolute h-0.5 w-9 rotate-45 rounded-full bg-gray-600" />}
    </button>
  );
}
