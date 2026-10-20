// hooks/useStorefrontAccess.ts — Modo de acceso de la tienda en el cliente
// (header, hero, panel del distribuidor): `GET /storefront/access` (público,
// sin cuota en el API). Mientras carga se asume `public` para no esconder nada
// por un parpadeo; el candado real lo ponen el middleware y el API.

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  parseStorefrontAccess,
  PUBLIC_ACCESS,
  type StorefrontAccess,
} from '@/lib/storefront/access';

export const storefrontAccessKey = ['storefront', 'access'] as const;

export function useStorefrontAccess(): StorefrontAccess {
  const { data } = useQuery({
    queryKey: storefrontAccessKey,
    queryFn: async () => {
      const response = await api.get<unknown>('/storefront/access');
      return parseStorefrontAccess(response.data);
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  return data ?? PUBLIC_ACCESS;
}
