// Promociones de temporada (mig 186): Buen Fin y las que sigan. Una TEMPORADA
// (nombre, arte, fecha-hora LOCAL de inicio/fin, países) agrupa PROMOCIONES
// por tipo (3x2, % de descuento, precio especial, regalo por compra) con sus
// productos, canales y, si hace falta, su propia ventana dentro de la temporada.
// Espejo del contrato del API.
//
// Ref backend:
//   - toniclife-api/src/modules/seasonal-promotions/dto/seasonal-promotions.dto.ts
//   - toniclife-api/src/modules/seasonal-promotions/seasonal-promotions.controller.ts

export type SeasonalPromoType = 'nxm' | 'percent_off' | 'fixed_price' | 'gift_with_purchase';
export type SeasonalPromoChannel = 'pos' | 'online';
export type SeasonalPointsMode = 'keep' | 'none';
export type SeasonStatus = 'upcoming' | 'active' | 'ended' | 'inactive';
export type SeasonStatusFilter = 'all' | 'active' | 'upcoming' | 'ended' | 'inactive';
export type SeasonUsageStatus = 'pending' | 'applied' | 'reverted';

export interface NxmConfig {
  buy: number;
  pay: number;
  sameProductOnly: boolean;
}
export interface PercentOffConfig {
  percent: number;
}
export interface FixedPriceConfig {
  /** Precio unitario final por código de país (MX, FN, US…). */
  prices: Record<string, number>;
}
export interface GiftWithPurchaseConfig {
  minQuantity: number | null;
  minAmount: number | null;
  repeat: boolean;
}
export type SeasonalPromoConfig = NxmConfig | PercentOffConfig | FixedPriceConfig | GiftWithPurchaseConfig;

export interface SeasonCountry {
  id: string;
  code: string;
  name: string;
}

export interface SeasonPromotionProduct {
  productId: string;
  sku: string;
  name: string;
  slug?: string | null;
  imageUrl?: string | null;
  role: 'eligible' | 'gift';
  quantity: number;
  sortOrder: number;
  productActive?: boolean;
}

/** Lo cobrado por los productos de una promoción, en una moneda (solo admin). */
export interface SeasonSalesAmount {
  /** Código de moneda del país de la venta: MXN, USD… */
  currency: string;
  /** Con impuestos. */
  amount: number;
}

export interface SeasonPromotion {
  id: string;
  seasonId: string;
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageThumbnailUrl: string | null;
  type: SeasonalPromoType;
  typeLabel: string;
  config: SeasonalPromoConfig;
  channels: SeasonalPromoChannel[];
  /** Países efectivos (temporada ∩ promoción). */
  countries: SeasonCountry[];
  countriesRestricted: boolean;
  /** Ventana propia (hora local 'YYYY-MM-DDTHH:mm:ss') o null = la de la temporada. */
  startsAt: string | null;
  endsAt: string | null;
  effectiveStartsAt: string;
  effectiveEndsAt: string;
  priority: number;
  maxPerSale: number | null;
  pointsMode: SeasonalPointsMode;
  excludesKitBonus: boolean;
  isActive: boolean;
  sortOrder: number;
  products: SeasonPromotionProduct[];
  /** Ventas/pedidos cobrados que la usaron. Solo admin: la tienda y el POS reciben 0. */
  usageCount: number;
  /**
   * Solo admin: lo cobrado por sus productos en esas ventas, por moneda (la mayor primero).
   * No es el total del ticket. La tienda y el POS no lo reciben.
   */
  salesAmounts?: SeasonSalesAmount[];
  createdAt: string;
  updatedAt: string;
}

export interface PromoSeason {
  id: string;
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageThumbnailUrl: string | null;
  /** Hora local 'YYYY-MM-DDTHH:mm:ss'. */
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  status: SeasonStatus;
  sortOrder: number;
  countries: SeasonCountry[];
  promotionsCount: number;
  /** Ventas y descuento acumulados. Solo admin: la tienda y el POS reciben 0. */
  usageCount: number;
  discountTotal: number;
  /** Solo en el detalle. */
  promotions?: SeasonPromotion[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromoSeasonDto {
  /** Vacío = se genera del nombre. */
  code?: string | null;
  name: string;
  description?: string | null;
  /** 'YYYY-MM-DDTHH:mm' hora local. */
  startsAt: string;
  endsAt: string;
  countryIds: string[];
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdatePromoSeasonDto extends Partial<CreatePromoSeasonDto> {
  /** '' o null = quitar la imagen. */
  imageUrl?: string | null;
}

export interface SeasonPromotionGiftInput {
  productId: string;
  quantity?: number;
}

export interface CreateSeasonPromotionDto {
  code?: string | null;
  name: string;
  description?: string | null;
  type: SeasonalPromoType;
  config: Record<string, unknown>;
  channels?: SeasonalPromoChannel[];
  /** Subconjunto de países de la temporada (vacío = todos). */
  countryIds?: string[];
  startsAt?: string | null;
  endsAt?: string | null;
  priority?: number;
  maxPerSale?: number | null;
  pointsMode?: SeasonalPointsMode;
  excludesKitBonus?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  eligibleProductIds: string[];
  gifts?: SeasonPromotionGiftInput[];
}

export interface UpdateSeasonPromotionDto extends Partial<CreateSeasonPromotionDto> {
  imageUrl?: string | null;
}

export interface PromoSeasonListQueryParams {
  status?: SeasonStatusFilter;
  countryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PromoSeasonListResponse {
  data: PromoSeason[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SeasonUsage {
  id: string;
  promotionId: string;
  promoCode: string;
  promoName: string;
  source: 'pos' | 'online';
  documentNumber: string | null;
  branchName: string | null;
  customerNumber: string | null;
  customerName: string | null;
  countryCode: string | null;
  times: number;
  discountAmount: number;
  freeUnits: number;
  giftUnits: number;
  status: SeasonUsageStatus;
  createdAt: string;
}

export interface SeasonUsageListQueryParams {
  promotionId?: string;
  status?: SeasonUsageStatus;
  page?: number;
  limit?: number;
}

export interface SeasonUsageListResponse {
  data: SeasonUsage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Lo que la tienda recibe (GET /storefront/seasonal-promotions?country=MX). */
export interface SeasonalBundle {
  nowLocal: string;
  countryCode: string;
  timezone: string;
  seasons: PromoSeason[];
}
