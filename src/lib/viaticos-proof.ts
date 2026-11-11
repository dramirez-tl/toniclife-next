// viaticos-proof.ts - Cuentas de la comprobación de un viático (lógica pura).
//
// La comprobación funciona como una caja chica: lo AUTORIZADO es el fondo, cada
// gasto de la solicitud lleva lo que de verdad se gastó (captura manual) con
// sus recibos y facturas, y autorizado − gastado = SOBRANTE (se devuelve con
// ficha) o, si sale negativo, lo que se gastó de más.

import type { ViaticoFile, ViaticoFileKind, ViaticoItem } from '@/types/viaticos';

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Gasto con id (el API con mig 199 lo trae siempre). */
export type ProofItem = ViaticoItem & { id: string };

export interface ProofDay {
  /** YYYY-MM-DD */
  date: string;
  items: ProofItem[];
  requested: number;
}

/** Gastos agrupados por día, en orden; dentro del día, por nombre del concepto. */
export function groupItemsByDay(items: ViaticoItem[]): ProofDay[] {
  const byDay = new Map<string, ProofItem[]>();
  for (const it of items) {
    if (!it.id) continue;
    const list = byDay.get(it.date) ?? [];
    list.push(it as ProofItem);
    byDay.set(it.date, list);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({
      date,
      items: list.sort((a, b) => a.conceptLabel.localeCompare(b.conceptLabel, 'es')),
      requested: round2(list.reduce((s, it) => s + it.amount, 0)),
    }));
}

/** Archivos de un gasto (por tipo). */
export function filesOfItem(files: ViaticoFile[], itemId: string, kind: ViaticoFileKind): ViaticoFile[] {
  return files.filter((f) => f.itemId === itemId && f.kind === kind);
}

/** Comprobantes generales: recibos o facturas que no están en un gasto. */
export function generalFiles(files: ViaticoFile[], kind: ViaticoFileKind): ViaticoFile[] {
  return files.filter((f) => !f.itemId && f.kind === kind);
}

/** "1,250.5" → 1250.5; vacío o inválido → null (sin capturar). */
export function parseAmount(raw: string | null | undefined): number | null {
  const clean = (raw ?? '').replace(/,/g, '').trim();
  if (clean === '') return null;
  const n = Number(clean);
  return Number.isFinite(n) && n >= 0 ? round2(n) : null;
}

export interface ProofTotals {
  authorized: number;
  /** Suma de lo gastado capturado por gasto. */
  spentItems: number;
  /** Gastos no previstos. */
  extra: number;
  /** Total comprobado = gastado por gasto + no previstos. */
  total: number;
  /** Autorizado − total: + sobrante (se devuelve), − gastó de más. */
  balance: number;
  itemsCount: number;
  /** Gastos con al menos un recibo o una factura. */
  itemsWithProof: number;
  /** Gastos sin lo gastado capturado. */
  itemsWithoutAmount: number;
  /** Gastos con monto > 0 y sin ningún comprobante. */
  itemsSpentWithoutProof: number;
}

/**
 * Cuentas en vivo. `spentOf` regresa lo gastado de cada gasto (lo tecleado en
 * pantalla o lo guardado); null = sin capturar.
 */
export function proofTotals(params: {
  authorized: number;
  items: ProofItem[];
  files: ViaticoFile[];
  spentOf: (item: ProofItem) => number | null;
  extra: number | null;
}): ProofTotals {
  const { authorized, items, files, spentOf } = params;
  const withProof = new Set(
    files.filter((f) => f.itemId && (f.kind === 'receipt' || f.kind === 'invoice')).map((f) => f.itemId as string),
  );
  let spentItems = 0;
  let itemsWithoutAmount = 0;
  let itemsSpentWithoutProof = 0;
  for (const it of items) {
    const spent = spentOf(it);
    if (spent == null) {
      itemsWithoutAmount += 1;
      continue;
    }
    spentItems += spent;
    if (spent > 0 && !withProof.has(it.id)) itemsSpentWithoutProof += 1;
  }
  const extra = params.extra ?? 0;
  const total = round2(spentItems + extra);
  return {
    authorized,
    spentItems: round2(spentItems),
    extra,
    total,
    balance: round2(authorized - total),
    itemsCount: items.length,
    itemsWithProof: items.filter((it) => withProof.has(it.id)).length,
    itemsWithoutAmount,
    itemsSpentWithoutProof,
  };
}

/**
 * Avisos antes de enviar (no bloquean: hay gastos sin ticket y Contabilidad
 * puede regresar la comprobación). Vacío = todo en orden.
 */
export function submitWarnings(t: ProofTotals, refundFiles: number, money: (n: number) => string): string[] {
  const out: string[] = [];
  if (t.itemsWithoutAmount > 0) {
    out.push(
      t.itemsWithoutAmount === 1
        ? '1 gasto no tiene capturado lo gastado (contará como $0).'
        : `${t.itemsWithoutAmount} gastos no tienen capturado lo gastado (contarán como $0).`,
    );
  }
  if (t.itemsSpentWithoutProof > 0) {
    out.push(
      t.itemsSpentWithoutProof === 1
        ? '1 gasto no tiene recibo ni factura.'
        : `${t.itemsSpentWithoutProof} gastos no tienen recibo ni factura.`,
    );
  }
  if (t.balance > 0 && refundFiles === 0) {
    out.push(`Te sobran ${money(t.balance)} y no subiste la ficha de devolución.`);
  }
  return out;
}
