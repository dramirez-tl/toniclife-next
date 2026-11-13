'use client';

// Tarjeta de la TEMPORADA VIGENTE en el inicio del panel del distribuidor (Diego, 12-nov-2026:
// "que se pusiera arriba de «¿Qué quieres hacer?» la temporada vigente, por ejemplo lo del Buen
// Fin, con la descripción general, el arte de la temporada, y que al dar clic te lleve a la
// tienda para comprar").
//
// Toma lo mismo que el aviso de la tienda (GET /storefront/seasonal-promotions del país de la
// cuenta): las temporadas que corren AHORA con sus promociones de hoy. Son sorpresa: el API no
// manda nada antes de su hora, así que sin temporada en curso no se pinta nada. Toda la tarjeta
// es un enlace a la tienda; el carrito del servidor es quien aplica las promociones. Si alguna
// de las promociones de hoy se puede comprar en línea, el enlace llega con el filtro de temporada
// puesto (solo los productos en promoción) y el botón lo dice; si hoy todas son de sucursal,
// lleva al catálogo completo.
//
// El arte se ve COMPLETO, sin recortar (Marketing manda tanto 3:2 como publicaciones cuadradas):
// el espacio toma la proporción de la imagen en cuanto carga. Las promociones que solo valen en
// sucursal llevan el mismo aviso que en la tienda.

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { BuildingStorefrontIcon, ChevronRightIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useStoreCountry } from '@/hooks/useStoreCountry';
import { useStorefrontSeasonalPromotions } from '@/hooks/useSeasonalPromotions';
import { SeasonArt } from '@/components/storefront/SeasonArt';
import { hasOnlinePromotion, seasonHighlights } from '@/lib/seasonal-promotions';
import { catalogHref } from '@/lib/storefront/catalog-params';
import type { PromoSeason } from '@/types/seasonal-promotion';

/** A dónde lleva la tarjeta: el catálogo de la tienda (ahí está el aviso con cada promoción). */
const STORE_HREF = catalogHref();
/** Lo mismo con el filtro de temporada puesto: solo los productos que hoy están en promoción. */
const STORE_PROMO_HREF = catalogHref({ temporada: true });
const MAX_PROMOTIONS = 3;

/** Las temporadas en curso del país de la cuenta, una tarjeta por cada una. Sin temporada: nada. */
export function SeasonHomeCards() {
  const { countryCode } = useStoreCountry();
  const { data } = useStorefrontSeasonalPromotions(countryCode);
  const seasons = data?.seasons ?? [];
  if (seasons.length === 0) return null;
  return (
    <>
      {seasons.map((season) => (
        <SeasonHomeCard key={season.id} season={season} />
      ))}
    </>
  );
}

export function SeasonHomeCard({ season }: { season: PromoSeason }) {
  const t = useTranslations('distributor.dashboard.season');
  const { items, more } = seasonHighlights(season, MAX_PROMOTIONS);
  // Con algo que comprar en línea hoy, directo a los productos en promoción.
  const buyOnline = hasOnlinePromotion(season);

  return (
    <Link
      href={buyOnline ? STORE_PROMO_HREF : STORE_HREF}
      aria-label={t('aria', { name: season.name })}
      data-testid="season-home-card"
      className="group block overflow-hidden rounded-xl border border-[#C8DDF2] bg-white shadow-md outline-none transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-[#3E667D] focus-visible:ring-offset-2"
    >
      <div className="flex flex-col sm:flex-row xl:flex-col">
        {/* Tope de alto (max-h-64): con un arte cuadrado la tarjeta no empuja demasiado abajo las
            acciones rápidas; el arte sigue completo. */}
        {season.imageUrl ? (
          <SeasonArt
            src={season.imageUrl}
            name={season.name}
            sizes="(min-width: 1280px) 360px, (min-width: 640px) 208px, 100vw"
            className="max-h-64 w-full sm:m-4 sm:mr-0 sm:w-52 sm:self-start sm:rounded-lg xl:m-0 xl:w-full xl:rounded-none"
          />
        ) : null}

        <div className="min-w-0 flex-1 p-5">
          <p className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">
            <SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t('badge')}
          </p>
          <h2 className="mt-2 text-lg font-bold leading-snug text-gray-900">{season.name}</h2>
          {season.description ? (
            <p className="mt-1 line-clamp-5 whitespace-pre-line text-sm text-gray-600">{season.description}</p>
          ) : null}

          {items.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('today')}</p>
              <ul className="mt-1.5 space-y-1.5">
                {items.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-1.5 text-sm text-gray-800">
                    <span className="rounded-full bg-[#2f5165] px-2 py-0.5 text-[11px] font-bold text-white">
                      {p.typeLabel}
                    </span>
                    <span className="min-w-0">{p.name}</span>
                    {p.storeOnly ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                        <BuildingStorefrontIcon className="h-3 w-3" aria-hidden="true" />
                        {t('storeOnly')}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {more > 0 ? <p className="mt-1.5 text-xs text-gray-500">{t('more', { count: more })}</p> : null}
            </div>
          ) : null}

          <span className="mt-4 inline-flex items-center gap-1 rounded-lg bg-[#3E667D] px-4 py-2 text-sm font-semibold text-white transition-colors group-hover:bg-[#2f5165]">
            {buyOnline ? t('ctaPromo') : t('cta')}
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
