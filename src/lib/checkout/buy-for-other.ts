// buy-for-other.ts — COMPRAR PARA OTRO DISTRIBUIDOR en el checkout (lógica PURA, 15-nov-2026).
//
// Un distribuidor puede pagar un pedido que se registra, con sus puntos, a nombre de OTRO
// distribuidor. En "Datos" escribe el número, la tienda le muestra a quién corresponde
// (GET /checkout/beneficiary/:number) y, al pagar, el número viaja en `forCustomerNumber`.
// El servidor decide todo: si se ofrece (resumen: `buyForOther.available`), a quién se le
// puede registrar la compra y, al cobrar, lo vuelve a revisar. Aquí solo va lo que la
// pantalla necesita para no adivinar.

import { catalogErrorCode, catalogErrorDetails, catalogErrorStatus } from '@/lib/storefront/errors';
import type { AuthenticatedCheckoutInput, CheckoutBeneficiary } from '@/types/cart';

/** Lo único que se lee del resumen (un API anterior no manda `buyForOther`). */
export interface BuyForOtherSignal {
  buyer?: { isDistributor?: boolean | null } | null;
  buyForOther?: { available?: boolean | null } | null;
}

/** ¿La tienda puede ofrecer "comprar para otro distribuidor" en esta compra? */
export function canBuyForOther(summary: BuyForOtherSignal | null | undefined): boolean {
  return summary?.buyer?.isDistributor === true && summary?.buyForOther?.available === true;
}

const MAX_DIGITS = 12;

/** Lo que la persona teclea ("#1771306", "1 771 306") → solo dígitos. */
export function distributorNumberInput(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\D/g, '').slice(0, MAX_DIGITS);
}

/** Por qué todavía no se puede buscar ese número: vacío, o es el de quien compra. */
export function numberProblem(
  input: string | null | undefined,
  ownNumber: string | null | undefined,
): 'empty' | 'own' | null {
  const digits = distributorNumberInput(input).replace(/^0+/, '');
  if (!digits) return 'empty';
  return digits === distributorNumberInput(ownNumber) ? 'own' : null;
}

/** Clave del texto (checkout.buyForOther.errors.*) para lo que contestó el API. */
export type BeneficiaryErrorKey =
  | 'notFound'
  | 'self'
  | 'inactive'
  | 'noKit'
  | 'otherCountry'
  | 'otherPriceList'
  | 'otherStore'
  | 'disabled'
  | 'buyerNotEligible'
  | 'kitInCart'
  | 'tooMany'
  | 'generic';

const BENEFICIARY_REASONS: Record<string, BeneficiaryErrorKey> = {
  not_found: 'notFound',
  self: 'self',
  inactive: 'inactive',
  no_kit: 'noKit',
  other_country: 'otherCountry',
  other_price_list: 'otherPriceList',
  other_store: 'otherStore',
};

const UNAVAILABLE_REASONS: Record<string, BeneficiaryErrorKey> = {
  disabled: 'disabled',
  migration_pending: 'disabled',
  buyer_not_eligible: 'buyerNotEligible',
  kit_in_cart: 'kitInCart',
};

export const CHK_BENEFICIARY_NOT_ELIGIBLE = 'CHK_BENEFICIARY_NOT_ELIGIBLE';
export const CHK_BUY_FOR_OTHER_UNAVAILABLE = 'CHK_BUY_FOR_OTHER_UNAVAILABLE';

/** ¿El API rechazó la búsqueda o el pedido por el distribuidor beneficiario? */
export function isBeneficiaryRejection(err: unknown): boolean {
  const code = catalogErrorCode(err);
  return code === CHK_BENEFICIARY_NOT_ELIGIBLE || code === CHK_BUY_FOR_OTHER_UNAVAILABLE;
}

/** Qué decirle a la persona cuando el API no acepta el número. */
export function beneficiaryErrorKey(err: unknown): BeneficiaryErrorKey {
  if (catalogErrorStatus(err) === 429) return 'tooMany';
  const code = catalogErrorCode(err);
  const reason = catalogErrorDetails(err).reason;
  const key = typeof reason === 'string' ? reason : '';
  if (code === CHK_BENEFICIARY_NOT_ELIGIBLE) return BENEFICIARY_REASONS[key] ?? 'notFound';
  if (code === CHK_BUY_FOR_OTHER_UNAVAILABLE) return UNAVAILABLE_REASONS[key] ?? 'disabled';
  return 'generic';
}

/** "#1771306 ANA PEREZ LOPEZ" (con lo que haya). */
export function beneficiaryLabel(
  beneficiary: { customerNumber?: string | null; name?: string | null } | null | undefined,
): string {
  const number = distributorNumberInput(beneficiary?.customerNumber);
  const name = (beneficiary?.name ?? '').trim();
  return [number ? `#${number}` : '', name].filter(Boolean).join(' ');
}

/**
 * Lo que viaja al pagar. Sin beneficiario: nada (la compra es para la cuenta en sesión, como
 * siempre). Con beneficiario: su número y, si el pedido es para RECOGER, quién pasa por él
 * (por omisión quien paga; el servidor usa los datos de su ficha si van vacíos).
 */
export function beneficiaryPayload(
  beneficiary: CheckoutBeneficiary | null | undefined,
  pickup: { isPickup: boolean; name?: string | null; phone?: string | null },
): Pick<AuthenticatedCheckoutInput, 'forCustomerNumber' | 'recipientName' | 'recipientPhone'> {
  const number = distributorNumberInput(beneficiary?.customerNumber);
  if (!number) return {};
  if (!pickup.isPickup) return { forCustomerNumber: number };
  const name = (pickup.name ?? '').replace(/\s+/g, ' ').trim();
  const phone = (pickup.phone ?? '').trim();
  return {
    forCustomerNumber: number,
    ...(name ? { recipientName: name } : {}),
    ...(phone ? { recipientPhone: phone } : {}),
  };
}
