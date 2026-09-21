// simulation-outcome.ts — Titular del simulador "Probar un pedido" (lógica PURA).
//
// El simulador tiene TRES estados, no dos: que el API devuelva un almacén NO
// significa que el pedido pase. Con un solo almacén (o `first_active`) el
// resolvedor no evalúa existencias al elegir, y con `full_order` sin ningún
// almacén completo cae al primero (`no_full_stock_fallback_first`): en ambos
// casos el checkout real respondería "Stock insuficiente". El texto principal
// es SIEMPRE el `messageEs` del API; esto solo decide el color y el titular.

import type { FulfillmentResolutionCandidate, FulfillmentSimulateResponse } from '@/types/fulfillment';

export type SimulationOutcome =
  /** Verde: hay almacén y tiene todo el pedido. */
  | 'ok'
  /** Ámbar: le tocaría a un almacén, pero el pedido no pasaría por existencias. */
  | 'stock_short'
  /** Rojo: el país no tiene ruta utilizable. */
  | 'no_route';

type OutcomeInput = Pick<FulfillmentSimulateResponse, 'branchId' | 'reason' | 'candidates'>;

export function chosenCandidate(result: Pick<OutcomeInput, 'branchId' | 'candidates'>): FulfillmentResolutionCandidate | null {
  const candidates = result.candidates ?? [];
  return (
    candidates.find((c) => c.status === 'chosen') ??
    (result.branchId ? (candidates.find((c) => c.branchId === result.branchId) ?? null) : null)
  );
}

export function simulationOutcome(result: OutcomeInput): SimulationOutcome {
  if (!result.branchId) return 'no_route';
  if (result.reason === 'no_full_stock_fallback_first') return 'stock_short';
  return (chosenCandidate(result)?.shortages?.length ?? 0) > 0 ? 'stock_short' : 'ok';
}

/** Titular corto; debajo va el `messageEs` del API. */
export function simulationHeadline(result: OutcomeInput, countryName: string): string {
  const outcome = simulationOutcome(result);
  if (outcome === 'no_route') return `Hoy no se podría enviar a ${countryName}`;
  if (outcome === 'ok') return 'Sí se puede enviar';
  const chosen = chosenCandidate(result);
  return chosen
    ? `Le tocaría a ${chosen.branchCode} · ${chosen.branchName}, pero el pedido no pasaría por falta de existencias`
    : 'Hay almacén, pero el pedido no pasaría por falta de existencias';
}
