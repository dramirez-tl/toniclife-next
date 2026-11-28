// payroll-receiver.ts - Reglas puras (sin red ni React) del panel "Datos del
// recibo" de Tesorería y del buscador de Bono de Inscripción. El API vuelve a
// validar todo lo que se guarda.

import type {
  PayrollNameSource,
  PayrollReceiver,
  PayrollReceiverField,
  PayrollReceiverFieldError,
  PayrollReceiverInput,
  PayrollRfcSource,
} from '@/types/payroll-receiver';

// ---------------- Captura ----------------

export interface PayrollReceiverDraft {
  rfc: string;
  curp: string;
  zipCode: string;
  /** Nombre para el recibo (como en su constancia). */
  name: string;
}

/**
 * El nombre como va en el CFDI: mayúsculas, sin acentos (la Ñ se conserva) y sin
 * espacios de más. Igual que normalizeLegalName del API.
 */
export const cleanReceiptName = (value: string | null | undefined): string =>
  Array.from((value ?? '').toUpperCase())
    .map((ch) => (ch === 'Ñ' ? ch : ch.normalize('NFD').replace(/\p{M}/gu, '')))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

/** Mayúsculas, sin espacios ni guiones (lo típico al pegar desde una constancia). */
export const cleanFiscalId = (value: string): string => value.toUpperCase().replace(/[\s\-.]/g, '');

/** Solo dígitos, máximo 5. */
export const cleanZip = (value: string): string => value.replace(/\D/g, '').slice(0, 5);

/** El formulario abre con lo guardado en el perfil de nómina. */
export function draftFromReceiver(receiver: PayrollReceiver | null | undefined): PayrollReceiverDraft {
  return {
    rfc: receiver?.payroll.rfc ?? '',
    curp: receiver?.payroll.curp ?? '',
    zipCode: receiver?.payroll.zipCode ?? '',
    name: receiver?.payroll.name ?? '',
  };
}

/** Lo que cambió respecto de lo guardado (lo único que se manda). Vacío no cambia nada. */
export function draftChanges(receiver: PayrollReceiver, draft: PayrollReceiverDraft): PayrollReceiverInput {
  const out: PayrollReceiverInput = {};
  const rfc = cleanFiscalId(draft.rfc);
  const curp = cleanFiscalId(draft.curp);
  const zip = cleanZip(draft.zipCode);
  if (rfc && rfc !== (receiver.payroll.rfc ?? '')) out.rfc = rfc;
  if (curp && curp !== (receiver.payroll.curp ?? '')) out.curp = curp;
  if (zip && zip !== (receiver.payroll.zipCode ?? '')) out.zipCode = zip;
  const name = cleanReceiptName(draft.name);
  if (name && name !== cleanReceiptName(receiver.payroll.name)) out.name = name;
  return out;
}

export const hasChanges = (input: PayrollReceiverInput): boolean =>
  input.rfc !== undefined || input.curp !== undefined || input.zipCode !== undefined || input.name !== undefined;

/** Avisos mientras se teclea (largo de cada dato); el API da el veredicto final. */
export function draftHints(draft: PayrollReceiverDraft): Partial<Record<PayrollReceiverField, string>> {
  const hints: Partial<Record<PayrollReceiverField, string>> = {};
  const rfc = cleanFiscalId(draft.rfc);
  const curp = cleanFiscalId(draft.curp);
  const zip = cleanZip(draft.zipCode);
  if (rfc && rfc.length !== 13) {
    hints.rfc = rfc.length === 12 ? 'Ese es un RFC de empresa (12). El del distribuidor lleva 13.' : `Lleva ${rfc.length} de 13 caracteres.`;
  }
  if (curp && curp.length !== 18) hints.curp = `Lleva ${curp.length} de 18 caracteres.`;
  if (zip && zip.length !== 5) hints.zipCode = `Lleva ${zip.length} de 5 dígitos.`;
  const name = cleanReceiptName(draft.name);
  if (name && name.split(' ').length < 2) hints.name = 'Escribe el nombre completo: nombre(s) y apellidos.';
  return hints;
}

/** De dónde sale el nombre del recibo, en palabras de Tesorería. */
export const NAME_SOURCE_LABEL: Record<PayrollNameSource, string> = {
  payroll: 'Nombre capturado para el recibo',
  billing: 'Sale de la Razón social de sus datos fiscales',
  account: 'Sale del nombre de su cuenta',
};

export interface ReceiptNameSuggestion {
  source: 'account' | 'billing';
  /** Con su artículo, para decir "Usar …": "el nombre de su cuenta" | "la razón social de sus datos fiscales". */
  label: string;
  name: string;
}

/**
 * Nombres que la cuenta ya tiene y que NO son el que hoy saldría en el recibo:
 * candidatos para capturarlo de un clic cuando el SAT rechazó el otro. Sin
 * repetidos y sin el que ya está tecleado.
 */
export function receiptNameSuggestions(receiver: PayrollReceiver, draftName = ''): ReceiptNameSuggestion[] {
  const options = receiver.nameOptions;
  if (!options) return [];
  const current = cleanReceiptName(receiver.receipt?.name);
  const typed = cleanReceiptName(draftName);
  const out: ReceiptNameSuggestion[] = [];
  const add = (source: ReceiptNameSuggestion['source'], label: string, raw: string | null) => {
    const name = cleanReceiptName(raw);
    if (!name || name === current || name === typed || out.some((o) => o.name === name)) return;
    out.push({ source, label, name });
  };
  add('account', 'el nombre de su cuenta', options.account);
  add('billing', 'la razón social de sus datos fiscales', options.billing);
  return out;
}

/** ¿RFC y CURP son de la misma persona? (2 primeras letras y fecha de nacimiento; igual que el API). */
export function rfcMatchesCurp(rfc: string, curp: string): boolean {
  const r = cleanFiscalId(rfc);
  const c = cleanFiscalId(curp);
  if (r.length !== 13 || c.length !== 18) return false;
  return r.slice(0, 2) === c.slice(0, 2) && r.slice(4, 10) === c.slice(4, 10);
}

export interface ReceiverSaveError {
  /** Mensaje para el aviso. */
  message: string;
  /** Detalle por campo, cuando el API lo manda. */
  errors: PayrollReceiverFieldError[];
  /** El dato es válido pero hay que confirmar (RFC y CURP no cuadran). */
  needsConfirm: boolean;
}

/** Lee el 422 del API ({ message, field, details: { errors, needsConfirm } }). */
export function readReceiverSaveError(err: unknown, fallback = 'No se pudieron guardar los datos.'): ReceiverSaveError {
  const body = (err as { response?: { data?: unknown } } | null)?.response?.data as
    | { message?: unknown; field?: unknown; details?: { errors?: unknown; needsConfirm?: unknown } }
    | undefined;
  const message = typeof body?.message === 'string' && body.message.trim() ? body.message : fallback;
  const raw = Array.isArray(body?.details?.errors) ? (body!.details!.errors as unknown[]) : [];
  const errors = raw
    .filter(
      (e): e is PayrollReceiverFieldError =>
        !!e &&
        typeof (e as PayrollReceiverFieldError).message === 'string' &&
        ['rfc', 'curp', 'zipCode', 'name'].includes((e as PayrollReceiverFieldError).field),
    )
    .map((e) => ({ field: e.field, message: e.message, ...(e.needsConfirm ? { needsConfirm: true } : {}) }));
  return { message, errors, needsConfirm: body?.details?.needsConfirm === true };
}

/** Qué dato hay que corregir tras un rechazo del SAT. */
export interface SatRejectionHint {
  field: PayrollReceiverField;
  /** En claro, para quien corrige. */
  text: string;
}

/**
 * Los rechazos del SAT llegan en su idioma ("El campo DomicilioFiscalReceptor
 * del receptor, debe encontrarse en la lista de RFC inscritos…"). Esto dice
 * qué dato es y qué hacer; null si el mensaje no es uno de los conocidos.
 */
export function satRejectionHint(error: string | null | undefined): SatRejectionHint | null {
  const e = (error ?? '').toLowerCase();
  if (!e) return null;
  if (e.includes('domiciliofiscalreceptor')) {
    return {
      field: 'zipCode',
      text: 'El código postal no es el que el SAT tiene registrado para ese RFC. Corrígelo con el de su Constancia de Situación Fiscal.',
    };
  }
  if (e.includes('receptor.rfc') || (e.includes('rfc inscritos') && !e.includes('nombre'))) {
    return {
      field: 'rfc',
      text: 'El SAT no reconoce ese RFC: no está inscrito o está cancelado. Revísalo contra su constancia (puede traer una letra o un número mal).',
    };
  }
  if (e.includes('nombre del receptor') || e.includes('nombre asociado al rfc')) {
    return {
      field: 'name',
      text: 'El SAT no reconoce ese nombre para ese RFC: debe ir letra por letra como en su Constancia de Situación Fiscal. Escríbelo en «Nombre en el recibo» (o revisa que el RFC no sea de otra persona).',
    };
  }
  return null;
}

export const RFC_SOURCE_LABEL: Record<PayrollRfcSource, string> = {
  payroll: 'RFC de nómina capturado',
  billing_own: 'RFC de facturación (es el suyo: cuadra con su CURP)',
  billing_unverified: 'RFC de facturación (sin CURP para comprobar que sea el suyo)',
};

// ---------------- Buscador de Bono de Inscripción ----------------

/** Minúsculas y sin acentos, para comparar. */
export const searchFold = (value: string | null | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Cada palabra buscada debe aparecer en alguno de los textos ("juana 2019" encuentra a Juana #2019517). */
export function matchesSearch(query: string, fields: ReadonlyArray<string | null | undefined>): boolean {
  const words = searchFold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = fields.map(searchFold).join(' \u0001 ');
  return words.every((w) => hay.includes(w));
}

interface SearchableBonus {
  sponsorNumber: string;
  sponsorName: string;
  buyerNumber: string;
  buyerName: string;
  kitCode: string;
  paymentReference?: string | null;
}

/** Un bono: por patrocinador, inscrito, clave del kit o referencia del pago. */
export function bonusRowMatches(query: string, row: SearchableBonus): boolean {
  return matchesSearch(query, [row.sponsorNumber, row.sponsorName, row.buyerNumber, row.buyerName, row.kitCode, row.paymentReference]);
}

interface SearchableGroup {
  sponsorNumber: string;
  sponsorName: string;
  paymentReference?: string | null;
  voucher?: { folio: string | null; uuid: string | null } | null;
  items: ReadonlyArray<{ buyerNumber: string; buyerName: string; kitCode: string }>;
}

/** Un patrocinador: por él, por cualquiera de sus inscritos, por el folio de su recibo o la referencia del pago. */
export function bonusGroupMatches(query: string, group: SearchableGroup): boolean {
  return matchesSearch(query, [
    group.sponsorNumber,
    group.sponsorName,
    group.paymentReference,
    group.voucher?.folio,
    group.voucher?.uuid,
    ...group.items.flatMap((i) => [i.buyerNumber, i.buyerName, i.kitCode]),
  ]);
}
