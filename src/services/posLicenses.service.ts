// posLicenses.service.ts - Frontend API client para licencias POS

import api from '@/lib/axios';
import type {
  PosLicense,
  PosLicenseStatus,
  CreatePosLicenseDto,
  UpdatePosLicenseDto,
  RevokePosLicenseDto,
} from '@/types/posLicense';

class PosLicensesService {
  async getAll(status?: PosLicenseStatus): Promise<PosLicense[]> {
    const response = await api.get<PosLicense[]>('/pos-licenses', {
      params: status ? { status } : undefined,
    });
    return response.data;
  }

  async getByBranch(branchId: string): Promise<PosLicense[]> {
    const response = await api.get<PosLicense[]>(`/pos-licenses/by-branch/${branchId}`);
    return response.data;
  }

  async getById(id: string): Promise<PosLicense> {
    const response = await api.get<PosLicense>(`/pos-licenses/${id}`);
    return response.data;
  }

  async create(dto: CreatePosLicenseDto): Promise<PosLicense> {
    const response = await api.post<PosLicense>('/pos-licenses', dto);
    return response.data;
  }

  async update(id: string, dto: UpdatePosLicenseDto): Promise<PosLicense> {
    const response = await api.patch<PosLicense>(`/pos-licenses/${id}`, dto);
    return response.data;
  }

  async revoke(id: string, dto?: RevokePosLicenseDto): Promise<PosLicense> {
    const response = await api.patch<PosLicense>(`/pos-licenses/${id}/revoke`, dto ?? {});
    return response.data;
  }

  async unbind(id: string): Promise<PosLicense> {
    const response = await api.patch<PosLicense>(`/pos-licenses/${id}/unbind`);
    return response.data;
  }

  /** Libera/bloquea la operación de una terminal individual (pilotos). */
  async setRelease(id: string, released: boolean): Promise<PosLicense> {
    const response = await api.patch<PosLicense>(`/pos-licenses/${id}/release`, {
      released,
    });
    return response.data;
  }

  /** Habilita/deshabilita la facturación de una terminal (piloto doble captura). */
  async setInvoicing(id: string, enabled: boolean): Promise<PosLicense> {
    const response = await api.patch<PosLicense>(`/pos-licenses/${id}/invoicing`, {
      enabled,
    });
    return response.data;
  }
}

export const posLicensesService = new PosLicensesService();
