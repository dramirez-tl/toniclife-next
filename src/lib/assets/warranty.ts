// warranty.ts - Estado de garantía y componentes de un activo de TI (un disco
// duro dentro de un NVR, un cargador de una laptop…). Lib PURA, sin React:
// la prueba de paridad (labels.test.ts) la compara contra el API.
//
// Copias literales de toniclife-api/src/modules/it-assets/lib/asset-components.lib.ts:
// WARRANTY_STATUSES, WARRANTY_SOON_DAYS y MAX_PARENT_DEPTH. Si el API cambia
// una, se actualiza aquí y el front a la vez.

import type { BadgeVariant } from '@/types/asset';

export const WARRANTY_STATUSES = ['vigente', 'por_vencer', 'vencida', 'sin_dato'] as const;
export type WarrantyStatus = (typeof WARRANTY_STATUSES)[number];

/** Garantía "por vencer" = vence dentro de estos días (misma cifra que el API). */
export const WARRANTY_SOON_DAYS = 60;
/** Niveles máximos de anidación (equipo → componente → subcomponente). */
export const MAX_PARENT_DEPTH = 3;
/** Vida útil restante crítica: tarjeta del panel y alerta del API. */
export const LIFE_CRITICAL_PCT = 20;

export const WARRANTY_STATUS_LABELS: Record<WarrantyStatus, string> = {
  vigente: 'Vigente',
  por_vencer: 'Por vencer',
  vencida: 'Vencida',
  sin_dato: 'Sin dato',
};

export const WARRANTY_STATUS_VARIANTS: Record<WarrantyStatus, BadgeVariant> = {
  vigente: 'success',
  por_vencer: 'warning',
  vencida: 'destructive',
  sin_dato: 'secondary',
};

/** Código de la categoría de discos (la siembra el SQL del dueño; puede no existir aún). */
export const DISK_CATEGORY_CODE = 'DISCO_DURO';

/**
 * Categoría que se preselecciona al registrar un componente según el equipo
 * padre: un NVR, un servidor o una CPU casi siempre reciben un disco.
 */
export const COMPONENT_DEFAULT_CATEGORY_BY_PARENT: Record<string, string> = {
  DVR: DISK_CATEGORY_CODE,
  SERVIDOR: DISK_CATEGORY_CODE,
  CPU: DISK_CATEGORY_CODE,
};

export function defaultComponentCategoryCode(
  parentCategoryCode: string | null | undefined,
): string | null {
  if (!parentCategoryCode) return null;
  return COMPONENT_DEFAULT_CATEGORY_BY_PARENT[parentCategoryCode.toUpperCase()] ?? null;
}

/**
 * ¿El mensaje del API es de las guardas del vínculo padre ↔ componente?
 * (padre inexistente/de baja, insumo, ciclo, niveles). Esos van bajo el campo
 * "Instalado en", no solo en el toast.
 */
export function isParentLinkError(message: string | null | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes('padre') || m.includes('ciclo') || m.includes('niveles');
}
