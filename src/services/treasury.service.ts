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
