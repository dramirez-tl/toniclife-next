import { describe, expect, it } from 'vitest';
import {
  CANCEL_REASON_MIN,
  CFDI_CANCEL_MOTIVES,
  canCancelSales,
  cancelReasonMissing,
  cancelSaleNotice,
  cleanCancelReason,
  saleCanBeCancelled,
} from './cancel-sale';

describe('quién ve "Cancelar venta"', () => {
  it('con el permiso pos:manage (Operaciones, CEDEAS) o siendo súper administrador', () => {
    expect(canCancelSales(['operaciones'], ['pos:manage'])).toBe(true);
    expect(canCancelSales(['cedeas'], ['pos:*'])).toBe(true);
    expect(canCancelSales(['super_admin'], [])).toBe(true);
    expect(canCancelSales(['admin'], ['*'])).toBe(true);
  });

  it('sin el permiso, no: ni Contabilidad ni Call Center ni Sistemas', () => {
    expect(canCancelSales(['contabilidad'], ['pos:payment_method', 'billing:manage'])).toBe(false);
    expect(canCancelSales(['call_center'], ['pos:read'])).toBe(false);
    expect(canCancelSales(['sistemas'], [])).toBe(false);
    expect(canCancelSales(null, undefined)).toBe(false);
  });
});

describe('qué ventas se pueden cancelar', () => {
  it('las completadas y las pendientes sí; las ya canceladas o reembolsadas no', () => {
    expect(saleCanBeCancelled('completed')).toBe(true);
    expect(saleCanBeCancelled('pending')).toBe(true);
    expect(saleCanBeCancelled('cancelled')).toBe(false);
    expect(saleCanBeCancelled('refunded')).toBe(false);
    expect(saleCanBeCancelled(undefined)).toBe(false);
  });
});

describe('motivo', () => {
  it('cuenta sin espacios de sobra', () => {
    expect(cleanCancelReason('  venta   de\nprueba ')).toBe('venta de prueba');
    expect(cancelReasonMissing('prueba')).toBe(CANCEL_REASON_MIN - 6);
    expect(cancelReasonMissing('   corto      ')).toBe(CANCEL_REASON_MIN - 5);
    expect(cancelReasonMissing('venta de prueba del punto móvil')).toBe(0);
  });
});

describe('motivos SAT', () => {
  it('el 03 va primero (es el de por defecto)', () => {
    expect(CFDI_CANCEL_MOTIVES[0].value).toBe('03');
    expect(CFDI_CANCEL_MOTIVES.map((m) => m.value).sort()).toEqual(['01', '02', '03', '04']);
  });
});

describe('aviso al terminar', () => {
  it('sin factura: solo la venta', () => {
    expect(cancelSaleNotice('500-20261127-0001', false, {})).toEqual({
      tone: 'success',
      text: 'Venta 500-20261127-0001 cancelada.',
    });
  });

  it('con factura cancelada ante el SAT', () => {
    expect(cancelSaleNotice('102-1', true, { cfdiCancelled: true })).toEqual({
      tone: 'success',
      text: 'Venta 102-1 cancelada y su factura también.',
    });
  });

  it('con factura que el SAT dejó en proceso: avisa que hay que revisarla', () => {
    const notice = cancelSaleNotice('102-1', true, { cfdiCancelled: false, cfdiCancellationStatus: 'En proceso' });
    expect(notice.tone).toBe('warning');
    expect(notice.text).toBe(
      'Venta 102-1 cancelada. La cancelación de su factura quedó en proceso ante el SAT (En proceso): revísala en Facturación.',
    );
  });

  it('con factura que no se pudo cancelar: lo dice con el motivo', () => {
    const notice = cancelSaleNotice('102-1', true, { cfdiCancelled: false, cfdiCancellationError: 'El PAC no respondió.' });
    expect(notice.tone).toBe('warning');
    expect(notice.text).toBe(
      'Venta 102-1 cancelada, pero su factura NO se pudo cancelar: El PAC no respondió. Cancélala desde Facturación.',
    );
  });

  it('con factura y sin datos del resultado: no da por cancelada la factura', () => {
    expect(cancelSaleNotice('102-1', true, undefined).tone).toBe('warning');
  });
});
