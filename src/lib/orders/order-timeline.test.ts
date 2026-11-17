import { describe, expect, it } from 'vitest';
import {
  dueText,
  formatTimelineDate,
  isReached,
  paymentBadgeClass,
  paymentFacts,
  shortId,
  stepWhen,
  stripeAccountLabel,
  timelineMoney,
} from './order-timeline';
import type { OrderTimelinePayment, OrderTimelineStep } from '@/types/order-timeline';

const TZ = { timeZone: 'America/Mexico_City', now: new Date('2026-11-17T18:00:00.000Z') };

const payment = (over: Partial<OrderTimelinePayment> = {}): OrderTimelinePayment => ({
  kind: 'card',
  methodLabel: 'Tarjeta (Stripe)',
  state: 'paid',
  stateLabel: 'Pagado',
  amount: 1124,
  currencyCode: 'MXN',
  startedAt: '2026-11-16T02:35:57.000Z',
  paidAt: '2026-11-16T02:37:37.000Z',
  reference: null,
  voucherUrl: null,
  voucherIssuedAt: null,
  voucherExpiresAt: null,
  gatewayId: 'cs_live_bc7W4K2N98O13e50l8giGBwQlDWkKs9tQF5rcgVIDLyYDCQ7g4G4rVNQH4',
  gatewayAccount: 'mx',
  attempts: 1,
  ...over,
});

const step = (over: Partial<OrderTimelineStep> = {}): OrderTimelineStep => ({
  key: 'paid',
  title: 'Pago con tarjeta aprobado',
  detail: null,
  at: null,
  dueAt: null,
  state: 'done',
  ...over,
});

describe('fechas del historial', () => {
  it('se leen como en México, sin año si es el año en curso', () => {
    expect(formatTimelineDate('2026-11-16T02:37:37.000Z', TZ)).toBe('15 nov, 8:37 p.m.');
    expect(formatTimelineDate('2025-12-01T18:05:00.000Z', TZ)).toBe('1 dic 2025, 12:05 p.m.');
    expect(formatTimelineDate(null, TZ)).toBeNull();
    expect(formatTimelineDate('no es fecha', TZ)).toBeNull();
  });

  it('la ficha dice si vence o si ya venció', () => {
    expect(dueText('2026-11-20T05:59:59.000Z', TZ)).toBe('Vence 19 nov, 11:59 p.m.');
    expect(dueText('2026-11-17T05:59:59.000Z', TZ)).toBe('Venció 16 nov, 11:59 p.m.');
    expect(dueText(null, TZ)).toBeNull();
  });

  it('un paso sin fecha dice en qué está', () => {
    expect(stepWhen(step({ at: '2026-11-16T02:37:37.000Z' }), TZ)).toBe('15 nov, 8:37 p.m.');
    expect(stepWhen(step({ state: 'current' }), TZ)).toBe('En curso');
    expect(stepWhen(step({ state: 'upcoming' }), TZ)).toBe('Pendiente');
    expect(stepWhen(step({ state: 'done' }), TZ)).toBe('Fecha no registrada');
  });
});

describe('tarjeta de pago', () => {
  it('con tarjeta: cuándo inició, cuándo se pagó y el cobro de Stripe abreviado pero copiable entero', () => {
    const facts = paymentFacts(payment(), TZ);
    expect(facts.map((f) => `${f.label}: ${f.value}`)).toEqual([
      'Inició el pago: 15 nov, 8:35 p.m.',
      'Pagado: 15 nov, 8:37 p.m.',
      'Cobro en Stripe: cs_live_bc7W4K…NQH4',
      'Cuenta: Stripe México',
    ]);
    expect(facts[2].copy).toBe('cs_live_bc7W4K2N98O13e50l8giGBwQlDWkKs9tQF5rcgVIDLyYDCQ7g4G4rVNQH4');
  });

  it('OXXO sin pagar: ficha, referencia y vencimiento; no inventa una fecha de pago', () => {
    const facts = paymentFacts(
      payment({
        kind: 'oxxo',
        state: 'voucher_issued',
        paidAt: null,
        reference: '9300012345678901',
        voucherIssuedAt: '2026-11-17T06:03:46.000Z',
        voucherExpiresAt: '2026-11-20T05:59:59.000Z',
        attempts: 2,
      }),
      TZ,
    );
    expect(facts.map((f) => `${f.label}: ${f.value}`)).toEqual([
      'Inició el pago: 15 nov, 8:35 p.m.',
      'Ficha generada: 17 nov, 12:03 a.m.',
      'Referencia: 9300012345678901',
      'Vence: 19 nov, 11:59 p.m.',
      'Intentos de pago: 2',
      'Cobro en Stripe: cs_live_bc7W4K…NQH4',
      'Cuenta: Stripe México',
    ]);
    expect(facts.find((f) => f.label === 'Referencia')?.copy).toBe('9300012345678901');
  });

  it('OXXO vencido se marca en rojo y OXXO pagado ya no enseña el vencimiento', () => {
    const overdue = paymentFacts(
      payment({ kind: 'oxxo', state: 'voucher_overdue', paidAt: null, voucherExpiresAt: '2026-11-17T05:59:59.000Z' }),
      TZ,
    );
    expect(overdue.find((f) => f.label === 'Venció')).toMatchObject({ value: '16 nov, 11:59 p.m.', tone: 'danger' });
    const paid = paymentFacts(payment({ kind: 'oxxo', voucherExpiresAt: '2026-11-20T05:59:59.000Z' }), TZ);
    expect(paid.some((f) => f.label === 'Vence' || f.label === 'Venció')).toBe(false);
  });

  it('colores y textos auxiliares', () => {
    expect(paymentBadgeClass('paid')).toContain('emerald');
    expect(paymentBadgeClass('voucher_issued')).toContain('amber');
    expect(paymentBadgeClass('failed')).toContain('red');
    expect(isReached('done')).toBe(true);
    expect(isReached('current')).toBe(true);
    expect(isReached('upcoming')).toBe(false);
    expect(shortId('cs_live_corto')).toBe('cs_live_corto');
    expect(shortId(null)).toBeNull();
    expect(stripeAccountLabel('us')).toBe('Stripe Estados Unidos');
    expect(stripeAccountLabel(null)).toBeNull();
    expect(timelineMoney(1124, 'MXN')).toBe('$1,124.00');
    expect(timelineMoney(null, 'MXN')).toBeNull();
  });
});
