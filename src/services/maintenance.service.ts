// maintenance.service.ts - Cliente del módulo de mantenimiento del sistema.
// Endpoints exclusivos super_admin: overview, limpieza por bloques y carga CSV.

import api from '@/lib/axios';
import type {
  CleanupResult,
  ImportResult,
  LoadProgress,
  MaintenanceOverview,
  PeriodSalesPreview,
  PeriodSalesResetResult,
} from '@/types/maintenance';

/** Un distribuidor en BD ausente del archivo maestro (candidato a borrar). */
export interface ClientesSyncRemoval {
  customerNumber: string;
  nombre: string;
  tieneTransaccional: boolean;
  tieneRed: boolean;
  deletable: boolean;
  motivoBloqueo?: string;
}

/** Un cliente existente cuyo patrocinador del archivo difiere del de la BD. */
export interface ClientesSyncSponsorChange {
  customerNumber: string;
  nombre: string;
  sponsorActual: string | null;
  sponsorArchivo: string | null;
}

/** Plan (dry-run) del SYNC de clientes. */
export interface ClientesSyncPlan {
  totalRows: number;
  aInsertar: number;
  aActualizar: number;
  aBorrar: number;
  aBorrarBloqueados: number;
  removals: ClientesSyncRemoval[];
  sponsorChanges: ClientesSyncSponsorChange[];
  pctBorrar: number;
  umbralPct: number;
  excedeUmbral: boolean;
  token: string;
}

/** Resultado del apply del SYNC de clientes. */
export interface ClientesSyncApplyResult {
  insertados: number;
  actualizados: number;
  borrados: number;
  borradosOmitidos: number;
  raicesRed: number;
  accesosLegacy: number;
  durationMs: number;
}

export interface LoadJob {
  id: string;
  key: string;
  kind?: 'import' | 'sync-preview' | 'sync-apply';
  status: 'running' | 'done' | 'error';
  startedAt: string;
  finishedAt?: string;
  result?: ImportResult;
  syncPlan?: ClientesSyncPlan;
  syncApply?: ClientesSyncApplyResult;
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

  /** Previsualiza las ventas (orders + pos_sales) de un periodo antes del reset. */
  async getPeriodSalesPreview(periodId: string): Promise<PeriodSalesPreview> {
    const { data } = await api.get<PeriodSalesPreview>(
      `/maintenance/period-sales/${periodId}/preview`,
    );
    return data;
  }

  /** Borra TODAS las ventas (orders + pos_sales) del periodo por rango de fecha. */
  async resetPeriodSales(periodId: string): Promise<PeriodSalesResetResult> {
    const { data } = await api.post<PeriodSalesResetResult>(
      `/maintenance/reset-period-sales/${periodId}`,
    );
    return data;
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

  /**
   * Arranca el PREVIEW (dry-run) del SYNC de clientes en segundo plano. El plan se
   * sigue por getLoadJobs() (job kind='sync-preview' → syncPlan al terminar).
   */
  async startSyncPreview(file: File): Promise<{ jobId: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<{ jobId: string; status: string }>(
      '/maintenance/clientes-sync/preview',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return { jobId: data.jobId };
  }

  /**
   * Arranca el APPLY del SYNC de clientes (requiere el token del preview del MISMO
   * archivo). `force` permite exceder el umbral de borrado. Se sigue por
   * getLoadJobs() (job kind='sync-apply' → syncApply al terminar).
   */
  async startSyncApply(
    file: File,
    token: string,
    force: boolean,
  ): Promise<{ jobId: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('token', token);
    if (force) formData.append('force', 'true');
    const { data } = await api.post<{ jobId: string; status: string }>(
      '/maintenance/clientes-sync/apply',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return { jobId: data.jobId };
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
