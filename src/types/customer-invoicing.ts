// customer-invoicing.ts - Facturar desde la cuenta del distribuidor (GET/PUT/POST
// /distributor/invoicing, 17-nov-2026). Espejo del contrato del API
// (modules/billing/portal/customer-invoicing.service.ts).

/** Qué se puede hacer con la factura de un pedido desde la cuenta. */
export type SelfInvoiceStatus =
  | 'invoiceable'
  | 'invoiced'
  | 'in_progress'
  | 'migrated'
  | 'cancelled'
  | 'unpaid'
  | 'in_global'
  | 'branch_not_invoicing'
  | 'out_of_month';

export interface MyInvoiceRef {
  id: string;
  /** Serie y folio ("F311-205"); null si el PAC aún no lo devuelve. */
  folio: string | null;
  uuid: string | null;
  stampedAt: string | null;
}

export interface MyInvoiceOrder {
  orderId: string;
  orderNumber: string;
  /** Día del pago, ISO. */
  date: string;
  total: number;
  items: number;
  branchName: string;
  status: SelfInvoiceStatus;
  canInvoice: boolean;
  /** Etiqueta y motivo en español, tal como los arma el servidor (respaldo de la traducción). */
  label: string;
  message: string | null;
  invoice: MyInvoiceRef | null;
}

export interface MyFiscalData {
  rfc: string;
  legalName: string;
  taxRegime: string;
  cfdiUse: string;
  postalCode: string;
  email: string;
}

export interface MyInvoicingOverview {
  /** false = la función está apagada: la cuenta consulta y descarga, pero no factura. */
  enabled: boolean;
  /** Mes natural en curso ("2026-11") y su nombre ("noviembre de 2026"). */
  month: string;
  monthLabel: string;
  fiscal: MyFiscalData;
  fiscalReady: boolean;
  fiscalMissing: string[];
  orders: MyInvoiceOrder[];
}

/** Renglón de un catálogo del SAT (régimen fiscal o uso del CFDI). */
export interface SatCatalogOption {
  code: string;
  description: string;
  appliesToFisica?: boolean;
  appliesToMoral?: boolean;
}

export interface MyInvoicingCatalogs {
  regimes: SatCatalogOption[];
  /** Usos válidos para el régimen pedido; vacío si no se pidió ninguno. */
  cfdiUses: SatCatalogOption[];
}

export interface SaveMyFiscalDataPayload {
  rfc: string;
  legalName: string;
  fiscalRegime: string;
  postalCode: string;
  cfdiUse: string;
  email?: string;
}
