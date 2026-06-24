// maintenance.service.ts - Cliente del módulo de mantenimiento del sistema.
// Endpoints exclusivos super_admin: overview, limpieza por bloques y carga CSV.

import api from '@/lib/axios';
import type {
  CleanupResult,
  ImportResult,
  LoadProgress,
  MaintenanceOverview,
} from '@/types/maintenance';

export interface LoadJob {
  id: string;
  key: string;
  status: 'running' | 'done' | 'error';
  startedAt: string;
  finishedAt?: string;
  result?: ImportResult;
  error?: { message: string; errors?: string[] };
  progress?: LoadProgress;
}

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

  /**
   * Arranca la carga masiva en SEGUNDO PLANO y responde de inmediato con el
   * jobId. La carga corre detached en el backend: NO se cancela si el usuario
   * navega o recarga. El progreso se sigue con getLoadJobs() (polling), de modo
   * que la UI puede reconectarse al volver. Lanza con el shape de axios si el
   * POST falla de entrada (fase inválida, archivo faltante/grande).
   */
  async startImport(key: string, file: File): Promise<{ jobId: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<{ jobId: string; status: string }>(
      `/maintenance/load/${key}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return { jobId: data.jobId };
  }

  /**
   * Lista los jobs de carga vivos (running + terminados dentro del TTL). La UI
   * lo consulta por polling para mostrar/reconectar el progreso de la fase.
   */
  async getLoadJobs(): Promise<LoadJob[]> {
    const { data } = await api.get<LoadJob[]>('/maintenance/load-jobs');
    return data;
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
