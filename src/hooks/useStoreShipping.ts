'use client';

// Envío REAL del país para la barra "Te faltan $X para envío gratis" (contrato 7.3).
//
// FUENTE: los costos configurables de `/admin/configuracion` (system_settings
// 'shipping', por país). Su endpoint propio (`GET /config/shipping-settings`) es solo
// de admin; la ÚNICA salida pública hoy es el bloque `shipping` del detalle de la
// tienda (`GET /storefront/products/:slug?country=XX`, mismo `getShippingSettings`
// que cobra el checkout). Por eso se lee de ahí: primero de un detalle que ya esté
// en caché y, si no hay, del detalle de una línea del carrito (una sola petición por
// país y viewer, 10 min). Sin dato (CO/GT, carrito sin slugs, error) = `null` y la
// barra NO se pinta: nunca hay umbrales quemados.
//
// El mismo detalle trae el `priceTier` del viewer: a un distribuidor el checkout le
// cobra SIEMPRE el envío estándar (`checkout.service`, `alwaysChargeStandard`), así
// que para él `eligible = false` y no se le promete envío gratis.

import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { storefrontKeys, useStorefrontViewer } from '@/hooks/useStorefront';
import { storefrontService } from '@/services/storefront.service';
import type { LanguageCode } from '@/i18n/config';
import type { StoreShippingInfo } from '@/lib/storefront/cart-logic';
import type { StorefrontDetailResponse } from '@/types/storefront';

export interface StoreShippingState {
  shipping: StoreShippingInfo;
  /** `false` = el checkout nunca le da envío gratis por monto (distribuidor). */
  eligible: boolean;
}

const STALE_MS = 10 * 60 * 1000;
const MAX_SLUG_ATTEMPTS = 2;

function fromDetail(detail: StorefrontDetailResponse | undefined): StoreShippingState | null {
  if (!detail || detail.status !== 'ok') return null;
  const { shipping, priceTier } = detail.product;
  if (shipping.freeThreshold === null) return null;
  return {
    shipping: { freeThreshold: shipping.freeThreshold, currencyCode: shipping.currencyCode },
    eligible: priceTier !== 'distributor',
  };
}

/** Detalle ya cargado para este país y ESTE viewer (la key termina en el `customerId`). */
function fromCache(queryClient: QueryClient, country: string, customerId: string): StoreShippingState | null {
  const cached = queryClient.getQueriesData<StorefrontDetailResponse>({
    queryKey: [...storefrontKeys.all, 'detail', country],
  });
  for (const [key, data] of cached) {
    if (key[key.length - 1] !== customerId) continue;
    const state = fromDetail(data);
    if (state) return state;
  }
  return null;
}

export function useStoreShipping(country: string, lang: LanguageCode, slugs: readonly string[]) {
  const queryClient = useQueryClient();
  const { customerId } = useStorefrontViewer();
  const candidates = slugs.slice(0, MAX_SLUG_ATTEMPTS);

  return useQuery({
    queryKey: [...storefrontKeys.all, 'shipping', country, customerId],
    queryFn: async ({ signal }): Promise<StoreShippingState | null> => {
      const cached = fromCache(queryClient, country, customerId);
      if (cached) return cached;
      for (const slug of candidates) {
        try {
          const state = fromDetail(await storefrontService.detail({ country, lang }, slug, signal));
          if (state) return state;
        } catch {
          // Producto retirado o API caído: se prueba el siguiente; sin dato no hay barra.
        }
      }
      return null;
    },
    // Sin slugs solo sirve si ya hay un detalle en caché; con carrito vacío no hay barra que pintar.
    enabled: candidates.length > 0,
    // Un "sin dato" se reintenta pronto (p. ej. la única línea era de un producto retirado).
    staleTime: (query) => (query.state.data ? STALE_MS : 30 * 1000),
    gcTime: 2 * STALE_MS,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
