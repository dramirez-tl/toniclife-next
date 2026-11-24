// botnatura.service.ts - Facturación a Botnatura (API /billing/botnatura/*, permiso billing:manual).

import { apiClient } from '@/lib/api-client';
import type {
  BotnaturaCreateResponse,
  BotnaturaInvoiceRequest,
  BotnaturaInvoicesResponse,
  BotnaturaPreview,
  BotnaturaProduct,
  BotnaturaProductsQuery,
  BotnaturaProductsResponse,
  BotnaturaSettings,
  SaveBotnaturaProduct,
  SaveBotnaturaSettings,
} from '@/types/botnatura';

const BASE_URL = '/billing/botnatura';

export const botnaturaService = {
  async listProducts(params: BotnaturaProductsQuery): Promise<BotnaturaProductsResponse> {
    return (await apiClient.get<BotnaturaProductsResponse>(`${BASE_URL}/products`, { params })).data;
  },
  /** Productos activos de una lista de claves exactas (captura por lote). Una clave puede venir en las dos líneas. */
  async lookupProducts(codes: string[]): Promise<{ data: BotnaturaProduct[] }> {
    return (await apiClient.post<{ data: BotnaturaProduct[] }>(`${BASE_URL}/products/lookup`, { codes })).data;
  },
  async createProduct(dto: SaveBotnaturaProduct): Promise<BotnaturaProduct> {
    return (await apiClient.post<BotnaturaProduct>(`${BASE_URL}/products`, dto)).data;
  },
  async updateProduct(id: string, dto: SaveBotnaturaProduct): Promise<BotnaturaProduct> {
    return (await apiClient.patch<BotnaturaProduct>(`${BASE_URL}/products/${id}`, dto)).data;
  },
  async getSettings(): Promise<BotnaturaSettings> {
    return (await apiClient.get<BotnaturaSettings>(`${BASE_URL}/settings`)).data;
  },
  async saveSettings(dto: SaveBotnaturaSettings): Promise<BotnaturaSettings> {
    return (await apiClient.put<BotnaturaSettings>(`${BASE_URL}/settings`, dto)).data;
  },
  async previewInvoice(dto: BotnaturaInvoiceRequest): Promise<BotnaturaPreview> {
    return (await apiClient.post<BotnaturaPreview>(`${BASE_URL}/invoices/preview`, dto)).data;
  },
  async createInvoice(dto: BotnaturaInvoiceRequest): Promise<BotnaturaCreateResponse> {
    return (await apiClient.post<BotnaturaCreateResponse>(`${BASE_URL}/invoices`, dto)).data;
  },
  async listInvoices(params: { page?: number; limit?: number }): Promise<BotnaturaInvoicesResponse> {
    return (await apiClient.get<BotnaturaInvoicesResponse>(`${BASE_URL}/invoices`, { params })).data;
  },
};
