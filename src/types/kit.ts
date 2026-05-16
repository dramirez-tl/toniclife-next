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
