// events-lib.test.ts - Reglas puras del módulo Eventos: fechas sin corrimiento
// de zona, horario, lectura de la entrada y conversión del formulario a DTO.
import { describe, expect, it } from 'vitest';
import {
  formatAllotment,
  formatEventDate,
  formatEventDateLong,
  formatEventSchedule,
  formatEventTime,
} from './format';
import {
  EMPTY_EVENT_FORM,
  parseCheckInValue,
  toCreateInput,
  toUpdateInput,
  validateEventForm,
  type EventFormValues,
} from './form';

describe('fechas del evento (texto YYYY-MM-DD, sin Date)', () => {
  it('dd/mm/yyyy', () => {
    expect(formatEventDate('2026-10-15')).toBe('15/10/2026');
    expect(formatEventDate('2026-01-01')).toBe('01/01/2026');
    expect(formatEventDate(null)).toBe('—');
  });

  it('fecha larga en español con el día del texto (no el de la zona)', () => {
    expect(formatEventDateLong('2026-10-15')).toBe('jueves 15 de octubre de 2026');
    expect(formatEventDateLong('2026-01-01')).toBe('jueves 1 de enero de 2026');
  });

  it('horas de 12 con sufijo', () => {
    expect(formatEventTime('10:30')).toBe('10:30 a. m.');
    expect(formatEventTime('11:00')).toBe('11:00 a. m.');
    expect(formatEventTime('00:15')).toBe('12:15 a. m.');
    expect(formatEventTime('12:00')).toBe('12:00 p. m.');
    expect(formatEventTime('18:45')).toBe('6:45 p. m.');
  });

  it('línea de horario solo con lo capturado', () => {
    expect(formatEventSchedule({ doorsTime: '10:30', startTime: '11:00' })).toBe(
      'Registro 10:30 a. m. · Inicio 11:00 a. m.',
    );
    expect(formatEventSchedule({ doorsTime: null, startTime: null })).toBe('');
  });

  it('asignación sin límite', () => {
    expect(formatAllotment(100000, 100000)).toBe('Sin límite');
    expect(formatAllotment(250, 100000)).toBe('250');
  });
});

describe('entrada: qué se manda según lo capturado', () => {
  it('solo dígitos → número de boleto del evento con 5 dígitos', () => {
    expect(parseCheckInValue('12', 'FOCADE26')).toEqual({ ticketNumber: 'FOCADE26-00012' });
  });
  it('número completo (en minúsculas) → número de boleto', () => {
    expect(parseCheckInValue(' focade26-00012 ', 'FOCADE26')).toEqual({ ticketNumber: 'FOCADE26-00012' });
  });
  it('liga o token → token', () => {
    expect(parseCheckInValue('https://x.com/boleto/abcDEF123456', 'FOCADE26')).toEqual({
      token: 'https://x.com/boleto/abcDEF123456',
    });
    expect(parseCheckInValue('abcDEF123456_-xyz', 'FOCADE26')).toEqual({ token: 'abcDEF123456_-xyz' });
  });
  it('vacío → nada', () => {
    expect(parseCheckInValue('   ', 'FOCADE26')).toBeNull();
  });
});

describe('formulario → DTO', () => {
  const filled: EventFormValues = {
    ...EMPTY_EVENT_FORM,
    code: 'focade26',
    name: 'FOCADE Teziutlán',
    eventDate: '2026-10-15',
    doorsTime: '10:30',
    startTime: '11:00',
    ticketPrice: '850',
    ticketsPerUnit: '2',
    satUnitCode: 'e48',
    countryId: 'c0000000-0000-4000-8000-000000000001',
  };

  it('valida el alta', () => {
    expect(validateEventForm(filled, 'create')).toBeNull();
    expect(validateEventForm({ ...filled, code: 'ab' }, 'create')).toMatch(/clave/i);
    expect(validateEventForm({ ...filled, ticketsPerUnit: '21' }, 'create')).toMatch(/por unidad/i);
    expect(validateEventForm({ ...filled, saleStartsOn: '2026-10-10', saleEndsOn: '2026-10-01' }, 'create')).toMatch(/fin de venta/i);
    // En edición la clave no cuenta.
    expect(validateEventForm({ ...filled, code: '' }, 'edit')).toBeNull();
  });

  it('el alta omite los opcionales vacíos y normaliza clave y unidad SAT', () => {
    const dto = toCreateInput(filled);
    expect(dto.code).toBe('FOCADE26');
    expect(dto.satUnitCode).toBe('E48');
    expect(dto.ticketPrice).toBe(850);
    expect(dto.ticketsPerUnit).toBe(2);
    expect(dto.speaker).toBeUndefined();
    expect(dto.capacity).toBeUndefined();
    expect(dto.includedProductId).toBeUndefined();
    expect(dto.includedQuantity).toBeUndefined();
    expect('code' in dto).toBe(true);
  });

  it('la edición manda null en los opcionales vacíos (para limpiarlos) y nunca la clave', () => {
    const dto = toUpdateInput(filled);
    expect('code' in dto).toBe(false);
    expect(dto.speaker).toBeNull();
    expect(dto.capacity).toBeNull();
    expect(dto.includedProductId).toBeNull();
    expect(dto.includedQuantity).toBeNull();
    expect(dto.doorsTime).toBe('10:30');
    expect(dto.name).toBe('FOCADE Teziutlán');
  });
});
