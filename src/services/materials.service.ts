import api from '@/lib/axios';
import type {
  MarketingMaterial,
  CreateMaterialDto,
  UpdateMaterialDto,
  MaterialQueryParams,
  MaterialsListResponse,
  MaterialEnrollment,
  CreateMaterialEnrollmentsDto,
  MaterialAccessResult,
} from '@/types/material';

function uploadToSignedUrl(
  uploadUrl: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    for (const [k, v] of Object.entries(headers || {})) {
      xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (evt) => {
      if (onProgress && evt.lengthComputable) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`GCS rechazó la subida (HTTP ${xhr.status})`));
    };
    xhr.onerror = () =>
      reject(new Error('Error de red o CORS al subir a GCS.'));
    xhr.onabort = () => reject(new Error('Subida cancelada'));
    xhr.send(file);
  });
}

class MaterialsService {
  private basePath = '/materials';

  async getAll(params?: MaterialQueryParams): Promise<MaterialsListResponse> {
    const { data } = await api.get(this.basePath, { params });
    return data;
  }

  async getPublished(params?: MaterialQueryParams): Promise<MarketingMaterial[]> {
    const { data } = await api.get(`${this.basePath}/published`, { params });
    return data;
  }

  async getMyMaterials(params?: MaterialQueryParams): Promise<MarketingMaterial[]> {
    const { data } = await api.get(`${this.basePath}/my-materials`, { params });
    return data;
  }

  async canAccess(id: string): Promise<MaterialAccessResult> {
    const { data } = await api.get(`${this.basePath}/${id}/can-access`);
    return data;
  }

  // Enrollments
  async listEnrollments(id: string): Promise<MaterialEnrollment[]> {
    const { data } = await api.get(`${this.basePath}/${id}/enrollments`);
    return data;
  }

  async addEnrollments(id: string, dto: CreateMaterialEnrollmentsDto): Promise<{ added: number }> {
    const { data } = await api.post(`${this.basePath}/${id}/enrollments`, dto);
    return data;
  }

  async searchCustomersForEnrollment(
    query: string,
    limit = 20,
  ): Promise<
    {
      id: string;
      customerNumber: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    }[]
  > {
    const { data } = await api.get(`${this.basePath}/enrollments/customer-search`, {
      params: { q: query, limit },
    });
    return data;
  }

  async removeEnrollment(id: string, customerId: string): Promise<{ success: boolean }> {
    const { data } = await api.delete(`${this.basePath}/${id}/enrollments/${customerId}`);
    return data;
  }

  async getById(id: string): Promise<MarketingMaterial> {
    const { data } = await api.get(`${this.basePath}/${id}`);
    return data;
  }

  async create(dto: CreateMaterialDto): Promise<MarketingMaterial> {
    const { data } = await api.post(this.basePath, dto);
    return data;
  }

  async update(id: string, dto: UpdateMaterialDto): Promise<MarketingMaterial> {
    const { data } = await api.patch(`${this.basePath}/${id}`, dto);
    return data;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const { data } = await api.delete(`${this.basePath}/${id}`);
    return data;
  }

  async reorder(orderedIds: string[]): Promise<{ updated: number }> {
    const { data } = await api.post(`${this.basePath}/reorder`, { orderedIds });
    return data;
  }

  async uploadFile(
    id: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<MarketingMaterial> {
    // Paso 1: pedir URL firmada
    const { data: signed } = await api.post<{
      uploadUrl: string;
      gcsPath: string;
      requiredHeaders: Record<string, string>;
    }>(`${this.basePath}/${id}/file/upload-url`, {
      mimeType: file.type || 'application/octet-stream',
      originalName: file.name,
    });

    // Paso 2: subir directo a GCS
    await uploadToSignedUrl(signed.uploadUrl, file, signed.requiredHeaders, onProgress);

    // Paso 3: finalizar
    const { data } = await api.post<MarketingMaterial>(
      `${this.basePath}/${id}/file/finalize`,
      {
        gcsPath: signed.gcsPath,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
      },
    );
    return data;
  }

  async uploadThumbnail(id: string, file: File): Promise<{ thumbnailUrl: string }> {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post(`${this.basePath}/${id}/thumbnail`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async getDownloadUrl(id: string): Promise<{ url: string; expiresAt: string }> {
    const { data } = await api.get(`${this.basePath}/${id}/download-url`);
    return data;
  }

  async getPreviewUrl(id: string): Promise<{ url: string; expiresAt: string }> {
    const { data } = await api.get(`${this.basePath}/${id}/preview-url`);
    return data;
  }
}

export const materialsService = new MaterialsService();
