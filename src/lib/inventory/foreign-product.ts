// Claves de otro país en los movimientos de inventario (25-nov-2026).
//
// Una clave se maneja en una sucursal si tiene precio activo en el país de la
// sucursal (México y Frontera cuentan como uno). Las de otro país —p. ej. 6708
// R-TONIC 60 CAPS, con precio solo en Estados Unidos, Colombia y Guatemala— no
// entran a Entradas ni Traspasos; lo que ya quedó capturado solo puede salir
// (Salidas) o bajarse en un conteo. La regla vive en el API
// (inventory/lib/product-country-scope) y responde 400 con este código; aquí
// solo se decide qué texto ve quien captura.

import type { ProductStockDto } from '@/types/inventory';

export const PRODUCT_NOT_IN_BRANCH_COUNTRY = 'PRODUCT_NOT_IN_BRANCH_COUNTRY';

/** Etiqueta en Salidas. */
export const FOREIGN_KEY_EXIT_BADGE = 'Clave de otro país: solo salida';
/** Etiqueta en la hoja de conteo. */
export const FOREIGN_KEY_COUNT_BADGE = 'Clave de otro país: solo se puede bajar';
/** Explicación corta (title de la etiqueta). */
export const FOREIGN_KEY_HELP =
  'No tiene precio en el país de esta sucursal. Aquí solo se le puede dar salida a lo que ya hay; no se le puede dar entrada ni traspasar.';

interface ApiErrorBody {
  code?: unknown;
  message?: unknown;
}

function errorBody(error: unknown): ApiErrorBody | null {
  const data = (error as { response?: { data?: unknown } } | null | undefined)?.response?.data;
  return data && typeof data === 'object' ? (data as ApiErrorBody) : null;
}

function bodyMessage(body: ApiErrorBody | null): string | null {
  const message = body?.message;
  if (Array.isArray(message)) {
    const text = message.filter((m): m is string => typeof m === 'string').join(' ');
    return text.trim() || null;
  }
  return typeof message === 'string' && message.trim() ? message.trim() : null;
}

/** ¿El API rechazó por "clave de otro país"? */
export function isForeignProductError(error: unknown): boolean {
  return errorBody(error)?.code === PRODUCT_NOT_IN_BRANCH_COUNTRY;
}

/** Fallo al buscar una clave para un movimiento. */
export interface ProductLookupFailure {
  sku: string;
  /** true = la clave existe pero es de otro país. */
  foreign: boolean;
  /** Texto para el aviso. */
  message: string;
}

/**
 * Qué decirle a quien tecleó la clave: el motivo del API si es de otro país (dice
 * en qué países sí tiene precio); para lo demás, "Producto no encontrado".
 */
export function toProductLookupFailure(error: unknown, sku: string): ProductLookupFailure {
  if (isForeignProductError(error)) {
    return {
      sku,
      foreign: true,
      message: bodyMessage(errorBody(error)) ?? `La clave ${sku} no se maneja en el país de esta sucursal.`,
    };
  }
  return { sku, foreign: false, message: `Producto no encontrado: ${sku}` };
}

/** Reparte los fallos de una captura por lista: no encontradas y de otro país. */
export function splitLookupFailures(failures: readonly ProductLookupFailure[]): {
  notFound: string[];
  foreign: string[];
} {
  return {
    notFound: failures.filter((f) => !f.foreign).map((f) => f.sku),
    foreign: failures.filter((f) => f.foreign).map((f) => f.sku),
  };
}

/** Aviso de la captura por lista cuando hubo claves de otro país. */
export function foreignBulkMessage(skus: readonly string[]): string {
  return skus.length === 1
    ? `La clave ${skus[0]} es de otro país y no se agregó`
    : `Claves de otro país, no se agregaron: ${skus.join(', ')}`;
}

/** ¿El renglón de existencias es de una clave de otro país? */
export function isForeignStockRow(row: Pick<ProductStockDto, 'foreignToBranch'>): boolean {
  return row.foreignToBranch === true;
}

/** Tope de la "cantidad real" de un conteo: una clave de otro país nunca sube. */
export function countUpperLimit(foreign: boolean | undefined, systemQuantity: number): number | undefined {
  if (!foreign) return undefined;
  return Math.max(0, Number(systemQuantity) || 0);
}

/** Cantidad real que se acepta al capturar el conteo (nunca negativa). */
export function clampCountQuantity(
  value: number,
  foreign: boolean | undefined,
  systemQuantity: number,
): number {
  const clean = Math.max(0, Number.isFinite(value) ? value : 0);
  const limit = countUpperLimit(foreign, systemQuantity);
  return limit === undefined ? clean : Math.min(clean, limit);
}
