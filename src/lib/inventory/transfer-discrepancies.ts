// transfer-discrepancies.ts - Aclaración de las diferencias al recibir un
// traspaso (admin › Inventario › Traspasos › detalle). Lógica pura de la
// pantalla: cuánto falta por aclarar, cómo se nombra cada estado y cómo se arma
// lo que se manda al API. Las reglas de verdad (y los candados) viven en el API.
//
// Contexto: las piezas que faltaron al recibir ya salieron del origen y no
// entraron al destino. Después se dice qué pasó: sí llegaron (entran al
// destino), se devolvieron (regresan al origen) o se extraviaron (no entran a
// ningún inventario).

import type {
  ResolveTransferDiscrepanciesPayload,
  ResolveTransferDiscrepancyItem,
  TransferDiscrepancyDto,
  TransferDiscrepancyResolutionDto,
  TransferDiscrepancyResolutionKind,
} from '@/types/inventory';

/** Lo que se elige por producto en el cuadro; `pending` = no tocar. */
export type DiscrepancyChoice = 'pending' | TransferDiscrepancyResolutionKind;

export interface DiscrepancyDraft {
  choice: DiscrepancyChoice;
  /** Texto del campo de cantidad (se valida al armar el envío). */
  quantity: string;
}

export type DiscrepancyDrafts = Record<string, DiscrepancyDraft>;

export const RESOLUTION_KINDS: readonly TransferDiscrepancyResolutionKind[] = [
  'arrived',
  'returned',
  'lost',
];

const hundredths = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

/** 10 · 2.5 · 1,250 (sin ceros de relleno). */
export function formatPieces(value: number): string {
  return (hundredths(value) / 100).toLocaleString('es-MX', {
    maximumFractionDigits: 2,
  });
}

const pieces = (value: number): string =>
  `${formatPieces(value)} pieza${hundredths(value) === 100 ? '' : 's'}`;

/** Piezas que faltaron al recibir (0 en un excedente). */
export function discrepancyMissing(
  d: Pick<TransferDiscrepancyDto, 'quantityExpected' | 'quantityActual'>,
): number {
  return (
    Math.max(hundredths(d.quantityExpected) - hundredths(d.quantityActual), 0) /
    100
  );
}

/**
 * Piezas que siguen sin aclarar. Con un API anterior (sin `pendingQuantity`)
 * es el faltante completo mientras la diferencia siga abierta.
 */
export function discrepancyPending(
  d: Pick<
    TransferDiscrepancyDto,
    'quantityExpected' | 'quantityActual' | 'pendingQuantity' | 'status'
  >,
): number {
  if (typeof d.pendingQuantity === 'number') {
    return Math.max(hundredths(d.pendingQuantity), 0) / 100;
  }
  return d.status === 'resolved' || d.status === 'written_off'
    ? 0
    : discrepancyMissing(d);
}

export function totalPending(
  discrepancies: readonly TransferDiscrepancyDto[] | undefined,
): number {
  return (
    (discrepancies ?? []).reduce(
      (acc, d) => acc + hundredths(discrepancyPending(d)),
      0,
    ) / 100
  );
}

export type DiscrepancyTone = 'warning' | 'success' | 'muted';

export interface DiscrepancyStateInfo {
  label: string;
  tone: DiscrepancyTone;
}

const STATUS_LABEL: Record<string, string> = {
  reported: 'Reportada',
  investigating: 'En investigación',
  resolved: 'Resuelta',
  written_off: 'Dada de baja',
};

/** Cómo se le dice al usuario en qué va una diferencia. */
export function discrepancyStateInfo(
  d: TransferDiscrepancyDto,
): DiscrepancyStateInfo {
  const missing = hundredths(discrepancyMissing(d));
  // Excedentes y demás diferencias sin faltante: no se aclaran por piezas.
  if (missing === 0) {
    return {
      label: STATUS_LABEL[d.status] ?? d.status,
      tone: d.status === 'resolved' ? 'success' : 'warning',
    };
  }
  const pending = hundredths(discrepancyPending(d));
  if (pending >= missing) return { label: 'Por aclarar', tone: 'warning' };
  if (pending > 0) return { label: 'Aclarada en parte', tone: 'warning' };
  if (hundredths(d.lostQuantity ?? 0) >= missing || d.status === 'written_off') {
    return { label: 'Extraviada', tone: 'muted' };
  }
  return { label: 'Aclarada', tone: 'success' };
}

/** "Llegaron 6" · "Regresaron 3 al origen" · "1 extraviada". */
export function resolutionPhrase(
  r: Pick<TransferDiscrepancyResolutionDto, 'resolution' | 'quantity'>,
): string {
  const one = hundredths(r.quantity) === 100;
  const q = formatPieces(r.quantity);
  switch (r.resolution) {
    case 'arrived':
      return one ? 'Llegó 1' : `Llegaron ${q}`;
    case 'returned':
      return one ? 'Regresó 1 al origen' : `Regresaron ${q} al origen`;
    case 'lost':
      return one ? '1 extraviada' : `${q} extraviadas`;
    default:
      return `${q} (${r.resolution})`;
  }
}

export interface ChoiceOption {
  value: DiscrepancyChoice;
  label: string;
  /** Qué le pasa al inventario; `origin`/`destination` se sustituyen. */
  effect: (branches: { origin: string; destination: string }) => string;
}

export const CHOICE_OPTIONS: readonly ChoiceOption[] = [
  {
    value: 'pending',
    label: 'Sigue pendiente',
    effect: () => 'No cambia nada.',
  },
  {
    value: 'arrived',
    label: 'Sí llegó',
    effect: ({ destination }) => `Entra al inventario de ${destination}.`,
  },
  {
    value: 'returned',
    label: 'Se devolvió',
    effect: ({ origin }) => `Regresa al inventario de ${origin}.`,
  },
  {
    value: 'lost',
    label: 'Se extravió',
    effect: () => 'Se da de baja: no entra a ningún inventario.',
  },
];

/** Borrador inicial: todo "sigue pendiente", con la cantidad pendiente lista. */
export function initialDrafts(
  discrepancies: readonly TransferDiscrepancyDto[],
  choice: DiscrepancyChoice = 'pending',
): DiscrepancyDrafts {
  const drafts: DiscrepancyDrafts = {};
  for (const d of discrepancies) {
    const pending = discrepancyPending(d);
    if (pending <= 0) continue;
    drafts[d.id] = { choice, quantity: String(pending) };
  }
  return drafts;
}

/** Único "error" que no es un problema de captura: todavía no se elige nada. */
export const NOTHING_CHOSEN_MESSAGE = 'Elige qué pasó con al menos un producto.';

export interface ResolveDraftResult {
  payload: ResolveTransferDiscrepanciesPayload;
  /** Motivos por los que todavía no se puede confirmar (vacío = listo). */
  errors: string[];
  /** Piezas por destino, para el resumen antes de confirmar. */
  totals: Record<TransferDiscrepancyResolutionKind, number>;
  /** Piezas que seguirán pendientes después de confirmar. */
  remaining: number;
}

/**
 * Arma lo que se manda al API a partir de lo elegido en el cuadro y dice qué
 * falta. Solo viajan los productos con un destino elegido.
 */
export function buildResolvePayload(
  discrepancies: readonly TransferDiscrepancyDto[],
  drafts: DiscrepancyDrafts,
  notes: string,
): ResolveDraftResult {
  const items: ResolveTransferDiscrepancyItem[] = [];
  const errors: string[] = [];
  const totals = { arrived: 0, returned: 0, lost: 0 };
  let remaining = 0;

  for (const d of discrepancies) {
    const pending = hundredths(discrepancyPending(d));
    if (pending <= 0) continue;
    const draft = drafts[d.id];
    if (!draft || draft.choice === 'pending') {
      remaining += pending;
      continue;
    }
    const raw = draft.quantity.trim();
    const value = Number(raw);
    const quantity = hundredths(value);
    if (raw === '' || !Number.isFinite(value) || quantity <= 0) {
      errors.push(`${d.productCode}: escribe cuántas piezas.`);
      remaining += pending;
      continue;
    }
    if (Math.abs(value * 100 - quantity) > 1e-6) {
      errors.push(`${d.productCode}: usa máximo dos decimales.`);
      remaining += pending;
      continue;
    }
    if (quantity > pending) {
      errors.push(
        `${d.productCode}: solo quedan ${formatPieces(pending / 100)} por aclarar.`,
      );
      remaining += pending;
      continue;
    }
    totals[draft.choice] += quantity;
    remaining += pending - quantity;
    items.push({
      discrepancyId: d.id,
      resolution: draft.choice,
      quantity: quantity / 100,
      pendingQuantity: pending / 100,
    });
  }

  const cleanNotes = notes.trim();
  if (totals.lost > 0 && !cleanNotes) {
    errors.push(
      'Escribe qué pasó con lo extraviado (paquetería, guía, a quién se reportó).',
    );
  }
  if (items.length === 0 && errors.length === 0) {
    errors.push(NOTHING_CHOSEN_MESSAGE);
  }

  return {
    payload: cleanNotes ? { items, notes: cleanNotes } : { items },
    errors,
    totals: {
      arrived: totals.arrived / 100,
      returned: totals.returned / 100,
      lost: totals.lost / 100,
    },
    remaining: remaining / 100,
  };
}

/** Renglones del resumen "esto va a pasar" antes de confirmar. */
export function effectLines(
  result: Pick<ResolveDraftResult, 'totals' | 'remaining'>,
  branches: { origin: string; destination: string },
): string[] {
  const lines: string[] = [];
  if (result.totals.arrived > 0) {
    lines.push(
      `${pieces(result.totals.arrived)} ${result.totals.arrived === 1 ? 'entra' : 'entran'} al inventario de ${branches.destination}.`,
    );
  }
  if (result.totals.returned > 0) {
    lines.push(
      `${pieces(result.totals.returned)} ${result.totals.returned === 1 ? 'regresa' : 'regresan'} al inventario de ${branches.origin}.`,
    );
  }
  if (result.totals.lost > 0) {
    lines.push(
      `${pieces(result.totals.lost)} se ${result.totals.lost === 1 ? 'da' : 'dan'} de baja por extravío (no ${result.totals.lost === 1 ? 'entra' : 'entran'} a ningún inventario).`,
    );
  }
  if (lines.length > 0 && result.remaining > 0) {
    lines.push(
      `${pieces(result.remaining)} ${result.remaining === 1 ? 'sigue' : 'siguen'} por aclarar.`,
    );
  }
  return lines;
}

/** Texto del aviso de éxito. */
export function successMessage(
  totals: ResolveDraftResult['totals'],
  branches: { origin: string; destination: string },
): string {
  const parts: string[] = [];
  if (totals.arrived > 0) {
    parts.push(`${pieces(totals.arrived)} a ${branches.destination}`);
  }
  if (totals.returned > 0) {
    parts.push(`${pieces(totals.returned)} de regreso a ${branches.origin}`);
  }
  if (totals.lost > 0) parts.push(`${pieces(totals.lost)} por extravío`);
  return `Diferencias aclaradas: ${parts.join(', ')}.`;
}
