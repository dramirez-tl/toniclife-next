// maintenance.service.ts - Cliente del módulo de mantenimiento del sistema.
// Endpoints exclusivos super_admin: overview, limpieza por bloques y carga CSV.

import api from '@/lib/axios';
import type {
  CleanupResult,
  ImportResult,
  MaintenanceOverview,
} from '@/types/maintenance';

class MaintenanceService {
  async getOverview(): Promise<MaintenanceOverview> {
    const response = await api.get<MaintenanceOverview>('/maintenance/overview');
    return response.data;
  }

  async runCleanupBlock(blockId: number): Promise<CleanupResult> {
    const response = await api.post<CleanupResult>(
      `/maintenance/cleanup/${blockId}`,
    );
    return response.data;
  }

  async importCsv(key: string, file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ImportResult>(
      `/maintenance/load/${key}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  }

  async downloadTemplate(key: string): Promise<void> {
    const response = await api.get<string>(`/maintenance/load/${key}/template`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantilla_${key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const maintenanceService = new MaintenanceService();
