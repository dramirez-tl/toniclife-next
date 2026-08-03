// coupons.service.ts - Administración de cupones de descuento (admin)
// Backend: /coupons (CRUD + stats). La aplicación al carrito vive en cart.service.
import api from '@/lib/axios';

export type CouponType = 'percentage' | 'fixed_amount' | 'free_shipping';
export type CouponChannel = 'all' | 'pos' | 'ecommerce';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: CouponType;
  discountValue: number;
  currencyCode: string | null;
  minPurchaseAmount: number | null;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usageLimitPerCustomer: number | null;
  usageCount: number;
  customerId: string | null;
  customerNumber: string | null;
  customerName: string | null;
  countryId: string | null;
  countryName: string | null;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  isStackable: boolean;
  /** Canal de canje (mig 108): all | pos | ecommerce. */
  allowedChannel: CouponChannel;
  /** Cupón de descuento para EMPLEADOS (solo mostrador). */
  employeeOnly: boolean;
  /** Sucursales donde aplica (vacío = todas). */
  branches: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface CouponInput {
  code: string;
  description?: string;
  discountType: CouponType;
  discountValue?: number;
  currencyCode?: string;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usageLimitPerCustomer?: number;
  customerNumber?: string;
  countryId?: string;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
  isStackable?: boolean;
  allowedChannel?: CouponChannel;
  employeeOnly?: boolean;
  branchIds?: string[];
}

export interface CouponsQuery {
  search?: string;
  status?: 'active' | 'scheduled' | 'expired' | 'inactive';
  type?: CouponType;
  page?: number;
  limit?: number;
}

export interface CouponsListResponse {
  data: Coupon[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CouponsStats {
  total: number;
  active: number;
  scheduled: number;
  expired: number;
  inactive: number;
  totalUses: number;
  avgPercentage: number | null;
}

class CouponsService {
  async list(query: CouponsQuery = {}): Promise<CouponsListResponse> {
    const params: Record<string, string> = {};
    if (query.search) params.search = query.search;
    if (query.status) params.status = query.status;
    if (query.type) params.type = query.type;
    if (query.page) params.page = String(query.page);
    if (query.limit) params.limit = String(query.limit);
    const { data } = await api.get<CouponsListResponse>('/coupons', { params });
    return data;
  }

  async stats(): Promise<CouponsStats> {
    const { data } = await api.get<CouponsStats>('/coupons/stats');
    return data;
  }

  async create(input: CouponInput): Promise<Coupon> {
    const { data } = await api.post<Coupon>('/coupons', input);
    return data;
  }

  async update(id: string, input: CouponInput): Promise<Coupon> {
    const { data } = await api.patch<Coupon>(`/coupons/${id}`, input);
    return data;
  }

  async remove(id: string): Promise<{ deleted: boolean; deactivated: boolean }> {
    const { data } = await api.delete<{ deleted: boolean; deactivated: boolean }>(
      `/coupons/${id}`,
    );
    return data;
  }
}

export const couponsService = new CouponsService();
