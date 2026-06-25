// branch.ts - TypeScript types for Branches module
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 4.2.4

// ================================
// BRANCH TYPES
// ================================

export interface Branch {
  id: string;
  code: string;
  name: string;
  parentBranchId?: string;
  countryId?: string;
  countryName?: string;
  stateId?: string;
  stateCode?: string;
  stateName?: string;
  currencyCode?: string;
  roundingMode?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressPhone?: string;
  addressEmail?: string;
  latitude?: number;
  longitude?: number;
  /** @deprecated Envío por sucursal sin uso. El costo se configura globalmente en Configuración → Envíos (system_settings). */
  shippingFreeThreshold?: number;
  /** @deprecated Envío por sucursal sin uso. Ver Configuración → Envíos. */
  shippingCost?: number;
  ticketName?: string;
  ticketAddress?: string;
  ticketHeader?: string;
  ticketFooter?: string;
  ticketStartFolio?: string;
  ticketEndFolio?: string;
  isWarehouse: boolean;
  isPickupPoint: boolean;
  isPosEnabled: boolean;
  isEcommerceEnabled: boolean;
  botName?: string;
  botEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  isCedea?: boolean;
  cedeaDistributorName?: string | null;
  cedeaDistributorNumber?: string | null;
  cedeaContractNumber?: string | null;
  timezone?: string;
}

// ================================
// CEDEA TYPES
// ================================

export interface CedeaInfo {
  contractId: string;
  contractNumber?: string;
  commissionRate?: number;
  status?: string;
  openingDate?: string;
  distributorId?: string;
  distributorName?: string;
  distributorNumber?: string;
  distributorEmail?: string;
}

export interface PosUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roleCode?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface CreatePosUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UpdatePosUserDto {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

// ================================
// QUERY TYPES
// ================================

export interface BranchQueryParams {
  search?: string;
  countryId?: string;
  isWarehouse?: boolean;
  isPickupPoint?: boolean;
  isPosEnabled?: boolean;
  isActive?: boolean;
  isCedea?: boolean;
  page?: number;
  limit?: number;
}

// ================================
// RESPONSE TYPES
// ================================

export interface BranchListResponse {
  data: Branch[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ================================
// MUTATION TYPES
// ================================

export interface CreateBranchDto {
  code: string;
  name: string;
  parentBranchId?: string;
  countryId?: string;
  stateId?: string | null;
  currencyCode?: string;
  roundingMode?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressPhone?: string;
  addressEmail?: string;
  latitude?: number;
  longitude?: number;
  /** @deprecated Envío por sucursal sin uso. El costo se configura globalmente en Configuración → Envíos (system_settings). */
  shippingFreeThreshold?: number;
  /** @deprecated Envío por sucursal sin uso. Ver Configuración → Envíos. */
  shippingCost?: number;
  ticketName?: string;
  ticketAddress?: string;
  ticketHeader?: string;
  ticketFooter?: string;
  ticketStartFolio?: string;
  ticketEndFolio?: string;
  isWarehouse?: boolean;
  isPickupPoint?: boolean;
  isPosEnabled?: boolean;
  isEcommerceEnabled?: boolean;
  botName?: string;
  botEnabled?: boolean;
  isActive?: boolean;
  timezone?: string;
}

export interface UpdateBranchDto {
  code?: string;
  name?: string;
  parentBranchId?: string;
  countryId?: string;
  stateId?: string | null;
  currencyCode?: string;
  roundingMode?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressPhone?: string;
  addressEmail?: string;
  latitude?: number;
  longitude?: number;
  /** @deprecated Envío por sucursal sin uso. El costo se configura globalmente en Configuración → Envíos (system_settings). */
  shippingFreeThreshold?: number;
  /** @deprecated Envío por sucursal sin uso. Ver Configuración → Envíos. */
  shippingCost?: number;
  ticketName?: string;
  ticketAddress?: string;
  ticketHeader?: string;
  ticketFooter?: string;
  ticketStartFolio?: string;
  ticketEndFolio?: string;
  isWarehouse?: boolean;
  isPickupPoint?: boolean;
  isPosEnabled?: boolean;
  isEcommerceEnabled?: boolean;
  botName?: string;
  botEnabled?: boolean;
  isActive?: boolean;
  timezone?: string;
}
