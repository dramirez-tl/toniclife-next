// checkerLicenses.service.ts - Licencias de los checadores de asistencia (Admin › Sistemas ›
// Checadores). El checador (app en tableta Android) se activa con una licencia, igual que una
// caja del punto de venta, pero se administra aparte: su propio tipo y su propio permiso
// (checker_licenses:manage). Estas rutas solo ven y tocan licencias de checador.

import api from '@/lib/axios';
import type { CreatePosLicenseDto, PosLicense, RevokePosLicenseDto, UpdatePosLicenseDto } from '@/types/posLicense';

class CheckerLicensesService {
  async getAll(): Promise<PosLicense[]> {
    const response = await api.get<PosLicense[]>('/checker-licenses');
    return response.data;
  }

  async create(dto: CreatePosLicenseDto): Promise<PosLicense> {
    const response = await api.post<PosLicense>('/checker-licenses', dto);
    return response.data;
  }

  async update(id: string, dto: UpdatePosLicenseDto): Promise<PosLicense> {
    const response = await api.patch<PosLicense>(`/checker-licenses/${id}`, dto);
    return response.data;
  }

  /** Cancela la licencia: el checador se cierra solo y la clave ya no sirve. */
  async revoke(id: string, dto?: RevokePosLicenseDto): Promise<PosLicense> {
    const response = await api.patch<PosLicense>(`/checker-licenses/${id}/revoke`, dto ?? {});
    return response.data;
  }

  /** Libera la licencia de la tableta donde está activa, para usarla en otra. */
  async unbind(id: string): Promise<PosLicense> {
    const response = await api.patch<PosLicense>(`/checker-licenses/${id}/unbind`);
    return response.data;
  }
}

export const checkerLicensesService = new CheckerLicensesService();
