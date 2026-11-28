import { describe, expect, it } from 'vitest';
import {
  bonusGroupMatches,
  bonusRowMatches,
  cleanFiscalId,
  cleanReceiptName,
  cleanZip,
  draftChanges,
  draftFromReceiver,
  draftHints,
  hasChanges,
  matchesSearch,
  readReceiverSaveError,
  receiptNameSuggestions,
  rfcMatchesCurp,
  satRejectionHint,
} from './payroll-receiver';
import type { PayrollReceiver } from '@/types/payroll-receiver';

// Identidades inventadas para la prueba (no son de nadie).
const RFC = 'PEGJ850315AB1';
const CURP = 'PEGJ850315HDFRRN09';

const receiver = (over: Partial<PayrollReceiver['payroll']> = {}): PayrollReceiver => ({
  customerId: 'c-1',
  customerNumber: '1700001',
  fullName: 'Juana Pérez García',
  countryCode: 'MX',
  commissionRegime: 'ASIMILADOS',
  payroll: { rfc: null, curp: null, zipCode: null, taxRegimeCode: null, ...over },
  generalCurp: CURP,
  billing: { rfc: 'LOMA900720QW3', legalName: 'LIDER DE LA RED DE PRUEBA', zipCode: '72000', isOwn: false },
  receipt: null,
  ready: false,
  issues: ['Falta el código postal fiscal'],
  sharedRfcWith: [],
});

describe('captura de los datos del recibo', () => {
  it('limpia lo pegado: mayúsculas sin espacios ni guiones; el C.P. solo dígitos', () => {
    expect(cleanFiscalId(' pegj-850315 ab1. ')).toBe(RFC);
    expect(cleanZip(' 36-500 x9')).toBe('36500');
  });

  it('el formulario abre con lo guardado en el perfil de nómina (no con el de facturación)', () => {
    expect(draftFromReceiver(receiver({ rfc: RFC, zipCode: '36500' }))).toEqual({ rfc: RFC, curp: '', zipCode: '36500', name: '' });
    expect(draftFromReceiver(null)).toEqual({ rfc: '', curp: '', zipCode: '', name: '' });
  });

  it('solo manda lo que cambió; vacío no cambia nada', () => {
    const saved = receiver({ rfc: RFC, zipCode: '36500' });
    expect(draftChanges(saved, { rfc: 'pegj850315ab1', curp: '', zipCode: '37000', name: '' })).toEqual({ zipCode: '37000' });
    expect(hasChanges(draftChanges(saved, { rfc: RFC, curp: '', zipCode: '36500', name: '' }))).toBe(false);
    expect(draftChanges(receiver(), { rfc: RFC, curp: CURP.toLowerCase(), zipCode: '36500', name: '' })).toEqual({
      rfc: RFC,
      curp: CURP,
      zipCode: '36500',
    });
  });

  it('avisa del largo mientras se teclea', () => {
    expect(draftHints({ rfc: 'PEGJ8503', curp: 'PEGJ', zipCode: '365', name: '' })).toEqual({
      rfc: 'Lleva 8 de 13 caracteres.',
      curp: 'Lleva 4 de 18 caracteres.',
      zipCode: 'Lleva 3 de 5 dígitos.',
    });
    expect(draftHints({ rfc: 'ABC850315AB1', curp: '', zipCode: '', name: '' }).rfc).toContain('RFC de empresa');
    expect(draftHints({ rfc: RFC, curp: CURP, zipCode: '36500', name: 'JUANA PEREZ GARCIA' })).toEqual({});
    expect(draftHints({ rfc: '', curp: '', zipCode: '', name: '' })).toEqual({});
  });

  it('RFC y CURP de la misma persona: dos primeras letras y fecha de nacimiento', () => {
    expect(rfcMatchesCurp(RFC, CURP)).toBe(true);
    expect(rfcMatchesCurp('PEXJ850315AB1', CURP)).toBe(true);
    expect(rfcMatchesCurp('LOMA900720QW3', CURP)).toBe(false);
    expect(rfcMatchesCurp('PEGJ8503', CURP)).toBe(false);
  });
});

describe('lo que contesta el servidor al guardar', () => {
  it('trae el detalle por campo', () => {
    const err = {
      response: {
        data: {
          statusCode: 422,
          message: 'El RFC no es válido.',
          field: 'rfc',
          details: {
            needsConfirm: false,
            errors: [
              { field: 'rfc', message: 'El RFC no es válido.' },
              { field: 'zipCode', message: 'El código postal fiscal son 5 dígitos.' },
              { field: 'otro', message: 'se ignora' },
            ],
          },
        },
      },
    };
    expect(readReceiverSaveError(err)).toEqual({
      message: 'El RFC no es válido.',
      needsConfirm: false,
      errors: [
        { field: 'rfc', message: 'El RFC no es válido.' },
        { field: 'zipCode', message: 'El código postal fiscal son 5 dígitos.' },
      ],
    });
  });

  it('cuando el RFC y la CURP no cuadran pide confirmar', () => {
    const err = {
      response: { data: { message: 'No parecen de la misma persona', details: { needsConfirm: true, errors: [{ field: 'rfc', message: 'No parecen de la misma persona', needsConfirm: true }] } } },
    };
    const read = readReceiverSaveError(err);
    expect(read.needsConfirm).toBe(true);
    expect(read.errors[0].needsConfirm).toBe(true);
  });

  it('sin respuesta del servidor da un mensaje y nada más', () => {
    expect(readReceiverSaveError(new Error('Network Error'))).toEqual({
      message: 'No se pudieron guardar los datos.',
      errors: [],
      needsConfirm: false,
    });
  });
});

describe('rechazos del SAT en claro', () => {
  it('código postal, RFC y nombre: dice qué dato corregir', () => {
    expect(
      satRejectionHint('El campo DomicilioFiscalReceptor del receptor, debe encontrarse en la lista de RFC inscritos no cancelados en el SAT. Si el problema persiste contacta a Sistemas.')?.field,
    ).toBe('zipCode');
    expect(
      satRejectionHint("El atributo 'Comprobante.Receptor.Rfc' debe estar en la lista de RFC inscritos no cancelados en el SAT (l_RFC).")?.field,
    ).toBe('rfc');
    expect(
      satRejectionHint('El campo Nombre del receptor, debe pertenecer al nombre asociado al RFC registrado en el campo Rfc del Receptor.')?.field,
    ).toBe('name');
  });

  it('un mensaje que no se conoce se deja tal cual (sin inventar)', () => {
    expect(satRejectionHint('Tiempo de espera agotado con el PAC')).toBeNull();
    expect(satRejectionHint(null)).toBeNull();
    expect(satRejectionHint('')).toBeNull();
  });
});

describe('nombre del recibo', () => {
  const blank = { rfc: '', curp: '', zipCode: '' };
  // Datos fiscales PROPIOS con la razón social escrita distinto al nombre de la cuenta.
  const own = (over: Partial<PayrollReceiver> = {}): PayrollReceiver => ({
    ...receiver({ rfc: RFC }),
    billing: { rfc: RFC, legalName: 'JUANA PERES GARCIA', zipCode: '36500', isOwn: true },
    receipt: { rfc: RFC, curp: CURP, name: 'JUANA PERES GARCIA', zipCode: '36500', email: null, rfcSource: 'payroll', nameSource: 'billing' },
    nameOptions: { account: 'JUANA PEREZ GARCIA', billing: 'JUANA PERES GARCIA' },
    ...over,
  });

  it('se limpia como va en el CFDI: mayúsculas, sin acentos, con Ñ y sin espacios de más', () => {
    expect(cleanReceiptName('  maría   josé muñoz  pérez ')).toBe('MARIA JOSE MUÑOZ PEREZ');
    expect(cleanReceiptName(null)).toBe('');
  });

  it('solo se manda si cambió; el mismo nombre escrito de otra forma no es un cambio', () => {
    expect(draftChanges(own(), { ...blank, name: ' juana pérez garcía ' })).toEqual({ name: 'JUANA PEREZ GARCIA' });
    expect(draftChanges(own(), { ...blank, name: '' })).toEqual({});
    const saved = own({ payroll: { rfc: RFC, curp: null, zipCode: null, taxRegimeCode: null, name: 'JUANA PEREZ GARCIA' } });
    expect(hasChanges(draftChanges(saved, { ...blank, name: 'Juana  Pérez García' }))).toBe(false);
    expect(draftFromReceiver(saved).name).toBe('JUANA PEREZ GARCIA');
  });

  it('avisa si solo se tecleó una palabra', () => {
    expect(draftHints({ ...blank, name: 'JUANA' }).name).toContain('nombre completo');
    expect(draftHints({ ...blank, name: 'JUANA PEREZ' }).name).toBeUndefined();
  });

  it('sugiere los nombres que la cuenta ya tiene y que NO son el que hoy saldría', () => {
    // Hoy sale la razón social (la que rechazó el SAT): se ofrece el de la cuenta.
    expect(receiptNameSuggestions(own())).toEqual([{ source: 'account', label: 'el nombre de su cuenta', name: 'JUANA PEREZ GARCIA' }]);
    // Ya tecleado ese mismo: no se repite.
    expect(receiptNameSuggestions(own(), 'juana pérez garcía')).toEqual([]);
    // Con el nombre capturado saliendo en el recibo, se ofrece la razón social por si hay que regresar.
    const captured = own({ receipt: { rfc: RFC, curp: CURP, name: 'JUANA PEREZ GARCIA', zipCode: '36500', email: null, rfcSource: 'payroll', nameSource: 'payroll' } });
    expect(receiptNameSuggestions(captured).map((o) => o.source)).toEqual(['billing']);
  });

  it('nunca sugiere la razón social de otra persona, y sin soporte del servidor no sugiere nada', () => {
    const leader = own({ nameOptions: { account: 'JUANA PEREZ GARCIA', billing: null }, receipt: null });
    expect(receiptNameSuggestions(leader)).toEqual([{ source: 'account', label: 'el nombre de su cuenta', name: 'JUANA PEREZ GARCIA' }]);
    expect(receiptNameSuggestions(receiver())).toEqual([]);
  });

  it('el API puede rechazar el nombre: el error llega a su campo', () => {
    const read = readReceiverSaveError({
      response: { data: { message: 'Escribe el nombre completo', details: { errors: [{ field: 'name', message: 'Escribe el nombre completo' }] } } },
    });
    expect(read.errors).toEqual([{ field: 'name', message: 'Escribe el nombre completo' }]);
  });

  it('el rechazo del SAT por nombre manda a corregirlo en «Nombre en el recibo»', () => {
    const hint = satRejectionHint('El campo Nombre del receptor, debe pertenecer al nombre asociado al RFC registrado en el campo Rfc del Receptor.');
    expect(hint?.field).toBe('name');
    expect(hint?.text).toContain('Nombre en el recibo');
    expect(hint?.text).not.toContain('ficha');
  });
});

describe('buscador de Bono de Inscripción', () => {
  const group = {
    sponsorNumber: '2019517',
    sponsorName: 'Juana Pérez García',
    paymentReference: 'SPEI 4471',
    voucher: { folio: 'N-2031', uuid: 'bc739d82-0000-4000-8000-000000000000' },
    items: [
      { buyerNumber: '2022410', buyerName: 'María Núñez Soto', kitCode: 'KBM01' },
      { buyerNumber: '2022999', buyerName: 'Pedro Ángel Ruiz', kitCode: 'KPM13' },
    ],
  };

  it('vacío no filtra nada', () => {
    expect(matchesSearch('', ['x'])).toBe(true);
    expect(matchesSearch('   ', [])).toBe(true);
  });

  it('encuentra al patrocinador por número o por nombre, sin importar acentos ni mayúsculas', () => {
    expect(bonusGroupMatches('2019517', group)).toBe(true);
    expect(bonusGroupMatches('juana perez', group)).toBe(true);
    expect(bonusGroupMatches('PÉREZ', group)).toBe(true);
    expect(bonusGroupMatches('lopez', group)).toBe(false);
  });

  it('también por cualquiera de sus inscritos, el kit, el folio del recibo o la referencia del pago', () => {
    expect(bonusGroupMatches('nunez', group)).toBe(true);
    expect(bonusGroupMatches('2022999', group)).toBe(true);
    expect(bonusGroupMatches('kpm13', group)).toBe(true);
    expect(bonusGroupMatches('n-2031', group)).toBe(true);
    expect(bonusGroupMatches('bc739d82', group)).toBe(true);
    expect(bonusGroupMatches('4471', group)).toBe(true);
  });

  it('todas las palabras deben aparecer', () => {
    expect(bonusGroupMatches('juana 2019', group)).toBe(true);
    expect(bonusGroupMatches('juana 9999', group)).toBe(false);
  });

  it('en la vista por bono busca en ese bono', () => {
    const row = { sponsorNumber: '2019517', sponsorName: 'Juana Pérez García', buyerNumber: '2022410', buyerName: 'María Núñez Soto', kitCode: 'KBM01', paymentReference: null };
    expect(bonusRowMatches('maria nunez', row)).toBe(true);
    expect(bonusRowMatches('kbm01', row)).toBe(true);
    expect(bonusRowMatches('pedro', row)).toBe(false);
  });
});
