// correction.ts - Regla de la corrección de una checada (RRHH › Asistencia).
//
// Lógica PURA (sin React ni red) del diálogo «Corregir» del admin: decide QUÉ
// se le manda a PATCH /hr/attendance/:id. El API rechaza con 400 cualquier
// campo que no espera, así que de aquí sale SOLO lo que cambió (tipo y/o
// fecha-hora) más el motivo ya recortado.
//
// También vive aquí la conversión "hora local de la sucursal → ISO" que usan
// la captura manual y la corrección.

import { resolveTimeZone } from '@/lib/timezone-utils';
import {
  ATTENDANCE_EVENT_TYPES,
  type AttendanceEvent,
  type AttendanceEventType,
  type CorrectAttendanceInput,
} from '@/types/hr';

/** Límites del motivo: los mismos que valida el API. */
export const CORRECTION_REASON_MIN = 5;
export const CORRECTION_REASON_MAX = 500;

// ---------------------------------------------------------------------------
// Hora local de la sucursal → ISO
// ---------------------------------------------------------------------------

/** Desfase (ms) de una zona respecto a UTC en ese instante. */
function timezoneOffsetMs(instant: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolveTimeZone(timezone),
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const p: Record<string, string> = {};
  for (const part of parts) p[part.type] = part.value;
  const hour = p.hour === '24' ? '00' : p.hour;
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(hour),
    Number(p.minute),
    Number(p.second),
  );
  return asUtc - instant.getTime();
}

/**
 * Convierte la fecha y hora tecleadas (hora LOCAL de la sucursal) al instante
 * ISO que espera el API. RRHH puede estar en CDMX capturando un evento de
 * Tijuana o Cancún, así que se usa el desfase real de esa zona y no el del
 * navegador.
 */
export function localInputToIso(date: string, time: string, timezone: string): string | null {
  if (!date || !time) return null;
  const naive = new Date(`${date}T${time}:00Z`);
  if (Number.isNaN(naive.getTime())) return null;
  return new Date(naive.getTime() - timezoneOffsetMs(naive, timezone)).toISOString();
}

// ---------------------------------------------------------------------------
// Corrección
// ---------------------------------------------------------------------------

/** Lo que la checada tiene registrado hoy (campos de AttendanceEvent). */
export type AttendanceCorrectionOriginal = Pick<
  AttendanceEvent,
  'eventType' | 'localDate' | 'localTime' | 'timezone'
>;

/** Lo capturado en el diálogo. */
export interface AttendanceCorrectionForm {
  eventType: string;
  /** 'YYYY-MM-DD' (input date). */
  date: string;
  /** 'HH:MM' (input time): hora LOCAL de la sucursal del evento. */
  time: string;
  reason: string;
}

export type AttendanceCorrectionIssue =
  | 'invalid_type'
  | 'invalid_datetime'
  | 'nothing_changed'
  | 'future_time'
  | 'reason_too_short'
  | 'reason_too_long';

export type AttendanceCorrectionResult =
  | { ok: true; input: CorrectAttendanceInput }
  | { ok: false; issue: AttendanceCorrectionIssue; message: string };

const ISSUE_MESSAGES: Record<AttendanceCorrectionIssue, string> = {
  invalid_type: 'Elige el tipo de checada.',
  invalid_datetime: 'Revisa la fecha y la hora.',
  nothing_changed: 'Cambia el tipo o la hora para poder guardar la corrección.',
  future_time: 'La fecha y hora corregidas no pueden estar en el futuro.',
  reason_too_short: `Escribe el motivo de la corrección (mínimo ${CORRECTION_REASON_MIN} caracteres).`,
  reason_too_long: `El motivo no puede pasar de ${CORRECTION_REASON_MAX} caracteres.`,
};

function fail(issue: AttendanceCorrectionIssue): AttendanceCorrectionResult {
  return { ok: false, issue, message: ISSUE_MESSAGES[issue] };
}

function isAttendanceEventType(value: string): value is AttendanceEventType {
  return (ATTENDANCE_EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * 'HH:MM' para el input de hora. El API manda `localTime` como 'HH:MM:SS' y el
 * diálogo trabaja al minuto: así, si no se toca la hora, los segundos de la
 * checada original no cuentan como cambio.
 */
export function timeInputValue(localTime: string): string {
  return localTime.slice(0, 5);
}

/** El motivo como se manda y como se cuenta: sin espacios a los lados. */
export function correctionReason(reason: string): string {
  return reason.trim();
}

/**
 * Arma el cuerpo de la corrección o dice por qué todavía no se puede guardar.
 *
 * - `eventType` va solo si cambió el tipo.
 * - `occurredAt` va solo si cambió la fecha o la hora (al minuto), convertida
 *   con la zona del EVENTO; nunca puede quedar después de `now`.
 * - `reason` va siempre, recortado, de 5 a 500 caracteres.
 *
 * `now` se recibe como parámetro para que la regla sea pura y se pueda probar.
 */
export function buildAttendanceCorrection(
  original: AttendanceCorrectionOriginal,
  form: AttendanceCorrectionForm,
  now: Date,
): AttendanceCorrectionResult {
  if (!isAttendanceEventType(form.eventType)) return fail('invalid_type');

  const time = timeInputValue(form.time);
  const typeChanged = form.eventType !== original.eventType;
  const timeChanged =
    form.date !== original.localDate || time !== timeInputValue(original.localTime);

  let occurredAt: string | null = null;
  if (timeChanged) {
    occurredAt = localInputToIso(form.date, time, original.timezone);
    if (!occurredAt) return fail('invalid_datetime');
  }

  if (!typeChanged && !timeChanged) return fail('nothing_changed');

  if (occurredAt && new Date(occurredAt).getTime() > now.getTime()) return fail('future_time');

  const reason = correctionReason(form.reason);
  if (reason.length < CORRECTION_REASON_MIN) return fail('reason_too_short');
  if (reason.length > CORRECTION_REASON_MAX) return fail('reason_too_long');

  const input: CorrectAttendanceInput = { reason };
  if (typeChanged) input.eventType = form.eventType;
  if (occurredAt) input.occurredAt = occurredAt;
  return { ok: true, input };
}
