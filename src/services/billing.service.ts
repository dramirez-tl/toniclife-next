// billing.service.ts - Servicio de facturación CFDI
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.5 Facturación

import { apiClient } from '@/lib/api-client';
import type {
  FiscalData,
  CreateFiscalDataDto,
  UpdateFiscalDataDto,
  CreateInvoiceDto,
  CancelInvoiceDto,
  BranchInvoicingSinceResult,
  CancelResultDto,
  CreateGlobalInvoiceDto,
  CreatePaymentComplementDto,
  DiscardInvoiceResult,
  GlobalDayStatus,
  GlobalDaysQuery,
  GlobalPreview,
  GlobalPreviewQuery,
  GlobalReissueResult,
  InvoiceDetail,
  InvoiceFiles,
  InvoiceListQuery,
  InvoiceableSalesQuery,
  PaginatedInvoiceableSales,
  PaginatedInvoices,
  RefreshStatusResult,
  ReplaceInvoiceResult,
  ResolveAmbiguousDto,
  SendInvoiceEmailResult,
  SetBranchInvoicingSinceDto,
  StampInvoiceOptions,
  CatalogItem,
  RfcValidation,
  BillingStatus,
  BillingReadiness,
  CleanRfcResult,
  EmitterConfig,
  PaginatedReadiness,
  PaginatedRfcDuplicates,
  PersonType,
  ProductFiscalImportResult,
  ReadinessBranch,
  ReadinessCustomerRow,
  ReadinessCustomersQuery,
  ReadinessPaymentMethod,
  ReadinessProductRow,
  ReadinessProductsQuery,
  SatCatalogItem,
  SatCodeKind,
  SatCodeSearchResult,
  UpdateBranchFiscalDto,
  UpdateEmitterDto,
  UpdatePaymentMethodFiscalDto,
  UpdateProductFiscalDto,
} from '@/types/billing';

const BASE_URL = '/billing';

// ================================
// FISCAL DATA
// ================================

export interface FiscalDataQueryDto {
  validated?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface FiscalDataItem {
  id: string;
  customerId: string;
  customerNumber: string | null;
  rfc: string;
  legalName: string;
  taxRegime: string;
  cfdiUseCode: string;
  defaultCfdiUse: string;
  postalCode: string;
  email: string | null;
  firstName: string;
  lastName: string;
  isValidated: boolean;
}

export interface PaginatedFiscalData {
  data: FiscalDataItem[];
  total: number;
  totalPages: number;
}

export async function listFiscalData(query?: FiscalDataQueryDto): Promise<PaginatedFiscalData> {
  const params = new URLSearchParams();
  if (query?.validated !== undefined) params.append('validated', String(query.validated));
  if (query?.search) params.append('search', query.search);
  if (query?.limit) params.append('limit', String(query.limit));
  if (query?.offset) params.append('offset', String(query.offset));

  const url = `${BASE_URL}/fiscal-data${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await apiClient.get<PaginatedFiscalData>(url);
  return response.data;
}

export async function getFiscalData(id: string): Promise<FiscalData> {
  const response = await apiClient.get<FiscalData>(`${BASE_URL}/fiscal-data/${id}`);
  return response.data;
}

export async function createFiscalData(data: CreateFiscalDataDto): Promise<FiscalData> {
  const response = await apiClient.post<FiscalData>(`${BASE_URL}/fiscal-data`, data);
  return response.data;
}

export async function updateFiscalData(
  id: string,
  data: UpdateFiscalDataDto
): Promise<FiscalData> {
  const response = await apiClient.put<FiscalData>(`${BASE_URL}/fiscal-data/${id}`, data);
  return response.data;
}

export async function getFiscalDataByCustomer(customerId: string): Promise<FiscalData[]> {
  const response = await apiClient.get<FiscalData[]>(
    `${BASE_URL}/customers/${customerId}/fiscal-data`
  );
  return response.data;
}

// ================================
// INVOICES (Fase 2: contrato §5 / §7)
// ================================

function toQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** `POST /billing/invoices { posSaleId | orderId }` → crea y timbra (201 InvoiceDetailDto). */
export async function createInvoice(data: CreateInvoiceDto): Promise<InvoiceDetail> {
  const response = await apiClient.post<InvoiceDetail>(`${BASE_URL}/invoices`, data);
  return response.data;
}

/** `GET /billing/invoices` con búsqueda, filtros y paginación en servidor (§7.2). */
export async function listInvoices(query?: InvoiceListQuery): Promise<PaginatedInvoices> {
  const qs = toQueryString({
    search: query?.search,
    status: query?.status,
    invoiceType: query?.invoiceType,
    cfdiType: query?.cfdiType,
    paymentMethod: query?.paymentMethod,
    withBalance: query?.withBalance,
    branchId: query?.branchId,
    customerId: query?.customerId,
    orderId: query?.orderId,
    posSaleId: query?.posSaleId,
    emailed: query?.emailed,
    startDate: query?.startDate,
    endDate: query?.endDate,
    page: query?.page,
    limit: query?.limit,
    sort: query?.sort,
  });
  const response = await apiClient.get<PaginatedInvoices>(`${BASE_URL}/invoices${qs}`);
  return response.data;
}

export async function getInvoice(id: string): Promise<InvoiceDetail> {
  const response = await apiClient.get<InvoiceDetail>(`${BASE_URL}/invoices/${id}`);
  return response.data;
}

/**
 * Único endpoint de (re)timbrado para las cuatro clases (§1.1). Nunca re-timbra
 * `stamped`. `acknowledgeGlobal` se manda cuando el ticket está en una global
 * viva y el usuario ya reconoció los 3 pasos (§5.3.7); sin él responde 409
 * `CFDI_IN_GLOBAL`.
 */
export async function stampInvoice(
  id: string,
  options?: StampInvoiceOptions,
): Promise<InvoiceDetail> {
  const qs = toQueryString({ acknowledgeGlobal: options?.acknowledgeGlobal ? true : undefined });
  const response = await apiClient.post<InvoiceDetail>(`${BASE_URL}/invoices/${id}/stamp${qs}`);
  return response.data;
}

/**
 * Desecha un intento SIN UUID (`pending`/`error`) de cualquier clase: libera
 * los tickets de una global o las facturas PPD de un complemento.
 */
export async function discardInvoice(id: string): Promise<DiscardInvoiceResult> {
  const response = await apiClient.post<DiscardInvoiceResult>(`${BASE_URL}/invoices/${id}/discard`);
  return response.data;
}

/**
 * V2-L3: salida manual de un timbrado ambiguo (`actions.canResolveAmbiguous`).
 * Solo `super_admin` (el API responde 403 al resto). No timbra ni cancela:
 * `adopt` registra ese UUID del PAC y `mark_not_stamped` pasa la fila a error.
 */
export async function resolveAmbiguousInvoice(
  id: string,
  data: ResolveAmbiguousDto,
): Promise<InvoiceDetail> {
  const response = await apiClient.post<InvoiceDetail>(
    `${BASE_URL}/invoices/${id}/resolve-ambiguous`,
    data,
  );
  return response.data;
}

export async function cancelInvoice(id: string, data: CancelInvoiceDto): Promise<CancelResultDto> {
  const response = await apiClient.post<CancelResultDto>(`${BASE_URL}/invoices/${id}/cancel`, data);
  return response.data;
}

/** Sustitución: nueva con relación 04 + cancelación 01 de la original (§5.5). */
export async function replaceInvoice(id: string): Promise<ReplaceInvoiceResult> {
  const response = await apiClient.post<ReplaceInvoiceResult>(`${BASE_URL}/invoices/${id}/replace`);
  return response.data;
}

/** Consulta el estatus ante el SAT (CONSUME UN FOLIO). `force` solo super_admin. */
export async function refreshInvoiceStatus(id: string, force = false): Promise<RefreshStatusResult> {
  const response = await apiClient.post<RefreshStatusResult>(
    `${BASE_URL}/invoices/${id}/refresh-status${force ? '?force=true' : ''}`,
  );
  return response.data;
}

/** URLs firmadas de PDF/XML (null con storage local: usar las rutas de descarga). */
export async function getInvoiceFiles(id: string): Promise<InvoiceFiles> {
  const response = await apiClient.get<InvoiceFiles>(`${BASE_URL}/invoices/${id}/files`);
  return response.data;
}

/** Reenvío por correo (PDF+XML). Sin `to` el API usa el correo fiscal del cliente. */
export async function sendInvoiceEmail(id: string, to?: string[]): Promise<SendInvoiceEmailResult> {
  const response = await apiClient.post<SendInvoiceEmailResult>(
    `${BASE_URL}/invoices/${id}/email`,
    to && to.length > 0 ? { to } : {},
  );
  return response.data;
}

export function getInvoicePdfUrl(id: string): string {
  return `${process.env.NEXT_PUBLIC_API_URL}${BASE_URL}/invoices/${id}/pdf`;
}

export function getInvoiceXmlUrl(id: string): string {
  return `${process.env.NEXT_PUBLIC_API_URL}${BASE_URL}/invoices/${id}/xml`;
}

export async function downloadInvoicePdf(id: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(`${BASE_URL}/invoices/${id}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
}

export async function downloadInvoiceXml(id: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(`${BASE_URL}/invoices/${id}/xml`, {
    responseType: 'blob',
  });
  return response.data;
}

/** PDF del acuse de cancelación. */
export async function downloadInvoiceAcuse(id: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(`${BASE_URL}/invoices/${id}/acuse`, {
    responseType: 'blob',
  });
  return response.data;
}

// ================================
// VENTAS POR FACTURAR (§7.3)
// ================================

export async function listInvoiceableSales(
  query: InvoiceableSalesQuery,
): Promise<PaginatedInvoiceableSales> {
  const qs = toQueryString({
    branchId: query.branchId,
    date: query.date,
    status: query.status,
    search: query.search,
    onlyFiscalReady: query.onlyFiscalReady,
    page: query.page,
    limit: query.limit,
  });
  const response = await apiClient.get<PaginatedInvoiceableSales>(
    `${BASE_URL}/invoiceable-sales${qs}`,
  );
  return response.data;
}

// ================================
// FACTURA GLOBAL (§5.3)
// ================================

export async function getGlobalDays(query: GlobalDaysQuery): Promise<GlobalDayStatus[]> {
  const qs = toQueryString({ branchId: query.branchId, from: query.from, to: query.to });
  const response = await apiClient.get<GlobalDayStatus[]>(`${BASE_URL}/global-invoices/days${qs}`);
  return response.data;
}

/** Solo lectura: incluidos, excluidos con motivo, bloqueadores, totales y `previewHash`. */
export async function previewGlobalInvoice(query: GlobalPreviewQuery): Promise<GlobalPreview> {
  const qs = toQueryString({
    branchId: query.branchId,
    date: query.date,
    conceptMode: query.conceptMode,
  });
  const response = await apiClient.get<GlobalPreview>(`${BASE_URL}/global-invoices/preview${qs}`);
  return response.data;
}

/** Crea y timbra la global del día (409 `CFDI_GLOBAL_PREVIEW_STALE` si cambió la selección). */
export async function createGlobalInvoice(data: CreateGlobalInvoiceDto): Promise<InvoiceDetail> {
  const response = await apiClient.post<InvoiceDetail>(`${BASE_URL}/global-invoices`, data);
  return response.data;
}

/** Desecha un intento `pending`/`error` sin UUID (libera los tickets del día). */
export async function discardGlobalInvoice(id: string): Promise<void> {
  await apiClient.post(`${BASE_URL}/global-invoices/${id}/discard`);
}

/**
 * Cancela con 04 y reemite la global sin los tickets facturados nominativamente
 * (§5.3.7). OJO: no responde la factura sino `{ state, invoice | null, ... }`.
 */
export async function reissueGlobalInvoice(id: string): Promise<GlobalReissueResult> {
  const response = await apiClient.post<GlobalReissueResult>(
    `${BASE_URL}/global-invoices/${id}/reissue`,
  );
  return response.data;
}

// ================================
// COMPLEMENTO DE PAGO (§5.4)
// ================================

/** Crea y timbra el CFDI P. Mismo `idempotencyKey` ⇒ 200 con el existente. */
export async function createPaymentComplement(
  data: CreatePaymentComplementDto,
): Promise<InvoiceDetail> {
  const response = await apiClient.post<InvoiceDetail>(`${BASE_URL}/payment-complements`, data);
  return response.data;
}

// ================================
// SUCURSAL: "Factura en v2 desde"
// ================================

export async function setBranchInvoicingSince(
  branchId: string,
  data: SetBranchInvoicingSinceDto,
): Promise<BranchInvoicingSinceResult> {
  const response = await apiClient.put<BranchInvoicingSinceResult>(
    `${BASE_URL}/branches/${branchId}/invoicing-since`,
    data,
  );
  return response.data;
}

// ================================
// CATALOGS
// ================================

export async function getPaymentForms(): Promise<CatalogItem[]> {
  const response = await apiClient.get<CatalogItem[]>(
    `${BASE_URL}/catalogs/payment-forms`
  );
  return response.data;
}

export interface CfdiUsesQuery {
  /** Código de régimen (ej. '612'): filtra por compatibilidad uso↔régimen. */
  regime?: string;
  personType?: PersonType;
}

/** Catálogo SAT desde BD (ya no llama al PAC). Formato dual code/Value. */
export async function getCfdiUses(query?: CfdiUsesQuery): Promise<SatCatalogItem[]> {
  const params = new URLSearchParams();
  if (query?.regime) params.append('regime', query.regime);
  if (query?.personType) params.append('personType', query.personType);
  const qs = params.toString();
  const response = await apiClient.get<SatCatalogItem[]>(
    `${BASE_URL}/catalogs/cfdi-uses${qs ? `?${qs}` : ''}`
  );
  return response.data;
}

export async function getFiscalRegimes(personType?: PersonType): Promise<SatCatalogItem[]> {
  const qs = personType ? `?personType=${personType}` : '';
  const response = await apiClient.get<SatCatalogItem[]>(
    `${BASE_URL}/catalogs/fiscal-regimes${qs}`
  );
  return response.data;
}

/** Búsqueda en el catálogo del PAC (c_ClaveProdServ / c_ClaveUnidad). Mínimo 3 caracteres. */
export async function searchSatCodes(
  kind: SatCodeKind,
  keyword: string
): Promise<SatCodeSearchResult[]> {
  const path = kind === 'product' ? 'product-codes' : 'unit-codes';
  const response = await apiClient.get<SatCodeSearchResult[]>(
    `${BASE_URL}/catalogs/${path}?keyword=${encodeURIComponent(keyword.trim())}`
  );
  return response.data;
}

// ================================
// PREPARACIÓN FISCAL (Fase 1)
// ================================

const READINESS_URL = `${BASE_URL}/readiness`;
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

export async function getReadiness(): Promise<BillingReadiness> {
  const response = await apiClient.get<BillingReadiness>(READINESS_URL);
  return response.data;
}

export async function listReadinessProducts(
  query?: ReadinessProductsQuery
): Promise<PaginatedReadiness<ReadinessProductRow>> {
  const params = new URLSearchParams();
  if (query?.missing) params.append('missing', query.missing);
  if (query?.search) params.append('search', query.search);
  if (query?.page) params.append('page', String(query.page));
  if (query?.limit) params.append('limit', String(query.limit));
  if (query?.includeInactive) params.append('includeInactive', 'true');
  const qs = params.toString();
  const response = await apiClient.get<PaginatedReadiness<ReadinessProductRow>>(
    `${READINESS_URL}/products${qs ? `?${qs}` : ''}`
  );
  return response.data;
}

export async function updateProductFiscal(
  id: string,
  data: UpdateProductFiscalDto
): Promise<ReadinessProductRow> {
  const response = await apiClient.patch<ReadinessProductRow>(
    `${READINESS_URL}/products/${id}/fiscal`,
    data
  );
  return response.data;
}

export async function importProductFiscal(
  file: File,
  dryRun: boolean
): Promise<ProductFiscalImportResult> {
  const form = new FormData();
  form.append('file', file);
  const response = await apiClient.post<ProductFiscalImportResult>(
    `${READINESS_URL}/products/import?dryRun=${dryRun ? 'true' : 'false'}`,
    form,
    MULTIPART
  );
  return response.data;
}

/** CSV con BOM: una fila por producto activo con lo que ya tenga. */
export async function downloadProductFiscalTemplate(): Promise<Blob> {
  const response = await apiClient.get<Blob>(`${READINESS_URL}/products/template`, {
    responseType: 'blob',
  });
  return response.data;
}

export async function listReadinessCustomers(
  query?: ReadinessCustomersQuery
): Promise<PaginatedReadiness<ReadinessCustomerRow>> {
  const params = new URLSearchParams();
  if (query?.issue) params.append('issue', query.issue);
  if (query?.search) params.append('search', query.search);
  if (query?.page) params.append('page', String(query.page));
  if (query?.limit) params.append('limit', String(query.limit));
  const qs = params.toString();
  const response = await apiClient.get<PaginatedReadiness<ReadinessCustomerRow>>(
    `${READINESS_URL}/customers${qs ? `?${qs}` : ''}`
  );
  return response.data;
}

export async function cleanInvalidRfc(dryRun: boolean): Promise<CleanRfcResult> {
  const response = await apiClient.post<CleanRfcResult>(
    `${READINESS_URL}/customers/clean-rfc?dryRun=${dryRun ? 'true' : 'false'}`
  );
  return response.data;
}

export async function listRfcDuplicates(query?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedRfcDuplicates> {
  const params = new URLSearchParams();
  if (query?.page) params.append('page', String(query.page));
  if (query?.limit) params.append('limit', String(query.limit));
  const qs = params.toString();
  const response = await apiClient.get<PaginatedRfcDuplicates>(
    `${READINESS_URL}/customers/duplicates${qs ? `?${qs}` : ''}`
  );
  return response.data;
}

export async function listReadinessPaymentMethods(): Promise<ReadinessPaymentMethod[]> {
  const response = await apiClient.get<ReadinessPaymentMethod[]>(
    `${READINESS_URL}/payment-methods`
  );
  return response.data;
}

export async function updatePaymentMethodFiscal(
  id: string,
  data: UpdatePaymentMethodFiscalDto
): Promise<ReadinessPaymentMethod> {
  const response = await apiClient.patch<ReadinessPaymentMethod>(
    `${READINESS_URL}/payment-methods/${id}`,
    data
  );
  return response.data;
}

export async function listReadinessBranches(): Promise<ReadinessBranch[]> {
  const response = await apiClient.get<ReadinessBranch[]>(`${READINESS_URL}/branches`);
  return response.data;
}

export async function updateBranchFiscal(
  id: string,
  data: UpdateBranchFiscalDto
): Promise<ReadinessBranch> {
  const response = await apiClient.patch<ReadinessBranch>(
    `${READINESS_URL}/branches/${id}`,
    data
  );
  return response.data;
}

export async function getEmitter(): Promise<EmitterConfig> {
  const response = await apiClient.get<EmitterConfig>(`${BASE_URL}/emitter`);
  return response.data;
}

export async function updateEmitter(data: UpdateEmitterDto): Promise<EmitterConfig> {
  const response = await apiClient.put<EmitterConfig>(`${BASE_URL}/emitter`, data);
  return response.data;
}

// ================================
// VALIDATION
// ================================

export async function validateRfc(rfc: string): Promise<RfcValidation> {
  const response = await apiClient.get<RfcValidation>(
    `${BASE_URL}/validate/rfc/${encodeURIComponent(rfc)}`
  );
  return response.data;
}

export interface FiscalDataValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export async function validateFiscalData(data: {
  rfc: string;
  legalName: string;
  fiscalRegime: string;
  postalCode: string;
  cfdiUse?: string;
  email?: string;
}): Promise<FiscalDataValidationResult> {
  const response = await apiClient.post<FiscalDataValidationResult>(
    `${BASE_URL}/validate/fiscal-data`,
    data
  );
  return response.data;
}

// ================================
// FACTURAMA DIRECT QUERIES
// ================================

export interface FacturamaCfdiItem {
  id: string;
  cfdiType: string;
  serie: string;
  folio: string;
  date: string;
  currency: string;
  subtotal: number;
  total: number;
  receiverName: string;
  receiverRfc: string;
  uuid: string;
  status: string;
  paymentMethod: string;
}

export interface FacturamaCfdisResponse {
  data: FacturamaCfdiItem[];
  total: number;
  page: number;
}

export interface FacturamaCfdisQuery {
  dateStart?: string;
  dateEnd?: string;
  status?: 'all' | 'active' | 'canceled' | 'pending';
  page?: number;
}

export async function listFacturamaCfdis(query?: FacturamaCfdisQuery): Promise<FacturamaCfdisResponse> {
  const params = new URLSearchParams();
  if (query?.dateStart) params.append('dateStart', query.dateStart);
  if (query?.dateEnd) params.append('dateEnd', query.dateEnd);
  if (query?.status) params.append('status', query.status);
  if (query?.page !== undefined) params.append('page', String(query.page));
  const qs = params.toString();
  const response = await apiClient.get<FacturamaCfdisResponse>(`${BASE_URL}/facturama-cfdis${qs ? `?${qs}` : ''}`);
  return response.data;
}

// ================================
// STATUS
// ================================

export async function getFacturamaStatus(): Promise<BillingStatus> {
  const response = await apiClient.get<BillingStatus>(`${BASE_URL}/status`);
  return response.data;
}

// ================================
// BILLING SERVICE OBJECT
// ================================

export const billingService = {
  // Fiscal Data
  listFiscalData,
  getFiscalData,
  createFiscalData,
  updateFiscalData,
  getFiscalDataByCustomer,

  // Invoices (Fase 2)
  createInvoice,
  listInvoices,
  getInvoice,
  stampInvoice,
  cancelInvoice,
  replaceInvoice,
  refreshInvoiceStatus,
  getInvoiceFiles,
  sendInvoiceEmail,
  getInvoicePdfUrl,
  getInvoiceXmlUrl,
  downloadInvoicePdf,
  downloadInvoiceXml,
  downloadInvoiceAcuse,

  // Ventas por facturar
  listInvoiceableSales,

  // Global
  getGlobalDays,
  previewGlobalInvoice,
  createGlobalInvoice,
  discardInvoice,
  resolveAmbiguousInvoice,
  discardGlobalInvoice,
  reissueGlobalInvoice,

  // Complemento de pago
  createPaymentComplement,

  // Sucursal
  setBranchInvoicingSince,

  // Catalogs
  getPaymentForms,
  getCfdiUses,
  getFiscalRegimes,
  searchSatCodes,

  // Preparación fiscal (Fase 1)
  getReadiness,
  listReadinessProducts,
  updateProductFiscal,
  importProductFiscal,
  downloadProductFiscalTemplate,
  listReadinessCustomers,
  cleanInvalidRfc,
  listRfcDuplicates,
  listReadinessPaymentMethods,
  updatePaymentMethodFiscal,
  listReadinessBranches,
  updateBranchFiscal,
  getEmitter,
  updateEmitter,

  // Validation
  validateRfc,
  validateFiscalData,

  // Facturama Direct
  listFacturamaCfdis,

  // Status
  getFacturamaStatus,
};

export default billingService;
