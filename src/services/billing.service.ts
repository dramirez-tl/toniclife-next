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
  GlobalInvoice,
  CreateGlobalInvoiceDto,
  PaymentComplement,
  CreatePaymentComplementDto,
  CancellationResponse,
  CatalogItem,
  RfcValidation,
  FacturamaBalance,
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

export interface FiscalDataWithCustomer extends FiscalData {
  customer?: {
    id: string;
    customerNumber: string;
    userId: string;
  };
}

export async function listFiscalData(query?: FiscalDataQueryDto): Promise<FiscalDataWithCustomer[]> {
  const params = new URLSearchParams();
  if (query?.validated !== undefined) params.append('validated', String(query.validated));
  if (query?.search) params.append('search', query.search);
  if (query?.limit) params.append('limit', String(query.limit));
  if (query?.offset) params.append('offset', String(query.offset));

  const url = `${BASE_URL}/fiscal-data${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await apiClient.get<FiscalDataWithCustomer[]>(url);
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

export async function listInvoices(query?: InvoiceQueryDto): Promise<Invoice[]> {
  const params = new URLSearchParams();
  if (query?.customerId) params.append('customerId', query.customerId);
  if (query?.orderId) params.append('orderId', query.orderId);
  if (query?.status) params.append('status', query.status);
  if (query?.startDate) params.append('startDate', query.startDate);
  if (query?.endDate) params.append('endDate', query.endDate);
  if (query?.limit) params.append('limit', String(query.limit));
  if (query?.offset) params.append('offset', String(query.offset));

  const url = `${BASE_URL}/invoices${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await apiClient.get<Invoice[]>(url);
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

export async function getCfdiUses(): Promise<CatalogItem[]> {
  const response = await apiClient.get<CatalogItem[]>(`${BASE_URL}/catalogs/cfdi-uses`);
  return response.data;
}

export async function getFiscalRegimes(): Promise<CatalogItem[]> {
  const response = await apiClient.get<CatalogItem[]>(
    `${BASE_URL}/catalogs/fiscal-regimes`
  );
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

// ================================
// STATUS
// ================================

export async function getFacturamaStatus(): Promise<FacturamaBalance> {
  const response = await apiClient.get<FacturamaBalance>(`${BASE_URL}/status`);
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

  // Validation
  validateRfc,

  // Status
  getFacturamaStatus,
};

export default billingService;
