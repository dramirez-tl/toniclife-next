import { describe, expect, it } from 'vitest';
import {
  EMPTY_GUEST_FORM,
  capacityNote,
  formatGuestPhone,
  guestFlagLabel,
  guestToForm,
  importFlagCounts,
  importPreviewLines,
  toAddGuestInput,
  toUpdateGuestInput,
  validateGuestForm,
  type GuestFormValues,
} from './guests';
import type { EventGuestDto, GuestImportResult } from '@/types/event-guests';

const guest = (over: Partial<EventGuestDto> = {}): EventGuestDto => ({
  id: 'g1',
  eventId: 'e1',
  kind: 'distributor',
  fullName: 'JOSE LUIS RAMIREZ SOTO',
  accessType: 'Acceso General',
  network: null,
  seats: 1,
  status: 'invited',
  flags: [],
  notes: null,
  listedNumber: '75271',
  customerId: 'c1',
  customerNumber: '75271',
  customerName: 'JOSE LUIS RAMIREZ SOTO',
  customerActive: true,
  hostCustomerId: null,
  hostCustomerNumber: null,
  hostName: null,
  phone: null,
  email: null,
  contactPhone: '4625550102',
  contactPhoneCountryCode: '52',
  contactEmail: 'jose@ficha.test',
  isActive: true,
  removedAt: null,
  source: 'import',
  sourceSheet: 'Acceso General',
  sourceRow: 2,
  emailStatus: 'pending',
  emailedAt: null,
  emailedTo: null,
  emailCount: 0,
  whatsappStatus: 'pending',
  whatsappSentAt: null,
  whatsappTo: null,
  whatsappCount: 0,
  createdAt: '2026-11-23T00:00:00.000Z',
  updatedAt: '2026-11-23T00:00:00.000Z',
  ...over,
});

const form = (over: Partial<GuestFormValues> = {}): GuestFormValues => ({ ...EMPTY_GUEST_FORM, ...over });

describe('formulario de un invitado', () => {
  it('pide lo que toca según quién es', () => {
    expect(validateGuestForm(form())).toMatch(/número de distribuidor/);
    expect(validateGuestForm(form({ customerNumber: '75271' }))).toBeNull();
    expect(validateGuestForm(form({ customerNumber: '75-271' }))).toMatch(/solo dígitos/);
    expect(validateGuestForm(form({ kind: 'companion', fullName: 'Laura Torres' }))).toMatch(/que lo invita/);
    expect(validateGuestForm(form({ kind: 'companion', hostCustomerNumber: '75271' }))).toMatch(/nombre/);
    expect(
      validateGuestForm(form({ kind: 'companion', hostCustomerNumber: '75271', fullName: 'Laura Torres' })),
    ).toBeNull();
    expect(validateGuestForm(form({ kind: 'external' }))).toMatch(/nombre/);
    expect(validateGuestForm(form({ kind: 'external', fullName: 'Conferencista' }))).toBeNull();
  });

  it('revisa lugares, teléfono y correo', () => {
    const ok = { customerNumber: '75271' };
    expect(validateGuestForm(form({ ...ok, seats: '0' }))).toMatch(/entre 1 y 20/);
    expect(validateGuestForm(form({ ...ok, seats: '2.5' }))).toMatch(/entero/);
    expect(validateGuestForm(form({ ...ok, seats: '21' }))).toMatch(/entre 1 y 20/);
    expect(validateGuestForm(form({ ...ok, phone: '555 0102' }))).toMatch(/10 dígitos/);
    expect(validateGuestForm(form({ ...ok, phone: '(462) 555-01-02' }))).toBeNull();
    expect(validateGuestForm(form({ ...ok, email: 'sin-arroba' }))).toMatch(/correo/);
    expect(validateGuestForm(form({ ...ok, email: 'ana@correo.test' }))).toBeNull();
  });

  it('alta: manda solo lo capturado y el número que toca', () => {
    expect(toAddGuestInput(form({ customerNumber: ' 75271 ', accessType: 'Elite', seats: '2' }))).toEqual({
      customerNumber: '75271',
      hostCustomerNumber: undefined,
      fullName: undefined,
      accessType: 'Elite',
      network: undefined,
      seats: 2,
      phone: undefined,
      email: undefined,
      notes: undefined,
    });
    const companion = toAddGuestInput(
      form({
        kind: 'companion',
        customerNumber: '111',
        hostCustomerNumber: '75271',
        fullName: ' Laura Torres ',
        email: 'laura@correo.test',
      }),
    );
    expect(companion).toMatchObject({
      customerNumber: undefined,
      hostCustomerNumber: '75271',
      fullName: 'Laura Torres',
      email: 'laura@correo.test',
    });
    const external = toAddGuestInput(form({ kind: 'external', hostCustomerNumber: '75271', fullName: 'Invitado' }));
    expect(external.customerNumber).toBeUndefined();
    expect(external.hostCustomerNumber).toBeUndefined();
  });

  it('edición: solo lo que cambió; lo que se vacía va en null', () => {
    const original = guest({ network: 'Red Norte', email: 'propio@correo.test', notes: 'Mesa 4' });
    const same = guestToForm(original);
    expect(toUpdateGuestInput(original, same)).toEqual({});
    expect(
      toUpdateGuestInput(original, {
        ...same,
        seats: '3',
        status: 'confirmed',
        accessType: 'Elite',
        network: '',
        email: '',
        phone: '4625559900',
      }),
    ).toEqual({
      seats: 3,
      status: 'confirmed',
      accessType: 'Elite',
      network: null,
      email: null,
      phone: '4625559900',
    });
  });

  it('edición: cambiar quién es liga o desliga la ficha', () => {
    const external = guest({ kind: 'external', customerId: null, customerNumber: null, fullName: 'Rosa Díaz' });
    expect(
      toUpdateGuestInput(external, { ...guestToForm(external), kind: 'distributor', customerNumber: '75271' }),
    ).toEqual({ customerNumber: '75271' });
    expect(
      toUpdateGuestInput(external, { ...guestToForm(external), kind: 'companion', hostCustomerNumber: '75271' }),
    ).toEqual({ hostCustomerNumber: '75271' });
    const distributor = guest();
    expect(toUpdateGuestInput(distributor, { ...guestToForm(distributor), kind: 'external' })).toEqual({
      customerNumber: null,
    });
    const companion = guest({
      kind: 'companion',
      customerId: null,
      customerNumber: null,
      hostCustomerId: 'c9',
      hostCustomerNumber: '1786956',
    });
    expect(toUpdateGuestInput(companion, { ...guestToForm(companion), kind: 'external' })).toEqual({
      hostCustomerNumber: null,
    });
    expect(toUpdateGuestInput(companion, guestToForm(companion))).toEqual({});
    expect(
      toUpdateGuestInput(companion, { ...guestToForm(companion), hostCustomerNumber: '75271' }),
    ).toEqual({ hostCustomerNumber: '75271' });
  });
});

describe('textos de la lista de invitados', () => {
  it('etiquetas y teléfono', () => {
    expect(guestFlagLabel('id_not_found')).toBe('El ID no existe');
    expect(guestFlagLabel('otro')).toBe('otro');
    expect(formatGuestPhone('4625550102')).toBe('462 555 0102');
    expect(formatGuestPhone('524625550102')).toBe('524625550102');
    expect(formatGuestPhone(null)).toBe('');
  });

  it('lugares contra el aforo', () => {
    expect(capacityNote({ seats: 619, capacity: null })).toEqual({
      text: '619 lugares · aforo abierto',
      over: false,
    });
    expect(capacityNote({ seats: 1, capacity: null }).text).toBe('1 lugar · aforo abierto');
    expect(capacityNote({ seats: 520, capacity: 700 })).toEqual({
      text: '520 de 700 lugares · quedan 180',
      over: false,
    });
    expect(capacityNote({ seats: 619, capacity: 600 })).toEqual({
      text: '619 lugares para un aforo de 600: sobran 19',
      over: true,
    });
  });

  it('vista previa de la carga masiva', () => {
    const result: GuestImportResult = {
      applied: false,
      created: 0,
      totals: {
        rows: 619,
        guests: 514,
        seats: 619,
        distributors: 375,
        companions: 57,
        external: 82,
        alreadyInList: 0,
        toCreate: 514,
        byAccess: [],
        flags: { no_id: 76, id_not_found: 6, name_mismatch: 32, inactive: 0, repeated: 104, several_access: 26 },
      },
      sheets: [
        { name: 'Acceso General', rows: 390, skipped: null },
        { name: 'Notas', rows: 0, skipped: 'No tiene una columna "Nombre" ni "ID"' },
      ],
      guests: [],
      skipped: [{ row: 9, sheet: 'Elite', reason: 'Sin nombre' }],
      summary: null,
    };
    expect(importPreviewLines(result)).toEqual([
      '619 renglones leídos → 514 invitados y 619 lugares.',
      '375 distribuidores, 57 acompañantes y 82 solo por nombre.',
      'La hoja "Notas" no se leyó: No tiene una columna "Nombre" ni "ID".',
      '1 renglón no se pudo leer (sin nombre).',
    ]);
    expect(importFlagCounts(result).map((f) => [f.label, f.count])).toEqual([
      ['Venía repetido', 104],
      ['Sin ID', 76],
      ['El ID es de otra persona', 32],
      ['Más de un tipo de acceso', 26],
      ['El ID no existe', 6],
    ]);
    const again = importPreviewLines({
      ...result,
      totals: { ...result.totals, alreadyInList: 513, toCreate: 1 },
      sheets: [],
      skipped: [],
    });
    expect(again[2]).toBe('513 ya están en la lista y no se duplican; se carga 1 nuevo.');
  });
});
