// distributor-payment.ts — Tipos de "Datos para Comisiones" del distribuidor.
// Contrato Tesorería v2 §4.6 (GET/POST /distributor/payment-data,
// /catalogs, /documents/:document/url, DELETE /documents/:document,
// GET /distributor/commission-payments, /commissions/:id/receipt,
// /distributor/withholdings). No se inventan campos: todo lo que no está en
// el contrato va como opcional y la UI lo trata de forma defensiva.

import type { CommissionStatementInput } from '@/lib/generate-commission-statement-pdf';

// ================================
// Catálogos y enumeraciones
// ================================

/** Documentos de pago (mismas claves que `customer_document_reviews.document`). */
export type PaymentDocumentKey = 'ine' | 'taxId' | 'bankStatement' | 'foreignId' | 'w9';

export const PAYMENT_DOCUMENT_KEYS: readonly PaymentDocumentKey[] = [
  'ine',
  'taxId',
  'bankStatement',
  'foreignId',
  'w9',
] as const;

/** Estado por documento; `null` = no subido. */
export type PaymentDocumentStatus = 'pending' | 'validated' | 'rejected' | 'expired' | null;

export type PaymentOverallStatus =
  | 'not_started'
  | 'incomplete'
  | 'pending_validation'
  | 'rejected'
  | 'validated';

export type PaymentNextStep = 'capture' | 'submit_docs' | 'in_review' | 'fix_rejected' | 'ready';

export type BankAccountType = 'checking' | 'savings';

// ================================
// GET /distributor/payment-data
// ================================

export interface PaymentDocumentState {
  status: PaymentDocumentStatus;
  rejectionReasonCode: string | null;
  rejectionReasonLabel: string | null;
  rejectionNotes: string | null;
  uploadedAt: string | null;
  reviewedAt: string | null;
  /** true = validado por Tesorería; reemplazar exige `requestChange`. */
  locked: boolean;
  /** true = requerido para el país del distribuidor. */
  required: boolean;
}

export interface PaymentPersonalSection {
  /** Solo lectura aquí (TRS_EMAIL_READONLY); se cambia desde la cuenta. */
  email: string | null;
  phone: string | null;
  curp: string | null;
  ineNumber: string | null;
  locked: { curp: boolean; ineNumber: boolean };
}

export interface PaymentFiscalSection {
  rfc: string | null;
  satRegimeCode: string | null;
  satRegimeName: string | null;
  fiscalZipCode: string | null;
  /** Lo asigna Tesorería al validar la CSF; el distribuidor solo lo ve. */
  commissionRegime: { code: string; name: string } | null;
  locked: boolean;
}

export interface PaymentBankSection {
  countryCode: string | null;
  bankCode: string | null;
  bankName: string | null;
  /** '****1234' — nunca la cuenta completa. */
  accountMasked: string | null;
  routingMasked: string | null;
  accountType: BankAccountType | null;
  accountHolder: string | null;
  currency: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  locked: boolean;
}

export interface PaymentConsent {
  acceptedAt: string | null;
  version: string | null;
  currentVersion: string;
  /** true = falta aceptar (o la versión cambió): el primer guardado exige `privacyConsent`. */
  required: boolean;
}

/**
 * Ítem del checklist (`readiness-rules.lib.ts`). Solo `key` y `status` son
 * seguros; el resto se usa si llega.
 */
export interface ReadinessItem {
  key: string;
  status: string;
  label?: string | null;
  required?: boolean;
  section?: string | null;
  ok?: boolean;
}

export interface PaymentDataResponse {
  country: string;
  currency: string;
  progress: { completed: number; total: number };
  overallStatus: PaymentOverallStatus;
  nextStep: PaymentNextStep;
  slaDays: number;
  sections: {
    personal: PaymentPersonalSection;
    fiscal: PaymentFiscalSection;
    bank: PaymentBankSection;
  };
  documents: Record<PaymentDocumentKey, PaymentDocumentState>;
  consent: PaymentConsent;
  checklist: ReadinessItem[];
}

// ================================
// GET /distributor/payment-data/catalogs
// ================================

export interface SatRegimeOption {
  code: string;
  description: string;
}

export interface BankOption {
  code: string;
  name: string;
  shortName?: string;
}

/** Motivo de rechazo bilingüe: el API puede mandarlo como {code, es, en} o {code, label}. */
export interface RejectionReasonOption {
  code: string;
  es?: string;
  en?: string;
  label?: string;
  requiresNotes?: boolean;
}

export interface PaymentCatalogs {
  satRegimes: SatRegimeOption[];
  banks: BankOption[];
  requiredItems: string[];
  rejectionReasons: RejectionReasonOption[];
  consentVersion: string;
}

// ================================
// POST /distributor/payment-data (multipart)
// ================================

/** Campos de texto del `UpdatePaymentDataDto` (sin `email`). */
export interface UpdatePaymentDataFields {
  phone?: string;
  curp?: string;
  ineNumber?: string;
  rfc?: string;
  satRegimeCode?: string;
  fiscalZipCode?: string;
  clabe?: string;
  accountHolder?: string;
  routingNumber?: string;
  accountNumber?: string;
  accountType?: BankAccountType;
  bankName?: string;
}

export interface UpdatePaymentDataInput {
  fields?: UpdatePaymentDataFields;
  files?: Partial<Record<PaymentDocumentKey, File>>;
  /** Se manda como 'true' cuando el distribuidor acepta el aviso vigente. */
  privacyConsent?: boolean;
  /** Documentos validados que se reinician a `pending` para permitir el cambio. */
  requestChange?: PaymentDocumentKey[];
  onUploadProgress?: (percent: number) => void;
}

export interface UpdatePaymentDataResult {
  saved: string[];
  documentsSaved: string[];
  warnings: string[];
  paymentData: PaymentDataResponse;
}

export interface SignedDocumentUrl {
  url: string;
  expiresAt: string;
  contentType?: string | null;
}

// ================================
// GET /distributor/commission-payments
// ================================

export interface CommissionPayment {
  id: string;
  /** id de la comisión (para el recibo); si no llega se usa `id`. */
  commissionId?: string | null;
  periodId: string;
  periodName: string;
  periodCode: string;
  amount: number;
  currencyCode: string;
  paymentDate: string | null;
  paymentMethod: string | null;
  reference: string | null;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  createdAt: string;
  batchNumber?: string | null;
  trackingKey?: string | null;
  withheldAmount?: number | null;
  receiptAvailable?: boolean;
}

export interface CommissionPaymentsResponse {
  data: CommissionPayment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CommissionPaymentFilters {
  status?: string;
  page?: number;
  limit?: number;
}

/** `ReceiptModelDto`: datos para `generate-commission-statement-pdf.ts`. */
export type CommissionReceiptModel = Omit<CommissionStatementInput, 'generatedAt'> & {
  generatedAt?: string | Date;
};

// ================================
// GET /distributor/withholdings (solo con treasury.distributor_sees_agreements)
// ================================

export interface DistributorWithholdingApplication {
  id: string;
  periodId: string;
  periodName: string | null;
  amountWithheld: number;
  currencyCode: string;
  balanceAfter: number | null;
  appliedAt: string;
}

export interface DistributorWithholdingAgreement {
  id: string;
  concept: 'loan' | 'other' | string;
  description: string;
  currencyCode: string;
  totalAmount: number | null;
  installmentAmount: number;
  maxPctOfNet: number;
  balanceRemaining: number | null;
  withheldToDate?: number | null;
  status: 'active' | 'paused' | 'settled' | 'cancelled' | string;
  createdAt: string;
  applications?: DistributorWithholdingApplication[];
}

export interface DistributorWithholdingsResponse {
  agreements: DistributorWithholdingAgreement[];
  applications?: DistributorWithholdingApplication[];
}

// ================================
// Errores { code: 'TRS_*', message, field?, details? }
// ================================

export interface TreasuryErrorBody {
  statusCode: number;
  code: string;
  message: string;
  field?: string;
  details?: unknown;
}
