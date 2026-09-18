// billing.ts - Tipos para facturación CFDI
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.5 Facturación

// ================================
// ENUMS
// ================================

export enum InvoiceStatus {
  PENDING = 'pending',
  /** Timbrado en curso: el API reclamó la factura ante el PAC (candado). */
  STAMPING = 'stamping',
  STAMPED = 'stamped',
  SENT = 'sent',
  CANCELLED = 'cancelled',
  /** El SAT aceptó la solicitud pero la cancelación NO está confirmada
   *  (espera la aceptación del receptor). Valor real de invoices.provider_status. */
  CANCEL_PENDING = 'cancel_pending',
  /** @deprecated Nombre anterior; la BD nunca lo guardó. Usa CANCEL_PENDING. */
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

/**
 * Respuesta de POST /billing/invoices/:id/cancel.
 *
 * `status`/`message` son el texto CRUDO del PAC ("Cancelado", "canceled",
 * "Cancelacion aceptada"...): NO sirven para decidir nada. El API ya resuelve
 * el resultado en `providerStatus` + `confirmed`; usa esos dos.
 */
export interface CancellationResponse {
  invoiceId: string;
  uuid: string;
  /** Texto crudo del PAC, solo informativo. */
  status: string;
  message: string;
  /** 'cancelled' = confirmada por el SAT; 'cancel_pending' = en proceso. */
  providerStatus?: 'cancelled' | 'cancel_pending';
  /** true solo cuando el SAT dio la cancelación por aceptada. */
  confirmed?: boolean;
  /** Detalle legible del estatus devuelto por el PAC. */
  statusDetail?: string;
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

/**
 * GET /billing/status — estado real del PAC (no solo "hay credenciales en env").
 * `facturamaReachable=false` + `error` cuando la consulta de saldo truena.
 */
export interface BillingStatus {
  configured: boolean;
  environment: 'sandbox' | 'production' | null;
  /** Nombre real del campo en el API (billing.service.ts getFacturamaBalance). */
  issuerRfc: string | null;
  /** Alias tolerado por si el API se alinea al nombre del banner. */
  issuerRfcMasked?: string | null;
  facturamaReachable: boolean;
  /** Saldo de timbres; null cuando el PAC no respondió. */
  stampBalance: number | null;
  /** Alias tolerado del saldo. */
  balance?: number | null;
  error: string | null;
  /** Flujos de facturación v2 (factura de pedido, global, complemento). */
  v2FlowsEnabled?: boolean;
  /** Compat con el contrato anterior (Balance = -1 cuando el PAC no responde). */
  Balance?: number;
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

/**
 * @deprecated Lista quemada e incompleta. Usa el catálogo del API
 * (`useCfdiUses(regime)` de `useBilling.ts`) y `cfdiUseLabel(code, catalog)`.
 * Se conserva solo como respaldo mientras el catálogo carga.
 */
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

/**
 * @deprecated Lista quemada (9 de 23 regímenes). Usa el catálogo del API
 * (`useFiscalRegimes(personType)` de `useBilling.ts`) y
 * `fiscalRegimeLabel(code, catalog)`. Se conserva solo como respaldo.
 */
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
  [InvoiceStatus.STAMPING]: {
    label: 'Timbrando…',
    color: 'bg-yellow-100 text-yellow-800',
  },
  [InvoiceStatus.CANCEL_PENDING]: {
    label: 'Cancelación en proceso',
    color: 'bg-orange-100 text-orange-800',
  },
  [InvoiceStatus.CANCELLATION_PENDING]: {
    label: 'Cancelación en proceso',
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

/** @deprecated Usa `cfdiUseLabel(code, catalog)` con el catálogo del API. */
export function getCfdiUseName(code: string): string {
  const item = CFDI_USES.find((c) => c.Value === code);
  return item?.Name || code;
}

export function getPaymentFormName(code: string): string {
  const item =
    PAYMENT_FORMS.find((p) => p.Value === code) ??
    SAT_PAYMENT_FORMS.find((p) => p.Value === code);
  return item?.Name || code;
}

/** @deprecated Usa `fiscalRegimeLabel(code, catalog)` con el catálogo del API. */
export function getFiscalRegimeName(code: string): string {
  const item = FISCAL_REGIMES.find((r) => r.Value === code);
  return item?.Name || code;
}

// ================================
// PREPARACIÓN FISCAL (Fase 1)
// ================================
// Contrato: fase1-contract.md → "API — endpoints nuevos". Todo camelCase.

/** Tipo de persona según la longitud del RFC (12 = moral, 13 = física). */
export type PersonType = 'fisica' | 'moral';

/**
 * Elemento de los catálogos SAT servidos desde BD
 * (`/billing/catalogs/fiscal-regimes` y `/cfdi-uses`). Trae el formato nuevo
 * (`code`/`description`) y el viejo (`Value`/`Name`) por compatibilidad con el
 * POS Electron.
 */
export interface SatCatalogItem {
  code: string;
  description: string;
  appliesToFisica?: boolean;
  appliesToMoral?: boolean;
  Value: string;
  Name: string;
}

/** Resultado de `/billing/catalogs/product-codes|unit-codes?keyword=`. */
export interface SatCodeSearchResult {
  code: string;
  description: string;
  complement?: string;
}

export type SatCodeKind = 'product' | 'unit';

// --- Estado general ---

export type EmitterSource = 'db' | 'env' | 'none';

export interface ReadinessEmitter {
  configured: boolean;
  source: EmitterSource;
  legalName: string | null;
  rfcMasked: string | null;
  taxRegimeCode: string | null;
  expeditionZip: string | null;
  envRfcMatches: boolean | null;
}

export interface ReadinessFacturama {
  configured: boolean;
  environment: 'production' | 'sandbox' | null;
  reachable: boolean;
}

export interface ReadinessProducts {
  active: number;
  missingSatProductCode: number;
  missingSatUnitCode: number;
  missingTaxRule: number;
  ready: number;
}

export interface ReadinessCustomers {
  withRfc: number;
  invalidRfc: number;
  duplicateRfc: number;
  missingRegime: number;
  missingZip: number;
  missingLegalName: number;
  missingEmail: number;
  incompatibleUse: number;
  ready: number;
}

export interface ReadinessPaymentMethods {
  active: number;
  missingSatForm: number;
  missingSatMethod: number;
}

export interface ReadinessBranches {
  activeMx: number;
  missingZip: number;
  missingTaxRule: number;
  borderWith16: string[];
}

/** GET /billing/readiness */
export interface BillingReadiness {
  emitter: ReadinessEmitter;
  facturama: ReadinessFacturama;
  products: ReadinessProducts;
  customers: ReadinessCustomers;
  paymentMethods: ReadinessPaymentMethods;
  branches: ReadinessBranches;
  blockers: string[];
  generatedAt: string;
}

export interface PaginatedReadiness<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// --- Productos ---

export type ProductMissingFilter = 'sat' | 'tax' | 'any' | 'none';

export interface ReadinessProductsQuery {
  missing?: ProductMissingFilter;
  search?: string;
  page?: number;
  limit?: number;
  includeInactive?: boolean;
}

export interface ReadinessProductRow {
  id: string;
  sku: string;
  name: string;
  productType: string;
  satProductCode: string | null;
  satUnitCode: string | null;
  taxRuleId: string | null;
  taxRuleName: string | null;
  taxRate: number | null;
  isTaxExempt: boolean;
  isActive: boolean;
  ready: boolean;
}

/** PATCH /billing/readiness/products/:id/fiscal — `taxRuleId: null` quita la regla. */
export interface UpdateProductFiscalDto {
  satProductCode?: string;
  satUnitCode?: string;
  taxRuleId?: string | null;
  isTaxExempt?: boolean;
}

export type ProductFiscalInvalidKind = 'product' | 'unit' | 'taxRule';

export interface ProductFiscalImportError {
  row: number;
  sku: string;
  message: string;
}

/** POST /billing/readiness/products/import?dryRun= */
export interface ProductFiscalImportResult {
  total: number;
  matched: number;
  unmatchedSkus: string[];
  invalidCodes: { code: string; kind: ProductFiscalInvalidKind }[];
  toUpdate: number;
  applied: number;
  errors: ProductFiscalImportError[];
  dryRun: boolean;
}

// --- Clientes ---

export type CustomerFiscalIssue =
  | 'invalid_rfc'
  | 'duplicate_rfc'
  | 'missing_regime'
  | 'missing_zip'
  | 'missing_legal_name'
  | 'missing_email'
  | 'incompatible_use';

export type CustomerIssueFilter = CustomerFiscalIssue | 'any' | 'ready';

export interface ReadinessCustomersQuery {
  issue?: CustomerIssueFilter;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ReadinessCustomerRow {
  customerId: string;
  code: string | null;
  name: string;
  rfc: string;
  legalName: string | null;
  taxRegime: string | null;
  taxRegimeDescription: string | null;
  cfdiUseCode: string | null;
  fiscalZipCode: string | null;
  fiscalEmail: string | null;
  email: string | null;
  issues: CustomerFiscalIssue[];
  ready: boolean;
}

/** POST /billing/readiness/customers/clean-rfc?dryRun= */
export interface CleanRfcResult {
  dryRun: boolean;
  affected: number;
  sample: { customerId: string; code: string | null; rfcMasked: string }[];
}

export interface RfcDuplicateGroup {
  rfc: string;
  count: number;
  customers: { customerId: string; code: string | null; name: string }[];
}

export interface PaginatedRfcDuplicates {
  data: RfcDuplicateGroup[];
  total: number;
}

// --- Formas de pago ---

export type SatPaymentMethodCode = 'PUE' | 'PPD';

export interface ReadinessPaymentMethod {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  availableForPos: boolean;
  satPaymentFormCode: string | null;
  satPaymentFormName: string | null;
  satPaymentMethodCode: SatPaymentMethodCode | null;
  ready: boolean;
}

export interface UpdatePaymentMethodFiscalDto {
  satPaymentFormCode?: string;
  satPaymentMethodCode?: SatPaymentMethodCode;
}

// --- Sucursales ---

export type BranchFiscalIssue = 'missing_zip' | 'missing_tax_rule' | 'border_with_16';

export interface ReadinessBranchTaxRule {
  id: string;
  code: string;
  name: string;
  rate: number;
}

export interface ReadinessBranch {
  id: string;
  code: string;
  name: string;
  addressZip: string | null;
  zipValid: boolean;
  taxRules: ReadinessBranchTaxRule[];
  borderZone: boolean;
  issues: BranchFiscalIssue[];
}

export interface UpdateBranchFiscalDto {
  addressZip?: string;
  ivaTaxRuleId?: string;
}

// --- Emisor ---

/** GET/PUT /billing/emitter */
export interface EmitterConfig {
  source: EmitterSource;
  legalName: string | null;
  rfcMasked: string | null;
  taxRegimeCode: string | null;
  expeditionZip: string | null;
  fiscalZip: string | null;
  email: string | null;
  phone: string | null;
  envRfcMatches: boolean | null;
  sandboxMode: boolean | null;
  /** Opcional (si el API lo manda): el RFC guardado coincide con la cuenta del PAC. */
  pacRfcMatches?: boolean | null;
  /** Opcional: razón social registrada en la cuenta de Facturama. */
  pacLegalName?: string | null;
}

export interface UpdateEmitterDto {
  legalName: string;
  rfc: string;
  taxRegimeCode: string;
  expeditionZip: string;
  fiscalZip?: string;
  email?: string;
  phone?: string;
}

// --- Catálogos estáticos y etiquetas ---

/** c_FormaPago completo (mismo conjunto que valida el API). */
export const SAT_PAYMENT_FORMS: CatalogItem[] = [
  { Value: '01', Name: 'Efectivo' },
  { Value: '02', Name: 'Cheque nominativo' },
  { Value: '03', Name: 'Transferencia electrónica de fondos' },
  { Value: '04', Name: 'Tarjeta de crédito' },
  { Value: '05', Name: 'Monedero electrónico' },
  { Value: '06', Name: 'Dinero electrónico' },
  { Value: '08', Name: 'Vales de despensa' },
  { Value: '12', Name: 'Dación en pago' },
  { Value: '13', Name: 'Pago por subrogación' },
  { Value: '14', Name: 'Pago por consignación' },
  { Value: '15', Name: 'Condonación' },
  { Value: '17', Name: 'Compensación' },
  { Value: '23', Name: 'Novación' },
  { Value: '24', Name: 'Confusión' },
  { Value: '25', Name: 'Remisión de deuda' },
  { Value: '26', Name: 'Prescripción o caducidad' },
  { Value: '27', Name: 'A satisfacción del acreedor' },
  { Value: '28', Name: 'Tarjeta de débito' },
  { Value: '29', Name: 'Tarjeta de servicios' },
  { Value: '30', Name: 'Aplicación de anticipos' },
  { Value: '31', Name: 'Intermediario pagos' },
  { Value: '99', Name: 'Por definir' },
];

export const SAT_PAYMENT_METHODS: { Value: SatPaymentMethodCode; Name: string }[] = [
  { Value: 'PUE', Name: 'PUE — Pago en una sola exhibición' },
  { Value: 'PPD', Name: 'PPD — Pago en parcialidades o diferido' },
];

/** Unidades sugeridas arriba del buscador (lo que más se factura). */
export const SUGGESTED_SAT_UNITS: SatCodeSearchResult[] = [
  { code: 'H87', description: 'Pieza' },
  { code: 'E48', description: 'Unidad de servicio' },
];

/**
 * Qué significa cada faltante de cliente y por qué bloquea la factura.
 * Texto para Contabilidad: una línea por concepto.
 */
export const CUSTOMER_ISSUE_INFO: Record<CustomerFiscalIssue, { label: string; why: string }> = {
  invalid_rfc: {
    label: 'RFC inválido',
    why: 'El RFC no cumple el formato del SAT (12 o 13 caracteres): el PAC rechaza el timbrado.',
  },
  duplicate_rfc: {
    label: 'RFC repetido',
    why: 'El mismo RFC está en más de un cliente: hay que decidir a cuál pertenece antes de facturar.',
  },
  missing_regime: {
    label: 'Sin régimen fiscal',
    why: 'CFDI 4.0 exige el régimen del receptor; sin él el SAT no acepta la factura.',
  },
  missing_zip: {
    label: 'Sin CP fiscal',
    why: 'El código postal del domicilio fiscal es obligatorio en CFDI 4.0 y debe coincidir con la constancia.',
  },
  missing_legal_name: {
    label: 'Sin razón social',
    why: 'El nombre debe ir exactamente como en la constancia de situación fiscal (mayúsculas, sin régimen societario).',
  },
  missing_email: {
    label: 'Sin correo fiscal',
    why: 'No bloquea el timbrado, pero sin correo no se puede enviar el PDF/XML al cliente.',
  },
  incompatible_use: {
    label: 'Uso de CFDI incompatible',
    why: 'El uso capturado no está permitido para el régimen del cliente: el SAT lo rechaza.',
  },
};

export const CUSTOMER_ISSUE_ORDER: CustomerFiscalIssue[] = [
  'invalid_rfc',
  'duplicate_rfc',
  'missing_regime',
  'missing_zip',
  'missing_legal_name',
  'missing_email',
  'incompatible_use',
];

export const BRANCH_ISSUE_INFO: Record<BranchFiscalIssue, { label: string; why: string }> = {
  missing_zip: {
    label: 'Sin CP',
    why: 'El lugar de expedición del CFDI es el CP de la sucursal; sin él no se puede timbrar lo que venda.',
  },
  missing_tax_rule: {
    label: 'Sin regla IVA',
    why: 'Sin tasa de IVA asignada el POS no puede desglosar impuestos y la factura sale mal.',
  },
  border_with_16: {
    label: 'Frontera con 16%',
    why: 'La sucursal está en franja fronteriza pero tiene IVA 16%; revisa si aplica el estímulo del 8%.',
  },
};

// --- Helpers de RFC y claves SAT ---

const RFC_REGEX = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
export const GENERIC_RFCS = ['XAXX010101000', 'XEXX010101000'];

/** Formato de RFC (mismo criterio que el API); acepta los genéricos. */
export function isValidRfc(rfc: string): boolean {
  const value = rfc.trim().toUpperCase();
  return GENERIC_RFCS.includes(value) || RFC_REGEX.test(value);
}

/** Tipo de persona por longitud del RFC; `null` si el RFC no tiene forma aún. */
export function rfcPersonType(rfc: string): PersonType | null {
  const value = rfc.trim().toUpperCase();
  if (value.length === 12) return 'moral';
  if (value.length === 13) return 'fisica';
  return null;
}

/** c_ClaveProdServ = 8 dígitos. */
export function isValidSatProductCode(code: string): boolean {
  return /^[0-9]{8}$/.test(code.trim());
}

/** c_ClaveUnidad = 2 o 3 alfanuméricos en mayúsculas. */
export function isValidSatUnitCode(code: string): boolean {
  return /^[A-Z0-9]{2,3}$/.test(code.trim().toUpperCase());
}

export function isValidZip(zip: string): boolean {
  return /^[0-9]{5}$/.test(zip.trim());
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** `code — description` desde el catálogo del API; si no está, el código. */
export function fiscalRegimeLabel(
  code: string | null | undefined,
  catalog: SatCatalogItem[] | undefined,
): string {
  if (!code) return '';
  const item = catalog?.find((r) => r.code === code || r.Value === code);
  return item ? `${item.code || item.Value} — ${item.description || item.Name}` : code;
}

export function cfdiUseLabel(
  code: string | null | undefined,
  catalog: SatCatalogItem[] | undefined,
): string {
  if (!code) return '';
  const item = catalog?.find((u) => u.code === code || u.Value === code);
  return item ? `${item.code || item.Value} — ${item.description || item.Name}` : code;
}

/** Opciones `{ value, label }` para SearchableSelect a partir del catálogo. */
export function satCatalogOptions(
  catalog: SatCatalogItem[] | undefined,
): { value: string; label: string }[] {
  return (catalog ?? []).map((item) => ({
    value: item.code || item.Value,
    label: `${item.code || item.Value} — ${item.description || item.Name}`,
  }));
}
