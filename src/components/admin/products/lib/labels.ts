// labels.ts — textos en español y mapeos del catálogo admin (ficha, listado, salud).

import type {
  CatalogAdminSortBy,
  CatalogBulkAction,
  StoreCountryCode,
} from '@/services/products-admin.service';
import type { ProductOnlineAudience } from '@/types/product';

/** sessionStorage: filtros del listado, para que "Regresar" en la ficha vuelva a ellos. */
export const PRODUCTS_LIST_RETURN_KEY = 'tl_admin_products_list_qs';

// ================================
// Secciones de la ficha (?seccion=)
// ================================
export type ProductSectionId =
  | 'basica'
  | 'kit'
  | 'contenido'
  | 'traducciones'
  | 'tienda'
  | 'seo'
  | 'imagenes'
  | 'precios'
  | 'fiscal'
  | 'componentes'
  | 'inventario'
  | 'ventas'
  | 'mlm'
  | 'historial';

export const PRODUCT_SECTIONS: { id: ProductSectionId; label: string; description: string }[] = [
  { id: 'basica', label: 'Información básica', description: 'Nombre, clave, código de barras, marca y tipo' },
  // Solo kits y paquetes (contrato de kits §5.2): cómo se surte, inscripción, canales, bono y "listo para vender".
  { id: 'kit', label: 'Kit', description: 'Cómo se surte, inscripción, dónde se ofrece, bono y si está listo para vender' },
  { id: 'contenido', label: 'Contenido (español)', description: 'Descripciones, beneficios, ingredientes y modo de uso' },
  { id: 'traducciones', label: 'Traducciones (inglés)', description: 'Textos para la tienda en inglés' },
  { id: 'tienda', label: 'Clasificación y tienda', description: 'Categoría, visibilidad por canal y dónde se vende' },
  { id: 'seo', label: 'SEO y URL', description: 'URL pública, redirecciones y metadatos' },
  { id: 'imagenes', label: 'Imágenes y ficha técnica', description: 'Galería, orden, texto alternativo y PDF interno' },
  { id: 'precios', label: 'Precios', description: 'Precios por país y tipo, vigencias y cambios programados' },
  { id: 'fiscal', label: 'Fiscal', description: 'Claves SAT, exención y reglas fiscales por país' },
  { id: 'componentes', label: 'Componentes', description: 'Composición de kits, paquetes y promociones' },
  { id: 'inventario', label: 'Inventario', description: 'Control de existencias, alertas y stock por sucursal' },
  // Solo kits y paquetes: ventas por periodo de negocio (26 → 25).
  { id: 'ventas', label: 'Ventas', description: 'Cobradas y canceladas por periodo, canal y sucursal' },
  { id: 'mlm', label: 'MLM', description: 'Puntos y valor de negocio (solo lectura)' },
  { id: 'historial', label: 'Historial', description: 'Quién cambió qué y cuándo' },
];

/** Secciones que solo tienen sentido en kits y paquetes. */
export const KIT_ONLY_SECTIONS: ProductSectionId[] = ['kit', 'ventas'];
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

/** Alta de un kit (`/admin/productos/nuevo?tipo=kit`): además la sección Kit. */
export const CREATE_KIT_SECTIONS: ProductSectionId[] = ['basica', 'kit', 'contenido', 'tienda', 'inventario'];

/** Valor de `?tipo=` que preselecciona el tipo en el alta (hoy solo kit). */
export const CREATE_TYPE_PARAM: Record<string, string> = { kit: 'kit' };

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
  // Boleto de evento (mig 154): lo crea el módulo Eventos, no el alta de producto.
  event: 'Evento (boleto)',
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
// Audiencia en línea (products.online_audience, mig 177 — "dos tiendas", Bloque 2, 28-oct-2026)
// ================================
export const ONLINE_AUDIENCE_LABEL: Record<ProductOnlineAudience, string> = {
  none: 'No se vende en línea',
  members: 'Distribuidores',
  public: 'Público',
};

/** Opciones de los selectores (ficha, filtro del listado y acción masiva). */
export const ONLINE_AUDIENCE_OPTIONS: { value: ProductOnlineAudience; label: string }[] = [
  { value: 'members', label: ONLINE_AUDIENCE_LABEL.members },
  { value: 'public', label: ONLINE_AUDIENCE_LABEL.public },
  { value: 'none', label: ONLINE_AUDIENCE_LABEL.none },
];

export const ONLINE_AUDIENCE_HELP: Record<ProductOnlineAudience, string> = {
  members: 'Solo distribuidores y clientes con sesión lo ven y lo compran.',
  public: 'Cualquiera lo ve y lo compra en la tienda pública; los distribuidores también.',
  none: 'No aparece en la tienda en línea (sigue en POS si está habilitado).',
};

/** Insignia del encabezado de la ficha (no se pinta en kits de inscripción). */
export const ONLINE_AUDIENCE_BADGE: Record<ProductOnlineAudience, { label: string; variant: 'success' | 'info' | 'secondary' }> = {
  public: { label: 'En línea: público', variant: 'success' },
  members: { label: 'En línea: distribuidores', variant: 'info' },
  none: { label: 'No se vende en línea', variant: 'secondary' },
};

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
  // Audiencia (Bloque 2): `not_online` bloquea; `members_only` solo informa (sí se lista, con sesión).
  not_online: 'está marcado como "No se vende en línea"',
  members_only: 'solo lo ven distribuidores y clientes con sesión',
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
  not_online: 'tienda',
  members_only: 'tienda',
};

export const storefrontReasonLabel = (reason: string): string =>
  STOREFRONT_REASON_LABEL[reason] ?? reason;

/**
 * `out_of_stock` es disponibilidad, no candado: el producto sí se lista (Agotado).
 * `members_only` tampoco bloquea: se lista para distribuidores y clientes con sesión.
 */
export const isBlockingReason = (reason: string): boolean => reason !== 'out_of_stock' && reason !== 'members_only';

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
  // Audiencia (Bloque 2): marcado para el PÚBLICO sin precio público vigente en el país
  // (la vitrina pública no lo muestra) o sin foto (muestra el monograma). No bloquean.
  public_no_public_price: { label: 'Al público sin precio público', short: 'Público sin precio', section: 'precios' },
  public_no_image: { label: 'Al público sin imagen', short: 'Público sin imagen', section: 'imagenes' },
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
export const COUNTRY_SCOPED_ISSUES = new Set([
  'no_public_price',
  'zero_price',
  'price_incoherent',
  'suspicious_low_price',
  'public_no_public_price',
]);

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

/**
 * Activar o habilitar en POS NO mete el producto al POS de una sucursal: el POS
 * solo muestra los productos con fila de existencias en esa sucursal
 * (Inventario → Catálogo por sucursal). Incidente 28-sep-2026 (427/404/428).
 */
export const BULK_POS_BRANCH_HINT =
  'Para que aparezcan en el POS de una sucursal nueva usa Inventario → Catálogo por sucursal (o la acción Habilitar en sucursal…).';

export const BULK_ACTIONS: BulkActionMeta[] = [
  { action: 'show_store', label: 'Mostrar en tienda', scope: 'Mostrar en la tienda', note: 'Se omiten los tipos que la tienda no vende (solo productos y paquetes).' },
  { action: 'hide_store', label: 'Ocultar de la tienda', scope: 'Ocultar de la tienda', destructive: true, note: `Solo afecta a los productos seleccionados en esta página. ${ENROLLMENT_KIT_BULK_NOTE}` },
  { action: 'enable_pos', label: 'Habilitar en POS', scope: 'Habilitar en el POS', note: `Solo afecta a los productos seleccionados en esta página. ${BULK_POS_BRANCH_HINT}` },
  { action: 'disable_pos', label: 'Quitar del POS', scope: 'Quitar del POS', destructive: true, note: `Solo afecta a los productos seleccionados en esta página. ${ENROLLMENT_KIT_BULK_NOTE}` },
  { action: 'feature', label: 'Destacar', scope: 'Marcar como destacados' },
  { action: 'unfeature', label: 'Quitar destacado', scope: 'Quitar el destacado de' },
  { action: 'set_category', label: 'Cambiar categoría', scope: 'Cambiar la categoría de' },
  {
    action: 'set_audience',
    label: 'Cambiar a quién se vende en línea',
    scope: 'Cambiar la audiencia en línea de',
    note: 'Se omiten los kits de inscripción y los tipos que la tienda no vende (solo productos y paquetes).',
  },
  { action: 'activate', label: 'Activar', scope: 'Activar', needsDelete: true, note: `Solo afecta a los productos seleccionados en esta página. ${BULK_POS_BRANCH_HINT}` },
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
  // `activate` sobre un kit/paquete con faltantes críticos (API §4.2 KIT_NOT_READY).
  kit_not_ready: 'kit con faltantes críticos (no está listo para vender)',
  not_found: 'ya no existe',
  unchanged: 'ya estaba así',
};

/** Plural de las razones que lo tienen ("2 ya estaban así"); las demás no cambian. */
const BULK_SKIP_REASON_LABEL_PLURAL: Record<string, string> = {
  enrollment_kit: 'kits de inscripción',
  not_found: 'ya no existen',
  unchanged: 'ya estaban así',
};

export interface BulkResultToast {
  tone: 'success' | 'warning' | 'info';
  message: string;
  /** Segunda línea del toast: cómo llevar los productos al POS de una sucursal nueva. */
  hint?: string;
}

/**
 * Texto del toast tras una acción masiva. `updated` cuenta SOLO las filas que
 * cambiaron (el API reporta `unchanged` las que ya estaban así): si nada cambió
 * y todo lo omitido "ya estaba así", se dice tal cual en vez de "0 actualizados".
 * Activar y Habilitar en POS llevan la pista al catálogo por sucursal.
 */
export function bulkResultMessage(
  meta: Pick<BulkActionMeta, 'action' | 'label'>,
  result: { updated: number; skipped: readonly { reason: string }[] },
): BulkResultToast {
  const byReason = new Map<string, number>();
  for (const s of result.skipped) byReason.set(s.reason, (byReason.get(s.reason) ?? 0) + 1);
  const skippedCount = result.skipped.length;
  const hint = meta.action === 'activate' || meta.action === 'enable_pos' ? BULK_POS_BRANCH_HINT : undefined;

  if (result.updated === 0 && skippedCount > 0 && byReason.size === 1 && byReason.has('unchanged')) {
    const detail = skippedCount === 1 ? 'ya estaba así' : `los ${skippedCount} ya estaban así`;
    return { tone: 'info', message: `${meta.label}: nada que cambiar · ${detail}`, hint };
  }

  const skippedText = Array.from(byReason.entries())
    .map(([reason, n]) => `${n} ${(n === 1 ? undefined : BULK_SKIP_REASON_LABEL_PLURAL[reason]) ?? BULK_SKIP_REASON_LABEL[reason] ?? reason}`)
    .join(', ');
  const message = `${meta.label}: ${result.updated} ${result.updated === 1 ? 'actualizado' : 'actualizados'}${
    skippedCount > 0 ? ` · ${skippedCount} ${skippedCount === 1 ? 'omitido' : 'omitidos'} (${skippedText})` : ''
  }`;
  return { tone: skippedCount > 0 ? 'warning' : 'success', message, hint };
}
