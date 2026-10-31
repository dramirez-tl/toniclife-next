// cedea.service.ts - "Mi CEDEA" (mig 180): GET /reports/cedea/earnings.
// El API aplica el alcance por sucursal (dueños de CEDEA y CEDEAS Supervisor
// solo reciben sus sucursales); periodo = commission_periods, nunca mes calendario.

import api from '@/lib/api';
import type { CedeaEarningsQuery, CedeaEarningsResponse } from '@/types/cedea';

export const cedeaService = {
  async getEarnings(query: CedeaEarningsQuery = {}): Promise<CedeaEarningsResponse> {
    const response = await api.get<CedeaEarningsResponse>('/reports/cedea/earnings', {
      params: {
        ...(query.periodNumber ? { periodNumber: query.periodNumber } : {}),
        ...(query.branchId ? { branchId: query.branchId } : {}),
      },
    });
    return response.data;
  },
};

export default cedeaService;
