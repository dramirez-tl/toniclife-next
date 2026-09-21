// products-admin.service.ts — cliente del API de administración del catálogo.
//
// Contrato "Ecommerce + Producto v2" §6.3:
//   - Colección:    /catalog-admin/*  (listado, salud, export, slug-check, bulk)
//   - Sub-recursos: /products/:id/... (contenido, slug-history, images/order,
//                   duplicate, history, storefront-status, taxes con motivo)
//   - PATCH /products/:id ampliado (null vacía, fiscalReason, expectedUpdatedAt).
//
// El API se construye en paralelo contra el mismo contrato: todo lo que llega
// se trata como opcional/nullable y los normalizadores de abajo nunca lanzan.

import api from '@/lib/axios';
import type {
  Product,
  ProductImage,
  ProductPrice,
  ProductType,
  KitPosition,
} from '@/types/product';

// ================================
// Países de la tienda (ISO2) — mismo orden que src/i18n/config.ts
// ================================
export type StoreCountryCode = 'MX' | 'US' | 'CO' | 'GT';
export const STORE_COUNTRY_CODES: StoreCountryCode[] = ['MX', 'US', 'CO', 'GT'];

// ================================
// Salud del catálogo (HEALTH_RULES del API, §5.7)
// ================================
export type HealthSeverity = 'critical' | 'high' | 'medium' | 'low' | string;

/** Código base de la regla; las reglas por país llegan como `<base>:<CC>`. */
export type HealthIssueBase =
  | 'no_image'
  | 'no_description'
  | 'no_category'
  | 'no_public_price'
  | 'zero_price'
  | 'price_incoherent'
  | 'no_tax_rule'
  | 'no_sat_code'
  | 'no_en_name'
  | 'no_en_description'
  | 'no_seo'
  | 'no_slug'
  | 'slug_off_convention'
  | 'name_uppercase'
  | 'name_untrimmed'
  | 'duplicate_name'
  | 'components_missing'
  | 'visible_not_sellable_type';

export interface HealthIssueCount {
  code: string;
  severity: HealthSeverity | null;
  count: number;
}

export interface CatalogHealth {
  totals: { active: number; sellable: Partial<Record<StoreCountryCode, number>> };
  issues: HealthIssueCount[];
  /** El contrato no fija la forma de cada elemento: se conserva crudo y la UI no lo pinta aún. */
  byCategory: Record<string, unknown>[];
}

// ================================
// Listado admin
// ================================
export interface CatalogAdminStorefrontFlag {
  sellable: boolean;
  reasons: string[];
}

export interface CatalogAdminRow {
  id: string;
  code: string;
  name: string;
  slug: string | null;
  productType: string;
  categoryName: string | null;
  imageUrl: string | null;
  isActive: boolean;
  isVisibleEcommerce: boolean;
  availableInPos: boolean;
  isFeatured: boolean;
  sortOrder: number | null;
  publicPrices: Partial<Record<StoreCountryCode, number | null>>;
  health: { score: number | null; issues: string[] };
  storefront: Partial<Record<StoreCountryCode, CatalogAdminStorefrontFlag | null>>;
  updatedAt: string | null;
}

export type CatalogAdminSortBy =
  | 'name'
  | 'code'
  | 'createdAt'
  | 'updatedAt'
  | 'sortOrder'
  | 'price'
  | 'score';

export interface CatalogAdminListParams {
  q?: string;
  sku?: string;
  categoryId?: string;
  productType?: string[];
  isActive?: boolean;
  visibleEcommerce?: boolean;
  availableInPos?: boolean;
  isFeatured?: boolean;
  /** ISO2: país de referencia para precio, orden por precio y reglas por país. */
  country?: StoreCountryCode;
  hasPublicPrice?: boolean;
  hasImage?: boolean;
  issue?: string[];
  sortBy?: CatalogAdminSortBy;
  sortDir?: 'asc' | 'desc';
  page?: number;
  /** 10-100 */
  limit?: number;
}

export interface CatalogAdminListResponse {
  data: CatalogAdminRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ================================
// Acciones masivas
// ================================
export type CatalogBulkAction =
  | 'activate'
  | 'deactivate'
  | 'show_store'
  | 'hide_store'
  | 'enable_pos'
  | 'disable_pos'
  | 'feature'
  | 'unfeature'
  | 'set_category';

export interface CatalogBulkDto {
  ids: string[];
  action: CatalogBulkAction;
  categoryId?: string;
  /** Debe coincidir con `ids.length`; si no, 409 PRD_COUNT_MISMATCH y no se escribe. */
  expectedCount: number;
}

export interface CatalogBulkResult {
  updated: number;
  skipped: { id: string; reason: string }[];
}

// ================================
// Slug
// ================================
export interface SlugCheckResult {
  available: boolean;
  normalized: string;
  suggestion: string | null;
  /** Si el slug es una redirección vigente de OTRO producto, su id. */
  isRedirectOf: string | null;
}

export interface SlugHistoryEntry {
  slug: string;
  createdAt: string | null;
  createdByName: string | null;
}

// ================================
// Contenido rico por idioma (tabla product_content, texto plano)
// ================================
export type ContentLanguage = 'es' | 'en';

export interface ProductContent {
  tagline: string | null;
  presentation: string | null;
  /** Una viñeta por línea. */
  benefits: string | null;
  ingredients: string | null;
  usageInstructions: string | null;
  warnings: string | null;
}

export type ProductContentByLanguage = Record<ContentLanguage, ProductContent | null>;

export const PRODUCT_CONTENT_KEYS: (keyof ProductContent)[] = [
  'tagline',
  'presentation',
  'benefits',
  'ingredients',
  'usageInstructions',
  'warnings',
];

// ================================
// Historial
// ================================
export type ProductHistorySource = 'product' | 'price' | 'image' | 'content' | string;

export interface ProductHistoryChange {
  field: string;
  from: string | number | boolean | null;
  to: string | number | boolean | null;
}

export interface ProductHistoryEntry {
  at: string;
  userName: string | null;
  source: ProductHistorySource;
  action: string;
  changes: ProductHistoryChange[];
}

export interface ProductHistoryResponse {
  data: ProductHistoryEntry[];
  total: number;
}

// ================================
// Por qué (no) sale en la tienda
// ================================
export type StorefrontBlockReason =
  | 'inactive'
  | 'hidden'
  | 'not_sellable_type'
  | 'enrollment_kit'
  | 'no_slug'
  | 'no_public_price'
  | 'out_of_stock'
  | 'country_not_ready';

export interface StorefrontStatusEntry {
  countryCode: string;
  locale: string | null;
  sellable: boolean;
  reasons: string[];
  url: string | null;
}

// ================================
// Duplicar
// ================================
export interface DuplicateProductDto {
  code: string;
  name: string;
  copyPrices?: boolean;
  copyComponents?: boolean;
  copyTaxes?: boolean;
  copyContent?: boolean;
}

// ================================
// Producto (vista admin) y PATCH ampliado
// ================================
export type AdminProduct = Product & {
  metaTitleEn?: string | null;
  metaDescriptionEn?: string | null;
};

/**
 * PATCH /products/:id — parcial. `undefined` = no tocar; `null` = VACIAR en BD.
 * `pointsValue` / `businessVolume` no están: el API los ignora (zona MLM).
 */
export interface AdminUpdateProductDto {
  code?: string;
  /** Obligatorio en `true` cuando cambia `code` (409 PRD_CODE_CHANGE_UNCONFIRMED). */
  confirmCodeChange?: boolean;
  name?: string;
  shortName?: string | null;
  barcode?: string | null;
  brand?: string | null;
  unitId?: string | null;
  description?: string | null;
  longDescription?: string | null;
  nameEn?: string | null;
  shortNameEn?: string | null;
  descriptionEn?: string | null;
  longDescriptionEn?: string | null;
  categoryId?: string | null;
  productType?: ProductType;
  kitPosition?: KitPosition | null;
  kitDeductsInventory?: boolean;
  qualifiesForCommission?: boolean;
  satProductCode?: string | null;
  satUnitCode?: string | null;
  taxRuleId?: string | null;
  isTaxExempt?: boolean;
  /** >= 5 caracteres; obligatorio si cambia satProductCode|satUnitCode|isTaxExempt|taxRuleId. */
  fiscalReason?: string;
  tracksInventory?: boolean;
  tracksLots?: boolean;
  minStockAlert?: number | null;
  maxStockLevel?: number | null;
  reorderPoint?: number | null;
  reorderQuantity?: number | null;
  weightKg?: number | null;
  volumeCm3?: number | null;
  isVisibleEcommerce?: boolean;
  isFeatured?: boolean;
  availableInPos?: boolean;
  slug?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaTitleEn?: string | null;
  metaDescriptionEn?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  /** Bloqueo optimista: si no coincide con products.updated_at → 409 PRD_STALE. */
  expectedUpdatedAt?: string;
}

/** Respuesta de POST /products/:id/prices: la fila + avisos de coherencia (no bloquean). */
export type ProductPriceWithWarnings = ProductPrice & { warnings?: string[] | null };

export interface AdminSetPriceDto {
  priceTypeId: string;
  countryId: string;
  currencyCode: string;
  price: number;
  points?: number;
  businessValue?: number;
  /** YYYY-MM-DD. Solo se manda si el usuario lo cambió (si no, el API conserva el vigente). */
  effectiveFrom?: string;
  /** YYYY-MM-DD o null para quitar el fin de vigencia. */
  effectiveTo?: string | null;
}

// ================================
// Normalizadores (toleran null / formas parciales)
// ================================
type Dict = Record<string, unknown>;

const isDict = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);
const num = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};
const bool = (v: unknown): boolean => v === true;
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

function normalizeStorefrontFlag(v: unknown): CatalogAdminStorefrontFlag | null {
  if (typeof v === 'boolean') return { sellable: v, reasons: [] };
  if (isDict(v)) return { sellable: bool(v.sellable), reasons: strList(v.reasons) };
  return null;
}

function normalizeRow(raw: unknown): CatalogAdminRow | null {
  if (!isDict(raw)) return null;
  const id = str(raw.id);
  if (!id) return null;
  const prices = isDict(raw.publicPrices) ? raw.publicPrices : {};
  const storefront = isDict(raw.storefront) ? raw.storefront : {};
  const health = isDict(raw.health) ? raw.health : {};
  const publicPrices: CatalogAdminRow['publicPrices'] = {};
  const flags: CatalogAdminRow['storefront'] = {};
  for (const cc of STORE_COUNTRY_CODES) {
    if (cc in prices) publicPrices[cc] = num(prices[cc]);
    if (cc in storefront) flags[cc] = normalizeStorefrontFlag(storefront[cc]);
  }
  return {
    id,
    code: str(raw.code) ?? '',
    name: str(raw.name) ?? '',
    slug: str(raw.slug),
    productType: str(raw.productType) ?? '',
    categoryName: str(raw.categoryName),
    imageUrl: str(raw.imageUrl),
    isActive: bool(raw.isActive),
    isVisibleEcommerce: bool(raw.isVisibleEcommerce),
    availableInPos: bool(raw.availableInPos),
    isFeatured: bool(raw.isFeatured),
    sortOrder: num(raw.sortOrder),
    publicPrices,
    health: { score: num(health.score), issues: strList(health.issues) },
    storefront: flags,
    updatedAt: str(raw.updatedAt),
  };
}

function normalizeList(raw: unknown, params: CatalogAdminListParams): CatalogAdminListResponse {
  const body = isDict(raw) ? raw : {};
  const rows = Array.isArray(body.data) ? body.data : Array.isArray(raw) ? raw : [];
  const data = rows.map(normalizeRow).filter((r): r is CatalogAdminRow => r !== null);
  const limit = num(body.limit) ?? params.limit ?? 20;
  const total = num(body.total) ?? data.length;
  return {
    data,
    total,
    page: num(body.page) ?? params.page ?? 1,
    limit,
    totalPages: num(body.totalPages) ?? Math.max(1, Math.ceil(total / Math.max(1, limit))),
  };
}

function normalizeHealth(raw: unknown): CatalogHealth {
  const body = isDict(raw) ? raw : {};
  const totals = isDict(body.totals) ? body.totals : {};
  const sellableRaw = isDict(totals.sellable) ? totals.sellable : {};
  const sellable: CatalogHealth['totals']['sellable'] = {};
  for (const cc of STORE_COUNTRY_CODES) {
    const n = num(sellableRaw[cc]);
    if (n !== null) sellable[cc] = n;
  }
  const issues: HealthIssueCount[] = (Array.isArray(body.issues) ? body.issues : [])
    .filter(isDict)
    .map((i) => ({ code: str(i.code) ?? '', severity: str(i.severity), count: num(i.count) ?? 0 }))
    .filter((i) => i.code !== '');
  const byCategory = (Array.isArray(body.byCategory) ? body.byCategory : []).filter(isDict);
  return { totals: { active: num(totals.active) ?? 0, sellable }, issues, byCategory };
}

function normalizeContent(raw: unknown): ProductContent | null {
  if (!isDict(raw)) return null;
  const benefits = Array.isArray(raw.benefits) ? strList(raw.benefits).join('\n') : str(raw.benefits);
  return {
    tagline: str(raw.tagline),
    presentation: str(raw.presentation),
    benefits: benefits && benefits.length > 0 ? benefits : null,
    ingredients: str(raw.ingredients),
    usageInstructions: str(raw.usageInstructions),
    warnings: str(raw.warnings),
  };
}

function normalizeHistoryValue(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** Parámetros de consulta sin vacíos. Los arreglos viajan como claves repetidas (`issue=a&issue=b`). */
function cleanParams(params: CatalogAdminListParams): Record<string, string | number | boolean | string[]> {
  const out: Record<string, string | number | boolean | string[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length > 0) out[key] = value;
      continue;
    }
    out[key] = value as string | number | boolean;
  }
  return out;
}

const CONTROL_KEYS = ['expectedUpdatedAt', 'fiscalReason', 'confirmCodeChange'] as const;

/** Llaves de control que un API aún sin el DTO ampliado rechazó con 400 "property X should not exist". */
function rejectedControlKeys(err: unknown): string[] {
  const response = (err as { response?: { status?: number; data?: unknown } } | null)?.response;
  if (response?.status !== 400 || !isDict(response.data)) return [];
  const raw = response.data.message;
  const messages = Array.isArray(raw) ? raw.filter((m): m is string => typeof m === 'string') : typeof raw === 'string' ? [raw] : [];
  const unknownProps = messages
    .map((m) => /^property (\w+) should not exist$/.exec(m)?.[1])
    .filter((p): p is string => !!p);
  // Si el API rechazó también llaves de DATOS, no se reintenta: el error debe verse.
  if (unknownProps.length === 0 || unknownProps.some((p) => !(CONTROL_KEYS as readonly string[]).includes(p))) return [];
  return unknownProps;
}

/** Claves repetidas (no `key[]=`): las entienden el parser `simple` y el `extended` de Express. */
const REPEAT_ARRAYS = { indexes: null } as const;

class ProductsAdminService {
  // ---------- Colección: /catalog-admin ----------

  async listProducts(params: CatalogAdminListParams): Promise<CatalogAdminListResponse> {
    const response = await api.get<unknown>('/catalog-admin/products', {
      params: cleanParams(params),
      paramsSerializer: REPEAT_ARRAYS,
    });
    return normalizeList(response.data, params);
  }

  async getHealth(country?: StoreCountryCode): Promise<CatalogHealth> {
    const response = await api.get<unknown>('/catalog-admin/health', {
      params: country ? { country } : undefined,
    });
    return normalizeHealth(response.data);
  }

  /** CSV generado en el servidor (celdas ya neutralizadas contra fórmulas). */
  async exportHealthCsv(country?: StoreCountryCode): Promise<Blob> {
    const response = await api.get<Blob>('/catalog-admin/health/export', {
      params: country ? { country } : undefined,
      responseType: 'blob',
    });
    return response.data;
  }

  async checkSlug(slug: string, excludeId?: string): Promise<SlugCheckResult> {
    const response = await api.get<unknown>('/catalog-admin/slug-check', {
      params: excludeId ? { slug, excludeId } : { slug },
    });
    const body = isDict(response.data) ? response.data : {};
    return {
      available: bool(body.available),
      normalized: str(body.normalized) ?? slug,
      suggestion: str(body.suggestion),
      isRedirectOf: str(body.isRedirectOf),
    };
  }

  async bulk(dto: CatalogBulkDto): Promise<CatalogBulkResult> {
    const response = await api.post<unknown>('/catalog-admin/products/bulk', dto);
    const body = isDict(response.data) ? response.data : {};
    const skipped = (Array.isArray(body.skipped) ? body.skipped : [])
      .filter(isDict)
      .map((s) => ({ id: str(s.id) ?? '', reason: str(s.reason) ?? 'unknown' }));
    return { updated: num(body.updated) ?? 0, skipped };
  }

  // ---------- Producto ----------

  async getProduct(id: string): Promise<AdminProduct> {
    const response = await api.get<AdminProduct>(`/products/${id}`);
    return response.data;
  }

  async updateProduct(id: string, dto: AdminUpdateProductDto): Promise<AdminProduct> {
    try {
      const response = await api.patch<AdminProduct>(`/products/${id}`, dto);
      return response.data;
    } catch (err) {
      // Compatibilidad de despliegue: un API anterior al DTO ampliado rechaza
      // (forbidNonWhitelisted) las llaves de CONTROL nuevas. Se reintenta UNA vez
      // sin ellas; nunca se quitan llaves de datos (eso sí sería perder cambios).
      const rejected = rejectedControlKeys(err);
      if (rejected.length === 0) throw err;
      const retry: Record<string, unknown> = { ...dto };
      for (const key of rejected) delete retry[key];
      const response = await api.patch<AdminProduct>(`/products/${id}`, retry);
      return response.data;
    }
  }

  async duplicate(id: string, dto: DuplicateProductDto): Promise<AdminProduct> {
    const response = await api.post<AdminProduct>(`/products/${id}/duplicate`, dto);
    return response.data;
  }

  // ---------- Contenido ----------

  async getContent(id: string): Promise<ProductContentByLanguage> {
    const response = await api.get<unknown>(`/products/${id}/content`);
    const body = isDict(response.data) ? response.data : {};
    return { es: normalizeContent(body.es), en: normalizeContent(body.en) };
  }

  async putContent(id: string, language: ContentLanguage, content: ProductContent): Promise<ProductContent | null> {
    const response = await api.put<unknown>(`/products/${id}/content/${language}`, content);
    return normalizeContent(response.data);
  }

  // ---------- Slug ----------

  async getSlugHistory(id: string): Promise<SlugHistoryEntry[]> {
    const response = await api.get<unknown>(`/products/${id}/slug-history`);
    return (Array.isArray(response.data) ? response.data : [])
      .filter(isDict)
      .map((e) => ({ slug: str(e.slug) ?? '', createdAt: str(e.createdAt), createdByName: str(e.createdByName) }))
      .filter((e) => e.slug !== '');
  }

  async deleteSlugHistory(id: string, slug: string): Promise<void> {
    await api.delete(`/products/${id}/slug-history/${encodeURIComponent(slug)}`);
  }

  // ---------- Imágenes ----------

  /** Sube una imagen (multipart, campo "image") informando el avance 0-100. */
  async uploadImage(id: string, file: File, onProgress?: (percent: number) => void): Promise<ProductImage> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post<ProductImage>(`/products/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return;
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      },
    });
    return response.data;
  }

  /** `imageIds` = EXACTAMENTE las activas, en el orden deseado; la primera queda como principal. */
  async reorderImages(id: string, imageIds: string[]): Promise<ProductImage[]> {
    const response = await api.put<ProductImage[]>(`/products/${id}/images/order`, { imageIds });
    return Array.isArray(response.data) ? response.data : [];
  }

  // ---------- Precios ----------

  async getPrices(id: string, activeOnly: boolean): Promise<ProductPrice[]> {
    const response = await api.get<ProductPrice[]>(`/products/${id}/prices`, {
      params: { activeOnly },
    });
    return Array.isArray(response.data) ? response.data : [];
  }

  async setPrice(id: string, dto: AdminSetPriceDto): Promise<ProductPriceWithWarnings> {
    const response = await api.post<ProductPriceWithWarnings>(`/products/${id}/prices`, dto);
    return response.data;
  }

  // ---------- Fiscal (el motivo SÍ se envía y se persiste en auditoría) ----------

  async updateProductTax(id: string, taxRuleId: string, isIncludedInPrice: boolean, reason: string): Promise<void> {
    await api.patch(`/products/${id}/taxes/${taxRuleId}`, { isIncludedInPrice, reason });
  }

  async removeProductTax(id: string, taxRuleId: string, reason: string): Promise<void> {
    await api.delete(`/products/${id}/taxes/${taxRuleId}`, { data: { reason } });
  }

  // ---------- Historial / estado en tienda ----------

  async getHistory(id: string, page: number, limit: number): Promise<ProductHistoryResponse> {
    const response = await api.get<unknown>(`/products/${id}/history`, { params: { page, limit } });
    const body = isDict(response.data) ? response.data : {};
    const data: ProductHistoryEntry[] = (Array.isArray(body.data) ? body.data : [])
      .filter(isDict)
      .map((e) => ({
        at: str(e.at) ?? '',
        userName: str(e.userName),
        source: str(e.source) ?? 'product',
        action: str(e.action) ?? '',
        changes: (Array.isArray(e.changes) ? e.changes : []).filter(isDict).map((c) => ({
          field: str(c.field) ?? '',
          from: normalizeHistoryValue(c.from),
          to: normalizeHistoryValue(c.to),
        })),
      }));
    return { data, total: num(body.total) ?? data.length };
  }

  async getStorefrontStatus(id: string): Promise<StorefrontStatusEntry[]> {
    const response = await api.get<unknown>(`/products/${id}/storefront-status`);
    return (Array.isArray(response.data) ? response.data : [])
      .filter(isDict)
      .map((e) => ({
        countryCode: (str(e.countryCode) ?? '').toUpperCase(),
        locale: str(e.locale),
        sellable: bool(e.sellable),
        reasons: strList(e.reasons),
        url: str(e.url),
      }))
      .filter((e) => e.countryCode !== '');
  }

  // ---------- Caché de la tienda ----------

  /**
   * Pide a Next invalidar el catálogo y las fichas indicadas. Es una
   * OPTIMIZACIÓN: la garantía es el TTL de 120 s, así que nunca lanza.
   */
  async revalidateCatalog(slugs: (string | null | undefined)[]): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      if (!token) return;
      await fetch('/api/revalidate-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slugs: slugs.filter((s): s is string => typeof s === 'string' && s.length > 0) }),
        keepalive: true,
      });
    } catch {
      // Sin ruta o sin red: el TTL cubre el caso.
    }
  }
}

export const productsAdminService = new ProductsAdminService();
export default productsAdminService;
