// treasury-readiness.service.ts — Validación de Datos para pago (contrato §4.5).
//
// Consume `/customers/payment-readiness/*` (cola, detalle, catálogos, URL firmada
// de documentos, revisión, revocación, recordatorios, export) y
// `/customers/:id/tax-regime` (§4.3). Los documentos NUNCA se abren por
// `/storage/file/*`: siempre por la URL firmada (15 min) que devuelve el
// endpoint con permiso. Los normalizadores toleran la respuesta plana previa
// del listado/checklist (mientras el paso 5 del API no esté desplegado) sin
// inventar datos: lo que no llega queda `null`.

import api from '@/lib/axios';
import type { PageMeta, ReadinessBlocker } from '@/types/treasury';
import type {
  AmountByCurrency,
  AssignTaxRegimePayload,
  BankCatalogItem,
  DocumentReview,
  DocumentUrlResult,
  DuplicateRef,
  PaymentDocumentKey,
  PaymentDocumentStatus,
  ReadinessBankDetail,
  ReadinessCatalogs,
  ReadinessChecklistItem,
  ReadinessDetail,
  ReadinessDocState,
  ReadinessDocs,
  ReadinessListFilters,
  ReadinessListResponse,
  ReadinessOverallStatus,
  ReadinessRow,
  ReadinessStats,
  RegimeRef,
  RejectionReasonItem,
  RemindPayload,
  RemindResult,
  ReviewPayload,
  ReviewResult,
  RevokePayload,
  SatRegimeCatalogItem,
  SatSuggestionMap,
  TaxRegimeHistoryEntry,
} from '@/types/treasury-readiness';
import { isPaymentDocumentKey, isReadinessStatus } from '@/types/treasury-readiness';

const BASE = '/customers/payment-readiness';
const PAGE_MAX = 100;

type Rec = Record<string, unknown>;

function rec(value: unknown): Rec | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Rec)
    : null;
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() ? value : null;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function bool(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function pick(raw: Rec, ...keys: string[]): unknown {
  for (const k of keys) if (k in raw && raw[k] !== undefined) return raw[k];
  return undefined;
}

// ── Piezas comunes ──────────────────────────────────────────────────────────

function docStatus(value: unknown): PaymentDocumentStatus {
  if (value === 'pending' || value === 'validated' || value === 'rejected' || value === 'expired')
    return value;
  // Forma previa del checklist: 'uploaded' = subido sin revisar.
  if (value === 'uploaded') return 'pending';
  return null;
}

function docState(value: unknown): ReadinessDocState | null {
  const r = rec(value);
  if (!r) return null;
  // Forma previa del listado: { uploaded: boolean, status: string|null }.
  if ('uploaded' in r && !('uploadedAt' in r)) {
    const uploaded = bool(r.uploaded) === true;
    const status = docStatus(r.status);
    return { status: uploaded ? (status ?? 'pending') : null };
  }
  return {
    status: docStatus(r.status),
    uploadedAt: str(r.uploadedAt),
    reviewedAt: str(r.reviewedAt),
    reasonCode: str(pick(r, 'reasonCode', 'rejectionReasonCode')),
    reasonLabel: str(pick(r, 'reasonLabel', 'rejectionReasonLabel')),
    notes: str(pick(r, 'notes', 'rejectionNotes')),
    contentType: str(r.contentType),
    required: bool(r.required) ?? undefined,
  };
}

function docs(value: unknown): ReadinessDocs {
  const r = rec(value);
  const out: ReadinessDocs = {};
  if (!r) return out;
  for (const [key, v] of Object.entries(r)) {
    if (!isPaymentDocumentKey(key)) continue;
    const state = docState(v);
    if (state) out[key] = state;
  }
  return out;
}

function regimeRef(value: unknown): RegimeRef | null {
  if (typeof value === 'string') return value.trim() ? { code: value } : null;
  const r = rec(value);
  const code = r ? str(r.code) : null;
  return code ? { code, name: r ? str(pick(r, 'name', 'description')) : null } : null;
}

function overall(value: unknown, fallback: ReadinessOverallStatus): ReadinessOverallStatus {
  if (typeof value === 'string') {
    if (isReadinessStatus(value)) return value;
    if (value === 'complete') return 'validated';
  }
  return fallback;
}

function blockers(value: unknown): ReadinessBlocker[] {
  return arr(value)
    .map((b): ReadinessBlocker | null => {
      if (typeof b === 'string') return b;
      const r = rec(b);
      const code = r ? str(r.code) : null;
      return code
        ? {
            code,
            message: r ? str(r.message) : null,
            label: r ? str(r.label) : null,
            field: r ? str(pick(r, 'field', 'item')) : null,
          }
        : null;
    })
    .filter((b): b is ReadinessBlocker => b !== null);
}

function amountByCurrency(value: unknown): AmountByCurrency[] {
  return arr(value)
    .map((x): AmountByCurrency | null => {
      const r = rec(x);
      const currency = r ? str(pick(r, 'currency', 'currencyCode')) : null;
      const amount = r ? num(pick(r, 'amount', 'total')) : null;
      return currency && amount !== null ? { currency, amount } : null;
    })
    .filter((x): x is AmountByCurrency => x !== null);
}

function period(value: unknown): ReadinessRow['periodCommission'] {
  const r = rec(value);
  if (!r) return null;
  const amount = num(r.amount);
  const currencyCode = str(pick(r, 'currencyCode', 'currency'));
  return amount !== null && currencyCode ? { amount, currencyCode } : null;
}

// ── Listado ─────────────────────────────────────────────────────────────────

function normalizeRow(value: unknown): ReadinessRow | null {
  const r = rec(value);
  if (!r) return null;
  const customerId = str(pick(r, 'customerId', 'id'));
  if (!customerId) return null;
  const progressRec = rec(r.progress);
  const completed = progressRec ? (num(progressRec.completed) ?? 0) : (num(r.completedCount) ?? 0);
  const total = progressRec
    ? (num(progressRec.total) ?? 0)
    : completed + (num(r.missingCount) ?? 0);
  const docsRec = pick(r, 'docs', 'documents');
  const reviewerRec = rec(r.lastReviewer);
  const bankRec = rec(r.bankAccount);
  const overallStatus = overall(r.overallStatus, 'incomplete');
  return {
    customerId,
    customerNumber: str(r.customerNumber),
    name: str(pick(r, 'name', 'customerName')) ?? '—',
    countryCode: str(pick(r, 'countryCode', 'country')),
    progress: { completed, total },
    docs: docs(docsRec),
    taxRegime: regimeRef(pick(r, 'taxRegime', 'commissionRegime')),
    satRegime: regimeRef(r.satRegime),
    bankAccount: bankRec
      ? {
          bankName: str(bankRec.bankName),
          bankCode: str(bankRec.bankCode),
          accountLast4: str(pick(bankRec, 'accountLast4', 'last4')),
          currency: str(pick(bankRec, 'currency', 'currencyCode')),
          isVerified: bool(bankRec.isVerified) === true,
        }
      : null,
    overallStatus,
    readyToPay: bool(r.readyToPay) ?? false,
    submittedAt: str(pick(r, 'submittedAt', 'paymentDocsSubmittedAt')),
    daysInQueue: num(r.daysInQueue),
    lastReviewer: reviewerRec
      ? { name: str(reviewerRec.name), at: str(pick(reviewerRec, 'at', 'reviewedAt')) }
      : null,
    periodCommission: period(r.periodCommission),
    blockers: 'blockers' in r ? blockers(r.blockers) : undefined,
    email: str(r.email),
    phone: str(r.phone),
  };
}

const EMPTY_STATS: ReadinessStats = {
  notStarted: 0,
  incomplete: 0,
  pendingValidation: 0,
  rejected: 0,
  validated: 0,
  readyToPay: 0,
  earnersBlocked: { count: 0, amountByCurrency: [] },
  slaBreaches: 0,
};

function normalizeStats(value: unknown): ReadinessStats {
  const r = rec(value);
  if (!r) return EMPTY_STATS;
  const eb = rec(r.earnersBlocked);
  return {
    notStarted: num(r.notStarted) ?? 0,
    incomplete: num(r.incomplete) ?? 0,
    pendingValidation: num(r.pendingValidation) ?? 0,
    rejected: num(r.rejected) ?? 0,
    validated: num(r.validated) ?? 0,
    readyToPay: num(r.readyToPay) ?? 0,
    earnersBlocked: {
      count: eb ? (num(eb.count) ?? 0) : 0,
      amountByCurrency: eb ? amountByCurrency(eb.amountByCurrency) : [],
    },
    slaBreaches: num(r.slaBreaches) ?? 0,
  };
}

function normalizeMeta(r: Rec, rows: number, fallbackLimit: number): PageMeta {
  const meta = rec(r.meta);
  const total = (meta ? num(meta.total) : num(r.total)) ?? rows;
  const limit = (meta ? num(meta.limit) : num(r.limit)) ?? fallbackLimit;
  const page = (meta ? num(meta.page) : num(r.page)) ?? 1;
  const totalPages =
    (meta ? num(meta.totalPages) : num(r.totalPages)) ??
    Math.max(1, Math.ceil(total / Math.max(1, limit)));
  return { total, page, limit, totalPages };
}

export function normalizeReadinessList(input: unknown, fallbackLimit: number): ReadinessListResponse {
  const r = rec(input) ?? {};
  const data = arr(r.data)
    .map(normalizeRow)
    .filter((row): row is ReadinessRow => row !== null);
  return { data, meta: normalizeMeta(r, data.length, fallbackLimit), stats: normalizeStats(r.stats) };
}

function listParams(filters: ReadinessListFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters.status) p.status = filters.status;
  if (filters.document) p.document = filters.document;
  if (filters.documentStatus) p.documentStatus = filters.documentStatus;
  if (filters.countryCode) p.countryCode = filters.countryCode;
  if (filters.earnersOfPeriodId) p.earnersOfPeriodId = filters.earnersOfPeriodId;
  if (filters.minDaysInQueue !== undefined && filters.minDaysInQueue > 0)
    p.minDaysInQueue = String(filters.minDaysInQueue);
  if (filters.search) p.search = filters.search;
  if (filters.sortBy) p.sortBy = filters.sortBy;
  if (filters.sortDir) p.sortDir = filters.sortDir;
  if (filters.page) p.page = String(filters.page);
  if (filters.limit) p.limit = String(Math.min(filters.limit, PAGE_MAX));
  return p;
}

// ── Detalle ─────────────────────────────────────────────────────────────────

const LEGACY_ITEM_KEYS: Record<string, string> = {
  ineDocument: 'doc:ine',
  taxIdDocument: 'doc:taxId',
  bankStatement: 'doc:bankStatement',
  clabe: 'bankAccount',
};

function legacyItemStatus(status: unknown): { status: string; done: boolean } {
  switch (status) {
    case 'complete':
      return { status: 'ok', done: true };
    case 'validated':
      return { status: 'validated', done: true };
    case 'uploaded':
      return { status: 'pending', done: true };
    case 'rejected':
      return { status: 'rejected', done: false };
    default:
      return { status: 'missing', done: false };
  }
}

function checklistItem(value: unknown): ReadinessChecklistItem | null {
  const r = rec(value);
  if (!r) return null;
  const rawKey = str(pick(r, 'key', 'field'));
  if (!rawKey) return null;
  const labelRec = rec(r.label);
  const label = labelRec ? (str(labelRec.es) ?? str(labelRec.en) ?? rawKey) : (str(r.label) ?? rawKey);
  if ('field' in r && !('key' in r)) {
    // Checklist previo: { field, label, status: complete|missing|uploaded|validated|rejected }
    const s = legacyItemStatus(r.status);
    return { key: LEGACY_ITEM_KEYS[rawKey] ?? rawKey, label, status: s.status, done: s.done };
  }
  const status = str(r.status) ?? 'missing';
  const done = bool(pick(r, 'done', 'ok')) ?? (status === 'ok' || status === 'validated');
  const kind = str(r.kind);
  return {
    key: rawKey,
    kind:
      kind === 'field' || kind === 'document' || kind === 'bank' || kind === 'regime' || kind === 'consent'
        ? kind
        : null,
    label,
    status,
    done,
    detail: str(r.detail),
  };
}

function review(value: unknown): DocumentReview | null {
  const r = rec(value);
  if (!r) return null;
  const document = str(r.document);
  const action = str(r.action);
  const createdAt = str(pick(r, 'createdAt', 'at'));
  if (!document || !action || !createdAt) return null;
  const actor = rec(r.actor);
  return {
    id: str(r.id) ?? undefined,
    document,
    action,
    reasonCode: str(r.reasonCode),
    reasonLabel: str(r.reasonLabel),
    notes: str(r.notes),
    actorType: str(r.actorType) ?? (actor ? (str(actor.type) ?? 'staff') : 'system'),
    actorName: str(pick(r, 'actorName', 'reviewerName')) ?? (actor ? str(actor.name) : null),
    createdAt,
    filePath: str(r.filePath),
  };
}

function duplicateRefs(value: unknown): DuplicateRef[] {
  return arr(value)
    .map((x): DuplicateRef | null => {
      if (typeof x === 'string') return { customerId: x };
      const r = rec(x);
      const customerId = r ? str(pick(r, 'customerId', 'id')) : null;
      return customerId
        ? { customerId, customerNumber: r ? str(r.customerNumber) : null, name: r ? str(r.name) : null }
        : null;
    })
    .filter((x): x is DuplicateRef => x !== null);
}

function bankDetail(value: unknown): ReadinessBankDetail | null {
  const r = rec(value);
  if (!r) return null;
  const accountType = r.accountType === 'checking' || r.accountType === 'savings' ? r.accountType : null;
  const verifiedBy = rec(r.verifiedBy);
  return {
    id: str(r.id),
    bankCode: str(r.bankCode),
    bankName: str(r.bankName),
    accountMasked: str(pick(r, 'accountMasked', 'clabeMasked')),
    holder: str(pick(r, 'holder', 'accountHolder')),
    currency: str(pick(r, 'currency', 'currencyCode')),
    accountType,
    routingMasked: str(r.routingMasked),
    isVerified: bool(r.isVerified) === true,
    verifiedAt: str(r.verifiedAt),
    verifiedBy: verifiedBy ? { id: str(verifiedBy.id) ?? undefined, name: str(verifiedBy.name) } : str(r.verifiedBy),
    countryCode: str(r.countryCode),
  };
}

/** Detalle del contrato; tolera el checklist plano previo (`items[]`). */
export function normalizeReadinessDetail(input: unknown, customerIdHint: string): ReadinessDetail {
  const r = rec(input) ?? {};
  const customerRec = rec(r.customer);
  const captured = rec(pick(r, 'captured', 'fields', 'data')) ?? r;
  const legacyItems = arr(r.items);
  const checklistRaw = arr(r.checklist).length > 0 ? arr(r.checklist) : legacyItems;
  const checklist = checklistRaw
    .map(checklistItem)
    .filter((i): i is ReadinessChecklistItem => i !== null);

  // Valores capturados: en el contrato viajan junto al checklist; el checklist
  // plano previo los traía en `items[].value`.
  const legacyValue = (field: string): string | null => {
    const it = legacyItems.map(rec).find((x) => x && x.field === field);
    return it ? str(it.value) : null;
  };
  const legacyDocs: ReadinessDocs = {};
  for (const it of legacyItems.map(rec)) {
    if (!it) continue;
    const field = str(it.field);
    const key = field ? LEGACY_ITEM_KEYS[field] : null;
    if (!key || !key.startsWith('doc:')) continue;
    const doc = key.slice(4);
    if (!isPaymentDocumentKey(doc)) continue;
    const uploaded = !!str(it.url) || it.status === 'uploaded' || it.status === 'validated' || it.status === 'rejected';
    legacyDocs[doc] = {
      status: uploaded ? (docStatus(it.status) ?? 'pending') : null,
      reasonLabel: str(it.rejectionReason),
    };
  }
  const docsRec = pick(r, 'docs', 'documents');
  const normalizedDocs = docsRec !== undefined ? docs(docsRec) : legacyDocs;

  const progressRec = rec(r.progress);
  const completed = progressRec ? (num(progressRec.completed) ?? 0) : checklist.filter((i) => i.done).length;
  const total = progressRec ? (num(progressRec.total) ?? 0) : checklist.length;

  const overallReady = bool(r.overallReady);
  const fallbackStatus: ReadinessOverallStatus =
    overallReady === true ? 'validated' : completed === 0 ? 'not_started' : 'incomplete';

  const fc = rec(r.formatChecks);
  const dup = rec(r.duplicates);
  const consent = rec(r.consent);
  const satRegime = regimeRef(pick(r, 'satRegime', 'satTaxRegime'));

  return {
    customer: {
      customerId: str(pick(customerRec ?? {}, 'customerId', 'id')) ?? str(r.customerId) ?? customerIdHint,
      customerNumber: str(pick(customerRec ?? {}, 'customerNumber', 'number')) ?? str(r.customerNumber),
      name: str(pick(customerRec ?? {}, 'name')) ?? str(pick(r, 'customerName', 'name')) ?? '—',
      countryCode: str(pick(customerRec ?? {}, 'countryCode', 'country')) ?? str(r.countryCode),
      payoutCurrency: str(pick(customerRec ?? {}, 'payoutCurrency', 'currency')) ?? str(r.payoutCurrency),
    },
    overallStatus: overall(r.overallStatus, fallbackStatus),
    readyToPay: bool(r.readyToPay) ?? overallReady ?? false,
    progress: { completed, total },
    checklist,
    blockers: blockers(r.blockers),
    docs: normalizedDocs,
    reviews: arr(r.reviews)
      .map(review)
      .filter((x): x is DocumentReview => x !== null),
    taxRegime: regimeRef(pick(r, 'taxRegime', 'commissionRegime')),
    satRegime,
    bankAccount: bankDetail(r.bankAccount),
    duplicates: {
      rfcSharedWith: duplicateRefs(dup?.rfcSharedWith),
      curpSharedWith: duplicateRefs(dup?.curpSharedWith),
      accountSharedWith: duplicateRefs(dup?.accountSharedWith),
    },
    formatChecks: {
      curp: fc ? bool(fc.curp) : null,
      rfc: fc ? bool(fc.rfc) : null,
      rfcGeneric: fc ? bool(fc.rfcGeneric) : null,
      clabe: fc ? bool(fc.clabe) : null,
      rfcMatchesCurp: fc ? bool(fc.rfcMatchesCurp) : null,
      holderMatchesName: fc ? bool(fc.holderMatchesName) : null,
    },
    consent: consent
      ? {
          acceptedAt: str(consent.acceptedAt),
          version: str(consent.version),
          currentVersion: str(consent.currentVersion),
          required: bool(consent.required) ?? !str(consent.acceptedAt),
        }
      : null,
    daysInQueue: num(r.daysInQueue),
    submittedAt: str(pick(r, 'submittedAt', 'paymentDocsSubmittedAt')),
    captured: {
      email: str(captured.email) ?? legacyValue('email'),
      phone: str(captured.phone) ?? legacyValue('phone'),
      curp: str(captured.curp) ?? legacyValue('curp'),
      rfc: str(captured.rfc) ?? legacyValue('rfc'),
      ineNumber: str(captured.ineNumber) ?? legacyValue('ineNumber'),
      satRegimeCode: str(captured.satRegimeCode) ?? satRegime?.code ?? null,
      satRegimeName: str(captured.satRegimeName) ?? satRegime?.name ?? null,
      fiscalZipCode: str(captured.fiscalZipCode),
    },
    periodCommission: period(r.periodCommission),
  };
}

// ── Catálogos ───────────────────────────────────────────────────────────────

function rejectionReason(value: unknown): RejectionReasonItem | null {
  const r = rec(value);
  const code = r ? str(r.code) : null;
  if (!r || !code) return null;
  const labelRec = rec(r.label);
  const label = labelRec ? (str(labelRec.es) ?? str(labelRec.en)) : (str(r.label) ?? str(r.es) ?? str(r.en));
  return { code, label: label ?? code, notesRequired: bool(r.notesRequired) === true };
}

export function normalizeReadinessCatalogs(input: unknown): ReadinessCatalogs {
  const r = rec(input) ?? {};
  const required = rec(r.requiredByCountry) ?? {};
  const requiredByCountry: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(required)) {
    requiredByCountry[k] = arr(v).filter((x): x is string => typeof x === 'string');
  }
  return {
    rejectionReasons: arr(r.rejectionReasons)
      .map(rejectionReason)
      .filter((x): x is RejectionReasonItem => x !== null),
    banks: arr(r.banks)
      .map((b): BankCatalogItem | null => {
        const x = rec(b);
        const code = x ? str(x.code) : null;
        const name = x ? str(x.name) : null;
        return x && code && name ? { code, name, shortName: str(x.shortName) } : null;
      })
      .filter((x): x is BankCatalogItem => x !== null),
    commissionRegimes: arr(r.commissionRegimes)
      .map(regimeRef)
      .filter((x): x is RegimeRef => x !== null),
    satRegimes: arr(r.satRegimes)
      .map((s): SatRegimeCatalogItem | null => {
        const x = rec(s);
        const code = x ? str(pick(x, 'code', 'Value')) : null;
        const description = x ? str(pick(x, 'description', 'Name', 'name')) : null;
        return code ? { code, description: description ?? code } : null;
      })
      .filter((x): x is SatRegimeCatalogItem => x !== null),
    requiredByCountry,
    slaDays: num(r.slaDays),
    consentVersion: str(r.consentVersion),
  };
}

function normalizeHistory(input: unknown): TaxRegimeHistoryEntry[] {
  const r = rec(input);
  const list = Array.isArray(input) ? input : r ? arr(pick(r, 'data', 'history')) : [];
  return list
    .map((x): TaxRegimeHistoryEntry | null => {
      const e = rec(x);
      if (!e) return null;
      const by = rec(e.changedBy);
      return {
        id: str(e.id) ?? undefined,
        previousCode: str(pick(e, 'previousCode', 'previousRegimeCode', 'fromCode', 'oldRegime')),
        newCode: str(pick(e, 'newCode', 'newRegimeCode', 'toCode', 'newRegime', 'regimeCode')),
        reason: str(e.reason),
        changedAt: str(pick(e, 'changedAt', 'createdAt')),
        changedBy: by ? { id: str(by.id) ?? undefined, name: str(by.name) } : str(pick(e, 'changedBy', 'changedByName')),
      };
    })
    .filter((x): x is TaxRegimeHistoryEntry => x !== null);
}

// ── Servicio ────────────────────────────────────────────────────────────────

class TreasuryReadinessService {
  /** GET /customers/payment-readiness/list → { data, meta, stats } */
  async list(filters: ReadinessListFilters): Promise<ReadinessListResponse> {
    const { data } = await api.get<unknown>(`${BASE}/list`, { params: listParams(filters) });
    return normalizeReadinessList(data, filters.limit ?? 20);
  }

  /** GET /customers/payment-readiness/export (CSV con @AuditLogExport). */
  async exportCsv(
    filters: ReadinessListFilters,
  ): Promise<{ blob: Blob; disposition: string | null }> {
    const { page: _page, limit: _limit, ...rest } = filters;
    void _page;
    void _limit;
    const res = await api.get<Blob>(`${BASE}/export`, {
      params: listParams(rest),
      responseType: 'blob',
    });
    const headers = res.headers as Record<string, unknown>;
    const disposition = headers['content-disposition'];
    return { blob: res.data, disposition: typeof disposition === 'string' ? disposition : null };
  }

  /** GET /customers/payment-readiness/catalogs */
  async catalogs(): Promise<ReadinessCatalogs> {
    const { data } = await api.get<unknown>(`${BASE}/catalogs`);
    return normalizeReadinessCatalogs(data);
  }

  /** GET /customers/payment-readiness/:customerId */
  async detail(customerId: string): Promise<ReadinessDetail> {
    const { data } = await api.get<unknown>(`${BASE}/${encodeURIComponent(customerId)}`);
    return normalizeReadinessDetail(data, customerId);
  }

  /** GET /customers/payment-readiness/:customerId/documents/:document/url (firmada 15 min). */
  async documentUrl(customerId: string, document: PaymentDocumentKey): Promise<DocumentUrlResult> {
    const { data } = await api.get<unknown>(
      `${BASE}/${encodeURIComponent(customerId)}/documents/${document}/url`,
    );
    const r = rec(data) ?? {};
    const url = str(r.url);
    if (!url) throw new Error('El API no devolvió la URL firmada del documento');
    return {
      url,
      expiresAt: str(r.expiresAt),
      contentType: str(r.contentType),
      uploadedAt: str(r.uploadedAt),
    };
  }

  /** POST /customers/payment-readiness/:customerId/review */
  async review(customerId: string, payload: ReviewPayload): Promise<ReviewResult> {
    const { data } = await api.post<ReviewResult>(
      `${BASE}/${encodeURIComponent(customerId)}/review`,
      payload,
    );
    return rec(data) ?? {};
  }

  /** POST /customers/payment-readiness/:customerId/documents/:document/revoke */
  async revoke(customerId: string, document: PaymentDocumentKey, payload: RevokePayload): Promise<void> {
    await api.post(`${BASE}/${encodeURIComponent(customerId)}/documents/${document}/revoke`, payload);
  }

  /** POST /customers/payment-readiness/remind */
  async remind(payload: RemindPayload): Promise<RemindResult> {
    const { data } = await api.post<unknown>(`${BASE}/remind`, payload);
    const r = rec(data) ?? {};
    return {
      queued: num(r.queued) ?? 0,
      skipped: arr(r.skipped)
        .map((s) => {
          const x = rec(s);
          const customerId = x ? str(x.customerId) : null;
          return customerId ? { customerId, reason: (x && str(x.reason)) ?? '' } : null;
        })
        .filter((x): x is { customerId: string; reason: string } => x !== null),
    };
  }

  /** PATCH /customers/:id/tax-regime { regimeCode, reason } (§4.3). */
  async assignTaxRegime(customerId: string, payload: AssignTaxRegimePayload): Promise<void> {
    await api.patch(`/customers/${encodeURIComponent(customerId)}/tax-regime`, payload);
  }

  /** GET /customers/:id/tax-regime/history */
  async taxRegimeHistory(customerId: string): Promise<TaxRegimeHistoryEntry[]> {
    const { data } = await api.get<unknown>(`/customers/${encodeURIComponent(customerId)}/tax-regime/history`);
    return normalizeHistory(data);
  }

  /** GET /mlm/tax-regimes/sat-suggestions → { '605': 'ASIMILADOS', … } */
  async satSuggestions(): Promise<SatSuggestionMap> {
    const { data } = await api.get<unknown>('/mlm/tax-regimes/sat-suggestions');
    const r = rec(data);
    const inner = r && rec(r.data) ? rec(r.data) : r;
    const out: SatSuggestionMap = {};
    if (!inner) return out;
    for (const [k, v] of Object.entries(inner)) {
      if (typeof v === 'string' && v.trim()) out[k] = v;
    }
    return out;
  }
}

export const treasuryReadinessService = new TreasuryReadinessService();
export default treasuryReadinessService;
