import { describe, expect, it } from 'vitest';
import type { FulfillmentResolutionCandidate, FulfillmentSimulateResponse } from '@/types/fulfillment';
import { chosenCandidate, simulationHeadline, simulationOutcome } from './simulation-outcome';

const candidate = (overrides: Partial<FulfillmentResolutionCandidate> = {}): FulfillmentResolutionCandidate => ({
  routeId: 'r-164',
  branchId: 'b-164',
  branchCode: '164',
  branchName: 'Irapuato',
  priority: 1,
  status: 'chosen',
  skipReason: null,
  shortages: [],
  ...overrides,
});

const result = (overrides: Partial<FulfillmentSimulateResponse> = {}): FulfillmentSimulateResponse => ({
  countryCode: 'MX',
  mode: 'full_order',
  crossCountry: 'block',
  branchId: 'b-164',
  reason: 'single_route',
  candidates: [candidate()],
  messageEs: 'Lo surtiría 164 · Irapuato (único almacén para México)',
  ...overrides,
});

const shortage = { productId: 'p1', name: 'Té', need: 999, available: 3 };

describe('simulationOutcome (H-1: tres estados)', () => {
  it('verde: hay almacén y no le falta nada', () => {
    expect(simulationOutcome(result())).toBe('ok');
    expect(simulationOutcome(result({ reason: 'full_stock' }))).toBe('ok');
    expect(simulationOutcome(result({ reason: 'first_active', candidates: [] }))).toBe('ok');
    expect(simulationHeadline(result(), 'México')).toBe('Sí se puede enviar');
  });

  it('ámbar: único almacén con faltantes (el API devuelve branchId, pero el pedido no pasaría)', () => {
    const r = result({ candidates: [candidate({ shortages: [shortage] })] });
    expect(r.branchId).not.toBeNull();
    expect(simulationOutcome(r)).toBe('stock_short');
    expect(simulationHeadline(r, 'México')).toBe(
      'Le tocaría a 164 · Irapuato, pero el pedido no pasaría por falta de existencias',
    );
  });

  it('ámbar: ningún almacén cubre el pedido y se cae al primero (no_full_stock_fallback_first)', () => {
    const r = result({
      reason: 'no_full_stock_fallback_first',
      candidates: [
        candidate({ shortages: [shortage] }),
        candidate({
          routeId: 'r-205',
          branchId: 'b-205',
          branchCode: '205',
          status: 'skipped',
          skipReason: 'insufficient_stock',
          shortages: [shortage],
        }),
      ],
    });
    expect(simulationOutcome(r)).toBe('stock_short');
    // Aunque el API no mandara los faltantes del elegido, el motivo basta.
    expect(simulationOutcome(result({ reason: 'no_full_stock_fallback_first' }))).toBe('stock_short');
  });

  it('ámbar también con first_active: el primero se usa aunque no tenga todo', () => {
    const r = result({ reason: 'first_active', mode: 'first_active', candidates: [candidate({ shortages: [shortage] })] });
    expect(simulationOutcome(r)).toBe('stock_short');
  });

  it('los faltantes de un almacén SALTADO no vuelven ámbar a uno elegido que sí tiene todo', () => {
    const r = result({
      reason: 'full_stock',
      branchId: 'b-205',
      candidates: [
        candidate({ status: 'skipped', skipReason: 'insufficient_stock', shortages: [shortage] }),
        candidate({ routeId: 'r-205', branchId: 'b-205', branchCode: '205', branchName: 'Tulsa' }),
      ],
    });
    expect(chosenCandidate(r)?.branchCode).toBe('205');
    expect(simulationOutcome(r)).toBe('ok');
  });

  it('rojo: sin ruta o sin ruta utilizable', () => {
    const none = result({ branchId: null, reason: 'no_route', candidates: [] });
    expect(simulationOutcome(none)).toBe('no_route');
    expect(simulationHeadline(none, 'Frontera')).toBe('Hoy no se podría enviar a Frontera');
    const blocked = result({
      branchId: null,
      reason: 'no_usable_route',
      candidates: [candidate({ status: 'skipped', skipReason: 'cross_country_blocked' })],
    });
    expect(simulationOutcome(blocked)).toBe('no_route');
  });

  it('si el API no marca "chosen", se usa el candidato del branchId', () => {
    const r = result({ candidates: [candidate({ status: 'not_evaluated', shortages: [shortage] })] });
    expect(chosenCandidate(r)?.branchId).toBe('b-164');
    expect(simulationOutcome(r)).toBe('stock_short');
  });
});
