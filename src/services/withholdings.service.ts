// withholdings.service.ts — Retenciones de Tesorería sobre comisiones
// (convenios de préstamo personal / conceptos ad-hoc por distribuidor).
// Backend: /mlm/withholdings* (mig 115). Ver DISENO_RETENCIONES_COMISIONES.md.

import api from '@/lib/axios';

export interface WithholdingAgreement {
  id: string;
  customerId: string;
  customerName?: string;
  customerNumber?: string;
  concept: 'loan' | 'other';
  description: string;
  currencyCode: string;
  totalAmount: number | null;
  installmentAmount: number;
  maxPctOfNet: number;
  balanceRemaining: number | null;
  withheldToDate?: number;
  status: 'active' | 'paused' | 'settled' | 'cancelled';
  startsPeriodId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWithholdingRequest {
  customerId: string;
  concept: 'loan' | 'other';
  description: string;
  totalAmount?: number;
  installmentAmount: number;
  maxPctOfNet?: number;
  startsPeriodId?: string;
  notes: string;
}

export interface UpdateWithholdingRequest {
  status?: 'active' | 'paused' | 'cancelled';
  installmentAmount?: number;
  maxPctOfNet?: number;
  description?: string;
  notes?: string;
}

export interface WithholdingApplication {
  id: string;
  periodId: string;
  periodName: string | null;
  amountWithheld: number;
  currencyCode: string;
  agreementAmount: number;
  agreementCurrency: string;
  balanceBefore: number | null;
  balanceAfter: number | null;
  appliedAt: string;
}

export interface WithholdingPreviewItem {
  commissionId: string;
  customerId: string;
  customerName: string;
  customerNumber: string | null;
  commissionType: string;
  net: number;
  currencyCode: string;
  totalWithheld: number;
  toDisperse: number;
  details: Array<{
    agreementId: string;
    concept: string;
    description: string;
    amount: number;
  }>;
  warnings: string[];
}

export interface WithholdingPreview {
  periodId: string;
  items: WithholdingPreviewItem[];
  totalByCurrency: Record<string, number>;
}

class WithholdingsService {
  async list(params?: {
    customerId?: string;
    status?: string;
  }): Promise<WithholdingAgreement[]> {
    const { data } = await api.get<WithholdingAgreement[]>('/mlm/withholdings', {
      params,
    });
    return data;
  }

  async create(dto: CreateWithholdingRequest): Promise<WithholdingAgreement> {
    const { data } = await api.post<WithholdingAgreement>(
      '/mlm/withholdings',
      dto,
    );
    return data;
  }

  async update(
    id: string,
    dto: UpdateWithholdingRequest,
  ): Promise<WithholdingAgreement> {
    const { data } = await api.patch<WithholdingAgreement>(
      `/mlm/withholdings/${id}`,
      dto,
    );
    return data;
  }

  async getApplications(id: string): Promise<WithholdingApplication[]> {
    const { data } = await api.get<WithholdingApplication[]>(
      `/mlm/withholdings/${id}/applications`,
    );
    return data;
  }

  async preview(periodId: string): Promise<WithholdingPreview> {
    const { data } = await api.get<WithholdingPreview>(
      '/mlm/withholdings/preview',
      { params: { periodId } },
    );
    return data;
  }
}

export const withholdingsService = new WithholdingsService();
