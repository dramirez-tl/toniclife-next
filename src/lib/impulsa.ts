// IMPULSA en la web: reglas puras de pantalla (casillas de un renglón, enlace de WhatsApp, texto de
// un mensaje, niveles por Victoria). Lo que una persona lleva de su ruta lo decide el API; aquí solo
// se acomoda para pintarlo. Con pruebas en `impulsa.test.ts`.

import type { ImpulsaMessagePart, ImpulsaVictory } from '@/types/impulsa';

/**
 * IMPULSA es una sección aparte del panel del distribuidor, separada de RISE Academy (Comercial,
 * 26-nov-2026): tiene su propia entrada en el menú, sus rutas y su marca.
 */
export const IMPULSA_PATH = '/distribuidor/impulsa';
export const IMPULSA_TEAM_PATH = `${IMPULSA_PATH}/equipo`;

/** Pantalla de una Victoria: '/distribuidor/impulsa/1'. */
export function victoryPath(number: number): string {
  return `${IMPULSA_PATH}/${number}`;
}

/**
 * Logo de IMPULSA (el que entregó Comercial, recortado). Es azul con puntos amarillos y naranjas:
 * va sobre blanco o fondos muy claros, nunca sobre un fondo oscuro.
 */
export const IMPULSA_LOGO = { src: '/images/impulsa/impulsa-logo.png', width: 1200, height: 585 } as const;

/** El nivel de un curso que guarda los microvideos de una Victoria es 'v1' … 'v6'. */
export const IMPULSA_LEVELS = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'] as const;

/** Nombre de cada Victoria (el mismo del catálogo del API), para los selectores del admin. */
export const IMPULSA_VICTORY_TITLES: Readonly<Record<number, string>> = {
  1: 'Ya pertenezco a Tonic Life',
  2: 'Mi negocio está en marcha',
  3: 'Estoy construyendo mi negocio',
  4: 'Mi equipo ya está en movimiento',
  5: 'Estoy consolidando mi negocio',
  6: 'Soy un constructor de organizaciones',
};

/** Victoria de un nivel de curso ('v1', 'V1' → 1); null si es un nivel de los de antes. */
export function victoryFromLevel(level: string | null | undefined): number | null {
  const match = /^v([1-6])$/i.exec((level ?? '').trim());
  return match ? Number(match[1]) : null;
}

/**
 * true si el curso guarda contenido de IMPULSA (su nivel es una Victoria). Esos cursos no son de
 * RISE Academy: no salen en su catálogo; se ven dentro de su Victoria.
 */
export function isImpulsaCourse(course: { difficulty?: string | null }): boolean {
  return victoryFromLevel(course.difficulty) !== null;
}

/** Etiqueta corta del nivel: 'V1' para una Victoria; null si no es una Victoria. */
export function victoryLevelLabel(level: string | null | undefined): string | null {
  const number = victoryFromLevel(level);
  return number ? `V${number}` : null;
}

/** "V1 · Ya pertenezco a Tonic Life". */
export function victoryOptionLabel(number: number): string {
  const title = IMPULSA_VICTORY_TITLES[number];
  return title ? `V${number} · ${title}` : `V${number}`;
}

/** Categoría de Materiales con las guías de una Victoria: 'impulsa_v1' … (igual que en el API). */
export function victoryMaterialCategory(number: number): string {
  return `impulsa_v${number}`;
}

/** Victoria de una categoría de Materiales ('impulsa_v3' → 3); null si es otra categoría. */
export function victoryFromMaterialCategory(category: string | null | undefined): number | null {
  const match = /^impulsa_v([1-6])$/.exec((category ?? '').trim());
  return match ? Number(match[1]) : null;
}

/** "Días 0 a 7". */
export function victoryDaysLabel(victory: Pick<ImpulsaVictory, 'dayFrom' | 'dayTo'>): string {
  return victory.dayFrom === victory.dayTo ? `Día ${victory.dayFrom}` : `Días ${victory.dayFrom} a ${victory.dayTo}`;
}

/** Avance por calendario dentro de la ruta de 90 días, de 0 a 100. */
export function routePercent(day: number, lastDay = 90): number {
  if (!Number.isFinite(day) || day <= 0) return 0;
  return Math.min(100, Math.round((day / lastDay) * 100));
}

export interface CounterBoxes {
  /** Una entrada por casilla del renglón: true = marcada. */
  boxes: boolean[];
  /** Lo que lleva de más cuando ya llenó todas las casillas. */
  extra: number;
}

/** Las casillas de un renglón diario de la Tarjeta de Ruta: las primeras `total` van marcadas. */
export function counterBoxes(total: number, boxes: number): CounterBoxes {
  const count = Math.max(0, Math.trunc(boxes));
  const done = Math.max(0, Math.trunc(Number.isFinite(total) ? total : 0));
  return {
    boxes: Array.from({ length: count }, (_, i) => i < done),
    extra: Math.max(0, done - count),
  };
}

/**
 * Qué hace un clic en la casilla `index` (desde 0) de un renglón con `total` marcadas: una casilla
 * vacía suma una; una marcada quita una. Así se usa igual que la tarjeta impresa, de una en una.
 */
export function boxClickDelta(index: number, total: number): 1 | -1 {
  return index < total ? -1 : 1;
}

/** Solo los dígitos de un teléfono. */
export function phoneDigits(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '');
}

/** "462 555 0101" para un número de 10 dígitos; tal cual si tiene otra forma. */
export function formatPhone(phone: string | null | undefined): string {
  const digits = phoneDigits(phone);
  if (digits.length !== 10) return (phone ?? '').trim();
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

/**
 * Enlace para escribirle por WhatsApp con el mensaje ya puesto (lo manda la persona desde SU
 * WhatsApp; no es un envío del sistema). El número de 10 dígitos lleva el código de su país
 * (52 si no se sabe). null si no hay un teléfono utilizable.
 */
export function whatsappUrl(
  phone: string | null | undefined,
  countryCode: string | null | undefined,
  text: string,
): string | null {
  const digits = phoneDigits(phone);
  if (digits.length < 10) return null;
  const code = phoneDigits(countryCode) || '52';
  const full = digits.length === 10 ? `${code}${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

/** Enlace para llamar; null sin teléfono. */
export function telUrl(phone: string | null | undefined): string | null {
  const digits = phoneDigits(phone);
  return digits.length >= 10 ? `tel:${digits}` : null;
}

/**
 * Texto corrido de un mensaje. Los campos de enlace toman el enlace que se les dé; sin enlace, el
 * campo se queda entre corchetes (como en el documento aprobado).
 */
export function messageText(
  parts: readonly ImpulsaMessagePart[],
  links: { video?: string | null; guide?: string | null } = {},
): string {
  return parts
    .map((part) => {
      if (part.type === 'text') return part.text;
      if (part.field === 'enlace del video' && links.video) return links.video;
      if (part.field === 'enlace de la guía' && links.guide) return links.guide;
      return `[${part.field}]`;
    })
    .join('');
}

/** "hoy", "ayer", "hace 3 días" a partir de dos fechas YYYY-MM-DD. */
export function daysAgoLabel(dateOnly: string | null | undefined, today: string): string {
  if (!dateOnly) return '';
  const diff = Math.round(
    (Date.parse(`${today.slice(0, 10)}T00:00:00Z`) - Date.parse(`${dateOnly.slice(0, 10)}T00:00:00Z`)) / 86_400_000,
  );
  if (!Number.isFinite(diff)) return '';
  if (diff <= 0) return 'hoy';
  if (diff === 1) return 'ayer';
  return `hace ${diff} días`;
}

/** YYYY-MM-DD → dd/mm/aaaa. */
export function formatDateOnly(dateOnly: string | null | undefined): string {
  if (!dateOnly) return '—';
  const [y, m, d] = dateOnly.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : dateOnly;
}
