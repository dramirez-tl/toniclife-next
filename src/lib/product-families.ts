// product-families.ts - Lógica PURA de familias de producto, variantes y guías
// de tallas (mig 178, 30-oct-2026): orden canónico de tallas (el mismo que
// variants.lib.ts del API), etiquetas, clave de columna a partir de su etiqueta,
// estado de los formularios y su validación (mismas reglas que los DTOs del API).
// Sin React ni DOM para poder probarla con vitest (product-families.test.ts).

import { VARIANT_GENDERS, isVariantGender, type VariantGender } from '@/types/product';
import type {
  CreateProductFamilyDto,
  CreateSizeGuideDto,
  ProductFamily,
  SizeGuide,
  SizeGuideUnit,
} from '@/types/product-family';

// ================================================================
// Tallas
// ================================================================

/** Orden canónico de tallas de ropa (igual al API); las numéricas después y el resto al final. */
export const VARIANT_SIZE_ORDER = [
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

const SIZE_RANK = new Map<string, number>(VARIANT_SIZE_ORDER.map((s, i) => [s, i]));

/** Como se guarda: sin espacios y en MAYÚSCULAS; vacío → null. */
export function normalizeSize(size: string | null | undefined): string | null {
  const s = (size ?? '').trim().toUpperCase().replace(/\s+/g, '');
  return s === '' ? null : s;
}

/** Posición para ordenar: lista canónica, luego numéricas (28, 30…) y al final el resto. */
export function sizeRank(size: string | null | undefined): number {
  const s = normalizeSize(size);
  if (s === null) return 1_000_000;
  const known = SIZE_RANK.get(s);
  if (known !== undefined) return known;
  if (/^\d+(\.\d+)?$/.test(s)) return 10_000 + Number(s);
  return 100_000;
}

export function compareSizes(a: string | null | undefined, b: string | null | undefined): number {
  const ra = sizeRank(a);
  const rb = sizeRank(b);
  if (ra !== rb) return ra - rb;
  return (normalizeSize(a) ?? '').localeCompare(normalizeSize(b) ?? '');
}

/** Copia ordenada por talla (no muta la original). */
export function sortSizes<T extends string | null | undefined>(sizes: readonly T[]): T[] {
  return [...sizes].sort(compareSizes);
}

/** Tallas que ofrece el selector de la ficha; cualquier otra se captura con "Otra…". */
export const SIZE_PRESETS: readonly string[] = ['XCH', 'CH', 'M', 'G', 'XL', 'XXL', 'XXXL'];

/** Sugerencias del botón "Agregar talla" del editor de guías. */
export const SIZE_SUGGESTIONS: readonly string[] = ['CH', 'M', 'G', 'XL'];

/** Valor del selector de talla que destapa el campo libre. */
export const OTHER_SIZE_OPTION = '__otra__';

export interface SizeSelectState {
  /** '' = sin talla; una de SIZE_PRESETS; u OTHER_SIZE_OPTION. */
  preset: string;
  /** Texto libre cuando `preset` es OTHER_SIZE_OPTION. */
  other: string;
}

/** Talla guardada → estado del selector (preset u "Otra…" con el texto). */
export function sizeSelectState(size: string | null | undefined): SizeSelectState {
  const s = normalizeSize(size);
  if (s === null) return { preset: '', other: '' };
  if (SIZE_PRESETS.includes(s)) return { preset: s, other: '' };
  return { preset: OTHER_SIZE_OPTION, other: s };
}

/** Estado del selector → talla a guardar (null = sin talla). */
export function sizeFromSelect(state: SizeSelectState): string | null {
  if (state.preset === '') return null;
  if (state.preset === OTHER_SIZE_OPTION) return normalizeSize(state.other);
  return normalizeSize(state.preset);
}

// ================================================================
// Para quién, color y etiquetas
// ================================================================

export const VARIANT_GENDER_LABEL: Record<VariantGender, string> = {
  mujer: 'Mujer',
  hombre: 'Hombre',
  unisex: 'Unisex',
};

export const VARIANT_GENDER_OPTIONS: { value: VariantGender; label: string }[] = VARIANT_GENDERS.map((g) => ({
  value: g,
  label: VARIANT_GENDER_LABEL[g],
}));

/** Texto de "para quién"; vacío cuando no se indicó o no es un valor conocido. */
export function variantGenderLabel(gender: string | null | undefined): string {
  return isVariantGender(gender) ? VARIANT_GENDER_LABEL[gender] : '';
}

const GENDER_RANK: Record<VariantGender, number> = { mujer: 0, hombre: 1, unisex: 2 };

/** Géneros en el orden de la tienda (mujer, hombre, unisex), ya etiquetados; ignora desconocidos. */
export function genderLabels(genders: readonly string[]): string[] {
  return genders
    .filter(isVariantGender)
    .sort((a, b) => GENDER_RANK[a] - GENDER_RANK[b])
    .map((g) => VARIANT_GENDER_LABEL[g]);
}

export const COLOR_HEX_RE = /^#[0-9A-Fa-f]{6}$/;

/** "#abc" → "#AABBCC"; "ff0000" → "#FF0000"; cualquier otra cosa → null. */
export function normalizeColorHex(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (raw === '') return null;
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  if (/^#[0-9A-Fa-f]{3}$/.test(withHash)) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return COLOR_HEX_RE.test(withHash) ? withHash.toUpperCase() : null;
}

/** "Mujer · Rosa · CH"; sin atributos → "Sin atributos". */
export function variantLabel(v: {
  variantGender?: string | null;
  variantColor?: string | null;
  variantSize?: string | null;
}): string {
  const parts = [variantGenderLabel(v.variantGender), (v.variantColor ?? '').trim(), normalizeSize(v.variantSize) ?? ''].filter(
    (p) => p !== '',
  );
  return parts.length > 0 ? parts.join(' · ') : 'Sin atributos';
}

export const SIZE_GUIDE_UNIT_LABEL: Record<SizeGuideUnit, string> = {
  cm: 'Centímetros (cm)',
  in: 'Pulgadas (in)',
};

export const SIZE_GUIDE_UNIT_OPTIONS: { value: SizeGuideUnit; label: string }[] = [
  { value: 'cm', label: SIZE_GUIDE_UNIT_LABEL.cm },
  { value: 'in', label: SIZE_GUIDE_UNIT_LABEL.in },
];

// ================================================================
// Claves (mismas reglas que el DTO del API)
// ================================================================

export const FAMILY_CODE_RE = /^[A-Za-z0-9_-]{2,40}$/;
export const SIZE_GUIDE_COLUMN_KEY_RE = /^[a-z0-9_]{1,40}$/;

/** "Largo de manga (cm)" → "largo_de_manga_cm"; sin acentos ni ñ; máx. 40. */
export function slugColumnKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
    .replace(/_+$/g, '');
}

// ================================================================
// Errores del API
// ================================================================

interface ApiErrorShape {
  response?: { status?: number; data?: { code?: string } };
}

/** Sin la migración 178 el API responde 503 PRD_MIGRATION_PENDING en familias, guías y al escribir variantes. */
export function isMigrationPendingError(err: unknown): boolean {
  const response = (err as ApiErrorShape | null)?.response;
  return response?.status === 503 || response?.data?.code === 'PRD_MIGRATION_PENDING';
}

// ================================================================
// Familia: formulario (texto tal como se teclea) ↔ DTO
// ================================================================

export interface FamilyFormValues {
  code: string;
  name: string;
  nameEn: string;
  /** '' = sin guía. */
  sizeGuideId: string;
  isActive: boolean;
  sortOrder: string;
}

export const EMPTY_FAMILY_FORM: FamilyFormValues = {
  code: '',
  name: '',
  nameEn: '',
  sizeGuideId: '',
  isActive: true,
  sortOrder: '0',
};

export function familyFormFromDto(f: ProductFamily): FamilyFormValues {
  return {
    code: f.code,
    name: f.name,
    nameEn: f.nameEn ?? '',
    sizeGuideId: f.sizeGuideId ?? '',
    isActive: f.isActive,
    sortOrder: String(f.sortOrder ?? 0),
  };
}

/** Mensajes de validación (vacío = se puede guardar). Mismas reglas que CreateProductFamilyDto. */
export function validateFamilyForm(v: FamilyFormValues): string[] {
  const errors: string[] = [];
  if (!FAMILY_CODE_RE.test(v.code.trim())) {
    errors.push('La clave debe tener de 2 a 40 caracteres: letras, números, guion y guion bajo.');
  }
  const name = v.name.trim();
  if (name.length < 1 || name.length > 200) errors.push('El nombre es obligatorio (máximo 200 caracteres).');
  if (v.nameEn.trim().length > 255) errors.push('El nombre en inglés no puede pasar de 255 caracteres.');
  const sortOrder = v.sortOrder.trim();
  if (sortOrder !== '' && !/^\d{1,6}$/.test(sortOrder)) errors.push('El orden debe ser un número entero mayor o igual a 0.');
  return errors;
}

export function toFamilyPayload(v: FamilyFormValues): CreateProductFamilyDto {
  const sortOrder = v.sortOrder.trim();
  return {
    code: v.code.trim().toUpperCase(),
    name: v.name.trim(),
    nameEn: v.nameEn.trim() || null,
    sizeGuideId: v.sizeGuideId || null,
    isActive: v.isActive,
    sortOrder: sortOrder === '' ? 0 : Number(sortOrder),
  };
}

// ================================================================
// Guía de tallas: formulario ↔ DTO y edición de columnas/filas
// ================================================================

export const SIZE_GUIDE_MAX_COLUMNS = 8;
export const SIZE_GUIDE_MAX_ROWS = 30;
export const SIZE_GUIDE_MAX_VALUE_LENGTH = 20;

export interface SizeGuideColumnForm {
  key: string;
  label: string;
  labelEn: string;
  /** La clave se escribió a mano (o viene del servidor): ya no se regenera desde la etiqueta. */
  keyLocked?: boolean;
}

export interface SizeGuideRowForm {
  size: string;
  values: Record<string, string>;
}

export interface SizeGuideFormValues {
  code: string;
  name: string;
  nameEn: string;
  /** '' = sin indicar. */
  gender: VariantGender | '';
  unit: SizeGuideUnit;
  columns: SizeGuideColumnForm[];
  rows: SizeGuideRowForm[];
  notes: string;
  notesEn: string;
  isActive: boolean;
}

/** Columnas con las que arranca una guía nueva (se pueden quitar o renombrar). */
export const DEFAULT_GUIDE_COLUMNS: readonly SizeGuideColumnForm[] = [
  { key: 'pecho', label: 'Pecho', labelEn: 'Chest' },
  { key: 'largo', label: 'Largo', labelEn: 'Length' },
];

export const EMPTY_SIZE_GUIDE_FORM: SizeGuideFormValues = {
  code: '',
  name: '',
  nameEn: '',
  gender: '',
  unit: 'cm',
  columns: [],
  rows: [],
  notes: '',
  notesEn: '',
  isActive: true,
};

/** Formulario de una guía nueva: con las columnas sugeridas y sin tallas. */
export function newSizeGuideForm(): SizeGuideFormValues {
  return { ...EMPTY_SIZE_GUIDE_FORM, columns: DEFAULT_GUIDE_COLUMNS.map((c) => ({ ...c })), rows: [] };
}

export function sizeGuideFormFromDto(g: SizeGuide): SizeGuideFormValues {
  return {
    code: g.code,
    name: g.name,
    nameEn: g.nameEn ?? '',
    gender: isVariantGender(g.gender) ? g.gender : '',
    unit: g.unit === 'in' ? 'in' : 'cm',
    columns: (g.columns ?? []).map((c) => ({ key: c.key, label: c.label, labelEn: c.labelEn ?? '', keyLocked: true })),
    rows: (g.rows ?? []).map((r) => ({ size: r.size, values: { ...(r.values ?? {}) } })),
    notes: g.notes ?? '',
    notesEn: g.notesEn ?? '',
    isActive: g.isActive,
  };
}

/** Mueve el valor de cada fila de la clave `from` a `to` (sin pisar un valor que ya exista en `to`). */
function renameRowValues(rows: SizeGuideRowForm[], from: string, to: string): SizeGuideRowForm[] {
  if (from === to) return rows;
  return rows.map((r) => {
    if (!(from in r.values)) return r;
    const values = { ...r.values };
    const moved = values[from];
    delete values[from];
    if (to !== '' && !(to in values)) values[to] = moved;
    return { ...r, values };
  });
}

/** Cambia la etiqueta; si la clave no se tecleó a mano, se regenera desde la etiqueta. */
export function updateColumnLabel(form: SizeGuideFormValues, index: number, label: string): SizeGuideFormValues {
  const current = form.columns[index];
  if (!current) return form;
  const key = current.keyLocked ? current.key : slugColumnKey(label);
  const columns = form.columns.map((c, i) => (i === index ? { ...c, label, key } : c));
  return { ...form, columns, rows: renameRowValues(form.rows, current.key, key) };
}

/** Clave escrita a mano: se limpia a minúsculas/números/_ y deja de regenerarse. */
export function updateColumnKey(form: SizeGuideFormValues, index: number, key: string): SizeGuideFormValues {
  const current = form.columns[index];
  if (!current) return form;
  const clean = key.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 40);
  const columns = form.columns.map((c, i) => (i === index ? { ...c, key: clean, keyLocked: true } : c));
  return { ...form, columns, rows: renameRowValues(form.rows, current.key, clean) };
}

export function updateColumnLabelEn(form: SizeGuideFormValues, index: number, labelEn: string): SizeGuideFormValues {
  return { ...form, columns: form.columns.map((c, i) => (i === index ? { ...c, labelEn } : c)) };
}

/** Agrega una columna vacía (null si ya hay 8). */
export function addColumn(form: SizeGuideFormValues): SizeGuideFormValues | null {
  if (form.columns.length >= SIZE_GUIDE_MAX_COLUMNS) return null;
  return { ...form, columns: [...form.columns, { key: '', label: '', labelEn: '' }] };
}

/** Quita la columna y sus valores de todas las tallas. */
export function removeColumn(form: SizeGuideFormValues, index: number): SizeGuideFormValues {
  const current = form.columns[index];
  if (!current) return form;
  const rows = form.rows.map((r) => {
    if (!(current.key in r.values)) return r;
    const values = { ...r.values };
    delete values[current.key];
    return { ...r, values };
  });
  return { ...form, columns: form.columns.filter((_, i) => i !== index), rows };
}

/** Agrega una talla (normalizada) con sus valores vacíos; null si está vacía, repetida o ya hay 30. */
export function addSizeRow(form: SizeGuideFormValues, size: string): SizeGuideFormValues | null {
  const normalized = normalizeSize(size);
  if (normalized === null) return null;
  if (form.rows.length >= SIZE_GUIDE_MAX_ROWS) return null;
  if (form.rows.some((r) => normalizeSize(r.size) === normalized)) return null;
  const values = Object.fromEntries(form.columns.map((c) => [c.key, '']));
  return { ...form, rows: [...form.rows, { size: normalized, values }] };
}

export function removeRow(form: SizeGuideFormValues, index: number): SizeGuideFormValues {
  return { ...form, rows: form.rows.filter((_, i) => i !== index) };
}

export function updateRowSize(form: SizeGuideFormValues, index: number, size: string): SizeGuideFormValues {
  return { ...form, rows: form.rows.map((r, i) => (i === index ? { ...r, size: size.toUpperCase() } : r)) };
}

export function updateRowValue(form: SizeGuideFormValues, index: number, key: string, value: string): SizeGuideFormValues {
  return {
    ...form,
    rows: form.rows.map((r, i) => (i === index ? { ...r, values: { ...r.values, [key]: value } } : r)),
  };
}

/** Filas en orden de talla (para "Ordenar tallas" del editor). */
export function sortRows(form: SizeGuideFormValues): SizeGuideFormValues {
  return { ...form, rows: [...form.rows].sort((a, b) => compareSizes(a.size, b.size)) };
}

/**
 * Mensajes de validación (vacío = se puede guardar). Mismas reglas que
 * CreateSizeGuideDto y normalizeSizeGuideContent del API: sin claves ni tallas
 * repetidas, valores de máximo 20 caracteres, 8 columnas y 30 tallas a lo más.
 */
export function validateSizeGuideForm(v: SizeGuideFormValues): string[] {
  const errors: string[] = [];
  if (!FAMILY_CODE_RE.test(v.code.trim())) {
    errors.push('La clave debe tener de 2 a 40 caracteres: letras, números, guion y guion bajo.');
  }
  const name = v.name.trim();
  if (name.length < 1 || name.length > 120) errors.push('El nombre es obligatorio (máximo 120 caracteres).');
  if (v.nameEn.trim().length > 120) errors.push('El nombre en inglés no puede pasar de 120 caracteres.');

  if (v.columns.length > SIZE_GUIDE_MAX_COLUMNS) errors.push(`Máximo ${SIZE_GUIDE_MAX_COLUMNS} columnas de medidas.`);
  const seenKeys = new Set<string>();
  v.columns.forEach((c, i) => {
    const key = c.key.trim().toLowerCase();
    const label = c.label.trim();
    const where = label || `columna ${i + 1}`;
    if (label.length < 1 || label.length > 60) errors.push(`La etiqueta de la columna ${i + 1} es obligatoria (máximo 60 caracteres).`);
    if (c.labelEn.trim().length > 60) errors.push(`La etiqueta en inglés de "${where}" no puede pasar de 60 caracteres.`);
    if (!SIZE_GUIDE_COLUMN_KEY_RE.test(key)) {
      errors.push(`La clave de "${where}" solo admite minúsculas, números y guion bajo (máximo 40).`);
    } else if (seenKeys.has(key)) {
      errors.push(`La columna "${key}" está repetida.`);
    }
    seenKeys.add(key);
  });

  if (v.rows.length > SIZE_GUIDE_MAX_ROWS) errors.push(`Máximo ${SIZE_GUIDE_MAX_ROWS} tallas.`);
  const seenSizes = new Set<string>();
  v.rows.forEach((r, i) => {
    const size = normalizeSize(r.size);
    if (size === null) {
      errors.push(`La talla del renglón ${i + 1} está vacía.`);
      return;
    }
    if (size.length > 20) errors.push(`La talla "${size}" no puede pasar de 20 caracteres.`);
    if (seenSizes.has(size)) errors.push(`La talla "${size}" está repetida.`);
    seenSizes.add(size);
    for (const c of v.columns) {
      const text = (r.values[c.key] ?? '').trim();
      if (text.length > SIZE_GUIDE_MAX_VALUE_LENGTH) {
        errors.push(`El valor de "${c.label.trim() || c.key}" en la talla ${size} es demasiado largo (máximo 20).`);
      }
    }
  });

  if (v.notes.trim().length > 1000) errors.push('Las notas no pueden pasar de 1,000 caracteres.');
  if (v.notesEn.trim().length > 1000) errors.push('Las notas en inglés no pueden pasar de 1,000 caracteres.');
  return errors;
}

/**
 * DTO completo para POST o PATCH: clave en MAYÚSCULAS, tallas normalizadas y en
 * orden, valores recortados y SOLO de las columnas que existen; vacíos → null.
 */
export function toSizeGuidePayload(v: SizeGuideFormValues): CreateSizeGuideDto {
  const columns = v.columns.map((c) => ({
    key: c.key.trim().toLowerCase(),
    label: c.label.trim(),
    labelEn: c.labelEn.trim() || null,
  }));
  const keys = columns.map((c) => c.key);
  const rows = v.rows
    .map((r) => ({ size: normalizeSize(r.size), values: r.values }))
    .filter((r): r is { size: string; values: Record<string, string> } => r.size !== null)
    .map((r) => ({ size: r.size, values: Object.fromEntries(keys.map((k) => [k, (r.values[k] ?? '').trim()])) }))
    .sort((a, b) => compareSizes(a.size, b.size));
  return {
    code: v.code.trim().toUpperCase(),
    name: v.name.trim(),
    nameEn: v.nameEn.trim() || null,
    gender: v.gender === '' ? null : v.gender,
    unit: v.unit,
    columns,
    rows,
    notes: v.notes.trim() || null,
    notesEn: v.notesEn.trim() || null,
    isActive: v.isActive,
  };
}

/** Una guía sin filas no se muestra en la tienda. */
export const guideHasMeasures = (g: Pick<SizeGuide, 'rows'> | null | undefined): boolean =>
  !!g && Array.isArray(g.rows) && g.rows.length > 0;
