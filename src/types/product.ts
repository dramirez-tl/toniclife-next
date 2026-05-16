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

export enum KitType {
  BASICO = 'basico',
  PREMIUM = 'premium',
  PREFERENTE = 'preferente',
}

/**
 * Posicion del kit: rango que se asigna al distribuidor que se inscribe
 * comprando este kit. Mapea a la columna products.kit_position.
 */
export enum KitPosition {
  BASIC = 'basic',
  PREMIUM = 'premium',
  PREFERENTE = 'preferente',
}

export const KIT_POSITION_LABEL: Record<KitPosition, string> = {
  [KitPosition.BASIC]: 'Básico',
  [KitPosition.PREMIUM]: 'Premium',
  [KitPosition.PREFERENTE]: 'Preferente',
};

// ================================
// CATEGORY TYPES (matches CategoryDto from category.dto.ts)
// ================================
export interface Category {
  id: string;
  code: string;
  name: string;
  description?: string;
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
  categoryId?: string;
  categoryName?: string;
  unitId?: string;
  brand?: string;
  productType: string;
  kitType?: string;
  kitPosition?: string;
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
  createdAt: string;
  updatedAt: string;
}

// ================================
// QUERY & RESPONSE TYPES (matches ProductQueryDto / ProductListResponseDto)
// ================================
export interface ProductQueryParams {
  search?: string;
  sku?: string;
  categoryId?: string;
  branchId?: string;
  inStock?: boolean;
  isActive?: boolean;
  isVisibleEcommerce?: boolean;
  isFeatured?: boolean;
  availableInPos?: boolean;
  productType?: ProductType;
  kitPosition?: KitPosition;
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
  categoryId?: string;
  unitId?: string;
  brand?: string;
  productType?: ProductType;
  kitType?: KitType;
  kitPosition?: KitPosition;
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

export interface UpdateProductDto extends Partial<CreateProductDto> {}

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
  parentId?: string;
  slug?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}
