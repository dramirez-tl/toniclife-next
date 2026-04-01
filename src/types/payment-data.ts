// ================================
// PAYMENT DATA TYPES
// ================================

export interface DocumentStatus {
  url: string | null;
  status: 'pending' | 'validated' | 'rejected' | null;
  rejectionReason: string | null;
  uploadedAt: string | null;
}

export interface PaymentDataResponse {
  personal: {
    fullName: string;
    email: string | null;
    phone: string | null;
  };
  fiscal: {
    curp: string | null;
    rfc: string | null;
    ineNumber: string | null;
    taxRegime: string | null;
  };
  banking: {
    bankAccountId: string | null;
    bankName: string | null;
    clabe: string | null;
    accountHolder: string | null;
    isVerified: boolean;
  };
  documents: {
    ineDocument: DocumentStatus;
    taxIdDocument: DocumentStatus;
    bankStatement: DocumentStatus;
  };
  overallStatus: 'complete' | 'incomplete' | 'pending_validation';
  documentsValidated: boolean;
  missingFields: string[];
}

// ================================
// COMMISSION PAYMENTS
// ================================

export interface CommissionPayment {
  id: string;
  periodId: string;
  periodName: string;
  periodCode: string;
  amount: number;
  currencyCode: string;
  paymentDate: string | null;
  paymentMethod: string | null;
  reference: string | null;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  createdAt: string;
}

export interface CommissionPaymentsResponse {
  data: CommissionPayment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CommissionPaymentFilters {
  status?: string;
  page?: number;
  limit?: number;
}

// ================================
// PAYMENT READINESS (Admin)
// ================================

export interface PaymentReadinessItem {
  field: string;
  label: string;
  status: 'complete' | 'missing' | 'uploaded' | 'validated' | 'rejected';
  value?: string | null;
  url?: string | null;
  rejectionReason?: string | null;
}

export interface PaymentReadinessResponse {
  customerId: string;
  customerName: string;
  items: PaymentReadinessItem[];
  overallReady: boolean;
  documentsValidated: boolean;
}

export interface DocumentValidation {
  field: string;
  approved: boolean;
  rejectionReason?: string;
}
