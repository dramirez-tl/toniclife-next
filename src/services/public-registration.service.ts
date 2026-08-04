import api from '@/lib/axios';

export interface SponsorInfo {
  id: string;
  firstName: string;
  lastName: string;
  referralCode: string;
  /** Piloto (mig 110): el registro con ESTE patrocinador está liberado. */
  registrationEnabled?: boolean;
}

export interface RegisterDistributorDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  secondaryPhone?: string;
  birthDate?: string;
  rfc?: string;
  curp?: string;
  sponsorCode: string;
  kitType: 'basic' | 'premium' | 'preferred';
  acceptTerms: boolean;
}

export interface RegisterDistributorResponse {
  message: string;
  customerId: string;
  referralCode: string;
  sponsorName: string;
}

export const publicRegistrationService = {
  /**
   * Validate sponsor code and get sponsor info
   */
  async validateSponsorCode(code: string): Promise<SponsorInfo | null> {
    try {
      const response = await api.get<SponsorInfo>(
        `/public/register/validate-sponsor/${encodeURIComponent(code)}`
      );
      return response.data;
    } catch {
      return null;
    }
  },

  /**
   * Check if email is available
   */
  async checkEmailAvailability(email: string): Promise<boolean> {
    try {
      const response = await api.get<{ available: boolean }>(
        `/public/register/check-email/${encodeURIComponent(email)}`
      );
      return response.data.available;
    } catch {
      return false;
    }
  },

  /**
   * Register a new distributor
   */
  async registerDistributor(
    data: RegisterDistributorDto
  ): Promise<RegisterDistributorResponse> {
    const response = await api.post<RegisterDistributorResponse>(
      '/public/register/distributor',
      data
    );
    return response.data;
  },
};

export default publicRegistrationService;
