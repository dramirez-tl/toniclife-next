// labels.ts — textos en español y mapeos del catálogo admin (ficha, listado, salud).

import type {
  CatalogAdminSortBy,
  CatalogBulkAction,
  StoreCountryCode,
} from '@/services/products-admin.service';

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

export const KIT_LIKE_TYPES = ['kit', 'pack'];
export const isKitLikeType = (productType: string | null | undefined): boolean =>
  !!productType && KIT_LIKE_TYPES.includes(productType);

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

/**
 * Tipos que lista la pestaña Productos (kits y promociones tienen pestaña propia).
 * DEBE ser subconjunto de CATALOG_PRODUCT_TYPES del API (`@IsIn` → 400 si no):
 * `virtual` NO existe ni en el API ni en el CHECK de BD. Lo fija lib/labels.test.ts.
 */
export const PRODUCTS_TAB_TYPES = ['finished_good', 'pack', 'raw_material', 'service'];

/** Tipos que ofrece el alta de producto (mismos de la pestaña: la BD rechaza cualquier otro). */
export const CREATE_PRODUCT_TYPES = PRODUCTS_TAB_TYPES;

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
// Zonas de precio (países SIN tienda propia con lista de precios propia)
// ================================
/**
 * Frontera MX-USA (`FN`) es un pseudo-país: país fiscal MX, moneda MXN, ~16 mil
 * cuentas que compran en la tienda de México con SU lista en `product_prices`.
 * Es un país activo más en `/config/countries/active`, así que la ficha ya lo
 * ofrece para capturar; aquí solo se le da nombre y se liga a su tienda.
 */
export const PRICE_ZONE_NAME: Record<string, string> = { FN: 'Frontera MX-USA' };

/** País (tienda) al que pertenece cada zona de precio. */
const PRICE_ZONE_COUNTRY: Record<string, StoreCountryCode> = { FN: 'MX' };

/** Zonas de precio que viven dentro de la tienda de un país (`MX` → `['FN']`). */
export const priceZonesOf = (country: StoreCountryCode): string[] =>
  Object.entries(PRICE_ZONE_COUNTRY)
    .filter(([, parent]) => parent === country)
    .map(([zone]) => zone);

export const isPriceZone = (code: string | null | undefined): boolean =>
  !!code && code.toUpperCase() in PRICE_ZONE_COUNTRY;

/** Nombre de la tienda (país) en la que compran las cuentas de una zona; `null` si no es zona. */
export const priceZoneStoreName = (code: string | null | undefined): string | null => {
  const parent = code ? PRICE_ZONE_COUNTRY[code.toUpperCase()] : undefined;
  return parent ? countryName(parent) : null;
};

/**
 * Rótulo de un país en la captura de precios: una zona se distingue del país al
 * que pertenece ("Frontera MX-USA (zona de México)"); el resto, su nombre tal cual.
 */
export function priceCountryLabel(country: { code: string; name: string }): string {
  const code = country.code.toUpperCase();
  const parent = PRICE_ZONE_COUNTRY[code];
  if (!parent) return country.name;
  return `${PRICE_ZONE_NAME[code] ?? country.name} (zona de ${countryName(parent)})`;
}

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
  // Misma etiqueta que el CSV de salud del API (ISSUE_LABEL_ES). No bloquea la tienda: avisa.
  suspicious_low_price: { label: 'Precio sospechosamente bajo', short: 'Precio muy bajo', section: 'precios' },
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
  // Producto vendible en la tienda del país SIN fila de precio para una zona de ese
  // país (`zone_price_missing:FN`): la cuenta de zona lo paga con el precio de
  // respaldo y sin puntos. Se corrige capturando la fila de la zona en Precios.
  zone_price_missing: { label: 'Sin precio de zona', short: 'Precio de zona', section: 'precios' },
  // Reglas de kits (contrato de kits: catalog-health.lib.ts del API).
  kit_recipe_empty: { label: 'Kit activo que se arma sin receta', short: 'Sin receta', section: 'componentes' },
  kit_no_position: { label: 'Kit de inscripción sin posición', short: 'Sin posición', section: 'basica' },
  kit_phantom_own_stock: { label: 'Existencia propia que ninguna venta usa', short: 'Existencia fantasma', section: 'inventario' },
};

/** `no_public_price:MX` → { base: 'no_public_price', country: 'MX' } (en reglas de zona el sufijo es la zona: `FN`). */
export function splitIssueCode(code: string): { base: string; country: string | null } {
  const [base, country] = code.split(':');
  return { base, country: country ? country.toUpperCase() : null };
}

export function healthIssueMeta(code: string): HealthIssueMeta {
  const { base } = splitIssueCode(code);
  return HEALTH_ISSUE_META[base] ?? { label: code, short: code, section: 'basica' };
}

export function healthIssueLabel(code: string, short = false): string {
  const { base, country } = splitIssueCode(code);
  const meta = healthIssueMeta(code);
  const text = short ? meta.short : meta.label;
  if (!country) return text;
  // El sufijo de una regla de zona es la zona: se muestra con su nombre ("Frontera MX-USA").
  const suffix = ZONE_SCOPED_ISSUES.has(base) ? (PRICE_ZONE_NAME[country] ?? country) : country;
  return `${text} (${suffix})`;
}

/** Códigos base que ofrece el filtro "Le falta…" del listado. */
export const HEALTH_ISSUE_BASES: string[] = Object.keys(HEALTH_ISSUE_META);

/** Reglas que se evalúan por país (llegan como `<base>:<CC>`). */
export const COUNTRY_SCOPED_ISSUES = new Set(['no_public_price', 'zero_price', 'price_incoherent', 'suspicious_low_price']);

/** Reglas que se evalúan por ZONA de precio del país (llegan como `<base>:<ZONA>`, p. ej. `zone_price_missing:FN`). */
export const ZONE_SCOPED_ISSUES = new Set(['zone_price_missing']);

/** `false` = la regla no aplica en ese país (regla de zona en un país sin zonas): ni filtro ni tarjeta. */
export const issueAppliesTo = (base: string, country: StoreCountryCode): boolean =>
  !ZONE_SCOPED_ISSUES.has(base) || priceZonesOf(country).length > 0;

/** Códigos base que ofrece el filtro "Le falta…" para el país elegido. */
export const healthIssueBasesFor = (country: StoreCountryCode): string[] =>
  HEALTH_ISSUE_BASES.filter((base) => issueAppliesTo(base, country));

/** Código completo de una regla para el país elegido (regla de zona: la zona de ese país). */
export function issueCodeFor(base: string, country: StoreCountryCode): string {
  if (COUNTRY_SCOPED_ISSUES.has(base)) return `${base}:${country}`;
  if (ZONE_SCOPED_ISSUES.has(base)) {
    const [zone] = priceZonesOf(country);
    return zone ? `${base}:${zone}` : base;
  }
  return base;
}

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
  // Kits (product-history.lib del API): receta y reglas de bono de inscripción.
  components: 'Componentes',
  bonus: 'Bono de inscripción',
};

/** Orden de los filtros del historial (todas las fuentes que manda el API). */
export const HISTORY_SOURCES: string[] = Object.keys(HISTORY_SOURCE_LABEL);

// ================================
// Avisos de coherencia de precios (price-coherence.lib del API)
// ================================
export const PRICE_WARNING_LABEL: Record<string, string> = {
  PUBLIC_LT_DISTRIBUTOR: 'El precio público es menor que el de distribuidor.',
  PREFERRED_GT_PUBLIC: 'El precio preferente es mayor que el público.',
  ZERO_PRICE: 'Hay un precio en cero.',
};

// ================================
// Listado: orden y acciones masivas (valores que VALIDA el API; los fija labels.test.ts)
// ================================
/** Columnas ordenables del listado: subconjunto de CATALOG_SORT_FIELDS del API. */
export const CATALOG_LIST_SORT_KEYS: CatalogAdminSortBy[] = ['name', 'code', 'price', 'score', 'updatedAt'];

export interface BulkActionMeta {
  action: CatalogBulkAction;
  label: string;
  /** Verbo + complemento para el diálogo: "Ocultar de la tienda". */
  scope: string;
  needsDelete?: boolean;
  destructive?: boolean;
  confirmText?: string;
  note?: string;
}

/** Las acciones que APAGAN algo nunca tocan un kit de inscripción por lote (el API los omite con `enrollment_kit`). */
const ENROLLMENT_KIT_BULK_NOTE = 'Los kits de inscripción se omiten: se administran desde Kits.';

export const BULK_ACTIONS: BulkActionMeta[] = [
  { action: 'show_store', label: 'Mostrar en tienda', scope: 'Mostrar en la tienda', note: 'Se omiten los tipos que la tienda no vende (solo productos y paquetes).' },
  { action: 'hide_store', label: 'Ocultar de la tienda', scope: 'Ocultar de la tienda', destructive: true, note: `Solo afecta a los productos seleccionados en esta página. ${ENROLLMENT_KIT_BULK_NOTE}` },
  { action: 'enable_pos', label: 'Habilitar en POS', scope: 'Habilitar en el POS' },
  { action: 'disable_pos', label: 'Quitar del POS', scope: 'Quitar del POS', destructive: true, note: `Solo afecta a los productos seleccionados en esta página. ${ENROLLMENT_KIT_BULK_NOTE}` },
  { action: 'feature', label: 'Destacar', scope: 'Marcar como destacados' },
  { action: 'unfeature', label: 'Quitar destacado', scope: 'Quitar el destacado de' },
  { action: 'set_category', label: 'Cambiar categoría', scope: 'Cambiar la categoría de' },
  { action: 'activate', label: 'Activar', scope: 'Activar', needsDelete: true },
  {
    action: 'deactivate',
    label: 'Desactivar',
    scope: 'Desactivar',
    needsDelete: true,
    destructive: true,
    confirmText: 'DESACTIVAR',
    note: `Dejarán de venderse en tienda y POS. Se pueden reactivar cuando quieras. ${ENROLLMENT_KIT_BULK_NOTE}`,
  },
];

export const BULK_SKIP_REASON_LABEL: Record<string, string> = {
  enrollment_kit: 'kit de inscripción',
  not_sellable_type: 'tipo que la tienda no vende',
  not_found: 'ya no existe',
  unchanged: 'ya estaba así',
};
