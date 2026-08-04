// services/distributorApi.ts - API del Centro de Negocio para distribuidores (axios)

import api from '@/lib/axios';
import type {
  DistributorProfile,
  PeriodPoints,
  RankProgress,
  NetworkSummary,
  SalesSummary,
  CommissionsSummary,
  RecentActivity,
  TopPerformer,
  DashboardStats,
  DashboardResponse,
  Goal,
} from '@/types/distributor';

// ===== Alta de miembro en la red (Ruta A: sponsor paga / Ruta B: invitación) =====

export type KitPayerMode = 'sponsor' | 'invite';

export interface RegisterMemberRequest {
  firstName: string;
  lastName: string;
  mothersLastName?: string;
  email: string;
  phone: string;
  rfc?: string;
  /** País de residencia: define portal, catálogo y precios. Omitido = país del patrocinador. */
  countryId?: string;
  /** Obligatoria en la UI (YYYY-MM-DD). */
  birthDate?: string;
  /** Solo México/Frontera. */
  curp?: string;
  nationality?: string;
  maritalStatus?: string;
  postalCode?: string;
  identificationType?: string;
  /** Nodo bajo el que se coloca (customer_id). Vacío = bajo el propio distribuidor. */
  uplineCustomerId?: string;
  kitProductId?: string;
  payerMode: KitPayerMode;
}

export interface RegisterMemberResult {
  customerId: string;
  customerNumber: string | null;
  fullName: string;
  email: string;
  uplineCustomerId: string;
  payerMode: KitPayerMode;
  kitProductId: string | null;
  /** Ruta B: contraseña temporal para el primer login. */
  tempPassword?: string;
  /** Ruta B: si el correo de invitación salió. */
  invitationSent?: boolean;
  /** Ruta A: orden del kit + URL de Stripe para que el patrocinador pague. */
  kitOrderId?: string | null;
  kitOrderNumber?: string | null;
  paymentUrl?: string | null;
  /** Ruta A: si la generación del pago falló (miembro creado, reintentar). */
  paymentError?: string;
  nextStep: 'sponsor_pays_kit' | 'invitation' | 'none';
}

export interface RegisterPreferredRequest {
  firstName: string;
  lastName: string;
  mothersLastName?: string;
  email: string;
  phone: string;
  rfc?: string;
  /** País de residencia: define portal, catálogo y precios. Omitido = país del patrocinador. */
  countryId?: string;
  birthDate?: string;
}

export interface RegisterPreferredResult {
  customerId: string;
  customerNumber: string | null;
  fullName: string;
  email: string;
  tempPassword: string;
  invitationSent: boolean;
}

export interface PreferredCustomerItem {
  customerId: string;
  customerNumber: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
}

// ===== Onboarding (gating del panel) =====

export interface OnboardingStatus {
  customerId: string;
  status: string;
  kitType: string | null;
  /** true => el miembro debe comprar su kit de inscripción antes de usar el panel. */
  needsKit: boolean;
  /** true => ya pagó el kit pero debe aceptar los términos antes de usar el panel. */
  needsTerms: boolean;
}

// ===== Mis Pedidos =====

export interface MyOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string | null;
  total: number;
  totalPoints: number;
  source: string | null;
  itemsCount: number;
  delivery: 'pickup' | 'shipping';
  pickupBranchName: string | null;
  orderDate: string | null;
  createdAt: string | null;
}

export interface MyOrdersResponse {
  data: MyOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ===== Inscripción (auto-pago del kit) =====

export interface EnrollmentKit {
  productId: string;
  name: string;
  code: string | null;
  kitPosition: string | null;
  imageUrl: string | null;
  price: number;
  points: number;
  businessValue: number;
  currencyCode: string;
}

export interface EnrollmentKitsResponse {
  kits: EnrollmentKit[];
  /** Costo de envío del kit a domicilio (recoger = gratis). */
  shippingCost: number;
}

export interface PickupBranch {
  id: string;
  code: string | null;
  name: string;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

export interface KitShippingAddress {
  street: string;
  extNumber?: string;
  intNumber?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  reference?: string;
}

export interface PaySelfKitRequest {
  kitProductId: string;
  deliveryMode: 'pickup' | 'shipping';
  pickupBranchId?: string;
  shippingAddress?: KitShippingAddress;
}

export interface PaySelfKitResult {
  orderId: string;
  orderNumber: string;
  total: string;
  paymentUrl: string | null;
  shippingAmount: number;
}

// ===== API SERVICE =====

class DistributorApi {
  /**
   * Obtiene el dashboard completo del distribuidor
   * Backend: GET /distributor/dashboard
   */
  async getDashboard(periodId?: string): Promise<DashboardResponse> {
    const { data } = await api.get<DashboardResponse>('/distributor/dashboard', {
      params: periodId ? { periodId } : undefined,
    });
    return data;
  }

  /**
   * Obtiene el perfil del distribuidor
   * Backend: GET /distributor/profile
   */
  async getProfile(): Promise<DistributorProfile> {
    const { data } = await api.get<DistributorProfile>('/distributor/profile');
    return data;
  }

  /**
   * Preferencias del panel (idioma). Backend: GET /distributor/preferences
   */
  async getPreferences(): Promise<{ language: 'es' | 'en' }> {
    const { data } = await api.get<{ language: 'es' | 'en' }>(
      '/distributor/preferences',
    );
    return data;
  }

  /**
   * Actualiza el idioma preferido. Backend: PATCH /distributor/preferences
   */
  async updatePreferences(language: 'es' | 'en'): Promise<{ language: 'es' | 'en' }> {
    const { data } = await api.patch<{ language: 'es' | 'en' }>(
      '/distributor/preferences',
      { language },
    );
    return data;
  }

  /**
   * Obtiene los puntos del periodo actual
   * Backend: GET /distributor/points
   */
  async getPeriodPoints(): Promise<PeriodPoints> {
    const { data } = await api.get<PeriodPoints>('/distributor/points');
    return data;
  }

  /**
   * Obtiene el progreso de rango
   * Backend: GET /distributor/rank-progress
   */
  async getRankProgress(): Promise<RankProgress> {
    const { data } = await api.get<RankProgress>('/distributor/rank-progress');
    return data;
  }

  /**
   * Obtiene el resumen de la red
   * Backend: GET /distributor/network-summary
   */
  async getNetworkSummary(): Promise<NetworkSummary> {
    const { data } = await api.get<NetworkSummary>('/distributor/network-summary');
    return data;
  }

  /**
   * Obtiene la actividad reciente
   * Backend: GET /distributor/activity
   */
  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    const { data } = await api.get<RecentActivity[]>('/distributor/activity', {
      params: { limit: limit.toString() },
    });
    return data;
  }

  /**
   * Obtiene los top performers de la red
   * TODO: Endpoint not implemented in backend
   */
  async getTopPerformers(limit: number = 5): Promise<TopPerformer[]> {
    const { data } = await api.get<TopPerformer[]>('/distributor/top-performers', {
      params: { limit: limit.toString() },
    });
    return data;
  }

  /**
   * Obtiene las metas del distribuidor
   * Backend: GET /distributor/goals
   */
  async getGoals(): Promise<Goal[]> {
    const { data } = await api.get<Goal[]>('/distributor/goals');
    return data;
  }

  /**
   * Genera enlace de referido
   * TODO: Endpoint not implemented in backend
   */
  async generateReferralLink(): Promise<{ link: string; qrCodeUrl: string }> {
    const { data } = await api.post<{ link: string; qrCodeUrl: string }>('/distributor/referral-link');
    return data;
  }

  /**
   * Da de alta un nuevo miembro en la red (status pending).
   * Backend: POST /distributor/network/members
   */
  async registerMember(
    dto: RegisterMemberRequest,
  ): Promise<RegisterMemberResult> {
    const { data } = await api.post<RegisterMemberResult>(
      '/distributor/network/members',
      dto,
    );
    return data;
  }

  // ===== Clientes preferentes =====

  /**
   * Da de alta un cliente preferente (sin kit, status active, precio preferente).
   * Backend: POST /distributor/preferred-customers
   */
  async registerPreferred(
    dto: RegisterPreferredRequest,
  ): Promise<RegisterPreferredResult> {
    const { data } = await api.post<RegisterPreferredResult>(
      '/distributor/preferred-customers',
      dto,
    );
    return data;
  }

  /**
   * Lista los clientes preferentes del distribuidor autenticado.
   * Backend: GET /distributor/preferred-customers
   */
  async getPreferredCustomers(): Promise<PreferredCustomerItem[]> {
    const { data } = await api.get<PreferredCustomerItem[]>(
      '/distributor/preferred-customers',
    );
    return data;
  }

  // ===== Payment Data =====

  async getPaymentData(): Promise<import('@/types/payment-data').PaymentDataResponse> {
    const { data } = await api.get('/distributor/payment-data');
    return data;
  }

  async updatePaymentData(formData: FormData): Promise<import('@/types/payment-data').PaymentDataResponse> {
    const { data } = await api.post('/distributor/payment-data', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async getCommissionPayments(
    filters?: import('@/types/payment-data').CommissionPaymentFilters,
  ): Promise<import('@/types/payment-data').CommissionPaymentsResponse> {
    const { data } = await api.get('/distributor/commission-payments', { params: filters });
    return data;
  }

  // ===== Onboarding & Mis Pedidos =====

  /**
   * Estado de onboarding del distribuidor (gating del panel).
   * Backend: GET /distributor/onboarding-status
   */
  async getOnboardingStatus(): Promise<OnboardingStatus> {
    const { data } = await api.get<OnboardingStatus>('/distributor/onboarding-status');
    return data;
  }

  /**
   * Pedidos del distribuidor autenticado (paginado).
   * Backend: GET /distributor/orders
   */
  async getMyOrders(params?: { page?: number; limit?: number }): Promise<MyOrdersResponse> {
    const { data } = await api.get<MyOrdersResponse>('/distributor/orders', { params });
    return data;
  }

  // ===== Inscripción (auto-pago del kit) =====

  /** Kits de inscripción disponibles + costo de envío del kit (config). */
  async getEnrollmentKits(): Promise<EnrollmentKitsResponse> {
    const { data } = await api.get<EnrollmentKitsResponse>(
      '/distributor/enrollment/kits',
    );
    return data;
  }

  /** Sucursales para recoger el kit. */
  async getPickupBranches(): Promise<PickupBranch[]> {
    const { data } = await api.get<PickupBranch[]>(
      '/distributor/enrollment/pickup-branches',
    );
    return data;
  }

  /** Inicia el pago del kit (recoger/envío) y devuelve la URL de Stripe. */
  async paySelfKit(dto: PaySelfKitRequest): Promise<PaySelfKitResult> {
    const { data } = await api.post<PaySelfKitResult>(
      '/distributor/enrollment/pay-kit',
      dto,
    );
    return data;
  }

  /** Registra la aceptación de términos del miembro (paso post-kit). */
  async acceptTerms(): Promise<{ accepted: true; acceptedAt: string }> {
    const { data } = await api.post<{ accepted: true; acceptedAt: string }>(
      '/distributor/terms/accept',
    );
    return data;
  }
}

export const distributorApi = new DistributorApi();
