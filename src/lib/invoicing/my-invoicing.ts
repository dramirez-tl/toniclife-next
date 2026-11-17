// my-invoicing.ts - Lógica pura de "Mis facturas" (portal del distribuidor, 17-nov-2026):
// el formulario de datos fiscales y cómo se pinta cada compra. Las reglas de fondo (qué
// pedido se puede facturar, RFC ante el SAT, uso compatible con el régimen) las decide el
// servidor; aquí solo se evita mandar algo que de entrada está incompleto.

import type {
  MyFiscalData,
  MyInvoiceOrder,
  SatCatalogOption,
  SaveMyFiscalDataPayload,
  SelfInvoiceStatus,
} from '@/types/customer-invoicing';

export interface FiscalForm {
  rfc: string;
  legalName: string;
  taxRegime: string;
  cfdiUse: string;
  postalCode: string;
  email: string;
}

export type FiscalField = keyof FiscalForm;

/** Clave del mensaje (distributor.invoices.errors.*). */
export type FiscalFieldError =
  | 'rfcRequired'
  | 'rfcInvalid'
  | 'legalNameRequired'
  | 'regimeRequired'
  | 'cfdiUseRequired'
  | 'postalCodeInvalid'
  | 'emailInvalid';

export const EMPTY_FISCAL_FORM: FiscalForm = {
  rfc: '',
  legalName: '',
  taxRegime: '',
  cfdiUse: '',
  postalCode: '',
  email: '',
};

export function fiscalFormFrom(data: MyFiscalData | null | undefined): FiscalForm {
  return {
    rfc: normalizeRfcInput(data?.rfc ?? ''),
    legalName: (data?.legalName ?? '').trim(),
    taxRegime: (data?.taxRegime ?? '').trim(),
    cfdiUse: (data?.cfdiUse ?? '').trim().toUpperCase(),
    postalCode: (data?.postalCode ?? '').trim(),
    email: (data?.email ?? '').trim(),
  };
}

/** RFC como se captura: mayúsculas, sin espacios ni guiones, 13 caracteres como máximo. */
export function normalizeRfcInput(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-ZÑ&0-9]/g, '')
    .slice(0, 13);
}

const RFC_FISICA = /^[A-ZÑ&]{4}[0-9]{6}[A-Z0-9]{3}$/;
const RFC_MORAL = /^[A-ZÑ&]{3}[0-9]{6}[A-Z0-9]{3}$/;

export type PersonType = 'fisica' | 'moral';

/** Persona física (13) o moral (12) según el RFC; null mientras no esté completo. */
export function personTypeOfRfc(rfc: string): PersonType | null {
  const value = normalizeRfcInput(rfc);
  if (RFC_FISICA.test(value)) return 'fisica';
  if (RFC_MORAL.test(value)) return 'moral';
  return null;
}

/**
 * Regímenes que aplican al tipo de persona del RFC. Con el RFC incompleto se ofrecen todos;
 * el régimen ya guardado nunca se esconde (se vería como "sin elegir").
 */
export function regimesForRfc(
  regimes: SatCatalogOption[],
  rfc: string,
  keepCode = '',
): SatCatalogOption[] {
  const type = personTypeOfRfc(rfc);
  if (!type) return regimes;
  return regimes.filter((r) => {
    if (r.code === keepCode) return true;
    const applies = type === 'fisica' ? r.appliesToFisica : r.appliesToMoral;
    // Un catálogo sin la marca no se filtra.
    return applies !== false;
  });
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Lo que falta o está mal escrito, por campo. Objeto vacío = se puede guardar. */
export function validateFiscalForm(
  form: FiscalForm,
): Partial<Record<FiscalField, FiscalFieldError>> {
  const errors: Partial<Record<FiscalField, FiscalFieldError>> = {};
  const rfc = normalizeRfcInput(form.rfc);
  if (!rfc) errors.rfc = 'rfcRequired';
  else if (!personTypeOfRfc(rfc)) errors.rfc = 'rfcInvalid';
  if (!form.legalName.trim()) errors.legalName = 'legalNameRequired';
  if (!/^[0-9]{3}$/.test(form.taxRegime.trim())) errors.taxRegime = 'regimeRequired';
  if (!form.cfdiUse.trim()) errors.cfdiUse = 'cfdiUseRequired';
  if (!/^[0-9]{5}$/.test(form.postalCode.trim())) errors.postalCode = 'postalCodeInvalid';
  const email = form.email.trim();
  if (email && !EMAIL.test(email)) errors.email = 'emailInvalid';
  return errors;
}

/** ¿El formulario difiere de lo guardado? */
export function fiscalFormDirty(
  form: FiscalForm,
  saved: MyFiscalData | null | undefined,
): boolean {
  const base = fiscalFormFrom(saved);
  const now = fiscalFormFrom(form);
  return (Object.keys(base) as FiscalField[]).some(
    (key) => base[key].toUpperCase() !== now[key].toUpperCase(),
  );
}

/** Cuerpo de PUT /distributor/invoicing/fiscal-data. El correo vacío no se manda. */
export function toFiscalPayload(form: FiscalForm): SaveMyFiscalDataPayload {
  const email = form.email.trim();
  return {
    rfc: normalizeRfcInput(form.rfc),
    // El SAT compara el nombre tal como está en la constancia: en mayúsculas.
    legalName: form.legalName.trim().replace(/\s+/g, ' ').toUpperCase(),
    fiscalRegime: form.taxRegime.trim(),
    postalCode: form.postalCode.trim(),
    cfdiUse: form.cfdiUse.trim().toUpperCase(),
    ...(email ? { email } : {}),
  };
}

/** "612 · Personas Físicas con Actividades Empresariales"; solo el código si no está en el catálogo. */
export function catalogLabel(
  options: SatCatalogOption[] | undefined,
  code: string,
): string {
  if (!code) return '';
  const found = options?.find((o) => o.code === code);
  return found ? `${code} · ${found.description}` : code;
}

// ===== Compras =====

/** Cómo se pinta el estado: lista, hecha, en espera, con Contabilidad o sin acción. */
export type InvoiceTone = 'ready' | 'done' | 'wait' | 'accounting' | 'muted';

const TONES: Record<SelfInvoiceStatus, InvoiceTone> = {
  invoiceable: 'ready',
  invoiced: 'done',
  in_progress: 'wait',
  unpaid: 'wait',
  in_global: 'accounting',
  branch_not_invoicing: 'accounting',
  migrated: 'accounting',
  out_of_month: 'accounting',
  cancelled: 'muted',
};

/** El estado es uno de los que esta pantalla sabe traducir. */
export function isKnownInvoiceStatus(status: string): status is SelfInvoiceStatus {
  return Object.prototype.hasOwnProperty.call(TONES, status);
}

export function invoiceTone(status: string): InvoiceTone {
  return TONES[status as SelfInvoiceStatus] ?? 'muted';
}

export interface InvoicingCounts {
  /** Se pueden facturar ahora mismo. */
  invoiceable: number;
  invoiced: number;
  /** Se piden a Contabilidad (ya en la global del día, sucursal que no factura aquí…). */
  accounting: number;
}

export function invoicingCounts(orders: MyInvoiceOrder[]): InvoicingCounts {
  const counts: InvoicingCounts = { invoiceable: 0, invoiced: 0, accounting: 0 };
  for (const order of orders) {
    const tone = invoiceTone(order.status);
    if (order.canInvoice) counts.invoiceable += 1;
    else if (tone === 'done') counts.invoiced += 1;
    else if (tone === 'accounting') counts.accounting += 1;
  }
  return counts;
}

/** Nombre del archivo descargado: por folio fiscal y, si aún no hay, por número de pedido. */
export function invoiceFileName(
  kind: 'pdf' | 'xml',
  order: Pick<MyInvoiceOrder, 'orderNumber' | 'invoice'>,
): string {
  const base = (order.invoice?.folio || `pedido-${order.orderNumber}`).replace(
    /[^\w.-]+/g,
    '-',
  );
  return `factura-${base}.${kind}`;
}

/** "noviembre de 2026" / "November 2026" a partir de "2026-11". */
export function monthName(month: string, locale: string): string {
  const match = /^([0-9]{4})-([0-9]{2})$/.exec(month);
  if (!match) return month;
  // Día 15 en UTC: ningún huso lo mueve de mes.
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 15));
  return date.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
