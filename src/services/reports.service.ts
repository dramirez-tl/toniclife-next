// reports.service.ts - Service for Reports API
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.7 Módulo Reportes

import api from '@/lib/api';
import { saveBlob } from '@/lib/download';
import type {
  DateRangeQuery,
  SalesReportQuery,
  SalesReportResponse,
  SalesByProductResponse,
  SalesByBranchResponse,
  InventoryReportQuery,
  InventoryReportResponse,
  LowStockReportResponse,
  ExpiringProductsReportResponse,
  CommissionsReportQuery,
  CommissionsReportResponse,
  PointsReportResponse,
  RankUpsReportResponse,
  CustomerReportQuery,
  NewCustomersReportResponse,
  InactiveCustomersReportResponse,
  AttendanceReportQuery,
  AttendanceReportResponse,
  DashboardKPIs,
  AnalyticsQuery,
  AnalyticsResponse,
  ProductByPeriodQuery,
  ProductByPeriodResponse,
  SalesByUserQuery,
  SalesByUserResponse,
  SalesByUserSeller,
  KitBonusesResponse,
  KitBonusesQuery,
  MarkKitBonusPaymentsPayload,
  KitBonusPaymentsResult,
  KitBonusRevertResult,
  CashCutQuery,
  CashCutResponse,
} from '@/types/reports';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Marca de tiempo yyyyMMddHHmmss de la descarga (hora local): mismo nombre
 * que generaba el legacy. Content-Disposition no se expone por CORS, así que
 * el nombre se arma aquí.
 */
function downloadStamp(): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
    `${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
  );
}

class ReportsService {
  // ================================
  // SALES REPORTS
  // ================================

  async getDailySales(query: SalesReportQuery): Promise<SalesReportResponse> {
    const params = new URLSearchParams();

    params.append('startDate', query.startDate);
    params.append('endDate', query.endDate);
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.channel) params.append('channel', query.channel);
    if (query.groupBy) params.append('groupBy', query.groupBy);

    const response = await api.get<SalesReportResponse>(
      `/reports/sales/daily?${params.toString()}`
    );
    return response.data;
  }

  async getSalesByProduct(query: SalesReportQuery): Promise<SalesByProductResponse> {
    const params = new URLSearchParams();

    params.append('startDate', query.startDate);
    params.append('endDate', query.endDate);
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.categoryId) params.append('categoryId', query.categoryId);

    const response = await api.get<SalesByProductResponse>(
      `/reports/sales/by-product?${params.toString()}`
    );
    return response.data;
  }

  async getSalesByBranch(query: SalesReportQuery): Promise<SalesByBranchResponse> {
    const params = new URLSearchParams();

    params.append('startDate', query.startDate);
    params.append('endDate', query.endDate);
    if (query.channel) params.append('channel', query.channel);

    const response = await api.get<SalesByBranchResponse>(
      `/reports/sales/by-branch?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Descarga el Excel "REPORTE DE VENTAS POR SUCURSAL" con la estructura del
   * sistema anterior (una fila por sucursal: SUCURSAL | TOTAL NETO | IVA |
   * TOTAL MX | TOTAL DLL | PERIÓDO) para un día o rango de días locales de
   * cada sucursal. El API arma el archivo; aquí solo se dispara el save-as.
   * Backend: GET /reports/sales/by-branch/legacy-xlsx
   */
  async downloadSalesByBranchLegacyXlsx(query: DateRangeQuery): Promise<void> {
    const response = await api.get('/reports/sales/by-branch/legacy-xlsx', {
      params: {
        startDate: query.startDate,
        endDate: query.endDate,
        ...(query.branchId ? { branchId: query.branchId } : {}),
      },
      responseType: 'blob',
    });
    // Mismo nombre que generaba el legacy (marca de tiempo de la descarga);
    // Content-Disposition no se expone por CORS, así que se arma aquí.
    const now = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    const stamp =
      `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
      `${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
    saveBlob(
      response.data as BlobPart,
      `REPORTE_VENTAS_POR_SUCURSAL_${stamp}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  }

  // ================================
  // INVENTORY REPORTS
  // ================================

  async getInventoryReport(query: InventoryReportQuery = {}): Promise<InventoryReportResponse> {
    const params = new URLSearchParams();

    if (query.branchId) params.append('branchId', query.branchId);
    if (query.categoryId) params.append('categoryId', query.categoryId);

    const response = await api.get<InventoryReportResponse>(
      `/reports/inventory?${params.toString()}`
    );
    return response.data;
  }

  async getLowStockReport(query: InventoryReportQuery = {}): Promise<LowStockReportResponse> {
    const params = new URLSearchParams();

    if (query.branchId) params.append('branchId', query.branchId);
    if (query.lowStockThreshold)
      params.append('lowStockThreshold', String(query.lowStockThreshold));

    const response = await api.get<LowStockReportResponse>(
      `/reports/inventory/low-stock?${params.toString()}`
    );
    return response.data;
  }

  async getExpiringProductsReport(
    query: InventoryReportQuery = {}
  ): Promise<ExpiringProductsReportResponse> {
    const params = new URLSearchParams();

    if (query.branchId) params.append('branchId', query.branchId);
    if (query.expiringDays) params.append('expiringDays', String(query.expiringDays));

    const response = await api.get<ExpiringProductsReportResponse>(
      `/reports/inventory/expiring?${params.toString()}`
    );
    return response.data;
  }

  // ================================
  // MLM REPORTS (Commissions, Points, Rank-ups)
  // ================================

  async getCommissionsReport(query: CommissionsReportQuery): Promise<CommissionsReportResponse> {
    const params = new URLSearchParams();

    if (query.customerId) params.append('customerId', query.customerId);
    if (query.status) params.append('status', query.status);

    const response = await api.get<CommissionsReportResponse>(
      `/reports/commissions/${query.periodId}?${params.toString()}`
    );
    return response.data;
  }

  async getPointsReport(query: CommissionsReportQuery): Promise<PointsReportResponse> {
    const params = new URLSearchParams();

    if (query.customerId) params.append('customerId', query.customerId);

    const response = await api.get<PointsReportResponse>(
      `/reports/points/${query.periodId}?${params.toString()}`
    );
    return response.data;
  }

  async getRankUpsReport(periodId: string): Promise<RankUpsReportResponse> {
    const response = await api.get<RankUpsReportResponse>(`/reports/rank-ups/${periodId}`);
    return response.data;
  }

  // ================================
  // CUSTOMER REPORTS
  // ================================

  async getNewCustomersReport(query: CustomerReportQuery): Promise<NewCustomersReportResponse> {
    const params = new URLSearchParams();

    params.append('startDate', query.startDate);
    params.append('endDate', query.endDate);
    if (query.branchId) params.append('branchId', query.branchId);

    const response = await api.get<NewCustomersReportResponse>(
      `/reports/customers/new?${params.toString()}`
    );
    return response.data;
  }

  async getInactiveCustomersReport(
    query: CustomerReportQuery
  ): Promise<InactiveCustomersReportResponse> {
    const params = new URLSearchParams();

    params.append('startDate', query.startDate);
    params.append('endDate', query.endDate);
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.inactiveDays) params.append('inactiveDays', String(query.inactiveDays));

    const response = await api.get<InactiveCustomersReportResponse>(
      `/reports/customers/inactive?${params.toString()}`
    );
    return response.data;
  }

  // ================================
  // ATTENDANCE REPORTS
  // ================================

  async getAttendanceReport(query: AttendanceReportQuery): Promise<AttendanceReportResponse> {
    const params = new URLSearchParams();

    params.append('startDate', query.startDate);
    params.append('endDate', query.endDate);
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.employeeId) params.append('employeeId', query.employeeId);
    if (query.department) params.append('department', query.department);

    const response = await api.get<AttendanceReportResponse>(
      `/reports/attendance?${params.toString()}`
    );
    return response.data;
  }

  // ================================
  // DASHBOARD KPIs
  // ================================

  async getDashboardKPIs(periodId?: string): Promise<DashboardKPIs> {
    const response = await api.get<DashboardKPIs>('/reports/dashboard', {
      params: periodId ? { periodId } : undefined,
    });
    return response.data;
  }

  // ================================
  // ANALYTICS (Reports Page)
  // ================================

  async getAnalytics(query: AnalyticsQuery): Promise<AnalyticsResponse> {
    const params = new URLSearchParams();

    params.append('startDate', query.startDate);
    params.append('endDate', query.endDate);
    if (query.months) params.append('months', String(query.months));
    if (query.limit) params.append('limit', String(query.limit));

    const response = await api.get<AnalyticsResponse>(
      `/reports/analytics?${params.toString()}`
    );
    return response.data;
  }
  // ================================
  // PRODUCT BY PERIOD REPORT
  // ================================

  async getSalesByProductPeriod(query: ProductByPeriodQuery): Promise<ProductByPeriodResponse> {
    const params = new URLSearchParams();
    for (const id of query.periodIds) {
      params.append('periodIds', id);
    }
    const response = await api.get<ProductByPeriodResponse>(
      `/reports/sales/by-product-period?${params.toString()}`
    );
    return response.data;
  }
  // ================================
  // SALES BY USER (CALL CENTER) REPORT
  // ================================

  async getSalesByUser(query: SalesByUserQuery): Promise<SalesByUserResponse> {
    const params = new URLSearchParams();
    params.append('startDate', query.startDate);
    params.append('endDate', query.endDate);
    if (query.sellerIds) {
      for (const id of query.sellerIds) {
        params.append('sellerIds', id);
      }
    }
    if (query.customer?.trim()) params.append('customer', query.customer.trim());
    const response = await api.get<SalesByUserResponse>(
      `/reports/sales/by-user?${params.toString()}`
    );
    return response.data;
  }

  /** Vendedores con ventas completadas en el rango (filtro de Ventas por usuario). */
  async getSalesByUserSellers(startDate: string, endDate: string): Promise<SalesByUserSeller[]> {
    const response = await api.get<SalesByUserSeller[]>('/reports/sales/by-user/sellers', {
      params: { startDate, endDate },
    });
    return response.data;
  }

  // ================================
  // TESORERÍA: BONO DE INSCRIPCIÓN Y CORTE DE CAJA (formato del sistema anterior)
  // ================================

  /** Backend: GET /reports/kit-bonuses (bono por suscrito, como el legacy; con estatus de pago). */
  async getKitBonuses(query: KitBonusesQuery): Promise<KitBonusesResponse> {
    const response = await api.get<KitBonusesResponse>('/reports/kit-bonuses', {
      params: {
        startDate: query.startDate,
        endDate: query.endDate,
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.country ? { country: query.country } : {}),
      },
    });
    return response.data;
  }

  /** Backend: GET /reports/kit-bonuses/legacy-xlsx → REPORTE_BONO_SUSCRIPCION_<fecha>.xlsx */
  async downloadKitBonusesLegacyXlsx(query: KitBonusesQuery): Promise<void> {
    const response = await api.get('/reports/kit-bonuses/legacy-xlsx', {
      params: {
        startDate: query.startDate,
        endDate: query.endDate,
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.country ? { country: query.country } : {}),
      },
      responseType: 'blob',
    });
    const suffix =
      (query.country ? `_${query.country.replace(/,/g, '-')}` : '') +
      (query.status ? `_${query.status.toUpperCase()}` : '');
    saveBlob(
      response.data as BlobPart,
      `REPORTE_BONO_SUSCRIPCION${suffix}_${downloadStamp()}.xlsx`,
      XLSX_MIME,
    );
  }

  /** Backend: POST /reports/kit-bonuses/payments (Tesorería: pagado congela montos / no pagado con motivo). */
  async markKitBonusPayments(payload: MarkKitBonusPaymentsPayload): Promise<KitBonusPaymentsResult> {
    const response = await api.post<KitBonusPaymentsResult>('/reports/kit-bonuses/payments', payload);
    return response.data;
  }

  /** Backend: POST /reports/kit-bonuses/payments/:id/revert (el bono vuelve a pendiente). */
  async revertKitBonusPayment(id: string, reason?: string): Promise<KitBonusRevertResult> {
    const response = await api.post<KitBonusRevertResult>(`/reports/kit-bonuses/payments/${id}/revert`, {
      ...(reason ? { reason } : {}),
    });
    return response.data;
  }

  /** Backend: GET /reports/cash-cut/by-branch (corte de caja de una sucursal). */
  async getCashCutByBranch(query: CashCutQuery): Promise<CashCutResponse> {
    const response = await api.get<CashCutResponse>('/reports/cash-cut/by-branch', {
      params: {
        startDate: query.startDate,
        endDate: query.endDate,
        branchId: query.branchId,
      },
    });
    return response.data;
  }

  /** Backend: GET /reports/cash-cut/by-branch/legacy-xlsx → REPORTE_CORTE_CAJA_SUCURSAL_<fecha>.xlsx */
  async downloadCashCutLegacyXlsx(query: CashCutQuery): Promise<void> {
    const response = await api.get('/reports/cash-cut/by-branch/legacy-xlsx', {
      params: {
        startDate: query.startDate,
        endDate: query.endDate,
        branchId: query.branchId,
      },
      responseType: 'blob',
    });
    saveBlob(
      response.data as BlobPart,
      `REPORTE_CORTE_CAJA_SUCURSAL_${downloadStamp()}.xlsx`,
      XLSX_MIME,
    );
  }
}

export const reportsService = new ReportsService();
export default reportsService;
