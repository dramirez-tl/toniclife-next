// Personalización de una línea: el texto que el cliente quiere estampado en la
// prenda (playeras, API mig 179, 30-oct-2026). Lib PURA, espejo de
// `cart/lib/personalization.lib.ts` del API: misma limpieza (recorta, colapsa
// espacios, sin saltos de línea) y mismo conteo (caracteres VISIBLES: un emoji o
// un acento compuesto cuentan uno; no bytes ni unidades UTF-16). El tope real lo
// fija cada producto (`product.personalization.maxLength`).

/** Tope absoluto de la columna del API (varchar(60)). */
export const PERSONALIZATION_HARD_MAX = 60;

/** Limpia el texto; vacío (o no texto) = null = sin personalización. */
export function normalizePersonalization(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text === '' ? null : text;
}

/** Caracteres visibles del texto (code points en NFC). */
export function personalizationLength(text: string): number {
  return Array.from(text.normalize('NFC')).length;
}

/** Recorta a `maxLength` caracteres visibles (nunca parte un emoji); sin tope válido no recorta. */
export function clampPersonalization(text: string, maxLength: number): string {
  if (!Number.isFinite(maxLength) || maxLength < 0) return text;
  const chars = Array.from(text.normalize('NFC'));
  return chars.length <= maxLength ? text : chars.slice(0, Math.trunc(maxLength)).join('');
}

/** Tope del producto: entero 1..60 (se topa al de la columna); otra cosa = no se personaliza. */
export function personalizationLimit(maxLength: unknown): number | null {
  const n =
    typeof maxLength === 'number'
      ? maxLength
      : typeof maxLength === 'string' && maxLength.trim()
        ? Number(maxLength)
        : Number.NaN;
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(Math.trunc(n), PERSONALIZATION_HARD_MAX);
}

/** Texto de personalización de una línea del API (carrito, pedido, confirmación); null si no trae. */
export function personalizationOf(line: unknown): string | null {
  if (typeof line !== 'object' || line === null) return null;
  return normalizePersonalization((line as { personalization?: unknown }).personalization);
}

/** Misma personalización = misma línea del carrito (vacío, null y ausente son lo mismo). */
export function samePersonalization(a: unknown, b: unknown): boolean {
  return normalizePersonalization(a) === normalizePersonalization(b);
}
