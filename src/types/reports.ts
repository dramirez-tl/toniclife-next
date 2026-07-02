// reports.ts - TypeScript types for Reports module
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.7 Módulo Reportes

// ================================
// QUERY TYPES
// ================================

export interface DateRangeQuery {
  startDate: string;
  endDate: string;
  branchId?: string;
}

export interface SalesReportQuery extends DateRangeQuery {
  groupBy?: 'day' | 'week' | 'month';
  productId?: string;
  categoryId?: string;
  channel?: string;
}

export interface InventoryReportQuery {
  branchId?: string;
  categoryId?: string;
  lowStockThreshold?: number;
  expiringDays?: number;
}

export interface CommissionsReportQuery {
  periodId: string;
  customerId?: string;
  status?: 'pending' | 'approved' | 'paid';
}

export interface CustomerReportQuery extends DateRangeQuery {
  type?: 'new' | 'inactive' | 'active';
  inactiveDays?: number;
}

export interface AttendanceReportQuery extends DateRangeQuery {
  employeeId?: string;
  department?: string;
}

// ================================
// SALES RESPONSE TYPES
// ================================

export interface SalesSummary {
  totalSales: number;
  orderCount: number;
  averageTicket: number;
  totalItems: number;
  totalPoints: number;
  totalBusinessValue: number;
}

export interface DailySales {
  date: string;
  total: number;
  orderCount: number;
  averageTicket: number;
}

export interface ProductSales {
  productId: string;
  code: string;
  productName: string;
  quantitySold: number;
  totalSales: number;
  pointsGenerated: number;
}

export interface BranchSales {
  branchId: string;
  branchName: string;
  totalSales: number;
  totalMxn: number;
  totalUsd: number;
  totalCop: number;
  totalGtq: number;
  orderCount: number;
  averageTicket: number;
}

export interface SalesReportResponse {
  summary: SalesSummary;
  dailyData: DailySales[];
}

export interface SalesByProductResponse {
  summary: SalesSummary;
  products: ProductSales[];
}

export interface SalesFxByCurrency {
  currencyCode: string;
  total: number;
  rateToMxn: number | null;
  totalMxn: number | null;
}

// Consolidado de todos los países en MXN con la tasa CONGELADA del periodo
// (period_exchange_rates). null si el rango no corresponde a ningún periodo.
export interface SalesFxSummary {
  periodId: string;
  periodName: string;
  totalMxn: number;
  missing: string[];
  byCurrency: SalesFxByCurrency[];
}

export interface SalesByBranchResponse {
  summary: SalesSummary;
  branches: BranchSales[];
  fx: SalesFxSummary | null;
}

// ================================
// INVENTORY RESPONSE TYPES
// ================================

export interface InventoryStock {
  productId: string;
  code: string;
  productName: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  isLowStock: boolean;
  branchName?: string;
}

export interface ExpiringProduct {
  lotId: string;
  productId: string;
  code: string;
  productName: string;
  lotNumber: string;
  expirationDate: string;
  daysUntilExpiration: number;
  quantity: number;
  branchName?: string;
}

export interface InventoryReportResponse {
  totalProducts: number;
  lowStockCount: number;
  items: InventoryStock[];
}

export interface LowStockReportResponse {
  count: number;
  items: InventoryStock[];
}

export interface ExpiringProductsReportResponse {
  count: number;
  items: ExpiringProduct[];
}

// ================================
// MLM/COMMISSIONS RESPONSE TYPES
// ================================

export interface CommissionSummary {
  totalGrossMxn: number;
  totalGrossUsd: number;
  totalRetentions: number;
  totalNetMxn: number;
  totalNetUsd: number;
  distributorsWithCommission: number;
}

export interface DistributorCommission {
  customerId: string;
  customerName: string;
  email: string;
  rank: string;
  grossAmountMxn: number;
  grossAmountUsd: number;
  retentions: number;
  netAmountMxn: number;
  netAmountUsd: number;
}

export interface PointsSummary {
  totalPersonalPoints: number;
  totalGroupPoints: number;
  totalBusinessValueMxn: number;
  totalBusinessValueUsd: number;
  qualifiedDistributors: number;
}

export interface TopDistributor {
  customerId: string;
  customerName: string;
  personalPoints: number;
  groupPoints: number;
  rank: string;
}

export interface RankUp {
  customerId: string;
  customerName: string;
  previousRank: string;
  newRank: string;
  achievedAt: string;
}

export interface CommissionsReportResponse {
  summary: CommissionSummary;
  distributors: DistributorCommission[];
}

export interface PointsReportResponse {
  summary: PointsSummary;
  topDistributors: TopDistributor[];
}

export interface RankUpsReportResponse {
  totalRankUps: number;
  rankUps: RankUp[];
}

// ================================
// CUSTOMER RESPONSE TYPES
// ================================

export interface NewCustomer {
  customerId: string;
  name: string;
  email: string;
  type: string;
  sponsorName?: string;
  createdAt: string;
}

export interface InactiveCustomer {
  customerId: string;
  name: string;
  email: string;
  lastOrderDate?: string;
  inactiveDays: number;
  totalPurchases: number;
}

export interface NewCustomersReportResponse {
  count: number;
  customers: NewCustomer[];
}

export interface InactiveCustomersReportResponse {
  count: number;
  customers: InactiveCustomer[];
}

// ================================
// ATTENDANCE RESPONSE TYPES
// ================================

export interface AttendanceSummary {
  totalEmployees: number;
  totalCheckIns: number;
  lateArrivals: number;
  absences: number;
  punctualityRate: number;
}

export interface EmployeeAttendance {
  employeeId: string;
  employeeNumber: string;
  name: string;
  department: string;
  daysWorked: number;
  lateArrivals: number;
  absences: number;
  totalHours: number;
}

export interface AttendanceReportResponse {
  summary: AttendanceSummary;
  employees: EmployeeAttendance[];
}

// ================================
// DASHBOARD KPIs
// ================================

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  amount: number;
  status: string;
  date: string;
}

export interface TopProduct {
  productId: string;
  name: string;
  sales: number;
  revenue: number;
}

export interface RecentActivity {
  id: string;
  type: 'user' | 'order' | 'product' | 'payment' | 'system';
  message: string;
  timestamp: string;
}

/** Periodo de negocio (26→25) al que corresponden los KPIs de pedidos/ingresos. */
export interface DashboardPeriod {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  periodNumber: number;
}

/** Ingresos/pedidos del periodo por país (en la moneda del país). */
export interface CountryRevenue {
  countryId: string;
  code: string;
  name: string;
  currencyCode: string | null;
  revenue: number;
  orders: number;
  revenueGrowth: number;
  ordersGrowth: number;
}

export interface DashboardKPIs {
  totalUsers: number;
  usersGrowth: number;
  totalOrders: number;
  ordersGrowth: number;
  totalRevenue: number;
  revenueGrowth: number;
  activeDistributors: number;
  distributorsGrowth: number;
  recentOrders: RecentOrder[];
  topProducts: TopProduct[];
  recentActivity: RecentActivity[];
  /** Periodo (26→25) de los KPIs de pedidos/ingresos. Null si no hay periodos. */
  period: DashboardPeriod | null;
  /** Para navegar entre periodos (o null si no hay). */
  prevPeriodId: string | null;
  nextPeriodId: string | null;
  /** Ingresos/pedidos del periodo por país (dados de alta), México primero. */
  revenueByCountry: CountryRevenue[];
}

// ================================
// ANALYTICS PAGE TYPES
// ================================

export interface MonthlySalesTrend {
  month: string;
  year: number;
  sales: number;
  orders: number;
  customers: number;
}

export interface TopProductWithGrowth {
  productId: string;
  name: string;
  sales: number;
  revenue: number;
  growth: number;
}

export interface TopDistributor {
  customerId: string;
  name: string;
  sales: number;
  orders: number;
  teamSize: number;
  commission: number;
}

export interface CategoryPerformance {
  categoryId: string;
  category: string;
  sales: number;
  percentage: number;
  growth: number;
}

export interface AnalyticsQuery {
  startDate: string;
  endDate: string;
  months?: number;
  limit?: number;
}

export interface AnalyticsKPIs {
  currentMonthSales: number;
  previousMonthSales: number;
  salesGrowth: number;
  currentMonthOrders: number;
  previousMonthOrders: number;
  ordersGrowth: number;
  currentMonthCustomers: number;
  previousMonthCustomers: number;
  customersGrowth: number;
  averageOrderValue: number;
}

export interface AnalyticsResponse {
  salesTrend: MonthlySalesTrend[];
  topProducts: TopProductWithGrowth[];
  topDistributors: TopDistributor[];
  categoryPerformance: CategoryPerformance[];
  kpis: AnalyticsKPIs;
}

// ================================
// PRODUCT BY PERIOD REPORT
// ================================

export interface ProductByPeriodQuery {
  periodIds: string[];
}

export interface ProductPeriodQuantity {
  periodId: string;
  periodName: string;
  quantity: number;
}

export interface ProductBranchPeriodRow {
  sku: string;
  productName: string;
  branchName: string;
  currencyCode: string;
  periods: ProductPeriodQuantity[];
}

export interface ProductByPeriodResponse {
  periodColumns: { id: string; name: string }[];
  rows: ProductBranchPeriodRow[];
}

// ================================
// SALES BY USER (CALL CENTER) REPORT
// ================================

export interface SalesByUserQuery {
  startDate: string;
  endDate: string;
  sellerIds?: string[];
}

export interface SaleByUserRow {
  date: string;
  saleNumber: string;
  branchName: string;
  currencyCode: string;
  customerId: string;
  customerName: string;
  sellerUsername: string;
  sellerName: string;
  total: number;
  totalUsd: number;
}

export interface SalesByUserSummary {
  totalSales: number;
  totalDocuments: number;
  averageTicket: number;
  totalUsd: number;
}

export interface SalesByUserResponse {
  summary: SalesByUserSummary;
  rows: SaleByUserRow[];
}
