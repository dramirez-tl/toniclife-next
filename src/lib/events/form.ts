// form.ts - Estado del formulario de evento (alta y edición) y su conversión
// a los DTOs del API. Lógica pura, sin React.
//
// El formulario trabaja con TEXTO en todos los campos (lo que teclea el
// usuario); aquí se valida y se convierte a números/undefined/null.
//
// Dos modos de "producto del boleto" (`source`):
//  - 'new': el API crea un producto de tipo 'event' con la clave y el precio
//    capturados aquí.
//  - 'linked': se usa un producto EXISTENTE del catálogo (productId). El API
//    toma su clave y su precio público; no se mandan clave, precio, nombre en
//    el POS ni claves SAT, y el precio se edita en Productos.

import {
  EVENT_DEFAULT_TIMEZONE,
  type CreateEventInput,
  type EventDto,
  type EventTaxMode,
  type UpdateEventInput,
} from '@/types/events';
import { formatEventMoney } from './format';

export type EventProductSource = 'new' | 'linked';

export interface EventFormValues {
  /** 'new' = el API crea el producto del boleto; 'linked' = usa un producto existente. */
  source: EventProductSource;
  /** Producto existente (modo 'linked'). */
  productId: string;
  /** "CLAVE — Nombre" del producto vinculado (solo para mostrar). */
  productLabel: string;
  /** Precio público del producto vinculado ya formateado (solo para mostrar). */
  productPriceLabel: string;
  code: string;
  name: string;
  productName: string;
  speaker: string;
  description: string;
  eventDate: string;
  doorsTime: string;
  startTime: string;
  endTime: string;
  timezone: string;
  venueName: string;
  venueAddress: string;
  city: string;
  state: string;
  countryId: string;
  ticketPrice: string;
  ticketsPerUnit: string;
  capacity: string;
  includedProductId: string;
  /** Solo para mostrar el producto elegido ("CLAVE — Nombre"). */
  includedProductLabel: string;
  includedQuantity: string;
  taxMode: EventTaxMode;
  satProductCode: string;
  satUnitCode: string;
  ticketNotes: string;
  emailNotes: string;
  imageUrl: string;
  saleStartsOn: string;
  saleEndsOn: string;
}

export const EMPTY_EVENT_FORM: EventFormValues = {
  source: 'new',
  productId: '',
  productLabel: '',
  productPriceLabel: '',
  code: '',
  name: '',
  productName: '',
  speaker: '',
  description: '',
  eventDate: '',
  doorsTime: '',
  startTime: '',
  endTime: '',
  timezone: EVENT_DEFAULT_TIMEZONE,
  venueName: '',
  venueAddress: '',
  city: '',
  state: '',
  countryId: '',
  ticketPrice: '',
  ticketsPerUnit: '1',
  capacity: '',
  includedProductId: '',
  includedProductLabel: '',
  includedQuantity: '1',
  taxMode: 'iva_16',
  satProductCode: '01010101',
  satUnitCode: 'E48',
  ticketNotes: '',
  emailNotes: '',
  imageUrl: '',
  saleStartsOn: '',
  saleEndsOn: '',
};

/** Ficha del API → formulario (edición). */
export function eventToForm(ev: EventDto): EventFormValues {
  const linked = !!ev.linkedProduct;
  const productCode = ev.productCode || ev.code;
  return {
    source: linked ? 'linked' : 'new',
    productId: ev.productId ?? '',
    productLabel: [productCode, ev.productName].filter(Boolean).join(' — '),
    productPriceLabel: formatEventMoney(ev.ticketPrice, ev.currencyCode),
    code: ev.code,
    name: ev.name,
    // El API devuelve el nombre del producto aunque sea el del evento: solo se
    // muestra como "nombre distinto" cuando de verdad difiere.
    productName: !linked && ev.productName && ev.productName !== ev.name ? ev.productName : '',
    speaker: ev.speaker ?? '',
    description: ev.description ?? '',
    eventDate: ev.eventDate,
    doorsTime: ev.doorsTime ?? '',
    startTime: ev.startTime ?? '',
    endTime: ev.endTime ?? '',
    timezone: ev.timezone || EVENT_DEFAULT_TIMEZONE,
    venueName: ev.venueName ?? '',
    venueAddress: ev.venueAddress ?? '',
    city: ev.city ?? '',
    state: ev.state ?? '',
    countryId: ev.countryId,
    ticketPrice: String(ev.ticketPrice ?? ''),
    ticketsPerUnit: String(ev.ticketsPerUnit ?? 1),
    capacity: ev.capacity === null || ev.capacity === undefined ? '' : String(ev.capacity),
    includedProductId: ev.includedProductId ?? '',
    includedProductLabel: ev.includedProductId
      ? [ev.includedProductCode, ev.includedProductName].filter(Boolean).join(' — ')
      : '',
    includedQuantity: String(ev.includedQuantity ?? 1),
    taxMode: ev.taxMode,
    satProductCode: ev.satProductCode ?? '',
    satUnitCode: ev.satUnitCode ?? '',
    ticketNotes: ev.ticketNotes ?? '',
    emailNotes: ev.emailNotes ?? '',
    imageUrl: ev.imageUrl ?? '',
    saleStartsOn: ev.saleStartsOn ?? '',
    saleEndsOn: ev.saleEndsOn ?? '',
  };
}

const CODE_RE = /^[A-Za-z0-9_-]{3,30}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const SAT_PRODUCT_RE = /^\d{8}$/;
const SAT_UNIT_RE = /^[A-Za-z0-9]{2,3}$/;

const isBlank = (s: string) => s.trim() === '';

/**
 * Primer error del formulario (texto para el toast) o null si está completo.
 * `mode` decide si la clave / el producto son obligatorios (solo en el alta).
 */
export function validateEventForm(v: EventFormValues, mode: 'create' | 'edit'): string | null {
  const linked = v.source === 'linked';
  if (mode === 'create') {
    if (linked) {
      if (isBlank(v.productId)) return 'Elige el producto del catálogo que será el boleto.';
    } else {
      if (isBlank(v.code)) return 'La clave del evento es obligatoria.';
      if (!CODE_RE.test(v.code.trim()))
        return 'La clave admite de 3 a 30 caracteres: letras, números, guion y guion bajo.';
    }
  }
  const name = v.name.trim();
  if (name.length < 3) return 'El nombre del evento debe tener al menos 3 caracteres.';
  if (name.length > 200) return 'El nombre del evento es demasiado largo (máximo 200).';
  if (!DATE_RE.test(v.eventDate)) return 'Captura la fecha del evento.';
  for (const [label, value] of [
    ['registro', v.doorsTime],
    ['inicio', v.startTime],
    ['término', v.endTime],
  ] as const) {
    if (!isBlank(value) && !TIME_RE.test(value)) return `La hora de ${label} debe ser HH:MM.`;
  }
  if (!linked) {
    if (isBlank(v.ticketPrice)) return 'Captura el precio del boleto.';
    const price = Number(v.ticketPrice);
    if (!Number.isFinite(price) || price < 0) return 'El precio del boleto no es válido.';
    if (Math.round(price * 100) !== price * 100) return 'El precio admite máximo 2 decimales.';
  }
  const perUnit = Number(v.ticketsPerUnit);
  if (!Number.isInteger(perUnit) || perUnit < 1 || perUnit > 20)
    return 'Los boletos por unidad deben ser un entero entre 1 y 20.';
  if (!isBlank(v.capacity)) {
    const cap = Number(v.capacity);
    if (!Number.isInteger(cap) || cap < 1) return 'El aforo debe ser un entero mayor que cero.';
  }
  if (!linked) {
    if (!isBlank(v.satProductCode) && !SAT_PRODUCT_RE.test(v.satProductCode.trim()))
      return 'La clave SAT de producto debe tener 8 dígitos.';
    if (!isBlank(v.satUnitCode) && !SAT_UNIT_RE.test(v.satUnitCode.trim()))
      return 'La clave SAT de unidad debe tener 2 o 3 caracteres (p. ej. E48).';
    if (v.includedProductId) {
      const qty = Number(v.includedQuantity);
      if (!Number.isFinite(qty) || qty <= 0) return 'La cantidad del producto incluido debe ser mayor que cero.';
    }
  }
  if (v.imageUrl.trim().length > 500) return 'La URL de la imagen es demasiado larga (máximo 500).';
  if (!isBlank(v.saleStartsOn) && !DATE_RE.test(v.saleStartsOn)) return 'La fecha de inicio de venta no es válida.';
  if (!isBlank(v.saleEndsOn) && !DATE_RE.test(v.saleEndsOn)) return 'La fecha de fin de venta no es válida.';
  if (!isBlank(v.saleStartsOn) && !isBlank(v.saleEndsOn) && v.saleStartsOn > v.saleEndsOn)
    return 'El fin de venta no puede ser antes del inicio de venta.';
  if (v.ticketNotes.length > 2000) return 'Las notas del boleto son demasiado largas (máximo 2000).';
  if (v.emailNotes.length > 4000) return 'Las notas del correo son demasiado largas (máximo 4000).';
  if (v.description.length > 4000) return 'La descripción es demasiado larga (máximo 4000).';
  return null;
}

const text = (s: string): string | undefined => (isBlank(s) ? undefined : s.trim());
const num = (s: string): number | undefined => (isBlank(s) ? undefined : Number(s));

/** Campos que se mandan igual en los dos modos (alta). */
function commonCreateFields(v: EventFormValues) {
  return {
    name: v.name.trim(),
    description: text(v.description),
    speaker: text(v.speaker),
    eventDate: v.eventDate,
    startTime: text(v.startTime),
    doorsTime: text(v.doorsTime),
    endTime: text(v.endTime),
    timezone: text(v.timezone) ?? EVENT_DEFAULT_TIMEZONE,
    venueName: text(v.venueName),
    venueAddress: text(v.venueAddress),
    city: text(v.city),
    state: text(v.state),
    countryId: text(v.countryId),
    capacity: num(v.capacity),
    ticketsPerUnit: num(v.ticketsPerUnit) ?? 1,
    taxMode: v.taxMode,
    imageUrl: text(v.imageUrl),
    ticketNotes: text(v.ticketNotes),
    emailNotes: text(v.emailNotes),
    saleStartsOn: text(v.saleStartsOn),
    saleEndsOn: text(v.saleEndsOn),
  };
}

/**
 * Formulario → POST /events. Los opcionales vacíos NO se mandan.
 * Con producto vinculado va `productId` y NO van clave, precio, nombre en el
 * POS, claves SAT ni producto incluido (el producto ES el boleto).
 */
export function toCreateInput(v: EventFormValues): CreateEventInput {
  const common = commonCreateFields(v);
  if (v.source === 'linked') {
    return { productId: v.productId.trim(), ...common };
  }
  return {
    code: v.code.trim().toUpperCase(),
    ...common,
    productName: text(v.productName),
    ticketPrice: Number(v.ticketPrice),
    satProductCode: text(v.satProductCode),
    satUnitCode: text(v.satUnitCode)?.toUpperCase(),
    includedProductId: text(v.includedProductId),
    includedQuantity: v.includedProductId ? num(v.includedQuantity) : undefined,
  };
}

/**
 * Formulario → PATCH /events/:id. Manda los campos editables: los opcionales
 * vacíos van en `null` para que el API los limpie (sin la clave, que no se
 * edita, ni el estado, que tiene sus propios botones). Con producto
 * vinculado no se mandan precio, nombre en el POS, claves SAT ni producto
 * incluido (el precio se edita en Productos; mandarlo responde 400).
 */
export function toUpdateInput(v: EventFormValues): UpdateEventInput {
  const c = commonCreateFields(v);
  const orNull = <T>(x: T | undefined): T | null => (x === undefined ? null : x);
  const common: UpdateEventInput = {
    name: c.name,
    description: orNull(c.description),
    speaker: orNull(c.speaker),
    eventDate: c.eventDate,
    startTime: orNull(c.startTime),
    doorsTime: orNull(c.doorsTime),
    endTime: orNull(c.endTime),
    timezone: c.timezone,
    venueName: orNull(c.venueName),
    venueAddress: orNull(c.venueAddress),
    city: orNull(c.city),
    state: orNull(c.state),
    countryId: c.countryId,
    capacity: orNull(c.capacity),
    ticketsPerUnit: c.ticketsPerUnit,
    taxMode: c.taxMode,
    imageUrl: orNull(c.imageUrl),
    ticketNotes: orNull(c.ticketNotes),
    emailNotes: orNull(c.emailNotes),
    saleStartsOn: orNull(c.saleStartsOn),
    saleEndsOn: orNull(c.saleEndsOn),
  };
  if (v.source === 'linked') return common;
  const includedProductId = text(v.includedProductId);
  return {
    ...common,
    productName: orNull(text(v.productName)),
    ticketPrice: Number(v.ticketPrice),
    satProductCode: orNull(text(v.satProductCode)),
    satUnitCode: orNull(text(v.satUnitCode)?.toUpperCase()),
    includedProductId: orNull(includedProductId),
    includedQuantity: includedProductId ? orNull(num(v.includedQuantity)) : null,
  };
}

// ================================
// Entrada (check-in): qué se manda según lo tecleado/escaneado
// ================================

/**
 * Interpreta lo capturado en la pantalla de entrada:
 *  - solo dígitos → número de boleto del evento (`FOCADE26-00012`, 5 dígitos);
 *  - empieza con la clave del evento + guion → número de boleto tal cual;
 *  - cualquier otra cosa (token o liga escaneada) → token.
 */
export function parseCheckInValue(
  raw: string,
  eventCode: string,
): { ticketNumber?: string; token?: string } | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^\d{1,6}$/.test(value)) {
    return { ticketNumber: `${eventCode.toUpperCase()}-${value.padStart(5, '0')}` };
  }
  const upper = value.toUpperCase();
  if (upper.startsWith(`${eventCode.toUpperCase()}-`) && /^[A-Z0-9_-]+-\d+$/.test(upper)) {
    return { ticketNumber: upper };
  }
  return { token: value };
}
