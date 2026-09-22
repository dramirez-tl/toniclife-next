// kit-admin.service.ts — cliente del API para el editor único de kits en la
// ficha de producto (contrato de kits §4.1/§4.2/§5.2):
//   GET  /products/:id/kit-readiness                       "¿Está listo para vender?"
//   GET  /products/:id/kit-sales?periods=N                 ventas por periodo (26 → 25)
//   GET  /products/:id/components?countryId=global         receta GLOBAL (la que edita la ficha)
//   GET  /inventory/kits/:id/clear-own-stock/preview       vista previa de la baja
//   POST /inventory/kits/:id/clear-own-stock { reason }    dejar en cero la existencia propia
//
// Un 404 en las lecturas devuelve `null` (servidor sin la ruta o producto que
// no es kit/paquete): la interfaz degrada sin romper la ficha. Las escrituras
// propagan el error para que quien llama muestre `message` del API.

import axios from 'axios';
import api from '@/lib/axios';
import {
  normalizeOwnStockClearResult,
  normalizeOwnStockPreview,
  type KitOwnStockClearResult,
  type KitOwnStockPreview,
} from '@/lib/kits/kit-editor';
import { normalizeKitReadiness, type KitReadiness } from '@/lib/kits/kit-readiness';
import { normalizeKitSales, normalizeKitSalesSummary, type KitSales, type KitSalesSummary } from '@/lib/kits/kit-sales';
import type { KitComponent } from '@/types/kit';

const isNotFound = (err: unknown): boolean => axios.isAxiosError(err) && err.response?.status === 404;

class KitAdminService {
  async getReadiness(productId: string): Promise<KitReadiness | null> {
    try {
      const response = await api.get<unknown>(`/products/${productId}/kit-readiness`);
      return normalizeKitReadiness(response.data);
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  /** `periods` = los últimos N periodos de negocio incluido el vigente (1-12). */
  async getSales(productId: string, periods = 3): Promise<KitSales | null> {
    try {
      const response = await api.get<unknown>(`/products/${productId}/kit-sales`, {
        params: { periods: Math.min(12, Math.max(1, Math.trunc(periods))) },
      });
      return normalizeKitSales(response.data);
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  /**
   * Unidades cobradas/canceladas de TODOS los kits en un periodo de negocio
   * (pestaña Kits, una consulta). Sin `periodNumber` = el vigente; ahí un 404
   * significa servidor sin la ruta o sin periodo vigente y se devuelve `null`.
   * Con `periodNumber` el 404 ("El periodo N no existe.") se propaga para
   * mostrarlo tal cual.
   */
  async getSalesSummary(periodNumber?: number): Promise<KitSalesSummary | null> {
    try {
      const response = await api.get<unknown>('/products/kits/sales-summary', {
        params: periodNumber !== undefined ? { periodNumber: Math.trunc(periodNumber) } : undefined,
      });
      return normalizeKitSalesSummary(response.data);
    } catch (err) {
      if (periodNumber === undefined && isNotFound(err)) return null;
      throw err;
    }
  }

  /** Receta GLOBAL activa de un kit/paquete (para "Copiar receta de otro kit…"). */
  async getGlobalComponents(productId: string): Promise<KitComponent[]> {
    const response = await api.get<KitComponent[]>(`/products/${productId}/components`, {
      params: { countryId: 'global' },
    });
    return Array.isArray(response.data) ? response.data : [];
  }

  async getOwnStockPreview(productId: string): Promise<KitOwnStockPreview | null> {
    const response = await api.get<unknown>(`/inventory/kits/${productId}/clear-own-stock/preview`);
    return normalizeOwnStockPreview(response.data);
  }

  async clearOwnStock(productId: string, reason: string): Promise<KitOwnStockClearResult | null> {
    const response = await api.post<unknown>(`/inventory/kits/${productId}/clear-own-stock`, { reason });
    return normalizeOwnStockClearResult(response.data);
  }
}

export const kitAdminService = new KitAdminService();
export default kitAdminService;
