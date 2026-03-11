// billing.ts - Tipos para facturación CFDI
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.5 Facturación

// ================================
// ENUMS
// ================================

export enum InvoiceStatus {
  PENDING = 'pending',
  STAMPED = 'stamped',
  SENT = 'sent',
  CANCELLED = 'cancelled',
  CANCELLATION_PENDING = 'cancellation_pending',
  ERROR = 'error',
}

export enum CfdiType {
  INGRESO = 'I',
  EGRESO = 'E',
  PAGO = 'P',
  TRASLADO = 'T',
}

export enum PaymentMethod {
  PUE = 'PUE', // Pago en Una sola Exhibición
  PPD = 'PPD', // Pago en Parcialidades o Diferido
}

// ================================
// FISCAL DATA
// ================================

export interface FiscalData {
  id: string;
  customerId: string;
  rfc: string;
  legalName: string;
  taxRegime: string;
  postalCode: string;
  street?: string;
  exteriorNumber?: string;
  interiorNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  email: string;
  defaultCfdiUse: string;
  paymentFormCode?: string;
  facturamaClientId?: string;
  isDefault: boolean;
  isValidated: boolean;
  validatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFiscalDataDto {
  customerId: string;
  rfc: string;
  legalName: string;
  fiscalRegime: string;
  postalCode: string;
  cfdiUse?: string;
  paymentFormCode?: string;
  email?: string;
}

export interface UpdateFiscalDataDto {
  rfc?: string;
  legalName?: string;
  fiscalRegime?: string;
  postalCode?: string;
  cfdiUse?: string;
  paymentFormCode?: string;
  email?: string;
  street?: string;
  exteriorNumber?: string;
  interiorNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

// ================================
// INVOICES
// ================================

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productCode: string;
  unitCode: string;
  sku?: string;
  identificationNumber?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  discount?: string;
  taxBase?: string;
  taxRate?: string;
  taxAmount?: string;
  taxType?: string;
  taxObject: string;
  sortOrder: number;
  createdAt: string;
}

export interface Invoice {
  id: string;
  orderId: string;
  fiscalDataId?: string;
  uuid?: string;
  series?: string;
  folio?: string;
  invoiceType: CfdiType;
  cfdiUse: string;
  paymentMethod: PaymentMethod;
  paymentForm: string;
  paymentConditions?: string;
  issuerRfc: string;
  issuerName: string;
  issuerTaxRegime: string;
  issuerPostalCode: string;
  receiverRfc: string;
  receiverName: string;
  receiverTaxRegime: string;
  receiverPostalCode: string;
  receiverEmail?: string;
  currency: string;
  exchangeRate: string;
  subtotal: string;
  discount: string;
  taxAmount: string;
  total: string;
  taxes?: unknown;
  pdfUrl?: string;
  xmlUrl?: string;
  pdfStoragePath?: string;
  xmlStoragePath?: string;
  status: InvoiceStatus;
  facturamaId?: string;
  facturamaResponse?: unknown;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  lastRetryAt?: string;
  cancellationReason?: string;
  cancellationUuid?: string;
  cancelledAt?: string;
  cancelledById?: string;
  stampedAt?: string;
  sentAt?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceItem[];
  order?: {
    orderNumber: string;
    customerId: string;
  };
  fiscalData?: FiscalData;
}

export interface CreateInvoiceDto {
  orderId: string;
  fiscalDataId?: string;
  cfdiUse?: string;
  paymentMethod?: PaymentMethod;
  paymentForm?: string;
  sendEmail?: boolean;
}

export interface CancelInvoiceDto {
  reason: string; // '01', '02', '03', '04'
  replacementUuid?: string;
}

export interface InvoiceQueryDto {
  customerId?: string;
  orderId?: string;
  branchId?: string;
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedInvoices {
  data: Invoice[];
  total: number;
  stats: Record<string, number>;
}

// ================================
// GLOBAL INVOICES
// ================================

export interface GlobalInvoice {
  id: string;
  periodicity: string;
  month: string;
  year: number;
  invoiceId?: string;
  totalOrders: number;
  subtotal: string;
  taxAmount: string;
  total: string;
  status: string;
  processedAt?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  invoice?: Invoice;
  orders?: GlobalInvoiceOrder[];
}

export interface GlobalInvoiceOrder {
  id: string;
  globalInvoiceId: string;
  orderId: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  createdAt: string;
  order?: {
    orderNumber: string;
    customerId: string;
  };
}

export interface CreateGlobalInvoiceDto {
  periodicity: string; // '01'=Diario, '02'=Semanal, '03'=Quincenal, '04'=Mensual, '05'=Bimestral
  month: string; // '01' a '12'
  year: string;
  branchId?: string;
  orderIds?: string[];
  saleIds?: string[];
  paymentForm?: string;   // SAT payment form code (default '01' Efectivo)
  paymentMethod?: string; // PUE or PPD (default PUE)
}

// ================================
// PAYMENT COMPLEMENTS
// ================================

export interface PaymentComplement {
  id: string;
  originalInvoiceId: string;
  complementInvoiceId?: string;
  paymentDate: string;
  paymentForm: string;
  currency: string;
  exchangeRate: string;
  amount: string;
  operationNumber?: string;
  sourceBankRfc?: string;
  sourceAccount?: string;
  targetBankRfc?: string;
  targetAccount?: string;
  relatedDocuments?: unknown;
  status: string;
  errorMessage?: string;
  stampedAt?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  originalInvoice?: Invoice;
}

export interface PaymentComplementItemDto {
  invoiceUuid: string;
  amountPaid: number;
  partialityNumber: number;
}

export interface CreatePaymentComplementDto {
  paymentDate: string;
  paymentForm: string;
  amount: number;
  invoices: PaymentComplementItemDto[];
  currency?: string;
}

// ================================
// CANCELLATION
// ================================

export interface CancellationResponse {
  invoiceId: string;
  uuid: string;
  status: string;
  message: string;
  cancelledAt?: string;
}

// ================================
// CATALOGS
// ================================

export interface CatalogItem {
  Value: string;
  Name: string;
}

export interface RfcValidation {
  IsValid: boolean;
  Message: string;
}

export interface FacturamaBalance {
  Balance: number;
  configured: boolean;
  error?: string;
}

// ================================
// HELPERS
// ================================

export const PAYMENT_FORMS: CatalogItem[] = [
  { Value: '01', Name: 'Efectivo' },
  { Value: '02', Name: 'Cheque nominativo' },
  { Value: '03', Name: 'Transferencia electrónica de fondos' },
  { Value: '04', Name: 'Tarjeta de crédito' },
  { Value: '28', Name: 'Tarjeta de débito' },
  { Value: '99', Name: 'Por definir' },
];

export const CFDI_USES: CatalogItem[] = [
  { Value: 'G01', Name: 'Adquisición de mercancías' },
  { Value: 'G02', Name: 'Devoluciones, descuentos o bonificaciones' },
  { Value: 'G03', Name: 'Gastos en general' },
  { Value: 'I01', Name: 'Construcciones' },
  { Value: 'I02', Name: 'Mobiliario y equipo de oficina' },
  { Value: 'I03', Name: 'Equipo de transporte' },
  { Value: 'I04', Name: 'Equipo de cómputo' },
  { Value: 'D01', Name: 'Honorarios médicos y gastos hospitalarios' },
  { Value: 'D02', Name: 'Gastos médicos por incapacidad' },
  { Value: 'D03', Name: 'Gastos funerales' },
  { Value: 'D04', Name: 'Donativos' },
  { Value: 'S01', Name: 'Sin efectos fiscales' },
  { Value: 'CP01', Name: 'Pagos' },
];

export const FISCAL_REGIMES: CatalogItem[] = [
  { Value: '601', Name: 'General de Ley Personas Morales' },
  { Value: '603', Name: 'Personas Morales con Fines no Lucrativos' },
  { Value: '605', Name: 'Sueldos y Salarios' },
  { Value: '606', Name: 'Arrendamiento' },
  { Value: '608', Name: 'Demás ingresos' },
  { Value: '612', Name: 'Personas Físicas con Actividades Empresariales' },
  { Value: '616', Name: 'Sin obligaciones fiscales' },
  { Value: '621', Name: 'Incorporación Fiscal' },
  { Value: '626', Name: 'Régimen Simplificado de Confianza (RESICO)' },
];

export const CANCELLATION_REASONS: CatalogItem[] = [
  { Value: '01', Name: 'Comprobante emitido con errores con relación' },
  { Value: '02', Name: 'Comprobante emitido con errores sin relación' },
  { Value: '03', Name: 'No se llevó a cabo la operación' },
  { Value: '04', Name: 'Operación nominativa relacionada en factura global' },
];

export const PERIODICITIES: CatalogItem[] = [
  { Value: '01', Name: 'Diario' },
  { Value: '02', Name: 'Semanal' },
  { Value: '03', Name: 'Quincenal' },
  { Value: '04', Name: 'Mensual' },
  { Value: '05', Name: 'Bimestral' },
];

// Status labels and colors
export const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string }> = {
  [InvoiceStatus.PENDING]: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-800',
  },
  [InvoiceStatus.STAMPED]: {
    label: 'Timbrada',
    color: 'bg-green-100 text-green-800',
  },
  [InvoiceStatus.SENT]: {
    label: 'Enviada',
    color: 'bg-blue-100 text-blue-800',
  },
  [InvoiceStatus.CANCELLED]: {
    label: 'Cancelada',
    color: 'bg-red-100 text-red-800',
  },
  [InvoiceStatus.CANCELLATION_PENDING]: {
    label: 'Cancelación Pendiente',
    color: 'bg-orange-100 text-orange-800',
  },
  [InvoiceStatus.ERROR]: {
    label: 'Error',
    color: 'bg-red-100 text-red-800',
  },
};

// Format helpers
export function formatInvoiceNumber(series?: string, folio?: string): string {
  if (!series && !folio) return '-';
  return `${series || ''}${folio || ''}`;
}

export function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
  });
}

export function getCfdiUseName(code: string): string {
  const item = CFDI_USES.find((c) => c.Value === code);
  return item?.Name || code;
}

export function getPaymentFormName(code: string): string {
  const item = PAYMENT_FORMS.find((p) => p.Value === code);
  return item?.Name || code;
}

export function getFiscalRegimeName(code: string): string {
  const item = FISCAL_REGIMES.find((r) => r.Value === code);
  return item?.Name || code;
}
