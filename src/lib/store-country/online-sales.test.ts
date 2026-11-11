import { describe, expect, it } from 'vitest';
import type { MlmPeriod } from '@/types/mlm-periods';
import {
  ONLINE_SALES_MAX_DAYS,
  checkDateRange,
  dateRangeMessage,
  formatDay,
  formatRange,
  gatewayShare,
  hasPreviousStoreOrders,
  isCalendarDay,
  isEmptyOnlineSales,
  normalizeOnlineSales,
  onlineSalesOfCountry,
  onlineSalesProblem,
  periodLabel,
  periodRange,
  previousPeriod,
  rangeDays,
  toDateOnly,
} from './online-sales';
import { formatCount, formatMoney, toAmount } from './money';

const period = (over: Partial<MlmPeriod>): MlmPeriod => ({
  id: 'p',
  code: '2026-11',
  name: 'NOVIEMBRE 2026',
  startDate: '2026-11-01',
  endDate: '2026-11-30',
  isClosed: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

// Los periodos reales mezclan regímenes: sep-2026 del 26 al 25, octubre-2026 hasta el 31
// (36 días) y desde noviembre el mes calendario. Por eso el rango SIEMPRE sale del API.
const SEPTEMBER = period({ id: 'p73', code: '2026-09', name: 'SEPTIEMBRE 2026', periodNumber: 73, startDate: '2026-08-26', endDate: '2026-09-25', isClosed: true });
const OCTOBER = period({ id: 'p74', code: '2026-10', name: 'OCTUBRE 2026', periodNumber: 74, startDate: '2026-09-26T00:00:00.000Z', endDate: '2026-10-31T00:00:00.000Z', isClosed: true });
const NOVEMBER = period({ id: 'p75', periodNumber: 75, isCurrent: true });

describe('store-country/online-sales · fechas', () => {
  it('reconoce un día calendario válido', () => {
    expect(isCalendarDay('2026-10-31')).toBe(true);
    expect(isCalendarDay('2026-02-30')).toBe(false);
    expect(isCalendarDay('31/10/2026')).toBe(false);
    expect(isCalendarDay(20261031)).toBe(false);
    expect(toDateOnly('2026-11-01T06:00:00.000Z')).toBe('2026-11-01');
    expect(toDateOnly('2026-11-01')).toBe('2026-11-01');
    expect(toDateOnly('hoy')).toBeNull();
    expect(toDateOnly(null)).toBeNull();
  });

  it('cuenta los días con los dos extremos', () => {
    expect(rangeDays('2026-09-26', '2026-10-31')).toBe(36);
    expect(rangeDays('2026-11-01', '2026-11-01')).toBe(1);
    expect(rangeDays('2025-01-01', '2025-12-31')).toBe(365);
  });

  it('revisa un rango escrito a mano con las reglas del API', () => {
    expect(checkDateRange('2025-01-01', '2025-12-31')).toBeNull();
    expect(checkDateRange('2024-01-01', '2024-12-31')).toBeNull(); // 366 días: el tope
    expect(checkDateRange('', '2025-12-31')).toBe('missing');
    expect(checkDateRange('2025-01-01', null)).toBe('missing');
    expect(checkDateRange('2025-02-30', '2025-12-31')).toBe('invalid_day');
    expect(checkDateRange('2025-12-31', '2025-01-01')).toBe('inverted');
    expect(checkDateRange('2025-01-01', '2026-01-02')).toBe('too_long');
    expect(dateRangeMessage('too_long')).toContain(String(ONLINE_SALES_MAX_DAYS));
    expect(dateRangeMessage('inverted')).toBe('La fecha inicial no puede ser posterior a la final.');
    expect(dateRangeMessage('missing')).toBe('Elige la fecha inicial y la final.');
  });

  it('escribe los días sin pasar por zonas horarias', () => {
    expect(formatDay('2026-09-26')).toBe('26 sep 2026');
    expect(formatDay('2026-01-01')).toBe('1 ene 2026');
    expect(formatDay('no es fecha')).toBe('no es fecha');
    expect(formatRange({ from: '2026-09-26', to: '2026-10-31' })).toBe('26 sep 2026 – 31 oct 2026');
    expect(formatRange({ from: '2026-11-10', to: '2026-11-10' })).toBe('10 nov 2026');
  });
});

describe('store-country/online-sales · periodos de negocio', () => {
  it('el rango es el que guarda el API, no un mes calculado', () => {
    expect(periodRange(OCTOBER)).toEqual({ from: '2026-09-26', to: '2026-10-31' });
    expect(periodRange(SEPTEMBER)).toEqual({ from: '2026-08-26', to: '2026-09-25' });
    expect(periodRange(NOVEMBER)).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(periodRange(period({ startDate: 'x' }))).toBeNull();
    expect(periodRange(period({ startDate: '2026-12-01', endDate: '2026-11-30' }))).toBeNull();
    expect(periodRange(null)).toBeNull();
  });

  it('el periodo anterior es el de número anterior', () => {
    const periods = [NOVEMBER, SEPTEMBER, OCTOBER];
    expect(previousPeriod(periods, NOVEMBER)?.id).toBe('p74');
    expect(previousPeriod(periods, OCTOBER)?.id).toBe('p73');
    expect(previousPeriod(periods, SEPTEMBER)).toBeNull();
  });

  it('sin números de periodo, es el que termina justo antes', () => {
    const strip = (p: MlmPeriod): MlmPeriod => ({ ...p, periodNumber: undefined });
    const periods = [SEPTEMBER, OCTOBER, NOVEMBER].map(strip);
    expect(previousPeriod(periods, strip(NOVEMBER))?.id).toBe('p74');
    expect(previousPeriod(periods, strip(OCTOBER))?.id).toBe('p73');
    expect(previousPeriod([], NOVEMBER)).toBeNull();
    expect(previousPeriod(periods, null)).toBeNull();
  });

  it('nombra el periodo con sus fechas', () => {
    expect(periodLabel(OCTOBER)).toBe('OCTUBRE 2026 · 26 sep 2026 – 31 oct 2026');
    expect(periodLabel(period({ name: 'X', startDate: '' }))).toBe('X');
  });
});

describe('store-country/online-sales · respuesta del API', () => {
  // México 2025 real: pedidos de la tienda del sistema anterior, donde el desglose no suma el total.
  const raw = {
    from: '2025-01-01',
    to: '2025-12-31',
    countries: [
      {
        countryCode: 'MX',
        countryName: 'México',
        currency: 'MXN',
        paidOrders: 3089,
        units: 9120,
        subtotal: '4109847.55',
        discount: '0.00',
        shipping: '0.00',
        tax: '656793.30',
        total: '5755253.10',
        points: 4893189,
        gateways: [{ gateway: 'previous', account: null, label: 'Tienda del sistema anterior', orders: 3089, total: '5755253.10' }],
        pendingOrders: 2,
        pendingTotal: '1840.00',
      },
      {
        countryCode: 'us',
        countryName: 'Estados Unidos',
        currency: 'usd',
        paidOrders: '128',
        units: null,
        subtotal: 20000,
        total: '23495.56',
        points: '1500',
        gateways: [
          { gateway: 'Stripe', account: 'US', label: 'Stripe Estados Unidos', orders: 100, total: '20000.00' },
          { gateway: 'previous', account: null, label: '', orders: 28, total: '3495.56' },
          { nada: true },
        ],
      },
      { countryCode: 'CO', countryName: 'Colombia', currency: 'COP' },
      'GT',
    ],
  };

  it('lee los países sin fiarse de la forma', () => {
    const data = normalizeOnlineSales(raw);
    expect(data?.from).toBe('2025-01-01');
    expect(data?.countries.map((c) => c.countryCode)).toEqual(['MX', 'US', 'CO']);

    const us = onlineSalesOfCountry(data, 'us');
    expect(us).toMatchObject({
      currency: 'USD',
      paidOrders: 128,
      units: 0,
      subtotal: '20000.00',
      discount: '0.00',
      total: '23495.56',
      points: 1500,
      pendingOrders: 0,
      pendingTotal: '0.00',
    });
    expect(us?.gateways).toEqual([
      { gateway: 'stripe', account: 'us', label: 'Stripe Estados Unidos', orders: 100, total: '20000.00' },
      { gateway: 'previous', account: null, label: 'Tienda del sistema anterior', orders: 28, total: '3495.56' },
    ]);

    const co = onlineSalesOfCountry(data, 'CO');
    expect(co && isEmptyOnlineSales(co)).toBe(true);
    expect(onlineSalesOfCountry(data, 'GT')).toBeNull();
    expect(normalizeOnlineSales({})).toBeNull();
    expect(normalizeOnlineSales(null)).toBeNull();
  });

  it('avisa cuando hay pedidos de la tienda anterior (su desglose puede no sumar el total)', () => {
    const data = normalizeOnlineSales(raw);
    const mx = onlineSalesOfCountry(data, 'MX');
    expect(mx && hasPreviousStoreOrders(mx)).toBe(true);
    expect(mx && isEmptyOnlineSales(mx)).toBe(false);
    // 4,109,847.55 + 656,793.30 + 0.00 no da 5,755,253.10: por eso el total es el dato principal.
    expect(toAmount(mx?.subtotal) + toAmount(mx?.tax) + toAmount(mx?.shipping)).not.toBeCloseTo(toAmount(mx?.total), 2);

    const co = onlineSalesOfCountry(data, 'CO');
    expect(co && hasPreviousStoreOrders(co)).toBe(false);
  });

  it('calcula cuánto del total pasó por cada pasarela', () => {
    const us = onlineSalesOfCountry(normalizeOnlineSales(raw), 'US');
    if (!us) throw new Error('sin Estados Unidos');
    expect(gatewayShare(us.gateways[0], us)).toBeCloseTo(85.12, 1);
    expect(gatewayShare({ total: '10.00' }, { total: '0.00' })).toBe(0);
    expect(gatewayShare({ total: '500.00' }, { total: '100.00' })).toBe(100);
  });

  it('distingue por qué no hay datos', () => {
    expect(onlineSalesProblem({ response: { status: 403 } })).toBe('forbidden');
    expect(onlineSalesProblem({ response: { status: 404 } })).toBe('not_available');
    expect(onlineSalesProblem({ response: { status: 400 } })).toBe('bad_range');
    expect(onlineSalesProblem({ response: { status: 500 } })).toBe('error');
    expect(onlineSalesProblem(new Error('Network Error'))).toBe('error');
  });
});

describe('store-country/money', () => {
  it('escribe el monto con su moneda a la vista', () => {
    expect(formatMoney('5755253.10', 'MXN')).toBe('$5,755,253.10 MXN');
    expect(formatMoney(12, 'usd')).toBe('$12.00 USD');
    expect(formatMoney(150, 'COP')).toBe('$150.00 COP');
    expect(formatMoney('150', 'GTQ')).toBe('Q150.00 GTQ');
    expect(formatMoney(-20.5, 'MXN')).toBe('-$20.50 MXN');
    expect(formatMoney(1500, '')).toBe('1,500.00');
    expect(formatMoney(null, 'MXN')).toBe('$0.00 MXN');
    expect(formatMoney('abc', 'MXN')).toBe('$0.00 MXN');
  });

  it('escribe cantidades enteras con separador de miles', () => {
    expect(formatCount(4893189)).toBe('4,893,189');
    expect(formatCount('3089')).toBe('3,089');
    expect(formatCount(undefined)).toBe('0');
    expect(toAmount('64575.00')).toBe(64575);
    expect(toAmount('')).toBe(0);
  });
});
