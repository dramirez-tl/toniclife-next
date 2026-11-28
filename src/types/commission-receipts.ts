// commission-receipts.ts - Pagos de comisiones depositados fuera de los lotes y
// su recibo de nómina. Espejo del API (/billing/commission-receipts, mig 220).

export type CommissionVoucherStatus = 'not_stamped' | 'in_progress' | 'error' | 'stamped' | 'cancelled';

export interface CommissionReceiptPeriod {
  id: string;
  periodNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
}

export interface CommissionReceiptPayment {
  id: string;
  /** Día del depósito (YYYY-MM-DD). */
  paidAt: string;
  reference: string | null;
  /** Importes congelados al registrar el pago. */
  subtotal: number;
  isr: number;
  total: number;
}

export interface CommissionReceiptVoucher {
  status: CommissionVoucherStatus;
  invoiceId: string | null;
  uuid: string | null;
  stampedAt: string | null;
  /** Último rechazo del SAT o del PAC. */
  error: string | null;
  /** Datos del distribuidor que faltan para timbrar (vacío = listo). */
  issues: string[];
}

/** Una comisión del periodo en régimen ASIMILADOS, con su pago y su recibo. */
export interface CommissionReceiptRow {
  commissionId: string;
  customerId: string;
  customerNumber: string | null;
  customerName: string;
  /** Lo calculado por el motor. */
  subtotal: number;
  isr: number;
  total: number;
  /** null = sin pago registrado. */
  payment: CommissionReceiptPayment | null;
  voucher: CommissionReceiptVoucher | null;
}

export interface CommissionReceiptsList {
  period: CommissionReceiptPeriod;
  summary: {
    commissions: number;
    registered: number;
    stamped: number;
    pendingStamp: number;
    missingData: number;
    errors: number;
    registeredSubtotal: number;
    registeredIsr: number;
    registeredTotal: number;
  };
  rows: CommissionReceiptRow[];
}

/** Resultado de un intento de timbrado. */
export interface CommissionReceiptStampResult {
  invoiceId: string;
  /** invoices.provider_status tras el intento (stamped | sent | error | stamping…). */
  status: string;
  uuid: string | null;
  error: string | null;
}
