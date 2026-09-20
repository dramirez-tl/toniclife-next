// readiness-labels.ts — Etiquetas, tonos y helpers de Validación de Datos.
// Texto en español (Tesorería). Sin datos personales en logs: los helpers de
// CSV solo usan lo que ya muestra la tabla (número, nombre, país, estados).

import type { BadgeTone } from '../treasury-format';
import { csvSafe } from '../treasury-format';
import { buildCsv } from '@/lib/csv-export';
import type {
  DocumentReviewAction,
  PaymentDocumentKey,
  PaymentDocumentStatus,
  ReadinessCatalogs,
  ReadinessOverallStatus,
  ReadinessRow,
  RemindChannel,
} from '@/types/treasury-readiness';

// ── Estado general ──────────────────────────────────────────────────────────

export const READINESS_STATUS_LABELS: Record<ReadinessOverallStatus, string> = {
  not_started: 'Sin iniciar',
  incomplete: 'Incompleto',
  pending_validation: 'Por revisar',
  rejected: 'Rechazado',
  validated: 'Validado',
};

export const READINESS_STATUS_TONES: Record<ReadinessOverallStatus, BadgeTone> = {
  not_started: 'outline',
  incomplete: 'secondary',
  pending_validation: 'warning',
  rejected: 'destructive',
  validated: 'success',
};

// ── Documentos ──────────────────────────────────────────────────────────────

export const DOCUMENT_LABELS: Record<PaymentDocumentKey, string> = {
  ine: 'INE',
  taxId: 'Constancia fiscal',
  bankStatement: 'Carátula bancaria',
  foreignId: 'Identificación',
  w9: 'W-9',
};

export const DOCUMENT_LONG_LABELS: Record<PaymentDocumentKey, string> = {
  ine: 'Identificación oficial (INE)',
  taxId: 'Constancia de situación fiscal',
  bankStatement: 'Carátula de cuenta bancaria',
  foreignId: 'Identificación oficial',
  w9: 'Formulario W-9',
};

export const DOCUMENT_STATUS_LABELS: Record<Exclude<PaymentDocumentStatus, null> | 'missing', string> = {
  missing: 'No subido',
  pending: 'Por revisar',
  validated: 'Validado',
  rejected: 'Rechazado',
  expired: 'Vencido',
};

export const DOCUMENT_STATUS_TONES: Record<Exclude<PaymentDocumentStatus, null> | 'missing', BadgeTone> = {
  missing: 'outline',
  pending: 'warning',
  validated: 'success',
  rejected: 'destructive',
  expired: 'destructive',
};

/** Perfil de país (FN = frontera norte se trata como MX). Solo para mostrar. */
export function countryProfileOf(countryCode: string | null | undefined): 'MX' | 'US' | 'LATAM' {
  const c = (countryCode || '').trim().toUpperCase();
  if (c === 'MX' || c === 'FN' || c === '') return 'MX';
  if (c === 'US') return 'US';
  return 'LATAM';
}

const DEFAULT_DOCS_BY_PROFILE: Record<'MX' | 'US' | 'LATAM', PaymentDocumentKey[]> = {
  MX: ['ine', 'taxId', 'bankStatement'],
  US: ['foreignId', 'w9'],
  LATAM: ['foreignId', 'bankStatement'],
};

/**
 * Documentos que se muestran para un país: los requeridos según el catálogo
 * (`requiredByCountry`, claves `doc:*`) o, si no cargó, el perfil por defecto;
 * más cualquier documento que ya exista en la fila (aunque el país cambie).
 */
export function documentsForCountry(
  countryCode: string | null | undefined,
  catalogs: ReadinessCatalogs | undefined,
  present: Partial<Record<PaymentDocumentKey, unknown>> = {},
): PaymentDocumentKey[] {
  const profile = countryProfileOf(countryCode);
  const fromCatalog = catalogs?.requiredByCountry?.[profile] ?? catalogs?.requiredByCountry?.[(countryCode || '').toUpperCase()];
  const required: PaymentDocumentKey[] = fromCatalog
    ? fromCatalog
        .filter((k) => k.startsWith('doc:'))
        .map((k) => k.slice(4))
        .filter((k): k is PaymentDocumentKey => k in DOCUMENT_LABELS)
    : DEFAULT_DOCS_BY_PROFILE[profile];
  const out = [...required];
  for (const key of Object.keys(present) as PaymentDocumentKey[]) {
    const state = present[key];
    const hasStatus =
      typeof state === 'object' && state !== null && (state as { status?: unknown }).status;
    if (hasStatus && !out.includes(key) && key in DOCUMENT_LABELS) out.push(key);
  }
  return out;
}

// ── Bitácora ────────────────────────────────────────────────────────────────

export const REVIEW_ACTION_LABELS: Record<DocumentReviewAction, string> = {
  uploaded: 'Subido',
  validated: 'Validado',
  rejected: 'Rechazado',
  revoked: 'Revocado',
  reset: 'Reiniciado',
  expired: 'Vencido',
};

export const REVIEW_ACTION_TONES: Record<DocumentReviewAction, BadgeTone> = {
  uploaded: 'info',
  validated: 'success',
  rejected: 'destructive',
  revoked: 'destructive',
  reset: 'secondary',
  expired: 'warning',
};

export function reviewActionLabel(action: string): string {
  return (REVIEW_ACTION_LABELS as Record<string, string>)[action] ?? action;
}

export function reviewActionTone(action: string): BadgeTone {
  return (REVIEW_ACTION_TONES as Record<string, BadgeTone>)[action] ?? 'secondary';
}

export const ACTOR_TYPE_LABELS: Record<string, string> = {
  distributor: 'Distribuidor',
  staff: 'Tesorería',
  system: 'Sistema',
};

export const REMIND_CHANNEL_LABELS: Record<RemindChannel, string> = {
  inApp: 'Aviso en el panel',
  email: 'Correo electrónico',
  whatsapp: 'WhatsApp (plantilla aprobada)',
};

// ── Checklist ───────────────────────────────────────────────────────────────

export const CHECKLIST_STATUS_LABELS: Record<string, string> = {
  missing: 'Falta',
  invalid: 'Inválido',
  pending: 'Por revisar',
  validated: 'Validado',
  rejected: 'Rechazado',
  expired: 'Vencido',
  ok: 'Completo',
};

/** Label por defecto de un ítem del checklist cuando el API manda solo la clave. */
export const CHECKLIST_KEY_LABELS: Record<string, string> = {
  email: 'Correo electrónico',
  phone: 'Teléfono',
  curp: 'CURP',
  rfc: 'RFC',
  ineNumber: 'Número de INE',
  satRegime: 'Régimen fiscal (SAT)',
  'doc:ine': DOCUMENT_LONG_LABELS.ine,
  'doc:taxId': DOCUMENT_LONG_LABELS.taxId,
  'doc:bankStatement': DOCUMENT_LONG_LABELS.bankStatement,
  'doc:foreignId': DOCUMENT_LONG_LABELS.foreignId,
  'doc:w9': DOCUMENT_LONG_LABELS.w9,
  bankAccount: 'Cuenta bancaria verificada',
  commissionRegime: 'Régimen de comisión asignado',
  consent: 'Aviso de privacidad aceptado',
};

export function checklistLabel(key: string, label: string | null | undefined): string {
  if (label && label !== key) return label;
  return CHECKLIST_KEY_LABELS[key] ?? key;
}

// ── Cola / SLA ──────────────────────────────────────────────────────────────

export function isOverSla(daysInQueue: number | null | undefined, slaDays: number | null | undefined): boolean {
  if (daysInQueue === null || daysInQueue === undefined) return false;
  if (slaDays === null || slaDays === undefined) return false;
  return daysInQueue > slaDays;
}

export function daysLabel(days: number | null | undefined): string {
  if (days === null || days === undefined) return '—';
  if (days === 0) return 'Hoy';
  return days === 1 ? '1 día' : `${days} días`;
}

// ── CSV de selección (cliente) ──────────────────────────────────────────────

export const READINESS_CSV_HEADERS = [
  'Número',
  'Distribuidor',
  'País',
  'Estado',
  'Listo para pagar',
  'Progreso',
  'INE',
  'Constancia fiscal',
  'Carátula bancaria',
  'Identificación',
  'W-9',
  'Régimen de comisión',
  'Banco',
  'Cuenta (últimos 4)',
  'Cuenta verificada',
  'En cola (días)',
  'Enviado a revisión',
  'Comisión del periodo',
  'Moneda',
  'Último revisor',
];

function docCell(row: ReadinessRow, key: PaymentDocumentKey): string {
  const status = row.docs[key]?.status;
  return status ? DOCUMENT_STATUS_LABELS[status] : '';
}

export function buildReadinessCsv(rows: ReadinessRow[]): string {
  return buildCsv(
    READINESS_CSV_HEADERS,
    rows.map((r) => [
      csvSafe(r.customerNumber),
      csvSafe(r.name),
      csvSafe(r.countryCode),
      READINESS_STATUS_LABELS[r.overallStatus],
      r.readyToPay ? 'Sí' : 'No',
      `${r.progress.completed}/${r.progress.total}`,
      docCell(r, 'ine'),
      docCell(r, 'taxId'),
      docCell(r, 'bankStatement'),
      docCell(r, 'foreignId'),
      docCell(r, 'w9'),
      csvSafe(r.taxRegime?.code),
      csvSafe(r.bankAccount?.bankName),
      csvSafe(r.bankAccount?.accountLast4),
      r.bankAccount ? (r.bankAccount.isVerified ? 'Sí' : 'No') : '',
      r.daysInQueue ?? '',
      r.submittedAt ? r.submittedAt.slice(0, 10) : '',
      r.periodCommission ? r.periodCommission.amount : '',
      csvSafe(r.periodCommission?.currencyCode),
      csvSafe(r.lastReviewer?.name),
    ]),
  );
}
