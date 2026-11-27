import { describe, expect, it } from 'vitest';
import {
  PAYMENT_EDIT_OPTIONS,
  bulkFailures,
  bulkSummary,
  canCorrectPaymentMethod,
  canSavePaymentChange,
  cleanReason,
  fiscalFollowUp,
  reasonIsEnough,
  reasonMissing,
} from './payment-changes';
import type { PaymentBulkResult, PaymentChangePreview } from '@/types/payment-changes';

const preview = (over: Partial<PaymentChangePreview> = {}): PaymentChangePreview => ({
  saleId: 's-1',
  saleNumber: '143-20261125-0026',
  branchName: 'Puebla 11 Norte TL',
  saleDate: '2026-11-25',
  currentMethod: 'cash',
  currentPayments: [{ method: 'cash', label: 'Efectivo', amount: 1071 }],
  targetMethod: 'card',
  headerMethodAfter: 'card',
  allowed: true,
  blockCode: null,
  blockMessage: null,
  effects: ['$1,071.00 pasan de Efectivo a Tarjeta.'],
  fiscalAction: 'none',
  invoiceFolio: null,
  reasonMinLength: 10,
  history: [],
  ...over,
});

describe('quién ve el lápiz', () => {
  it('Operaciones lo ve por el permiso; sin él, no', () => {
    expect(canCorrectPaymentMethod(['operaciones'], ['pos:manage', 'pos:payment_method'])).toBe(true);
    expect(canCorrectPaymentMethod(['operaciones'], ['pos:manage'])).toBe(false);
  });

  it('administración y Contabilidad lo siguen viendo por su rol', () => {
    expect(canCorrectPaymentMethod(['contabilidad'], [])).toBe(true);
    expect(canCorrectPaymentMethod(['super_admin'], [])).toBe(true);
    expect(canCorrectPaymentMethod(['administrador'], [])).toBe(true);
    expect(canCorrectPaymentMethod(['call_center'], [])).toBe(false);
    expect(canCorrectPaymentMethod(null, undefined)).toBe(false);
  });
});

describe('métodos que se pueden elegir', () => {
  it('"Mixto" no se ofrece', () => {
    expect(PAYMENT_EDIT_OPTIONS.some((o) => o.value === 'mixed')).toBe(false);
    expect(PAYMENT_EDIT_OPTIONS.some((o) => o.value === 'cash')).toBe(true);
  });
});

describe('motivo', () => {
  it('cuenta sin espacios de sobra', () => {
    expect(cleanReason('  pagó   con\ntarjeta ')).toBe('pagó con tarjeta');
    expect(reasonIsEnough('pagó con tarjeta')).toBe(true);
    expect(reasonIsEnough('   corto      ')).toBe(false);
    expect(reasonMissing('corto')).toBe(5);
    expect(reasonMissing('pagó con tarjeta')).toBe(0);
  });
});

describe('cuándo se puede guardar', () => {
  it('con la revisión, el cambio permitido y el motivo', () => {
    expect(canSavePaymentChange(preview(), 'pagó con tarjeta')).toBe(true);
  });

  it('sin revisión, sin motivo o con el cambio bloqueado, no', () => {
    expect(canSavePaymentChange(null, 'pagó con tarjeta')).toBe(false);
    expect(canSavePaymentChange(preview(), 'corto')).toBe(false);
    expect(canSavePaymentChange(preview({ allowed: false, blockMessage: 'Es de otro mes' }), 'pagó con tarjeta')).toBe(
      false,
    );
  });
});

describe('lo que queda por hacer con la factura', () => {
  it('lo dice según el caso', () => {
    expect(fiscalFollowUp('none', null)).toBe('');
    expect(fiscalFollowUp('reissue_global', 'F-26010062')).toBe(
      'La factura global F-26010062 quedó por reexpedir: avisa a Contabilidad.',
    );
    expect(fiscalFollowUp('replace_nominative', null)).toBe(
      'La factura del cliente quedó por sustituir: avisa a Contabilidad.',
    );
  });
});

describe('corrección en bloque', () => {
  const result: PaymentBulkResult = {
    results: [
      { saleId: 'a', saleNumber: 'A-1', ok: true, paymentMethod: 'card', message: null, fiscalAction: 'none' },
      { saleId: 'b', saleNumber: 'A-2', ok: true, paymentMethod: 'card', message: null, fiscalAction: 'reissue_global' },
      { saleId: 'c', saleNumber: null, ok: false, paymentMethod: null, message: 'tiene pago mixto', fiscalAction: 'none' },
    ],
    changed: 2,
    failed: 1,
    pendingInvoices: 1,
  };

  it('resume cuántos se movieron y cuántos dejaron factura por corregir', () => {
    expect(bulkSummary(result, 'Tarjeta')).toBe('2 tickets pasaron a Tarjeta; 1 dejó una factura por corregir');
    expect(bulkSummary({ ...result, changed: 1, pendingInvoices: 0 }, 'Efectivo')).toBe('1 ticket pasó a Efectivo');
  });

  it('lista los que no se pudieron con su folio y su motivo', () => {
    expect(bulkFailures(result, (id) => `folio-${id}`)).toEqual(['folio-c: tiene pago mixto']);
  });
});
