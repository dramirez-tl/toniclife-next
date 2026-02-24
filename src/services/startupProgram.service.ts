// startupProgram.service.ts - Service for Startup Program (Programa de Arranque) API

import api from '@/lib/api';
import type {
  ProgramConfig,
  ProgramListResponse,
  ProgramQueryParams,
  CreateProgramDto,
  UpdateProgramDto,
  ChangeStatusDto,
  BonusListResponse,
  BonusSummary,
  BonusQueryParams,
  ProgramProgress,
  RecruitsListResponse,
  RecruitsQueryParams,
} from '@/types/startup-program';

class StartupProgramService {
  // ================================
  // ADMIN: CRUD de Programas
  // ================================

  async listPrograms(params: ProgramQueryParams = {}): Promise<ProgramListResponse> {
    const queryParams = new URLSearchParams();

    if (params.countryCode) queryParams.append('countryCode', params.countryCode);
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));

    const queryString = queryParams.toString();
    const response = await api.get<ProgramListResponse>(
      `/admin/startup-programs${queryString ? `?${queryString}` : ''}`,
    );
    return response.data;
  }

  async getProgram(id: string): Promise<ProgramConfig> {
    const response = await api.get<ProgramConfig>(`/admin/startup-programs/${id}`);
    return response.data;
  }

  async createProgram(dto: CreateProgramDto): Promise<ProgramConfig> {
    const response = await api.post<ProgramConfig>('/admin/startup-programs', dto);
    return response.data;
  }

  async updateProgram(id: string, dto: UpdateProgramDto): Promise<ProgramConfig> {
    const response = await api.patch<ProgramConfig>(`/admin/startup-programs/${id}`, dto);
    return response.data;
  }

  async changeStatus(id: string, dto: ChangeStatusDto): Promise<ProgramConfig> {
    const response = await api.patch<ProgramConfig>(`/admin/startup-programs/${id}/status`, dto);
    return response.data;
  }

  async deleteProgram(id: string): Promise<void> {
    await api.delete(`/admin/startup-programs/${id}`);
  }

  // ================================
  // ADMIN: Bonos del Programa
  // ================================

  async listBonuses(programId: string, params: BonusQueryParams = {}): Promise<BonusListResponse> {
    const qp = new URLSearchParams();
    if (params.triggerType) qp.append('triggerType', params.triggerType);
    if (params.status) qp.append('status', params.status);
    if (params.periodId) qp.append('periodId', params.periodId);
    if (params.page) qp.append('page', String(params.page));
    if (params.limit) qp.append('limit', String(params.limit));
    const qs = qp.toString();
    const response = await api.get<BonusListResponse>(
      `/admin/startup-programs/${programId}/bonuses${qs ? `?${qs}` : ''}`,
    );
    return response.data;
  }

  async getBonusSummary(programId: string, periodId?: string): Promise<BonusSummary> {
    const qs = periodId ? `?periodId=${periodId}` : '';
    const response = await api.get<BonusSummary>(
      `/admin/startup-programs/${programId}/bonuses/summary${qs}`,
    );
    return response.data;
  }

  async approveBonuses(programId: string, bonusIds: string[]): Promise<{ approved: number }> {
    const response = await api.post<{ approved: number }>(
      `/admin/startup-programs/${programId}/bonuses/approve`,
      { bonusIds },
    );
    return response.data;
  }

  async markBonusesPaid(programId: string, bonusIds: string[]): Promise<{ paid: number }> {
    const response = await api.post<{ paid: number }>(
      `/admin/startup-programs/${programId}/bonuses/mark-paid`,
      { bonusIds },
    );
    return response.data;
  }

  async getDistributorProgress(programId: string, customerId: string): Promise<ProgramProgress> {
    const response = await api.get<ProgramProgress>(
      `/admin/startup-programs/${programId}/progress/${customerId}`,
    );
    return response.data;
  }

  // ================================
  // DISTRIBUIDOR: Endpoints propios
  // ================================

  async getActivePrograms(): Promise<ProgramConfig[]> {
    const response = await api.get<ProgramConfig[]>('/startup-programs/active');
    return response.data;
  }

  async getMyProgress(programId: string): Promise<ProgramProgress> {
    const response = await api.get<ProgramProgress>(
      `/startup-programs/progress/${programId}`,
    );
    return response.data;
  }

  async getMyBonuses(params: BonusQueryParams = {}): Promise<BonusListResponse> {
    const qp = new URLSearchParams();
    if (params.triggerType) qp.append('triggerType', params.triggerType);
    if (params.status) qp.append('status', params.status);
    if (params.page) qp.append('page', String(params.page));
    if (params.limit) qp.append('limit', String(params.limit));
    const qs = qp.toString();
    const response = await api.get<BonusListResponse>(
      `/startup-programs/bonuses${qs ? `?${qs}` : ''}`,
    );
    return response.data;
  }

  async getMyBonusSummary(): Promise<BonusSummary> {
    const response = await api.get<BonusSummary>('/startup-programs/bonuses/summary');
    return response.data;
  }

  async getMyRecruits(programId: string, params: RecruitsQueryParams = {}): Promise<RecruitsListResponse> {
    const qp = new URLSearchParams();
    if (params.page) qp.append('page', String(params.page));
    if (params.limit) qp.append('limit', String(params.limit));
    const qs = qp.toString();
    const response = await api.get<RecruitsListResponse>(
      `/startup-programs/recruits/${programId}${qs ? `?${qs}` : ''}`,
    );
    return response.data;
  }
}

export const startupProgramService = new StartupProgramService();
export default startupProgramService;
