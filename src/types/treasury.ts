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
