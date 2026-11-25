import { describe, expect, it } from 'vitest';
import {
  CORRECTION_REASON_MAX,
  CORRECTION_REASON_MIN,
  buildAttendanceCorrection,
  correctionReason,
  localInputToIso,
  timeInputValue,
  type AttendanceCorrectionForm,
  type AttendanceCorrectionOriginal,
} from './correction';

// Una salida registrada a las 18:34:27 (hora del centro) el 24-nov-2026.
const original: AttendanceCorrectionOriginal = {
  eventType: 'check_out',
  localDate: '2026-11-24',
  localTime: '18:34:27',
  timezone: 'America/Mexico_City',
};

// El formulario tal como abre el diálogo: precargado y sin motivo.
const untouched: AttendanceCorrectionForm = {
  eventType: 'check_out',
  date: '2026-11-24',
  time: '18:34',
  reason: '',
};

// 25-nov-2026 12:00 del centro: todo el 24 ya pasó.
const now = new Date('2026-11-25T18:00:00.000Z');

const REASON = 'Marcó salida en vez de comida';

describe('localInputToIso', () => {
  it('convierte la hora local de la sucursal con el desfase de ESA zona', () => {
    expect(localInputToIso('2026-11-24', '09:00', 'America/Mexico_City')).toBe(
      '2026-11-24T15:00:00.000Z',
    );
    expect(localInputToIso('2026-11-24', '09:00', 'America/Cancun')).toBe(
      '2026-11-24T14:00:00.000Z',
    );
    // Tijuana sí cambia de horario: -8 en invierno, -7 en verano.
    expect(localInputToIso('2026-11-24', '09:00', 'America/Tijuana')).toBe(
      '2026-11-24T17:00:00.000Z',
    );
    expect(localInputToIso('2026-07-15', '09:00', 'America/Tijuana')).toBe(
      '2026-07-15T16:00:00.000Z',
    );
  });

  it('una hora de la noche cae en el día UTC siguiente', () => {
    expect(localInputToIso('2026-11-24', '22:15', 'America/Mexico_City')).toBe(
      '2026-11-25T04:15:00.000Z',
    );
  });

  it('una zona basura del legacy cae a la del centro en vez de tronar', () => {
    expect(localInputToIso('2026-11-24', '09:00', 'America/GMT-7')).toBe(
      '2026-11-24T15:00:00.000Z',
    );
  });

  it('sin fecha, sin hora o con basura regresa null', () => {
    expect(localInputToIso('', '09:00', 'America/Mexico_City')).toBeNull();
    expect(localInputToIso('2026-11-24', '', 'America/Mexico_City')).toBeNull();
    expect(localInputToIso('ayer', '09:00', 'America/Mexico_City')).toBeNull();
    expect(localInputToIso('2026-11-24', '9 am', 'America/Mexico_City')).toBeNull();
  });
});

describe('timeInputValue / correctionReason', () => {
  it('la hora del input va al minuto', () => {
    expect(timeInputValue('18:34:27')).toBe('18:34');
    expect(timeInputValue('07:05')).toBe('07:05');
  });

  it('el motivo se recorta a los lados y nada más', () => {
    expect(correctionReason('  Olvidó checar \n')).toBe('Olvidó checar');
    expect(correctionReason('   ')).toBe('');
  });
});

describe('buildAttendanceCorrection: qué se manda', () => {
  it('si solo cambió el tipo: tipo + motivo, SIN occurredAt', () => {
    const result = buildAttendanceCorrection(
      original,
      { ...untouched, eventType: 'break_out', reason: REASON },
      now,
    );
    expect(result).toStrictEqual({
      ok: true,
      input: { reason: REASON, eventType: 'break_out' },
    });
  });

  it('si solo cambió la hora: occurredAt + motivo, SIN eventType', () => {
    const result = buildAttendanceCorrection(
      original,
      { ...untouched, time: '18:00', reason: REASON },
      now,
    );
    expect(result).toStrictEqual({
      ok: true,
      input: { reason: REASON, occurredAt: '2026-11-25T00:00:00.000Z' },
    });
  });

  it('si solo cambió la fecha también va occurredAt (con la misma hora, al minuto)', () => {
    const result = buildAttendanceCorrection(
      original,
      { ...untouched, date: '2026-11-23', reason: REASON },
      now,
    );
    expect(result).toStrictEqual({
      ok: true,
      input: { reason: REASON, occurredAt: '2026-11-24T00:34:00.000Z' },
    });
  });

  it('si cambiaron tipo y hora van los tres campos', () => {
    const result = buildAttendanceCorrection(
      original,
      { eventType: 'break_in', date: '2026-11-24', time: '15:10', reason: REASON },
      now,
    );
    expect(result).toStrictEqual({
      ok: true,
      input: {
        reason: REASON,
        eventType: 'break_in',
        occurredAt: '2026-11-24T21:10:00.000Z',
      },
    });
  });

  it('el motivo se manda recortado', () => {
    const result = buildAttendanceCorrection(
      original,
      { ...untouched, eventType: 'break_out', reason: `   ${REASON}  \n` },
      now,
    );
    expect(result.ok && result.input.reason).toBe(REASON);
  });

  it('la hora se convierte con la zona del EVENTO, no con la del navegador', () => {
    const tijuana: AttendanceCorrectionOriginal = { ...original, timezone: 'America/Tijuana' };
    const result = buildAttendanceCorrection(
      tijuana,
      { ...untouched, time: '18:00', reason: REASON },
      now,
    );
    // 18:00 de Tijuana (UTC-8 en noviembre) = 02:00 UTC del día siguiente.
    expect(result.ok && result.input.occurredAt).toBe('2026-11-25T02:00:00.000Z');
  });

  it('acepta la hora del input con segundos (HH:MM:SS) y la manda al minuto', () => {
    const result = buildAttendanceCorrection(
      original,
      { ...untouched, time: '18:00:45', reason: REASON },
      now,
    );
    expect(result.ok && result.input.occurredAt).toBe('2026-11-25T00:00:00.000Z');
  });
});

describe('buildAttendanceCorrection: cuándo NO se puede guardar', () => {
  const issueOf = (form: AttendanceCorrectionForm, at: Date = now, base = original) => {
    const result = buildAttendanceCorrection(base, form, at);
    return result.ok ? null : result.issue;
  };

  it('sin cambios no hay nada que corregir, aunque ya haya motivo', () => {
    expect(issueOf(untouched)).toBe('nothing_changed');
    expect(issueOf({ ...untouched, reason: REASON })).toBe('nothing_changed');
  });

  it('los segundos de la checada original no cuentan como cambio', () => {
    // El input muestra 18:34 y lo registrado es 18:34:27: sigue siendo la misma hora.
    expect(issueOf({ ...untouched, time: '18:34:00', reason: REASON })).toBe('nothing_changed');
  });

  it('cambiar la hora y regresarla deja la corrección sin cambios', () => {
    expect(issueOf({ ...untouched, time: '18:35', reason: REASON })).toBeNull();
    expect(issueOf({ ...untouched, time: '18:34', reason: REASON })).toBe('nothing_changed');
  });

  it('el motivo necesita al menos 5 caracteres ya recortado', () => {
    const changed = { ...untouched, eventType: 'break_out' };
    expect(issueOf({ ...changed, reason: '' })).toBe('reason_too_short');
    expect(issueOf({ ...changed, reason: '  abcd   ' })).toBe('reason_too_short');
    expect(issueOf({ ...changed, reason: 'a'.repeat(CORRECTION_REASON_MIN - 1) })).toBe(
      'reason_too_short',
    );
    expect(issueOf({ ...changed, reason: 'a'.repeat(CORRECTION_REASON_MIN) })).toBeNull();
  });

  it('el motivo no pasa de 500 caracteres', () => {
    const changed = { ...untouched, eventType: 'break_out' };
    expect(issueOf({ ...changed, reason: 'a'.repeat(CORRECTION_REASON_MAX) })).toBeNull();
    expect(issueOf({ ...changed, reason: 'a'.repeat(CORRECTION_REASON_MAX + 1) })).toBe(
      'reason_too_long',
    );
    // Los espacios de los lados no cuentan para el tope.
    expect(issueOf({ ...changed, reason: ` ${'a'.repeat(CORRECTION_REASON_MAX)} ` })).toBeNull();
  });

  it('no deja una hora futura', () => {
    // "Ahora" = 24-nov 18:40 del centro (25-nov 00:40 UTC).
    const at = new Date('2026-11-25T00:40:00.000Z');
    expect(issueOf({ ...untouched, time: '18:41', reason: REASON }, at)).toBe('future_time');
    expect(issueOf({ ...untouched, date: '2026-11-25', reason: REASON }, at)).toBe('future_time');
    // El minuto en curso y lo anterior sí se pueden.
    expect(issueOf({ ...untouched, time: '18:40', reason: REASON }, at)).toBeNull();
    expect(issueOf({ ...untouched, time: '18:39', reason: REASON }, at)).toBeNull();
  });

  it('la hora futura se avisa antes que el motivo', () => {
    const at = new Date('2026-11-25T00:40:00.000Z');
    expect(issueOf({ ...untouched, time: '19:00', reason: '' }, at)).toBe('future_time');
  });

  it('"futura" se mide en la zona del evento', () => {
    // 24-nov 20:00 UTC = 14:00 del centro = 12:00 de Tijuana.
    const at = new Date('2026-11-24T20:00:00.000Z');
    const morning = { ...original, localTime: '09:00:00' };
    const form = { ...untouched, time: '13:00', reason: REASON };
    // Las 13:00 ya pasaron en el centro...
    expect(issueOf(form, at, morning)).toBeNull();
    // ...pero en Tijuana todavía no llegan.
    expect(issueOf(form, at, { ...morning, timezone: 'America/Tijuana' })).toBe('future_time');
  });

  it('cambiar solo el tipo no revisa la hora (no se manda)', () => {
    // Aunque el reloj del equipo esté atrasado respecto a la checada.
    const at = new Date('2026-11-24T00:00:00.000Z');
    expect(issueOf({ ...untouched, eventType: 'check_in', reason: REASON }, at)).toBeNull();
  });

  it('fecha u hora vacías o inválidas', () => {
    expect(issueOf({ ...untouched, date: '', reason: REASON })).toBe('invalid_datetime');
    expect(issueOf({ ...untouched, time: '', reason: REASON })).toBe('invalid_datetime');
    expect(issueOf({ ...untouched, date: 'ayer', reason: REASON })).toBe('invalid_datetime');
  });

  it('un tipo que no es de los cuatro del checador', () => {
    expect(issueOf({ ...untouched, eventType: 'lunch', reason: REASON })).toBe('invalid_type');
    expect(issueOf({ ...untouched, eventType: '', reason: REASON })).toBe('invalid_type');
  });

  it('cada motivo de rechazo trae su mensaje listo para mostrarse', () => {
    const result = buildAttendanceCorrection(original, untouched, now);
    expect(result).toStrictEqual({
      ok: false,
      issue: 'nothing_changed',
      message: 'Cambia el tipo o la hora para poder guardar la corrección.',
    });
  });
});
