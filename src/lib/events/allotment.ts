// Reparto parejo de boletos entre sucursales (5-nov-2026), tomando en cuenta
// a los invitados: cada boleto cobrado puede traer los boletos de las demás
// claves del evento (Invitado), y cada boleto es una persona del aforo.

import type { EventProductDto } from '@/types/events';

/**
 * Lugares del aforo que ocupa UNA unidad vendida de la clave principal si trae
 * a sus invitados: suma de boletos por unidad de todas las claves activas
 * (titular + invitado…). Mínimo 1.
 */
export function placesPerUnit(products: ReadonlyArray<Pick<EventProductDto, 'ticketsPerUnit' | 'isActive'>>): number {
  const total = products
    .filter((p) => p.isActive !== false)
    .reduce((n, p) => n + Math.max(1, Math.floor(Number(p.ticketsPerUnit) || 1)), 0);
  return Math.max(1, total);
}

export interface EvenSplitInput {
  /** Aforo del evento (personas). Sin aforo no hay reparto. */
  capacity: number | null | undefined;
  /** Boletos vigentes del evento, todas las claves (titular + invitado). */
  ticketsIssued: number;
  /** Lugares que ocupa cada unidad de la clave principal (ver placesPerUnit). */
  placesPerUnit: number;
  /** Sucursales palomeadas, en el orden en que se reparte el sobrante. */
  branches: ReadonlyArray<{ branchId: string; soldUnits: number }>;
}

export interface EvenSplitResult {
  placesLeft: number;
  unitsToSplit: number;
  base: number;
  extra: number;
  /** Asignación nueva por sucursal = lo ya vendido + su parte. */
  allotments: Record<string, number>;
}

/**
 * Reparte parejo entre las sucursales seleccionadas los boletos que todavía
 * caben en el aforo: (aforo − vigentes) / lugares por unidad, redondeado hacia
 * abajo para no rebasar ni con invitados. Las primeras `extra` sucursales
 * reciben uno más. Nunca asigna menos de lo ya vendido.
 */
export function evenSplitAllotments(input: EvenSplitInput): EvenSplitResult {
  const capacity = Math.floor(Number(input.capacity) || 0);
  const issued = Math.max(0, Math.floor(Number(input.ticketsIssued) || 0));
  const per = Math.max(1, Math.floor(Number(input.placesPerUnit) || 1));
  const placesLeft = capacity > 0 ? Math.max(0, capacity - issued) : 0;
  const unitsToSplit = Math.floor(placesLeft / per);
  const n = input.branches.length;
  const base = n > 0 ? Math.floor(unitsToSplit / n) : 0;
  const extra = n > 0 ? unitsToSplit % n : 0;
  const allotments: Record<string, number> = {};
  input.branches.forEach((b, i) => {
    const sold = Math.max(0, Math.floor(Number(b.soldUnits) || 0));
    allotments[b.branchId] = sold + base + (i < extra ? 1 : 0);
  });
  return { placesLeft, unitsToSplit, base, extra, allotments };
}
