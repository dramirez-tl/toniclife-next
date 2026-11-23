// IMPULSA: la ruta de los primeros 90 días (6 Victorias). Backend: `/impulsa/*`.
import api from '@/lib/axios';
import type {
  ImpulsaActivityMetric,
  ImpulsaAdminCatalog,
  ImpulsaAdminParticipants,
  ImpulsaAdminQuery,
  ImpulsaAdminSummary,
  ImpulsaCard,
  ImpulsaOverview,
  ImpulsaTeam,
  ImpulsaVictoryDetail,
} from '@/types/impulsa';

/** Solo viajan los filtros con valor (el API rechaza parámetros que no conoce o vacíos). */
function adminParams(query: ImpulsaAdminQuery): Record<string, string | number> {
  return {
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
    ...(query.search?.trim() ? { search: query.search.trim() } : {}),
    ...(query.victory ? { victory: query.victory } : {}),
    ...(query.page ? { page: query.page } : {}),
    ...(query.limit ? { limit: query.limit } : {}),
  };
}

class ImpulsaService {
  private basePath = '/impulsa';

  // ===== Distribuidor =====

  /** Mi ruta: en qué día voy, mis Victorias y mi avance. */
  async getOverview(): Promise<ImpulsaOverview> {
    const { data } = await api.get<ImpulsaOverview>(`${this.basePath}/me`);
    return data;
  }

  /** Todo lo de una Victoria (1 a 6). */
  async getVictory(number: number): Promise<ImpulsaVictoryDetail> {
    const { data } = await api.get<ImpulsaVictoryDetail>(`${this.basePath}/victories/${number}`);
    return data;
  }

  /** Marcar o desmarcar una casilla de la Tarjeta de Ruta. Devuelve la tarjeta como quedó. */
  async setCheck(key: string, checked: boolean): Promise<ImpulsaCard> {
    const { data } = await api.put<ImpulsaCard>(`${this.basePath}/card/checks/${encodeURIComponent(key)}`, { checked });
    return data;
  }

  /** Sumar (1) o quitar (-1) una casilla de un renglón diario. */
  async addActivity(metric: ImpulsaActivityMetric, delta: 1 | -1): Promise<ImpulsaCard> {
    const { data } = await api.post<ImpulsaCard>(`${this.basePath}/card/activity`, { metric, delta });
    return data;
  }

  /** Día 7: la fecha (y la nota) de mi siguiente acción. */
  async setNextAction(date: string | null, note: string | null): Promise<ImpulsaCard> {
    const { data } = await api.put<ImpulsaCard>(`${this.basePath}/card/next-action`, { date, note });
    return data;
  }

  /** Día 7: aceptar mi Compromiso Tonic. */
  async setCommitment(accepted: boolean): Promise<ImpulsaCard> {
    const { data } = await api.put<ImpulsaCard>(`${this.basePath}/card/commitment`, { accepted });
    return data;
  }

  // ===== Patrocinador =====

  /** Los nuevos distribuidores que acompaño. */
  async getTeam(): Promise<ImpulsaTeam> {
    const { data } = await api.get<ImpulsaTeam>(`${this.basePath}/team`);
    return data;
  }

  // ===== Comercial =====

  async getAdminSummary(query: Pick<ImpulsaAdminQuery, 'from' | 'to'>): Promise<ImpulsaAdminSummary> {
    const { data } = await api.get<ImpulsaAdminSummary>(`${this.basePath}/admin/summary`, {
      params: adminParams(query),
    });
    return data;
  }

  async getAdminParticipants(query: ImpulsaAdminQuery): Promise<ImpulsaAdminParticipants> {
    const { data } = await api.get<ImpulsaAdminParticipants>(`${this.basePath}/admin/participants`, {
      params: adminParams(query),
    });
    return data;
  }

  async getAdminCatalog(): Promise<ImpulsaAdminCatalog> {
    const { data } = await api.get<ImpulsaAdminCatalog>(`${this.basePath}/admin/catalog`);
    return data;
  }

  /** Mover a mano el Día 0 de una cuenta (demostración o corrección); `date` null regresa a su inscripción. */
  async setDayZero(
    customerNumber: string,
    date: string | null,
    note: string | null,
  ): Promise<{ customerNumber: string; dayZero: string; dayZeroSource: 'enrollment' | 'manual'; day: number }> {
    const { data } = await api.put(`${this.basePath}/admin/participants/${encodeURIComponent(customerNumber)}/day-zero`, {
      date,
      note,
    });
    return data;
  }
}

export const impulsaService = new ImpulsaService();
