// Types for Promotions module (especializacion sobre Product con
// product_type='promotional'). Las promos viven en la tabla products del
// backend; aqui se exponen tipos con nombres mas explicitos para la UI,
// mas las reglas de canje (product_promotion_rules).
//
// Ref backend:
//   - toniclife-api/src/modules/promotions/promotions.controller.ts
//   - toniclife-api/src/modules/promotions/dto/promotion-rule.dto.ts
//   - toniclife-api/sql/migrations/036_promotion_rules.sql

import type { Product, ProductComponent } from './product';

/**
 * Una Promocion es un Product con product_type='promotional'. Se re-exporta
 * el tipo para que la UI exprese mejor su intencion.
 */
export type Promotion = Product;

export type PromotionComponent = ProductComponent;

// ================================
// REGLA DE CANJE (por pais)
// ================================
export interface PromotionRule {
  id: string;
  productId: string;
  countryId: string;
  /** Codigo ISO del pais (ej. 'MX', 'US'). Puede venir vacio si el JOIN falla. */
  countryCode?: string;
  /** Nombre legible del pais (ej. 'Mexico', 'Estados Unidos'). */
  countryName?: string;
  /** Puntos personales acumulados del periodo requeridos para canjear. */
  minPointsRequired: string;
  /** Días de vigencia del derecho desde que el distribuidor lo gana (default 90). */
  validityDays: number;
  /** 'per_period' = recurrente cada periodo (se acumulan); 'one_time' = una vez. */
  recurrence: 'per_period' | 'one_time';
  /** Fecha (YYYY-MM-DD) desde la que se puede ganar; null = sin límite. */
  availableFrom?: string | null;
  /** Fecha (YYYY-MM-DD) hasta la que se puede ganar; null = sin límite. */
  availableTo?: string | null;
  /** Si TRUE, al canjear se descuentan los puntos del periodo del distribuidor. */
  consumesPoints: boolean;
  isActive: boolean;
  /** Nombre mostrado en ESTE país (null = usa el nombre base del producto). */
  displayName?: string | null;
  /** Nombre corto mostrado en ESTE país (null = usa el base). */
  displayShortName?: string | null;
  /** Descripción mostrada en ESTE país (null = usa la base). */
  displayDescription?: string | null;
  /** Imagen mostrada en ESTE país (null = usa la imagen principal del producto). Mig 107. */
  displayImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertPromotionRuleDto {
  countryId: string;
  minPointsRequired: number;
  /** Días de vigencia del derecho (default 90 ≈ 3 meses). */
  validityDays?: number;
  recurrence?: 'per_period' | 'one_time';
  availableFrom?: string | null;
  availableTo?: string | null;
  consumesPoints?: boolean;
  isActive?: boolean;
  /** Personalización por país (mig 100). Vacío/null = usar el dato base. */
  displayName?: string | null;
  displayShortName?: string | null;
  displayDescription?: string | null;
  /**
   * Imagen por país (mig 107). undefined = NO tocar la actual; null/'' =
   * limpiar (volver a la imagen base). La URL la fija el endpoint de upload.
   */
  displayImageUrl?: string | null;
}

// ================================
// ELEGIBILIDAD
// ================================
export interface PromotionEligibility {
  eligible: boolean;
  currentPoints: number;
  requiredPoints: number;
  missing: number;
  periodId?: string;
  consumesPoints?: boolean;
  /** Mensaje legible para mostrar al usuario cuando NO es elegible. */
  reason?: string;
}

/**
 * Item del endpoint GET /promotions/available/:customerId — promos que el
 * cliente puede canjear hoy en un pais dado.
 */
export interface AvailablePromotionForCustomer {
  productId: string;
  code: string;
  name: string;
  description?: string;
  minPointsRequired: number;
  currentPoints: number;
  consumesPoints: boolean;
  /** Cuántos derechos activos no vencidos tiene de esta promo (≥1). */
  availableCount?: number;
  /** Fecha de vencimiento del próximo derecho a vencer (ISO). */
  expiresAt?: string;
}

// ================================
// LIST QUERY (UI de admin)
// ================================
export interface PromotionListQueryParams {
  search?: string;
  isActive?: boolean;
  countryId?: string;
  page?: number;
  limit?: number;
}

// ================================
// BULK COMPONENTS (reuso del compositor de kits)
// ================================
export interface BulkPromotionComponentItem {
  componentProductId: string;
  quantity: number;
  sortOrder?: number;
}

export interface BulkReplacePromotionComponentsDto {
  components: BulkPromotionComponentItem[];
  /** Alcance del reemplazo (mig 099): ausente = componentes GLOBALES;
   *  UUID = solo los de ese país (no toca globales ni otros países). */
  countryId?: string;
}
