// external-settlement.service.ts - Asentar como pagadas las comisiones ya
// depositadas fuera de los lotes de dispersión.
// Backend: GET (vista previa) y POST (aplicar) /mlm/commissions/external-settlement
// (permiso mlm:pay).
import api from '@/lib/api';
import type { ExternalSettlementResult } from '@/types/external-settlement';

class ExternalSettlementService {
  /** Vista previa: cuántas se asentarían y cuáles no, con su motivo. No escribe nada. */
  async preview(periodId: string): Promise<ExternalSettlementResult> {
    const { data } = await api.get<ExternalSettlementResult>('/mlm/commissions/external-settlement', { params: { periodId } });
    return data;
  }

  /**
   * Asienta. `expectedCount` es el `eligible` de la vista previa: si mientras
   * tanto cambió el universo, el servidor responde 409 y no escribe nada.
   */
  async apply(periodId: string, expectedCount: number): Promise<ExternalSettlementResult> {
    const { data } = await api.post<ExternalSettlementResult>('/mlm/commissions/external-settlement', {
      periodId,
      apply: true,
      expectedCount,
    });
    return data;
  }
}

export const externalSettlementService = new ExternalSettlementService();
