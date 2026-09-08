import api from '@/lib/axios';
import { saveBlob } from '@/lib/download';
import {
  Customer,
  CustomerListResponse,
  CustomerQueryParams,
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerAddress,
  CreateAddressDto,
  UpdateAddressDto,
  CustomerBankAccount,
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from '@/types/customer';
import type { NetworkExportJob } from '@/services/networkApi';

export type { NetworkExportJob };

/** Fila de GET /customers/payment-readiness/list (estatus de datos para pago). */
export interface PaymentReadinessListRow {
  id: string;
  customerNumber: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  overallStatus: string;
  documentsValidated: boolean;
  missingCount: number;
  completedCount: number;
  documents: {
    ine: { uploaded: boolean; status: string | null };
    taxId: { uploaded: boolean; status: string | null };
    bankStatement: { uploaded: boolean; status: string | null };
  };
  updatedAt: string;
}

export interface PaymentReadinessListResponse {
  data: PaymentReadinessListRow[];
  total: number;
  page?: number;
  limit?: number;
  stats: {
    totalWithData: number;
    pendingValidation: number;
    validated: number;
    incomplete: number;
  };
}

class CustomersService {
  private basePath = '/customers';

  // Customer CRUD
  async getAll(params?: CustomerQueryParams): Promise<CustomerListResponse> {
    const response = await api.get<CustomerListResponse>(this.basePath, { params });
    return response.data;
  }

  async getById(id: string): Promise<Customer> {
    const response = await api.get<Customer>(`${this.basePath}/${id}`);
    return response.data;
  }

  async getCustomerPeriodStats(customerId: string): Promise<{
    personalPoints: number;
    qualificationThreshold: number;
    status: 'qualified' | 'in_progress' | 'inactive';
    periodName: string | null;
  }> {
    const response = await api.get(`${this.basePath}/${customerId}/period-stats`);
    return response.data;
  }

  async listPeriodsForSelector(): Promise<
    {
      id: string;
      code: string | null;
      name: string | null;
      startDate: string | null;
      endDate: string | null;
      status: string | null;
      isClosed: boolean;
    }[]
  > {
    const response = await api.get(`${this.basePath}/periods/list`);
    return response.data;
  }

  async getCustomerStatsForPeriod(
    customerId: string,
    periodId: string,
  ): Promise<{
    period: {
      id: string;
      code: string | null;
      name: string | null;
      startDate: string | null;
      endDate: string | null;
      status: string | null;
      isClosed: boolean;
    };
    rank: { id: string | null; code: string | null; name: string | null; rankNumber: number | null };
    points: {
      personal: number;
      group: number;
      rollOver: number;
      businessMxn: number;
      businessUsd: number;
      qualificationThreshold: number;
      isQualified: boolean;
    };
    network: {
      size: number;
      active: number;
      qualifiedFirstLevel: number;
      newDirectRecruits: number;
    };
    sales: {
      ordersCount: number;
      ordersTotalMxn: number;
      posSalesCount: number;
      posSalesTotalMxn: number;
      totalMxn: number;
      currencyCode: string;
    };
    commission: {
      exists: boolean;
      subtotal: number;
      total: number;
      currencyCode: string | null;
      status: string | null;
      calculatedAt: string | null;
      localCurrency: string;
      subtotalLocal: number | null;
      subtotalMxn: number | null;
      exchangeRate: number | null;
    };
    lastCalculation: {
      statsAt: string | null;
      commissionAt: string | null;
    };
  }> {
    const response = await api.get(
      `${this.basePath}/${customerId}/period-stats/${periodId}`,
    );
    return response.data;
  }

  async getByReferralCode(code: string): Promise<Customer> {
    const response = await api.get<Customer>(`${this.basePath}/referral/${code}`);
    return response.data;
  }

  async create(data: CreateCustomerDto): Promise<Customer> {
    const response = await api.post<Customer>(this.basePath, data);
    return response.data;
  }

  async update(id: string, data: UpdateCustomerDto): Promise<Customer> {
    const response = await api.patch<Customer>(`${this.basePath}/${id}`, data);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }

  async acceptTerms(id: string): Promise<Customer> {
    const response = await api.post<Customer>(`${this.basePath}/${id}/accept-terms`);
    return response.data;
  }

  /** Envía (o reenvía) el correo de invitación para definir contraseña. */
  async resendInvite(id: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      `${this.basePath}/${id}/resend-invite`,
    );
    return response.data;
  }

  // Addresses
  async getAddresses(customerId: string): Promise<CustomerAddress[]> {
    const response = await api.get<CustomerAddress[]>(
      `${this.basePath}/${customerId}/addresses`
    );
    return response.data;
  }

  async getAddress(customerId: string, addressId: string): Promise<CustomerAddress> {
    const response = await api.get<CustomerAddress>(
      `${this.basePath}/${customerId}/addresses/${addressId}`
    );
    return response.data;
  }

  async createAddress(customerId: string, data: CreateAddressDto): Promise<CustomerAddress> {
    const response = await api.post<CustomerAddress>(
      `${this.basePath}/${customerId}/addresses`,
      data
    );
    return response.data;
  }

  async updateAddress(
    customerId: string,
    addressId: string,
    data: UpdateAddressDto
  ): Promise<CustomerAddress> {
    const response = await api.patch<CustomerAddress>(
      `${this.basePath}/${customerId}/addresses/${addressId}`,
      data
    );
    return response.data;
  }

  async setDefaultAddress(customerId: string, addressId: string): Promise<CustomerAddress> {
    const response = await api.post<CustomerAddress>(
      `${this.basePath}/${customerId}/addresses/${addressId}/set-default`
    );
    return response.data;
  }

  async deleteAddress(customerId: string, addressId: string): Promise<void> {
    await api.delete(`${this.basePath}/${customerId}/addresses/${addressId}`);
  }

  // Bank Accounts
  async getBankAccounts(customerId: string): Promise<CustomerBankAccount[]> {
    const response = await api.get<CustomerBankAccount[]>(
      `${this.basePath}/${customerId}/bank-accounts`
    );
    return response.data;
  }

  async getBankAccount(customerId: string, accountId: string): Promise<CustomerBankAccount> {
    const response = await api.get<CustomerBankAccount>(
      `${this.basePath}/${customerId}/bank-accounts/${accountId}`
    );
    return response.data;
  }

  async createBankAccount(
    customerId: string,
    data: CreateBankAccountDto
  ): Promise<CustomerBankAccount> {
    const response = await api.post<CustomerBankAccount>(
      `${this.basePath}/${customerId}/bank-accounts`,
      data
    );
    return response.data;
  }

  async updateBankAccount(
    customerId: string,
    accountId: string,
    data: UpdateBankAccountDto
  ): Promise<CustomerBankAccount> {
    const response = await api.patch<CustomerBankAccount>(
      `${this.basePath}/${customerId}/bank-accounts/${accountId}`,
      data
    );
    return response.data;
  }

  async setDefaultBankAccount(
    customerId: string,
    accountId: string
  ): Promise<CustomerBankAccount> {
    const response = await api.post<CustomerBankAccount>(
      `${this.basePath}/${customerId}/bank-accounts/${accountId}/set-default`
    );
    return response.data;
  }

  async deleteBankAccount(customerId: string, accountId: string): Promise<void> {
    await api.delete(`${this.basePath}/${customerId}/bank-accounts/${accountId}`);
  }

  // Hard Delete
  async hardDeleteCustomer(id: string): Promise<void> {
    await api.delete(`${this.basePath}/${id}/hard`);
  }

  // QR Code
  async getQrCode(id: string): Promise<Blob> {
    const response = await api.get(`${this.basePath}/${id}/qr-code`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async downloadQrCode(id: string): Promise<Blob> {
    const response = await api.get(`${this.basePath}/${id}/qr-code/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // Referral Info
  async getReferralInfo(id: string): Promise<unknown> {
    const response = await api.get(`${this.basePath}/${id}/referral-info`);
    return response.data;
  }

  // ===== Payment Readiness (Admin) =====

  async getPaymentReadinessList(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaymentReadinessListResponse> {
    const response = await api.get<PaymentReadinessListResponse>(
      `${this.basePath}/payment-readiness/list`,
      { params },
    );
    return response.data;
  }

  async getPaymentReadiness(customerId: string): Promise<import('@/types/payment-data').PaymentReadinessResponse> {
    const response = await api.get(`${this.basePath}/${customerId}/payment-readiness`);
    return response.data;
  }

  async validateDocuments(
    customerId: string,
    validations: import('@/types/payment-data').DocumentValidation[],
  ): Promise<{ success: boolean; documentsValidated: boolean }> {
    const response = await api.post(`${this.basePath}/${customerId}/validate-documents`, { validations });
    return response.data;
  }

  // ===== Exportación de red (descendencia) por periodo (Admin) =====

  /**
   * Inicia en SEGUNDO PLANO el CSV de descendencia de red del distribuidor con
   * los puntos del periodo indicado (sin periodId = periodo actual). Mismo
   * archivo que descarga el panel del distribuidor. Devuelve el jobId para
   * seguir el avance. Backend: POST /customers/:id/network/export
   */
  async startNetworkExport(
    customerId: string,
    periodId?: string | null,
  ): Promise<{ jobId: string }> {
    const response = await api.post<{ jobId: string }>(
      `${this.basePath}/${customerId}/network/export`,
      periodId ? { periodId } : {},
    );
    return response.data;
  }

  /** Estado/progreso del job. Backend: GET /customers/:id/network/export-job/:jobId */
  async getNetworkExportJob(customerId: string, jobId: string): Promise<NetworkExportJob> {
    const response = await api.get<NetworkExportJob>(
      `${this.basePath}/${customerId}/network/export-job/${jobId}`,
    );
    return response.data;
  }

  /** Descarga el CSV ya generado del job y dispara el save-as en el navegador. */
  async downloadNetworkExportFile(
    customerId: string,
    jobId: string,
    filename: string,
  ): Promise<void> {
    const response = await api.get(
      `${this.basePath}/${customerId}/network/export-job/${jobId}/file`,
      { responseType: 'blob' },
    );
    saveBlob(response.data as BlobPart, filename || 'descendencia-red.csv');
  }
}

export const customersService = new CustomersService();
export default customersService;
