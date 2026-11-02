// cedea.service.ts - "Mi CEDEA" (mig 180) y Tesorería › CEDEAS (2-nov-2026).
// GET /reports/cedea/earnings (alcance por sucursal: dueños de CEDEA y CEDEAS
// Supervisor solo reciben sus sucursales), GET /reports/cedea/payouts (Tesorería:
// todas las CEDEAS con contrato y factura estimada), export CSV y PUT del
// contrato (dueño = el "ID" del CEDEA, porcentaje, régimen). Periodo =
// commission_periods (por id o número), nunca mes calendario.

import api from '@/lib/api';
import type {
  CedeaContract,
  CedeaEarningsQuery,
  CedeaEarningsResponse,
  UpsertCedeaContractInput,
} from '@/types/cedea';

function params(query: CedeaEarningsQuery): Record<string, string | number> {
  return {
    ...(query.periodNumber ? { periodNumber: query.periodNumber } : {}),
    ...(query.periodId ? { periodId: query.periodId } : {}),
    ...(query.branchId ? { branchId: query.branchId } : {}),
  };
}

export const cedeaService = {
  async getEarnings(query: CedeaEarningsQuery = {}): Promise<CedeaEarningsResponse> {
    const response = await api.get<CedeaEarningsResponse>('/reports/cedea/earnings', {
      params: params(query),
    });
    return response.data;
  },

  /** Tesorería › CEDEAS: todas las CEDEAS del periodo con contrato y factura estimada. */
  async getPayouts(query: CedeaEarningsQuery = {}): Promise<CedeaEarningsResponse> {
    const response = await api.get<CedeaEarningsResponse>('/reports/cedea/payouts', {
      params: params(query),
    });
    return response.data;
  },

  /** CSV del bono CEDEA del periodo (blob + nombre sugerido por el API). */
  async exportPayouts(
    query: CedeaEarningsQuery = {},
  ): Promise<{ blob: Blob; disposition: string | null }> {
    const res = await api.get<Blob>('/reports/cedea/payouts/export', {
      params: params(query),
      responseType: 'blob',
    });
    const disposition = (res.headers?.['content-disposition'] as string | undefined) ?? null;
    return { blob: res.data, disposition };
  },

  /** Captura o actualiza el contrato vigente de una sucursal CEDEA. */
  async upsertContract(branchId: string, input: UpsertCedeaContractInput): Promise<CedeaContract> {
    const response = await api.put<CedeaContract>(`/reports/cedea/contracts/${branchId}`, input);
    return response.data;
  },
};

export default cedeaService;
