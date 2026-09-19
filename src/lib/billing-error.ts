// billing-error.ts — Traduce a español los errores de facturación (API + Facturama).
//
// Sin esto el panel solo enseña "Request failed with status code 500": el
// detalle real del PAC (ModelState / Details / Message) viaja en el cuerpo de
// la respuesta y se tiraba. Mismo patrón que `extractStampError` de /admin/pos.
//
// Fase 2: todo `/billing` responde el cuerpo uniforme
// `{ statusCode, code, message, field?, details?, providerCode?, invoiceId? }`
// (contrato §3.9 / §4). El front lee `code` para DECIDIR y `message` para el
// texto; `field` y `providerCode` se añaden al mensaje cuando vienen.

import type { BillingErrorBody } from '@/types/billing';

/** Aviso único para los flujos de facturación cerrados (gate `billing.v2_flows_enabled`). */
export const BILLING_FLOW_DISABLED_NOTICE =
  'Los flujos de v2 están cerrados; el sistema anterior sigue facturando. Sistemas los abre con el ajuste billing.v2_flows_enabled.';

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

/**
 * Nombre legible del campo que rechazó el PAC o el validador (`field` del
 * cuerpo uniforme). Las llaves son las del JSON de Facturama (§3.9) y las de
 * `CfdiDocument`; lo que no esté aquí se muestra tal cual.
 */
export const BILLING_FIELD_LABELS: Record<string, string> = {
  'Receiver.Rfc': 'RFC del receptor',
  'Receiver.Name': 'Razón social del receptor',
  'Receiver.TaxZipCode': 'CP fiscal del receptor',
  'Receiver.FiscalRegime': 'Régimen fiscal del receptor',
  'Receiver.CfdiUse': 'Uso de CFDI',
  ExpeditionPlace: 'Lugar de expedición',
  Date: 'Fecha del comprobante',
  PaymentForm: 'Forma de pago',
  PaymentMethod: 'Método de pago',
  'receiver.rfc': 'RFC del receptor',
  'receiver.name': 'Razón social del receptor',
  'receiver.zipCode': 'CP fiscal del receptor',
  'receiver.taxRegimeCode': 'Régimen fiscal del receptor',
  'receiver.cfdiUseCode': 'Uso de CFDI',
  expeditionPlace: 'Lugar de expedición',
  localDateTime: 'Fecha del comprobante',
  paymentForm: 'Forma de pago',
  paymentMethod: 'Método de pago',
  items: 'Conceptos',
  totals: 'Totales',
  payment: 'Complemento de pago',
  relations: 'CFDI relacionados',
};

/** Campos del receptor: el error se corrige en Datos fiscales del cliente. */
const RECEIVER_FIELD_PREFIXES = ['Receiver.', 'receiver.'];

const RECEIVER_ERROR_CODES = new Set([
  'CFDI_RECEIVER_RFC_INVALID',
  'CFDI_RECEIVER_NAME_MISSING',
  'CFDI_RECEIVER_REGIME_INVALID',
  'CFDI_RECEIVER_USE_INCOMPATIBLE',
  'CFDI_RECEIVER_ZIP_INVALID',
]);

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
  if (typeof value === 'number') return [String(value)];
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
 * Cuerpo uniforme del error de `/billing`, o null si la respuesta no lo trae
 * (proxy, red, contrato viejo). `message` puede llegar como arreglo de
 * class-validator: se une en una sola línea.
 */
export function billingErrorBody(err: unknown): BillingErrorBody | null {
  const error = err as AxiosLikeError | null | undefined;
  const body = asRecord(error?.response?.data);
  if (!body || typeof body.code !== 'string') return null;
  const message = flattenText(body.message).join(', ');
  return {
    statusCode:
      typeof body.statusCode === 'number' ? body.statusCode : (error?.response?.status ?? 0),
    code: body.code,
    message,
    field: typeof body.field === 'string' ? body.field : undefined,
    details: body.details,
    providerCode: typeof body.providerCode === 'string' ? body.providerCode : null,
    invoiceId: typeof body.invoiceId === 'string' ? body.invoiceId : undefined,
  };
}

/** `code` del cuerpo uniforme (`CFDI_*`, `BILLING_*`...), o null. */
export function billingErrorCode(err: unknown): string | null {
  return billingErrorBody(err)?.code ?? null;
}

export function isBillingErrorCode(err: unknown, ...codes: string[]): boolean {
  const code = billingErrorCode(err);
  return code !== null && codes.includes(code);
}

/** Etiqueta en español del `field` del error (o el campo crudo). */
export function billingFieldLabel(field: string | null | undefined): string | null {
  if (!field) return null;
  return BILLING_FIELD_LABELS[field] ?? field;
}

/**
 * true cuando el error apunta a los datos fiscales del receptor: la pantalla
 * ofrece "Corregir datos fiscales" (abre `CustomerFiscalDialog`).
 */
export function isReceiverBillingError(err: unknown): boolean {
  const body = billingErrorBody(err);
  if (!body) return false;
  if (RECEIVER_ERROR_CODES.has(body.code)) return true;
  return !!body.field && RECEIVER_FIELD_PREFIXES.some((p) => body.field!.startsWith(p));
}

/**
 * Detalle del error como lista de líneas legibles (por ejemplo
 * `details: [{ sku, name, lineNumber }]` de `CFDI_TAX_UNRESOLVED`).
 */
export function billingErrorDetails(err: unknown): string[] {
  const body = billingErrorBody(err);
  if (!body || body.details === undefined || body.details === null) return [];
  if (Array.isArray(body.details)) {
    return body.details.map((d) => {
      const rec = asRecord(d);
      if (!rec) return String(d);
      return Object.entries(rec)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join(', ');
    });
  }
  return flattenText(body.details);
}

/**
 * Mensaje legible de un error de `/billing`. Con el cuerpo uniforme arma
 * `message` + campo + código del PAC + detalle; con el contrato anterior
 * concatena el `message` del API (string o arreglo) con lo que devuelva
 * Facturama.
 */
export function billingErrorMessage(err: unknown, fallback: string): string {
  const error = err as AxiosLikeError | null | undefined;
  const status = error?.response?.status;
  const data = error?.response?.data;

  const uniform = billingErrorBody(err);
  if (uniform) {
    const parts: string[] = [];
    const main = uniform.message && !isGeneric(uniform.message) ? uniform.message : '';
    parts.push(main || withStatus(fallback, uniform.statusCode || status));
    const field = billingFieldLabel(uniform.field);
    if (field && !parts[0].toLowerCase().includes(field.toLowerCase())) {
      parts.push(`Campo: ${field}`);
    }
    if (uniform.providerCode) parts.push(`Código PAC ${uniform.providerCode}`);
    const details = billingErrorDetails(err);
    if (details.length > 0) parts.push(details.slice(0, 5).join(' · '));
    return parts.join(' · ');
  }

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
 * true cuando el flujo de facturación está cerrado a propósito (gate
 * `billing.v2_flows_enabled`: 503 `BILLING_V2_DISABLED`) y la pantalla debe
 * avisarlo en vez de parecer rota.
 */
export function isBillingFlowDisabled(err: unknown): boolean {
  if (isBillingErrorCode(err, 'BILLING_V2_DISABLED')) return true;
  const status = (err as AxiosLikeError | null | undefined)?.response?.status;
  return status === 503 && billingErrorCode(err) === null;
}

/**
 * Id de la factura GLOBAL viva que contiene al ticket (`CFDI_IN_GLOBAL`). Al
 * retimbrar, el API relanza el error con `invoiceId` = la propia nominativa y
 * deja la global en `details.globalInvoiceId`: por eso se lee primero el detalle.
 */
export function billingErrorGlobalInvoiceId(err: unknown): string | null {
  const body = billingErrorBody(err);
  if (!body) return null;
  const fromDetails = asRecord(body.details)?.globalInvoiceId;
  if (typeof fromDetails === 'string' && fromDetails) return fromDetails;
  return billingErrorInvoiceId(err);
}

/**
 * `invoiceId` que acompaña a un error de facturación (`CFDI_ALREADY_LIVE`, el
 * intento que quedó en `error`…) para ofrecer "Ver factura" / "Ver intento".
 * Para la global de un `CFDI_IN_GLOBAL` usa `billingErrorGlobalInvoiceId`.
 */
export function billingErrorInvoiceId(err: unknown): string | null {
  const body = billingErrorBody(err);
  if (!body) return null;
  if (body.invoiceId) return body.invoiceId;
  const details = asRecord(body.details);
  const fromDetails = details?.invoiceId ?? details?.globalInvoiceId;
  return typeof fromDetails === 'string' ? fromDetails : null;
}
