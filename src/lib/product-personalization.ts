// product-personalization.ts - Personalización en la tienda (mig 179, 30-oct-2026).
//
// Un producto "personalizable" (playeras) deja que el cliente escriba un texto
// (su nombre) con un máximo de caracteres por producto:
//   - products.personalization_max_length: 1..60; null = no se personaliza.
//   - products.personalization_label: etiqueta del campo (<= 60); null = la
//     etiqueta por defecto de la tienda ("Personalízala con tu nombre" / "Add your name").
// Aquí viven las reglas puras de la ficha (formulario <-> DTO) para probarlas sin DOM.

/** Tope absoluto del máximo de caracteres (CHECK de la mig 179). */
export const PERSONALIZATION_MAX_LENGTH_LIMIT = 60;
/** Valor que propone la ficha al encender la personalización. */
export const PERSONALIZATION_DEFAULT_MAX_LENGTH = 20;
/** Largo máximo de la etiqueta del campo. */
export const PERSONALIZATION_LABEL_MAX_LENGTH = 60;
/** Etiqueta que usa la tienda en español cuando el producto no define una propia. */
export const PERSONALIZATION_DEFAULT_LABEL_ES = 'Personalízala con tu nombre';

/** Lo que el API guarda del producto (GET /products/:id). */
export interface ProductPersonalizationFields {
  personalizationMaxLength?: number | null;
  personalizationLabel?: string | null;
}

/** Valores de la sección Clasificación y tienda (texto tal como se teclea). */
export interface PersonalizationFormValues {
  personalizationEnabled: boolean;
  /** Texto del campo "Máximo de caracteres"; se valida con parsePersonalizationMaxLength. */
  personalizationMaxLength: string;
  personalizationLabel: string;
}

/** Parte del PATCH /products/:id (o del POST) que aporta la personalización. */
export interface PersonalizationPatch {
  personalizationMaxLength?: number | null;
  personalizationLabel?: string | null;
}

/**
 * "Máximo de caracteres" tecleado -> entero entre 1 y 60, o null si no es válido
 * (vacío, decimales, cero, fuera de rango o texto).
 */
export function parsePersonalizationMaxLength(raw: string): number | null {
  const t = raw.trim();
  if (!/^\d{1,3}$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= PERSONALIZATION_MAX_LENGTH_LIMIT ? n : null;
}

/** Mensaje de validación del campo "Máximo de caracteres" (null = válido). */
export function personalizationMaxLengthError(raw: string): string | null {
  return parsePersonalizationMaxLength(raw) === null
    ? `Número entero entre 1 y ${PERSONALIZATION_MAX_LENGTH_LIMIT}`
    : null;
}

/** Etiqueta tecleada -> valor para el API: recortada, o null si queda vacía. */
export function normalizePersonalizationLabel(raw: string): string | null {
  const t = raw.trim();
  return t === '' ? null : t;
}

/**
 * Producto guardado -> valores del formulario. Apagado, el máximo propone 20
 * para que al encender el interruptor el campo ya traiga un valor válido.
 */
export function personalizationFormValues(
  product: ProductPersonalizationFields | null | undefined,
): PersonalizationFormValues {
  const max = product?.personalizationMaxLength ?? null;
  return {
    personalizationEnabled: max !== null,
    personalizationMaxLength: String(max ?? PERSONALIZATION_DEFAULT_MAX_LENGTH),
    personalizationLabel: product?.personalizationLabel ?? '',
  };
}

/** Valor efectivo que representa el formulario (lo que debería quedar en BD). */
export function personalizationEffective(values: PersonalizationFormValues): {
  personalizationMaxLength: number | null;
  personalizationLabel: string | null;
} {
  return {
    personalizationMaxLength: values.personalizationEnabled
      ? parsePersonalizationMaxLength(values.personalizationMaxLength)
      : null,
    personalizationLabel: normalizePersonalizationLabel(values.personalizationLabel),
  };
}

/**
 * Parte del PATCH: SOLO las claves cuyo valor efectivo difiere de lo guardado
 * (`null` vacía en BD). Con el interruptor apagado el máximo va en null; la
 * etiqueta se conserva tal cual se tecleó (vacía = null) aunque esté apagado,
 * para que al volver a encender no haya que recapturarla. Un máximo inválido
 * con el interruptor encendido no se manda (zod ya lo bloqueó en la ficha).
 */
export function personalizationPatch(
  saved: ProductPersonalizationFields | null | undefined,
  values: PersonalizationFormValues,
): PersonalizationPatch {
  const effective = personalizationEffective(values);
  const savedMax = saved?.personalizationMaxLength ?? null;
  const savedLabel = saved?.personalizationLabel ?? null;
  const patch: PersonalizationPatch = {};
  const maxInvalid = values.personalizationEnabled && effective.personalizationMaxLength === null;
  if (!maxInvalid && effective.personalizationMaxLength !== savedMax) {
    patch.personalizationMaxLength = effective.personalizationMaxLength;
  }
  if (effective.personalizationLabel !== savedLabel) {
    patch.personalizationLabel = effective.personalizationLabel;
  }
  return patch;
}

/**
 * Parte del POST /products en el alta: solo viaja cuando se enciende (un alta
 * sin personalización no toca las columnas de la mig 179).
 */
export function personalizationCreatePayload(values: PersonalizationFormValues): PersonalizationPatch {
  if (!values.personalizationEnabled) return {};
  const max = parsePersonalizationMaxLength(values.personalizationMaxLength);
  if (max === null) return {};
  const label = normalizePersonalizationLabel(values.personalizationLabel);
  return label === null ? { personalizationMaxLength: max } : { personalizationMaxLength: max, personalizationLabel: label };
}

/** Texto que ven Almacén y Pedidos junto al producto: "Personalización: TEXTO". */
export function personalizationLine(text: string | null | undefined): string | null {
  const t = (text ?? '').trim();
  return t === '' ? null : `Personalización: ${t}`;
}

/** Renglones de una entrega / pedido que llevan texto a estampar. */
export function countPersonalizedLines(items: readonly { personalization?: string | null }[]): number {
  return items.filter((it) => personalizationLine(it.personalization) !== null).length;
}
