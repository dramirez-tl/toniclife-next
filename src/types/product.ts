// Types for Products module
// Ref: toniclife-api/src/modules/products/dto/product.dto.ts

// ================================
// ENUMS
// ================================
export enum ProductType {
  FINISHED_GOOD = 'finished_good',
  RAW_MATERIAL = 'raw_material',
  KIT = 'kit',
  PROMOTIONAL = 'promotional',
  VIRTUAL = 'virtual',
  SERVICE = 'service',
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
  kitType?: string;
  kitPosition?: string;
  isEnrollmentKit: boolean;
  kitDeductsInventory: boolean;
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
  isFeatured: boolean;
  availableInPos: boolean;
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
  /** Solo promociones: países con regla de canje configurada (mig 036/099).
   *  Refleja la configuración multipaís real, no solo dónde hay precio. */
  promotionRuleCountries?: {
    code: string;
    name: string;
    minPoints: string;
    isActive: boolean;
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
  isFeatured?: boolean;
  availableInPos?: boolean;
  productType?: ProductType;
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
  kitType?: KitType;
  kitPosition?: KitPosition;
  isEnrollmentKit?: boolean;
  kitDeductsInventory?: boolean;
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
  isFeatured?: boolean;
  availableInPos?: boolean;
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
