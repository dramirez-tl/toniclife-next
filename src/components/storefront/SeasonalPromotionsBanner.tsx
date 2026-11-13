'use client';

// Banner de promociones de temporada (mig 186) para la tienda: las temporadas del
// país de la tienda y, dentro, las promociones que corren AHORA (son sorpresa: el
// API no manda nada antes de su hora), con el arte de la temporada, el arte de
// cada promoción (al pulsarlo se ve en grande: trae los productos participantes y
// las condiciones), su mecánica (3x2, precio especial…) y los productos que
// participan. El carrito del servidor es quien aplica la promoción; aquí solo se
// anuncia. Sin temporadas no pinta nada.
//
// El arte de la temporada se ve COMPLETO, sin recortar (SeasonArt): a la izquierda
// en pantallas anchas, arriba en celular. Antes llenaba toda la altura del aviso y,
// con varias promociones, solo se veía una franja del centro (12-nov-2026).
//
// Las promociones que NO valen en línea (solo punto de venta: sucursales y Call
// Center) también se anuncian, con el aviso "Solo en sucursales y Call Center" y sin
// enlaces a sus productos: en el carrito en línea no se aplicarían.
//
// Los productos solo se enlazan para quien tiene sesión de cliente: los de las
// promociones son productos de distribuidor y a un visitante sin sesión su página le
// responde "no encontrado".
//
// `productsAction` (catálogo): botón "Ver los N productos en promoción", que pone el
// filtro de temporada. Solo llega cuando ese visitante ve alguno.

import { useTranslations } from 'next-intl';
import { BuildingStorefrontIcon, ClockIcon, GiftIcon, SparklesIcon, TagIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/routing';
import { useStoreCountry } from '@/hooks/useStoreCountry';
import { useStorefrontSeasonalPromotions } from '@/hooks/useSeasonalPromotions';
import { useStorefrontViewer } from '@/hooks/useStorefront';
import { productPath } from '@/lib/storefront/slug';
import { formatLocalStamp, isOnlinePromotion } from '@/lib/seasonal-promotions';
import { cn } from '@/lib/utils';
import { PromoArt } from './PromoArt';
import { SeasonArt } from './SeasonArt';

const MAX_CHIPS = 12;

export interface SeasonalProductsAction {
  /** Productos en promoción que ve este visitante en el catálogo. */
  count: number;
  onClick: () => void;
}

export function SeasonalPromotionsBanner({
  className,
  compact = false,
  productsAction,
}: {
  className?: string;
  compact?: boolean;
  productsAction?: SeasonalProductsAction;
}) {
  const t = useTranslations('home.seasonal');
  const { countryCode } = useStoreCountry();
  const { data } = useStorefrontSeasonalPromotions(countryCode);
  const { hasCustomerSession } = useStorefrontViewer();
  const seasons = data?.seasons ?? [];
  if (seasons.length === 0) return null;

  return (
    <section
      className={cn('mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8', className)}
      aria-label={t('aria')}
    >
      {seasons.map((s) => {
        const active = s.status === 'active';
        return (
          <article
            key={s.id}
            className="overflow-hidden rounded-2xl border border-[#C8DDF2] bg-white shadow-sm"
          >
            <div className="flex flex-col md:flex-row">
              {s.imageUrl && (
                <SeasonArt
                  src={s.imageUrl}
                  name={s.name}
                  sizes={
                    compact
                      ? '(min-width: 1024px) 240px, (min-width: 768px) 208px, 100vw'
                      : '(min-width: 1024px) 320px, (min-width: 768px) 256px, 100vw'
                  }
                  className={cn(
                    'w-full md:max-h-none md:self-start md:rounded-xl',
                    compact
                      ? 'max-h-56 md:m-4 md:mr-0 md:w-52 lg:w-60'
                      : 'max-h-72 md:m-5 md:mr-0 md:w-64 lg:w-80',
                  )}
                />
              )}
              <div className="min-w-0 flex-1 p-5 sm:p-6">
                <p
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
                    active ? 'bg-emerald-100 text-emerald-900' : 'bg-[#C8DDF2]/50 text-[#1f3a4a]',
                  )}
                >
                  {active ? <SparklesIcon className="h-4 w-4" /> : <ClockIcon className="h-4 w-4" />}
                  {active
                    ? t('activeNow')
                    : t('startsOn', { date: formatLocalStamp(s.startsAt, { weekday: true }) })}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">{s.name}</h2>
                {s.description && <p className="mt-1 text-sm text-gray-600">{s.description}</p>}

                {productsAction && productsAction.count > 0 && (
                  <button
                    type="button"
                    onClick={productsAction.onClick}
                    data-testid="seasonal-view-products"
                    className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-[#3E667D] px-4 text-sm font-semibold text-white hover:bg-[#2f5165] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
                  >
                    <TagIcon className="h-4 w-4" aria-hidden="true" />
                    {t('viewProducts', { count: productsAction.count })}
                  </button>
                )}

                <ul className="mt-4 space-y-3">
                  {(s.promotions ?? []).map((p) => {
                    const eligible = p.products.filter((x) => x.role === 'eligible');
                    const gifts = p.products.filter((x) => x.role === 'gift');
                    const more = Math.max(0, eligible.length - MAX_CHIPS);
                    // Solo punto de venta: se anuncia con aviso y sin enlaces para comprarla en línea.
                    const online = isOnlinePromotion(p);
                    return (
                      <li key={p.id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                        <div className={cn(p.imageUrl && 'flex flex-col gap-3 sm:flex-row sm:items-start')}>
                        {p.imageUrl && (
                          <PromoArt
                            src={p.imageUrl}
                            name={p.name}
                            description={p.description}
                            label={t('viewArt', { name: p.name })}
                            sizes={compact ? '144px' : '(min-width: 768px) 256px, (min-width: 640px) 224px, 100vw'}
                            className={compact ? 'w-32 sm:w-36' : 'w-full sm:w-56 md:w-64'}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#2f5165] px-2.5 py-0.5 text-xs font-bold text-white">
                            {p.typeLabel}
                          </span>
                          <span className="font-semibold text-gray-900">{p.name}</span>
                          <span className="text-xs text-gray-600">
                            {formatLocalStamp(p.effectiveStartsAt, { weekday: true })} →{' '}
                            {formatLocalStamp(p.effectiveEndsAt, { weekday: true })}
                          </span>
                          {!online && (
                            <span
                              data-testid="seasonal-store-only"
                              className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900"
                            >
                              <BuildingStorefrontIcon className="h-3.5 w-3.5" aria-hidden="true" />
                              {t('storeOnly')}
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p className="mt-1 whitespace-pre-line text-xs text-gray-600">{p.description}</p>
                        )}
                        {!compact && (eligible.length > 0 || gifts.length > 0) && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {eligible.slice(0, MAX_CHIPS).map((x) =>
                              online && x.slug && hasCustomerSession ? (
                                <Link
                                  key={x.productId}
                                  href={productPath(x.slug)}
                                  className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-800 hover:border-[#2f5165] hover:text-[#2f5165]"
                                >
                                  {x.name}
                                </Link>
                              ) : (
                                <span
                                  key={x.productId}
                                  className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-800"
                                >
                                  {x.name}
                                </span>
                              ),
                            )}
                            {more > 0 && (
                              <span className="self-center text-xs text-gray-500">
                                {t('more', { count: more })}
                              </span>
                            )}
                            {gifts.map((g) => (
                              <span
                                key={`g-${g.productId}`}
                                className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-900"
                              >
                                <GiftIcon className="h-3.5 w-3.5" />
                                {t('gift', { name: g.name })}
                              </span>
                            ))}
                          </div>
                        )}
                        </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
