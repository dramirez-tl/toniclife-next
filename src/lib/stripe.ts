// stripe.ts - Utilidad para inicializar Stripe en el frontend
// Ref: PLAN_INTEGRACION_STRIPE.md - Fase 1

import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Obtiene la instancia singleton de Stripe.
 * Usa la publishable key de NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY no está configurada');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}
