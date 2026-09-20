// treasury-error.ts — Mensajes en español de los errores de Tesorería.
//
// El API responde `{ code: 'TRS_*', message (es), field?, details? }` (contrato
// §1.14 / §4). Aquí se lee `code` para DECIDIR y `message` para el texto; los
// códigos conocidos llevan una explicación fija para que el toast nunca sea
// genérico ("Request failed with status code 409").

import type { TreasuryBlockedDetail, TreasuryErrorBody } from '@/types/treasury';

type AxiosLikeError = {
  message?: unknown;
  response?: { status?: number; data?: unknown };
};

const GENERIC_MESSAGES = [
  'internal server error',
  'request failed',
  'network error',
  'bad request',
  'service unavailable',
];

/** Texto por código `TRS_*` (sin datos personales). */
export const TREASURY_ERROR_LABELS: Record<string, string> = {
  TRS_MIGRATION_PENDING:
    'La migración 142 de Tesorería no está aplicada: las acciones de escritura están cerradas.',
  TRS_CUTOVER_NOT_SET:
    'El corte v2 no está fijado (treasury.first_v2_payout_period_code): ningún periodo es aprobable ni pagable todavía.',
  TRS_CUTOVER_CONFLICT:
    'No se puede fijar el corte: los datos no son consistentes con él (periodos desde el corte ya pagados por el sistema anterior, o periodos anteriores al corte con comisiones vivas porque el corte legacy no ha corrido). Corre el corte legacy o mueve el corte y vuelve a intentarlo.',
  TRS_PERIOD_BEFORE_CUTOVER:
    'Este periodo es anterior al corte v2: lo paga el sistema anterior.',
  TRS_PERIOD_OPEN:
    'El periodo sigue abierto o su cierre no ha terminado: las cifras son estimadas y no se pueden aprobar ni pagar.',
  TRS_PERIOD_HAS_PAYOUTS:
    'El periodo tiene comisiones aprobadas, pagadas o canceladas (o lotes vivos): no se puede reabrir.',
  TRS_INVALID_STATUS: 'La transición de estado no está permitida para esta comisión.',
  TRS_COUNT_MISMATCH:
    'El conjunto de comisiones cambió desde que abriste la confirmación (alguien canceló, aprobó o recalculó mientras tanto): no se escribió nada. Vuelve a cargar y confirma de nuevo.',
  TRS_NOT_READY:
    'Hay comisiones sin datos de pago validados (expediente, cuenta verificada o régimen).',
  TRS_REGIME_MISSING: 'El distribuidor no tiene régimen fiscal de comisión asignado.',
  TRS_REGIME_MISMATCH:
    'El régimen fiscal con el que se calculó la comisión ya no coincide con el régimen actual del distribuidor: recalcula el periodo (cotejado) antes de aprobar para que las retenciones sean las correctas.',
  TRS_REGIME_FN_PENDING:
    'Distribuidor de Frontera Norte (FN): el tratamiento fiscal de FN está pendiente de definir (el motor no congela régimen para FN), así que la comisión no se aprueba ni se paga hasta resolverlo. No asignes régimen de comisión a distribuidores FN mientras tanto.',
  TRS_IN_BATCH: 'La comisión ya está en un lote de dispersión vivo.',
  TRS_USE_BATCH: 'Las transferencias se pagan por lote de dispersión, no con pago directo.',
  TRS_NO_FX_RATE: 'Falta el tipo de cambio del periodo para la moneda de pago.',
  TRS_LAYOUT_UNSUPPORTED: 'Formato de layout bancario no soportado.',
  TRS_LAYOUT_ROW_INVALID: 'Una fila del layout es inválida (CLABE o importe).',
  TRS_BATCH_STATE: 'La acción no es válida para el estado actual del lote.',
  TRS_RESULT_PARSE: 'No se pudo leer el archivo de resultado del banco.',
  TRS_RESULT_MISMATCH: 'El resultado del banco no coincide con el lote.',
  TRS_RESULT_TOKEN: 'El archivo de resultado cambió: vuelve a cargarlo.',
  TRS_REASON_REQUIRED: 'Indica un motivo de 5 a 300 caracteres.',
  TRS_SEGREGATION: 'Quien aprueba no puede pagar la misma comisión (segregación de funciones).',
  TRS_WITHHOLDING_TERMINAL: 'El convenio ya está cancelado o liquidado.',
  TRS_WITHHOLDING_LOAN_TOTAL: 'Un préstamo requiere el total del convenio.',
  TRS_WITHHOLDING_INSTALLMENT: 'El abono no puede exceder el saldo pendiente.',
};

/** Texto de los bloqueadores de readiness (códigos de readiness-rules.lib). */
export const READINESS_BLOCKER_LABELS: Record<string, string> = {
  TRS_REGIME_MISSING: 'Sin régimen fiscal de comisión',
  REGIME_MISSING: 'Sin régimen fiscal de comisión',
  TRS_REGIME_MISMATCH: 'Régimen congelado distinto al actual (recalcular)',
  REGIME_MISMATCH: 'Régimen congelado distinto al actual (recalcular)',
  TRS_REGIME_FN_PENDING: 'Frontera Norte (FN): tratamiento fiscal pendiente de definir',
  REGIME_FN_PENDING: 'Frontera Norte (FN): tratamiento fiscal pendiente de definir',
  DOCS_NOT_VALIDATED: 'Expediente sin validar',
  DOCUMENTS_NOT_VALIDATED: 'Expediente sin validar',
  BANK_NOT_VERIFIED: 'Cuenta bancaria sin verificar',
  BANK_ACCOUNT_MISSING: 'Sin cuenta bancaria',
  BANK_CURRENCY_MISMATCH: 'Cuenta en moneda distinta a la de pago',
  RFC_INVALID: 'RFC inválido',
  RFC_GENERIC: 'RFC genérico',
  RFC_MISSING: 'Sin RFC',
  CURP_INVALID: 'CURP inválida',
  CURP_MISSING: 'Sin CURP',
  CONSENT_MISSING: 'Sin aviso de privacidad aceptado',
  EMAIL_MISSING: 'Sin correo',
  PHONE_MISSING: 'Sin teléfono',
  INE_MISSING: 'Sin INE',
  TAXID_MISSING: 'Sin constancia fiscal',
  BANK_STATEMENT_MISSING: 'Sin carátula bancaria',
  FOREIGN_ID_MISSING: 'Sin identificación',
  W9_MISSING: 'Sin W-9',
  SAT_REGIME_MISSING: 'Sin régimen SAT declarado',
  NO_FX_RATE: 'Sin tipo de cambio del periodo',
  TRS_NO_FX_RATE: 'Sin tipo de cambio del periodo',
  NO_RATE: 'Convenio sin tipo de cambio',
  // Motivos de omisión al generar un lote (`skipped[].code` de POST /mlm/payout-batches).
  BANK_MISSING: 'Sin cuenta bancaria activa',
  CURRENCY_MISMATCH: 'Moneda de la fila distinta a la del lote',
  AMOUNT_ZERO: 'Importe a pagar en cero',
  NOT_FOUND: 'Comisión no encontrada o no aprobada',
  WITHHOLDING_CHANGED: 'El convenio de retención cambió tras generar el lote',
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isGeneric(message: string): boolean {
  const lower = message.trim().toLowerCase();
  return !lower || GENERIC_MESSAGES.some((g) => lower.startsWith(g));
}

function flattenMessage(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(flattenMessage).filter(Boolean).join(', ');
  return '';
}

/** Cuerpo uniforme `{ code, message, field?, details? }`, o null si no viene. */
export function treasuryErrorBody(err: unknown): TreasuryErrorBody | null {
  const error = err as AxiosLikeError | null | undefined;
  const body = asRecord(error?.response?.data);
  if (!body || typeof body.code !== 'string') return null;
  return {
    statusCode:
      typeof body.statusCode === 'number' ? body.statusCode : (error?.response?.status ?? 0),
    code: body.code,
    message: flattenMessage(body.message),
    field: typeof body.field === 'string' ? body.field : undefined,
    details: body.details,
  };
}

export function treasuryErrorCode(err: unknown): string | null {
  return treasuryErrorBody(err)?.code ?? null;
}

export function isTreasuryErrorCode(err: unknown, ...codes: string[]): boolean {
  const code = treasuryErrorCode(err);
  return code !== null && codes.includes(code);
}

/** Etiqueta en español de un `TRS_*` (o el código tal cual). */
export function treasuryCodeLabel(code: string | null | undefined): string {
  if (!code) return '';
  return TREASURY_ERROR_LABELS[code] ?? code;
}

/** Etiqueta de un bloqueador de readiness (código o `{code, message}`). */
export function readinessBlockerLabel(
  blocker: string | { code: string; message?: string | null; label?: string | null },
): string {
  if (typeof blocker === 'string') return READINESS_BLOCKER_LABELS[blocker] ?? blocker;
  return (
    blocker.label ??
    blocker.message ??
    READINESS_BLOCKER_LABELS[blocker.code] ??
    blocker.code
  );
}

/** `details.blocked[]` de `TRS_NOT_READY` (ids + bloqueadores), o []. */
export function treasuryBlockedDetails(err: unknown): TreasuryBlockedDetail[] {
  const body = treasuryErrorBody(err);
  const details = asRecord(body?.details);
  const blocked = details?.blocked;
  if (!Array.isArray(blocked)) return [];
  return blocked
    .map((b) => asRecord(b))
    .filter((b): b is Record<string, unknown> => b !== null && typeof b.id === 'string')
    .map((b) => ({
      id: String(b.id),
      customerNumber: typeof b.customerNumber === 'string' ? b.customerNumber : null,
      blockers: Array.isArray(b.blockers)
        ? (b.blockers as TreasuryBlockedDetail['blockers'])
        : [],
    }));
}

/** Conteo por motivo `{ code, count }` (orden descendente por conteo). */
export interface SkippedByCode {
  code: string;
  count: number;
}

/**
 * `details.skippedByCode` de `TRS_COUNT_MISMATCH` (approve-period): omitidas por
 * motivo. Tolera `{ CODE: n }` o `[{ code, count }]`; [] si no viene.
 */
export function treasurySkippedByCode(err: unknown): SkippedByCode[] {
  const body = treasuryErrorBody(err);
  const details = asRecord(body?.details);
  const raw = details?.skippedByCode;
  const out: SkippedByCode[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const rec = asRecord(item);
      if (!rec || typeof rec.code !== 'string') continue;
      const count = typeof rec.count === 'number' ? rec.count : Number(rec.count);
      if (Number.isFinite(count) && count > 0) out.push({ code: rec.code, count });
    }
  } else {
    const rec = asRecord(raw);
    if (rec) {
      for (const [code, value] of Object.entries(rec)) {
        const count = typeof value === 'number' ? value : Number(value);
        if (Number.isFinite(count) && count > 0) out.push({ code, count });
      }
    }
  }
  return out.sort((a, b) => b.count - a.count);
}

/** "Etiqueta ×n; Etiqueta ×m" de las omitidas por motivo (readiness o TRS_*). */
export function skippedByCodeText(items: SkippedByCode[]): string {
  return items
    .map((s) => `${READINESS_BLOCKER_LABELS[s.code] ?? TREASURY_ERROR_LABELS[s.code] ?? s.code} ×${s.count}`)
    .join('; ');
}

/**
 * Mensaje legible de un error de Tesorería. Con el cuerpo uniforme usa el
 * `message` del API (o la etiqueta del código si vino genérico) y añade el
 * campo, el conteo de bloqueadas y, en `TRS_COUNT_MISMATCH`, el esperado vs
 * real y las omitidas por motivo (`details.skippedByCode`); sin él, el
 * `message` de NestJS (string o arreglo) o el `fallback` con el HTTP.
 */
export function treasuryErrorMessage(err: unknown, fallback: string): string {
  const error = err as AxiosLikeError | null | undefined;
  const status = error?.response?.status;

  const uniform = treasuryErrorBody(err);
  if (uniform) {
    const parts: string[] = [];
    const known = TREASURY_ERROR_LABELS[uniform.code];
    const main = uniform.message && !isGeneric(uniform.message) ? uniform.message : '';
    parts.push(main || known || `${fallback} (${uniform.code})`);
    if (known && main && main !== known) parts.push(known);
    if (uniform.field) parts.push(`Campo: ${uniform.field}`);
    const blocked = treasuryBlockedDetails(err);
    if (blocked.length > 0) parts.push(`${blocked.length} comisión(es) bloqueada(s)`);
    if (uniform.code === 'TRS_COUNT_MISMATCH') {
      const details = asRecord(uniform.details);
      const expected = typeof details?.expected === 'number' ? details.expected : null;
      const actual = typeof details?.actual === 'number' ? details.actual : null;
      if (expected !== null && actual !== null) parts.push(`Esperadas ${expected}, aprobables ahora ${actual}`);
    }
    const skipped = treasurySkippedByCode(err);
    if (skipped.length > 0) parts.push(`Omitidas por motivo: ${skippedByCodeText(skipped)}`);
    return Array.from(new Set(parts)).join(' · ');
  }

  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data.trim();

  const body = asRecord(data);
  if (body) {
    const main = flattenMessage(body.message);
    if (main && !isGeneric(main)) return main;
  }

  const raw = typeof error?.message === 'string' ? error.message : '';
  if (raw && !isGeneric(raw)) return raw;
  return status ? `${fallback} (HTTP ${status})` : fallback;
}
