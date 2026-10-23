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
  /** Moneda de la sucursal (ISO 4217). Opcional: API anterior no la manda. */
  currencyCode?: string;
  /** POS completadas + pedidos de la tienda en línea pagados de la sucursal. */
  totalSales: number;
  totalMxn: number;
  totalUsd: number;
  totalCop: number;
  totalGtq: number;
  /** Parte de los totales que viene de pedidos en línea (moneda de la sucursal). */
  onlineTotal?: number;
  /** Pedidos en línea incluidos en orderCount. */
  onlineCount?: number;
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

/** Totales de UNA moneda. Retenciones fiscales = isr + ivaWithholding + resico. */
export interface CommissionCurrencySummary {
  currencyCode: string;
  rows: number;
  distributors: number;
  gross: number;
  iva: number;
  ivaWithholding: number;
  isr: number;
  resico: number;
  retentions: number;
  net: number;
}

export interface CommissionSummary {
  /** Solo filas MXN. */
  totalGrossMxn: number;
  /** Solo filas USD. */
  totalGrossUsd: number;
  /** Retenciones fiscales MXN (isr + ret. IVA + resico); nunca mezcla monedas. */
  totalRetentions: number;
  /** Retenciones fiscales USD. */
  totalRetentionsUsd: number;
  totalNetMxn: number;
  totalNetUsd: number;
  distributorsWithCommission: number;
  /** Desglose por moneda (incluye COP/GTQ). */
  byCurrency: CommissionCurrencySummary[];
}

export interface DistributorCommission {
  customerId: string;
  customerName: string;
  email: string;
  rank: string;
  /** Moneda de las filas del distribuidor (una fila por distribuidor y moneda). */
  currencyCode: string;
  grossAmountMxn: number;
  grossAmountUsd: number;
  /** Retenciones fiscales en currencyCode = isr + ivaWithholding + resico. */
  retentions: number;
  isr: number;
  ivaWithholding: number;
  resico: number;
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
  /** Tasa X→MXN congelada del periodo (1 para MXN; null sin tasa). API anterior no la manda. */
  rateToMxn?: number | null;
  /** Ingresos convertidos a MXN con esa tasa (null sin tasa). */
  revenueMxn?: number | null;
  /** Comparativos (API 22-oct-2026): valores del periodo anterior y del mismo periodo del año pasado. */
  prevRevenue?: number;
  prevOrders?: number;
  lastYearRevenue?: number | null;
  lastYearOrders?: number | null;
  revenueGrowthYoy?: number | null;
  ordersGrowthYoy?: number | null;
  /** Distribuidores con compra (puntos > 0) en el periodo, en ese país. */
  buyers?: number;
  prevBuyers?: number | null;
  lastYearBuyers?: number | null;
  buyersGrowth?: number | null;
  buyersGrowthYoy?: number | null;
  /** Acervo: distribuidores activos con kit del país (hoy). */
  activeDistributors?: number;
  /** Nuevos inscritos: distribuidores con alta en el periodo (sin pendientes de kit). API anterior no lo manda. */
  newDistributors?: number;
  prevNewDistributors?: number | null;
  lastYearNewDistributors?: number | null;
  newDistributorsGrowth?: number | null;
  newDistributorsGrowthYoy?: number | null;
}

/** Plantilla de RRHH (global: la ficha no tiene sucursal) con comparativos. */
export interface DashboardHeadcount {
  current: number;
  prev: number | null;
  lastYear: number | null;
  growth: number | null;
  growthYoy: number | null;
}

export interface DashboardComparison {
  prevPeriodName: string | null;
  lastYearPeriodName: string | null;
}

/** Consolidado del periodo en MXN con la tasa congelada (como Ventas por Sucursal). */
export interface DashboardFx {
  periodName: string;
  totalMxn: number;
  /** Monedas con ingresos pero sin tasa capturada en el periodo. */
  missing: string[];
  /** Consolidado MXN del periodo anterior / año pasado con la tasa del periodo actual (API anterior no lo manda). */
  prevTotalMxn?: number | null;
  lastYearTotalMxn?: number | null;
  growth?: number | null;
  growthYoy?: number | null;
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
  /** Total consolidado en MXN (null sin periodo; ausente en API anterior). */
  fx?: DashboardFx | null;
  /** Colaboradores (plantilla RRHH) con comparativos; ausente en API anterior. */
  collaborators?: DashboardHeadcount;
  /** Nuevos inscritos del periodo (todos los países) con comparativos; ausente en API anterior. */
  newDistributors?: DashboardHeadcount;
  /** Nombres de los periodos contra los que se compara; ausente en API anterior. */
  comparison?: DashboardComparison | null;
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
  /** Monedas con ventas en la ventana pero sin tasa de periodo capturada (suma parcial). */
  missingRates: string[];
  /** Etiqueta de la ventana consolidada (ej: "ENERO 2026 → JULIO 2026"). */
  periodLabel: string;
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
  /** Distribuidor: número (v2 o legacy) o parte del nombre. */
  customer?: string;
}

export interface SaleByUserRow {
  /** pos_sales.id: abre el detalle (GET pos/sales/:id). */
  saleId: string;
  date: string;
  saleNumber: string;
  paymentMethod: string;
  units: number;
  points: number;
  capturedVia: 'terminal' | 'usuario';
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

// ================================
// BONO DE INSCRIPCIÓN (REPORTE_BONO_SUSCRIPCION del sistema anterior)
// ================================

export type KitBonusPaymentStatus = 'pending' | 'paid' | 'excluded';

export interface KitBonusesQuery extends DateRangeQuery {
  /** Solo bonos con este estatus de pago (el API filtra) */
  status?: KitBonusPaymentStatus;
  /** País del patrocinador (quien cobra); varios separados por coma: 'MX,FN' */
  country?: string;
}

export interface KitBonusRow {
  /** Identidad del bono (pos_sale_items.id | order_items.id) */
  itemId: string;
  documentUuid: string;
  kitProductId: string;
  buyerId: string;
  sponsorId: string;
  /** pending (sin registro) | paid (montos congelados) | excluded (no se paga) */
  paymentStatus: KitBonusPaymentStatus;
  paymentId: string | null;
  /** YYYY-MM-DD */
  paidAt: string | null;
  paymentReference: string | null;
  paymentNotes: string | null;
  sponsorNumber: string;
  sponsorName: string;
  buyerNumber: string;
  buyerName: string;
  /** YYYY-MM-DD o null */
  registrationDate: string | null;
  /** YYYY-MM-DD, día local de la sucursal de la venta */
  purchaseDate: string;
  /** basico | premium */
  kitType: string;
  kitCode: string;
  units: number;
  /** Moneda del patrocinador */
  currencyCode: string;
  /** País del patrocinador (quien cobra): MX, FN, US, CO… */
  sponsorCountry: string | null;
  saleCountry: string | null;
  /** Régimen fiscal del patrocinador; vacío si v2 no lo tiene */
  regime: string;
  subtotal: number;
  isr: number;
  iva: number;
  ivaWithholding: number;
  resico: number;
  total: number;
  documentId: string;
  source: 'pos' | 'online';
  ruleOrigin: 'venta' | 'patrocinador' | 'ninguna';
  converted: boolean;
  missingRate: boolean;
}

export interface KitBonusesByCurrency {
  currencyCode: string;
  rows: number;
  subtotal: number;
  total: number;
}

export interface KitBonusStatusTotals {
  rows: number;
  subtotal: number;
  total: number;
  byCurrency: KitBonusesByCurrency[];
}

export interface KitBonusesSummary {
  rows: number;
  subtotal: number;
  isr: number;
  iva: number;
  ivaWithholding: number;
  resico: number;
  total: number;
  byCurrency: KitBonusesByCurrency[];
  byStatus: Record<KitBonusPaymentStatus, KitBonusStatusTotals>;
  missingRegime: number;
  missingRule: number;
  missingRate: number;
}

export interface KitBonusItemRef {
  source: 'pos' | 'online';
  itemId: string;
}

export interface MarkKitBonusPaymentsPayload {
  startDate: string;
  endDate: string;
  status: 'paid' | 'excluded';
  /** Filas elegidas; si se omite, all = todos los pendientes del rango */
  items?: KitBonusItemRef[];
  all?: boolean;
  /** YYYY-MM-DD (por defecto hoy en CDMX) */
  paidAt?: string;
  reference?: string;
  notes?: string;
}

export interface KitBonusPaymentsResult {
  status: 'paid' | 'excluded';
  marked: number;
  skipped: number;
  notFound: number;
  paidAt: string | null;
}

export interface KitBonusRevertResult {
  id: string;
  reverted: boolean;
}

/** Comprobante fiscal de un grupo PAGADO (mig 165, 20-oct-2026). */
export type KitBonusVoucherMode = 'payroll' | 'received_cfdi' | 'none';
export type KitBonusVoucherStatus =
  | 'not_stamped'
  | 'in_progress'
  | 'error'
  | 'stamped'
  | 'cancelled'
  | 'missing'
  | 'registered';

export interface KitBonusGroupVoucher {
  /** payroll = Tonic Life emite el recibo de nómina (ASIMILADOS, MXN); received_cfdi = el distribuidor emite su CFDI y Tesorería lo registra; none = no aplica. */
  mode: KitBonusVoucherMode;
  status: KitBonusVoucherStatus;
  /** invoices.id del recibo de nómina o received_cfdis.id. */
  id: string | null;
  uuid: string | null;
  folio: string | null;
  issuedAt: string | null;
  total: number | null;
  /** Último error del PAC (nómina). */
  error: string | null;
  /** Emisor del CFDI recibido. */
  issuerName: string | null;
  /** Datos del patrocinador que faltan para timbrar (vacío = listo). */
  issues: string[];
  /** true = el comprobante no cubre todos los bonos del grupo. */
  partial: boolean;
}

export interface KitBonusPayrollResult {
  invoiceId: string;
  status: string;
  uuid: string | null;
  folio: string | null;
  error: string | null;
}

export interface ReceivedCfdiResult {
  id: string;
  uuid: string;
  issuerName: string | null;
  total: number;
  issuedAt: string | null;
  linked: number;
}

export interface UnlinkReceivedCfdiResult {
  id: string;
  released: number;
}

/** Un bono (suscrito) dentro del grupo de un patrocinador. */
export interface KitBonusGroupItem {
  source: 'pos' | 'online';
  itemId: string;
  /** kit_bonus_payments.id (pagado/excluido); null si está pendiente. */
  paymentId: string | null;
  buyerNumber: string;
  buyerName: string;
  kitType: string;
  kitCode: string;
  purchaseDate: string;
  documentId: string;
  subtotal: number;
  total: number;
}

/** Bonos de un patrocinador que se pagan juntos (misma moneda, régimen y estatus). */
export interface KitBonusGroup {
  key: string;
  sponsorId: string;
  sponsorNumber: string;
  sponsorName: string;
  sponsorCountry: string | null;
  currencyCode: string;
  regime: string;
  paymentStatus: KitBonusPaymentStatus;
  paidAt: string | null;
  paymentReference: string | null;
  bonuses: number;
  units: number;
  subtotal: number;
  isr: number;
  iva: number;
  ivaWithholding: number;
  resico: number;
  total: number;
  /** true = más de un bono pendiente: impuestos calculados sobre la suma. */
  recomputed: boolean;
  items: KitBonusGroupItem[];
  /** Comprobante del grupo pagado; null en pendientes/excluidos (o API sin la mig 165). */
  voucher: KitBonusGroupVoucher | null;
}

export interface KitBonusesResponse {
  startDate: string;
  endDate: string;
  periodName: string | null;
  rates: Record<string, number>;
  summary: KitBonusesSummary;
  /** Una fila por bono; con varios pendientes del mismo patrocinador, impuestos prorrateados del cálculo sobre la suma. */
  rows: KitBonusRow[];
  /** Compactado por patrocinador: lo que se deposita. */
  groups: KitBonusGroup[];
}

// ================================
// CORTE DE CAJA POR SUCURSAL (REPORTE_DE_CAJA del sistema anterior)
// ================================

export interface CashCutQuery {
  startDate: string;
  endDate: string;
  branchId: string;
}

export interface CashCutRow {
  documentId: string;
  customerName: string;
  total: number;
  currencyCode: string;
  paymentLabel: string;
  paymentMethod: string;
  /** ISO 8601 UTC */
  saleDateTime: string;
}

export interface CashCutSummaryRow {
  paymentLabel: string;
  total: number;
}

export interface CashCutResponse {
  startDate: string;
  endDate: string;
  branchId: string;
  branchName: string;
  currencyCode: string;
  salesCount: number;
  total: number;
  summary: CashCutSummaryRow[];
  rows: CashCutRow[];
}

// ================================
// VENTAS POR PRODUCTO CON FOLIO (CEDEAS, 21-oct-2026)
// ================================

export interface SalesByProductDetailQuery extends DateRangeQuery {
  branchId?: string;
  productId?: string;
  /** Clave o nombre del producto (contiene). */
  search?: string;
}

/** Un renglón de venta POS completada (día y hora locales de la sucursal). */
export interface ProductSaleLine {
  saleId: string;
  saleNumber: string;
  saleDate: string;
  saleTime: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  currencyCode: string;
  customerNumber: string | null;
  customerName: string;
  productId: string;
  productSku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  points: number;
  paymentMethod: string;
  sellerName: string;
}

export interface ProductSalesSummary {
  productId: string;
  productSku: string;
  productName: string;
  /** Ventas (folios) distintas. */
  salesCount: number;
  units: number;
  amount: number;
  points: number;
  lines: ProductSaleLine[];
}

export interface SalesByProductTotals {
  sales: number;
  lines: number;
  units: number;
  amount: number;
  points: number;
}

export interface SalesByProductDetailResponse {
  startDate: string;
  endDate: string;
  branchId: string | null;
  branchLabel: string;
  totals: SalesByProductTotals;
  products: ProductSalesSummary[];
}
