// Campañas de membresía (mig 168): "Compra N puntos en producto y tu
// membresía de inscripción es GRATIS". Espejo del contrato del API.
//
// Ref backend:
//   - toniclife-api/src/modules/membership-campaigns/dto/membership-campaign.dto.ts
//   - toniclife-api/src/modules/membership-campaigns/membership-campaigns.controller.ts

/** A quién se le ofrece: nuevos (pendientes sin kit), básicos (suben) o ambos. */
export type MembershipAppliesTo = 'new' | 'basic' | 'all';

/** Posición que otorga la campaña al cobrar la venta. */
export type MembershipPosition = 'basic' | 'premium';

/** Dónde se puede usar el cupón de primera recompra. */
export type MembershipCouponChannel = 'all' | 'pos' | 'ecommerce';

/**
 * Estado de un canje:
 *  - pending  = la venta aún no se cobra.
 *  - applied  = posición, regalos y cupón aplicados.
 *  - reverted = la venta se canceló; se anuló todo.
 *  - failed   = no se pudo aplicar (ver `error`).
 */
export type MembershipRedemptionStatus = 'pending' | 'applied' | 'reverted' | 'failed';

// ================================
// REGALOS
// ================================
export interface MembershipCampaignGift {
  productId: string;
  /** Clave del producto. */
  sku: string;
  name: string;
  quantity: number;
  sortOrder: number;
  /** false = el producto está inactivo (no se entregará). */
  productActive?: boolean;
}

export interface MembershipCampaignGiftInput {
  productId: string;
  /** Piezas por venta (default 1). */
  quantity?: number;
  /** Orden en el ticket (default 0). */
  sortOrder?: number;
}

// ================================
// SUCURSALES HABILITADAS
// ================================
export interface MembershipCampaignBranch {
  branchId: string;
  branchCode: string;
  branchName: string;
  enabledAt: string;
  enabledByName?: string | null;
  note?: string | null;
}

// ================================
// CAMPAÑA
// ================================
export interface MembershipCampaign {
  id: string;
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  /** Miniatura WebP generada por el API al subir la imagen (mig 171); null si la liga se pegó a mano. */
  imageThumbnailUrl?: string | null;
  countryId: string;
  countryCode: string;
  countryName: string;
  /** Puntos de producto en UNA compra. */
  minPoints: number;
  appliesTo: MembershipAppliesTo | string;
  grantPosition: MembershipPosition | string;
  /** Cupón de primera recompra (%); null = sin cupón. */
  couponPercent: number | null;
  couponValidDays: number;
  couponChannel: MembershipCouponChannel | string;
  /** YYYY-MM-DD; null = desde ya. */
  validFrom: string | null;
  /** YYYY-MM-DD; null = sin fin. */
  validTo: string | null;
  isActive: boolean;
  sortOrder: number;
  gifts: MembershipCampaignGift[];
  branches: MembershipCampaignBranch[];
  /** Sucursales habilitadas (0 = apagada). */
  branchCount: number;
  /** Beneficios aplicados (ventas cobradas). */
  redemptionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMembershipCampaignDto {
  /** Único; letras, números, guion y guion bajo (3–40). */
  code: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  countryId: string;
  minPoints: number;
  appliesTo?: MembershipAppliesTo;
  grantPosition?: MembershipPosition;
  /** null o ausente = sin cupón. */
  couponPercent?: number | null;
  couponValidDays?: number;
  couponChannel?: MembershipCouponChannel;
  validFrom?: string | null;
  validTo?: string | null;
  /** Default false: nace apagada. */
  isActive?: boolean;
  sortOrder?: number;
  gifts?: MembershipCampaignGiftInput[];
  /** Vacío = apagada en todas. */
  branchIds?: string[];
}

/** PATCH: todo opcional; `gifts` y `branchIds`, si vienen, REEMPLAZAN la lista. */
export type UpdateMembershipCampaignDto = Partial<CreateMembershipCampaignDto>;

export interface ReplaceMembershipGiftsDto {
  gifts: MembershipCampaignGiftInput[];
}

export interface SetMembershipBranchesDto {
  /** Reemplaza la lista; vacío = apagada. */
  branchIds: string[];
  /** Nota para las sucursales nuevas. */
  note?: string;
}

export interface MembershipCampaignListQueryParams {
  /** Código o nombre. */
  search?: string;
  countryId?: string;
  isActive?: boolean;
  /** Solo campañas habilitadas en esta sucursal. */
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface MembershipCampaignListResponse {
  data: MembershipCampaign[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ================================
// CANJES
// ================================
export interface MembershipRedemptionGift {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  /** false = sin existencia en la sucursal al vender (no se entregó). */
  delivered: boolean;
}

export interface MembershipRedemption {
  id: string;
  campaignId: string;
  campaignCode: string;
  campaignName: string;
  customerId: string;
  customerNumber: string | null;
  customerName: string;
  saleId: string;
  saleNumber: string;
  saleStatus: string;
  branchId: string;
  branchName: string;
  pointsCounted: number;
  minPoints: number;
  status: MembershipRedemptionStatus;
  kitTypeBefore: string | null;
  kitTypeAfter: string | null;
  couponCode: string | null;
  /** Veces que se ha usado el cupón. */
  couponUses: number | null;
  gifts: MembershipRedemptionGift[];
  appliedAt: string | null;
  revertedAt: string | null;
  error: string | null;
  createdAt: string;
}

/** Aplicar la campaña a una venta YA COBRADA (POST :id/apply-to-sale). */
export interface ApplyMembershipToSaleDto {
  /** Folio de la venta del POS, p. ej. 253-20261021-0032. */
  saleNumber: string;
}

export interface MembershipRedemptionListQueryParams {
  status?: MembershipRedemptionStatus;
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface MembershipRedemptionListResponse {
  data: MembershipRedemption[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
