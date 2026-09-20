// types/treasury-readiness.ts — Validación de Datos para pago (contrato §4.5).
//
// Rutas: GET /customers/payment-readiness/{list,export,catalogs,:customerId,
// :customerId/documents/:document/url}, POST /customers/payment-readiness/
// {:customerId/review, :customerId/documents/:document/revoke, remind},
// PATCH /customers/:id/tax-regime, GET /customers/:id/tax-regime/history,
// GET /mlm/tax-regimes/sat-suggestions. Sin inventar campos: lo que el
// contrato no fija va opcional y la UI lo trata de forma defensiva.

import type { Money, PageMeta, ReadinessBlocker } from './treasury';

// ───────────────────────────────────────────────────────────────────────────
// Enumeraciones (mismas claves que readiness-rules.lib.ts del API)
// ───────────────────────────────────────────────────────────────────────────

export type PaymentDocumentKey = 'ine' | 'taxId' | 'bankStatement' | 'foreignId' | 'w9';

export const PAYMENT_DOCUMENT_KEYS: readonly PaymentDocumentKey[] = [
  'ine',
  'taxId',
  'bankStatement',
  'foreignId',
  'w9',
] as const;

export function isPaymentDocumentKey(value: string): value is PaymentDocumentKey {
  return (PAYMENT_DOCUMENT_KEYS as readonly string[]).includes(value);
}

/** Estado por documento; `null` = no subido. */
export type PaymentDocumentStatus = 'pending' | 'validated' | 'rejected' | 'expired' | null;

export const DOCUMENT_STATUS_FILTERS = ['pending', 'validated', 'rejected'] as const;
export type DocumentStatusFilter = (typeof DOCUMENT_STATUS_FILTERS)[number];

export function isDocumentStatusFilter(value: string): value is DocumentStatusFilter {
  return (DOCUMENT_STATUS_FILTERS as readonly string[]).includes(value);
}

export const READINESS_STATUSES = [
  'not_started',
  'incomplete',
  'pending_validation',
  'rejected',
  'validated',
] as const;

export type ReadinessOverallStatus = (typeof READINESS_STATUSES)[number];

export function isReadinessStatus(value: string): value is ReadinessOverallStatus {
  return (READINESS_STATUSES as readonly string[]).includes(value);
}

export const READINESS_SORT_KEYS = [
  'submittedAt',
  'daysInQueue',
  'name',
  'commissionAmount',
  'updatedAt',
] as const;

export type ReadinessSortBy = (typeof READINESS_SORT_KEYS)[number];

export function isReadinessSortBy(value: string): value is ReadinessSortBy {
  return (READINESS_SORT_KEYS as readonly string[]).includes(value);
}

export type ReviewActorType = 'distributor' | 'staff' | 'system';

export type DocumentReviewAction =
  | 'uploaded'
  | 'validated'
  | 'rejected'
  | 'revoked'
  | 'reset'
  | 'expired';

export const REMIND_CHANNELS = ['inApp', 'email', 'whatsapp'] as const;
export type RemindChannel = (typeof REMIND_CHANNELS)[number];

// ───────────────────────────────────────────────────────────────────────────
// Listado `GET /customers/payment-readiness/list`
// ───────────────────────────────────────────────────────────────────────────

export interface ReadinessDocState {
  status: PaymentDocumentStatus;
  uploadedAt?: string | null;
  reviewedAt?: string | null;
  reasonCode?: string | null;
  reasonLabel?: string | null;
  notes?: string | null;
  contentType?: string | null;
  /** false = no aplica al país; ausente = se decide por el perfil del país. */
  required?: boolean;
}

export type ReadinessDocs = Partial<Record<PaymentDocumentKey, ReadinessDocState>>;

export interface ReadinessProgress {
  completed: number;
  total: number;
}

export interface RegimeRef {
  code: string;
  name?: string | null;
}

export interface ReadinessBankSummary {
  bankName: string | null;
  bankCode?: string | null;
  accountLast4: string | null;
  currency: string | null;
  isVerified: boolean;
}

export interface ReviewerRef {
  name: string | null;
  at: string | null;
}

export interface PeriodCommissionRef {
  amount: Money;
  currencyCode: string;
}

export interface ReadinessRow {
  customerId: string;
  customerNumber: string | null;
  name: string;
  countryCode: string | null;
  progress: ReadinessProgress;
  docs: ReadinessDocs;
  taxRegime: RegimeRef | null;
  satRegime: RegimeRef | null;
  bankAccount: ReadinessBankSummary | null;
  overallStatus: ReadinessOverallStatus;
  readyToPay: boolean;
  submittedAt: string | null;
  daysInQueue: number | null;
  lastReviewer: ReviewerRef | null;
  periodCommission: PeriodCommissionRef | null;
  /** Bloqueadores (si el API los manda en la fila). */
  blockers?: ReadinessBlocker[];
  email?: string | null;
  phone?: string | null;
}

export interface AmountByCurrency {
  currency: string;
  amount: Money;
}

export interface ReadinessStats {
  notStarted: number;
  incomplete: number;
  pendingValidation: number;
  rejected: number;
  validated: number;
  readyToPay: number;
  earnersBlocked: { count: number; amountByCurrency: AmountByCurrency[] };
  slaBreaches: number;
}

export interface ReadinessListFilters {
  status?: ReadinessOverallStatus;
  document?: PaymentDocumentKey;
  documentStatus?: DocumentStatusFilter;
  countryCode?: string;
  earnersOfPeriodId?: string;
  minDaysInQueue?: number;
  /** Mismo universo que el KPI "Listos para pagar" (validado + cuenta + régimen + FX). */
  readyToPay?: boolean;
  /** Mismo universo que el KPI "Fuera de SLA" (pendientes de validación > review_sla_days). */
  slaBreached?: boolean;
  search?: string;
  sortBy?: ReadinessSortBy;
  sortDir?: 'asc' | 'desc';
  page?: number;
  /** ≤ 100. */
  limit?: number;
}

export interface ReadinessListResponse {
  data: ReadinessRow[];
  meta: PageMeta;
  stats: ReadinessStats;
}

// ───────────────────────────────────────────────────────────────────────────
// Detalle `GET /customers/payment-readiness/:customerId`
// ───────────────────────────────────────────────────────────────────────────

export type ChecklistItemStatus =
  | 'missing'
  | 'invalid'
  | 'pending'
  | 'validated'
  | 'rejected'
  | 'expired'
  | 'ok';

export interface ReadinessChecklistItem {
  key: string;
  kind?: 'field' | 'document' | 'bank' | 'regime' | 'consent' | null;
  label: string;
  status: ChecklistItemStatus | string;
  done: boolean;
  detail?: string | null;
}

export interface DocumentReview {
  id?: string;
  document: PaymentDocumentKey | string;
  action: DocumentReviewAction | string;
  reasonCode: string | null;
  reasonLabel?: string | null;
  notes: string | null;
  actorType: ReviewActorType | string;
  actorName?: string | null;
  createdAt: string;
  /** Snapshot de la ruta (versión); nunca se usa para abrir el archivo. */
  filePath?: string | null;
}

export interface ReadinessBankDetail {
  id?: string | null;
  bankCode: string | null;
  bankName: string | null;
  /** '****1234' — nunca la cuenta completa. */
  accountMasked: string | null;
  holder: string | null;
  currency: string | null;
  accountType: 'checking' | 'savings' | null;
  routingMasked: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | { id?: string; name?: string | null } | null;
  countryCode?: string | null;
}

export interface DuplicateRef {
  customerId: string;
  customerNumber?: string | null;
  name?: string | null;
}

export interface ReadinessDuplicates {
  rfcSharedWith: DuplicateRef[];
  curpSharedWith: DuplicateRef[];
  accountSharedWith: DuplicateRef[];
}

/** `null` = no evaluable (dato ausente). */
export interface ReadinessFormatChecks {
  curp: boolean | null;
  rfc: boolean | null;
  rfcGeneric: boolean | null;
  clabe: boolean | null;
  rfcMatchesCurp: boolean | null;
  holderMatchesName: boolean | null;
}

export interface ReadinessConsent {
  acceptedAt: string | null;
  version: string | null;
  currentVersion: string | null;
  required: boolean;
}

/** Datos capturados por el distribuidor para cotejar contra el documento. */
export interface ReadinessCaptured {
  email: string | null;
  phone: string | null;
  curp: string | null;
  rfc: string | null;
  ineNumber: string | null;
  satRegimeCode: string | null;
  satRegimeName: string | null;
  fiscalZipCode: string | null;
}

export interface ReadinessCustomerRef {
  customerId: string;
  customerNumber: string | null;
  name: string;
  countryCode: string | null;
  /** Moneda de pago resuelta (política local/mxn_all). */
  payoutCurrency?: string | null;
}

export interface ReadinessDetail {
  customer: ReadinessCustomerRef;
  overallStatus: ReadinessOverallStatus;
  readyToPay: boolean;
  progress: ReadinessProgress;
  checklist: ReadinessChecklistItem[];
  blockers: ReadinessBlocker[];
  docs: ReadinessDocs;
  reviews: DocumentReview[];
  taxRegime: RegimeRef | null;
  satRegime: RegimeRef | null;
  bankAccount: ReadinessBankDetail | null;
  duplicates: ReadinessDuplicates;
  formatChecks: ReadinessFormatChecks;
  consent: ReadinessConsent | null;
  daysInQueue: number | null;
  submittedAt: string | null;
  captured: ReadinessCaptured;
  periodCommission: PeriodCommissionRef | null;
}

// ───────────────────────────────────────────────────────────────────────────
// Catálogos y URL firmada
// ───────────────────────────────────────────────────────────────────────────

export interface RejectionReasonItem {
  code: string;
  label: string;
  notesRequired: boolean;
}

export interface BankCatalogItem {
  code: string;
  name: string;
  shortName?: string | null;
}

export interface SatRegimeCatalogItem {
  code: string;
  description: string;
}

export interface ReadinessCatalogs {
  rejectionReasons: RejectionReasonItem[];
  banks: BankCatalogItem[];
  commissionRegimes: RegimeRef[];
  satRegimes: SatRegimeCatalogItem[];
  /** Perfil de país → ítems requeridos (`doc:ine`, `bankAccount`…). */
  requiredByCountry: Record<string, string[]>;
  slaDays: number | null;
  consentVersion: string | null;
}

export interface DocumentUrlResult {
  url: string;
  expiresAt: string | null;
  contentType: string | null;
  uploadedAt: string | null;
}

// ───────────────────────────────────────────────────────────────────────────
// Escrituras
// ───────────────────────────────────────────────────────────────────────────

export interface DocumentValidationInput {
  document: PaymentDocumentKey;
  approved: boolean;
  reasonCode?: string;
  notes?: string;
}

/** `ReviewDocumentsDto` (§4.5). */
export interface ReviewPayload {
  validations: DocumentValidationInput[];
  regimeCode?: string;
  verifyBankAccount?: boolean;
  bankLast4Confirmed?: boolean;
}

export interface ReviewResult {
  documentsValidated?: boolean;
  readyToPay?: boolean;
  bankVerified?: boolean;
  overallStatus?: ReadinessOverallStatus | string;
  [key: string]: unknown;
}

export interface RevokePayload {
  reasonCode: string;
  notes?: string;
}

export interface RemindPayload {
  customerIds?: string[];
  earnersOfPeriodId?: string;
  channels: RemindChannel[];
}

export interface RemindResult {
  queued: number;
  skipped: { customerId: string; reason: string }[];
}

/** `PATCH /customers/:id/tax-regime`. */
export interface AssignTaxRegimePayload {
  regimeCode: string;
  reason: string;
}

export interface TaxRegimeHistoryEntry {
  id?: string;
  previousCode?: string | null;
  newCode?: string | null;
  reason?: string | null;
  changedAt: string | null;
  changedBy?: string | { id?: string; name?: string | null } | null;
}

/** Mapa SAT → régimen de comisión sugerido (`GET /mlm/tax-regimes/sat-suggestions`). */
export type SatSuggestionMap = Record<string, string>;
