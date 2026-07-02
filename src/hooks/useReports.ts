// useReports.ts - React Query hooks for Reports API
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.7 Módulo Reportes

import { useQuery } from '@tanstack/react-query';
import { reportsService } from '@/services/reports.service';
import type {
  SalesReportQuery,
  InventoryReportQuery,
  CommissionsReportQuery,
  CustomerReportQuery,
  AttendanceReportQuery,
  AnalyticsQuery,
  ProductByPeriodQuery,
  SalesByUserQuery,
} from '@/types/reports';

// ================================
// DASHBOARD
// ================================

export function useDashboardKPIs(periodId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'kpis', periodId ?? 'current'],
    queryFn: () => reportsService.getDashboardKPIs(periodId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: (prev) => prev, // mantiene datos al cambiar de periodo
  });
}

// ================================
// SALES REPORTS
// ================================

export function useDailySales(query: SalesReportQuery) {
  return useQuery({
    queryKey: ['reports', 'sales', 'daily', query],
    queryFn: () => reportsService.getDailySales(query),
    enabled: !!query.startDate && !!query.endDate,
  });
}

export function useSalesByProduct(query: SalesReportQuery) {
  return useQuery({
    queryKey: ['reports', 'sales', 'by-product', query],
    queryFn: () => reportsService.getSalesByProduct(query),
    enabled: !!query.startDate && !!query.endDate,
  });
}

export function useSalesByBranch(query: SalesReportQuery) {
  return useQuery({
    queryKey: ['reports', 'sales', 'by-branch', query],
    queryFn: () => reportsService.getSalesByBranch(query),
    enabled: !!query.startDate && !!query.endDate,
  });
}

// ================================
// INVENTORY REPORTS
// ================================

export function useInventoryReport(query: InventoryReportQuery = {}) {
  return useQuery({
    queryKey: ['reports', 'inventory', query],
    queryFn: () => reportsService.getInventoryReport(query),
  });
}

export function useLowStockReport(query: InventoryReportQuery = {}) {
  return useQuery({
    queryKey: ['reports', 'inventory', 'low-stock', query],
    queryFn: () => reportsService.getLowStockReport(query),
  });
}

export function useExpiringProductsReport(query: InventoryReportQuery = {}) {
  return useQuery({
    queryKey: ['reports', 'inventory', 'expiring', query],
    queryFn: () => reportsService.getExpiringProductsReport(query),
  });
}

// ================================
// COMMISSIONS REPORTS
// ================================

export function useCommissionsReport(query: CommissionsReportQuery) {
  return useQuery({
    queryKey: ['reports', 'commissions', query],
    queryFn: () => reportsService.getCommissionsReport(query),
    enabled: !!query.periodId,
  });
}

export function usePointsReport(query: CommissionsReportQuery) {
  return useQuery({
    queryKey: ['reports', 'points', query],
    queryFn: () => reportsService.getPointsReport(query),
    enabled: !!query.periodId,
  });
}

export function useRankUpsReport(query: CommissionsReportQuery) {
  return useQuery({
    queryKey: ['reports', 'rank-ups', query],
    queryFn: () => reportsService.getRankUpsReport(query.periodId),
    enabled: !!query.periodId,
  });
}

// ================================
// CUSTOMER REPORTS
// ================================

export function useNewCustomersReport(query: CustomerReportQuery) {
  return useQuery({
    queryKey: ['reports', 'customers', 'new', query],
    queryFn: () => reportsService.getNewCustomersReport(query),
    enabled: !!query.startDate && !!query.endDate,
  });
}

export function useInactiveCustomersReport(query: CustomerReportQuery) {
  return useQuery({
    queryKey: ['reports', 'customers', 'inactive', query],
    queryFn: () => reportsService.getInactiveCustomersReport(query),
  });
}

// ================================
// HR REPORTS
// ================================

export function useAttendanceReport(query: AttendanceReportQuery) {
  return useQuery({
    queryKey: ['reports', 'attendance', query],
    queryFn: () => reportsService.getAttendanceReport(query),
    enabled: !!query.startDate && !!query.endDate,
  });
}

// ================================
// ANALYTICS (Reports Page)
// ================================

export function useAnalytics(query: AnalyticsQuery) {
  return useQuery({
    queryKey: ['reports', 'analytics', query],
    queryFn: () => reportsService.getAnalytics(query),
    // La ventana se resuelve por número de periodos (months); startDate/endDate
    // son opcionales (el API ya no los usa para analytics).
    enabled: (query.months ?? 0) > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ================================
// PRODUCT BY PERIOD REPORT
// ================================

export function useSalesByProductPeriod(query: ProductByPeriodQuery) {
  return useQuery({
    queryKey: ['reports', 'sales', 'by-product-period', query.periodIds],
    queryFn: () => reportsService.getSalesByProductPeriod(query),
    enabled: query.periodIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}

// ================================
// SALES BY USER (CALL CENTER) REPORT
// ================================

export function useSalesByUser(query: SalesByUserQuery) {
  return useQuery({
    queryKey: ['reports', 'sales', 'by-user', query],
    queryFn: () => reportsService.getSalesByUser(query),
    enabled: !!query.startDate && !!query.endDate,
    staleTime: 1000 * 60 * 5,
  });
}
