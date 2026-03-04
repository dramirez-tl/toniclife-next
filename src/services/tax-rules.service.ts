// tax-rules.service.ts - API client for Tax Rules + Branch Tax Rules

import api from '@/lib/axios';
import type { TaxRule, CreateTaxRuleDto, UpdateTaxRuleDto } from '@/types/config';
import type { Branch } from '@/types/branch';

export interface TaxRuleQueryParams {
  countryCode?: string;
  taxType?: string;
  isActive?: boolean;
}

export interface BranchTaxRule {
  id: string;
  taxRuleId: string;
  code: string;
  name: string;
  taxType: string;
  rate: string;
  isIncludedInPrice: boolean;
  countryCode?: string;
  sortOrder: number;
}

class TaxRulesService {
  // Tax Rules CRUD (via config)
  async getTaxRules(params?: TaxRuleQueryParams): Promise<TaxRule[]> {
    const response = await api.get<TaxRule[]>('/config/tax-rules', { params });
    return response.data;
  }

  async getActiveTaxRules(): Promise<TaxRule[]> {
    const response = await api.get<TaxRule[]>('/config/tax-rules/active');
    return response.data;
  }

  async getTaxRuleById(id: string): Promise<TaxRule> {
    const response = await api.get<TaxRule>(`/config/tax-rules/${id}`);
    return response.data;
  }

  async createTaxRule(dto: CreateTaxRuleDto): Promise<TaxRule> {
    const response = await api.post<TaxRule>('/config/tax-rules', dto);
    return response.data;
  }

  async updateTaxRule(id: string, dto: UpdateTaxRuleDto): Promise<TaxRule> {
    const response = await api.patch<TaxRule>(`/config/tax-rules/${id}`, dto);
    return response.data;
  }

  async deleteTaxRule(id: string): Promise<void> {
    await api.delete(`/config/tax-rules/${id}`);
  }

  // Tax Rule → Branches relationship
  async getTaxRuleBranches(taxRuleId: string): Promise<Branch[]> {
    const response = await api.get<Branch[]>(`/config/tax-rules/${taxRuleId}/branches`);
    return response.data;
  }

  // Branch → Tax Rules relationship
  async getBranchTaxRules(branchId: string): Promise<BranchTaxRule[]> {
    const response = await api.get<BranchTaxRule[]>(`/branches/${branchId}/tax-rules`);
    return response.data;
  }

  async assignTaxRuleToBranch(branchId: string, taxRuleId: string, sortOrder?: number): Promise<BranchTaxRule[]> {
    const response = await api.post<BranchTaxRule[]>(`/branches/${branchId}/tax-rules`, {
      taxRuleId,
      sortOrder,
    });
    return response.data;
  }

  async removeTaxRuleFromBranch(branchId: string, taxRuleId: string): Promise<void> {
    await api.delete(`/branches/${branchId}/tax-rules/${taxRuleId}`);
  }
}

export const taxRulesService = new TaxRulesService();
export default taxRulesService;
