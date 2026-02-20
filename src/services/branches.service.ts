// branches.service.ts - Frontend API client for branches module
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 4.2.4

import api from '@/lib/axios';
import type { Branch, BranchQueryParams, BranchListResponse, CreateBranchDto, UpdateBranchDto } from '@/types/branch';

class BranchesService {
  /**
   * Get active branches (for selects/dropdowns)
   */
  async getActiveBranches(): Promise<Branch[]> {
    const response = await api.get<Branch[]>('/branches/active');
    return response.data;
  }

  /**
   * Get paginated list of branches (admin)
   */
  async getBranches(params?: BranchQueryParams): Promise<BranchListResponse> {
    const response = await api.get<BranchListResponse>('/branches', { params });
    return response.data;
  }

  /**
   * Get branch by ID
   */
  async getBranchById(id: string): Promise<Branch> {
    const response = await api.get<Branch>(`/branches/${id}`);
    return response.data;
  }

  /**
   * Get branch by code
   */
  async getBranchByCode(code: string): Promise<Branch> {
    const response = await api.get<Branch>(`/branches/code/${code}`);
    return response.data;
  }

  /**
   * Create a new branch
   */
  async createBranch(dto: CreateBranchDto): Promise<Branch> {
    const response = await api.post<Branch>('/branches', dto);
    return response.data;
  }

  /**
   * Update an existing branch
   */
  async updateBranch(id: string, dto: UpdateBranchDto): Promise<Branch> {
    const response = await api.patch<Branch>(`/branches/${id}`, dto);
    return response.data;
  }

  /**
   * Delete a branch
   */
  async deleteBranch(id: string): Promise<void> {
    await api.delete(`/branches/${id}`);
  }
}

export const branchesService = new BranchesService();
export default branchesService;
