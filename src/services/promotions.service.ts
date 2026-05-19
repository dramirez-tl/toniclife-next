// Promotions Service - Frontend API client para promociones
// Las promociones son products con product_type='promotional'. Este service
// reutiliza los endpoints de /products para el CRUD del producto, y agrega
// los endpoints especificos de canje en /promotions (definidos en el modulo
// PromotionsModule del backend).
//
// Ref backend:
//   - toniclife-api/src/modules/promotions/promotions.controller.ts
//   - toniclife-api/src/modules/products/products.controller.ts

import api from '@/lib/axios';
import {
  ProductType,
  type Product,
  type ProductListResponse,
} from '@/types/product';
import type {
  AvailablePromotionForCustomer,
  BulkReplacePromotionComponentsDto,
  Promotion,
  PromotionComponent,
  PromotionEligibility,
  PromotionListQueryParams,
  PromotionRule,
  UpsertPromotionRuleDto,
} from '@/types/promotion';

class PromotionsService {
  // ============================================================
  // CRUD del producto promocional (via /products)
  // ============================================================

  /**
   * Lista promos (products con product_type='promotional').
   */
  async listPromotions(
    params: PromotionListQueryParams = {},
  ): Promise<ProductListResponse> {
    const response = await api.get<ProductListResponse>('/products', {
      params: {
        ...params,
        productType: ProductType.PROMOTIONAL,
      },
    });
    return response.data;
  }

  /**
   * Detalle de una promo por ID. Reusa /products/:id.
   */
  async getPromotion(id: string): Promise<Promotion> {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data;
  }

  /**
   * Componentes de la promo (BoM). Reusa /products/:id/components.
   */
  async getComponents(promotionId: string): Promise<PromotionComponent[]> {
    const response = await api.get<PromotionComponent[]>(
      `/products/${promotionId}/components`,
    );
    return response.data;
  }

  /**
   * Reemplaza atomicamente todos los componentes de la promo.
   * Reusa el endpoint del compositor de kits.
   */
  async replaceComponents(
    promotionId: string,
    dto: BulkReplacePromotionComponentsDto,
  ): Promise<PromotionComponent[]> {
    const response = await api.put<PromotionComponent[]>(
      `/products/${promotionId}/components/bulk`,
      dto,
    );
    return response.data;
  }

  // ============================================================
  // Reglas de canje por pais (via /promotions/:id/rules)
  // ============================================================

  /**
   * Lista las reglas (umbral de puntos por pais) configuradas para la promo.
   */
  async getRules(promotionId: string): Promise<PromotionRule[]> {
    const response = await api.get<PromotionRule[]>(
      `/promotions/${promotionId}/rules`,
    );
    return response.data;
  }

  /**
   * Crea o actualiza la regla de canje para (promotionId, countryId).
   */
  async upsertRule(
    promotionId: string,
    dto: UpsertPromotionRuleDto,
  ): Promise<PromotionRule> {
    const response = await api.put<PromotionRule>(
      `/promotions/${promotionId}/rules`,
      dto,
    );
    return response.data;
  }

  /**
   * Soft-delete: marca la regla como inactiva.
   */
  async removeRule(promotionId: string, countryId: string): Promise<void> {
    await api.delete(`/promotions/${promotionId}/rules/${countryId}`);
  }

  // ============================================================
  // Elegibilidad y disponibilidad para el cliente
  // ============================================================

  /**
   * Verifica si un cliente puede canjear la promo en un pais.
   */
  async checkEligibility(
    promotionId: string,
    customerId: string,
    countryId: string,
  ): Promise<PromotionEligibility> {
    const response = await api.get<PromotionEligibility>(
      `/promotions/${promotionId}/eligibility`,
      { params: { customerId, countryId } },
    );
    return response.data;
  }

  /**
   * Lista las promos que el cliente puede canjear HOY en un pais.
   */
  async listAvailableForCustomer(
    customerId: string,
    countryId: string,
  ): Promise<AvailablePromotionForCustomer[]> {
    const response = await api.get<AvailablePromotionForCustomer[]>(
      `/promotions/available/${customerId}`,
      { params: { countryId } },
    );
    return response.data;
  }
}

export const promotionsService = new PromotionsService();
