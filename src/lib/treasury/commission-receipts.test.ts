import { describe, expect, it } from 'vitest';
import {
  applyStampResult,
  canStampReceipt,
  isReceiptFilter,
  matchesReceiptFilter,
  receiptAmounts,
  receiptBucket,
  receiptCounts,
  receiptRowMatches,
  stampBatchSummary,
  stampLabel,
  stampNotice,
} from './commission-receipts';
import type { CommissionReceiptRow, CommissionReceiptsList, CommissionVoucherStatus } from '@/types/commission-receipts';

// Datos inventados para la prueba (no son de nadie).
const row = (
  n: number,
  opts: { paid?: boolean; status?: CommissionVoucherStatus; issues?: string[]; error?: string | null } = {},
): CommissionReceiptRow => ({
  commissionId: `c-${n}`,
  customerId: `cu-${n}`,
  customerNumber: String(1700000 + n),
  customerName: n === 1 ? 'Juana Pérez García' : `Distribuidor ${n}`,
  subtotal: 1000,
  isr: 50,
  total: 950,
  payment: opts.paid === false ? null : { id: `p-${n}`, paidAt: '2026-11-03', reference: 'TIMBRAR CIERRE OCT 2026', subtotal: 1000, isr: 50, total: 950 },
  voucher:
    opts.paid === false
      ? null
      : {
          status: opts.status ?? 'not_stamped',
          invoiceId: opts.status === 'stamped' || opts.status === 'error' ? `i-${n}` : null,
          uuid: opts.status === 'stamped' ? `aaaa${n}bbb-0000-4000-8000-000000000000` : null,
          stampedAt: null,
          error: opts.error ?? null,
          issues: opts.issues ?? [],
        },
});

const stamped = row(1, { status: 'stamped' });
const ready = row(2);
const missing = row(3, { issues: ['Falta el código postal fiscal'] });
const rejected = row(4, { status: 'error', error: 'El código postal no coincide con el del SAT' });
const rejectedMissing = row(5, { status: 'error', issues: ['Falta la CURP'] });
const inProgress = row(6, { status: 'in_progress' });
const unpaid = row(7, { paid: false });
const all = [stamped, ready, missing, rejected, rejectedMissing, inProgress, unpaid];

describe('en qué situación está cada comisión', () => {
  it('distingue timbrada, lista, faltan datos, rechazada, en proceso y sin pago', () => {
    expect(all.map(receiptBucket)).toEqual(['stamped', 'ready', 'missing_data', 'rejected', 'rejected', 'in_progress', 'unpaid']);
  });

  it('solo se puede timbrar lo pagado, sin recibo vivo y con datos completos', () => {
    expect(all.map(canStampReceipt)).toEqual([false, true, false, true, false, false, false]);
  });

  it('la primera vez es "Timbrar"; después de un rechazo, "Reintentar"', () => {
    expect(stampLabel(ready)).toBe('Timbrar');
    expect(stampLabel(rejected)).toBe('Reintentar');
  });

  it('enseña los importes congelados del pago; sin pago, los calculados', () => {
    const paid = { ...ready, subtotal: 1200, payment: { ...ready.payment!, subtotal: 1000 } };
    expect(receiptAmounts(paid).subtotal).toBe(1000);
    expect(receiptAmounts(unpaid)).toEqual({ subtotal: 1000, isr: 50, total: 950 });
  });
});

describe('filtros y conteos', () => {
  it('cuenta cada situación una sola vez', () => {
    expect(receiptCounts(all)).toEqual({
      todas: 7,
      con_recibo: 1,
      listas: 1,
      faltan_datos: 1,
      rechazadas: 2,
      sin_pago: 1,
      pagadas: 6,
      en_proceso: 1,
    });
  });

  it('cada filtro deja solo lo suyo', () => {
    const only = (f: Parameters<typeof matchesReceiptFilter>[1]) => all.filter((r) => matchesReceiptFilter(r, f)).map((r) => r.commissionId);
    expect(only('todas')).toHaveLength(7);
    expect(only('con_recibo')).toEqual(['c-1']);
    expect(only('listas')).toEqual(['c-2']);
    expect(only('faltan_datos')).toEqual(['c-3']);
    expect(only('rechazadas')).toEqual(['c-4', 'c-5']);
    expect(only('sin_pago')).toEqual(['c-7']);
  });

  it('reconoce los filtros válidos de la URL', () => {
    expect(isReceiptFilter('rechazadas')).toBe(true);
    expect(isReceiptFilter('otra')).toBe(false);
  });

  it('busca por número, nombre (sin acentos), referencia del pago o folio fiscal', () => {
    expect(receiptRowMatches('1700001', stamped)).toBe(true);
    expect(receiptRowMatches('juana perez', stamped)).toBe(true);
    expect(receiptRowMatches('cierre oct', ready)).toBe(true);
    expect(receiptRowMatches('aaaa1bbb', stamped)).toBe(true);
    expect(receiptRowMatches('lopez', stamped)).toBe(false);
    expect(receiptRowMatches('', unpaid)).toBe(true);
  });
});

describe('timbrado', () => {
  const list: CommissionReceiptsList = {
    period: { id: 'per', periodNumber: 74, name: 'OCTUBRE 2026', startDate: '2026-09-26', endDate: '2026-10-31', isClosed: true },
    summary: { commissions: 7, registered: 6, stamped: 1, pendingStamp: 5, missingData: 2, errors: 2, registeredSubtotal: 6000, registeredIsr: 300, registeredTotal: 5700 },
    rows: all,
  };

  it('el aviso dice si quedó timbrado, rechazado o en proceso', () => {
    expect(stampNotice('#1700002', { invoiceId: 'i', status: 'stamped', uuid: 'u', error: null })).toEqual({
      tone: 'success',
      text: 'Recibo de nómina timbrado para #1700002.',
    });
    expect(stampNotice('#1700002', { invoiceId: 'i', status: 'error', uuid: null, error: 'RFC no inscrito' })).toEqual({
      tone: 'error',
      text: 'El SAT rechazó el recibo de #1700002: RFC no inscrito',
    });
    expect(stampNotice('#1700002', { invoiceId: 'i', status: 'stamping', uuid: null, error: null }).tone).toBe('info');
  });

  it('un recibo timbrado se refleja en su renglón sin recargar la lista', () => {
    const next = applyStampResult(list, 'p-2', { invoiceId: 'i-new', status: 'stamped', uuid: 'uuid-new', error: null })!;
    const r = next.rows.find((x) => x.commissionId === 'c-2')!;
    expect(receiptBucket(r)).toBe('stamped');
    expect(r.voucher).toMatchObject({ invoiceId: 'i-new', uuid: 'uuid-new', error: null });
    // Los demás renglones no cambian y la lista original tampoco.
    expect(next.rows.filter((x) => x.commissionId !== 'c-2')).toEqual(all.filter((x) => x.commissionId !== 'c-2'));
    expect(receiptBucket(list.rows[1])).toBe('ready');
  });

  it('un rechazo deja el renglón como rechazado, con su motivo', () => {
    const next = applyStampResult(list, 'p-2', { invoiceId: 'i-new', status: 'error', uuid: null, error: 'El código postal no coincide' })!;
    const r = next.rows.find((x) => x.commissionId === 'c-2')!;
    expect(receiptBucket(r)).toBe('rejected');
    expect(r.voucher?.error).toBe('El código postal no coincide');
  });

  it('si el pago no está en la lista, no cambia nada', () => {
    expect(applyStampResult(list, 'p-999', { invoiceId: 'i', status: 'stamped', uuid: 'u', error: null })).toBe(list);
    expect(applyStampResult(undefined, 'p-1', { invoiceId: 'i', status: 'stamped', uuid: 'u', error: null })).toBeUndefined();
  });

  it('resume una tanda', () => {
    expect(stampBatchSummary({ ok: 12, failed: 0, pending: 0, stoppedEarly: false })).toEqual({ tone: 'success', text: '12 recibos timbrados.' });
    expect(stampBatchSummary({ ok: 1, failed: 2, pending: 0, stoppedEarly: false }).text).toBe(
      '1 recibo timbrado y 2 rechazados. Corrige los datos de los rechazados y vuelve a intentar.',
    );
    const stopped = stampBatchSummary({ ok: 0, failed: 3, pending: 9, stoppedEarly: true });
    expect(stopped.tone).toBe('error');
    expect(stopped.text).toContain('9 sin intentar');
  });
});
