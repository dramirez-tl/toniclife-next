// kit-availability.service.ts — cliente de los endpoints de SOLO LECTURA de
// disponibilidad de kits (contrato kits §4.1):
//   GET /products/kits/availability?countryId=&onlyActive=
//   GET /products/:id/kit-availability?branchId=
//
// El API se construye en paralelo: si el servidor todavía no los expone (404 en
// un staging viejo) se devuelve `null` y la interfaz degrada limpio (columna
// oculta / aviso), sin romper la pestaña ni la ficha.

import axios from 'axios';
import api from '@/lib/axios';
import {
  normalizeKitAvailabilityDetail,
  normalizeKitAvailabilitySummary,
  type KitAvailabilityDetail,
  type KitAvailabilitySummary,
} from '@/lib/kits/kit-availability';

const isNotFound = (err: unknown): boolean => axios.isAxiosError(err) && err.response?.status === 404;

export interface KitsAvailabilityParams {
  countryId?: string;
  onlyActive?: boolean;
}

class KitAvailabilityService {
  /** Resumen por kit/paquete. `null` = el servidor aún no calcula disponibilidad. */
  async listAvailability(params: KitsAvailabilityParams = {}): Promise<KitAvailabilitySummary[] | null> {
    try {
      const response = await api.get<unknown>('/products/kits/availability', {
        params: {
          ...(params.countryId && { countryId: params.countryId }),
          onlyActive: params.onlyActive ?? true,
        },
      });
      const body = response.data;
      const rows = Array.isArray(body)
        ? body
        : body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)
          ? ((body as { data: unknown[] }).data)
          : [];
      return rows.map(normalizeKitAvailabilitySummary).filter((r): r is KitAvailabilitySummary => r !== null);
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  /** Detalle de un kit: sin `branchId` trae todas las sucursales; con él, los componentes de esa sucursal. */
  async getKitAvailability(productId: string, branchId?: string): Promise<KitAvailabilityDetail | null> {
    try {
      const response = await api.get<unknown>(`/products/${productId}/kit-availability`, {
        params: branchId ? { branchId } : undefined,
      });
      return normalizeKitAvailabilityDetail(response.data);
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }
}

export const kitAvailabilityService = new KitAvailabilityService();
