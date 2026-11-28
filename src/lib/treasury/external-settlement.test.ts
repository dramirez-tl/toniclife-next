import { describe, expect, it } from 'vitest';
import { isSettled, settlementNotice, settlementProgress, skippedGroups, skippedTotal } from './external-settlement';
import type { CommissionReceiptRow } from '@/types/commission-receipts';
import type { ExternalSettlementResult } from '@/types/external-settlement';

// Datos inventados para la prueba (no son de nadie).
const row = (n: number, opts: { paid?: boolean; status?: string; total?: number } = {}): CommissionReceiptRow => ({
  commissionId: `c-${n}`,
  customerId: `cu-${n}`,
  customerNumber: String(1700000 + n),
  customerName: `Distribuidor ${n}`,
  ...('status' in opts ? { commissionStatus: opts.status } : {}),
  subtotal: 1000,
  isr: 50,
  total: 950,
  payment:
    opts.paid === false
      ? null
      : { id: `p-${n}`, paidAt: '2026-11-03', reference: 'TIMBRAR CIERRE OCT 2026', subtotal: 1000, isr: 50, total: opts.total ?? 950 },
  voucher: opts.paid === false ? null : { status: 'not_stamped', invoiceId: null, uuid: null, stampedAt: null, error: null, issues: [] },
});

const result = (over: Partial<ExternalSettlementResult> = {}): ExternalSettlementResult => ({
  applied: false,
  period: { id: 'p74', code: '10-2026', name: 'OCTUBRE 2026' },
  registered: 6,
  eligible: 3,
  amount: 6848.48,
  alreadyPaid: 1,
  skippedByCode: {},
  skipped: [],
  byPaymentDate: [],
  settled: 0,
  periodFullyPaid: null,
  ...over,
});

describe('avance de "pasar a Pagada"', () => {
  it('cuenta las que ya están pagadas en el embudo y las que faltan, con su neto', () => {
    const progress = settlementProgress([
      row(1, { status: 'calculated', total: 2075.14 }),
      row(2, { status: 'calculated', total: 4176.03 }),
      row(3, { status: 'paid' }),
      row(4, { paid: false, status: 'calculated' }),
    ]);
    expect(progress).toEqual({ known: true, registered: 3, settled: 1, pending: 2, pendingAmount: 6251.17 });
  });

  it('suma en centavos: no arrastra errores de punto flotante', () => {
    const rows = [row(1, { status: 'calculated', total: 0.1 }), row(2, { status: 'calculated', total: 0.2 })];
    expect(settlementProgress(rows).pendingAmount).toBe(0.3);
  });

  it('si el servidor todavía no manda la etapa, no inventa pendientes', () => {
    const progress = settlementProgress([row(1), row(2)]);
    expect(progress).toMatchObject({ known: false, registered: 2, pending: 0, settled: 0 });
  });

  it('sin pagos registrados no hay nada que asentar', () => {
    expect(settlementProgress([row(1, { paid: false, status: 'calculated' })])).toMatchObject({ known: false, registered: 0, pending: 0 });
  });

  it('una aprobada con pago registrado sigue pendiente (no es pagada)', () => {
    expect(isSettled(row(1, { status: 'approved' }))).toBe(false);
    expect(isSettled(row(1, { status: 'paid' }))).toBe(true);
  });
});

describe('las que no se asientan', () => {
  const preview = result({
    skippedByCode: { amount_mismatch: 2, in_dispersion: 1, already_paid: 4 },
    skipped: [
      { commissionId: 'c-1', customerNumber: '5518', code: 'amount_mismatch', message: '' },
      { commissionId: 'c-2', customerNumber: '6466', code: 'in_dispersion', message: '' },
      { commissionId: 'c-3', customerNumber: '7001', code: 'amount_mismatch', message: '' },
      { commissionId: 'c-4', customerNumber: null, code: 'amount_mismatch', message: '' },
    ],
  });

  it('se agrupan por motivo, de más a menos, sin contar las que ya estaban pagadas', () => {
    const groups = skippedGroups(preview);
    expect(groups.map((g) => [g.code, g.count])).toEqual([
      ['amount_mismatch', 2],
      ['in_dispersion', 1],
    ]);
    expect(groups[0].customerNumbers).toEqual(['5518', '7001']);
    expect(groups[0].label).toContain('ya no coincide');
    expect(skippedTotal(preview)).toBe(3);
  });

  it('sin omitidas la lista sale vacía', () => {
    expect(skippedGroups(result())).toEqual([]);
    expect(skippedTotal(result())).toBe(0);
  });
});

describe('aviso al terminar', () => {
  it('todo bien: dice cuántas quedaron pagadas', () => {
    expect(settlementNotice(result({ applied: true, settled: 1887 }), (n) => n.toLocaleString('es-MX'))).toEqual({
      tone: 'success',
      text: '1,887 comisiones quedaron como «Pagada» con la fecha de su depósito.',
    });
  });

  it('una sola va en singular', () => {
    expect(settlementNotice(result({ applied: true, settled: 1 })).text).toBe('1 comisión quedó como «Pagada» con la fecha de su depósito.');
  });

  it('si algunas no pasaron, lo avisa', () => {
    const notice = settlementNotice(result({ applied: true, settled: 3, skippedByCode: { amount_mismatch: 2 } }));
    expect(notice.tone).toBe('warning');
    expect(notice.text).toContain('2 no se pasaron');
  });

  it('si no había nada, lo dice sin alarmar', () => {
    expect(settlementNotice(result({ applied: true, settled: 0 }))).toEqual({ tone: 'info', text: 'No había comisiones por pasar a «Pagada».' });
  });
});
