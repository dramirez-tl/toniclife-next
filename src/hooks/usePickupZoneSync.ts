'use client';

// usePickupZoneSync — Mantiene el carrito cotizado con la lista que le toca según dónde se
// recibe el pedido (16-nov-2026): "para recoger pagas la lista de la zona donde recoges,
// igual que en su caja". Cuando el comprador elige una sucursal de OTRA zona de precios
// (cuenta de México que recoge en Frontera, o al revés) se le pide al API que re-cotice el
// carrito con esa lista; al volver a su zona o a envío a domicilio, con la de siempre.
//
// Qué hay que pedir lo decide `pickupZoneSyncFor` (lib/checkout/pickup-branches); aquí solo
// se hace la llamada UNA vez por cambio, se refrescan carrito y resumen, y se guarda el total
// de antes y el de ahora para mostrárselo. Los importes los calcula siempre el API.

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartService } from '@/services/cart.service';
import { pickupZoneSyncFor, type PickupZoneSync } from '@/lib/checkout/pickup-branches';
import { cartKeys } from '@/lib/storefront/cart-query-keys';
import type { Cart, PickupBranch, PickupZoneResult } from '@/types/cart';

interface Options {
  /** Con sesión, con el carrito cargado y sin un pedido ya creado. */
  enabled: boolean;
  /** País de la tienda (locale). */
  countryId: string | undefined;
  cart: Pick<Cart, 'pickupZone'> | null | undefined;
  deliveryMode: 'delivery' | 'pickup';
  selectedBranch: PickupBranch | undefined;
  /** El API no pudo re-cotizar (p. ej. un producto no se vende en esa zona). */
  onError: (error: unknown, sync: PickupZoneSync) => void;
}

export interface PickupZoneSyncState {
  /** Se está re-cotizando, o falta hacerlo: todavía no se puede pagar. */
  syncing: boolean;
  /** Último cambio de lista que hizo el API en esta visita (total de antes y de ahora). */
  lastChange: PickupZoneResult | null;
}

const keyOf = (sync: PickupZoneSync, quotedZoneId: string | null): string =>
  `${sync.pickupBranchId ?? '-'}|${sync.zoneId ?? '-'}|${quotedZoneId ?? '-'}`;

export function usePickupZoneSync(options: Options): PickupZoneSyncState {
  const { enabled, countryId, cart, deliveryMode, selectedBranch, onError } = options;
  const queryClient = useQueryClient();
  const [lastChange, setLastChange] = useState<PickupZoneResult | null>(null);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const { mutate, isPending, variables } = useMutation({
    // `key` viaja con la petición: así se sabe qué combinación ya se intentó (bien o mal) y
    // se hace UNA sola llamada por cambio, nunca un bucle.
    mutationFn: (request: PickupZoneSync & { key: string }) =>
      cartService.setPickupZone(countryId, request.pickupBranchId),
    onSuccess: async (result) => {
      if (result.changed) setLastChange(result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cartKeys.cart() }),
        queryClient.invalidateQueries({ queryKey: cartKeys.summary() }),
        queryClient.invalidateQueries({ queryKey: cartKeys.checkoutSummary() }),
      ]);
    },
  });

  const quotedZoneId = cart?.pickupZone?.countryId ?? null;
  const sync = enabled && cart ? pickupZoneSyncFor({ deliveryMode, selectedBranch, quotedZoneId }) : null;
  const key = sync ? keyOf(sync, quotedZoneId) : null;
  const pickupBranchId = sync?.pickupBranchId ?? null;
  const zoneId = sync?.zoneId ?? null;

  const attempted = variables?.key ?? null;

  useEffect(() => {
    if (!key || isPending || attempted === key) return;
    const request: PickupZoneSync = { pickupBranchId, zoneId };
    mutate({ ...request, key }, { onError: (error) => onErrorRef.current(error, request) });
  }, [key, isPending, attempted, pickupBranchId, zoneId, mutate]);

  return {
    // La llamada sigue "pendiente" hasta que el carrito y el resumen se volvieron a pedir
    // (onSuccess los espera): al terminar ya se ven los importes nuevos.
    syncing: isPending || (!!key && attempted !== key),
    lastChange,
  };
}
