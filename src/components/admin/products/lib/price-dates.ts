// price-dates.ts — vigencia de precios en la ficha admin.
//
// "Vigente desde" NO programa precios: POST /products/:id/prices guarda la fila
// de inmediato y, si la fecha es futura, el precio deja de estar vigente HOY
// (el POS lo pinta en $0 y la tienda deja de listar el producto). Los precios a
// futuro se capturan en "Cambios programados". El API usa CURRENT_DATE de
// Postgres; aquí "hoy" es la fecha de México, no la del navegador.

const MEXICO_TZ = 'America/Mexico_City';

export const FUTURE_EFFECTIVE_FROM_MESSAGE =
  '"Vigente desde" no admite fechas futuras. Para programar un precio usa "Cambios programados".';

/** Fecha de hoy en hora de México como YYYY-MM-DD (formato de <input type="date">). */
export function todayInMexico(now: Date = new Date()): string {
  // en-CA formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MEXICO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Error de "Vigente desde" o `null`. Solo se valida cuando el usuario CAMBIÓ la
 * fecha (si no, no viaja y el API conserva la vigente). Las fechas son texto
 * YYYY-MM-DD: la comparación lexicográfica es la cronológica.
 */
export function effectiveFromError(value: string, savedValue: string, today: string): string | null {
  if (!value || value === savedValue) return null;
  return value > today ? FUTURE_EFFECTIVE_FROM_MESSAGE : null;
}
