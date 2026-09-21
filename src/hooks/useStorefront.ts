'use client';

// useStorefront.ts — hooks de React Query de la tienda pública (`/storefront/*`).
//
// Las keys incluyen al VIEWER (`customerId` o 'anon'): el precio depende del rol,
// así que la respuesta anónima del SSR nunca se reutiliza para un distribuidor
// con sesión (ni al revés tras cerrar sesión).

import { useSyncExternalStore } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { storefrontService } from '@/services/storefront.service';
import { serializeCatalogParams, type CatalogState } from '@/lib/storefront/catalog-params';
import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated, selectUser } from '@/store/slices/authSlice';
import type {
  StorefrontContext,
  StorefrontDetailResponse,
  StorefrontListResponse,
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
  suggest: (ctx: StorefrontContext, q: string) =>
    [...storefrontKeys.all, 'suggest', ctx.country, ctx.lang, q] as const,
};

export interface StorefrontViewer {
  /** Identidad para las query keys: `customerId` (o id de usuario) con sesión, 'anon' sin ella. */
  customerId: string;
  hasSession: boolean;
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
    return { customerId: user.customerId ?? user.id, hasSession: true };
  }
  return { customerId: ANON, hasSession: false };
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

  return useQuery({
    queryKey: storefrontKeys.list(ctx, state, customerId),
    queryFn: ({ signal }) => storefrontService.list(ctx, state, signal),
    initialData: seeded ? initial.data : undefined,
    initialDataUpdatedAt: seeded ? initial.fetchedAt : undefined,
    placeholderData: (previous) => previous ?? (matchesInitial ? initial.data : undefined),
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
  });
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

  return useQuery({
    queryKey: storefrontKeys.detail(ctx, slug, customerId),
    queryFn: ({ signal }) => storefrontService.detail(ctx, slug, signal),
    initialData: seeded ? initial.data : undefined,
    initialDataUpdatedAt: seeded ? initial.fetchedAt : undefined,
    placeholderData: (previous) => previous ?? initial?.data,
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  });
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
  return useQuery({
    queryKey: storefrontKeys.suggest(ctx, query.toLowerCase()),
    queryFn: ({ signal }) => storefrontService.suggest(ctx, query, 6, signal),
    enabled: enabled && query.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 5 * STALE_MS,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
