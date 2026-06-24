// maintenance.service.ts - Cliente del módulo de mantenimiento del sistema.
// Endpoints exclusivos super_admin: overview, limpieza por bloques y carga CSV.

import api from '@/lib/axios';
import type {
  CleanupResult,
  ImportResult,
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
   * Carga masiva en SEGUNDO PLANO: arranca el job en el backend (respuesta
   * inmediata con jobId) y consulta el estado por polling hasta terminar.
   * Soporta archivos grandes/lentos sin topar timeouts del request.
   * Devuelve el ImportResult al terminar, o lanza un error con el mismo shape
   * que axios ({ response: { data: { message, errors } } }) si falla.
   */
  async importCsv(key: string, file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const start = await api.post<{ jobId: string; status: string }>(
      `/maintenance/load/${key}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    const jobId = start.data.jobId;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const maxTries = 600; // ~25 min a 2.5s
    for (let i = 0; i < maxTries; i++) {
      await sleep(2500);
      const { data: job } = await api.get<LoadJob>(
        `/maintenance/load-job/${jobId}`,
      );
      if (job.status === 'done' && job.result) return job.result;
      if (job.status === 'error') {
        throw {
          response: {
            data: {
              message: job.error?.message ?? 'Error en la carga',
              errors: job.error?.errors,
            },
          },
        };
      }
    }
    throw {
      response: {
        data: {
          message:
            'La carga sigue procesando en el servidor. Revisa los conteos en unos minutos.',
        },
      },
    };
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
