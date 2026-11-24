// botnatura-batch.ts - CAPTURA POR LOTE de la factura a Botnatura (Sistemas, 23-nov-2026):
// Contabilidad pega renglones "clave,cantidad" (por ejemplo "1020,100" y "5618,150") en lugar de
// buscar producto por producto. Reglas puras: leer el texto, casar cada clave con el catálogo y
// sumar lo que sí se encontró a la captura. Lo que no se pudo casar se queda a la vista con su
// motivo: nunca se agrega "lo más parecido".
//
// Un renglón con solo la clave (sin coma ni cantidad) vale 1 pieza (Diego, 24-nov-2026: pegan la
// columna de claves y la mayoría es de una pieza); se dice cuántos renglones se tomaron así.
//
// Ojo con las dos líneas: la misma clave existe en la Regular y en la Línea 2 con otro producto y
// otro precio (69 claves al 23-nov-2026). Por eso el lote se resuelve contra la línea que eligió
// quien captura; con "las dos líneas", una clave repetida solo se toma sola cuando una de las dos
// es la única que tiene precio.

import type { BotnaturaLine, BotnaturaProduct } from '@/types/botnatura';
import { BOTNATURA_LINE_LABEL, lineOf, parseAmount, type BotnaturaLineDraft } from './botnatura';

/** Tope de renglones por lote (el mismo que acepta el API en una consulta). */
export const BATCH_MAX_ROWS = 300;

export interface BatchEntry {
  /** Renglón del texto donde apareció por primera vez (desde 1). */
  row: number;
  /** Clave como se tecleó (sin espacios a los lados). */
  code: string;
  quantity: number;
}

export interface BatchParseError {
  row: number;
  /** El renglón tal como se pegó. */
  text: string;
  problem: string;
}

export interface BatchParse {
  entries: BatchEntry[];
  errors: BatchParseError[];
  /** Renglones cuya clave ya venía arriba: su cantidad se sumó a la primera. */
  merged: number;
  /** Renglones que venían solo con la clave: se tomaron como 1 pieza. */
  defaulted: number;
  /** true = el primer renglón era un encabezado ("clave,cantidad") y se ignoró. */
  skippedHeader: boolean;
}

const HEADER_WORDS = /clave|c[oó]digo|code|sku|producto|cantidad|piezas/i;
/** Encabezado de una sola columna (se pegó solo la de claves): la palabra completa, no una clave que la contenga. */
const HEADER_ALONE = /^(clave|c[oó]digo|code|sku|producto)s?$/i;

/**
 * Parte un renglón en clave y cantidad: por tabulador o punto y coma, por la primera coma o, si no
 * hay separador, por espacios. Una clave no lleva espacios: en "1020 1,000" la coma es de los
 * miles de la cantidad, no el separador.
 */
function splitRow(line: string): { code: string; quantity: string } {
  const at = (index: number) => ({ code: line.slice(0, index).trim(), quantity: line.slice(index + 1).trim() });
  const strong = line.search(/[;\t]/);
  if (strong >= 0) return at(strong);
  const comma = line.indexOf(',');
  if (comma >= 0 && !/\s/.test(line.slice(0, comma).trim())) return at(comma);
  const lastSpace = line.search(/\s+\S+$/);
  if (lastSpace < 0) return { code: line.trim(), quantity: '' };
  return { code: line.slice(0, lastSpace).trim(), quantity: line.slice(lastSpace).trim() };
}

/**
 * Lee el texto pegado: un producto por renglón, "clave,cantidad". También acepta punto y coma,
 * tabulador (pegado desde Excel) o espacios. Solo la clave = 1 pieza. Renglones vacíos se ignoran;
 * una clave repetida suma su cantidad a la primera vez que apareció.
 */
export function parseBatch(text: string): BatchParse {
  const entries: BatchEntry[] = [];
  const errors: BatchParseError[] = [];
  const byCode = new Map<string, BatchEntry>();
  let merged = 0;
  let defaulted = 0;
  let skippedHeader = false;
  let seenContent = false;

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const row = index + 1;
    const first = !seenContent;
    seenContent = true;
    const { code, quantity: quantityText } = splitRow(line);
    // Sin cantidad (solo la clave, o "clave,"): una pieza.
    const quantity = quantityText ? parseAmount(quantityText) : 1;

    if (first && (quantityText ? quantity === null && HEADER_WORDS.test(line) : HEADER_ALONE.test(code))) {
      skippedHeader = true;
      return;
    }
    if (!code) {
      errors.push({ row, text: line, problem: 'Falta la clave' });
      return;
    }
    if (!quantityText) defaulted++;
    if (quantity === null || quantity <= 0) {
      errors.push({ row, text: line, problem: 'La cantidad debe ser un número mayor que cero' });
      return;
    }
    const key = code.toLowerCase();
    const existing = byCode.get(key);
    if (existing) {
      existing.quantity = Math.round((existing.quantity + quantity) * 100) / 100;
      merged++;
      return;
    }
    if (entries.length >= BATCH_MAX_ROWS) {
      errors.push({ row, text: line, problem: `Son demasiados renglones: máximo ${BATCH_MAX_ROWS} por lote` });
      return;
    }
    const entry: BatchEntry = { row, code, quantity };
    byCode.set(key, entry);
    entries.push(entry);
  });

  return { entries, errors, merged, defaulted, skippedHeader };
}

/**
 * ok = se encontró y se puede agregar · not_found = la clave no está (o está dada de baja) ·
 * other_line = solo está en la otra línea · ambiguous = está en las dos líneas y no se eligió una.
 */
export type BatchStatus = 'ok' | 'not_found' | 'other_line' | 'ambiguous';

export interface BatchRow extends BatchEntry {
  status: BatchStatus;
  product: BotnaturaProduct | null;
  /** Aviso para quien captura (también en los que sí se agregan: "sin precio", "se tomó la Línea 2"). */
  note: string | null;
}

const hasPrice = (p: BotnaturaProduct): boolean => (p.listPrice ?? 0) > 0 || (p.salePrice ?? 0) > 0;

const NO_PRICE_NOTE = 'No tiene precio en el catálogo: habrá que capturarlo en la factura';

/**
 * Casa cada renglón con el catálogo. `products` es lo que devolvió el API para esas claves (solo
 * activos, de las dos líneas). `line` es la línea elegida; '' = las dos.
 */
export function resolveBatch(
  entries: readonly BatchEntry[],
  products: readonly BotnaturaProduct[],
  line: BotnaturaLine | '',
): BatchRow[] {
  const byCode = new Map<string, BotnaturaProduct[]>();
  for (const product of products) {
    const key = product.code.trim().toLowerCase();
    byCode.set(key, [...(byCode.get(key) ?? []), product]);
  }
  return entries.map((entry) => {
    const candidates = byCode.get(entry.code.toLowerCase()) ?? [];
    const ok = (product: BotnaturaProduct, note: string | null = null): BatchRow => ({
      ...entry,
      status: 'ok',
      product,
      note: note ?? (hasPrice(product) ? null : NO_PRICE_NOTE),
    });
    if (candidates.length === 0) {
      return { ...entry, status: 'not_found', product: null, note: 'No está en el catálogo de Botnatura (o está dada de baja)' };
    }
    if (line) {
      const inLine = candidates.find((p) => lineOf(p) === line);
      if (inLine) return ok(inLine);
      const other = lineOf(candidates[0]);
      return {
        ...entry,
        status: 'other_line',
        product: null,
        note: `No está en la línea ${BOTNATURA_LINE_LABEL[line]}; sí está en ${BOTNATURA_LINE_LABEL[other]}`,
      };
    }
    if (candidates.length === 1) return ok(candidates[0]);
    const priced = candidates.filter(hasPrice);
    if (priced.length === 1) {
      return ok(priced[0], `Está en las dos líneas: se tomó ${BOTNATURA_LINE_LABEL[lineOf(priced[0])]}, la única con precio`);
    }
    return {
      ...entry,
      status: 'ambiguous',
      product: null,
      note: 'Está en las dos líneas: elige arriba Regular o Línea 2',
    };
  });
}

export interface BatchSummary {
  /** Renglones que se pueden agregar. */
  ok: number;
  /** Renglones con problema (no se agregan). */
  problems: number;
  /** Piezas de los renglones que se pueden agregar. */
  pieces: number;
}

export function batchSummary(rows: readonly BatchRow[]): BatchSummary {
  const good = rows.filter((r) => r.status === 'ok');
  return {
    ok: good.length,
    problems: rows.length - good.length,
    pieces: Math.round(good.reduce((sum, r) => sum + r.quantity, 0) * 100) / 100,
  };
}

/**
 * Suma a la captura los renglones del lote que sí se encontraron. Si el producto ya estaba en la
 * factura con el precio general, se le suma la cantidad (igual que al elegirlo en el buscador); si
 * no, entra como concepto nuevo, sin precio propio.
 */
export function addBatchToLines(
  lines: readonly BotnaturaLineDraft[],
  rows: readonly BatchRow[],
): BotnaturaLineDraft[] {
  const next = lines.map((l) => ({ ...l }));
  for (const row of rows) {
    if (row.status !== 'ok' || !row.product) continue;
    const product = row.product;
    const at = next.findIndex((l) => l.product.id === product.id && l.priceMode === null);
    if (at >= 0) {
      const current = parseAmount(next[at].quantity) ?? 0;
      next[at] = { ...next[at], quantity: String(Math.round((current + row.quantity) * 100) / 100) };
    } else {
      next.push({ product, quantity: String(row.quantity), priceMode: null, customPrice: '' });
    }
  }
  return next;
}

/** Los renglones que no se pudieron agregar, otra vez como texto, para corregirlos y volver a revisar. */
export function pendingBatchText(rows: readonly BatchRow[], errors: readonly BatchParseError[] = []): string {
  return [
    ...rows.filter((r) => r.status !== 'ok').map((r) => `${r.code},${r.quantity}`),
    ...errors.map((e) => e.text),
  ].join('\n');
}
