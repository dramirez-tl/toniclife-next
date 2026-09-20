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
    const res = await api.get<Blob>(`${BASE}/export`, { params, responseType: 'blob' });
    const disposition = (res.headers?.['content-disposition'] as string | undefined) ?? null;
    return { blob: res.data, disposition };
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
    const { data } = await api.get<PayoutBatch[] | { data: PayoutBatch[] }>(
      '/mlm/payout-batches',
      { params: query },
    );
    return Array.isArray(data) ? data : (data.data ?? []);
  }

  // ── Régimen fiscal (§4.3) ──────────────────────────────────────────────

  /** GET /mlm/tax-regimes (catálogo + tasas reales de la lib + drift) */
  async listTaxRegimes(periodId?: string): Promise<TaxRegimeCatalogItem[]> {
    const params: Record<string, string> = {};
    if (periodId) params.periodId = periodId;
    const { data } = await api.get<TaxRegimeCatalogItem[] | { data: TaxRegimeCatalogItem[] }>(
      '/mlm/tax-regimes',
      { params },
    );
    return Array.isArray(data) ? data : (data.data ?? []);
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
  BankResultPreview,
  ConfirmBatchPayload,
  CreatePayoutBatchPayload,
  CreateWithholdingPayload,
  LayoutFormatInfo,
  MarkBatchSentPayload,
  PayoutBatchDetail,
  PayoutBatchFull,
  PayoutBatchItem,
  PayoutBatchItemsFilters,
  PayoutBatchListFilters,
  PayoutBatchListResponse,
  PayoutBatchSummary,
  UpdateWithholdingPayload,
  WithholdingAgreementRow,
  WithholdingApplicationRow,
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

async function getBlob(url: string, params?: Record<string, string>): Promise<BlobDownload> {
  const res = await api.get<Blob>(url, { params, responseType: 'blob' });
  const disposition = (res.headers?.['content-disposition'] as string | undefined) ?? null;
  return { blob: res.data, disposition };
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
    const data = input as WithholdingAgreementRow[];
    return {
      data,
      meta: { total: data.length, page: 1, limit: fallbackLimit, totalPages: 1 },
      kpis: null,
    };
  }
  if (!isRecord(input)) return { data: [], kpis: null };
  const data = Array.isArray(input.data) ? (input.data as WithholdingAgreementRow[]) : [];
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
  const agreement = isRecord(input.agreement)
    ? (input.agreement as unknown as WithholdingAgreementRow)
    : fallbackAgreement;
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

  /** GET /mlm/withholdings/preview?periodId&commissionIds[] */
  async preview(periodId: string, commissionIds?: string[]): Promise<WithholdingPreview> {
    const params: Record<string, string | string[]> = { periodId };
    if (commissionIds && commissionIds.length > 0) params.commissionIds = commissionIds;
    const { data } = await api.get<WithholdingPreview>(`${WITHHOLDINGS_BASE}/preview`, {
      params,
    });
    return data;
  }

  /** POST /mlm/withholdings */
  async create(payload: CreateWithholdingPayload): Promise<WithholdingAgreementRow> {
    const { data } = await api.post<WithholdingAgreementRow>(WITHHOLDINGS_BASE, payload);
    return data;
  }

  /** PATCH /mlm/withholdings/:id (motivo obligatorio si cambia `status`). */
  async update(id: string, payload: UpdateWithholdingPayload): Promise<WithholdingAgreementRow> {
    const { data } = await api.patch<WithholdingAgreementRow>(`${WITHHOLDINGS_BASE}/${id}`, payload);
    return data;
  }

  /** POST /mlm/withholdings/:id/attachment (multipart `attachment`, ≤ 5 MB). */
  async uploadAttachment(id: string, file: File): Promise<WithholdingAgreementRow> {
    const form = new FormData();
    form.append('attachment', file);
    const { data } = await api.post<WithholdingAgreementRow>(
      `${WITHHOLDINGS_BASE}/${id}/attachment`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
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
    const data = input as PayoutBatchFull[];
    return { data, meta: { total: data.length, page: 1, limit: fallbackLimit, totalPages: 1 } };
  }
  if (!isRecord(input)) return { data: [] };
  const data = Array.isArray(input.data) ? (input.data as PayoutBatchFull[]) : [];
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
  const batch = isRecord(input.batch)
    ? (input.batch as unknown as PayoutBatchFull)
    : (input as unknown as PayoutBatchFull);
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

  /** POST /mlm/payout-batches → 201 lote `generated` (layout ya en GCS con sha256). */
  async create(payload: CreatePayoutBatchPayload): Promise<PayoutBatchFull> {
    const body: CreatePayoutBatchPayload = {
      periodId: payload.periodId,
      currencyCode: payload.currencyCode,
      layoutFormat: payload.layoutFormat,
      paymentDate: payload.paymentDate,
    };
    if (payload.commissionIds && payload.commissionIds.length > 0) body.commissionIds = payload.commissionIds;
    if (payload.countryCodes && payload.countryCodes.length > 0) body.countryCodes = payload.countryCodes;
    if (payload.notes && payload.notes.trim()) body.notes = payload.notes.trim();
    const { data } = await api.post<PayoutBatchFull>(BATCHES_BASE, body);
    return data;
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
    const { data } = await api.post<PayoutBatchFull>(`${BATCHES_BASE}/${id}/mark-sent`, body);
    return data;
  }

  /** POST /mlm/payout-batches/:id/result (multipart `bankResult` ≤ 2 MB) → vista previa; nada se escribe. */
  async previewResult(id: string, file: File): Promise<BankResultPreview> {
    const form = new FormData();
    form.append('bankResult', file);
    const { data } = await api.post<BankResultPreview>(`${BATCHES_BASE}/${id}/result`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  /** POST /mlm/payout-batches/:id/result/apply { applyToken } */
  async applyResult(id: string, applyToken: string): Promise<ApplyBankResultResult> {
    const { data } = await api.post<ApplyBankResultResult>(`${BATCHES_BASE}/${id}/result/apply`, {
      applyToken,
    });
    return data;
  }

  /** POST /mlm/payout-batches/:id/confirm { reference, paymentDate } — bancos sin archivo. */
  async confirm(id: string, payload: ConfirmBatchPayload): Promise<PayoutBatchFull> {
    const { data } = await api.post<PayoutBatchFull>(`${BATCHES_BASE}/${id}/confirm`, {
      reference: payload.reference.trim(),
      paymentDate: payload.paymentDate,
    });
    return data;
  }

  /** POST /mlm/payout-batches/:id/reconcile — requiere 0 filas pendientes. */
  async reconcile(id: string): Promise<PayoutBatchFull> {
    const { data } = await api.post<PayoutBatchFull>(`${BATCHES_BASE}/${id}/reconcile`, {});
    return data;
  }

  /** POST /mlm/payout-batches/:id/cancel { reason } — solo `generated`. */
  async cancel(id: string, reason: string): Promise<PayoutBatchFull> {
    const { data } = await api.post<PayoutBatchFull>(`${BATCHES_BASE}/${id}/cancel`, {
      reason: reason.trim(),
    });
    return data;
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
