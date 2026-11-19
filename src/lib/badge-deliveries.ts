// lib/badge-deliveries.ts - Lectura de las entregas de credenciales para el expediente.
//
// Las entregas se registran con la app Tonic Life al escanear la credencial, en
// dos etapas: Sistemas la entrega a RRHH (`hr`) y RRHH al colaborador
// (`employee`). Aquí solo se LEEN (GET /hr/badges/deliveries?employeeId=) para
// pintarlas en la pestaña Gafete del expediente. Funciones puras: sin React.

import type { BadgeDelivery, BadgeStage } from '@/types/hr';

const TZ = 'America/Mexico_City';

export const BADGE_STAGE_LABELS: Record<BadgeStage, string> = {
  hr: 'Entregada a RRHH',
  employee: 'Entregada al colaborador',
};

/**
 * Dónde está la credencial:
 *  - `none`: no hay entregas vigentes registradas;
 *  - `in_hr`: Sistemas ya la entregó a RRHH y falta entregarla al colaborador
 *    (también cuando hay una REPOSICIÓN en RRHH posterior a la última entrega);
 *  - `delivered`: el colaborador ya la tiene.
 */
export type BadgeDeliveryState = 'none' | 'in_hr' | 'delivered';

export interface BadgeDeliveryStatus {
  state: BadgeDeliveryState;
  /** Entrega vigente más reciente de Sistemas a RRHH. */
  handoff: BadgeDelivery | null;
  /** Entrega vigente más reciente al colaborador. */
  delivery: BadgeDelivery | null;
  /** Entregas vigentes a RRHH. */
  handedCount: number;
  /** Entregas vigentes al colaborador (> 1 = hubo reposiciones). */
  deliveredCount: number;
  /** Registros anulados (se conservan en el historial, tachados). */
  voidedCount: number;
}

export const BADGE_STATE_LABELS: Record<BadgeDeliveryState, string> = {
  none: 'Sin entregas registradas',
  in_hr: 'En RRHH, falta entregarla al colaborador',
  delivered: 'Entregada al colaborador',
};

function time(value: string | null | undefined): number {
  const t = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(t) ? t : 0;
}

/** La más reciente de una etapa, sin contar las anuladas. */
function latest(rows: BadgeDelivery[], stage: BadgeStage): BadgeDelivery | null {
  let best: BadgeDelivery | null = null;
  for (const row of rows) {
    if (row.stage !== stage || row.voidedAt) continue;
    if (!best || time(row.deliveredAt) > time(best.deliveredAt)) best = row;
  }
  return best;
}

/** Resume el historial de un expediente (en cualquier orden) en su estado actual. */
export function badgeDeliveryStatus(rows: BadgeDelivery[]): BadgeDeliveryStatus {
  const valid = rows.filter((r) => !r.voidedAt);
  const handoff = latest(rows, 'hr');
  const delivery = latest(rows, 'employee');
  let state: BadgeDeliveryState = 'none';
  if (delivery && (!handoff || time(delivery.deliveredAt) >= time(handoff.deliveredAt))) {
    state = 'delivered';
  } else if (handoff) {
    state = 'in_hr';
  }
  return {
    state,
    handoff,
    delivery,
    handedCount: valid.filter((r) => r.stage === 'hr').length,
    deliveredCount: valid.filter((r) => r.stage === 'employee').length,
    voidedCount: rows.length - valid.length,
  };
}

/** Historial para la tabla: lo más reciente arriba. */
export function sortBadgeDeliveries(rows: BadgeDelivery[]): BadgeDelivery[] {
  return [...rows].sort((a, b) => time(b.deliveredAt) - time(a.deliveredAt));
}

/**
 * Quién recibió. En la entrega a RRHH la app guarda el nombre de quien recibe;
 * en la entrega al colaborador no se captura porque recibe el propio colaborador.
 */
export function badgeReceiverLabel(row: Pick<BadgeDelivery, 'stage' | 'receivedByName'>): string {
  const name = row.receivedByName?.trim();
  if (name) return name;
  return row.stage === 'employee' ? 'El colaborador' : '—';
}

/** Notas del renglón: lo que se anotó al entregar y, si se anuló, cuándo y por qué. */
export function badgeDeliveryNotes(
  row: Pick<BadgeDelivery, 'notes' | 'voidedAt' | 'voidReason'>,
): string | null {
  const parts: string[] = [];
  const notes = row.notes?.trim();
  if (notes) parts.push(notes);
  if (row.voidedAt) {
    const reason = row.voidReason?.trim();
    parts.push(
      `Anulada el ${formatBadgeDateTime(row.voidedAt)}${reason ? `: ${reason}` : ''}`,
    );
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** "10 nov 2026, 10:44 a.m." en hora Centro (la app registra en UTC). */
export function formatBadgeDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-MX', {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** "1 vez" / "3 veces" (impresiones registradas de la credencial). */
export function timesLabel(count: number | null | undefined): string {
  const n = Math.max(0, Math.trunc(Number(count ?? 0)) || 0);
  return `${n} ${n === 1 ? 'vez' : 'veces'}`;
}
