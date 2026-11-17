// my-invoicing.test.ts - Formulario de datos fiscales y pintado de las compras en "Mis facturas".
import { describe, expect, it } from 'vitest';
import type { MyInvoiceOrder, SatCatalogOption } from '@/types/customer-invoicing';
import {
  catalogLabel,
  fiscalFormDirty,
  fiscalFormFrom,
  invoiceFileName,
  invoiceTone,
  invoicingCounts,
  isKnownInvoiceStatus,
  monthName,
  normalizeRfcInput,
  personTypeOfRfc,
  regimesForRfc,
  toFiscalPayload,
  validateFiscalForm,
  type FiscalForm,
} from './my-invoicing';

const FORM: FiscalForm = {
  rfc: 'GOSA940115449',
  legalName: 'Araceli González Soto',
  taxRegime: '612',
  cfdiUse: 'G03',
  postalCode: '36500',
  email: 'araceli@correo.test',
};

const REGIMES: SatCatalogOption[] = [
  { code: '601', description: 'General de Ley Personas Morales', appliesToFisica: false, appliesToMoral: true },
  { code: '612', description: 'Personas Físicas con Actividades Empresariales y Profesionales', appliesToFisica: true, appliesToMoral: false },
  { code: '616', description: 'Sin obligaciones fiscales', appliesToFisica: true, appliesToMoral: false },
  { code: '626', description: 'Régimen Simplificado de Confianza', appliesToFisica: true, appliesToMoral: true },
];

const order = (over: Partial<MyInvoiceOrder> = {}): MyInvoiceOrder => ({
  orderId: 'o-1',
  orderNumber: 'TL2611160016',
  date: '2026-11-16T18:00:00.000Z',
  total: 838,
  items: 2,
  branchName: 'Toluca TL',
  status: 'invoiceable',
  canInvoice: true,
  label: 'Lista para facturar',
  message: null,
  invoice: null,
  ...over,
});

describe('RFC', () => {
  it('se captura en mayúsculas, sin espacios ni guiones y con 13 caracteres como máximo', () => {
    expect(normalizeRfcInput(' gosa-940115 449 ')).toBe('GOSA940115449');
    expect(normalizeRfcInput('GOSA9401154490000')).toBe('GOSA940115449');
    expect(normalizeRfcInput('ñu&a 010101 ab1')).toBe('ÑU&A010101AB1');
  });

  it('13 caracteres es persona física, 12 es moral; incompleto no es ninguno', () => {
    expect(personTypeOfRfc('GOSA940115449')).toBe('fisica');
    expect(personTypeOfRfc('EMP200101AB3')).toBe('moral');
    expect(personTypeOfRfc('GOSA9401')).toBeNull();
    expect(personTypeOfRfc('1234567890123')).toBeNull();
  });

  it('los regímenes se acotan al tipo de persona, sin esconder el que ya estaba guardado', () => {
    expect(regimesForRfc(REGIMES, 'GOSA940115449').map((r) => r.code)).toEqual(['612', '616', '626']);
    expect(regimesForRfc(REGIMES, 'EMP200101AB3').map((r) => r.code)).toEqual(['601', '626']);
    // RFC a medio escribir: se ofrecen todos.
    expect(regimesForRfc(REGIMES, 'GOSA')).toHaveLength(4);
    // Cambió a un RFC de empresa con 612 guardado: 612 sigue visible para que se note y lo cambie.
    expect(regimesForRfc(REGIMES, 'EMP200101AB3', '612').map((r) => r.code)).toEqual(['601', '612', '626']);
  });
});

describe('formulario de datos fiscales', () => {
  it('completo y bien escrito: sin errores', () => {
    expect(validateFiscalForm(FORM)).toEqual({});
    // El correo es opcional.
    expect(validateFiscalForm({ ...FORM, email: '' })).toEqual({});
  });

  it('dice qué falta, campo por campo', () => {
    expect(
      validateFiscalForm({ rfc: '', legalName: ' ', taxRegime: '', cfdiUse: '', postalCode: '', email: '' }),
    ).toEqual({
      rfc: 'rfcRequired',
      legalName: 'legalNameRequired',
      taxRegime: 'regimeRequired',
      cfdiUse: 'cfdiUseRequired',
      postalCode: 'postalCodeInvalid',
    });
    expect(validateFiscalForm({ ...FORM, rfc: 'GOSA9401' })).toEqual({ rfc: 'rfcInvalid' });
    expect(validateFiscalForm({ ...FORM, postalCode: '3650' })).toEqual({ postalCode: 'postalCodeInvalid' });
    expect(validateFiscalForm({ ...FORM, email: 'araceli@correo' })).toEqual({ email: 'emailInvalid' });
  });

  it('lo que se manda: RFC y nombre en mayúsculas, sin espacios de más y sin correo vacío', () => {
    expect(
      toFiscalPayload({ ...FORM, rfc: 'gosa940115449', legalName: '  Araceli   González  Soto ', cfdiUse: 'g03', email: ' ' }),
    ).toEqual({
      rfc: 'GOSA940115449',
      legalName: 'ARACELI GONZÁLEZ SOTO',
      fiscalRegime: '612',
      postalCode: '36500',
      cfdiUse: 'G03',
    });
    expect(toFiscalPayload(FORM).email).toBe('araceli@correo.test');
  });

  it('sabe si hay cambios sin guardar (sin contar mayúsculas ni espacios)', () => {
    const saved = {
      rfc: 'GOSA940115449',
      legalName: 'ARACELI GONZÁLEZ SOTO',
      taxRegime: '612',
      cfdiUse: 'G03',
      postalCode: '36500',
      email: 'araceli@correo.test',
    };
    expect(fiscalFormDirty(FORM, saved)).toBe(false);
    expect(fiscalFormDirty({ ...FORM, rfc: ' gosa940115449' }, saved)).toBe(false);
    expect(fiscalFormDirty({ ...FORM, cfdiUse: 'G01' }, saved)).toBe(true);
    // Sin nada guardado, un formulario vacío no tiene cambios.
    expect(fiscalFormDirty(fiscalFormFrom(null), null)).toBe(false);
  });

  it('una cuenta sin datos fiscales arranca con el formulario vacío', () => {
    expect(fiscalFormFrom(undefined)).toEqual({
      rfc: '',
      legalName: '',
      taxRegime: '',
      cfdiUse: '',
      postalCode: '',
      email: '',
    });
  });

  it('el régimen y el uso se leen con su descripción', () => {
    expect(catalogLabel(REGIMES, '626')).toBe('626 · Régimen Simplificado de Confianza');
    expect(catalogLabel(REGIMES, '999')).toBe('999');
    expect(catalogLabel(undefined, '612')).toBe('612');
    expect(catalogLabel(REGIMES, '')).toBe('');
  });
});

describe('compras del mes', () => {
  it('cada estado tiene su tono; uno desconocido no rompe la lista', () => {
    expect(invoiceTone('invoiceable')).toBe('ready');
    expect(invoiceTone('invoiced')).toBe('done');
    expect(invoiceTone('in_progress')).toBe('wait');
    expect(invoiceTone('in_global')).toBe('accounting');
    expect(invoiceTone('branch_not_invoicing')).toBe('accounting');
    expect(invoiceTone('cancelled')).toBe('muted');
    expect(invoiceTone('algo_nuevo')).toBe('muted');
  });

  it('cuenta lo que se puede facturar, lo facturado y lo que va con Contabilidad', () => {
    expect(
      invoicingCounts([
        order(),
        order({ orderId: 'o-2' }),
        order({ orderId: 'o-3', status: 'invoiced', canInvoice: false }),
        order({ orderId: 'o-4', status: 'in_global', canInvoice: false }),
        order({ orderId: 'o-5', status: 'cancelled', canInvoice: false }),
      ]),
    ).toEqual({ invoiceable: 2, invoiced: 1, accounting: 1 });
    expect(invoicingCounts([])).toEqual({ invoiceable: 0, invoiced: 0, accounting: 0 });
  });

  it('el archivo se llama por el folio fiscal; sin folio, por el pedido', () => {
    const invoiced = order({
      status: 'invoiced',
      canInvoice: false,
      invoice: { id: 'i-1', folio: 'F311-205', uuid: 'u', stampedAt: null },
    });
    expect(invoiceFileName('pdf', invoiced)).toBe('factura-F311-205.pdf');
    expect(invoiceFileName('xml', invoiced)).toBe('factura-F311-205.xml');
    expect(
      invoiceFileName('pdf', order({ invoice: { id: 'i-2', folio: null, uuid: null, stampedAt: null } })),
    ).toBe('factura-pedido-TL2611160016.pdf');
  });
});

describe('textos', () => {
  it('el mes se nombra en el idioma de la cuenta', () => {
    expect(monthName('2026-11', 'es-MX')).toBe('noviembre de 2026');
    expect(monthName('2026-11', 'en-US')).toBe('November 2026');
    expect(monthName('2027-01', 'es-MX')).toBe('enero de 2027');
    expect(monthName('raro', 'es-MX')).toBe('raro');
  });

  it('un estado que esta versión no conoce se muestra con el texto del servidor', () => {
    expect(isKnownInvoiceStatus('in_global')).toBe(true);
    expect(isKnownInvoiceStatus('algo_nuevo')).toBe(false);
    expect(isKnownInvoiceStatus('toString')).toBe(false);
  });
});
