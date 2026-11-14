'use client';

// Promoción de temporada de UNA línea del carrito (Buen Fin 2026), para el carrito lateral y
// la página del carrito:
//  - "Aplicada": lo que el servidor ya le aplicó ("3x2 Buen Fin sábado 14: 1 pieza gratis").
//  - "Te falta poco": a la línea le faltan piezas para la siguiente gratis, con un botón que
//    las agrega de un toque. La promoción la sigue aplicando el servidor al cambiar la cantidad.
// La lógica (a quién se le avisa y qué) vive en `lib/storefront/cart-promotions`.

import { useTranslations } from 'next-intl';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { CartLinePromoApplied, CartLinePromoNudge } from '@/lib/storefront/cart-promotions';

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]';

interface CartLinePromoProps {
  /** Lo que el servidor ya aplicó; `null` = nada (o no se quiere mostrar aquí). */
  applied: CartLinePromoApplied | null;
  /** Aviso de "te falta poco"; `null` = no hay. */
  nudge: CartLinePromoNudge | null;
  /** Nombre del producto (para el lector de pantalla). */
  productName: string;
  /** Importe en la moneda del carrito. */
  money: (amount: number) => string;
  /** Hay una petición del carrito en vuelo: el botón ignora el clic. */
  busy: boolean;
  /** Deja la línea en `targetQuantity` piezas. */
  onAdd: (targetQuantity: number) => void;
  className?: string;
}

export function CartLinePromo({ applied, nudge, productName, money, busy, onAdd, className }: CartLinePromoProps) {
  const t = useTranslations('storefront.cart.line');
  if (!applied && !nudge) return null;

  const appliedText = applied
    ? applied.freeQuantity > 0
      ? t('promoApplied', { name: applied.name || t('promoFallbackName'), free: applied.freeQuantity })
      : t('promoAppliedDiscount', { name: applied.name || t('promoFallbackName'), amount: money(applied.savings) })
    : null;
  const nudgeText = nudge
    ? nudge.mixed
      ? t('promoNudgeMixed', { missing: nudge.missing, free: nudge.free })
      : nudge.allFree
        ? t('promoNudgeFree', { missing: nudge.missing })
        : t('promoNudge', { missing: nudge.missing, free: nudge.free })
    : null;

  return (
    <div className={cn('flex flex-col items-start gap-1.5', className)}>
      {appliedText && (
        <p
          data-testid="cart-line-promo-applied"
          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold leading-5 text-emerald-900"
        >
          <SparklesIcon aria-hidden="true" className="size-3.5 shrink-0" />
          {appliedText}
        </p>
      )}
      {nudge && nudgeText && (
        <p
          data-testid="cart-line-promo-nudge"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-rose-50 px-2 py-1 text-xs font-medium leading-5 text-rose-800"
        >
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-600 px-1.5 text-[11px] font-bold leading-5 text-white">
            <SparklesIcon aria-hidden="true" className="size-3" />
            {nudge.label}
          </span>
          <span>{nudgeText}</span>
          <button
            type="button"
            onClick={() => {
              if (!busy) onAdd(nudge.targetQuantity);
            }}
            aria-disabled={busy}
            aria-label={t('promoNudgeAddLabel', { missing: nudge.missing, name: productName, label: nudge.label })}
            className={cn(
              'inline-flex min-h-8 cursor-pointer items-center rounded-full border border-rose-300 bg-white px-2.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
              FOCUS_RING,
            )}
          >
            {t('promoNudgeAdd', { missing: nudge.missing })}
          </button>
        </p>
      )}
    </div>
  );
}
