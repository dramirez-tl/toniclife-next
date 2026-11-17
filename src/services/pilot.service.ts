// pilot.service.ts - Gating del piloto del panel de distribuidor (mig 110).
// Admin (/admin/pilot, super_admin): liberar features por distribuidor, el
// switch global de compras y el pago en OXXO de la tienda de México. Consumo:
// panel (/distributor/pilot-features) y tienda (/config/pilot-public, sin auth).
import api from '@/lib/axios';

export type PilotFeature =
  | 'share_cart'
  | 'public_registration'
  | 'register_member';

export interface DistributorPilotFeatures {
  shareCart: boolean;
  publicRegistration: boolean;
  registerMember: boolean;
}

export interface PilotDistributorRow {
  customerId: string;
  customerNumber: string;
  name: string;
  status: string;
  customerType?: string;
  features: DistributorPilotFeatures;
}

/**
 * Pago en efectivo en OXXO en la tienda de México (12-nov-2026). Se lee siempre con
 * `readOxxoConfig` (lib/checkout/payment-options): un API anterior no manda el bloque.
 */
export interface PilotOxxoState {
  enabled: boolean;
  /** Vigencia de la ficha en días naturales (1–7): vence a las 23:59, hora del centro de México. */
  expiresAfterDays: number;
  /** Límites de Stripe por pedido, en pesos. */
  minAmount: number;
  maxAmount: number;
}

export interface PilotCheckoutState {
  checkoutEnabled: boolean;
  /** Ausente = el API aún no conoce OXXO: no se ofrece. */
  oxxo?: PilotOxxoState;
  /**
   * Comprar para otro distribuidor (15-nov-2026): un distribuidor paga un pedido que se
   * registra, con sus puntos, a nombre de otro. Ausente = el API aún no lo conoce.
   */
  buyForOther?: { enabled: boolean };
  /**
   * Facturar desde la cuenta (17-nov-2026): el distribuidor factura en su portal sus
   * compras de la tienda del mes en curso. Ausente = el API aún no lo conoce.
   */
  selfInvoicing?: { enabled: boolean };
}

/** Lo que se puede cambiar de OXXO desde el admin (PATCH /admin/pilot/oxxo). */
export interface PilotOxxoPatch {
  enabled?: boolean;
  /** Entero de 1 a 7. */
  expiresAfterDays?: number;
}

class PilotService {
  // ===== Admin (super_admin) =====

  async listDistributors(): Promise<PilotDistributorRow[]> {
    const { data } = await api.get<PilotDistributorRow[]>(
      '/admin/pilot/distributors',
    );
    return data;
  }

  async searchDistributor(number: string): Promise<PilotDistributorRow> {
    const { data } = await api.get<PilotDistributorRow>(
      '/admin/pilot/distributors/search',
      { params: { number } },
    );
    return data;
  }

  async setFeature(
    customerId: string,
    feature: PilotFeature,
    enabled: boolean,
  ): Promise<{ customerId: string; features: DistributorPilotFeatures }> {
    const { data } = await api.patch(
      `/admin/pilot/distributors/${customerId}/features`,
      { feature, enabled },
    );
    return data;
  }

  async getCheckout(): Promise<PilotCheckoutState> {
    const { data } = await api.get<PilotCheckoutState>('/admin/pilot/checkout');
    return data;
  }

  async setCheckout(enabled: boolean): Promise<PilotCheckoutState> {
    const { data } = await api.patch<PilotCheckoutState>(
      '/admin/pilot/checkout',
      { enabled },
    );
    return data;
  }

  /** Enciende o apaga OXXO, o cambia la vigencia de la ficha. Responde el estado completo. */
  async setOxxo(patch: PilotOxxoPatch): Promise<PilotCheckoutState> {
    const { data } = await api.patch<PilotCheckoutState>(
      '/admin/pilot/oxxo',
      patch,
    );
    return data;
  }

  /** Enciende o apaga "comprar para otro distribuidor" en la tienda. Responde el estado completo. */
  async setBuyForOther(enabled: boolean): Promise<PilotCheckoutState> {
    const { data } = await api.patch<PilotCheckoutState>(
      '/admin/pilot/buy-for-other',
      { enabled },
    );
    return data;
  }

  /** Enciende o apaga "facturar desde mi cuenta" en el portal. Responde el estado completo. */
  async setSelfInvoicing(enabled: boolean): Promise<PilotCheckoutState> {
    const { data } = await api.patch<PilotCheckoutState>(
      '/admin/pilot/self-invoicing',
      { enabled },
    );
    return data;
  }

  // ===== Panel del distribuidor =====

  async getMyFeatures(): Promise<DistributorPilotFeatures> {
    const { data } = await api.get<DistributorPilotFeatures>(
      '/distributor/pilot-features',
    );
    return data;
  }

  // ===== Tienda (público) =====

  async getPublicState(): Promise<PilotCheckoutState> {
    const { data } = await api.get<PilotCheckoutState>('/config/pilot-public');
    return data;
  }
}

export const pilotService = new PilotService();
