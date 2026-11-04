'use client';

// Banner de promociones de temporada (mig 186) para la tienda: temporadas en
// curso o próximas (≤ 14 días) del país de la tienda, con su arte, sus
// promociones (3x2, precio especial…) y los productos que participan. El
// carrito del servidor es quien aplica la promoción; aquí solo se anuncia.
// Sin temporadas no pinta nada.

import { useTranslations } from 'next-intl';
import { ClockIcon, GiftIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/routing';
import { useStoreCountry } from '@/hooks/useStoreCountry';
import { useStorefrontSeasonalPromotions } from '@/hooks/useSeasonalPromotions';
import { productPath } from '@/lib/storefront/slug';
import { formatLocalStamp } from '@/lib/seasonal-promotions';
import { cn } from '@/lib/utils';

const MAX_CHIPS = 12;

export function SeasonalPromotionsBanner({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const t = useTranslations('home.seasonal');
  const { countryCode } = useStoreCountry();
  const { data } = useStorefrontSeasonalPromotions(countryCode);
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
            <div className={cn('grid gap-0', s.imageUrl ? 'md:grid-cols-[minmax(240px,340px)_1fr]' : '')}>
              {s.imageUrl && (
                <div className="relative min-h-[180px] bg-gray-100">
                  {/* URL libre (host del API): next/image exige dominios registrados. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.imageUrl}
                    alt={s.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="p-5 sm:p-6">
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

                <ul className="mt-4 space-y-3">
                  {(s.promotions ?? []).map((p) => {
                    const eligible = p.products.filter((x) => x.role === 'eligible');
                    const gifts = p.products.filter((x) => x.role === 'gift');
                    const more = Math.max(0, eligible.length - MAX_CHIPS);
                    return (
                      <li key={p.id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#2f5165] px-2.5 py-0.5 text-xs font-bold text-white">
                            {p.typeLabel}
                          </span>
                          <span className="font-semibold text-gray-900">{p.name}</span>
                          <span className="text-xs text-gray-600">
                            {formatLocalStamp(p.effectiveStartsAt, { weekday: true })} →{' '}
                            {formatLocalStamp(p.effectiveEndsAt, { weekday: true })}
                          </span>
                        </div>
                        {p.description && (
                          <p className="mt-1 whitespace-pre-line text-xs text-gray-600">{p.description}</p>
                        )}
                        {!compact && (eligible.length > 0 || gifts.length > 0) && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {eligible.slice(0, MAX_CHIPS).map((x) =>
                              x.slug ? (
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
