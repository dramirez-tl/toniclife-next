// reports.service.ts - Service for Reports API
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.7 Módulo Reportes

import api from '@/lib/api';
import { saveBlob } from '@/lib/download';
import { salesCountrySuffix } from '@/lib/sales-country-filter';
import {
  buildStripePaymentsCsv,
  stripeCsvFilename,
  type StripePaymentRow,
  type StripePaymentsQuery,
  type StripePaymentsResponse,
} from '@/lib/stripe-payments';
import type {
  SalesByBranchDownloadQuery,
  SalesByBranchQuery,
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
  PanelPace,
  AnalyticsQuery,
  AnalyticsResponse,
  ProductByPeriodQuery,
  ProductByPeriodResponse,
  SalesByUserQuery,
  SalesByUserResponse,
  NewDistributorsQuery,
  NewDistributorsResponse,
  KitBonusesResponse,
  KitBonusesQuery,
  MarkKitBonusPaymentsPayload,
  ImportKitBonusPaymentsPayload,
  KitBonusImportResult,
  KitBonusPaymentsResult,
  KitBonusPayrollResult,
  KitBonusRevertResult,
  ReceivedCfdiResult,
  UnlinkReceivedCfdiResult,
  SalesByProductDetailQuery,
  SalesByProductDetailResponse,
  CashCutQuery,
  CashCutResponse,
  OnlineSalesByCountryResponse,
} from '@/types/reports';
import { normalizeOnlineSales } from '@/lib/store-country/online-sales';

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

  async getSalesByBranch(query: SalesByBranchQuery): Promise<SalesByBranchResponse> {
    const params = new URLSearchParams();

    params.append('startDate', query.startDate);
    params.append('endDate', query.endDate);
    if (query.channel) params.append('channel', query.channel);
    // Países de la sucursal ("MX,FN"); sin valor el API trae todos.
    if (query.countries) params.append('countries', query.countries);

    const response = await api.get<SalesByBranchResponse>(
      `/reports/sales/by-branch?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Descarga el Excel "REPORTE DE VENTAS POR SUCURSAL" con la estructura del
   * sistema anterior (una fila por sucursal: SUCURSAL | TOTAL NETO | IVA |
   * TOTAL MX | TOTAL DLL | PERIÓDO y, a la derecha, VENTA EN CAJA | PEDIDOS EN
   * LÍNEA | NÚM. PEDIDOS EN LÍNEA; más una hoja con el folio de cada pedido en
   * línea) para un día o rango de días locales de cada sucursal. El API arma
   * el archivo; aquí solo se dispara el save-as.
   * Backend: GET /reports/sales/by-branch/legacy-xlsx
   */
  async downloadSalesByBranchLegacyXlsx(query: SalesByBranchDownloadQuery): Promise<void> {
    const response = await api.get('/reports/sales/by-branch/legacy-xlsx', {
      params: {
        startDate: query.startDate,
        endDate: query.endDate,
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.countries ? { countries: query.countries } : {}),
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
      `REPORTE_VENTAS_POR_SUCURSAL_${stamp}${salesCountrySuffix(query.countries)}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  }

  /**
   * Excel "Ventas por sucursal POR DÍA" (19-nov-2026): las mismas ventas del reporte, con una
   * columna por cada día del rango, agrupadas por moneda, y una hoja de detalle por día. Es un
   * reporte aparte del "formato anterior". Hasta 92 días por archivo.
   * Backend: GET /reports/sales/by-branch/daily-xlsx
   */
  async downloadSalesByBranchDailyXlsx(query: SalesByBranchDownloadQuery): Promise<void> {
    const response = await api.get('/reports/sales/by-branch/daily-xlsx', {
      params: {
        startDate: query.startDate,
        endDate: query.endDate,
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.countries ? { countries: query.countries } : {}),
      },
      responseType: 'blob',
    });
    // Content-Disposition no se expone por CORS: el nombre se arma aquí, igual que en el API.
    const compact = (d: string) => d.slice(0, 10).replace(/-/g, '');
    saveBlob(
      response.data as BlobPart,
      `VENTAS_POR_SUCURSAL_POR_DIA_${compact(query.startDate)}_${compact(query.endDate)}${salesCountrySuffix(query.countries)}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  }

  /**
   * Excel "Resumen de ventas POR DÍA" (21-nov-2026): las mismas ventas del reporte sumadas por
   * día, UN renglón por día con una columna por moneda, el total en pesos (si hay otra moneda)
   * y el número de ventas. Hasta 366 días por archivo.
   * Backend: GET /reports/sales/by-branch/daily-summary-xlsx
   */
  async downloadSalesDailySummaryXlsx(query: SalesByBranchDownloadQuery): Promise<void> {
    const response = await api.get('/reports/sales/by-branch/daily-summary-xlsx', {
      params: {
        startDate: query.startDate,
        endDate: query.endDate,
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.countries ? { countries: query.countries } : {}),
      },
      responseType: 'blob',
    });
    // Content-Disposition no se expone por CORS: el nombre se arma aquí, igual que en el API.
    const compact = (d: string) => d.slice(0, 10).replace(/-/g, '');
    saveBlob(
      response.data as BlobPart,
      `VENTAS_RESUMEN_POR_DIA_${compact(query.startDate)}_${compact(query.endDate)}${salesCountrySuffix(query.countries)}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  }

  /**
   * Cobros de Stripe de la tienda en línea (Reportes › Ventas › "Stripe"), para que Contabilidad concilie
   * contra el archivo de Stripe. Solo lectura. Backend: GET /reports/stripe-payments
   */
  async getStripePayments(query: StripePaymentsQuery = {}): Promise<StripePaymentsResponse> {
    const response = await api.get<StripePaymentsResponse>('/reports/stripe-payments', {
      params: {
        ...(query.fromDate ? { fromDate: query.fromDate } : {}),
        ...(query.toDate ? { toDate: query.toDate } : {}),
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.customerNumber ? { customerNumber: query.customerNumber } : {}),
        ...(query.search ? { search: query.search } : {}),
        ...(query.page ? { page: query.page } : {}),
        ...(query.limit ? { limit: query.limit } : {}),
      },
    });
    return response.data;
  }

  /**
   * Baja a CSV TODOS los cobros de Stripe que cumplen el filtro (no solo la página visible), con el
   * PaymentIntent y la hora en UTC para cruzarlos con el archivo de Stripe. Devuelve cuántos exportó.
   */
  async downloadStripePaymentsCsv(query: StripePaymentsQuery = {}): Promise<number> {
    const PAGE_SIZE = 500;
    const MAX_PAGES = 200; // tope de seguridad: 100 mil cobros
    const first = await this.getStripePayments({ ...query, page: 1, limit: PAGE_SIZE });
    const all: StripePaymentRow[] = [...first.data];
    for (let page = 2; page <= Math.min(first.totalPages, MAX_PAGES); page++) {
      const next = await this.getStripePayments({ ...query, page, limit: PAGE_SIZE });
      all.push(...next.data);
    }
    if (all.length === 0) return 0;
    saveBlob(
      buildStripePaymentsCsv(all),
      stripeCsvFilename(query.fromDate, query.toDate),
      'text/csv;charset=utf-8;',
    );
    return all.length;
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

  /**
   * Ritmo del periodo (consolidado) para la gráfica del Panel Principal: el
   * periodo actual o el que se esté viendo. Backend: GET /reports/dashboard/pace.
   */
  async getDashboardPace(periodId?: string): Promise<PanelPace> {
    const response = await api.get<PanelPace>('/reports/dashboard/pace', {
      params: periodId ? { periodId } : undefined,
    });
    return response.data;
  }

  // ================================
  // ANALYTICS (Reports Page)
  // ================================

  async getAnalytics(query: AnalyticsQuery): Promise<AnalyticsResponse> {
    const params = new URLSearchParams();

    // La ventana se resuelve por periodos (months); las fechas ya no se mandan
    // vacías (el API las rechazaba con 400).
    if (query.startDate) params.append('startDate', query.startDate);
    if (query.endDate) params.append('endDate', query.endDate);
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

  // ================================
  // NUEVOS INSCRITOS DE LA SEMANA (CALL CENTER, mig 173)
  // ================================

  /** Backend: GET /reports/new-distributors (cohorte semanal mié → mar). */
  async getNewDistributors(query: NewDistributorsQuery): Promise<NewDistributorsResponse> {
    const response = await api.get<NewDistributorsResponse>('/reports/new-distributors', {
      params: query.weekOf ? { weekOf: query.weekOf } : {},
    });
    return response.data;
  }

  /** Backend: GET /reports/new-distributors/xlsx — descarga NUEVOS_INSCRITOS_<inicio>_<fin>.xlsx. */
  async downloadNewDistributorsXlsx(query: NewDistributorsQuery): Promise<void> {
    const response = await api.get('/reports/new-distributors/xlsx', {
      params: query.weekOf ? { weekOf: query.weekOf } : {},
      responseType: 'blob',
    });
    // Content-Disposition no se expone por CORS: el nombre lleva la semana pedida.
    saveBlob(
      response.data as BlobPart,
      `NUEVOS_INSCRITOS_${query.weekOf ?? downloadStamp()}.xlsx`,
      XLSX_MIME,
    );
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
        // CEDIS / CEDEAS por la sucursal del kit (27-oct-2026); 'all' = sin filtro.
        ...(query.branchType && query.branchType !== 'all' ? { branchType: query.branchType } : {}),
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
        ...(query.branchType && query.branchType !== 'all' ? { branchType: query.branchType } : {}),
      },
      responseType: 'blob',
    });
    const suffix =
      (query.branchType === 'cedis' ? '_CEDIS' : query.branchType === 'cedeas' ? '_CEDEAS' : '') +
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

  /**
   * Backend: POST /reports/kit-bonuses/payments/import (multipart). Excel de Tesorería (una fila por
   * ID upline con la suma de sus bonos): sin apply = vista previa; con apply marca pagados los que casan.
   */
  async importKitBonusPayments(payload: ImportKitBonusPaymentsPayload): Promise<KitBonusImportResult> {
    const form = new FormData();
    form.append('file', payload.file);
    form.append('startDate', payload.startDate);
    form.append('endDate', payload.endDate);
    if (payload.branchType && payload.branchType !== 'all') form.append('branchType', payload.branchType);
    if (payload.country) form.append('country', payload.country);
    if (payload.sheet) form.append('sheet', payload.sheet);
    if (payload.paidAt) form.append('paidAt', payload.paidAt);
    if (payload.reference) form.append('reference', payload.reference);
    if (payload.apply) form.append('apply', 'true');
    if (payload.excludeRows?.length) form.append('excludeRows', JSON.stringify(payload.excludeRows));
    if (payload.tieBreak) form.append('tieBreak', payload.tieBreak);
    if (payload.window) form.append('window', payload.window);
    if (payload.windowDays) form.append('windowDays', String(payload.windowDays));
    const response = await api.post<KitBonusImportResult>('/reports/kit-bonuses/payments/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  /** Backend: POST /reports/kit-bonuses/payments/:id/revert (el bono vuelve a pendiente). */
  async revertKitBonusPayment(id: string, reason?: string): Promise<KitBonusRevertResult> {
    const response = await api.post<KitBonusRevertResult>(`/reports/kit-bonuses/payments/${id}/revert`, {
      ...(reason ? { reason } : {}),
    });
    return response.data;
  }

  /** Backend: POST /reports/kit-bonuses/payroll/stamp (recibo de nómina de un grupo pagado ASIMILADOS). */
  async stampKitBonusPayroll(paymentIds: string[]): Promise<KitBonusPayrollResult> {
    const response = await api.post<KitBonusPayrollResult>('/reports/kit-bonuses/payroll/stamp', { paymentIds });
    return response.data;
  }

  /** Backend: GET /reports/kit-bonuses/payroll/:invoiceId/:ext → descarga el PDF/XML del recibo. */
  async downloadKitBonusPayrollFile(invoiceId: string, ext: 'pdf' | 'xml', filename: string): Promise<void> {
    const response = await api.get(`/reports/kit-bonuses/payroll/${invoiceId}/${ext}`, { responseType: 'blob' });
    saveBlob(response.data as BlobPart, filename, ext === 'pdf' ? 'application/pdf' : 'application/xml');
  }

  /** Backend: POST /reports/kit-bonuses/received-cfdi (XML del CFDI que emitió el distribuidor por su bono). */
  async registerKitBonusReceivedCfdi(paymentIds: string[], file: File, notes?: string): Promise<ReceivedCfdiResult> {
    const form = new FormData();
    form.append('file', file);
    form.append('paymentIds', JSON.stringify(paymentIds));
    if (notes) form.append('notes', notes);
    const response = await api.post<ReceivedCfdiResult>('/reports/kit-bonuses/received-cfdi', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  /** Backend: POST /reports/kit-bonuses/received-cfdi/:id/unlink (quita el CFDI registrado). */
  async unlinkKitBonusReceivedCfdi(id: string, reason?: string): Promise<UnlinkReceivedCfdiResult> {
    const response = await api.post<UnlinkReceivedCfdiResult>(`/reports/kit-bonuses/received-cfdi/${id}/unlink`, {
      ...(reason ? { reason } : {}),
    });
    return response.data;
  }

  /** Backend: GET /reports/cash-cut/by-branch (corte de caja de una sucursal). */
  /** Backend: GET /reports/sales/by-product-detail (cada producto vendido con el folio de su venta). */
  async getSalesByProductDetail(query: SalesByProductDetailQuery): Promise<SalesByProductDetailResponse> {
    const response = await api.get<SalesByProductDetailResponse>('/reports/sales/by-product-detail', {
      params: {
        startDate: query.startDate,
        endDate: query.endDate,
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.productId ? { productId: query.productId } : {}),
        ...(query.search ? { search: query.search } : {}),
        // Sin `channel` el API trae caja + tienda en línea.
        ...(query.channel ? { channel: query.channel } : {}),
      },
    });
    return response.data;
  }

  /** Backend: GET /reports/sales/by-product-detail/xlsx → VENTAS_POR_PRODUCTO_<fecha>.xlsx */
  async downloadSalesByProductDetailXlsx(query: SalesByProductDetailQuery): Promise<void> {
    const response = await api.get('/reports/sales/by-product-detail/xlsx', {
      params: {
        startDate: query.startDate,
        endDate: query.endDate,
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.productId ? { productId: query.productId } : {}),
        ...(query.search ? { search: query.search } : {}),
        ...(query.channel ? { channel: query.channel } : {}),
      },
      responseType: 'blob',
    });
    saveBlob(response.data as BlobPart, `VENTAS_POR_PRODUCTO_${downloadStamp()}.xlsx`, XLSX_MIME);
  }

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

  /**
   * Ingresos de la tienda en línea por país de la tienda (México incluye Frontera) en
   * un rango de días de negocio. El rango lo pone quien llama (el periodo sale del API
   * de periodos): aquí no se calcula ningún mes. Backend: GET /reports/online-sales/by-country.
   */
  async getOnlineSalesByCountry(from: string, to: string): Promise<OnlineSalesByCountryResponse> {
    const response = await api.get<unknown>('/reports/online-sales/by-country', { params: { from, to } });
    const data = normalizeOnlineSales(response.data);
    if (!data) throw new Error('El servidor respondió los ingresos en línea en un formato que no se pudo leer.');
    return data;
  }
}

export const reportsService = new ReportsService();
export default reportsService;
