// pdf-font-scale.ts - Tamaño de letra del usuario (Preferencias del admin)
// aplicado a los PDF de jsPDF: tickets de pedidos y ventas, traspasos, etc.
//
// Los generadores fijan cada tamaño con `doc.setFontSize(n)`; en vez de tocar
// las decenas de llamadas, se envuelve ese método para multiplicar por la
// escala. `getLineHeight()` sale del tamaño interno ya escalado, así que el
// interlineado y los saltos de página crecen solos. Las coordenadas fijas (mm)
// no cambian: en un rollo de 80 mm las líneas largas simplemente se envuelven.

import type { jsPDF } from 'jspdf';
import { currentFontScale } from './preferences';

/** Escala a usar: la que pida el llamador o la preferencia vigente del usuario. */
export function resolvePdfFontScale(requested?: number): number {
  if (typeof requested === 'number' && Number.isFinite(requested) && requested > 0) return requested;
  return currentFontScale();
}

/** Hace que todo `setFontSize(n)` del documento use `n * scale`. Con 1 no hace nada. */
export function applyPdfFontScale(doc: jsPDF, scale: number): void {
  if (!(scale > 0) || scale === 1) return;
  const original = doc.setFontSize.bind(doc);
  (doc as unknown as { setFontSize: (size: number) => jsPDF }).setFontSize = (size: number) =>
    original(size * scale);
}
