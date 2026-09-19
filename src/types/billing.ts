// billing.ts - Tipos para facturación CFDI
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.5 Facturación

// ================================
// ENUMS
// ================================

export enum InvoiceStatus {
  PENDING = 'pending',
  /** Timbrado en curso: el API reclamó la factura ante el PAC (candado 3 min). */
  STAMPING = 'stamping',
  STAMPED = 'stamped',
  /** Valor del CHECK; la Fase 2 ya no lo escribe (el correo se registra aparte). */
  SENT = 'sent',
  ERROR = 'error',
  /** El SAT aceptó la solicitud pero la cancelación NO está confirmada
   *  (espera la aceptación del receptor). Valor real de invoices.provider_status. */
  CANCEL_PENDING = 'cancel_pending',
  CANCELLED = 'cancelled',
}

/** @deprecated Usa `SatPaymentMethodCode` ('PUE' | 'PPD'). */
export enum PaymentMethod {
  PUE = 'PUE',
  PPD = 'PPD',
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
}

// ================================
// INVOICES (Fase 2 — contrato §7.1 / §7.2, DTOs camelCase del API)
// ================================

/** `invoices.invoice_type` (CHECK real de la mig 141). */
export type InvoiceType =
  | 'sale'
  | 'global'
  | 'payment'
  | 'commission'
  | 'weekly_bonus'
  | 'cedea'
  | 'credit_note'
  | 'payroll';

/** `invoices.cfdi_type` (CHECK real). */
export type CfdiKind = 'ingreso' | 'egreso' | 'traslado' | 'nomina' | 'pago';

/** Último estatus consultado ante el SAT (`invoices.sat_status`). */
export type SatStatus = 'vigente' | 'cancelado' | 'no_encontrado';

export type GlobalReissueState = 'none' | 'pending_reissue' | 'reissued';
export type GlobalConceptMode = 'ticket' | 'product';
export type CancellationReason = '01' | '02' | '03' | '04';
export type TaxObject = '01' | '02';
export type TaxFactorType = 'Tasa' | 'Exento';

/** Impuesto enviado por concepto (`invoice_items.tax_breakdown`). */
export interface InvoiceTax {
  taxCode: string;
  factorType: TaxFactorType;
  rate: number;
  base: number;
  amount: number;
}

export interface InvoiceItemDto {
  lineNumber: number;
  sku: string | null;
  description: string;
  identificationNumber: string | null;
  satProductCode: string | null;
  satUnitCode: string | null;
  unitName: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  discount: number;
  taxObject: TaxObject;
  taxes: InvoiceTax[];
  total: number;
  posSaleId: string | null;
}

/** Fila del listado `GET /billing/invoices` (contrato §7.1). */
export interface InvoiceSummary {
  id: string;
  invoiceNumber: string | null;
  providerSerie: string | null;
  providerFolio: string | null;
  /** "serie-folio" | folio | invoiceNumber (lo arma el API). */
  folioDisplay: string;
  satUuid: string | null;
  invoiceType: InvoiceType;
  cfdiType: CfdiKind;
  providerStatus: InvoiceStatus;
  satStatus: SatStatus | null;
  receiverRfc: string | null;
  receiverName: string | null;
  customerId: string | null;
  total: number;
  currencyCode: string;
  paymentMethodCode: SatPaymentMethodCode | null;
  paymentFormCode: string | null;
  branchId: string | null;
  branchName: string | null;
  posSaleId: string | null;
  saleNumber: string | null;
  orderId: string | null;
  orderNumber: string | null;
  stampedAt: string | null;
  createdAt: string;
  hasFiles: boolean;
  emailedAt: string | null;
  paidAmount: number;
  outstandingBalance: number | null;
  partialitiesCount: number;
  isReplacement: boolean;
  replacedByInvoiceId: string | null;
  globalLocalDate: string | null;
  globalReissueState: GlobalReissueState | null;
  cancellationRequestedAt: string | null;
  satCancellationStatus: string | null;
  providerError: string | null;
}

export interface InvoiceTotalsByRate {
  rate: number;
  factor: TaxFactorType;
  base: number;
  tax: number;
}

/** Ticket/pedido que entró (o salió) de una factura global. */
export interface GlobalDocumentDto {
  id: string;
  /** El API lo manda como `kind`; `sourceType` se tolera por el nombre de la columna. */
  kind?: 'pos_sale' | 'order';
  sourceType?: 'pos_sale' | 'order';
  posSaleId: string | null;
  orderId: string | null;
  documentNumber: string;
  localDate: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentFormCode: string | null;
  releasedAt: string | null;
  releasedReason: 'global_cancelled' | 'nominative_issued' | null;
  nominativeInvoiceId: string | null;
}

export interface InvoiceActions {
  canStamp: boolean;
  canCancel: boolean;
  canReplace: boolean;
  canRefreshStatus: boolean;
  canEmail: boolean;
  canDiscard: boolean;
  canReissue: boolean;
}

/** `GET /billing/invoices/:id` (contrato §7.1). */
export interface InvoiceDetail extends InvoiceSummary {
  issuer: {
    rfcMasked: string | null;
    name: string | null;
    taxRegimeCode: string | null;
    expeditionPlace: string | null;
  };
  receiver: {
    rfc: string | null;
    name: string | null;
    taxRegimeCode: string | null;
    cfdiUseCode: string | null;
    zipCode: string | null;
    email: string | null;
  };
  items: InvoiceItemDto[];
  totals: {
    subtotal: number;
    discount: number;
    taxes: number;
    total: number;
    byRate: InvoiceTotalsByRate[];
  };
  satStampDate: string | null;
  satCertificateNumber: string | null;
  providerErrorMapped: {
    message: string;
    providerCode: string | null;
    field: string | null;
  } | null;
  cancellation: {
    reason: CancellationReason | null;
    requestedAt: string | null;
    cancelledAt: string | null;
    satCancellationStatus: string | null;
    replacementUuid: string | null;
    acuseAvailable: boolean;
  } | null;
  relation: { type: string; uuid: string | null; invoiceId: string | null } | null;
  replacement: {
    replacesInvoiceId: string | null;
    replacedByInvoiceId: string | null;
  } | null;
  files: { pdf: boolean; xml: boolean; storedAt: string | null };
  emails: { emailedAt: string | null; emailedTo: string | null; count: number };
  global: {
    localDate: string | null;
    conceptMode: GlobalConceptMode | null;
    documentCount: number | null;
    documents: GlobalDocumentDto[];
    released: GlobalDocumentDto[];
    reissueState: GlobalReissueState;
  } | null;
  ppd: {
    paidAmount: number;
    outstandingBalance: number | null;
    partialitiesCount: number;
    complements: {
      complementInvoiceId: string;
      folioDisplay: string;
      satUuid: string | null;
      /** Instante UTC (TIMESTAMPTZ): NO cortar a 10 caracteres, se corre de día. */
      paymentDate: string | null;
      /** 'YYYY-MM-DDTHH:mm:ss' en la zona de la sucursal (lo que se muestra). */
      paymentLocalDateTime?: string | null;
      amountPaid: number;
      partialityNumber: number;
      providerStatus: InvoiceStatus | null;
    }[];
  } | null;
  payment: {
    paymentLocalDateTime: string | null;
    paymentFormCode: string | null;
    amount: number;
    operationNumber: string | null;
    documents: {
      invoiceId: string;
      folioDisplay: string;
      satUuid: string;
      partialityNumber: number;
      previousBalance: number;
      amountPaid: number;
      outstandingBalance: number;
    }[];
  } | null;
  actions: InvoiceActions;
}

/** `POST /billing/invoices` (exactamente uno de `posSaleId`/`orderId`). */
export interface CreateInvoiceDto {
  posSaleId?: string;
  orderId?: string;
  paymentMethod?: SatPaymentMethodCode;
  /** Ticket que ya está en una global viva: el usuario reconoce los 3 pasos (§5.3.7). */
  acknowledgeGlobal?: boolean;
  sendEmail?: boolean;
}

export interface CancelInvoiceDto {
  reason: CancellationReason;
  /** Obligatorio con motivo 01, prohibido con los demás. */
  replacementUuid?: string;
}

/** Veredicto del SAT sobre la solicitud de cancelación. */
export type CancellationClass = 'cancelled' | 'rejected' | 'pending';

/** `POST /billing/invoices/:id/cancel` → `CancelResultDto`. */
export interface CancelResultDto {
  invoiceId: string;
  providerStatus: InvoiceStatus;
  /** true solo cuando el SAT dio la cancelación por aceptada. */
  confirmed: boolean;
  /** 'rejected' = el SAT no va a cancelar (rechazo del receptor o plazo vencido). */
  cancellationClass?: CancellationClass;
  satCancellationStatus: string | null;
  /** true = solo se consultó el estatus de una solicitud ya enviada (usa 1 timbre). */
  refreshed?: boolean;
  message: string;
}

/** `POST /billing/invoices/:id/discard` (cualquier clase, solo intentos sin UUID). */
export interface DiscardInvoiceResult {
  invoiceId: string;
  discarded: boolean;
  /** Tickets/pedidos de una global o facturas PPD de un complemento que quedaron libres. */
  releasedDocuments: number;
}

/** `POST /billing/invoices/:id/refresh-status` (consume un folio). */
export interface RefreshStatusResult {
  satStatus: SatStatus;
  providerStatus: InvoiceStatus;
  satCancellationStatus: string | null;
  checkedAt: string;
  foliosUsed: number;
}

/**
 * `POST /billing/invoices/:id/replace`: la factura NUEVA (su `cancellation` es
 * la propia y llega en null) + el resultado de la cancelación 01 de la original
 * en `previousCancellation`.
 */
export type ReplaceInvoiceResult = InvoiceDetail & {
  previousInvoiceId: string;
  previousCancellation: {
    requested: boolean;
    providerStatus: InvoiceStatus | null;
    error?: string | null;
  };
};

/** Opciones de `POST /billing/invoices/:id/stamp`. */
export interface StampInvoiceOptions {
  /** El ticket está en una global viva y el usuario reconoció los 3 pasos (§5.3.7). */
  acknowledgeGlobal?: boolean;
}

/** `GET /billing/invoices/:id/files` (URLs firmadas; `null` con storage local). */
export interface InvoiceFiles {
  pdf: { url: string; expiresAt: string } | null;
  xml: { url: string; expiresAt: string } | null;
  provider: 'gcs' | 'local';
}

/** `POST /billing/invoices/:id/email` */
export interface SendInvoiceEmailResult {
  sentTo: string[];
  emailedAt: string;
  emailCount: number;
}

export type InvoiceSort =
  | 'stampedAt:desc'
  | 'stampedAt:asc'
  | 'createdAt:desc'
  | 'createdAt:asc'
  | 'total:desc'
  | 'total:asc';

/** Query de `GET /billing/invoices` (contrato §7.2). */
export interface InvoiceListQuery {
  search?: string;
  status?: InvoiceStatus;
  invoiceType?: InvoiceType;
  cfdiType?: CfdiKind;
  paymentMethod?: SatPaymentMethodCode;
  withBalance?: boolean;
  branchId?: string;
  customerId?: string;
  orderId?: string;
  posSaleId?: string;
  emailed?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sort?: InvoiceSort;
}

export interface PaginatedInvoices {
  data: InvoiceSummary[];
  total: number;
  page: number;
  limit: number;
  stats: {
    byStatus: Partial<Record<InvoiceStatus, number>>;
    total: number;
  };
}

// ================================
// VENTAS POR FACTURAR (contrato §7.3)
// ================================

export type InvoiceableStatus = 'sin_factura' | 'en_global' | 'nominativa' | 'no_facturable';

/** El API puede mandar el bloqueador como código suelto o como `{ code, message }`. */
export type InvoiceableBlocker = string | { code: string; message?: string };

export interface InvoiceableSale {
  kind: 'pos_sale' | 'order';
  id: string;
  folio: string;
  branchId: string;
  branchName: string;
  localDate: string;
  localTime: string;
  customerId: string | null;
  customerCode: string | null;
  customerName: string | null;
  customerRfc: string | null;
  fiscalReady: boolean;
  fiscalIssues: CustomerFiscalIssue[];
  paymentFormCode: string | null;
  paymentFormResolved: boolean;
  paymentMethodCode: SatPaymentMethodCode | null;
  total: number;
  invoiceStatus: InvoiceableStatus;
  reason?: string | null;
  invoiceId?: string | null;
  globalInvoiceId?: string | null;
  globalFolio?: string | null;
  blockers: InvoiceableBlocker[];
}

export interface InvoiceableSalesQuery {
  /** Obligatorio en el API (§7.3 es por sucursal y día): sin él no se consulta. */
  branchId: string;
  date?: string;
  status?: InvoiceableStatus;
  search?: string;
  onlyFiscalReady?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedInvoiceableSales {
  data: InvoiceableSale[];
  total: number;
  page: number;
  limit: number;
}

// ================================
// FACTURA GLOBAL (contrato §5.3 / §7.4)
// ================================

export type GlobalDayState =
  | 'not_eligible'
  | 'no_sales'
  | 'ready'
  | 'blocked'
  | 'open'
  | 'emitted'
  /** Global viva del día + tickets incluibles que no están en ella (ingreso sin declarar). */
  | 'emitted_with_pending'
  | 'cancelled'
  | 'pending_reissue';

/** Por qué un día está `blocked`. */
export type GlobalDayBlockReason =
  | 'tickets'
  | 'terminals_off'
  | 'attempt_in_progress'
  | 'stale_error';

/** `GET /billing/global-invoices/days` */
export interface GlobalDayStatus {
  localDate: string;
  status: GlobalDayState;
  invoiceId?: string | null;
  /** Estado del intento/global del día (null si no hay fila). */
  providerStatus?: InvoiceStatus | null;
  providerFolio?: string | null;
  ticketCount: number;
  total: number;
  blockers: number;
  blockReason?: GlobalDayBlockReason | null;
  /** Tickets incluibles de un día YA emitido que no están en su global. */
  uncoveredCount?: number;
  lateEmission: boolean;
}

export interface GlobalDaysQuery {
  branchId: string;
  from: string;
  to: string;
}

export interface GlobalPreviewQuery {
  branchId: string;
  date: string;
  conceptMode?: GlobalConceptMode;
}

export type GlobalExclusionReason =
  | 'nominative_invoiced'
  | 'zero_total'
  | 'credit_sale'
  | 'already_in_global';

export type GlobalBlockerCode =
  | 'nominative_in_progress'
  | 'tax_unresolved'
  | 'payment_form_unresolved'
  | 'amount_mismatch'
  | 'product_not_ready'
  | 'stale_error';

/** `GET /billing/global-invoices/preview` (contrato §7.4). */
export interface GlobalPreview {
  branch: {
    id: string;
    code: string;
    name: string;
    timezone: string;
    expeditionZip: string | null;
    v2InvoicingSince: string | null;
    terminalsOff: string[];
  };
  localDate: string;
  conceptMode: GlobalConceptMode;
  eligible: boolean;
  eligibilityErrors: { code: string; message: string }[];
  lateEmission: boolean;
  included: {
    kind: 'pos_sale' | 'order';
    id: string;
    folio: string;
    time: string;
    customerName?: string | null;
    paymentFormCode: string | null;
    subtotal: number;
    taxAmount: number;
    total: number;
    /** `GlobalTaxDto` del API: `{ rate, factor, base, tax }` (no es `InvoiceTax`). */
    taxBreakdown: InvoiceTotalsByRate[];
  }[];
  excluded: {
    kind: 'pos_sale' | 'order';
    id: string;
    folio: string;
    total: number;
    reason: GlobalExclusionReason;
    detail?: string | null;
  }[];
  blockers: {
    code: GlobalBlockerCode | string;
    message: string;
    folio?: string | null;
    sku?: string | null;
    method?: string | null;
  }[];
  totals: {
    documents: number;
    subtotal: number;
    taxes: number;
    total: number;
    byRate: InvoiceTotalsByRate[];
    paymentForm: string | null;
  };
  items: InvoiceItemDto[];
  existingGlobal: {
    invoiceId: string;
    providerStatus: InvoiceStatus;
    folioDisplay: string;
    satUuid: string | null;
  } | null;
  canStamp: boolean;
  previewHash: string;
}

/**
 * `POST /billing/global-invoices/:id/reissue`. Solo `reissued` trae `invoice`;
 * `waiting_sat` = la cancelación 04 sigue en proceso y todavía no hay global nueva.
 */
export interface GlobalReissueResult {
  state: 'reissued' | 'waiting_sat' | 'nothing_to_reissue';
  previousInvoiceId: string;
  previousProviderStatus: InvoiceStatus | null;
  message: string;
  /** true = el PAC rechazó la relación 04 y la nueva global se emitió SIN ella. */
  relationDropped: boolean;
  invoice: InvoiceDetail | null;
}

/** `POST /billing/global-invoices` */
export interface CreateGlobalInvoiceDto {
  branchId: string;
  date: string;
  conceptMode?: GlobalConceptMode;
  previewHash: string;
}

// ================================
// COMPLEMENTO DE PAGO (contrato §5.4)
// ================================

export interface PaymentComplementDocumentDto {
  invoiceId: string;
  amountPaid: number;
}

/** `POST /billing/payment-complements` */
export interface CreatePaymentComplementDto {
  /** uuid v4 generado al abrir el formulario; mismo valor ⇒ 200 con el existente. */
  idempotencyKey: string;
  paymentDate: string;
  /** HH:mm (default 12:00 en el API). */
  paymentTime?: string;
  paymentFormCode: string;
  amount: number;
  operationNumber?: string;
  documents: PaymentComplementDocumentDto[];
}

// ================================
// SUCURSAL: arranque de facturación v2
// ================================

/** `PUT /billing/branches/:id/invoicing-since` */
export interface SetBranchInvoicingSinceDto {
  /** 'YYYY-MM-DD' | null (null = la sucursal sigue facturando en el sistema anterior). */
  since: string | null;
  /**
   * Obligatorio para una fecha PASADA: el usuario declara que el sistema
   * anterior ya dejó de facturar esa sucursal (si no, doble declaración).
   */
  acknowledgeLegacyStopped?: boolean;
}

/** Respuesta de `PUT /billing/branches/:id/invoicing-since` (solo super_admin). */
export interface BranchInvoicingSinceResult {
  branchId: string;
  v2InvoicingSince: string | null;
  /** Terminales de la sucursal con Facturación encendida / totales (no revocadas). */
  terminalsOn?: number;
  terminalsTotal?: number;
  warning?: string | null;
}

// ================================
// ERRORES (contrato §3.9 / §4: cuerpo uniforme de /billing)
// ================================

export interface BillingErrorBody {
  statusCode: number;
  code: string;
  message: string;
  field?: string;
  details?: unknown;
  providerCode?: string | null;
  invoiceId?: string;
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
  /** Flujos de facturación v2 (factura de pedido, global, complemento, nominativa desde admin). */
  v2FlowsEnabled?: boolean;
  /** false = falta aplicar la migración 141: todo `/billing` de Fase 2 responde 503. */
  schemaReady?: boolean;
  /** Lugar de expedición: tenant (CP del emisor) | branch (CP de la sucursal). */
  expeditionPlaceMode?: 'tenant' | 'branch';
  /** Modo de conceptos por defecto de la factura global. */
  globalConceptMode?: GlobalConceptMode;
  storageProvider?: 'gcs' | 'local' | string;
  emailConfigured?: boolean;
  /** Sucursales con `v2_invoicing_since` fijada. */
  branchesStarted?: number;
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
  /** Opcional (si el API lo manda): el RFC configurado coincide con la cuenta del PAC. */
  pacRfcMatches?: boolean | null;
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
  /** 'iva' | 'ieps' | 'isr' | 'local' | 'other' (tax_rules.tax_type). */
  taxType: string;
  /** Decimal (0.16) en readiness; `/config/tax-rules*` lo manda en porcentaje ("16"). Ver `taxRatePct`. */
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
  /** Primer día natural (zona de la sucursal) que factura v2; null = sigue el sistema anterior. */
  v2InvoicingSince?: string | null;
  timezone?: string | null;
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

/**
 * `code — description` desde el catálogo del API. Mientras el catálogo no ha
 * cargado (o falló) se usa la lista estática como respaldo para no mostrar el
 * código pelado; si tampoco está ahí, el código.
 */
export function fiscalRegimeLabel(
  code: string | null | undefined,
  catalog: SatCatalogItem[] | undefined,
): string {
  if (!code) return '';
  const item = catalog?.find((r) => r.code === code || r.Value === code);
  if (item) return `${item.code || item.Value} — ${item.description || item.Name}`;
  const fallback = FISCAL_REGIMES.find((r) => r.Value === code);
  return fallback ? `${fallback.Value} — ${fallback.Name}` : code;
}

export function cfdiUseLabel(
  code: string | null | undefined,
  catalog: SatCatalogItem[] | undefined,
): string {
  if (!code) return '';
  const item = catalog?.find((u) => u.code === code || u.Value === code);
  if (item) return `${item.code || item.Value} — ${item.description || item.Name}`;
  const fallback = CFDI_USES.find((u) => u.Value === code);
  return fallback ? `${fallback.Value} — ${fallback.Name}` : code;
}

/**
 * Tasa de IVA como texto "16%". Acepta las dos convenciones que conviven:
 * decimal (0.16, como lo manda readiness) y porcentaje ("16", como lo manda
 * `/config/tax-rules*`). Todo valor > 1 se toma ya como porcentaje.
 */
export function taxRatePct(rate: number | string | null | undefined): string {
  const n = Number(rate);
  if (!Number.isFinite(n)) return '';
  const pct = n > 1 ? n : n * 100;
  return `${Math.round(pct * 100) / 100}%`;
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
