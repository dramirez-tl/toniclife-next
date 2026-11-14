'use client';

// Promoción de temporada en el DETALLE del producto (Buen Fin 2026). El catálogo ya la anuncia
// en la tarjeta (insignia "3x2" y el nombre de la promoción); aquí se dice lo mismo, con más
// espacio: qué promoción es, cómo funciona ("Lleva 3 piezas de este producto y paga 2") y, según
// la cantidad elegida, cuánto falta para la pieza gratis, con un botón que deja esa cantidad.
// Si la promoción solo vale en punto de venta lo dice claro: el carrito en línea no la aplica.
//
// La promoción la aplica el SERVIDOR al carrito; esto solo informa (`lib/seasonal-promotions`).

import { useTranslations } from 'next-intl';
import { BuildingStorefrontIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { nxmProgress, type SeasonalProductBadge } from '@/lib/seasonal-promotions';

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]';

/** Insignia con la mecánica ("3x2"), igual que la de la tarjeta del catálogo. */
export function SeasonalBadge({ seasonal, className }: { seasonal: SeasonalProductBadge; className?: string }) {
  return (
    <span
      data-testid="seasonal-badge"
      title={seasonal.name}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold leading-5 shadow-sm',
        seasonal.storeOnly ? 'border border-amber-300 bg-amber-50 text-amber-900' : 'bg-rose-600 text-white',
        className,
      )}
    >
      {seasonal.storeOnly ? (
        <BuildingStorefrontIcon aria-hidden="true" className="size-4" />
      ) : (
        <SparklesIcon aria-hidden="true" className="size-4" />
      )}
      {seasonal.label}
    </span>
  );
}

interface SeasonalPromoNoticeProps {
  seasonal: SeasonalProductBadge;
  /** Cantidad elegida en el bloque de compra. */
  quantity: number;
  /** Máximo que admite la cantidad (existencias o tope por pedido). */
  maxQuantity: number;
  onQuantityChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export function SeasonalPromoNotice({
  seasonal,
  quantity,
  maxQuantity,
  onQuantityChange,
  disabled = false,
  className,
}: SeasonalPromoNoticeProps) {
  const t = useTranslations('storefront.product.seasonal');
  const { nxm, storeOnly } = seasonal;
  // Solo se le hace la cuenta a quien puede aprovecharla aquí y con piezas de este mismo producto.
  const progress = nxm && !storeOnly && nxm.sameProductOnly ? nxmProgress(quantity, nxm) : null;
  const canTake = !!progress && progress.missing > 0 && progress.targetQuantity <= maxQuantity;

  return (
    <section
      data-testid="seasonal-promo-notice"
      aria-label={t('label')}
      className={cn(
        'flex flex-col gap-2 rounded-xl border p-4',
        storeOnly ? 'border-amber-300 bg-amber-50' : 'border-rose-200 bg-rose-50',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <SeasonalBadge seasonal={seasonal} />
        <p className={cn('text-sm font-bold leading-snug sm:text-base', storeOnly ? 'text-amber-900' : 'text-rose-800')}>
          {seasonal.name}
        </p>
      </div>

      {nxm && (
        <p className="text-sm text-gray-900">
          {t(nxm.sameProductOnly ? 'nxmSame' : 'nxmMixed', { buy: nxm.buy, pay: nxm.pay })}
          {!storeOnly && <span> {t('auto')}</span>}
        </p>
      )}
      {storeOnly && <p className="text-sm font-semibold text-amber-900">{t('storeOnly')}</p>}

      {progress && progress.missing === 0 && progress.freeNow > 0 && (
        <p data-testid="seasonal-promo-ready" role="status" className="text-sm font-semibold text-emerald-800">
          {t('ready', { quantity, free: progress.freeNow })}
        </p>
      )}
      {progress && progress.missing > 0 && (
        <p data-testid="seasonal-promo-missing" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold text-rose-800">
          <span>
            {progress.missing <= progress.freeNext
              ? t('missingFree', { missing: progress.missing })
              : t('missing', { missing: progress.missing, free: progress.freeNext })}
          </span>
          {canTake && (
            <button
              type="button"
              onClick={() => onQuantityChange(progress.targetQuantity)}
              disabled={disabled}
              aria-label={t('takeLabel', { quantity: progress.targetQuantity, name: seasonal.name })}
              className={cn(
                'inline-flex min-h-9 cursor-pointer items-center rounded-full border border-rose-300 bg-white px-3 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50',
                FOCUS_RING,
              )}
            >
              {t('take', { quantity: progress.targetQuantity })}
            </button>
          )}
        </p>
      )}

      {seasonal.description && <p className="text-xs leading-relaxed text-gray-700">{seasonal.description}</p>}
    </section>
  );
}
