import api from '@/lib/axios';

export interface SharedCartItemInput {
  productId: string;
  quantity: number;
}

export interface CreateSharedCartInput {
  items: SharedCartItemInput[];
  note?: string;
}

export interface SharedCartListItem {
  token: string;
  status: string;
  note: string | null;
  currencyCode: string | null;
  expiresAt: string | null;
  createdAt: string;
  orderNumber: string | null;
  orderStatus: string | null;
  itemCount: number;
  subtotal: number;
}

export interface SharedCartViewItem {
  productId: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SharedCartView {
  token: string;
  status: string;
  note: string | null;
  currencyCode: string | null;
  distributorName: string;
  distributorCode: string | null;
  expiresAt: string | null;
  isExpired: boolean;
  items: SharedCartViewItem[];
  subtotal: number;
  orderNumber?: string | null;
  orderStatus?: string | null;
}

export type SharedCartDeliveryMethod = 'pickup' | 'delivery';

export interface SharedCartCheckoutInput {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  deliveryMethod: SharedCartDeliveryMethod;
  pickupBranchId?: string;
  address?: {
    street: string;
    exteriorNumber?: string;
    interiorNumber?: string;
    neighborhood?: string;
    city: string;
    state: string;
    postalCode: string;
    references?: string;
  };
}

class SharedCartService {
  // ===== Distribuidor (autenticado) =====
  async create(
    dto: CreateSharedCartInput,
  ): Promise<{ token: string; expiresAt: string | null }> {
    const { data } = await api.post('/distributor/shared-carts', dto);
    return data;
  }

  async list(): Promise<SharedCartListItem[]> {
    const { data } = await api.get('/distributor/shared-carts');
    return data;
  }

  async cancel(token: string): Promise<void> {
    await api.delete(`/distributor/shared-carts/${token}`);
  }

  // ===== Cliente (público, por token) =====
  async getByToken(token: string): Promise<SharedCartView> {
    const { data } = await api.get(`/shared-carts/${token}`);
    return data;
  }

  async checkout(
    token: string,
    dto: SharedCartCheckoutInput,
  ): Promise<{ paymentUrl?: string; orderNumber: string; orderId: string }> {
    const { data } = await api.post(`/shared-carts/${token}/checkout`, dto);
    return data;
  }
}

export const sharedCartService = new SharedCartService();
