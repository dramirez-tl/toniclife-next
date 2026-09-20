// paymentUtils.ts — helpers puros de "Datos para Comisiones" (sin React).
// Validación en vivo con `@/lib/mx-ids` (espejo de common/validators del API),
// normalización defensiva del checklist y mapeo de errores TRS_* a claves i18n.

import {
  validateCurp,
  validateRfc,
  validateClabe,
  detectBankFromClabe,
  validateUsRouting,
} from '@/lib/mx-ids';
import type { LanguageCode } from '@/i18n/config';
import type {
  PaymentDocumentKey,
  PaymentDataResponse,
  ReadinessItem,
  RejectionReasonOption,
} from '@/types/distributor-payment';

// ---------------------------------------------------------------------------
// País
// ---------------------------------------------------------------------------

/** MX y FN (frontera norte) comparten reglas: CURP, RFC, CLABE, CSF. */
export function isMexicoLike(country: string | null | undefined): boolean {
  const c = (country || '').toUpperCase();
  return c === 'MX' || c === 'FN';
}

export function isUnitedStates(country: string | null | undefined): boolean {
  return (country || '').toUpperCase() === 'US';
}

export type BankFormKind = 'clabe' | 'us' | 'generic';

export function bankFormKind(country: string | null | undefined): BankFormKind {
  if (isMexicoLike(country)) return 'clabe';
  if (isUnitedStates(country)) return 'us';
  return 'generic';
}

// ---------------------------------------------------------------------------
// Validadores (adaptador tolerante sobre @/lib/mx-ids)
// ---------------------------------------------------------------------------

export interface IdCheck {
  ok: boolean;
  /** FORMAT | DATE | CHECK_DIGIT | GENERIC | LENGTH | DIGITS … (según la lib). */
  reason?: string;
  personType?: 'fisica' | 'moral';
}

/** La lib puede devolver boolean o {ok, reason}; aquí se unifica. */
function asCheck(result: unknown): IdCheck {
  if (typeof result === 'boolean') return { ok: result };
  if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>;
    return {
      ok: Boolean(r.ok ?? r.valid ?? r.isValid),
      reason: typeof r.reason === 'string' ? r.reason : undefined,
      personType:
        r.personType === 'fisica' || r.personType === 'moral' ? r.personType : undefined,
    };
  }
  return { ok: false };
}

export function normalizeId(value: string): string {
  return (value || '').toUpperCase().replace(/\s+/g, '').trim();
}

export function checkCurp(curp: string): IdCheck {
  return asCheck(validateCurp(normalizeId(curp)));
}

export function checkRfc(rfc: string): IdCheck {
  return asCheck(validateRfc(normalizeId(rfc)));
}

export function checkClabe(clabe: string): IdCheck {
  return asCheck(validateClabe(onlyDigits(clabe)));
}

export function checkRouting(routing: string): IdCheck {
  return asCheck(validateUsRouting(onlyDigits(routing)));
}

export interface DetectedBank {
  code: string;
  name: string;
  shortName?: string;
}

/** Banco por los 3 primeros dígitos de la CLABE (null si no se reconoce). */
export function bankFromClabe(clabe: string): DetectedBank | null {
  const digits = onlyDigits(clabe);
  if (digits.length < 3) return null;
  const r = detectBankFromClabe(digits) as unknown;
  if (!r || typeof r !== 'object') return null;
  const b = r as Record<string, unknown>;
  const code = typeof b.code === 'string' ? b.code : null;
  const name = typeof b.name === 'string' ? b.name : null;
  if (!code || !name) return null;
  return { code, name, shortName: typeof b.shortName === 'string' ? b.shortName : undefined };
}

/** RFC de persona física (13) y CURP comparten los 10 primeros caracteres. */
export function rfcMatchesCurp(rfc: string, curp: string): boolean | null {
  const r = normalizeId(rfc);
  const c = normalizeId(curp);
  if (r.length !== 13 || c.length !== 18) return null;
  return r.slice(0, 10) === c.slice(0, 10);
}

export function onlyDigits(value: string): string {
  return (value || '').replace(/\D/g, '');
}

export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export type ChecklistState = 'complete' | 'pending' | 'rejected' | 'missing';

export interface ChecklistRow {
  key: string;
  state: ChecklistState;
  label: string | null;
  anchor: string;
  required: boolean;
}

const COMPLETE_STATES = new Set(['complete', 'completed', 'validated', 'verified', 'ok', 'done', 'accepted']);
const PENDING_STATES = new Set(['pending', 'pending_validation', 'in_review', 'uploaded', 'unverified', 'submitted']);
const REJECTED_STATES = new Set(['rejected', 'expired', 'revoked', 'invalid']);

export function checklistState(item: ReadinessItem): ChecklistState {
  if (item.ok === true) return 'complete';
  const s = (item.status || '').toLowerCase();
  if (COMPLETE_STATES.has(s)) return 'complete';
  if (PENDING_STATES.has(s)) return 'pending';
  if (REJECTED_STATES.has(s)) return 'rejected';
  return 'missing';
}

const DOCUMENT_ANCHOR_KEYS = new Set<string>(['ine', 'taxId', 'bankStatement', 'foreignId', 'w9']);

const FIELD_ANCHORS: Record<string, string> = {
  email: 'field-email',
  phone: 'field-phone',
  curp: 'field-curp',
  ineNumber: 'field-ineNumber',
  rfc: 'field-rfc',
  satRegime: 'field-satRegimeCode',
  satRegimeCode: 'field-satRegimeCode',
  fiscalZipCode: 'field-fiscalZipCode',
  commissionRegime: 'field-commissionRegime',
  bankAccount: 'field-bank',
  clabe: 'field-bank',
  account: 'field-bank',
  routing: 'field-bank',
  accountHolder: 'field-bank',
  consent: 'consent',
};

export function checklistAnchor(key: string): string {
  if (DOCUMENT_ANCHOR_KEYS.has(key)) return `doc-${key}`;
  const direct = FIELD_ANCHORS[key];
  if (direct) return direct;
  const lower = key.toLowerCase();
  if (lower.includes('doc')) {
    const doc = Array.from(DOCUMENT_ANCHOR_KEYS).find((d) => lower.includes(d.toLowerCase()));
    if (doc) return `doc-${doc}`;
  }
  if (lower.includes('bank') || lower.includes('clabe') || lower.includes('account')) return 'field-bank';
  if (lower.includes('regime')) return 'field-satRegimeCode';
  return `field-${key}`;
}

export function normalizeChecklist(items: ReadinessItem[] | null | undefined): ChecklistRow[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((it) => it && typeof it.key === 'string')
    .map((it) => ({
      key: it.key,
      state: checklistState(it),
      label: typeof it.label === 'string' && it.label.trim() ? it.label : null,
      anchor: checklistAnchor(it.key),
      required: it.required !== false,
    }));
}

/** Documentos requeridos para el país, en el orden del formulario. */
export function requiredDocuments(data: PaymentDataResponse | undefined): PaymentDocumentKey[] {
  if (!data) return [];
  const order: PaymentDocumentKey[] = ['ine', 'foreignId', 'taxId', 'w9', 'bankStatement'];
  return order.filter((k) => data.documents?.[k]?.required);
}

export function rejectedDocuments(data: PaymentDataResponse | undefined): PaymentDocumentKey[] {
  if (!data) return [];
  return (Object.keys(data.documents ?? {}) as PaymentDocumentKey[]).filter((k) => {
    const d = data.documents[k];
    return d && (d.status === 'rejected' || d.status === 'expired');
  });
}

// ---------------------------------------------------------------------------
// Motivos de rechazo (catálogo bilingüe)
// ---------------------------------------------------------------------------

export function rejectionReasonLabel(
  reasons: RejectionReasonOption[] | undefined,
  code: string | null | undefined,
  lang: LanguageCode,
  fallback: string | null,
): string | null {
  if (!code) return fallback;
  const found = reasons?.find((r) => r.code === code);
  if (!found) return fallback ?? code;
  const byLang = lang === 'en' ? found.en : found.es;
  return byLang || found.label || fallback || code;
}

// ---------------------------------------------------------------------------
// Errores TRS_* → clave i18n (errors.<code>) y campo → ancla
// ---------------------------------------------------------------------------

/** Códigos que tienen texto propio en `distributor.payments.errors`. */
export const KNOWN_ERROR_CODES = new Set([
  'TRS_MIGRATION_PENDING',
  'TRS_CURP_INVALID',
  'TRS_RFC_INVALID',
  'TRS_RFC_GENERIC',
  'TRS_CLABE_INVALID',
  'TRS_ROUTING_INVALID',
  'TRS_CURP_RFC_MISMATCH',
  'TRS_DUPLICATE_ID',
  'TRS_DOC_TYPE',
  'TRS_DOC_CONTENT',
  'TRS_DOC_UPLOAD_FAILED',
  'TRS_DOC_LOCKED',
  'TRS_DOC_NOT_PENDING',
  'TRS_CONSENT_REQUIRED',
  'TRS_EMAIL_READONLY',
  'TRS_REASON_REQUIRED',
]);

export function errorFieldAnchor(field: string | null | undefined): string | null {
  if (!field) return null;
  return checklistAnchor(field);
}

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

export function intlLocale(lang: LanguageCode): string {
  return lang === 'en' ? 'en-US' : 'es-MX';
}

export function formatDate(
  value: string | null | undefined,
  lang: LanguageCode,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' },
): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(intlLocale(lang), opts);
}

export function formatDateTime(value: string | null | undefined, lang: LanguageCode): string {
  return formatDate(value, lang, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Nombre del país en el idioma de la UI (Intl.DisplayNames; fallback al código). */
export function regionName(code: string | null | undefined, lang: LanguageCode): string {
  if (!code) return '';
  try {
    const dn = new Intl.DisplayNames([intlLocale(lang)], { type: 'region' });
    return dn.of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

/** Enfoca y desplaza a un ancla `#id` (campo o tarjeta de documento). */
export function scrollToAnchor(id: string): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const focusable = el.matches('input,select,textarea,button,[tabindex]')
    ? el
    : el.querySelector<HTMLElement>('input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),[tabindex="0"]');
  focusable?.focus({ preventScroll: true });
}
