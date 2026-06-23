// Kits Service - Frontend API client for kit management
// Los kits son products con product_type='kit'. Este service reutiliza
// los endpoints de /products + el endpoint nuevo /customers/kit-enrollment.

import api from '@/lib/axios';
import { ProductType, type Product, type ProductListResponse } from '@/types/product';
import type {
  Kit,
  KitComponent,
  KitListQueryParams,
  BulkReplaceComponentsDto,
  KitEnrollmentRequest,
  KitEnrollmentResponse,
  KitBonus,
  CreateKitBonusInput,
  UpdateKitBonusInput,
} from '@/types/kit';

class KitsService {
  /**
   * Lista kits de inscripción. Filtra por defecto a is_enrollment_kit=TRUE
   * (excluye los 714 paquetes promocionales legacy clasificados como
   * product_type='kit'). El consumidor puede pasar isEnrollmentKit=false
   * explicitamente si necesita ver el catalogo completo.
   */
  async listKits(params: KitListQueryParams = {}): Promise<ProductListResponse> {
    const response = await api.get<ProductListResponse>('/products', {
      params: {
        isEnrollmentKit: true,
        ...params,
        productType: ProductType.KIT,
      },
    });
    return response.data;
  }

  /**
   * Detalle de un kit por ID. Reusa /products/:id.
   */
  async getKit(id: string): Promise<Kit> {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data;
  }

  /**
   * Componentes del kit.
   */
  async getComponents(kitId: string): Promise<KitComponent[]> {
    const response = await api.get<KitComponent[]>(`/products/${kitId}/components`);
    return response.data;
  }

  /**
   * Reemplaza atomicamente todos los componentes del kit.
   * Backend: PUT /products/:id/components/bulk
   */
  async replaceComponents(
    kitId: string,
    dto: BulkReplaceComponentsDto,
  ): Promise<KitComponent[]> {
    const response = await api.put<KitComponent[]>(
      `/products/${kitId}/components/bulk`,
      dto,
    );
    return response.data;
  }

  // ==========================================================================
  // BONOS DE INSCRIPCION DEL KIT (kit_enrollment_bonuses)
  // Backend: /products/:id/bonuses
  // ==========================================================================

  /** Lista todas las reglas de bono del kit (vigentes e historicas). */
  async getBonuses(kitId: string): Promise<KitBonus[]> {
    const response = await api.get<KitBonus[]>(`/products/${kitId}/bonuses`);
    return response.data;
  }

  /** Crea la regla de bono vigente (supersede la anterior de esa combinacion). */
  async createBonus(
    kitId: string,
    dto: CreateKitBonusInput,
  ): Promise<KitBonus> {
    const response = await api.post<KitBonus>(
      `/products/${kitId}/bonuses`,
      dto,
    );
    return response.data;
  }

  /** Actualiza monto / moneda / notas de una regla de bono. */
  async updateBonus(
    kitId: string,
    bonusId: string,
    dto: UpdateKitBonusInput,
  ): Promise<KitBonus> {
    const response = await api.patch<KitBonus>(
      `/products/${kitId}/bonuses/${bonusId}`,
      dto,
    );
    return response.data;
  }

  /** Desactiva (cierra) una regla de bono. No borra el historico. */
  async deactivateBonus(kitId: string, bonusId: string): Promise<KitBonus> {
    const response = await api.delete<KitBonus>(
      `/products/${kitId}/bonuses/${bonusId}`,
    );
    return response.data;
  }

  /**
   * Inscribe un nuevo distribuidor vendiendo un kit en el POS.
   * Backend: POST /customers/kit-enrollment
   *
   * El customerId devuelto se usa luego en la venta del POS para cobrar el kit.
   */
  async enrollProspect(dto: KitEnrollmentRequest): Promise<KitEnrollmentResponse> {
    const response = await api.post<KitEnrollmentResponse>(
      '/customers/kit-enrollment',
      dto,
    );
    return response.data;
  }
}

export const kitsService = new KitsService();
