// Types for Kits module (especializacion sobre Product con product_type='kit')
// Los kits viven en la tabla products del backend; aqui se exponen tipos
// con nombres mas explicitos para la UI.

import type { Product, ProductComponent, KitPosition } from './product';

/**
 * Un Kit es un Product con product_type='kit'. Re-exportamos la interface
 * para que la UI exprese mejor su intencion.
 */
export type Kit = Product;

export type KitComponent = ProductComponent;

export interface BulkComponentItem {
  componentProductId: string;
  quantity: number;
  sortOrder?: number;
}

export interface BulkReplaceComponentsDto {
  components: BulkComponentItem[];
}

export interface KitListQueryParams {
  search?: string;
  kitPosition?: KitPosition;
  isEnrollmentKit?: boolean;
  isActive?: boolean;
  countryId?: string;
  page?: number;
  limit?: number;
}

/**
 * Payload para inscribir un nuevo distribuidor al vender un kit en POS.
 * Backend: POST /customers/kit-enrollment
 */
export interface KitEnrollmentRequest {
  sponsorCustomerId: string;
  kitProductId: string;
  firstName: string;
  lastName: string;
  mothersLastName?: string;
  email: string;
  phone: string;
  birthDate?: string;
  rfc?: string;
  curp?: string;
  branchId?: string;
  sendCredentialsByEmail?: boolean;
}

// ============================================================================
// BONO DE INSCRIPCION DEL KIT (kit_enrollment_bonuses)
// ============================================================================

export type BonusRecipientRole = 'sponsor' | 'upline' | 'company';

/** Una regla de bono de inscripcion (vigente o historica). */
export interface KitBonus {
  id: string;
  kitProductId: string;
  countryId: string;
  countryCode: string;
  countryName: string;
  currencyCode: string;
  recipientRole: BonusRecipientRole;
  /** Monto bruto como string (NUMERIC del backend). */
  bonusAmount: string;
  validFrom: string;
  /** NULL = vigente indefinidamente. */
  validUntil: string | null;
  isActive: boolean;
  /** TRUE si es la regla vigente (is_active && valid_until === null). */
  isCurrent: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKitBonusInput {
  countryId: string;
  bonusAmount: number;
  recipientRole?: BonusRecipientRole;
  currencyCode?: string;
  validFrom?: string;
  notes?: string;
}

export interface UpdateKitBonusInput {
  bonusAmount?: number;
  currencyCode?: string;
  notes?: string;
}

export interface KitEnrollmentResponse {
  customerId: string;
  customerNumber: string;
  fullName: string;
  userId: string;
  status: string;
  kitPosition: string;
  sponsor: {
    id: string;
    customerNumber: string;
    name: string;
  };
  tempPassword: string;
  emailSent?: boolean;
  /** Bono que se debe pagar al sponsor por la inscripcion. NULL si no hay regla configurada. */
  sponsorBonus?: {
    ruleId: string;
    amount: number;
    currencyCode: string;
    countryCode: string;
  } | null;
}
