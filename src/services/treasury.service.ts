// treasury.service.ts — API de Tesorería v2 (contrato §4.1, §4.3, §4.7).
//
// Comisiones: listado con JOINs/orden/filtros, resumen por moneda/etapa/régimen,
// detalle con línea de tiempo, export CSV del API, aprobar (ids o periodo con
// expectedCount), cancelar/restaurar con motivo, pago directo cash|check.
// Lotes y ledger solo lectura aquí (la pantalla de dispersión es otro paso).
// Ajustes `treasury.*`: GET/PATCH /settings/treasury (super_admin).

import api from '@/lib/axios';
import type {
  ApprovePeriodPayload,
  ApproveResult,
  CommissionDetail,
  CommissionListFilters,
  CommissionListResponse,
  CommissionRow,
  CommissionSummary,
  MarkPaidPayload,
  MarkPaidResult,
  PageMeta,
  PaymentsLedgerFilters,
  PaymentsLedgerResponse,
  PayoutBatch,
  ReasonPayload,
  ReceiptModel,
  TaxRegimeCatalogItem,
  TreasurySettings,
  TreasurySettingsPatch,
} from '@/types/treasury';
import { TREASURY_SETTINGS_DEFAULTS } from '@/types/treasury';

const BASE = '/mlm/commissions';

/** Tope de filas que se piden al API para "seleccionar todo el filtro" (ArrayMaxSize 2000). */
export const MAX_SELECT_ALL_ROWS = 2000;
/** `limit` máximo del DTO. */
const PAGE_MAX = 100;

function listParams(filters: CommissionListFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.periodId) params.periodId = filters.periodId;
  if (filters.status) params.status = filters.status;
  if (filters.stage) params.stage = filters.stage;
  if (filters.readiness) params.readiness = filters.readiness;
  if (filters.countryCode) params.countryCode = filters.countryCode;
  if (filters.currencyCode) params.currencyCode = filters.currencyCode;
  if (filters.commissionType) params.commissionType = filters.commissionType;
  if (filters.taxRegime) params.taxRegime = filters.taxRegime;
  if (filters.customerId) params.customerId = filters.customerId;
  if (filters.search) params.search = filters.search;
  if (filters.sortBy) params.sortBy = filters.sortBy;
  if (filters.sortDir) params.sortDir = filters.sortDir;
  if (filters.page) params.page = String(filters.page);
  if (filters.limit) params.limit = String(Math.min(filters.limit, PAGE_MAX));
  return params;
}

/** `meta` del contrato, o la respuesta plana anterior (`total/page/...`). */
export function listMeta(res: CommissionListResponse, fallbackLimit: number): PageMeta {
  if (res.meta) return res.meta;
  const total = res.total ?? res.data.length;
  const limit = res.limit ?? fallbackLimit;
  return {
    total,
    page: res.page ?? 1,
    limit,
    totalPages: res.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, limit))),
  };
}

// ── Ajustes: el API responde camelCase (DTOs) pero se tolera snake_case ──────

const SETTING_KEYS: Array<[camel: keyof TreasurySettings, snake: string]> = [
  ['firstV2PayoutPeriodCode', 'first_v2_payout_period_code'],
  ['requireValidatedData', 'require_validated_data'],
  ['requireTaxRegimeMx', 'require_tax_regime_mx'],
  ['withholdingMaxPctPerPeriod', 'withholding_max_pct_per_period'],
  ['payoutCurrencyPolicy', 'payout_currency_policy'],
  ['defaultLayoutFormat', 'default_layout_format'],
  ['reviewSlaDays', 'review_sla_days'],
  ['notifyDistributorOnReview', 'notify_distributor_on_review'],
  ['notifyDistributorOnPayment', 'notify_distributor_on_payment'],
  ['notifyDistributorOnWithholding', 'notify_distributor_on_withholding'],
  ['distributorSeesAgreements', 'distributor_sees_agreements'],
  ['blockDuplicateIds', 'block_duplicate_ids'],
  ['whatsappReviewTemplate', 'whatsapp_review_template'],
  ['privacyConsentVersion', 'privacy_consent_version'],
  ['speiSourceClabe', 'spei_source_clabe'],
];

function pickSetting(raw: Record<string, unknown>, camel: string, snake: string): unknown {
  if (camel in raw) return raw[camel];
  if (snake in raw) return raw[snake];
  return undefined;
}

/** Normaliza la respuesta de `GET /settings/treasury` a `TreasurySettings`. */
export function normalizeTreasurySettings(input: unknown): TreasurySettings {
  const raw =
    typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  // Algunos endpoints envuelven en { settings: {...} } o { data: {...} }.
  const inner =
    typeof raw.settings === 'object' && raw.settings !== null
      ? (raw.settings as Record<string, unknown>)
      : typeof raw.data === 'object' && raw.data !== null
        ? (raw.data as Record<string, unknown>)
        : raw;
  const out: TreasurySettings = { ...TREASURY_SETTINGS_DEFAULTS };
  for (const [camel, snake] of SETTING_KEYS) {
    const value = pickSetting(inner, camel, snake);
    if (value === undefined) continue;
    switch (camel) {
      case 'firstV2PayoutPeriodCode':
      case 'whatsappReviewTemplate':
      case 'speiSourceClabe':
        out[camel] = typeof value === 'string' && value.trim() ? value.trim() : null;
        break;
      case 'privacyConsentVersion':
      case 'defaultLayoutFormat':
        if (typeof value === 'string' && value.trim()) out[camel] = value.trim();
        break;
      case 'payoutCurrencyPolicy':
        if (value === 'local' || value === 'mxn_all') out[camel] = value;
        break;
      case 'withholdingMaxPctPerPeriod':
      case 'reviewSlaDays': {
        const n = typeof value === 'number' ? value : Number(value);
        if (Number.isFinite(n)) out[camel] = n;
        break;
      }
      default:
        if (typeof value === 'boolean') out[camel] = value;
        else if (value === 'true' || value === 'false') out[camel] = value === 'true';
    }
  }
  return out;
}

class TreasuryService {
  // ── Comisiones (lectura) ───────────────────────────────────────────────

  /** GET /mlm/commissions → { data, meta, summary } */
  async listCommissions(filters: CommissionListFilters = {}): Promise<CommissionListResponse> {
    const { data } = await api.get<CommissionListResponse>(BASE, { params: listParams(filters) });
    return data;
  }

  /**
   * Todas las filas del filtro (hasta `max`) para "seleccionar todo el filtro":
   * pagina de 100 en 100 contra el API; el alcance real se confirma con Σ por moneda.
   */
  async listAllCommissionRows(
    filters: CommissionListFilters,
    max = MAX_SELECT_ALL_ROWS,
  ): Promise<{ rows: CommissionRow[]; total: number; truncated: boolean }> {
    const rows: CommissionRow[] = [];
    let page = 1;
    let total = 0;
    for (;;) {
      const res = await this.listCommissions({ ...filters, page, limit: PAGE_MAX });
      const meta = listMeta(res, PAGE_MAX);
      total = meta.total;
      rows.push(...res.data);
      if (res.data.length === 0 || rows.length >= total || rows.length >= max) break;
      if (page >= meta.totalPages) break;
      page += 1;
    }
    return { rows: rows.slice(0, max), total, truncated: total > rows.length };
  }

  /** GET /mlm/commissions/summary?periodId */
  async getSummary(periodId: string): Promise<CommissionSummary> {
    const { data } = await api.get<CommissionSummary>(`${BASE}/summary`, {
      params: { periodId },
    });
    return data;
  }

  /** GET /mlm/commissions/export?…filtros → CSV (blob) del API, tope 20,000. */
  async exportCommissions(
    filters: CommissionListFilters,
  ): Promise<{ blob: Blob; disposition: string | null }> {
    const params = listParams(filters);
    delete params.page;
    delete params.limit;
    try {
      const res = await api.get<Blob>(`${BASE}/export`, { params, responseType: 'blob' });
      const disposition = (res.headers?.['content-disposition'] as string | undefined) ?? null;
      return { blob: res.data, disposition };
    } catch (err) {
      return rethrowWithParsedBlobError(err);
    }
  }

  /** GET /mlm/commissions/:id */
  async getDetail(id: string): Promise<CommissionDetail> {
    const { data } = await api.get<CommissionDetail>(`${BASE}/${id}`);
    return data;
  }

  /** GET /mlm/commissions/:id/receipt (solo paid|reconciled) */
  async getReceipt(id: string): Promise<ReceiptModel> {
    const { data } = await api.get<ReceiptModel>(`${BASE}/${id}/receipt`);
    return data;
  }

  // ── Comisiones (escritura, gates fail-closed en el API) ────────────────

  /** POST /mlm/commissions/approve { commissionIds } */
  async approve(commissionIds: string[]): Promise<ApproveResult> {
    const { data } = await api.post<ApproveResult>(`${BASE}/approve`, { commissionIds });
    return data;
  }

  /** POST /mlm/commissions/approve-period { periodId, excludeIds?, onlyReady?, expectedCount } */
  async approvePeriod(payload: ApprovePeriodPayload): Promise<ApproveResult> {
    const body: ApprovePeriodPayload = {
      periodId: payload.periodId,
      expectedCount: payload.expectedCount,
      onlyReady: payload.onlyReady ?? true,
    };
    if (payload.excludeIds && payload.excludeIds.length > 0) body.excludeIds = payload.excludeIds;
    const { data } = await api.post<ApproveResult>(`${BASE}/approve-period`, body);
    return data;
  }

  /** POST /mlm/commissions/:id/cancel { reason } */
  async cancel(id: string, payload: ReasonPayload): Promise<CommissionRow> {
    const { data } = await api.post<CommissionRow>(`${BASE}/${id}/cancel`, payload);
    return data;
  }

  /** POST /mlm/commissions/:id/restore { reason } */
  async restore(id: string, payload: ReasonPayload): Promise<CommissionRow> {
    const { data } = await api.post<CommissionRow>(`${BASE}/${id}/restore`, payload);
    return data;
  }

  /** POST /mlm/commissions/mark-paid — solo cash|check (transfer ⇒ lote). */
  async markPaid(payload: MarkPaidPayload): Promise<MarkPaidResult> {
    const { data } = await api.post<MarkPaidResult>(`${BASE}/mark-paid`, payload);
    return data;
  }

  // ── Ledger y lotes (solo lectura aquí) ─────────────────────────────────

  /** GET /mlm/commissions/payments */
  async listPayments(filters: PaymentsLedgerFilters = {}): Promise<PaymentsLedgerResponse> {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params[key] = String(value);
    }
    const { data } = await api.get<PaymentsLedgerResponse | PaymentLedgerArray>(
      `${BASE}/payments`,
      { params },
    );
    if (Array.isArray(data)) return { data, total: data.length };
    return data;
  }

  /** GET /mlm/payout-batches?periodId&status&page&limit */
  async listPayoutBatches(params: {
    periodId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PayoutBatch[]> {
    const query: Record<string, string> = {};
    if (params.periodId) query.periodId = params.periodId;
    if (params.status) query.status = params.status;
    if (params.page) query.page = String(params.page);
    if (params.limit) query.limit = String(params.limit);
    const { data } = await api.get<unknown>('/mlm/payout-batches', { params: query });
    return normalizeBatchList(data, params.limit ?? 20).data;
  }

  // ── Régimen fiscal (§4.3) ──────────────────────────────────────────────

  /**
   * GET /mlm/tax-regimes → `TaxRegimeCatalogDto { regimes, drift, periodId, unassigned, satSuggestions }`.
   * Devuelve solo `regimes[]` (tolera el arreglo plano o `{ data }`).
   */
  async listTaxRegimes(periodId?: string): Promise<TaxRegimeCatalogItem[]> {
    const params: Record<string, string> = {};
    if (periodId) params.periodId = periodId;
    const { data } = await api.get<unknown>('/mlm/tax-regimes', { params });
    if (Array.isArray(data)) return data as TaxRegimeCatalogItem[];
    if (!isRecord(data)) return [];
    if (Array.isArray(data.regimes)) return data.regimes as TaxRegimeCatalogItem[];
    if (Array.isArray(data.data)) return data.data as TaxRegimeCatalogItem[];
    return [];
  }

  // ── Ajustes treasury.* (super_admin) ───────────────────────────────────

  /** GET /settings/treasury */
  async getSettings(): Promise<TreasurySettings> {
    const { data } = await api.get<unknown>('/settings/treasury');
    return normalizeTreasurySettings(data);
  }

  /** PATCH /settings/treasury (solo las claves cambiadas, camelCase). */
  async updateSettings(patch: TreasurySettingsPatch): Promise<TreasurySettings> {
    const { data } = await api.patch<unknown>('/settings/treasury', patch);
    return normalizeTreasurySettings(data);
  }
}

type PaymentLedgerArray = PaymentsLedgerResponse['data'];

export const treasuryService = new TreasuryService();
export default treasuryService;

// ═══════════════════════════════════════════════════════════════════════════
// Retenciones (§4.4) y Dispersión y pagos (§4.2) — pasos 9 y 10 (Next).
//
// Mismas tolerancias que arriba: el API en construcción puede responder la
// lista plana (arreglo) o `{ data, meta, kpis }`; aquí se normaliza. Los
// documentos (pagaré, layout, resultado) NUNCA viajan por /storage/file/*:
// el pagaré se abre con URL firmada del endpoint con permisos y el layout se
// descarga como blob desde el API (que lo regenera y coteja el sha256).
// ═══════════════════════════════════════════════════════════════════════════

import type {
  ApplyBankResultResult,
  BankResultAlreadyProcessedRow,
  BankResultPreview,
  BankResultPreviewRow,
  ConfirmBatchPayload,
  ConfirmBatchResult,
  CreatePayoutBatchPayload,
  CreatePayoutBatchResult,
  CreateWithholdingPayload,
  LayoutFormatInfo,
  MarkBatchSentPayload,
  PayoutBatchDetail,
  PayoutBatchFull,
  PayoutBatchItem,
  PayoutBatchItemsFilters,
  PayoutBatchListFilters,
  PayoutBatchListResponse,
  PayoutBatchSkipped,
  PayoutBatchSummary,
  PayoutBatchWarning,
  ReleasePendingResult,
  UpdateWithholdingPayload,
  UserRef,
  WithholdingAgreementRow,
  WithholdingApplicationRow,
  WithholdingAttachmentUploadResult,
  WithholdingAttachmentUrl,
  WithholdingEvent,
  WithholdingKpis,
  WithholdingListFilters,
  WithholdingListResponse,
  WithholdingPreview,
  WithholdingStatement,
} from '@/types/treasury';

const WITHHOLDINGS_BASE = '/mlm/withholdings';
const BATCHES_BASE = '/mlm/payout-batches';

/** Descarga (blob) + nombre sugerido por el API. */
export interface BlobDownload {
  blob: Blob;
  disposition: string | null;
}

function cleanParams(input: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue;
    params[key] = String(value);
  }
  return params;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function strOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function userRef(value: unknown): UserRef | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === 'string' ? value.id : '';
  const name = typeof value.name === 'string' ? value.name : '';
  return id || name ? { id, name } : null;
}

/**
 * Con `responseType: 'blob'` axios entrega el cuerpo de error como `Blob`, y
 * `treasuryErrorMessage` (síncrono) no puede leer el `{ code: 'TRS_*' }`. Aquí
 * se lee el blob JSON y se sustituye `response.data` por el objeto antes de
 * relanzar, para que el toast muestre TRS_RESULT_MISMATCH y no "(HTTP 409)".
 */
export async function rethrowWithParsedBlobError(err: unknown): Promise<never> {
  const error = err as { response?: { data?: unknown } } | null | undefined;
  const data = error?.response?.data;
  if (
    error?.response &&
    typeof Blob !== 'undefined' &&
    data instanceof Blob &&
    (data.type.includes('json') || data.type === '' || data.type.startsWith('text/'))
  ) {
    try {
      const text = await data.text();
      const parsed: unknown = text.trim() ? JSON.parse(text) : null;
      if (isRecord(parsed)) error.response.data = parsed;
      else if (text.trim()) error.response.data = text;
    } catch {
      // No era JSON: se conserva el blob y el mensaje genérico.
    }
  }
  throw err;
}

async function getBlob(url: string, params?: Record<string, string>): Promise<BlobDownload> {
  try {
    const res = await api.get<Blob>(url, { params, responseType: 'blob' });
    const disposition = (res.headers?.['content-disposition'] as string | undefined) ?? null;
    return { blob: res.data, disposition };
  } catch (err) {
    return rethrowWithParsedBlobError(err);
  }
}

// ── Normalizadores de filas del API (nombres del contrato ↔ DTO real) ──────

/**
 * `WithholdingAgreementDto`: `statusChange{at,by,reason}` → `statusChangedAt/By/Reason`,
 * `lastAppliedAt` → `lastApplicationAt`, `customerCountry` → `countryCode`.
 * Conserva los nombres crudos por si alguna pantalla los lee.
 */
export function normalizeWithholdingRow(input: unknown): WithholdingAgreementRow | null {
  if (!isRecord(input) || typeof input.id !== 'string') return null;
  const raw = input as unknown as WithholdingAgreementRow;
  const change = isRecord(input.statusChange) ? input.statusChange : null;
  return {
    ...raw,
    countryCode: raw.countryCode ?? strOrNull(input.customerCountry),
    statusChangedAt: raw.statusChangedAt ?? (change ? strOrNull(change.at) : null),
    statusChangedBy: raw.statusChangedBy ?? (change ? userRef(change.by) : null),
    statusReason: raw.statusReason ?? (change ? strOrNull(change.reason) : null),
    lastApplicationAt: raw.lastApplicationAt ?? strOrNull(input.lastAppliedAt),
    warnings: Array.isArray(input.warnings)
      ? input.warnings.map(strOrNull).filter((w): w is string => w !== null)
      : null,
  };
}

function normalizeWithholdingRows(input: unknown): WithholdingAgreementRow[] {
  if (!Array.isArray(input)) return [];
  return input
    .map(normalizeWithholdingRow)
    .filter((r): r is WithholdingAgreementRow => r !== null);
}

/** `PayoutBatchDto.rows{pending,paid,failed}` → `pendingCount/paidCount/failedCount`. */
export function normalizeBatch(input: unknown): PayoutBatchFull {
  if (!isRecord(input)) throw new Error('Respuesta de lote inválida');
  const raw = input as unknown as PayoutBatchFull;
  const rows = isRecord(input.rows) ? input.rows : null;
  const pending = rows ? numOrNull(rows.pending) : null;
  const paid = rows ? numOrNull(rows.paid) : null;
  const failed = rows ? numOrNull(rows.failed) : null;
  return {
    ...raw,
    rows: rows ? { pending: pending ?? 0, paid: paid ?? 0, failed: failed ?? 0 } : (raw.rows ?? null),
    pendingCount: raw.pendingCount ?? pending,
    paidCount: raw.paidCount ?? paid,
    failedCount: raw.failedCount ?? failed,
  };
}

function normalizeBatches(input: unknown): PayoutBatchFull[] {
  if (!Array.isArray(input)) return [];
  return input.filter(isRecord).map(normalizeBatch);
}

/** Fila `mismatched[]`/`unmatched[]` de `ResultPreviewDto` (`reason`, `fileAmount`, `batchAmount`) → `BankResultPreviewRow`. */
function normalizePreviewRow(input: unknown, status: 'ok' | 'fail'): BankResultPreviewRow | null {
  if (!isRecord(input)) return null;
  const raw = input as unknown as BankResultPreviewRow;
  return {
    ...raw,
    status: raw.status === 'ok' || raw.status === 'fail' ? raw.status : status,
    line: raw.line ?? numOrNull(input.line),
    sequence: raw.sequence ?? numOrNull(input.sequence),
    amount: raw.amount ?? numOrNull(input.fileAmount),
    expectedAmount: raw.expectedAmount ?? numOrNull(input.batchAmount),
    issue: raw.issue ?? strOrNull(input.reason) ?? raw.failureReason ?? null,
  };
}

function normalizePreviewRows(input: unknown, status: 'ok' | 'fail'): BankResultPreviewRow[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((r) => normalizePreviewRow(r, status))
    .filter((r): r is BankResultPreviewRow => r !== null);
}

function normalizeParseErrors(input: unknown): Array<{ line?: number | null; message: string }> {
  if (!Array.isArray(input)) return [];
  return input
    .map((e) => {
      if (!isRecord(e)) return null;
      const message = strOrNull(e.message);
      return message ? { line: numOrNull(e.line), message } : null;
    })
    .filter((e): e is { line: number | null; message: string } => e !== null);
}

/** `ResultPreviewDto` → `BankResultPreview` (nombres del contrato Next). */
export function normalizeBankResultPreview(input: unknown): BankResultPreview {
  if (!isRecord(input) || typeof input.applyToken !== 'string') {
    throw new Error('El API no devolvió la vista previa del resultado (applyToken)');
  }
  const totalsRec = isRecord(input.totals) ? input.totals : null;
  const parseRec = isRecord(input.parse) ? input.parse : null;
  const parseErrors = parseRec ? normalizeParseErrors(parseRec.errors) : [];
  const errors = Array.isArray(input.errors) ? normalizeParseErrors(input.errors) : parseErrors;
  const alreadyProcessed: BankResultAlreadyProcessedRow[] = Array.isArray(input.alreadyProcessed)
    ? input.alreadyProcessed
        .filter(isRecord)
        .map((r) => ({ line: numOrNull(r.line), sequence: numOrNull(r.sequence), rowStatus: strOrNull(r.rowStatus) ?? '' }))
    : [];
  return {
    batchId: strOrNull(input.batchId),
    batchNumber: strOrNull(input.batchNumber),
    status: strOrNull(input.status),
    paid: numOrNull(input.paid) ?? 0,
    failed: numOrNull(input.failed) ?? 0,
    mismatched: normalizePreviewRows(input.mismatched, 'fail'),
    unmatched: normalizePreviewRows(input.unmatched, 'fail'),
    rows: Array.isArray(input.rows) ? normalizePreviewRows(input.rows, 'ok') : null,
    totals: totalsRec
      ? {
          ok: numOrNull(totalsRec.ok) ?? numOrNull(totalsRec.paidAmount),
          fail: numOrNull(totalsRec.fail) ?? numOrNull(totalsRec.failedAmount),
          amount: numOrNull(totalsRec.amount),
          currency: strOrNull(totalsRec.currency),
        }
      : null,
    errors,
    parse: parseRec
      ? {
          rows: numOrNull(parseRec.rows) ?? 0,
          errors: parseErrors,
          separator: strOrNull(parseRec.separator),
          hadHeader: typeof parseRec.hadHeader === 'boolean' ? parseRec.hadHeader : null,
        }
      : null,
    alreadyApplied: input.alreadyApplied === true,
    alreadyProcessed,
    pendingNotInFile: numOrNull(input.pendingNotInFile),
    applyToken: input.applyToken,
  };
}

function normalizeSkipped(input: unknown): PayoutBatchSkipped[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(isRecord)
    .filter((s) => typeof s.id === 'string')
    .map((s) => ({
      id: String(s.id),
      customerNumber: strOrNull(s.customerNumber),
      code: strOrNull(s.code) ?? 'SKIPPED',
      blockers: Array.isArray(s.blockers) ? (s.blockers as PayoutBatchSkipped['blockers']) : [],
    }));
}

function normalizeWarnings(input: unknown): PayoutBatchWarning[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((w): PayoutBatchWarning | null => {
      if (typeof w === 'string') return { id: w, code: w };
      if (!isRecord(w)) return null;
      return {
        id: strOrNull(w.id) ?? '',
        customerNumber: strOrNull(w.customerNumber),
        code: strOrNull(w.code) ?? 'WARNING',
        blockers: Array.isArray(w.blockers) ? (w.blockers as PayoutBatchWarning['blockers']) : [],
      };
    })
    .filter((w): w is PayoutBatchWarning => w !== null);
}

// ── Retenciones ──────────────────────────────────────────────────────────

function withholdingParams(filters: WithholdingListFilters): Record<string, string> {
  return cleanParams({
    search: filters.search,
    status: filters.status,
    currencyCode: filters.currencyCode,
    concept: filters.concept,
    customerId: filters.customerId,
    periodId: filters.periodId,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    page: filters.page,
    limit: filters.limit ? Math.min(filters.limit, PAGE_MAX) : undefined,
  });
}

/** `{ data, meta, kpis }` del contrato, o el arreglo plano del API actual. */
export function normalizeWithholdingList(
  input: unknown,
  fallbackLimit: number,
): WithholdingListResponse {
  if (Array.isArray(input)) {
    const data = normalizeWithholdingRows(input);
    return {
      data,
      meta: { total: data.length, page: 1, limit: fallbackLimit, totalPages: 1 },
      kpis: null,
    };
  }
  if (!isRecord(input)) return { data: [], kpis: null };
  const data = normalizeWithholdingRows(input.data);
  const meta = isRecord(input.meta)
    ? (input.meta as unknown as PageMeta)
    : {
        total: typeof input.total === 'number' ? input.total : data.length,
        page: typeof input.page === 'number' ? input.page : 1,
        limit: typeof input.limit === 'number' ? input.limit : fallbackLimit,
        totalPages: typeof input.totalPages === 'number' ? input.totalPages : 1,
      };
  const kpis = isRecord(input.kpis) ? (input.kpis as unknown as WithholdingKpis) : null;
  return { data, meta, kpis };
}

/** `:id/applications` puede ser un arreglo o `{ applications, events, agreement }`. */
export function normalizeWithholdingStatement(
  input: unknown,
  fallbackAgreement: WithholdingAgreementRow,
): WithholdingStatement {
  if (Array.isArray(input)) {
    return {
      agreement: fallbackAgreement,
      applications: input as WithholdingApplicationRow[],
      events: null,
    };
  }
  if (!isRecord(input)) return { agreement: fallbackAgreement, applications: [], events: null };
  const applications = Array.isArray(input.applications)
    ? (input.applications as WithholdingApplicationRow[])
    : Array.isArray(input.data)
      ? (input.data as WithholdingApplicationRow[])
      : [];
  const events = Array.isArray(input.events) ? (input.events as WithholdingEvent[]) : null;
  const agreement = normalizeWithholdingRow(input.agreement) ?? fallbackAgreement;
  return { agreement, applications, events };
}

class WithholdingsTreasuryService {
  /** GET /mlm/withholdings → { data, meta, kpis } */
  async list(filters: WithholdingListFilters = {}): Promise<WithholdingListResponse> {
    const { data } = await api.get<unknown>(WITHHOLDINGS_BASE, {
      params: withholdingParams(filters),
    });
    return normalizeWithholdingList(data, filters.limit ?? 20);
  }

  /** GET /mlm/withholdings/:id/applications (+ eventos si el API los manda). */
  async statement(agreement: WithholdingAgreementRow): Promise<WithholdingStatement> {
    const { data } = await api.get<unknown>(`${WITHHOLDINGS_BASE}/${agreement.id}/applications`);
    return normalizeWithholdingStatement(data, agreement);
  }

  /** GET /mlm/withholdings/preview?periodId&commissionIds[] — `globalPct` del API → `globalMaxPct`. */
  async preview(periodId: string, commissionIds?: string[]): Promise<WithholdingPreview> {
    const params: Record<string, string | string[]> = { periodId };
    if (commissionIds && commissionIds.length > 0) params.commissionIds = commissionIds;
    const { data } = await api.get<WithholdingPreview>(`${WITHHOLDINGS_BASE}/preview`, {
      params,
    });
    if (!isRecord(data)) return { periodId, items: [], totalByCurrency: [] };
    const preview = data as WithholdingPreview;
    return {
      ...preview,
      items: Array.isArray(preview.items) ? preview.items : [],
      totalByCurrency: preview.totalByCurrency ?? [],
      globalMaxPct: preview.globalMaxPct ?? preview.globalPct ?? null,
    };
  }

  /** POST /mlm/withholdings */
  async create(payload: CreateWithholdingPayload): Promise<WithholdingAgreementRow> {
    const { data } = await api.post<unknown>(WITHHOLDINGS_BASE, payload);
    const row = normalizeWithholdingRow(data);
    if (!row) throw new Error('El API no devolvió el convenio creado');
    return row;
  }

  /** PATCH /mlm/withholdings/:id (motivo obligatorio si cambia `status`). */
  async update(id: string, payload: UpdateWithholdingPayload): Promise<WithholdingAgreementRow> {
    const { data } = await api.patch<unknown>(`${WITHHOLDINGS_BASE}/${id}`, payload);
    const row = normalizeWithholdingRow(data);
    if (!row) throw new Error('El API no devolvió el convenio actualizado');
    return row;
  }

  /** POST /mlm/withholdings/:id/attachment (multipart `attachment`, ≤ 5 MB) → `{ id, hasAttachment, sha256 }`. */
  async uploadAttachment(id: string, file: File): Promise<WithholdingAttachmentUploadResult> {
    const form = new FormData();
    form.append('attachment', file);
    const { data } = await api.post<unknown>(`${WITHHOLDINGS_BASE}/${id}/attachment`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const r = isRecord(data) ? data : {};
    return {
      id: strOrNull(r.id) ?? id,
      hasAttachment: r.hasAttachment !== false,
      sha256: strOrNull(r.sha256),
    };
  }

  /** GET /mlm/withholdings/:id/attachment → URL firmada 15 min. */
  async attachmentUrl(id: string): Promise<WithholdingAttachmentUrl> {
    const { data } = await api.get<WithholdingAttachmentUrl>(`${WITHHOLDINGS_BASE}/${id}/attachment`);
    return data;
  }

  /** GET /mlm/withholdings/export (CSV del API, @AuditLogExport). */
  async export(filters: WithholdingListFilters): Promise<BlobDownload> {
    const params = withholdingParams(filters);
    delete params.page;
    delete params.limit;
    return getBlob(`${WITHHOLDINGS_BASE}/export`, params);
  }

  /** GET /mlm/withholdings/:id/applications/export */
  async exportApplications(id: string): Promise<BlobDownload> {
    return getBlob(`${WITHHOLDINGS_BASE}/${id}/applications/export`);
  }
}

// ── Lotes de dispersión ──────────────────────────────────────────────────

export function normalizeBatchList(input: unknown, fallbackLimit: number): PayoutBatchListResponse {
  if (Array.isArray(input)) {
    const data = normalizeBatches(input);
    return { data, meta: { total: data.length, page: 1, limit: fallbackLimit, totalPages: 1 } };
  }
  if (!isRecord(input)) return { data: [] };
  const data = normalizeBatches(input.data);
  const meta = isRecord(input.meta)
    ? (input.meta as unknown as PageMeta)
    : {
        total: typeof input.total === 'number' ? input.total : data.length,
        page: typeof input.page === 'number' ? input.page : 1,
        limit: typeof input.limit === 'number' ? input.limit : fallbackLimit,
        totalPages: typeof input.totalPages === 'number' ? input.totalPages : 1,
      };
  return { data, meta };
}

/** `{ batch, items, meta, summary }` o el lote plano con `items` dentro. */
export function normalizeBatchDetail(input: unknown): PayoutBatchDetail {
  if (!isRecord(input)) throw new Error('Respuesta de lote inválida');
  const batch = normalizeBatch(isRecord(input.batch) ? input.batch : input);
  const items = Array.isArray(input.items) ? (input.items as PayoutBatchItem[]) : [];
  const meta = isRecord(input.meta) ? (input.meta as unknown as PageMeta) : undefined;
  const summary = isRecord(input.summary) ? (input.summary as unknown as PayoutBatchSummary) : null;
  return { batch, items, meta, summary };
}

class PayoutBatchesService {
  /** GET /mlm/payout-batches?periodId&status&page&limit */
  async list(filters: PayoutBatchListFilters = {}): Promise<PayoutBatchListResponse> {
    const { data } = await api.get<unknown>(BATCHES_BASE, {
      params: cleanParams({
        periodId: filters.periodId,
        status: filters.status,
        currencyCode: filters.currencyCode,
        page: filters.page,
        limit: filters.limit ? Math.min(filters.limit, PAGE_MAX) : undefined,
      }),
    });
    return normalizeBatchList(data, filters.limit ?? 20);
  }

  /** GET /mlm/payout-batches/:id?page&limit&rowStatus → lote + ítems + resumen */
  async detail(id: string, filters: PayoutBatchItemsFilters = {}): Promise<PayoutBatchDetail> {
    const { data } = await api.get<unknown>(`${BATCHES_BASE}/${id}`, {
      params: cleanParams({
        page: filters.page,
        limit: filters.limit ? Math.min(filters.limit, PAGE_MAX) : undefined,
        rowStatus: filters.rowStatus,
      }),
    });
    return normalizeBatchDetail(data);
  }

  /** Todas las filas del lote (hasta `max`) para exportar/mostrar completas. */
  async allItems(id: string, max = MAX_SELECT_ALL_ROWS): Promise<PayoutBatchItem[]> {
    const items: PayoutBatchItem[] = [];
    let page = 1;
    for (;;) {
      const res = await this.detail(id, { page, limit: PAGE_MAX });
      items.push(...res.items);
      const totalPages = res.meta?.totalPages ?? 1;
      if (res.items.length === 0 || page >= totalPages || items.length >= max) break;
      page += 1;
    }
    return items.slice(0, max);
  }

  /** GET /mlm/payout-batches/formats → [{code, name, bank, fileType, ready}] */
  async formats(): Promise<LayoutFormatInfo[]> {
    const { data } = await api.get<LayoutFormatInfo[] | { data: LayoutFormatInfo[] }>(
      `${BATCHES_BASE}/formats`,
    );
    return Array.isArray(data) ? data : (data.data ?? []);
  }

  /**
   * POST /mlm/payout-batches → 201 `{ batch, skipped[], warnings[] }`: lote `generated`
   * (layout ya en GCS con sha256) + filas omitidas con motivo (BANK_MISSING…).
   */
  async create(payload: CreatePayoutBatchPayload): Promise<CreatePayoutBatchResult> {
    const body: CreatePayoutBatchPayload = {
      periodId: payload.periodId,
      currencyCode: payload.currencyCode,
      layoutFormat: payload.layoutFormat,
      paymentDate: payload.paymentDate,
      onlyReady: payload.onlyReady ?? true,
    };
    if (payload.commissionIds && payload.commissionIds.length > 0) body.commissionIds = payload.commissionIds;
    if (payload.countryCodes && payload.countryCodes.length > 0) body.countryCodes = payload.countryCodes;
    if (payload.notes && payload.notes.trim()) body.notes = payload.notes.trim();
    const { data } = await api.post<unknown>(BATCHES_BASE, body);
    if (!isRecord(data)) throw new Error('Respuesta de lote inválida');
    // Tolera el lote plano (sin envoltorio) del contrato anterior.
    const batch = normalizeBatch(isRecord(data.batch) ? data.batch : data);
    return {
      batch,
      skipped: normalizeSkipped(data.skipped),
      warnings: normalizeWarnings(data.warnings),
    };
  }

  /** GET /mlm/payout-batches/:id/layout → archivo (regenerado y cotejado por sha256). */
  async downloadLayout(id: string): Promise<BlobDownload> {
    return getBlob(`${BATCHES_BASE}/${id}/layout`);
  }

  /** POST /mlm/payout-batches/:id/mark-sent — generated → sent */
  async markSent(id: string, payload: MarkBatchSentPayload): Promise<PayoutBatchFull> {
    const body: MarkBatchSentPayload = {};
    if (payload.sentAt) body.sentAt = payload.sentAt;
    if (payload.bankReference && payload.bankReference.trim()) body.bankReference = payload.bankReference.trim();
    const { data } = await api.post<unknown>(`${BATCHES_BASE}/${id}/mark-sent`, body);
    return normalizeBatch(data);
  }

  /** POST /mlm/payout-batches/:id/result (multipart `bankResult` ≤ 2 MB) → vista previa; nada se escribe. */
  async previewResult(id: string, file: File): Promise<BankResultPreview> {
    const form = new FormData();
    form.append('bankResult', file, file.name);
    const { data } = await api.post<unknown>(`${BATCHES_BASE}/${id}/result`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normalizeBankResultPreview(data);
  }

  /**
   * POST /mlm/payout-batches/:id/result/apply — multipart con el MISMO archivo de la
   * vista previa (`bankResult`) + `applyToken` (sha256); 409 TRS_RESULT_TOKEN si difieren.
   */
  async applyResult(id: string, file: File, applyToken: string): Promise<ApplyBankResultResult> {
    const form = new FormData();
    form.append('bankResult', file, file.name);
    form.append('applyToken', applyToken);
    const { data } = await api.post<unknown>(`${BATCHES_BASE}/${id}/result/apply`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!isRecord(data)) throw new Error('Respuesta de aplicación inválida');
    return {
      batch: normalizeBatch(isRecord(data.batch) ? data.batch : data),
      applied: data.applied !== false,
      paid: numOrNull(data.paid) ?? 0,
      failed: numOrNull(data.failed) ?? 0,
      mismatched: normalizePreviewRows(data.mismatched, 'fail'),
      unmatched: normalizePreviewRows(data.unmatched, 'fail'),
    };
  }

  /** POST /mlm/payout-batches/:id/confirm { reference, paymentDate } — bancos sin archivo. */
  async confirm(id: string, payload: ConfirmBatchPayload): Promise<ConfirmBatchResult> {
    const { data } = await api.post<unknown>(`${BATCHES_BASE}/${id}/confirm`, {
      reference: payload.reference.trim(),
      paymentDate: payload.paymentDate,
    });
    if (!isRecord(data)) throw new Error('Respuesta de confirmación inválida');
    return {
      batch: normalizeBatch(isRecord(data.batch) ? data.batch : data),
      paid: numOrNull(data.paid) ?? 0,
      mismatched: normalizePreviewRows(data.mismatched, 'fail'),
      remainingPending: numOrNull(data.remainingPending) ?? 0,
    };
  }

  /** POST /mlm/payout-batches/:id/reconcile — requiere 0 filas pendientes. */
  async reconcile(id: string): Promise<PayoutBatchFull> {
    const { data } = await api.post<unknown>(`${BATCHES_BASE}/${id}/reconcile`, {});
    return normalizeBatch(data);
  }

  /** POST /mlm/payout-batches/:id/cancel { reason } — solo `generated`. */
  async cancel(id: string, reason: string): Promise<PayoutBatchFull> {
    const { data } = await api.post<unknown>(`${BATCHES_BASE}/${id}/cancel`, {
      reason: reason.trim(),
    });
    return normalizeBatch(data);
  }

  /**
   * POST /mlm/payout-batches/:id/release-pending { reason } (mlm:pay) — libera las
   * filas que quedaron `pending` por WITHHOLDING_CHANGED (vuelven a Aprobadas, sin
   * ledger) para que el lote `sent` pueda conciliarse. `reason` es obligatorio
   * (5-300, `BatchReasonDto`): sin él el API responde 400.
   */
  async releasePending(id: string, reason: string): Promise<ReleasePendingResult> {
    const { data } = await api.post<unknown>(`${BATCHES_BASE}/${id}/release-pending`, {
      reason: reason.trim(),
    });
    if (!isRecord(data)) throw new Error('Respuesta de liberación inválida');
    return {
      batch: normalizeBatch(isRecord(data.batch) ? data.batch : data),
      released: numOrNull(data.released) ?? numOrNull(data.count) ?? 0,
    };
  }
}

class PaymentsLedgerService {
  /** GET /mlm/commissions/payments/export (CSV, @AuditLogExport). */
  async export(filters: PaymentsLedgerFilters): Promise<BlobDownload> {
    const params = cleanParams({ ...filters, page: undefined, limit: undefined });
    return getBlob(`${BASE}/payments/export`, params);
  }
}

export const withholdingsTreasuryService = new WithholdingsTreasuryService();
export const payoutBatchesService = new PayoutBatchesService();
export const paymentsLedgerService = new PaymentsLedgerService();
