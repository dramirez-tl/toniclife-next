// types/treasury.ts — Tesorería v2 (contrato tesoreria-contract.md §4.1, §4.3, §4.7).
//
// Alineado con los DTOs camelCase del API (`/mlm/commissions`, `/mlm/tax-regimes`,
// `/settings/treasury`). El API se construye en paralelo contra el MISMO contrato:
// aquí no se inventan campos y se tolera `null`/ausencia donde el contrato lo
// permite (readiness, lote, aprobó/pagó, convenios).

import type {
  Commission,
  CommissionLevelBreakdown,
  CommissionStatus,
  CommissionSummary as LegacyCommissionSummary,
  CommissionType,
} from './commissions';

/** Importe tal como lo serializa el API (NUMERIC → string) o ya numérico. */
export type Money = number | string;

// ───────────────────────────────────────────────────────────────────────────
// Etapas derivadas (commission-stage.lib.ts). `status` (CHECK del motor) NO cambia.
// ───────────────────────────────────────────────────────────────────────────

export const COMMISSION_STAGES = [
  'estimated',
  'calculated',
  'ready',
  'approved',
  'in_dispersion',
  'paid',
  'reconciled',
  'cancelled',
] as const;

export type CommissionStage = (typeof COMMISSION_STAGES)[number];

export function isCommissionStage(value: string): value is CommissionStage {
  return (COMMISSION_STAGES as readonly string[]).includes(value);
}

export type PayoutBatchStatus = 'generated' | 'sent' | 'reconciled' | 'cancelled';

/** Bloqueador de readiness: el API puede mandar el código solo o un objeto. */
export type ReadinessBlocker =
  | string
  | { code: string; message?: string | null; label?: string | null; field?: string | null };

export interface RowReadiness {
  ready: boolean;
  blockers: ReadinessBlocker[];
}

export interface UserRef {
  id: string;
  name: string;
}

export interface PayoutBatchRef {
  id: string;
  batchNumber: string;
  status: PayoutBatchStatus;
}

export interface CompanyWithholdingRef {
  amount: Money;
  /** true = proyectada (periodo cerrado sin pagar); se aplica al pagar. */
  projected: boolean;
}

/** Fila del listado `GET /mlm/commissions` = `CommissionDto` actual + Tesorería. */
export interface CommissionRow extends Commission {
  stage: CommissionStage;
  /** Periodo abierto: la cifra la reescribe el estimador cada 4 h. */
  isEstimate: boolean;
  approvedBy?: UserRef | null;
  paidAt?: string | null;
  paidBy?: UserRef | null;
  paidReference?: string | null;
  payoutBatch?: PayoutBatchRef | null;
  payoutAmount?: Money | null;
  payoutCurrency?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  readiness?: RowReadiness | null;
  companyWithholding?: CompanyWithholdingRef | null;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type CommissionSortBy =
  | 'customerName'
  | 'customerNumber'
  | 'subtotal'
  | 'total'
  | 'status'
  | 'createdAt';

export const COMMISSION_SORT_KEYS: readonly CommissionSortBy[] = [
  'customerName',
  'customerNumber',
  'subtotal',
  'total',
  'status',
  'createdAt',
];

export function isCommissionSortBy(value: string): value is CommissionSortBy {
  return (COMMISSION_SORT_KEYS as readonly string[]).includes(value);
}

/** `QueryCommissionsDto` (§4.1). */
export interface CommissionListFilters {
  periodId?: string;
  status?: CommissionStatus;
  stage?: CommissionStage;
  readiness?: 'ready' | 'blocked';
  countryCode?: string;
  currencyCode?: string;
  commissionType?: CommissionType;
  taxRegime?: string;
  customerId?: string;
  search?: string;
  sortBy?: CommissionSortBy;
  sortDir?: 'asc' | 'desc';
  page?: number;
  /** ≤ 100 (DTO). */
  limit?: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Resumen `GET /mlm/commissions/summary?periodId`
// ───────────────────────────────────────────────────────────────────────────

export interface SummaryPeriod {
  id?: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  isCurrent: boolean;
  /** false ⇒ nada aprobable/pagable; `payableReason` trae el `TRS_*`. */
  payable: boolean;
  payableReason?: string | null;
}

export interface SummaryByCurrency {
  currency: string;
  rows: number;
  subtotal: Money;
  iva: Money;
  ivaWithholding: Money;
  isr: Money;
  resico: Money;
  /** ISR + ret. IVA + RESICO. */
  fiscalWithheld: Money;
  net: Money;
  /** Convenios ya aplicados (pagadas). */
  companyWithheld: Money;
  /** Convenios por aplicar al pagar (proyección). */
  companyWithheldProjected: Money;
  toDisperse: Money;
}

export interface SummaryByStage {
  estimated: number;
  calculated: number;
  ready: number;
  approved: number;
  inDispersion: number;
  paid: number;
  reconciled: number;
  cancelled: number;
}

/** Tasas reales del régimen desde la lib del motor (`appliedRates`). */
export interface RegimeRates {
  ivaRate?: Money | null;
  ivaWithholdingRate?: Money | null;
  isrRetentionRate?: Money | null;
  resicoRate?: Money | null;
  usesProgressiveIsr?: boolean | null;
  isrBracketsCount?: number | null;
}

export interface SummaryByRegime {
  code: string;
  name: string;
  /** Presente cuando el desglose viene por régimen Y moneda (§4.3). */
  currency?: string | null;
  rows: number;
  base: Money;
  iva: Money;
  ivaWithholding: Money;
  isr: Money;
  resico: Money;
  rates?: RegimeRates | null;
}

export interface AmountByCurrency {
  currency: string;
  amount: Money;
}

export interface BlockerCount {
  code: string;
  count: number;
}

export interface SummaryReadiness {
  readyCount: number;
  blockedCount: number;
  blockedAmountByCurrency: AmountByCurrency[];
  blockers: BlockerCount[];
}

export interface CommissionSummary {
  period: SummaryPeriod;
  byCurrency: SummaryByCurrency[];
  byStage: SummaryByStage;
  byRegime: SummaryByRegime[];
  readiness: SummaryReadiness;
  /** Monedas del periodo sin `period_exchange_rates` (fail-closed al pagar). */
  missingFx: string[];
  /** Todo el periodo salió SIN_IMPUESTO: falta asignar régimen. */
  allNoTax: boolean;
}

export interface CommissionListResponse {
  data: CommissionRow[];
  meta?: PageMeta;
  summary?: CommissionSummary | null;
  /** Compatibilidad con la respuesta plana anterior. */
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Detalle `GET /mlm/commissions/:id`
// ───────────────────────────────────────────────────────────────────────────

export interface DetailCustomer {
  id?: string;
  number: string | null;
  name: string;
  country: string | null;
  currency: string | null;
  readiness?: RowReadiness | null;
}

/** Renglón de desglose (nivel o generación); reutiliza level-breakdown. */
export interface BreakdownItem {
  kind?: 'level' | 'generation' | string | null;
  level?: number | null;
  generation?: number | null;
  label?: string | null;
  percentage?: Money | null;
  upgraded?: boolean | null;
  members?: number | null;
  businessPointsMxn?: Money | null;
  base?: Money | null;
  amount: Money;
}

export interface DetailTaxes {
  regime: string | { code: string; name?: string | null } | null;
  ratesApplied?: RegimeRates | null;
}

export interface DetailWithholding {
  concept: string;
  description?: string | null;
  amount: Money;
  projected: boolean;
  currencyCode?: string | null;
}

export type TimelineEvent =
  | 'calculated'
  | 'approved'
  | 'batched'
  | 'paid'
  | 'failed'
  | 'reconciled'
  | 'cancelled'
  | 'restored'
  | string;

export interface TimelineEntry {
  at: string;
  actor?: string | UserRef | null;
  event: TimelineEvent;
  reference?: string | null;
  note?: string | null;
}

export type PaymentLedgerStatus = 'completed' | 'failed' | 'reversed' | string;

/** `PaymentLedgerRowDto` (§4.1 `GET /payments`). */
export interface PaymentLedgerRow {
  id: string;
  customer?: { id: string; number: string | null; name: string; country?: string | null } | null;
  period?: { code: string; name: string } | null;
  batch?: { id: string; number: string } | null;
  amount: Money;
  currencyCode: string;
  amountMxn?: Money | null;
  fxRate?: Money | null;
  withheldAmount?: Money | null;
  paymentMethod?: string | null;
  reference?: string | null;
  trackingKey?: string | null;
  paymentDate?: string | null;
  status: PaymentLedgerStatus;
  failureReason?: string | null;
  reconciledAt?: string | null;
  bankName?: string | null;
  accountLast4?: string | null;
  paidBy?: { name: string } | null;
}

export interface PayoutBatch {
  id: string;
  batchNumber: string;
  periodId: string;
  period?: { code: string; name: string } | null;
  currencyCode: string;
  fxRateToMxn?: Money | null;
  layoutFormat: string;
  status: PayoutBatchStatus;
  paymentDate: string;
  itemsCount: number;
  totalGrossMxn: Money;
  totalWithheld: Money;
  totalNetPayout: Money;
  layoutSha256?: string | null;
  createdAt: string;
  createdBy?: UserRef | null;
}

export interface CommissionDetail {
  row: CommissionRow;
  customer: DetailCustomer;
  breakdown?: BreakdownItem[] | CommissionLevelBreakdown | null;
  taxes?: DetailTaxes | null;
  withholdings?: DetailWithholding[] | null;
  payments?: PaymentLedgerRow[] | null;
  batch?: PayoutBatch | null;
  timeline?: TimelineEntry[] | null;
}

// ───────────────────────────────────────────────────────────────────────────
// Escrituras (§4.1)
// ───────────────────────────────────────────────────────────────────────────

export interface ApproveSkipped {
  id: string;
  customerNumber?: string | null;
  code: string;
  blockers?: ReadinessBlocker[];
}

export interface ApproveResult {
  approved: number;
  requested: number;
  skipped: ApproveSkipped[];
}

export interface ApprovePeriodPayload {
  periodId: string;
  excludeIds?: string[];
  onlyReady?: boolean;
  /** Obligatorio: 409 `TRS_COUNT_MISMATCH` si el universo cambió. */
  expectedCount: number;
}

export interface ReasonPayload {
  reason: string;
}

export type DirectPaymentMethod = 'cash' | 'check';

export interface MarkPaidPayload {
  commissionIds: string[];
  paymentMethod: DirectPaymentMethod;
  reference: string;
  /** YYYY-MM-DD ≤ hoy. */
  paymentDate: string;
}

export interface MarkPaidResult {
  paid: number;
  skipped: ApproveSkipped[];
}

export interface PaymentsLedgerFilters {
  periodId?: string;
  batchId?: string;
  customerId?: string;
  status?: string;
  currencyCode?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface PaymentsLedgerResponse {
  data: PaymentLedgerRow[];
  meta?: PageMeta;
  total?: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Régimen fiscal (§4.3)
// ───────────────────────────────────────────────────────────────────────────

export interface TaxRegimeCatalogItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  appliedRates?: RegimeRates | null;
  /** true si el catálogo en BD diverge de las tasas de la lib del motor. */
  drift?: boolean;
  usage?: { customers: number; earnersInPeriod?: number | null } | null;
}

// ───────────────────────────────────────────────────────────────────────────
// Ajustes `treasury.*` (§4.7, mig 142 §10). Solo super_admin.
// ───────────────────────────────────────────────────────────────────────────

export type PayoutCurrencyPolicy = 'local' | 'mxn_all';

export interface TreasurySettings {
  /** MM-YYYY del PRIMER periodo pagable desde v2. null = nada aprobable. */
  firstV2PayoutPeriodCode: string | null;
  requireValidatedData: boolean;
  requireTaxRegimeMx: boolean;
  withholdingMaxPctPerPeriod: number;
  payoutCurrencyPolicy: PayoutCurrencyPolicy;
  defaultLayoutFormat: string;
  reviewSlaDays: number;
  notifyDistributorOnReview: boolean;
  notifyDistributorOnPayment: boolean;
  notifyDistributorOnWithholding: boolean;
  distributorSeesAgreements: boolean;
  blockDuplicateIds: boolean;
  whatsappReviewTemplate: string | null;
  privacyConsentVersion: string;
  /**
   * CLABE ordenante para el layout `spei_csv` (ajuste opcional, no sembrado
   * por la mig 142): sin ella el formato SPEI nunca queda `ready`.
   */
  speiSourceClabe: string | null;
}

export type TreasurySettingsPatch = Partial<TreasurySettings>;

/** Defaults recomendados del contrato (fail-closed) para pintar antes de cargar. */
export const TREASURY_SETTINGS_DEFAULTS: TreasurySettings = {
  firstV2PayoutPeriodCode: null,
  requireValidatedData: true,
  requireTaxRegimeMx: true,
  withholdingMaxPctPerPeriod: 30,
  payoutCurrencyPolicy: 'local',
  defaultLayoutFormat: 'generic_csv',
  reviewSlaDays: 3,
  notifyDistributorOnReview: true,
  notifyDistributorOnPayment: true,
  notifyDistributorOnWithholding: false,
  // mig 142 §10 siembra `false` (decisión C-6); igual que treasury-settings.lib del API.
  distributorSeesAgreements: false,
  blockDuplicateIds: false,
  whatsappReviewTemplate: null,
  privacyConsentVersion: '2026-09',
  speiSourceClabe: null,
};

// ───────────────────────────────────────────────────────────────────────────
// Errores `{ code: 'TRS_*', message, field?, details? }` (§1.14)
// ───────────────────────────────────────────────────────────────────────────

export interface TreasuryErrorBody {
  statusCode: number;
  code: string;
  message: string;
  field?: string;
  details?: unknown;
}

/** `details.blocked[]` de `TRS_NOT_READY`. */
export interface TreasuryBlockedDetail {
  id: string;
  customerNumber?: string | null;
  blockers?: ReadinessBlocker[];
}

/** Monedas de dispersión soportadas por el contrato (§4.2). */
export const PAYOUT_CURRENCIES = ['MXN', 'USD', 'COP', 'GTQ'] as const;

/** Modelo del recibo `GET /mlm/commissions/:id/receipt` (PDF en cliente). */
export interface ReceiptModel {
  distributorName: string;
  distributorCode?: string | null;
  periodName: string;
  currencyCode: string;
  summary: LegacyCommissionSummary;
  commissions: Commission[];
  generatedAt?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Retenciones — convenios de retención (contrato §4.4, mig 142 §7)
// ═══════════════════════════════════════════════════════════════════════════

export const WITHHOLDING_STATUSES = ['active', 'paused', 'settled', 'cancelled'] as const;
export type WithholdingStatus = (typeof WITHHOLDING_STATUSES)[number];

export function isWithholdingStatus(value: string): value is WithholdingStatus {
  return (WITHHOLDING_STATUSES as readonly string[]).includes(value);
}

export const WITHHOLDING_CONCEPTS = ['loan', 'other'] as const;
export type WithholdingConcept = (typeof WITHHOLDING_CONCEPTS)[number];

export function isWithholdingConcept(value: string): value is WithholdingConcept {
  return (WITHHOLDING_CONCEPTS as readonly string[]).includes(value);
}

export type WithholdingSortBy =
  | 'createdAt'
  | 'balanceRemaining'
  | 'installmentAmount'
  | 'customerName';

export const WITHHOLDING_SORT_KEYS: readonly WithholdingSortBy[] = [
  'createdAt',
  'balanceRemaining',
  'installmentAmount',
  'customerName',
];

export function isWithholdingSortBy(value: string): value is WithholdingSortBy {
  return (WITHHOLDING_SORT_KEYS as readonly string[]).includes(value);
}

/** Estados a los que se puede pasar desde la UI (`settled` lo fija el sistema). */
export type WithholdingStatusChange = 'active' | 'paused' | 'cancelled';

/** Fila de `GET /mlm/withholdings` (campos actuales + trazabilidad de la 142). */
export interface WithholdingAgreementRow {
  id: string;
  customerId: string;
  customerName?: string | null;
  customerNumber?: string | null;
  countryCode?: string | null;
  concept: WithholdingConcept;
  description: string;
  currencyCode: string;
  totalAmount: Money | null;
  installmentAmount: Money;
  maxPctOfNet: Money;
  balanceRemaining: Money | null;
  withheldToDate?: Money | null;
  status: WithholdingStatus;
  startsPeriodId: string | null;
  startsPeriodName?: string | null;
  notes: string;
  authorizationFolio?: string | null;
  /** true cuando hay pagaré/convenio adjunto (la ruta nunca se expone). */
  hasAttachment?: boolean | null;
  attachmentUploadedAt?: string | null;
  /** Aplanados por `normalizeWithholdingRow` desde `statusChange{at,by,reason}` del API. */
  statusChangedAt?: string | null;
  statusChangedBy?: UserRef | null;
  statusReason?: string | null;
  /** Forma cruda del API (`WithholdingAgreementDto.statusChange`). */
  statusChange?: { at?: string | null; by?: UserRef | null; reason?: string | null } | null;
  /** Forma cruda del API (`customerCountry`); se aplana a `countryCode`. */
  customerCountry?: string | null;
  updatedBy?: UserRef | null;
  createdBy?: UserRef | null;
  /** Abono estimado del periodo actual (preview) en la moneda del convenio. */
  nextInstallmentEstimate?: Money | null;
  /** true mientras el cliente tenga filas en un lote `generated|sent` (TRS_IN_BATCH). */
  inBatch?: boolean | null;
  applicationsCount?: number | null;
  /** Aplanado desde `lastAppliedAt` del API. */
  lastApplicationAt?: string | null;
  lastAppliedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WithholdingListFilters {
  search?: string;
  status?: WithholdingStatus;
  currencyCode?: string;
  concept?: WithholdingConcept;
  customerId?: string;
  /** Periodo para "retenido / proyectado en el periodo" de los KPIs. */
  periodId?: string;
  sortBy?: WithholdingSortBy;
  sortDir?: 'asc' | 'desc';
  page?: number;
  /** ≤ 100 (DTO). */
  limit?: number;
}

export interface WithholdingKpis {
  active: number;
  paused: number;
  settled: number;
  cancelled?: number;
  balanceByCurrency: AmountByCurrency[];
  withheldThisPeriodByCurrency: AmountByCurrency[];
  projectedThisPeriodByCurrency: AmountByCurrency[];
}

export interface WithholdingListResponse {
  data: WithholdingAgreementRow[];
  meta?: PageMeta;
  kpis?: WithholdingKpis | null;
}

export interface CreateWithholdingPayload {
  customerId: string;
  concept: WithholdingConcept;
  description: string;
  /** Obligatorio si `concept === 'loan'` (TRS_WITHHOLDING_LOAN_TOTAL). */
  totalAmount?: number;
  installmentAmount: number;
  maxPctOfNet?: number;
  startsPeriodId?: string;
  notes: string;
  authorizationFolio?: string;
}

export interface UpdateWithholdingPayload {
  status?: WithholdingStatusChange;
  installmentAmount?: number;
  maxPctOfNet?: number;
  description?: string;
  /** Se ANEXA (append-only) con sello y autor en el API. */
  notes?: string;
  authorizationFolio?: string;
  /** Obligatorio (5-300) cuando cambia `status`. */
  reason?: string;
}

export interface WithholdingApplicationRow {
  id: string;
  periodId: string;
  periodName: string | null;
  periodCode?: string | null;
  amountWithheld: Money;
  currencyCode: string;
  agreementAmount: Money;
  agreementCurrency: string;
  balanceBefore: Money | null;
  balanceAfter: Money | null;
  appliedAt: string;
  appliedBy?: UserRef | null;
  commissionPaymentId?: string | null;
  paymentReference?: string | null;
}

/** Evento del convenio (derivado de columnas y `audit_log`; sin datos personales). */
export interface WithholdingEvent {
  at: string;
  event:
    | 'created'
    | 'updated'
    | 'paused'
    | 'reactivated'
    | 'cancelled'
    | 'settled'
    | 'note'
    | 'attachment'
    | string;
  actor?: string | UserRef | null;
  reason?: string | null;
  note?: string | null;
}

/** Estado de cuenta del convenio (fila + abonos por periodo + eventos). */
export interface WithholdingStatement {
  agreement: WithholdingAgreementRow;
  applications: WithholdingApplicationRow[];
  events?: WithholdingEvent[] | null;
}

export interface WithholdingAttachmentUrl {
  url: string;
  expiresAt?: string | null;
  contentType?: string | null;
  uploadedAt?: string | null;
}

/** `POST /mlm/withholdings/:id/attachment` → `{ id, hasAttachment, sha256 }` (no devuelve la fila). */
export interface WithholdingAttachmentUploadResult {
  id: string;
  hasAttachment: boolean;
  sha256: string | null;
}

/** Motivo por el que un convenio quedó limitado en una fila (withholding-cap.lib). */
export type WithholdingCapReason =
  | 'installment'
  | 'agreement_cap'
  | 'global_cap'
  | 'remaining'
  | 'balance'
  | string;

export interface WithholdingPreviewDetail {
  agreementId: string;
  concept?: WithholdingConcept | string | null;
  description?: string | null;
  /** Lo que deja de dispersarse, en la moneda de la fila. */
  amount: Money;
  /** Abono al saldo, en la moneda del convenio. */
  amountAgreement?: Money | null;
  agreementCurrency?: string | null;
  balanceBefore?: Money | null;
  balanceAfter?: Money | null;
  cappedBy?: WithholdingCapReason | null;
}

export interface WithholdingPreviewWarning {
  customerId?: string | null;
  agreementId?: string | null;
  rowId?: string | null;
  code: 'NO_RATE' | string;
  detail?: string | null;
}

export interface WithholdingPreviewItem {
  commissionId: string;
  customerId: string;
  customerName?: string | null;
  customerNumber?: string | null;
  commissionType?: string | null;
  net: Money;
  currencyCode: string;
  /** Tope global de la fila (net × pct global). */
  capGlobal?: Money | null;
  totalWithheld: Money;
  toDisperse: Money;
  details: WithholdingPreviewDetail[];
  /** Advertencias de la fila (códigos o `{code, detail}`). */
  warnings?: Array<string | WithholdingPreviewWarning> | null;
}

export interface WithholdingPreview {
  periodId: string;
  /** % global del ajuste `treasury.withholding_max_pct_per_period` (API: `globalPct`; se normaliza aquí). */
  globalMaxPct?: Money | null;
  /** Nombre crudo del API (`WithholdingPreviewDto.globalPct`). */
  globalPct?: Money | null;
  items: WithholdingPreviewItem[];
  totalByCurrency: Record<string, Money> | AmountByCurrency[];
  warnings?: WithholdingPreviewWarning[] | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Dispersión y pagos — lotes (contrato §4.2, mig 142 §1) y ledger (§4.1)
// ═══════════════════════════════════════════════════════════════════════════

export const PAYOUT_BATCH_STATUSES = ['generated', 'sent', 'reconciled', 'cancelled'] as const;

export function isPayoutBatchStatus(value: string): value is PayoutBatchStatus {
  return (PAYOUT_BATCH_STATUSES as readonly string[]).includes(value);
}

export type PayoutCurrency = (typeof PAYOUT_CURRENCIES)[number];

export function isPayoutCurrency(value: string): value is PayoutCurrency {
  return (PAYOUT_CURRENCIES as readonly string[]).includes(value);
}

/** `GET /mlm/payout-batches/formats` → `[{code, name, bank, fileType, ready}]`. */
export interface LayoutFormatInfo {
  code: string;
  name: string;
  bank?: string | null;
  fileType?: string | null;
  /** false = falta configuración (p. ej. CLABE ordenante para SPEI). */
  ready: boolean;
}

export interface PayoutBatchResultSummary {
  paid?: number | null;
  failed?: number | null;
  mismatched?: number | null;
  unmatched?: number | null;
  appliedAt?: string | null;
  appliedBy?: string | UserRef | null;
}

/** `PayoutBatchDto` completo (listado y detalle). */
export interface PayoutBatchFull extends PayoutBatch {
  layoutGeneratedAt?: string | null;
  sentAt?: string | null;
  sentBy?: UserRef | null;
  bankReference?: string | null;
  resultSha256?: string | null;
  resultSummary?: PayoutBatchResultSummary | null;
  reconciledAt?: string | null;
  reconciledBy?: UserRef | null;
  cancelledAt?: string | null;
  cancelledBy?: UserRef | null;
  cancelReason?: string | null;
  notes?: string | null;
  updatedAt?: string | null;
  hasLayout?: boolean | null;
  hasResult?: boolean | null;
  /** Conteos por estado de fila tal como los manda `PayoutBatchDto.rows`. */
  rows?: PayoutBatchRowCounts | null;
  /** Conteos aplanados desde `rows` por `normalizeBatch` (compatibilidad). */
  pendingCount?: number | null;
  paidCount?: number | null;
  failedCount?: number | null;
}

/** `PayoutBatchDto.rows` = filas del lote por estado. */
export interface PayoutBatchRowCounts {
  pending: number;
  paid: number;
  failed: number;
}

export interface PayoutBatchListFilters {
  periodId?: string;
  status?: PayoutBatchStatus;
  currencyCode?: string;
  page?: number;
  limit?: number;
}

export interface PayoutBatchListResponse {
  data: PayoutBatchFull[];
  meta?: PageMeta;
}

export type PayoutItemRowStatus = 'pending' | 'paid' | 'failed';

export interface PayoutBatchItem {
  commissionId: string;
  sequence: number;
  customerId?: string | null;
  customerNumber: string | null;
  name: string;
  bankName?: string | null;
  accountLast4?: string | null;
  amountMxn: Money;
  payoutAmount: Money;
  payoutWithheld?: Money | null;
  rowStatus: PayoutItemRowStatus;
  reference?: string | null;
  trackingKey?: string | null;
  failureReason?: string | null;
}

export interface PayoutBatchItemsFilters {
  page?: number;
  limit?: number;
  rowStatus?: PayoutItemRowStatus;
}

export interface PayoutBatchSummary {
  pending: number;
  paid: number;
  failed: number;
  totalNetPayout?: Money | null;
  totalWithheld?: Money | null;
}

/** `GET /mlm/payout-batches/:id` → lote + `items[]` paginados + `summary`. */
export interface PayoutBatchDetail {
  batch: PayoutBatchFull;
  items: PayoutBatchItem[];
  meta?: PageMeta;
  summary?: PayoutBatchSummary | null;
}

export interface CreatePayoutBatchPayload {
  periodId: string;
  currencyCode: PayoutCurrency;
  layoutFormat: string;
  /** YYYY-MM-DD ≥ hoy (fecha valor). */
  paymentDate: string;
  commissionIds?: string[];
  countryCodes?: string[];
  /** true (default del DTO) = solo filas listas; false = todas las aprobadas (el API puede rechazar bloqueadas). */
  onlyReady?: boolean;
  notes?: string;
}

/** Fila omitida al generar el lote (`ApproveSkippedDto`: BANK_MISSING, CURRENCY_MISMATCH, AMOUNT_ZERO…). */
export type PayoutBatchSkipped = ApproveSkipped;

/** Advertencia por fila al generar (`GateWarning`: incluida aunque tenga bloqueadores, con `require_validated_data=false`). */
export interface PayoutBatchWarning {
  id: string;
  customerNumber?: string | null;
  code: string;
  blockers?: ReadinessBlocker[];
}

/** `POST /mlm/payout-batches` → `{ batch, skipped[], warnings[] }`. */
export interface CreatePayoutBatchResult {
  batch: PayoutBatchFull;
  skipped: PayoutBatchSkipped[];
  warnings: PayoutBatchWarning[];
}

/** `POST /mlm/payout-batches/:id/confirm` → `{ batch, paid, mismatched[], remainingPending }`. */
export interface ConfirmBatchResult {
  batch: PayoutBatchFull;
  paid: number;
  mismatched: BankResultPreviewRow[];
  remainingPending: number;
}

/** `POST /mlm/payout-batches/:id/release-pending` → libera filas pendientes por WITHHOLDING_CHANGED. */
export interface ReleasePendingResult {
  batch: PayoutBatchFull;
  /** Filas liberadas (vuelven a Aprobadas sin ledger). */
  released: number;
}

export interface MarkBatchSentPayload {
  sentAt?: string;
  bankReference?: string;
}

export interface ConfirmBatchPayload {
  reference: string;
  /** YYYY-MM-DD. */
  paymentDate: string;
}

export type BankResultRowStatus = 'ok' | 'fail';

/** Fila de la vista previa del resultado del banco (§4.2 `POST /:id/result`). */
export interface BankResultPreviewRow {
  line?: number | null;
  sequence?: number | null;
  commissionId?: string | null;
  customerNumber?: string | null;
  accountLast4?: string | null;
  amount?: Money | null;
  expectedAmount?: Money | null;
  status: BankResultRowStatus;
  reference?: string | null;
  trackingKey?: string | null;
  failureReason?: string | null;
  /** Motivo por el que no cuadra (mismatched) o no se encontró (unmatched); API: `reason`. */
  issue?: string | null;
}

/** Fila del archivo que ya estaba pagada/rechazada en el lote (`alreadyProcessed[]`). */
export interface BankResultAlreadyProcessedRow {
  line?: number | null;
  sequence?: number | null;
  rowStatus: string;
}

export interface BankResultParseInfo {
  rows: number;
  errors: Array<{ line?: number | null; message: string }>;
  separator?: string | null;
  hadHeader?: boolean | null;
}

/**
 * Vista previa normalizada de `ResultPreviewDto` (`normalizeBankResultPreview`):
 * `mismatched[].reason/fileAmount/batchAmount` → `issue/amount/expectedAmount`,
 * `totals.paidAmount/failedAmount` → `totals.ok/fail`, `parse.errors` → `errors`.
 */
export interface BankResultPreview {
  batchId?: string | null;
  batchNumber?: string | null;
  status?: string | null;
  paid: number;
  failed: number;
  mismatched: BankResultPreviewRow[];
  unmatched: BankResultPreviewRow[];
  /** Filas que sí se aplicarán (ok/fail) si el API las devuelve. */
  rows?: BankResultPreviewRow[] | null;
  totals?: { ok?: Money | null; fail?: Money | null; amount?: Money | null; currency?: string | null } | null;
  errors?: Array<{ line?: number | null; message: string }> | null;
  parse?: BankResultParseInfo | null;
  /** El mismo archivo (sha256) ya se aplicó a este lote: aplicar no escribe nada. */
  alreadyApplied?: boolean;
  alreadyProcessed?: BankResultAlreadyProcessedRow[] | null;
  /** Filas pendientes del lote que el archivo no menciona (siguen pendientes). */
  pendingNotInFile?: number | null;
  /** sha256 del archivo: se reenvía en `POST /:id/result/apply` junto con el MISMO archivo. */
  applyToken: string;
}

export interface ApplyBankResultPayload {
  applyToken: string;
}

/** `POST /:id/result/apply` → `{ batch, applied, paid, failed, mismatched[], unmatched[] }`. */
export interface ApplyBankResultResult {
  batch: PayoutBatchFull;
  /** false = archivo ya aplicado antes (idempotente, nada escrito). */
  applied: boolean;
  paid: number;
  failed: number;
  mismatched: BankResultPreviewRow[];
  unmatched: BankResultPreviewRow[];
}

/** Ledger con el id de la comisión (para el recibo) cuando el API lo expone. */
export interface PaymentLedgerRowExt extends PaymentLedgerRow {
  commissionId?: string | null;
  commissionCalculationId?: string | null;
  commissionType?: string | null;
}
