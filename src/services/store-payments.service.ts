// store-payments.service.ts — Con qué puede cobrar la tienda en línea, visto desde el admin.
//
// `GET /checkout/stripe-config` (público) dice qué cuentas de Stripe tienen sus llaves
// en el servidor: `accounts.mx.enabled` (México y Frontera) y `accounts.us.enabled`
// (Estados Unidos). Las llaves las administra Sistemas en el servidor: aquí solo se lee.

import api from '@/lib/axios';
import { stripeAccountsState, type StripeAccountsState } from '@/lib/store-country/countries';

class StorePaymentsService {
  async getStripeAccounts(): Promise<StripeAccountsState> {
    const response = await api.get<unknown>('/checkout/stripe-config');
    const state = stripeAccountsState(response.data);
    if (!state) throw new Error('El servidor no dijo qué cuentas de Stripe están conectadas.');
    return state;
  }
}

export const storePaymentsService = new StorePaymentsService();
