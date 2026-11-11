// buyer.ts — Quién compra en el checkout de la tienda (lógica PURA, 10-nov-2026).
//
// El resumen (GET /checkout/summary) dice quién compra. A un distribuidor ya no se le
// pide "código de referido": su compra y sus puntos se registran a su propia cuenta y
// la pantalla solo le muestra su número. Al público en general no se le muestra nada.

import type { CheckoutBuyer } from '@/types/cart';

/** Lo único que se lee del resumen (opcional: un API anterior no manda `buyer`). */
export interface BuyerSignal {
  buyer?: Partial<CheckoutBuyer> | null;
}

/**
 * Número de distribuidor a mostrar en "Datos", o `null` si no hay nada que mostrar:
 * quien compra no es distribuidor, el API no mandó el número o aún no hay resumen.
 */
export function buyerDistributorNumber(summary: BuyerSignal | null | undefined): string | null {
  const buyer = summary?.buyer;
  if (!buyer || buyer.isDistributor !== true) return null;
  const raw: unknown = buyer.customerNumber;
  const number = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : '';
  return number ? number : null;
}

/**
 * Datos de contacto con los vacíos rellenados con los de la cuenta del comprador. Nunca
 * pisa lo que el cliente ya tiene escrito.
 */
export function fillContactFromBuyer<T extends { name: string; phone: string }>(
  contact: T,
  buyer: Partial<CheckoutBuyer> | null | undefined,
): T {
  const name = contact.name || (typeof buyer?.name === 'string' ? buyer.name.trim() : '');
  const phone = contact.phone || (typeof buyer?.phone === 'string' ? buyer.phone.trim() : '');
  return name === contact.name && phone === contact.phone ? contact : { ...contact, name, phone };
}
