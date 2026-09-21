'use client';

// useStorefront.ts — hooks de React Query de la tienda pública (`/storefront/*`).
//
// Las keys incluyen al VIEWER (`customerId` o 'anon'): el precio depende del rol,
// así que la respuesta anónima del SSR nunca se reutiliza para un distribuidor
// con sesión (ni al revés tras cerrar sesión).
//
// TOKEN VENCIDO (hallazgo M2): `/storefront/*` es público con JWT opcional, así que
// un access token vencido NO da 401: el API cotiza como visitante y el interceptor
// de axios nunca refresca. `useViewerPriceRecovery` lo detecta (sesión de cliente +
// `tier: 'public'` + token local vencido), pide UNA vez el refresh existente y
// vuelve a consultar. Guardas anti-bucle en `lib/storefront/viewer-session`.

import { useEffect, useSyncExternalStore } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { storefrontService } from '@/services/storefront.service';
import { serializeCatalogParams, type CatalogState } from '@/lib/storefront/catalog-params';
import {
  attemptViewerPriceRecovery,
  getServerViewerSessionStatus,
  getViewerSessionStatus,
  subscribeViewerSession,
} from '@/lib/storefront/viewer-session';
import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated, selectUser } from '@/store/slices/authSlice';
import type {
  StorefrontContext,
  StorefrontDetailResponse,
  StorefrontListResponse,
  StorefrontPriceTier,
} from '@/types/storefront';

const ANON = 'anon';
const STALE_MS = 60 * 1000;

export const storefrontKeys = {
  all: ['storefront'] as const,
  lists: () => [...storefrontKeys.all, 'list'] as const,
  list: (ctx: StorefrontContext, state: CatalogState, customerId: string) =>
    [...storefrontKeys.lists(), ctx.country, ctx.lang, serializeCatalogParams(state), customerId] as const,
  detail: (ctx: StorefrontContext, slug: string, customerId: string) =>
    [...storefrontKeys.all, 'detail', ctx.country, ctx.lang, slug, customerId] as const,
  related: (ctx: StorefrontContext, slug: string, customerId: string) =>
    [...storefrontKeys.all, 'related', ctx.country, ctx.lang, slug, customerId] as const,
  // El API cotiza las sugerencias POR VIEWER: sin el viewer en la key, tras iniciar
  // sesión se verían hasta 5 min con precio anónimo (hallazgo L2).
  suggest: (ctx: StorefrontContext, q: string, customerId: string) =>
    [...storefrontKeys.all, 'suggest', ctx.country, ctx.lang, q, customerId] as const,
};

export interface StorefrontViewer {
  /** Identidad para las query keys: `customerId` (o id de usuario) con sesión, 'anon' sin ella. */
  customerId: string;
  hasSession: boolean;
  /** Sesión de CLIENTE (distribuidor/preferente): usuario con `customerId`. El staff no cotiza por rol. */
  hasCustomerSession: boolean;
}

const subscribeNever = () => () => {};

/** `false` en el servidor Y durante la hidratación; `true` después. Sin efectos ni setState. */
function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}

/**
 * Viewer de la tienda. En SSR y DURANTE LA HIDRATACIÓN siempre es anónimo aunque
 * la sesión ya esté en el store: el catálogo se hidrata dentro de un boundary en
 * streaming (loading.tsx) y para entonces la sesión pudo haberse inicializado; sin
 * esta guarda el primer render del cliente no coincidiría con el HTML del servidor.
 */
export function useStorefrontViewer(): StorefrontViewer {
  const hydrated = useHydrated();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  if (hydrated && isAuthenticated && user) {
    return { customerId: user.customerId ?? user.id, hasSession: true, hasCustomerSession: !!user.customerId };
  }
  return { customerId: ANON, hasSession: false, hasCustomerSession: false };
}

/**
 * Si un cliente con sesión recibió precio PÚBLICO y su access token ya venció, pide
 * UNA vez el refresh existente y vuelve a consultar la tienda. `tier` debe venir de
 * una respuesta REAL (ni placeholder ni datos del SSR): pasar `undefined` mientras no.
 * Invitados: no hace nada. Anti-bucle: un intento a la vez y uno por minuto por pestaña.
 */
function useViewerPriceRecovery(tier: StorefrontPriceTier | undefined): void {
  const { hasCustomerSession } = useStorefrontViewer();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!hasCustomerSession || tier !== 'public') return;
    let cancelled = false;
    void attemptViewerPriceRecovery({
      hasCustomerSession,
      tier,
      getAccessToken: () => authService.getAccessToken(),
      refresh: () => authService.refreshToken(),
    }).then((recovered) => {
      // Solo quien inició el intento recibe `true`: una sola invalidación para
      // listado, detalle, relacionados y sugerencias (todas bajo `storefrontKeys.all`).
      if (recovered && !cancelled) void queryClient.invalidateQueries({ queryKey: storefrontKeys.all });
    });
    return () => {
      cancelled = true;
    };
  }, [hasCustomerSession, tier, queryClient]);
}

/**
 * `true` cuando el refresh fue RECHAZADO: la sesión del cliente venció y la tienda
 * le está mostrando precio público. La UI lo avisa con enlace a iniciar sesión.
 */
export function useStorefrontSessionExpired(): boolean {
  const { hasCustomerSession } = useStorefrontViewer();
  const status = useSyncExternalStore(subscribeViewerSession, getViewerSessionStatus, getServerViewerSessionStatus);
  return hasCustomerSession && status === 'expired';
}

export interface InitialStorefrontList {
  data: StorefrontListResponse;
  /** `serializeCatalogParams` del estado con el que el servidor pidió `data`. */
  stateKey: string;
  /** Momento del render en servidor (ms): React Query decide cuándo refrescar. */
  fetchedAt: number;
}

/**
 * Página del catálogo. Anónimo: arranca con los datos del SSR (sin parpadeo ni
 * doble fetch). Con sesión: misma query con otra key, SIN `initialData`; mientras
 * llega el precio por rol se muestra lo anterior (`placeholderData`), sin salto.
 */
export function useStorefrontProducts(
  ctx: StorefrontContext,
  state: CatalogState,
  initial?: InitialStorefrontList,
) {
  const { customerId } = useStorefrontViewer();
  const matchesInitial = !!initial && initial.stateKey === serializeCatalogParams(state);
  const seeded = matchesInitial && customerId === ANON;

  const query = useQuery({
    queryKey: storefrontKeys.list(ctx, state, customerId),
    queryFn: ({ signal }) => storefrontService.list(ctx, state, signal),
    initialData: seeded ? initial.data : undefined,
    initialDataUpdatedAt: seeded ? initial.fetchedAt : undefined,
    placeholderData: (previous) => previous ?? (matchesInitial ? initial.data : undefined),
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
  });
  useViewerPriceRecovery(query.isPlaceholderData || query.isFetching ? undefined : query.data?.viewer.tier);
  return query;
}

export interface InitialStorefrontDetail {
  data: StorefrontDetailResponse;
  fetchedAt: number;
}

/** Detalle por slug: mismo esquema que el listado (SSR anónimo → precio por rol con sesión). */
export function useStorefrontProduct(
  ctx: StorefrontContext,
  slug: string,
  initial?: InitialStorefrontDetail,
) {
  const { customerId } = useStorefrontViewer();
  const seeded = !!initial && customerId === ANON;

  const query = useQuery({
    queryKey: storefrontKeys.detail(ctx, slug, customerId),
    queryFn: ({ signal }) => storefrontService.detail(ctx, slug, signal),
    initialData: seeded ? initial.data : undefined,
    initialDataUpdatedAt: seeded ? initial.fetchedAt : undefined,
    placeholderData: (previous) => previous ?? initial?.data,
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  // El detalle no trae `viewer`: el tier con el que se cotizó es el `priceTier` del producto.
  const detail = query.isPlaceholderData || query.isFetching ? undefined : query.data;
  useViewerPriceRecovery(detail?.status === 'ok' ? detail.product.priceTier : undefined);
  return query;
}

/** Relacionados: diferidos (no bloquean el LCP); `enabled` lo decide quien los pinta. */
export function useStorefrontRelated(ctx: StorefrontContext, slug: string, enabled = true) {
  const { customerId } = useStorefrontViewer();
  return useQuery({
    queryKey: storefrontKeys.related(ctx, slug, customerId),
    queryFn: ({ signal }) => storefrontService.related(ctx, slug, 8, signal),
    enabled: enabled && !!slug,
    staleTime: 5 * STALE_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/** Sugerencias del buscador (`q` ya con debounce). Menos de 2 caracteres = sin petición. */
export function useStorefrontSuggest(ctx: StorefrontContext, q: string, enabled = true) {
  const query = q.trim();
  const { customerId } = useStorefrontViewer();
  return useQuery({
    queryKey: storefrontKeys.suggest(ctx, query.toLowerCase(), customerId),
    queryFn: ({ signal }) => storefrontService.suggest(ctx, query, 6, signal),
    enabled: enabled && query.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 5 * STALE_MS,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
