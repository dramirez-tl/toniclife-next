// route-diff.ts — Resumen de cambios del borrador (lógica PURA).
//
// Alimenta la barra "N cambios sin guardar" y el diálogo "Revisar y guardar"
// (contrato de rutas §7.3-7): qué cambió, en lenguaje llano, y qué países que
// HOY se pueden enviar dejarían de poder enviarse (confirmación reforzada).
// Mismos 6 tipos de cambio que `diffRoutes` del API.

import type { FulfillmentRouteChangeType, FulfillmentStockMode } from '@/types/fulfillment';
import { resolveCountry, normalizeNotes, type DraftRoute, type RoutingContext } from './route-draft';

export interface RouteChange {
  type: FulfillmentRouteChangeType;
  countryCode: string;
  /** null en `reordered` (el cambio es de la lista completa). */
  branchId: string | null;
  branchCode: string | null;
  branchName: string | null;
  /** Lugar en la lista nueva (1 = principal). Solo en `added`. */
  position?: number;
  /** Orden nuevo completo, como etiquetas "código · nombre". Solo en `reordered`. */
  order?: string[];
}

type RoutesByCountry = Record<string, DraftRoute[]>;

const label = (r: Pick<DraftRoute, 'branchCode' | 'branchName'>) => `${r.branchCode} · ${r.branchName}`;

/**
 * Cambios entre lo guardado y el borrador, país por país (orden alfabético de
 * código) y dentro de cada país: quitados, agregados, pausados/reactivados,
 * notas y, al final, el reordenado. Sin cambios → [].
 *
 * `reordered` compara el orden RELATIVO de los almacenes que están en ambos
 * lados: agregar o quitar un almacén no cuenta como reordenar.
 */
export function diffRoutes(before: RoutesByCountry, after: RoutesByCountry): RouteChange[] {
  const changes: RouteChange[] = [];
  const codes = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();

  for (const countryCode of codes) {
    const prev = before[countryCode] ?? [];
    const next = after[countryCode] ?? [];
    const prevById = new Map(prev.map((r) => [r.branchId, r]));
    const nextById = new Map(next.map((r) => [r.branchId, r]));
    const ref = (r: DraftRoute) => ({
      countryCode,
      branchId: r.branchId,
      branchCode: r.branchCode,
      branchName: r.branchName,
    });

    for (const r of prev) {
      if (!nextById.has(r.branchId)) changes.push({ type: 'removed', ...ref(r) });
    }
    next.forEach((r, index) => {
      if (!prevById.has(r.branchId)) changes.push({ type: 'added', ...ref(r), position: index + 1 });
    });
    for (const r of next) {
      const old = prevById.get(r.branchId);
      if (!old) continue;
      if (old.isActive && !r.isActive) changes.push({ type: 'paused', ...ref(r) });
      if (!old.isActive && r.isActive) changes.push({ type: 'resumed', ...ref(r) });
      if (normalizeNotes(old.notes) !== normalizeNotes(r.notes)) {
        changes.push({ type: 'notes_changed', ...ref(r) });
      }
    }

    const commonPrev = prev.filter((r) => nextById.has(r.branchId)).map((r) => r.branchId);
    const commonNext = next.filter((r) => prevById.has(r.branchId)).map((r) => r.branchId);
    if (commonPrev.join('|') !== commonNext.join('|')) {
      changes.push({
        type: 'reordered',
        countryCode,
        branchId: null,
        branchCode: null,
        branchName: null,
        order: next.map(label),
      });
    }
  }
  return changes;
}

/**
 * Países que HOY resuelven almacén y con el borrador dejarían de resolver: por
 * pausar, por quitar, por dejar al frente un almacén desactivado o por quedar
 * solo rutas entre países bloqueadas. Un país que ya no resolvía NO se marca.
 */
export function countriesLosingShipping(
  before: RoutesByCountry,
  after: RoutesByCountry,
  ctx: RoutingContext,
): string[] {
  return Object.keys(before)
    .filter(
      (code) =>
        resolveCountry(before[code], code, ctx) !== null && resolveCountry(after[code], code, ctx) === null,
    )
    .sort();
}

/** Países donde cambia el almacén que surte (sin quedarse sin envío). */
export function countriesChangingWarehouse(
  before: RoutesByCountry,
  after: RoutesByCountry,
  ctx: RoutingContext,
): Array<{ countryCode: string; from: DraftRoute | null; to: DraftRoute }> {
  const out: Array<{ countryCode: string; from: DraftRoute | null; to: DraftRoute }> = [];
  for (const code of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
    const from = resolveCountry(before[code], code, ctx);
    const to = resolveCountry(after[code], code, ctx);
    if (to && from?.branchId !== to.branchId) out.push({ countryCode: code, from, to });
  }
  return out;
}

export function countChanges(changes: RouteChange[], stockModeChanged: boolean): number {
  return changes.length + (stockModeChanged ? 1 : 0);
}

export function changesLabel(count: number): string {
  return count === 1 ? '1 cambio sin guardar' : `${count} cambios sin guardar`;
}

/** Texto llano de un cambio, para una persona no técnica. */
export function describeChange(change: RouteChange, countryName: string): string {
  const warehouse = `${change.branchCode ?? ''} · ${change.branchName ?? ''}`;
  switch (change.type) {
    case 'added':
      return change.position === 1
        ? `${countryName}: se agrega ${warehouse} como almacén principal.`
        : `${countryName}: se agrega ${warehouse} como respaldo (lugar ${change.position ?? '—'} de la lista).`;
    case 'removed':
      return `${countryName}: se quita ${warehouse}.`;
    case 'paused':
      return `${countryName}: se pausa ${warehouse} (se queda en la lista, pero no surte).`;
    case 'resumed':
      return `${countryName}: se reactiva ${warehouse}.`;
    case 'notes_changed':
      return `${countryName}: cambia la nota de ${warehouse}.`;
    case 'reordered':
      return `${countryName}: cambia el orden → ${(change.order ?? []).map((l, i) => `${i + 1}) ${l}`).join(', ')}.`;
    default:
      return `${countryName}: cambio en ${warehouse}.`;
  }
}

export const STOCK_MODE_LABELS: Record<FulfillmentStockMode, string> = {
  full_order: 'Usar el primero que tenga todo el pedido',
  first_active: 'Usar siempre el primero de la lista',
};

export function describeStockModeChange(to: FulfillmentStockMode): string {
  return `Cuando un país tiene varios almacenes: ${STOCK_MODE_LABELS[to].toLowerCase()}.`;
}

/**
 * Texto que hay que teclear para dejar sin envío a países con la tienda
 * abierta: el nombre del país (varios → separados por coma, en el orden dado).
 */
export function confirmTextForCountries(countryNames: string[]): string | undefined {
  const names = countryNames.map((n) => n.trim()).filter(Boolean);
  return names.length > 0 ? names.join(', ') : undefined;
}
