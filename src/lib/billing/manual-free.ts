// manual-free.ts - Reglas puras de la FACTURA LIBRE SIN TICKET (26-oct-2026):
// parseo de la lista pegada "clave,cantidad", orden de las coincidencias de la
// búsqueda, bloqueos de la captura (antes de pedir la vista previa al API) y
// etiquetas. Sin React ni servicios, para probarse con vitest.

import type { ManualFreeReceiverMode } from '@/types/billing';

export interface BatchLine {
  sku: string;
  quantity: number;
}

export interface ParsedBatch {
  /** Claves en mayúsculas; una clave repetida suma sus cantidades. */
  lines: BatchLine[];
  /** Renglones que no se entendieron (cantidad no numérica o ≤ 0). */
  invalid: string[];
}

// "9019,2" · "9019;2" · "9019<tab>2" (pegado de Excel) · "9019 2" · "9019" (= 1).
const BATCH_ROW = /^([^,;\s]+)\s*(?:[,;]|\s)?\s*(.*)$/;

/** Lista pegada → claves con cantidad. Sirve igual para un solo renglón. */
export function parseBatchLines(text: string): ParsedBatch {
  const byKey = new Map<string, BatchLine>();
  const invalid: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const row = raw.trim();
    if (!row) continue;
    const m = BATCH_ROW.exec(row);
    if (!m) {
      invalid.push(row);
      continue;
    }
    const sku = m[1].toUpperCase();
    const qtyText = m[2].trim();
    let quantity = 1;
    if (qtyText !== '') {
      quantity = Number(qtyText);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        invalid.push(row);
        continue;
      }
    }
    const prev = byKey.get(sku);
    if (prev) prev.quantity += quantity;
    else byKey.set(sku, { sku, quantity });
  }
  return { lines: [...byKey.values()], invalid };
}

/** El cuadro de búsqueda también acepta un renglón "clave,cantidad". */
export function inlineBatchLine(term: string): BatchLine | null {
  if (!/[,;]/.test(term)) return null;
  const parsed = parseBatchLines(term);
  return parsed.lines.length === 1 && parsed.invalid.length === 0 ? parsed.lines[0] : null;
}

/**
 * Coincidencias de la búsqueda en el orden que espera la caja: la clave
 * exacta primero, luego las claves que empiezan igual, luego los nombres y
 * al final el resto (el API devuelve "9019" después de "KI9019", "EP9019"…).
 */
export function sortProductMatches<T extends { code: string; name: string }>(items: readonly T[], term: string): T[] {
  const t = term.trim().toUpperCase();
  const rank = (p: T) => {
    const code = (p.code ?? '').toUpperCase();
    if (code === t) return 0;
    if (code.startsWith(t)) return 1;
    if ((p.name ?? '').toUpperCase().startsWith(t)) return 2;
    return 3;
  };
  return items
    .map((p, i) => ({ p, i, r: rank(p) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.p);
}

export function exactCodeMatch<T extends { code: string }>(items: readonly T[], term: string): T | undefined {
  const t = term.trim().toUpperCase();
  return t ? items.find((p) => (p.code ?? '').toUpperCase() === t) : undefined;
}

export interface FreeLineDraft {
  productId: string;
  code: string;
  name: string;
  /** Texto del input; se valida como número > 0. */
  quantity: string;
  /** Texto del input; vacío = precio de lista. */
  unitPrice: string;
}

export interface FreeOtherReceiver {
  rfc: string;
  name: string;
  taxRegimeCode: string;
  cfdiUseCode: string;
  zipCode: string;
  email: string;
}

export interface FreeDraft {
  branchId: string;
  hasCustomer: boolean;
  lines: readonly FreeLineDraft[];
  receiverMode: ManualFreeReceiverMode;
  other: FreeOtherReceiver;
}

export const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

/** Qué falta del receptor (paso 3). Vacío = receptor completo. */
export function receiverBlockers(receiverMode: ManualFreeReceiverMode, hasCustomer: boolean, other: FreeOtherReceiver): string[] {
  const out: string[] = [];
  if (receiverMode === 'customer' && !hasCustomer) out.push('Elige al distribuidor para usar sus datos fiscales');
  if (receiverMode === 'other') {
    if (!RFC_RE.test(other.rfc.trim().toUpperCase())) out.push('RFC inválido (12 o 13 caracteres)');
    if (other.name.trim().length < 3) out.push('Falta el nombre o razón social');
    if (!other.taxRegimeCode) out.push('Elige el régimen fiscal');
    if (!other.cfdiUseCode) out.push('Elige el uso de CFDI');
    if (!/^\d{5}$/.test(other.zipCode.trim())) out.push('Código postal fiscal de 5 dígitos');
  }
  return out;
}

/**
 * Qué falta para poder pedir la vista previa. Se muestra como lista en el
 * resumen (no como toasts): vacía = la captura está completa.
 */
export function freeDraftBlockers(d: FreeDraft): string[] {
  const out: string[] = [];
  if (!d.branchId) out.push('Elige la sucursal que expide');
  if (d.lines.length === 0) out.push('Agrega al menos un producto');
  for (const l of d.lines) {
    const qty = Number(l.quantity);
    if (l.quantity.trim() === '' || !Number.isFinite(qty) || qty <= 0) out.push(`Cantidad inválida en ${l.code}`);
    const price = l.unitPrice.trim();
    if (price !== '' && (!Number.isFinite(Number(price)) || Number(price) < 0)) out.push(`Precio inválido en ${l.code}`);
  }
  return [...out, ...receiverBlockers(d.receiverMode, d.hasCustomer, d.other)];
}

export const PRICE_TYPE_LABEL: Record<string, string> = {
  distributor: 'distribuidor',
  public: 'público',
  preferred: 'preferente',
  employee: 'empleado',
  wholesale: 'mayorista',
};

export const priceTypeLabel = (code: string) => PRICE_TYPE_LABEL[code] ?? code;

export const CUSTOMER_STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
  pending: 'Pendiente',
  cancelled: 'Cancelado',
};

export const customerStatusLabel = (status: string) => CUSTOMER_STATUS_LABEL[status] ?? status;

export const moneyMx = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(v);
