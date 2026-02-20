// services/distributorApi.ts - API del Centro de Negocio para distribuidores (axios)

import api from '@/lib/axios';
import type {
  DistributorProfile,
  PeriodPoints,
  RankProgress,
  NetworkSummary,
  SalesSummary,
  CommissionsSummary,
  RecentActivity,
  TopPerformer,
  DashboardStats,
  DashboardResponse,
  Goal,
} from '@/types/distributor';

// ===== API SERVICE =====

class DistributorApi {
  /**
   * Obtiene el dashboard completo del distribuidor
   * Backend: GET /distributor/dashboard
   */
  async getDashboard(): Promise<DashboardResponse> {
    const { data } = await api.get<DashboardResponse>('/distributor/dashboard');
    return data;
  }

  /**
   * Obtiene el perfil del distribuidor
   * Backend: GET /distributor/profile
   */
  async getProfile(): Promise<DistributorProfile> {
    const { data } = await api.get<DistributorProfile>('/distributor/profile');
    return data;
  }

  /**
   * Obtiene los puntos del periodo actual
   * TODO: Endpoint not implemented in backend
   */
  async getPeriodPoints(): Promise<PeriodPoints> {
    const { data } = await api.get<PeriodPoints>('/mlm/points');
    return data;
  }

  /**
   * Obtiene el progreso de rango
   * TODO: Endpoint not implemented in backend
   */
  async getRankProgress(): Promise<RankProgress> {
    const { data } = await api.get<RankProgress>('/mlm/rank/progress');
    return data;
  }

  /**
   * Obtiene el resumen de la red
   * TODO: Endpoint not implemented in backend
   */
  async getNetworkSummary(): Promise<NetworkSummary> {
    const { data } = await api.get<NetworkSummary>('/mlm/network/summary');
    return data;
  }

  /**
   * Obtiene la actividad reciente
   * Backend: GET /distributor/activity
   */
  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    const { data } = await api.get<RecentActivity[]>('/distributor/activity', {
      params: { limit: limit.toString() },
    });
    return data;
  }

  /**
   * Obtiene los top performers de la red
   * TODO: Endpoint not implemented in backend
   */
  async getTopPerformers(limit: number = 5): Promise<TopPerformer[]> {
    const { data } = await api.get<TopPerformer[]>('/mlm/network/top-performers', {
      params: { limit: limit.toString() },
    });
    return data;
  }

  /**
   * Obtiene las metas del distribuidor
   * Backend: GET /distributor/goals
   */
  async getGoals(): Promise<Goal[]> {
    const { data } = await api.get<Goal[]>('/distributor/goals');
    return data;
  }

  /**
   * Genera enlace de referido
   * TODO: Endpoint not implemented in backend
   */
  async generateReferralLink(): Promise<{ link: string; qrCodeUrl: string }> {
    const { data } = await api.post<{ link: string; qrCodeUrl: string }>('/distributor/referral-link');
    return data;
  }
}

export const distributorApi = new DistributorApi();
