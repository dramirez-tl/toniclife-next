'use client';

// Cantidad de UNA línea del carrito (drawer y /carrito): "−" y "+" de 44 px con
// nombre del producto en el aria-label, "+" deshabilitado en el tope, y campo
// editable que confirma en blur/Enter con UN solo PATCH (antes: un PATCH por tecla,
// y un campo vacío mandaba 1). Anuncia cantidad y tope por aria-live.

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { clampQuantity, commitQuantityDraft } from '@/lib/storefront/cart-logic';
import { cn } from '@/lib/utils';

interface CartLineQuantityProps {
  name: string;
  value: number;
  /** Tope de la línea (`lineLimit`). */
  max: number;
  /** `true` si el tope viene del API (se muestra "Máximo N"); `false` = 999 del DTO. */
  maxKnown: boolean;
  disabled?: boolean;
  onCommit: (next: number) => void;
  className?: string;
}

const BUTTON =
  'flex size-11 shrink-0 cursor-pointer items-center justify-center text-[#2f5165] hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#3E667D]';

export function CartLineQuantity({ name, value, max, maxKnown, disabled = false, onCommit, className }: CartLineQuantityProps) {
  const t = useTranslations('storefront.cart.quantity');
  const inputId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [clampedNotice, setClampedNotice] = useState(false);

  const atMax = value >= max;
  const step = (delta: number) => {
    setClampedNotice(false);
    const next = clampQuantity(value + delta, Math.max(max, value));
    // Con exceso (value > max) "−" baja de uno en uno; "+" nunca pasa del tope.
    if (next !== value && (delta < 0 || next <= max)) onCommit(next);
  };
  const commit = () => {
    if (draft === null) return;
    const { next, clamped } = commitQuantityDraft(draft, value, max);
    setClampedNotice(clamped);
    setDraft(null);
    if (next !== null) onCommit(next);
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className={cn('inline-flex w-fit items-stretch overflow-hidden rounded-md border border-gray-300 bg-white', disabled && 'opacity-60')}>
        <button type="button" onClick={() => step(-1)} disabled={disabled || value <= 1} aria-label={t('decrease', { name })} className={BUTTON}>
          <MinusIcon aria-hidden="true" className="size-4" />
        </button>
        <label htmlFor={inputId} className="sr-only">
          {t('label', { name })}
        </label>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          disabled={disabled}
          value={draft ?? String(value)}
          onChange={(event) => setDraft(event.target.value.replace(/\D/g, '').slice(0, 3))}
          onFocus={(event) => event.target.select()}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            } else if (event.key === 'Escape' && draft !== null) {
              // Descarta lo tecleado sin cerrar el drawer.
              event.stopPropagation();
              setDraft(null);
            }
          }}
          className="w-12 border-x border-gray-300 bg-transparent text-center text-base font-semibold tabular-nums text-gray-900 outline-none focus-visible:bg-[#C8DDF2]/30"
        />
        <button type="button" onClick={() => step(1)} disabled={disabled || atMax} aria-label={t('increase', { name })} className={BUTTON}>
          <PlusIcon aria-hidden="true" className="size-4" />
        </button>
      </div>
      {maxKnown && atMax && <span className="text-xs text-gray-700">{t('max', { max })}</span>}
      <span className="sr-only" aria-live="polite">
        {clampedNotice
          ? t('clamped', { max })
          : maxKnown && atMax
            ? t('announceMax', { name, count: value })
            : t('announce', { name, count: value })}
      </span>
    </div>
  );
}
