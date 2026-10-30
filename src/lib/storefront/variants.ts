// variants.ts - Selección de variantes en el detalle de la tienda (familias de
// producto, API mig 178, 30-oct-2026). Lib PURA: sin React ni DOM.
//
// Cada talla/color/género es OTRO producto (con su slug, clave y existencia): el
// selector no guarda estado local, navega a la página de la variante elegida. Aquí
// vive la regla de "a cuál voy" cuando el visitante toca un valor de un eje:
//   1. la opción con ese valor que conserva los demás ejes (combinación exacta);
//   2. si no existe, la que más coincide en los demás ejes (el color pesa más que
//      el género, y el género más que la talla);
//   3. a igual coincidencia, la que NO esté agotada;
//   4. a igual existencia, la talla más cercana a la actual (orden canónico);
//   5. y, si todo empata, la primera en el orden del API.

import type { LanguageCode } from '@/i18n/config';
import type { StorefrontAvailability, StorefrontVariantOption } from './types';

export type VariantAxis = 'gender' | 'color' | 'size';
export const VARIANT_AXES: readonly VariantAxis[] = ['gender', 'color', 'size'];

/** Combinación {género, color, talla} de la variante que se está viendo. */
export interface VariantSelection {
  gender: string | null;
  color: string | null;
  size: string | null;
}

export interface CurrentVariant extends VariantSelection {
  id: string;
}

/** Lo mínimo que necesita la regla de selección (las pruebas no arman opciones completas). */
export type PickableVariant = Pick<StorefrontVariantOption, 'id' | 'gender' | 'color' | 'size' | 'availability'>;

/** Orden canónico de tallas: gemela de lectura de `variants.lib.ts` del API. */
const SIZE_ORDER = [
  'XXCH',
  'XCH',
  'XS',
  'CH',
  'S',
  'M',
  'G',
  'L',
  'XG',
  'XL',
  'XXG',
  'XXL',
  '2XL',
  'XXXG',
  'XXXL',
  '3XL',
  '4XL',
] as const;
const SIZE_RANK = new Map<string, number>(SIZE_ORDER.map((size, index) => [size, index]));

/** Peso de cada eje al conservar la combinación actual: color > género > talla. */
const KEEP_WEIGHT: Record<VariantAxis, number> = { color: 4, gender: 2, size: 1 };

const GENDER_LABEL: Record<string, Record<LanguageCode, string>> = {
  mujer: { es: 'Mujer', en: 'Women' },
  hombre: { es: 'Hombre', en: 'Men' },
  unisex: { es: 'Unisex', en: 'Unisex' },
};

/**
 * Clave de comparación de un valor del eje: la talla en MAYÚSCULAS sin espacios
 * (como la guarda el API); color y género sin mayúsculas ni espacios de más.
 * `null` = sin valor en ese eje.
 */
export function axisKey(axis: VariantAxis, value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (raw === '') return null;
  if (axis === 'size') return raw.replace(/\s+/g, '').toUpperCase();
  return raw.replace(/\s+/g, ' ').toLocaleLowerCase();
}

function sameValue(axis: VariantAxis, a: string | null | undefined, b: string | null | undefined): boolean {
  return axisKey(axis, a) === axisKey(axis, b);
}

/**
 * Posición de la talla para medir cercanía: lista canónica, luego numéricas (28,
 * 30…) en orden numérico, al final las desconocidas (todas a la misma distancia).
 */
export function sizeRank(size: string | null | undefined): number {
  const key = axisKey('size', size);
  if (key === null) return 1_000_000;
  const known = SIZE_RANK.get(key);
  if (known !== undefined) return known;
  if (/^\d+(\.\d+)?$/.test(key)) return 10_000 + Number(key);
  return 100_000;
}

/** Etiqueta de respaldo del género cuando el API no la manda. */
export function genderLabelFor(gender: string | null | undefined, lang: LanguageCode): string {
  const key = axisKey('gender', gender);
  return key ? (GENDER_LABEL[key]?.[lang] ?? (gender ?? '').trim()) : '';
}

/** Valores distintos del eje, en el orden en que aparecen (las opciones ya vienen ordenadas). */
export function distinctAxisValues(
  options: readonly Pick<StorefrontVariantOption, VariantAxis>[],
  axis: VariantAxis,
): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const option of options) {
    const key = axisKey(axis, option[axis]);
    if (key === null || seen.has(key)) continue;
    seen.add(key);
    values.push((option[axis] as string).trim());
  }
  return values;
}

/**
 * Variante a la que se va al elegir `value` en `axis` desde `current`. `null` si no
 * hay opción con ese valor o si la mejor es la propia variante actual (no se navega).
 */
export function pickVariantFor<T extends PickableVariant>(
  options: readonly T[],
  current: CurrentVariant,
  axis: VariantAxis,
  value: string,
): T | null {
  const wanted = axisKey(axis, value);
  if (wanted === null) return null;
  const others = VARIANT_AXES.filter((other) => other !== axis);
  const currentRank = sizeRank(current.size);

  let best: T | null = null;
  let bestScore: number[] = [];
  for (const option of options) {
    if (axisKey(axis, option[axis]) !== wanted) continue;
    const kept = others.reduce((sum, other) => sum + (sameValue(other, option[other], current[other]) ? KEEP_WEIGHT[other] : 0), 0);
    const inStock = option.availability === 'out_of_stock' ? 0 : 1;
    const closeness = axis === 'size' ? 0 : -Math.abs(sizeRank(option.size) - currentRank);
    const score = [kept, inStock, closeness];
    if (best === null || compareScores(score, bestScore) > 0) {
      best = option;
      bestScore = score;
    }
  }
  return best && best.id !== current.id ? best : null;
}

/** Lexicográfico: positivo cuando `a` gana. A igual puntaje gana el que ya estaba (orden del API). */
function compareScores(a: number[], b: number[]): number {
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

/** Un botón del selector: valor del eje y a qué variante lleva. */
export interface VariantChip {
  /** Valor crudo del eje ("Rosa pastel", "CH", "mujer"). */
  value: string;
  /** Texto del botón: etiqueta del API en el idioma de la tienda (talla CH/S, género). */
  label: string;
  /** Muestra de color ("#RRGGBB"); null = se pinta el nombre. Solo en el eje color. */
  colorHex: string | null;
  /** Variante a la que lleva; null cuando es la actual (o no hay a dónde ir). */
  target: StorefrontVariantOption | null;
  selected: boolean;
  /** La variante a la que lleva (o la actual, si está seleccionado) está agotada. */
  soldOut: boolean;
}

/**
 * Botones de un eje para la variante actual. Las agotadas siguen siendo clicables
 * (tienen página): solo se marcan.
 */
export function axisChips(
  options: readonly StorefrontVariantOption[],
  current: CurrentVariant,
  axis: VariantAxis,
  lang: LanguageCode,
  currentAvailability: StorefrontAvailability = 'unknown',
): VariantChip[] {
  const currentOption = options.find((option) => option.id === current.id) ?? null;
  return distinctAxisValues(options, axis).map((value) => {
    const matching = options.filter((option) => sameValue(axis, option[axis], value));
    const sample = matching[0];
    const selected = sameValue(axis, value, current[axis]);
    const target = selected ? null : pickVariantFor(options, current, axis, value);
    const landing = selected ? currentOption : target;
    const availability = landing ? landing.availability : selected ? currentAvailability : 'unknown';
    return {
      value,
      label: chipLabel(axis, value, sample, lang),
      colorHex: axis === 'color' ? (matching.find((option) => option.colorHex)?.colorHex ?? null) : null,
      target,
      selected,
      soldOut: availability === 'out_of_stock',
    };
  });
}

function chipLabel(axis: VariantAxis, value: string, sample: StorefrontVariantOption | undefined, lang: LanguageCode): string {
  if (axis === 'gender') return sample?.genderLabel?.trim() || genderLabelFor(value, lang) || value;
  if (axis === 'size') return sample?.sizeLabel?.trim() || value;
  return value;
}
