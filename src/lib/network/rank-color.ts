// rank-color.ts — Color del chip de rango por `rankNumber` (contrato
// /distribuidor/red V14). Antes la página coloreaba por NOMBRE ('Diamante
// Doble') y en BD el nombre es 'Doble Diamante': todo caía al color por
// defecto. `rankNumber` viene de mlm_ranks.rank_number (1 distribuidor …
// 10 Diamante Azul) y es estable entre idiomas. Lógica pura: sin React.

/** Clases Tailwind (fondo + texto) por rank_number; fuera de tabla ⇒ RANK_NONE_CLASS. */
const RANK_TONES: Record<number, string> = {
  1: 'bg-emerald-50 text-emerald-700', // Distribuidor
  2: 'bg-orange-50 text-orange-700', // Bronce
  3: 'bg-gray-100 text-gray-700', // Plata
  4: 'bg-yellow-50 text-yellow-700', // Oro
  5: 'bg-purple-50 text-purple-700', // Platino
  6: 'bg-blue-50 text-blue-700', // Diamante
  7: 'bg-sky-50 text-sky-700', // Doble Diamante
  8: 'bg-indigo-50 text-indigo-700', // Triple Diamante
  9: 'bg-violet-50 text-violet-700', // Diamante Sirius
  10: 'bg-blue-100 text-blue-900', // Diamante Azul
};

/** Sin rango en el periodo (sin fila en customer_period_stats) o número desconocido. */
export const RANK_NONE_CLASS = 'bg-gray-100 text-gray-500';

export function rankColorByNumber(rankNumber: number | null | undefined): string {
  if (typeof rankNumber !== 'number' || !Number.isInteger(rankNumber)) return RANK_NONE_CLASS;
  return RANK_TONES[rankNumber] ?? RANK_NONE_CLASS;
}

/** Iniciales para el avatar ("Ana María López" ⇒ "AM"); vacío ⇒ "?". */
export function initialsOf(fullName: string | null | undefined): string {
  const parts = (fullName ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}
