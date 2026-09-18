// billing.service.ts - Servicio de facturación CFDI
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.5 Facturación

import { apiClient } from '@/lib/api-client';
import type {
  FiscalData,
  CreateFiscalDataDto,
  UpdateFiscalDataDto,
  Invoice,
  CreateInvoiceDto,
  CancelInvoiceDto,
  InvoiceQueryDto,
  PaginatedInvoices,
  GlobalInvoice,
  CreateGlobalInvoiceDto,
  PaymentComplement,
  CreatePaymentComplementDto,
  CancellationResponse,
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
// INVOICES
// ================================

export async function createInvoice(data: CreateInvoiceDto): Promise<Invoice> {
  const response = await apiClient.post<Invoice>(`${BASE_URL}/invoices`, data);
  return response.data;
}

export async function listInvoices(query?: InvoiceQueryDto): Promise<PaginatedInvoices> {
  const params = new URLSearchParams();
  if (query?.customerId) params.append('customerId', query.customerId);
  if (query?.orderId) params.append('orderId', query.orderId);
  if (query?.branchId) params.append('branchId', query.branchId);
  if (query?.status) params.append('status', query.status);
  if (query?.startDate) params.append('startDate', query.startDate);
  if (query?.endDate) params.append('endDate', query.endDate);
  if (query?.limit) params.append('limit', String(query.limit));
  if (query?.offset) params.append('offset', String(query.offset));

  const url = `${BASE_URL}/invoices${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await apiClient.get<PaginatedInvoices>(url);
  return response.data;
}

export async function getInvoice(id: string): Promise<Invoice> {
  const response = await apiClient.get<Invoice>(`${BASE_URL}/invoices/${id}`);
  return response.data;
}

export async function stampInvoice(id: string, sendEmail = false): Promise<Invoice> {
  const response = await apiClient.post<Invoice>(
    `${BASE_URL}/invoices/${id}/stamp?sendEmail=${sendEmail}`
  );
  return response.data;
}

export async function cancelInvoice(
  id: string,
  data: CancelInvoiceDto
): Promise<CancellationResponse> {
  const response = await apiClient.post<CancellationResponse>(
    `${BASE_URL}/invoices/${id}/cancel`,
    data
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

// ================================
// GLOBAL INVOICES
// ================================

export async function createGlobalInvoice(
  data: CreateGlobalInvoiceDto
): Promise<GlobalInvoice> {
  const response = await apiClient.post<GlobalInvoice>(
    `${BASE_URL}/global-invoices`,
    data
  );
  return response.data;
}

export async function getGlobalInvoice(id: string): Promise<GlobalInvoice> {
  const response = await apiClient.get<GlobalInvoice>(
    `${BASE_URL}/global-invoices/${id}`
  );
  return response.data;
}

export async function stampGlobalInvoice(id: string): Promise<GlobalInvoice> {
  const response = await apiClient.post<GlobalInvoice>(
    `${BASE_URL}/global-invoices/${id}/stamp`
  );
  return response.data;
}

// ================================
// PAYMENT COMPLEMENTS
// ================================

export async function createPaymentComplement(
  data: CreatePaymentComplementDto
): Promise<PaymentComplement> {
  const response = await apiClient.post<PaymentComplement>(
    `${BASE_URL}/payment-complements`,
    data
  );
  return response.data;
}

export async function getPaymentComplement(id: string): Promise<PaymentComplement> {
  const response = await apiClient.get<PaymentComplement>(
    `${BASE_URL}/payment-complements/${id}`
  );
  return response.data;
}

export async function stampPaymentComplement(id: string): Promise<PaymentComplement> {
  const response = await apiClient.post<PaymentComplement>(
    `${BASE_URL}/payment-complements/${id}/stamp`
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

  // Invoices
  createInvoice,
  listInvoices,
  getInvoice,
  stampInvoice,
  cancelInvoice,
  getInvoicePdfUrl,
  getInvoiceXmlUrl,
  downloadInvoicePdf,
  downloadInvoiceXml,

  // Global Invoices
  createGlobalInvoice,
  getGlobalInvoice,
  stampGlobalInvoice,

  // Payment Complements
  createPaymentComplement,
  getPaymentComplement,
  stampPaymentComplement,

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
