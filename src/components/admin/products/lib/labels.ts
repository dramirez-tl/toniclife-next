// labels.ts — textos en español y mapeos del catálogo admin (ficha, listado, salud).

import type { StoreCountryCode } from '@/services/products-admin.service';

/** sessionStorage: filtros del listado, para que "Regresar" en la ficha vuelva a ellos. */
export const PRODUCTS_LIST_RETURN_KEY = 'tl_admin_products_list_qs';

// ================================
// Secciones de la ficha (?seccion=)
// ================================
export type ProductSectionId =
  | 'basica'
  | 'contenido'
  | 'traducciones'
  | 'tienda'
  | 'seo'
  | 'imagenes'
  | 'precios'
  | 'fiscal'
  | 'componentes'
  | 'inventario'
  | 'mlm'
  | 'historial';

export const PRODUCT_SECTIONS: { id: ProductSectionId; label: string; description: string }[] = [
  { id: 'basica', label: 'Información básica', description: 'Nombre, clave, código de barras, marca y tipo' },
  { id: 'contenido', label: 'Contenido (español)', description: 'Descripciones, beneficios, ingredientes y modo de uso' },
  { id: 'traducciones', label: 'Traducciones (inglés)', description: 'Textos para la tienda en inglés' },
  { id: 'tienda', label: 'Clasificación y tienda', description: 'Categoría, visibilidad por canal y dónde se vende' },
  { id: 'seo', label: 'SEO y URL', description: 'URL pública, redirecciones y metadatos' },
  { id: 'imagenes', label: 'Imágenes y ficha técnica', description: 'Galería, orden, texto alternativo y PDF interno' },
  { id: 'precios', label: 'Precios', description: 'Precios por país y tipo, vigencias y cambios programados' },
  { id: 'fiscal', label: 'Fiscal', description: 'Claves SAT, exención y reglas fiscales por país' },
  { id: 'componentes', label: 'Componentes', description: 'Composición de kits, paquetes y promociones' },
  { id: 'inventario', label: 'Inventario', description: 'Control de existencias, alertas y stock por sucursal' },
  { id: 'mlm', label: 'MLM', description: 'Puntos y valor de negocio (solo lectura)' },
  { id: 'historial', label: 'Historial', description: 'Quién cambió qué y cuándo' },
];

export const SECTION_LABEL: Record<ProductSectionId, string> = Object.fromEntries(
  PRODUCT_SECTIONS.map((s) => [s.id, s.label]),
) as Record<ProductSectionId, string>;

export function isProductSectionId(v: string | null | undefined): v is ProductSectionId {
  return !!v && PRODUCT_SECTIONS.some((s) => s.id === v);
}

/** Secciones visibles en el alta (el resto necesita que el producto exista). */
export const CREATE_SECTIONS: ProductSectionId[] = ['basica', 'contenido', 'tienda', 'inventario'];

// ================================
// Tipos de producto
// ================================
export const PRODUCT_TYPE_LABEL: Record<string, string> = {
  finished_good: 'Producto terminado',
  raw_material: 'Materia prima',
  kit: 'Kit de inscripción',
  pack: 'Paquete',
  promotional: 'Promocional',
  virtual: 'Virtual',
  service: 'Servicio',
};

export const productTypeLabel = (type: string | null | undefined): string =>
  (type && PRODUCT_TYPE_LABEL[type]) || type || '—';

/** Tipos que lista la pestaña Productos (kits y promociones tienen pestaña propia). */
export const PRODUCTS_TAB_TYPES = ['finished_good', 'pack', 'raw_material', 'virtual', 'service'];

/** Tipos que la tienda pública puede vender (candado de tienda, contrato §1.2). */
export const SELLABLE_TYPES = ['finished_good', 'pack'];

// ================================
// Países
// ================================
export const STORE_COUNTRY_NAME: Record<StoreCountryCode, string> = {
  MX: 'México',
  US: 'Estados Unidos',
  CO: 'Colombia',
  GT: 'Guatemala',
};

export const STORE_COUNTRY_CURRENCY: Record<StoreCountryCode, string> = {
  MX: 'MXN',
  US: 'USD',
  CO: 'COP',
  GT: 'GTQ',
};

export const countryName = (code: string): string =>
  STORE_COUNTRY_NAME[code as StoreCountryCode] ?? code;

// ================================
// Por qué un producto no sale en la tienda
// ================================
export const STOREFRONT_REASON_LABEL: Record<string, string> = {
  inactive: 'el producto está inactivo',
  hidden: 'no está marcado como visible en tienda',
  not_sellable_type: 'su tipo no se vende en la tienda (solo productos y paquetes)',
  enrollment_kit: 'es un kit de inscripción (se vende en el registro de distribuidores)',
  no_slug: 'no tiene URL',
  no_public_price: 'no tiene precio público vigente',
  out_of_stock: 'no tiene existencias (se muestra como Agotado)',
  country_not_ready: 'la tienda de ese país aún no está abierta',
};

/** Sección de la ficha donde se corrige cada razón. */
export const STOREFRONT_REASON_SECTION: Record<string, ProductSectionId> = {
  inactive: 'tienda',
  hidden: 'tienda',
  not_sellable_type: 'basica',
  enrollment_kit: 'basica',
  no_slug: 'seo',
  no_public_price: 'precios',
  out_of_stock: 'inventario',
};

export const storefrontReasonLabel = (reason: string): string =>
  STOREFRONT_REASON_LABEL[reason] ?? reason;

/** `out_of_stock` es disponibilidad, no candado: el producto sí se lista (Agotado). */
export const isBlockingReason = (reason: string): boolean => reason !== 'out_of_stock';

// ================================
// Salud del catálogo
// ================================
export interface HealthIssueMeta {
  label: string;
  /** Texto corto para chips. */
  short: string;
  section: ProductSectionId;
}

const HEALTH_ISSUE_META: Record<string, HealthIssueMeta> = {
  no_image: { label: 'Sin imagen', short: 'Imagen', section: 'imagenes' },
  no_description: { label: 'Sin descripción', short: 'Descripción', section: 'contenido' },
  no_category: { label: 'Sin categoría', short: 'Categoría', section: 'tienda' },
  no_public_price: { label: 'Sin precio público', short: 'Precio público', section: 'precios' },
  zero_price: { label: 'Precio en cero', short: 'Precio en cero', section: 'precios' },
  price_incoherent: { label: 'Precios incoherentes', short: 'Precios incoherentes', section: 'precios' },
  no_tax_rule: { label: 'Sin regla fiscal', short: 'Regla fiscal', section: 'fiscal' },
  no_sat_code: { label: 'Sin clave SAT', short: 'Clave SAT', section: 'fiscal' },
  no_en_name: { label: 'Sin nombre en inglés', short: 'Nombre EN', section: 'traducciones' },
  no_en_description: { label: 'Sin descripción en inglés', short: 'Descripción EN', section: 'traducciones' },
  no_seo: { label: 'Sin SEO', short: 'SEO', section: 'seo' },
  no_slug: { label: 'Sin URL', short: 'URL', section: 'seo' },
  slug_off_convention: { label: 'URL fuera de convención', short: 'URL fuera de convención', section: 'seo' },
  name_uppercase: { label: 'Nombre en MAYÚSCULAS', short: 'Nombre en mayúsculas', section: 'basica' },
  name_untrimmed: { label: 'Nombre con espacios sobrantes', short: 'Espacios en el nombre', section: 'basica' },
  duplicate_name: { label: 'Nombre duplicado', short: 'Nombre duplicado', section: 'basica' },
  components_missing: { label: 'Sin componentes', short: 'Componentes', section: 'componentes' },
  visible_not_sellable_type: {
    label: 'Visible pero no se puede vender',
    short: 'Tipo no vendible',
    section: 'tienda',
  },
};

/** `no_public_price:MX` → { base: 'no_public_price', country: 'MX' }. */
export function splitIssueCode(code: string): { base: string; country: string | null } {
  const [base, country] = code.split(':');
  return { base, country: country ? country.toUpperCase() : null };
}

export function healthIssueMeta(code: string): HealthIssueMeta {
  const { base } = splitIssueCode(code);
  return HEALTH_ISSUE_META[base] ?? { label: code, short: code, section: 'basica' };
}

export function healthIssueLabel(code: string, short = false): string {
  const { country } = splitIssueCode(code);
  const meta = healthIssueMeta(code);
  const text = short ? meta.short : meta.label;
  return country ? `${text} (${country})` : text;
}

/** Códigos base que ofrece el filtro "Le falta…" del listado. */
export const HEALTH_ISSUE_BASES: string[] = Object.keys(HEALTH_ISSUE_META);

/** Reglas que se evalúan por país (llegan como `<base>:<CC>`). */
export const COUNTRY_SCOPED_ISSUES = new Set(['no_public_price', 'zero_price', 'price_incoherent']);

/** Código completo de una regla para el país elegido. */
export const issueCodeFor = (base: string, country: StoreCountryCode): string =>
  COUNTRY_SCOPED_ISSUES.has(base) ? `${base}:${country}` : base;

export function scoreTone(score: number | null): 'good' | 'warn' | 'bad' | 'none' {
  if (score === null) return 'none';
  if (score >= 85) return 'good';
  if (score >= 60) return 'warn';
  return 'bad';
}

export const SCORE_TONE_CLASS: Record<ReturnType<typeof scoreTone>, string> = {
  good: 'bg-emerald-100 text-emerald-800',
  warn: 'bg-amber-100 text-amber-800',
  bad: 'bg-red-100 text-red-800',
  none: 'bg-gray-100 text-gray-600',
};

// ================================
// Historial
// ================================
export const HISTORY_SOURCE_LABEL: Record<string, string> = {
  product: 'Producto',
  price: 'Precio',
  image: 'Imagen',
  content: 'Contenido',
};

// ================================
// Avisos de coherencia de precios (price-coherence.lib del API)
// ================================
export const PRICE_WARNING_LABEL: Record<string, string> = {
  PUBLIC_LT_DISTRIBUTOR: 'El precio público es menor que el de distribuidor.',
  PREFERRED_GT_PUBLIC: 'El precio preferente es mayor que el público.',
  ZERO_PRICE: 'Hay un precio en cero.',
};
