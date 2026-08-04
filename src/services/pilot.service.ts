// pilot.service.ts - Gating del piloto del panel de distribuidor (mig 110).
// Admin (/admin/pilot, super_admin): liberar features por distribuidor y el
// switch global de compras. Consumo: panel (/distributor/pilot-features) y
// tienda (/config/pilot-public, sin auth).
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

export interface PilotCheckoutState {
  checkoutEnabled: boolean;
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
