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
  CustomerPromotionGrant,
  ManualGrantRequest,
  ManualGrantResult,
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
   *
   * `countryScope` (componentes por país, mig 099):
   *  - 'global' → solo los globales (aplican donde no hay lista por país).
   *  - <uuid>   → solo los de ese país.
   *  - ausente  → todos los renglones.
   */
  async getComponents(
    promotionId: string,
    countryScope?: string,
  ): Promise<PromotionComponent[]> {
    const response = await api.get<PromotionComponent[]>(
      `/products/${promotionId}/components`,
      { params: countryScope ? { countryId: countryScope } : undefined },
    );
    return response.data;
  }

  /**
   * Reemplaza atomicamente los componentes de la promo DEL ALCANCE indicado.
   * Reusa el endpoint del compositor de kits. `countryId` ausente = alcance
   * global; con UUID = solo ese país (no toca globales ni otros países).
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
  // Derechos por distribuidor (otorgamiento manual, mig 111)
  // ============================================================

  /** Historial de derechos de promoción del distribuidor (admin). */
  async getCustomerGrants(customerId: string): Promise<CustomerPromotionGrant[]> {
    const response = await api.get<CustomerPromotionGrant[]>(
      `/promotions/customers/${customerId}/grants`,
    );
    return response.data;
  }

  /**
   * Otorga promociones MANUALMENTE (excepción autorizada por Operaciones).
   * Permite habilitar promos con ventana vencida; nota obligatoria.
   */
  async grantManual(
    customerId: string,
    dto: ManualGrantRequest,
  ): Promise<ManualGrantResult[]> {
    const response = await api.post<ManualGrantResult[]>(
      `/promotions/customers/${customerId}/grants`,
      dto,
    );
    return response.data;
  }

  /** Revoca un derecho ACTIVO otorgado por error. */
  async revokeGrant(grantId: string): Promise<void> {
    await api.patch(`/promotions/grants/${grantId}/revoke`);
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
   * Sube la imagen POR PAÍS de la promo y la fija en la regla (mig 107).
   */
  async uploadRuleDisplayImage(
    promotionId: string,
    countryId: string,
    file: File,
  ): Promise<PromotionRule> {
    const form = new FormData();
    form.append('image', file);
    const response = await api.post<PromotionRule>(
      `/promotions/${promotionId}/rules/${countryId}/display-image`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
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
