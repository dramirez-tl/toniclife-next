'use client';

// Cantidad de UNA línea del carrito (drawer y /carrito): "−" y "+" de 44 px con
// nombre del producto en el aria-label, "+" inactivo en el tope, y campo editable que
// confirma en blur/Enter con UN solo PATCH (antes: un PATCH por tecla, y un campo
// vacío mandaba 1). Anuncia cantidad y tope por aria-live.
//
// Los controles NUNCA usan `disabled`: un botón con foco que se deshabilita (durante
// el PATCH o al llegar al tope) pierde el foco y el teclado su posición. Usan
// `aria-disabled` e ignoran el clic; el campo queda `readOnly` mientras hay petición.

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { QTY_DRAFT_ATTR, clampQuantity, commitQuantityDraft, type CapReason } from '@/lib/storefront/cart-logic';
import { cn } from '@/lib/utils';

interface CartLineQuantityProps {
  name: string;
  value: number;
  /** Tope de la línea (`lineLimit`). */
  max: number;
  /** `true` si el tope viene del API (se muestra el motivo); `false` = 999 del DTO. */
  maxKnown: boolean;
  /** Motivo del tope: máximo por pedido de la tienda o existencias. */
  maxReason: CapReason;
  /** Hay una petición del carrito en vuelo: los controles ignoran la interacción SIN perder el foco. */
  busy?: boolean;
  onCommit: (next: number) => void;
  className?: string;
}

const BUTTON =
  'flex size-11 shrink-0 cursor-pointer items-center justify-center text-[#2f5165] hover:bg-gray-100 aria-disabled:cursor-not-allowed aria-disabled:text-gray-400 aria-disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#3E667D]';

export function CartLineQuantity({ name, value, max, maxKnown, maxReason, busy = false, onCommit, className }: CartLineQuantityProps) {
  const t = useTranslations('storefront.cart.quantity');
  const inputId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [clampedNotice, setClampedNotice] = useState(false);

  const atMax = value >= max;
  const orderMax = maxReason === 'order_max';
  const decreaseOff = busy || value <= 1;
  const increaseOff = busy || atMax;

  const step = (delta: number) => {
    if (busy) return;
    setClampedNotice(false);
    const next = clampQuantity(value + delta, Math.max(max, value));
    // Con exceso (value > max) "−" baja de uno en uno; "+" nunca pasa del tope.
    if (next !== value && (delta < 0 || next <= max)) onCommit(next);
  };
  const commit = () => {
    if (draft === null) return;
    if (busy) {
      // Otra línea aún se está guardando: no se manda nada y el borrador se descarta.
      setDraft(null);
      return;
    }
    const { next, clamped } = commitQuantityDraft(draft, value, max);
    setClampedNotice(clamped);
    setDraft(null);
    if (next !== null) onCommit(next);
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className={cn('inline-flex w-fit items-stretch overflow-hidden rounded-md border border-gray-300 bg-white', busy && 'opacity-60')}>
        <button
          type="button"
          onClick={() => {
            if (!decreaseOff) step(-1);
          }}
          aria-disabled={decreaseOff}
          aria-label={t('decrease', { name })}
          className={BUTTON}
        >
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
          readOnly={busy}
          aria-busy={busy}
          value={draft ?? String(value)}
          onChange={(event) => setDraft(event.target.value.replace(/\D/g, '').slice(0, 3))}
          onFocus={(event) => event.target.select()}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            } else if (event.key === 'Escape' && draft !== null) {
              // Descarta lo tecleado. Que el drawer NO se cierre lo decide su
              // `onEscapeKeyDown` (Radix oye Escape antes que este manejador).
              setDraft(null);
            }
          }}
          {...{ [QTY_DRAFT_ATTR]: draft !== null ? 'true' : undefined }}
          className="w-12 border-x border-gray-300 bg-transparent text-center text-base font-semibold tabular-nums text-gray-900 outline-none focus-visible:bg-[#C8DDF2]/30"
        />
        <button
          type="button"
          onClick={() => {
            if (!increaseOff) step(1);
          }}
          aria-disabled={increaseOff}
          aria-label={t('increase', { name })}
          className={BUTTON}
        >
          <PlusIcon aria-hidden="true" className="size-4" />
        </button>
      </div>
      {maxKnown && atMax && <span className="text-xs text-gray-700">{t(orderMax ? 'maxOrder' : 'maxStock', { max })}</span>}
      <span className="sr-only" aria-live="polite">
        {clampedNotice
          ? t(orderMax ? 'clampedOrder' : 'clampedStock', { max })
          : maxKnown && atMax
            ? t(orderMax ? 'announceMaxOrder' : 'announceMaxStock', { name, count: value })
            : t('announce', { name, count: value })}
      </span>
    </div>
  );
}
