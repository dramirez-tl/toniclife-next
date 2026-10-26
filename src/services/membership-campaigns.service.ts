// Membership Campaigns Service - cliente del API para campañas de membresía
// (mig 168): "Compra N puntos en producto y tu membresía es gratis".
//
// Lectura con products:read, escritura con products:update. Sin la migración
// 168 el API responde 503 con `message` (la UI lo muestra como aviso).
//
// Ref backend:
//   - toniclife-api/src/modules/membership-campaigns/membership-campaigns.controller.ts

import api from '@/lib/axios';
import type {
  ApplyMembershipToSaleDto,
  CreateMembershipCampaignDto,
  MembershipCampaign,
  MembershipCampaignBranch,
  MembershipCampaignGift,
  MembershipCampaignGiftInput,
  MembershipCampaignListQueryParams,
  MembershipCampaignListResponse,
  MembershipRedemption,
  MembershipRedemptionListQueryParams,
  MembershipRedemptionListResponse,
  SetMembershipBranchesDto,
  UpdateMembershipCampaignDto,
} from '@/types/membership-campaign';

class MembershipCampaignsService {
  /** Lista paginada de campañas (cada una trae regalos, sucursales y canjes). */
  async list(
    params: MembershipCampaignListQueryParams = {},
  ): Promise<MembershipCampaignListResponse> {
    const response = await api.get<MembershipCampaignListResponse>(
      '/membership-campaigns',
      { params },
    );
    return response.data;
  }

  async getById(id: string): Promise<MembershipCampaign> {
    const response = await api.get<MembershipCampaign>(
      `/membership-campaigns/${id}`,
    );
    return response.data;
  }

  /** Quién usó la campaña (venta, sucursal, posición antes/después, cupón, regalos). */
  async listRedemptions(
    id: string,
    params: MembershipRedemptionListQueryParams = {},
  ): Promise<MembershipRedemptionListResponse> {
    const response = await api.get<MembershipRedemptionListResponse>(
      `/membership-campaigns/${id}/redemptions`,
      { params },
    );
    return response.data;
  }

  /** Crea la campaña (nace apagada y sin sucursales salvo que se indiquen). */
  async create(dto: CreateMembershipCampaignDto): Promise<MembershipCampaign> {
    const response = await api.post<MembershipCampaign>(
      '/membership-campaigns',
      dto,
    );
    return response.data;
  }

  /** Actualiza; `gifts` y `branchIds`, si vienen, reemplazan la lista. */
  async update(
    id: string,
    dto: UpdateMembershipCampaignDto,
  ): Promise<MembershipCampaign> {
    const response = await api.patch<MembershipCampaign>(
      `/membership-campaigns/${id}`,
      dto,
    );
    return response.data;
  }

  /**
   * Sube la imagen de la campaña (multipart, campo "image": jpg/png/webp ≤ 7 MB)
   * a S3; regresa la campaña ya con `imageUrl` pública (la que muestra el POS).
   * Quitarla es `update(id, { imageUrl: null })`.
   */
  async uploadImage(
    id: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<MembershipCampaign> {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post<MembershipCampaign>(
      `/membership-campaigns/${id}/image`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: onProgress
          ? (evt) => {
              const total = evt.total ?? file.size;
              if (total > 0) onProgress(Math.min(100, Math.round((evt.loaded / total) * 100)));
            }
          : undefined,
      },
    );
    return data;
  }

  /** Reemplaza los regalos de la campaña. */
  async replaceGifts(
    id: string,
    gifts: MembershipCampaignGiftInput[],
  ): Promise<MembershipCampaignGift[]> {
    const response = await api.put<MembershipCampaignGift[]>(
      `/membership-campaigns/${id}/gifts`,
      { gifts },
    );
    return response.data;
  }

  /**
   * Aplica la campaña a una venta YA COBRADA (posición + cupón; los regalos
   * quedan como no entregados). 400 con el motivo exacto si no aplica.
   */
  async applyToSale(
    id: string,
    dto: ApplyMembershipToSaleDto,
  ): Promise<MembershipRedemption> {
    const response = await api.post<MembershipRedemption>(
      `/membership-campaigns/${id}/apply-to-sale`,
      dto,
    );
    return response.data;
  }

  /** Reemplaza las sucursales donde está encendida (vacío = apagada en todas). */
  async setBranches(
    id: string,
    dto: SetMembershipBranchesDto,
  ): Promise<MembershipCampaignBranch[]> {
    const response = await api.put<MembershipCampaignBranch[]>(
      `/membership-campaigns/${id}/branches`,
      dto,
    );
    return response.data;
  }
}

export const membershipCampaignsService = new MembershipCampaignsService();
