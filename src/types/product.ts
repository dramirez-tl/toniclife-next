// Types for Products module
// Ref: toniclife-api/src/modules/products/dto/product.dto.ts

// ================================
// ENUMS
// ================================
export enum ProductType {
  FINISHED_GOOD = 'finished_good',
  RAW_MATERIAL = 'raw_material',
  KIT = 'kit',
  // Paquete comercial con componentes (BoM) — distinto del kit de inscripción.
  PACK = 'pack',
  PROMOTIONAL = 'promotional',
  VIRTUAL = 'virtual',
  SERVICE = 'service',
  // Boleto de evento (mig 154): se crea desde Eventos; no se ofrece en el alta de producto.
  EVENT = 'event',
}

// Modo de costeo del kit (NO es el rango). 'fixed' = kit pre-armado con precio
// propio; 'dynamic' = se arma en venta y descuenta inventario de componentes.
// Mapea a products.kit_type. El RANGO del kit es KitPosition.
export enum KitType {
  FIXED = 'fixed',
  DYNAMIC = 'dynamic',
}

/**
 * Posicion del kit: rango que se asigna al distribuidor que se inscribe
 * comprando este kit. Mapea a la columna products.kit_position.
 */
export enum KitPosition {
  BASIC = 'basic',
  PREMIUM = 'premium',
  PREFERRED = 'preferred',
}

export const KIT_POSITION_LABEL: Record<KitPosition, string> = {
  [KitPosition.BASIC]: 'Básico',
  [KitPosition.PREMIUM]: 'Premium',
  [KitPosition.PREFERRED]: 'Preferente',
};

// ================================
// AUDIENCIA EN LÍNEA (products.online_audience, mig 177 — "dos tiendas", Bloque 2, 28-oct-2026)
// ================================
/**
 * A quién se vende el producto en la tienda en línea: `none` = no se vende en
 * línea; `members` = solo con sesión de cliente (default de BD, fail-closed);
 * `public` = cualquiera lo ve y lo compra (el cliente con sesión también).
 * Los kits de inscripción quedan fuera (siguen por `enrollment.web_kit_payment_enabled`).
 */
export const PRODUCT_ONLINE_AUDIENCES = ['none', 'members', 'public'] as const;
export type ProductOnlineAudience = (typeof PRODUCT_ONLINE_AUDIENCES)[number];
export const DEFAULT_PRODUCT_ONLINE_AUDIENCE: ProductOnlineAudience = 'members';
export const isProductOnlineAudience = (v: unknown): v is ProductOnlineAudience =>
  typeof v === 'string' && (PRODUCT_ONLINE_AUDIENCES as readonly string[]).includes(v);

// ================================
// VARIANTES DE ROPA (products.family_id + variant_*, mig 178, 30-oct-2026)
// ================================
/**
 * Para quién es la variante (products.variant_gender). Una familia agrupa
 * productos hermanos (la playera rosa en CH, M, G…); cada producto es UNA
 * variante con género, color y talla, y sigue siendo un producto con su clave,
 * su precio y su existencia. Ver `src/types/product-family.ts`.
 */
export const VARIANT_GENDERS = ['mujer', 'hombre', 'unisex'] as const;
export type VariantGender = (typeof VARIANT_GENDERS)[number];
export const isVariantGender = (v: unknown): v is VariantGender =>
  typeof v === 'string' && (VARIANT_GENDERS as readonly string[]).includes(v);

// ================================
// CATEGORY TYPES (matches CategoryDto from category.dto.ts)
// ================================
export interface Category {
  id: string;
  code: string;
  name: string;
  description?: string;
  /** Nombre en inglés (tienda EN); fallback a name. */
  nameEn?: string;
  descriptionEn?: string;
  parentId?: string;
  parentName?: string;
  level: number;
  path?: string;
  slug?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTree extends Category {
  children?: CategoryTree[];
}

// ================================
// PRODUCT TYPES (matches ProductDto from product.dto.ts)
// ================================
export interface Product {
  id: string;
  code: string;
  barcode?: string;
  name: string;
  shortName?: string;
  description?: string;
  longDescription?: string;
  nameEn?: string;
  shortNameEn?: string;
  descriptionEn?: string;
  longDescriptionEn?: string;
  categoryId?: string;
  categoryName?: string;
  unitId?: string;
  brand?: string;
  productType: string;
  /** Clave ligada a un evento como boleto (admite precio $0 = invitado gratis). */
  isEventTicket?: boolean;
  kitType?: string;
  kitPosition?: string;
  isEnrollmentKit: boolean;
  kitDeductsInventory: boolean;
  /**
   * Cómo se surte un kit/paquete (mig 146, contrato kits §4.1): `assemble_on_sale`
   * = se arma al vender (descuenta componentes), `prebuilt` = prearmado (pieza
   * propia). Opcional: mientras el API no lo mande se deriva de `kitDeductsInventory`
   * (`resolveStockMode` en lib/kits/kit-availability).
   */
  kitStockMode?: 'assemble_on_sale' | 'prebuilt' | null;
  pointsValue: string;
  businessVolume: string;
  qualifiesForCommission: boolean;
  satProductCode?: string;
  satUnitCode?: string;
  taxRuleId?: string;
  isTaxExempt: boolean;
  tracksInventory: boolean;
  tracksLots: boolean;
  minStockAlert?: string;
  maxStockLevel?: string;
  reorderPoint?: string;
  reorderQuantity?: string;
  weightKg?: string;
  volumeCm3?: string;
  isVisibleEcommerce: boolean;
  /** A quién se vende en línea (mig 177). Sin efecto en kits de inscripción. */
  onlineAudience: ProductOnlineAudience;
  isFeatured: boolean;
  availableInPos: boolean;
  /**
   * Variantes de ropa (mig 178): familia a la que pertenece y qué variante es
   * (para quién, color, muestra `#RRGGBB` y talla en MAYÚSCULAS). Solo viajan
   * cuando la columna existe en BD; `null` = sin dato.
   */
  familyId?: string | null;
  variantGender?: VariantGender | null;
  variantColor?: string | null;
  variantColorHex?: string | null;
  variantSize?: string | null;
  /**
   * Personalización en la tienda (mig 179, 30-oct-2026): máximo de caracteres
   * del texto que el cliente escribe (1..60; null = no se personaliza) y
   * etiqueta del campo (null = la etiqueta por defecto de la tienda). Ausentes
   * mientras el API desplegado no los mande.
   */
  personalizationMaxLength?: number | null;
  personalizationLabel?: string | null;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Fields from backend JOINs
  imageUrl?: string;
  price?: string;
  priceCurrency?: string;
  activeCountries?: string[];

  // Disponibilidad — SOLO cuando la consulta trae `branchId`. Un lector NO
  // privilegiado (anónimo, cliente, distribuidor) ya no recibe la existencia exacta
  // (API `toPublicProductDto`): `stock` vale el TOPE por línea (= `maxQuantity`),
  // nunca las piezas reales. Para decidir disponibilidad usar `inStock`/`availability`
  // (con fallback a `stock > 0` mientras el API desplegado no los mande) y JAMÁS
  // pintar `stock` como "N disponibles". Staff y POS siguen recibiendo el stock real.
  stock?: number;
  inStock?: boolean;
  availability?: 'in_stock' | 'low_stock' | 'out_of_stock';
  /** Piezas restantes; solo viaja con `low_stock` ("últimas N"). */
  stockLeft?: number | null;
  /** Tope de piezas por línea; 0 = agotado. */
  maxQuantity?: number;
  /** Solo promociones: países con regla de canje configurada (mig 036/099).
   *  Refleja la configuración multipaís real, no solo dónde hay precio. */
  promotionRuleCountries?: {
    code: string;
    name: string;
    minPoints: string;
    isActive: boolean;
    /** Vigente HOY (ventana available_from/to, fecha de negocio CDMX). */
    isCurrent?: boolean;
    availableFrom?: string | null;
    availableTo?: string | null;
    /** Imagen por país (mig 107); null/ausente = sin imagen propia en ese país. */
    imageUrl?: string | null;
  }[];
  // UI-only fields (not in backend DTO, used by frontend pages)
  galleryUrls?: string[];
  videoUrl?: string;
  healthBenefits?: string[];
  ingredients?: string;
  warnings?: string;
  usageInstructions?: string;
  usageFormat?: string;
}

// ================================
// PRODUCT PRICE TYPES (matches ProductPriceDto)
// ================================
export interface ProductPrice {
  id: string;
  productId: string;
  priceTypeId: string;
  priceTypeName?: string;
  countryId: string;
  currencyCode: string;
  price: string;
  cost?: string;
  points?: string;
  businessValue?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  updatedById?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

// ================================
// PRODUCT TAX TYPES (matches ProductTaxDto)
// ================================
export interface ProductTax {
  id: string;
  productId: string;
  taxRuleId: string;
  taxRuleName: string;
  taxRuleCode: string;
  taxType: string;
  rate: number;
  countryCode: string;
  isIncludedInPrice: boolean;
  isActive: boolean;
}

// ================================
// PRODUCT COMPONENT TYPES (matches ProductComponentDto)
// ================================
export interface ProductComponent {
  id: string;
  productId: string;
  componentProductId?: string;
  componentProductCode?: string;
  componentProductName?: string;
  componentId?: string;
  componentName?: string;
  quantity: string;
  unitId?: string;
  sortOrder: number;
  isActive: boolean;
  /** País del componente (mig 099). null = global. */
  countryId?: string | null;
  /** Sucursal dueña del renglón (mig 167). null = global o de país. */
  branchId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ================================
// PRODUCT IMAGE TYPES (matches ProductImageDto)
// ================================
export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  altText?: string;
  imageType: string;
  sortOrder: number;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProductImageDto {
  isPrimary?: boolean;
  sortOrder?: number;
  altText?: string;
}

// ================================
// PRODUCT DOCUMENT TYPES (matches ProductDocumentDto) — ficha técnica PDF interna
// ================================
export interface ProductDocument {
  id: string;
  productId: string;
  documentType: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  uploadedById?: string;
  uploadedByName?: string;
  createdAt: string;
  updatedAt: string;
}

// ================================
// PRICE SCHEDULE TYPES (cambios de precio programados)
// ================================
export interface ProductPriceSchedule {
  id: string;
  productId: string;
  priceTypeId: string;
  priceTypeName?: string;
  countryId: string;
  countryName?: string;
  currencyCode: string;
  newPrice: string;
  newCost?: string;
  newPoints?: string;
  newBusinessValue?: string;
  applyOn: string;
  status: 'pending' | 'applied' | 'cancelled' | 'failed' | string;
  note?: string;
  createdById?: string;
  createdByName?: string;
  appliedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePriceScheduleDto {
  priceTypeId: string;
  countryId: string;
  currencyCode: string;
  applyOn: string; // YYYY-MM-DD
  price: number;
  cost?: number;
  points?: number;
  businessValue?: number;
  note?: string;
}

// ================================
// QUERY & RESPONSE TYPES (matches ProductQueryDto / ProductListResponseDto)
// ================================
export interface ProductQueryParams {
  search?: string;
  sku?: string;
  categoryId?: string;
  /** País (UUID) para precio/moneda y para resolver el almacén ecommerce del país. */
  countryId?: string;
  branchId?: string;
  inStock?: boolean;
  isActive?: boolean;
  isVisibleEcommerce?: boolean;
  /**
   * Solo productos con esa audiencia en línea (mig 177). `products.service`
   * la manda como lista separada por comas (`members,public`): el API acepta
   * esa forma y la repetida, pero NO la `onlineAudience[]=` que axios armaría.
   */
  onlineAudience?: ProductOnlineAudience[];
  isFeatured?: boolean;
  availableInPos?: boolean;
  productType?: ProductType;
  /** Excluir un tipo del listado (ej. promotional: las promos tienen su propia pestaña). */
  excludeProductType?: ProductType;
  kitPosition?: KitPosition;
  isEnrollmentKit?: boolean;
  brand?: string;
  tracksInventory?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ProductListResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CategoryQueryParams {
  search?: string;
  isActive?: boolean;
  parentId?: string;
  level?: number;
  includeProductCount?: boolean;
}

// ================================
// PRICE TYPE & CURRENCY
// ================================
export interface PriceType {
  id: string;
  name: string;
  code: string;
  discountPercentage: string;
  isDefault: boolean;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: string;
}

// ================================
// CREATE/UPDATE DTOs (matches CreateProductDto / UpdateProductDto)
// ================================

export interface CreateProductDto {
  code: string;
  barcode?: string;
  name: string;
  shortName?: string;
  description?: string;
  longDescription?: string;
  nameEn?: string;
  shortNameEn?: string;
  descriptionEn?: string;
  longDescriptionEn?: string;
  categoryId?: string;
  unitId?: string;
  brand?: string;
  productType?: ProductType;
  /** OBSOLETO (mig 146): el API lo acepta y lo ignora; el modo real es `kitStockMode`. */
  kitType?: KitType;
  kitPosition?: KitPosition;
  isEnrollmentKit?: boolean;
  kitDeductsInventory?: boolean;
  /** Cómo se surte un kit/paquete (contrato de kits §4.2); gana sobre `kitDeductsInventory`. */
  kitStockMode?: 'assemble_on_sale' | 'prebuilt';
  pointsValue?: number;
  businessVolume?: number;
  qualifiesForCommission?: boolean;
  satProductCode?: string;
  satUnitCode?: string;
  taxRuleId?: string;
  isTaxExempt?: boolean;
  tracksInventory?: boolean;
  tracksLots?: boolean;
  minStockAlert?: number;
  maxStockLevel?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  weightKg?: number;
  volumeCm3?: number;
  isVisibleEcommerce?: boolean;
  /** A quién se vende en línea; el API asume `members` si no viene. No aplica a kits. */
  onlineAudience?: ProductOnlineAudience;
  isFeatured?: boolean;
  availableInPos?: boolean;
  /** Personalización en la tienda (mig 179): 1..60 o null; solo se manda cuando se enciende en el alta. */
  personalizationMaxLength?: number | null;
  /** Etiqueta del campo de personalización (<= 60); null = la de la tienda. */
  personalizationLabel?: string | null;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateProductDto
  extends Partial<
    Omit<
      CreateProductDto,
      | 'barcode'
      | 'shortName'
      | 'description'
      | 'longDescription'
      | 'nameEn'
      | 'shortNameEn'
      | 'descriptionEn'
      | 'longDescriptionEn'
    >
  > {
  /** En update: `null` BORRA el valor en BD; `undefined` lo deja como está. */
  barcode?: string | null;
  shortName?: string | null;
  description?: string | null;
  longDescription?: string | null;
  nameEn?: string | null;
  shortNameEn?: string | null;
  descriptionEn?: string | null;
  longDescriptionEn?: string | null;
}

export interface CreateProductPriceDto {
  priceTypeId: string;
  countryId: string;
  currencyCode: string;
  price: number;
  cost?: number;
  points?: number;
  businessValue?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
}

export interface CreateCategoryDto {
  code: string;
  name: string;
  description?: string;
  nameEn?: string;
  descriptionEn?: string;
  parentId?: string;
  slug?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryDto {
  code?: string;
  name?: string;
  description?: string;
  nameEn?: string;
  descriptionEn?: string;
  parentId?: string;
  slug?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}
