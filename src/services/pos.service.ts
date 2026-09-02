// POS Service - Frontend API client for POS module
// Ref: toniclife-api/src/modules/pos/

import api from '@/lib/axios';
import type { PilotLiveResponse } from '@/types/pilotLive';
import type {
  // Cash Register
  CashRegister,
  CreateCashRegisterInput,
  UpdateCashRegisterInput,
  CashRegisterQueryParams,
  CashRegisterListResponse,
  // Session
  Session,
  ActiveSession,
  OpenSessionInput,
  SessionQueryParams,
  SessionListResponse,
  // Sale
  Sale,
  CreateSaleInput,
  CancelSaleInput,
  SaleQueryParams,
  SaleListResponse,
  SalesStatsResponse,
  DailySalesSummary,
  // Payment
  ProcessPaymentInput,
  PaymentResult,
  // Movement
  CashMovement,
  CreateCashMovementInput,
  CashMovementQueryParams,
  CashMovementListResponse,
  CashBalance,
  // Quick Product
  QuickProduct,
} from '@/types/pos';

class PosService {
  // ================================
  // CASH REGISTERS
  // ================================

  /**
   * Create a new cash register
   */
  async createRegister(data: CreateCashRegisterInput): Promise<CashRegister> {
    const response = await api.post<CashRegister>('/pos/registers', data);
    return response.data;
  }

  /**
   * Get list of cash registers
   */
  async getRegisters(params?: CashRegisterQueryParams): Promise<CashRegisterListResponse> {
    const response = await api.get<CashRegisterListResponse>('/pos/registers', { params });
    return response.data;
  }

  /**
   * Get available registers (uso interno: ensureSession auto-abre la primera
   * disponible al cobrar, no se expone como UI de seleccion).
   */
  async getAvailableRegisters(branchId?: string): Promise<CashRegister[]> {
    const response = await api.get<CashRegister[]>('/pos/registers/available', {
      params: branchId ? { branchId } : undefined,
    });
    return response.data;
  }

  /**
   * Get register by ID
   */
  async getRegisterById(id: string): Promise<CashRegister> {
    const response = await api.get<CashRegister>(`/pos/registers/${id}`);
    return response.data;
  }

  /**
   * Update a cash register
   */
  async updateRegister(id: string, data: UpdateCashRegisterInput): Promise<CashRegister> {
    const response = await api.patch<CashRegister>(`/pos/registers/${id}`, data);
    return response.data;
  }

  // ================================
  // SESSIONS
  // ================================
  // Nota: NO hay UI de apertura manual. El metodo openSession existe solo
  // para que ensureSession() (auto-open al primer cobro) pueda crear una
  // sesion con monto $0 cuando no hay activa. Ver Electron PosScreen y
  // Next admin/pos/page.tsx.

  /**
   * Open a session — uso interno por ensureSession. Monto $0, notas
   * autogeneradas. NO exponer en UI.
   */
  async openSession(data: OpenSessionInput): Promise<Session> {
    const response = await api.post<Session>('/pos/sessions/open', data);
    return response.data;
  }

  /**
   * Get list of sessions
   */
  async getSessions(params?: SessionQueryParams): Promise<SessionListResponse> {
    const response = await api.get<SessionListResponse>('/pos/sessions', { params });
    return response.data;
  }

  /**
   * Get current user's active session
   */
  async getActiveSession(branchId?: string): Promise<ActiveSession | null> {
    const response = await api.get<ActiveSession | null>('/pos/sessions/active', {
      params: branchId ? { branchId } : undefined,
    });
    return response.data;
  }

  /**
   * Get session by ID
   */
  async getSessionById(id: string): Promise<Session> {
    const response = await api.get<Session>(`/pos/sessions/${id}`);
    return response.data;
  }

  // ================================
  // SALES
  // ================================

  /**
   * Create a new sale
   */
  async createSale(data: CreateSaleInput): Promise<Sale> {
    const response = await api.post<Sale>('/pos/sales', data);
    return response.data;
  }

  /**
   * Process payment for a sale
   */
  async processPayment(data: ProcessPaymentInput): Promise<PaymentResult> {
    const response = await api.post<PaymentResult>('/pos/sales/pay', data);
    return response.data;
  }

  /**
   * Get list of sales
   */
  async getSales(params?: SaleQueryParams): Promise<SaleListResponse> {
    const response = await api.get<SaleListResponse>('/pos/sales', { params });
    return response.data;
  }

  /**
   * Totales agregados server-side por moneda y estado con los mismos filtros
   * del listado (dictamen 3.3.1: sin tope de 5000 filas ni sumas en cliente).
   */
  async getSalesStats(params?: SaleQueryParams): Promise<SalesStatsResponse> {
    const response = await api.get<SalesStatsResponse>('/pos/sales/stats', {
      params,
    });
    return response.data;
  }

  /**
   * Get daily sales summary
   */
  async getDailySummary(branchId: string, date?: string): Promise<DailySalesSummary> {
    const response = await api.get<DailySalesSummary>(`/pos/sales/summary/${branchId}`, {
      params: date ? { date } : undefined,
    });
    return response.data;
  }

  /**
   * Get sale by ID
   */
  async getSaleById(id: string): Promise<Sale> {
    const response = await api.get<Sale>(`/pos/sales/${id}`);
    return response.data;
  }

  /**
   * Cancel a sale
   */
  async cancelSale(id: string, data: CancelSaleInput): Promise<Sale> {
    const response = await api.patch<Sale>(`/pos/sales/${id}/cancel`, data);
    return response.data;
  }

  /**
   * Stamp (timbrar) a sale invoice
   */
  async stampSale(id: string, paymentMethod?: string): Promise<Sale> {
    const response = await api.post<Sale>(`/pos/sales/${id}/stamp`, paymentMethod ? { paymentMethod } : {});
    return response.data;
  }

  /**
   * Get the invoice PDF URL for a stamped sale (opens as blob URL)
   */
  async getInvoicePdfUrl(id: string): Promise<string> {
    const response = await api.get(`/pos/sales/${id}/invoice-pdf`, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  }

  /**
   * Update the payment method of a sale (admin/super_admin only)
   */
  async updateSalePaymentMethod(id: string, paymentMethod: string): Promise<Sale> {
    const response = await api.patch<Sale>(`/pos/sales/${id}/payment-method`, { paymentMethod });
    return response.data;
  }

  // ================================
  // CASH MOVEMENTS
  // ================================

  /**
   * Create a cash movement (deposit/withdrawal)
   */
  async createMovement(data: CreateCashMovementInput): Promise<CashMovement> {
    const response = await api.post<CashMovement>('/pos/movements', data);
    return response.data;
  }

  /**
   * Get list of cash movements
   */
  async getMovements(params?: CashMovementQueryParams): Promise<CashMovementListResponse> {
    const response = await api.get<CashMovementListResponse>('/pos/movements', { params });
    return response.data;
  }

  /**
   * Get current balance for a session
   */
  async getBalance(sessionId: string): Promise<CashBalance> {
    const response = await api.get<CashBalance>(`/pos/movements/balance/${sessionId}`);
    return response.data;
  }

  /**
   * Get movement by ID
   */
  async getMovementById(id: string): Promise<CashMovement> {
    const response = await api.get<CashMovement>(`/pos/movements/${id}`);
    return response.data;
  }

  /**
   * Approve a withdrawal
   */
  async approveWithdrawal(id: string, notes?: string): Promise<CashMovement> {
    const response = await api.patch<CashMovement>(`/pos/movements/${id}/approve`, {
      notes,
    });
    return response.data;
  }

  /**
   * Reject a withdrawal
   */
  async rejectWithdrawal(id: string): Promise<void> {
    await api.delete(`/pos/movements/${id}`);
  }

  // ================================
  // QUICK PRODUCT SEARCH
  // ================================

  /**
   * Search products for POS (quick search by SKU or name)
   */
  async searchProducts(query: string, limit = 10, branchId?: string, priceTypeId?: string, countryId?: string, sku?: string): Promise<QuickProduct[]> {
    // Use the existing products endpoint with search
    const response = await api.get('/products', {
      params: {
        search: sku ? undefined : (query || undefined),
        sku: sku || undefined,
        isActive: true,
        availableInPos: true,
        limit,
        ...(branchId && { branchId }),
        ...(priceTypeId && { priceTypeId }),
        ...(countryId && { countryId }),
      },
    });
    // Map to QuickProduct format (API returns code, price, not sku/basePrice)
    return response.data.data?.map((p: any) => {
      // 'pack' cuenta igual que 'kit' (misma semántica de inventario) — el
      // POS Electron ya lo hacía así (posApi.ts); aquí faltaba.
      const isKit = p.productType === 'kit' || p.productType === 'pack';
      return {
        id: p.id,
        sku: p.code,
        name: p.name,
        slug: p.slug,
        imageUrl: p.imageUrl,
        basePrice: parseFloat(p.price || '0'),
        categoryName: p.categoryName,
        // Kits no rastrean stock propio (descuentan de componentes)
        stock: isKit ? undefined : p.stock,
        isActive: p.isActive,
        taxRate: p.taxRate != null ? Number(p.taxRate) : undefined,
        isIncludedInPrice: p.taxIncludedInPrice,
        points: p.pricePoints != null ? Number(p.pricePoints) : 0,
        businessVolume: p.priceBusinessValue != null ? Number(p.priceBusinessValue) : 0,
        productType: p.productType,
        kitPosition: p.kitPosition,
        isEnrollmentKit: p.isEnrollmentKit === true,
      };
    }) || [];
  }

  /**
   * Resolve prices for a batch of products by price type
   */
  async resolveProductPrices(productIds: string[], priceTypeId: string, countryId?: string): Promise<Array<{ productId: string; price: number; points: number; businessValue: number }>> {
    const response = await api.post<Array<{ productId: string; price: number; points: number; businessValue: number }>>('/products/resolve-prices', {
      productIds,
      priceTypeId,
      ...(countryId && { countryId }),
    });
    return response.data;
  }

  /**
   * Get product by code (for barcode scanning)
   */
  async getProductBySku(sku: string, countryId?: string, branchId?: string, priceTypeId?: string): Promise<QuickProduct | null> {
    try {
      const params: Record<string, string> = {};
      if (countryId) params.countryId = countryId;
      if (branchId) params.branchId = branchId;
      if (priceTypeId) params.priceTypeId = priceTypeId;
      const response = await api.get(`/products/code/${sku}`, {
        params: Object.keys(params).length > 0 ? params : undefined,
      });
      const p = response.data;
      // Reject products not available in POS
      if (!p.availableInPos) return null;

      const isKit = p.productType === 'kit' || p.productType === 'pack';

      return {
        id: p.id,
        sku: p.code,
        name: p.name,
        slug: p.slug,
        imageUrl: p.imageUrl,
        basePrice: parseFloat(p.price || '0'),
        categoryName: p.categoryName,
        // Kits no rastrean stock propio (descuentan de componentes via kit_deducts_inventory)
        stock: isKit ? undefined : p.stock,
        isActive: p.isActive,
        taxRate: p.taxRate != null ? Number(p.taxRate) : undefined,
        isIncludedInPrice: p.taxIncludedInPrice,
        productType: p.productType,
        kitPosition: p.kitPosition,
        isEnrollmentKit: p.isEnrollmentKit === true,
      };
    } catch {
      return null;
    }
  }

  // ================================
  // HELPERS
  // ================================

  /**
   * Format currency for display
   */
  formatCurrency(amount: number, currencySymbol = '$'): string {
    return `${currencySymbol}${amount.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  /**
   * Calculate change for cash payment
   */
  calculateChange(amountDue: number, amountReceived: number): number {
    return Math.max(0, amountReceived - amountDue);
  }

  /**
   * Monitor de la prueba piloto (ventas nativas por sucursal + feed).
   * `date` (YYYY-MM-DD) navega a días anteriores; ausente = hoy (en vivo).
   */
  async getPilotLive(
    branchCodes?: string[],
    date?: string,
  ): Promise<PilotLiveResponse> {
    const params: Record<string, string> = {};
    if (branchCodes?.length) params.branchCodes = branchCodes.join(',');
    if (date) params.date = date;
    const response = await api.get<PilotLiveResponse>('/pos/pilot-live', {
      params: Object.keys(params).length ? params : undefined,
    });
    return response.data;
  }
}

export const posService = new PosService();
export default posService;
