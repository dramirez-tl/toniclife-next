// route-texts.ts — Textos de la pantalla "Almacenes y envíos" que prometen algo
// al administrador (lógica PURA). Viven aquí para que la promesa se pruebe:
// cuánto tarda en aplicarse un cambio, qué hace el orden de la lista según el
// modo y qué avisa el guardado.

import type { FulfillmentAppliedChange, FulfillmentStockMode } from '@/types/fulfillment';

/**
 * Cuánto tarda en verse un cambio. El pedido (checkout) lee las rutas al
 * momento y el carrito las cachea 30 s; el CATÁLOGO de la tienda se sirve con
 * caché de minutos (Next `revalidate: 120` + caché del API), así que no se
 * promete "menos de un minuto" para todo.
 */
export const PROPAGATION_NOTE =
  'El pedido y el carrito aplican en menos de un minuto; el catálogo de la tienda puede tardar unos minutos en reflejarlo.';

export const SAVED_TOAST_TITLE = 'Cambios guardados.';
export const SAVE_SUMMARY_DESCRIPTION = `Esto es lo que va a cambiar. ${PROPAGATION_NOTE}`;

/** Cierre del aviso "cambia lo que ven los clientes en su carrito". */
export const GAINING_STOCK_NOTE =
  'Hoy, como ese país no tiene almacén, su carrito muestra todo como disponible. Al guardar, lo que no tenga existencias en ese almacén les aparecerá como agotado en su carrito, en menos de un minuto. Si el país tiene tienda propia, su catálogo puede tardar unos minutos en reflejarlo.';

/** Subtítulo de la pantalla: qué hace el ORDEN de la lista según el modo (null = aún no se sabe). */
export function routingSubtitle(stockMode: FulfillmentStockMode | null | undefined): string {
  const intro = 'Elige qué almacén surte los pedidos con envío a domicilio de cada país.';
  if (stockMode === 'first_active') {
    return `${intro} Si un país tiene varios almacenes, se usa siempre el primero de la lista; los respaldos solo entran si el principal está en pausa o desactivado.`;
  }
  if (stockMode === 'full_order') {
    return `${intro} Si un país tiene varios almacenes, se usa el primero de la lista que pueda surtir el pedido completo.`;
  }
  return `${intro} Si un país tiene varios almacenes, el orden de la lista decide cuál surte.`;
}

/**
 * "Nadie podrá pedir…": las rutas solo gobiernan el envío a domicilio de la
 * TIENDA EN LÍNEA. El kit de inscripción y el carrito compartido salen de la
 * sucursal del distribuidor y no dependen de ellas.
 */
export function noOnlineShippingText(where: string, until: string): string {
  return `Nadie podrá pedir en la tienda en línea con envío a domicilio ${where} hasta que ${until}. El kit de inscripción y el carrito compartido no dependen de estas rutas.`;
}

export type AppliedNoticeKind = NonNullable<FulfillmentAppliedChange['notice']>;

export interface AppliedNoticeMessage {
  notice: AppliedNoticeKind;
  message: string;
}

const label = (c: Pick<FulfillmentAppliedChange, 'branchCode' | 'branchName'>) =>
  [c.branchCode, c.branchName].filter(Boolean).join(' · ');

/**
 * Avisos informativos de un guardado (`applied[].notice`), uno por tipo:
 *  · paused_branch_inactive — el API dejó la ruta EN PAUSA porque su sucursal está desactivada;
 *  · cross_country_blocked — quedó configurada, pero todavía no surte pedidos.
 * Un `notice` desconocido (API más nuevo) se ignora.
 */
export function appliedNoticeMessages(
  applied: FulfillmentAppliedChange[] | null | undefined,
  countryNames: Record<string, string> = {},
): AppliedNoticeMessage[] {
  const out: AppliedNoticeMessage[] = [];
  const list = applied ?? [];

  const paused = list.filter((a) => a.notice === 'paused_branch_inactive');
  if (paused.length > 0) {
    const names = paused.map((a) => `${label(a)} → ${countryNames[a.countryCode] ?? a.countryCode}`).join('; ');
    out.push({
      notice: 'paused_branch_inactive',
      message:
        paused.length === 1
          ? `${names} quedó en pausa porque esa sucursal está desactivada. Actívala en Sucursales y después quítale la pausa aquí.`
          : `Estas rutas quedaron en pausa porque su sucursal está desactivada: ${names}. Actívalas en Sucursales y después quítales la pausa aquí.`,
    });
  }

  if (list.some((a) => a.notice === 'cross_country_blocked')) {
    out.push({
      notice: 'cross_country_blocked',
      message: 'Una ruta entre países quedó configurada, pero todavía no surte pedidos.',
    });
  }
  return out;
}
