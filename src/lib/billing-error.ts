// billing-error.ts — Traduce a español los errores de facturación (API + Facturama).
//
// Sin esto el panel solo enseña "Request failed with status code 500": el
// detalle real del PAC (ModelState / Details / Message) viaja en el cuerpo de
// la respuesta y se tiraba. Mismo patrón que `extractStampError` de /admin/pos.

/** Aviso único para los flujos de facturación cerrados en la Fase 0. */
export const BILLING_FLOW_DISABLED_NOTICE =
  'En corrección: hoy solo se factura desde el POS. Este flujo se reabre en la Fase 2 del plan de facturación.';

type AxiosLikeError = {
  message?: unknown;
  response?: { status?: number; data?: unknown };
};

/** Llaves del cuerpo del error donde suele venir el detalle del PAC. */
const DETAIL_KEYS = [
  'details',
  'Details',
  'cause',
  'facturama',
  'description',
  'reason',
  'ModelState',
  'modelState',
  'Message',
];

const GENERIC_MESSAGES = [
  'internal server error',
  'request failed',
  'network error',
  'bad request',
  'service unavailable',
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isGeneric(message: string): boolean {
  const lower = message.trim().toLowerCase();
  return !lower || GENERIC_MESSAGES.some((g) => lower.startsWith(g));
}

/**
 * Aplana texto de estructuras anidadas. Cubre el ModelState de Facturama
 * (`{ "Receiver.Rfc": ["El RFC no es válido"] }`) prefijando el campo.
 */
function flattenText(value: unknown, depth = 0): string[] {
  if (depth > 3) return [];
  if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap((v) => flattenText(v, depth + 1));
  const record = asRecord(value);
  if (!record) return [];
  return Object.entries(record).flatMap(([key, val]) =>
    flattenText(val, depth + 1).map((msg) =>
      msg.toLowerCase().includes(key.toLowerCase()) ? msg : `${key}: ${msg}`,
    ),
  );
}

function withStatus(fallback: string, status?: number): string {
  return status ? `${fallback} (HTTP ${status})` : fallback;
}

/**
 * Mensaje legible de un error de `/billing`. Concatena el `message` del API
 * (string o arreglo de class-validator) con el detalle que devuelva Facturama.
 */
export function billingErrorMessage(err: unknown, fallback: string): string {
  const error = err as AxiosLikeError | null | undefined;
  const status = error?.response?.status;
  const data = error?.response?.data;

  // Algunos proxies devuelven texto plano.
  if (typeof data === 'string' && data.trim()) return data.trim();

  const body = asRecord(data);
  if (!body) {
    const raw = typeof error?.message === 'string' ? error.message : '';
    return isGeneric(raw) ? withStatus(fallback, status) : raw;
  }

  const parts: string[] = [];
  const main = flattenText(body.message).join(', ');
  if (main && !isGeneric(main)) parts.push(main);
  for (const key of DETAIL_KEYS) parts.push(...flattenText(body[key]));

  const unique = Array.from(new Set(parts.filter(Boolean)));
  return unique.length > 0 ? unique.join(' · ') : withStatus(fallback, status);
}

/**
 * true cuando el API responde 503: el flujo de facturación está cerrado a
 * propósito (Fase 0) y la pantalla debe avisarlo en vez de parecer rota.
 */
export function isBillingFlowDisabled(err: unknown): boolean {
  return (err as AxiosLikeError | null | undefined)?.response?.status === 503;
}
