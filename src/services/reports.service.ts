// reports.service.ts - Service for Reports API
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.7 Módulo Reportes

import api from '@/lib/api';
import type {
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
} from '@/types/reports';

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

  async getDashboardKPIs(): Promise<DashboardKPIs> {
    const response = await api.get<DashboardKPIs>('/reports/dashboard');
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
    const response = await api.get<SalesByUserResponse>(
      `/reports/sales/by-user?${params.toString()}`
    );
    return response.data;
  }
}

export const reportsService = new ReportsService();
export default reportsService;
