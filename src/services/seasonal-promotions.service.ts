// Seasonal Promotions Service - cliente del API para promociones de temporada
// (mig 186): temporadas (Buen Fin…) con sus promociones 3x2 / % / precio
// especial / regalo por compra.
//
// Lectura con products:read, escritura con products:seasonal_promos. Sin la
// migración 186 el API responde 503 (la UI lo muestra como aviso).
//
// Ref backend:
//   - toniclife-api/src/modules/seasonal-promotions/seasonal-promotions.controller.ts

import api from '@/lib/axios';
import type {
  CreatePromoSeasonDto,
  CreateSeasonPromotionDto,
  PromoSeason,
  PromoSeasonListQueryParams,
  PromoSeasonListResponse,
  SeasonPromotion,
  SeasonUsageListQueryParams,
  SeasonUsageListResponse,
  SeasonalBundle,
  UpdatePromoSeasonDto,
  UpdateSeasonPromotionDto,
} from '@/types/seasonal-promotion';

function uploadImage<T>(url: string, file: File, onProgress?: (percent: number) => void): Promise<T> {
  const formData = new FormData();
  formData.append('image', file);
  return api
    .post<T>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (evt) => {
            const total = evt.total ?? file.size;
            if (total > 0) onProgress(Math.min(100, Math.round((evt.loaded / total) * 100)));
          }
        : undefined,
    })
    .then((r) => r.data);
}

class SeasonalPromotionsService {
  /** Lista paginada de temporadas (conteo de promociones y uso). */
  async listSeasons(params: PromoSeasonListQueryParams = {}): Promise<PromoSeasonListResponse> {
    const response = await api.get<PromoSeasonListResponse>('/seasonal-promotions/seasons', { params });
    return response.data;
  }

  /** Detalle con promociones, productos y países. */
  async getSeason(id: string): Promise<PromoSeason> {
    const response = await api.get<PromoSeason>(`/seasonal-promotions/seasons/${id}`);
    return response.data;
  }

  async createSeason(dto: CreatePromoSeasonDto): Promise<PromoSeason> {
    const response = await api.post<PromoSeason>('/seasonal-promotions/seasons', dto);
    return response.data;
  }

  async updateSeason(id: string, dto: UpdatePromoSeasonDto): Promise<PromoSeason> {
    const response = await api.patch<PromoSeason>(`/seasonal-promotions/seasons/${id}`, dto);
    return response.data;
  }

  /** Solo si ninguna venta la usó (409 si no). */
  async deleteSeason(id: string): Promise<void> {
    await api.delete(`/seasonal-promotions/seasons/${id}`);
  }

  /** Arte de la temporada (multipart "image": jpg/png/webp ≤ 7 MB). Quitarla: updateSeason(id, { imageUrl: null }). */
  uploadSeasonImage(id: string, file: File, onProgress?: (percent: number) => void): Promise<PromoSeason> {
    return uploadImage<PromoSeason>(`/seasonal-promotions/seasons/${id}/image`, file, onProgress);
  }

  async listUsages(
    seasonId: string,
    params: SeasonUsageListQueryParams = {},
  ): Promise<SeasonUsageListResponse> {
    const response = await api.get<SeasonUsageListResponse>(
      `/seasonal-promotions/seasons/${seasonId}/usages`,
      {
        params,
      },
    );
    return response.data;
  }

  async createPromotion(seasonId: string, dto: CreateSeasonPromotionDto): Promise<SeasonPromotion> {
    const response = await api.post<SeasonPromotion>(
      `/seasonal-promotions/seasons/${seasonId}/promotions`,
      dto,
    );
    return response.data;
  }

  /** `eligibleProductIds` y `gifts`, si vienen, reemplazan la lista. */
  async updatePromotion(id: string, dto: UpdateSeasonPromotionDto): Promise<SeasonPromotion> {
    const response = await api.patch<SeasonPromotion>(`/seasonal-promotions/promotions/${id}`, dto);
    return response.data;
  }

  async deletePromotion(id: string): Promise<void> {
    await api.delete(`/seasonal-promotions/promotions/${id}`);
  }

  uploadPromotionImage(
    id: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<SeasonPromotion> {
    return uploadImage<SeasonPromotion>(`/seasonal-promotions/promotions/${id}/image`, file, onProgress);
  }

  /** Tienda pública: temporadas vigentes y próximas del país. */
  async storefrontBundle(country: string): Promise<SeasonalBundle> {
    const response = await api.get<SeasonalBundle>('/storefront/seasonal-promotions', {
      params: { country },
    });
    return response.data;
  }
}

export const seasonalPromotionsService = new SeasonalPromotionsService();
