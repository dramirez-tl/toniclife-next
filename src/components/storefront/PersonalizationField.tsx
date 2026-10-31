'use client';

// Campo de personalización del detalle (playeras, API mig 179): el cliente escribe el
// texto que quiere estampado, con el tope de caracteres VISIBLES que fija el producto.
// El valor vive en `ProductDetailClient` (se manda al agregar y se limpia después).
// Es OPCIONAL: vacío = sin personalización. Escribir de más lo frena el propio input
// (`maxLength`); pegar un texto más largo se recorta al tope y se avisa en la ayuda.

import { useId, useState, type ClipboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { clampPersonalization, personalizationLength } from '@/lib/storefront/personalization';
import { cn } from '@/lib/utils';

interface PersonalizationFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Tope de caracteres visibles del producto (1..60). */
  maxLength: number;
  /** Etiqueta del producto; `null` = la de la tienda ("Personalízala con tu nombre"). */
  label: string | null;
  disabled?: boolean;
  className?: string;
}

export function PersonalizationField({ value, onChange, maxLength, label, disabled = false, className }: PersonalizationFieldProps) {
  const t = useTranslations('storefront.product.personalization');
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const [clipped, setClipped] = useState(false);
  const count = personalizationLength(value);

  // Pegar: si lo que quedaría rebasa el tope, se recorta a mano y se avisa (el navegador
  // lo haría en silencio y contando unidades UTF-16, no caracteres visibles).
  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/[\r\n\t]+/g, ' ');
    if (!pasted) return;
    const input = event.currentTarget;
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? start;
    const next = value.slice(0, start) + pasted + value.slice(end);
    if (personalizationLength(next) <= maxLength) return;
    event.preventDefault();
    onChange(clampPersonalization(next, maxLength));
    setClipped(true);
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={inputId} className="text-sm font-medium text-gray-900">
        {label ?? t('label')}
      </Label>
      <Input
        id={inputId}
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        maxLength={maxLength}
        disabled={disabled}
        value={value}
        placeholder={t('placeholder')}
        aria-describedby={hintId}
        onChange={(event) => {
          setClipped(false);
          onChange(clampPersonalization(event.target.value, maxLength));
        }}
        onPaste={onPaste}
        className="h-11 border-gray-300 bg-white text-base text-gray-900 placeholder:text-gray-500 focus-visible:border-[#3E667D] focus-visible:ring-[#3E667D]/30"
      />
      <div id={hintId} className="flex items-baseline justify-between gap-3 text-xs text-gray-700">
        <span aria-live="polite" className={clipped ? 'font-medium text-amber-900' : undefined}>
          {clipped ? t('tooLong', { max: maxLength }) : t('hint', { max: maxLength })}
        </span>
        <span className="shrink-0 tabular-nums">{t('counter', { count, max: maxLength })}</span>
      </div>
    </div>
  );
}
