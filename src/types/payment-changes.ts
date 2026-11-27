// payment-changes.ts - Corrección del método de pago de una venta de caja.
// Espejo de los DTOs del API (/pos/sales/:id/payment-method, /pos/payment-method-changes).

/** Qué hay que hacer con la factura después del cambio. */
export type PaymentFiscalAction = 'none' | 'reissue_global' | 'replace_nominative';

/** Cómo quedó la factura de una corrección. */
export type PaymentFiscalState =
  | 'not_needed'
  | 'pending_reissue'
  | 'pending_declare'
  | 'pending_replace'
  | 'done';

export interface PaymentChange {
  id: string;
  saleId: string;
  saleNumber: string;
  branchName: string | null;
  createdAt: string;
  previousMethod: string | null;
  previousLabel: string;
  newMethod: string;
  newLabel: string;
  reason: string;
  /** Usuario que hizo el cambio. */
  changedBy: string | null;
  changedByRole: string | null;
  /** Cómo estaba facturada la venta al corregirla. */
  invoiceKind: 'none' | 'global' | 'nominative_pue' | 'nominative_ppd' | string;
  invoiceId: string | null;
  invoiceFolio: string | null;
  fiscalState: PaymentFiscalState;
  fiscalStateLabel: string;
}

export interface PaymentChangePreview {
  saleId: string;
  saleNumber: string;
  branchName: string | null;
  /** Día local de la venta (YYYY-MM-DD). */
  saleDate: string;
  currentMethod: string | null;
  currentPayments: { method: string; label: string; amount: number }[];
  targetMethod: string;
  headerMethodAfter: string;
  allowed: boolean;
  blockCode: string | null;
  /** Por qué no se permite. */
  blockMessage: string | null;
  /** Lo que va a pasar si se guarda, en frases. */
  effects: string[];
  fiscalAction: PaymentFiscalAction;
  invoiceFolio: string | null;
  reasonMinLength: number;
  /** Correcciones anteriores de esta venta. */
  history: PaymentChange[];
}

export interface PaymentChangesQuery {
  saleId?: string;
  /** Solo los que dejaron una factura por corregir. */
  pending?: boolean;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface PaymentChangesList {
  items: PaymentChange[];
  total: number;
  page: number;
  limit: number;
  /** Cambios que dejaron una factura por corregir (sin filtros). */
  pending: number;
}

export interface PaymentBulkResult {
  results: {
    saleId: string;
    saleNumber: string | null;
    ok: boolean;
    paymentMethod: string | null;
    message: string | null;
    fiscalAction: PaymentFiscalAction;
  }[];
  changed: number;
  failed: number;
  pendingInvoices: number;
}
