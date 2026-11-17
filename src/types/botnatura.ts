// botnatura.ts - Facturación a Botnatura (mig 207, 17-nov-2026). Tonic Life le vende a
// Botnatura productos de un catálogo PROPIO de ese cliente (no el de Tonic Life) y se los
// factura desde Admin > Facturación > Botnatura. API: /billing/botnatura/*.

/** Con qué precio se factura: "Precio", "Precio venta" (la mitad) o uno capturado. */
export type BotnaturaPriceMode = 'list' | 'sale' | 'custom';

/** Línea de producto (mig 209): la Regular y la Línea 2 (premium). La clave es única por línea. */
export type BotnaturaLine = 'regular' | 'line2';

export interface BotnaturaProduct {
  id: string;
  code: string;
  name: string;
  /** Ausente con un servidor anterior a las líneas: se toma como Regular. */
  line?: BotnaturaLine;
  lineLabel?: string;
  unitName: string;
  satUnitCode: string;
  satProductCode: string;
  /** "Precio" del archivo de Botnatura, CON IVA. null = sin precio. */
  listPrice: number | null;
  /** "Precio venta" del archivo de Botnatura, CON IVA. null = sin precio. */
  salePrice: number | null;
  taxLabel: string;
  isActive: boolean;
  updatedAt: string;
}

export interface BotnaturaProductsQuery {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  /** Ausente = las dos líneas. */
  line?: BotnaturaLine;
  withoutPrice?: 'true' | 'false';
  page?: number;
  limit?: number;
}

export interface BotnaturaProductsResponse {
  data: BotnaturaProduct[];
  total: number;
  page: number;
  limit: number;
  stats: {
    total: number;
    withPrice: number;
    active: number;
    byLine?: { regular: number; line2: number };
  };
}

export interface SaveBotnaturaProduct {
  code?: string;
  name?: string;
  listPrice?: number | null;
  salePrice?: number | null;
  isActive?: boolean;
  line?: BotnaturaLine;
}

export interface BotnaturaReceiver {
  rfc: string | null;
  name: string | null;
  taxRegimeCode: string | null;
  cfdiUseCode: string | null;
  zipCode: string | null;
  email: string | null;
}

export interface BotnaturaSettings {
  receiver: BotnaturaReceiver;
  defaultBranchId: string | null;
  /** true = ya se puede facturar. */
  ready: boolean;
  /** Qué dato fiscal falta o está mal ("RFC", "Razón social"…). */
  missing: string[];
}

export interface SaveBotnaturaSettings {
  rfc: string;
  name: string;
  taxRegimeCode: string;
  cfdiUseCode: string;
  zipCode: string;
  email?: string | null;
  defaultBranchId?: string | null;
}

export interface BotnaturaLineRequest {
  productId: string;
  quantity: number;
  /** Ausente = el precio elegido para toda la factura. */
  priceMode?: BotnaturaPriceMode;
  /** Precio unitario CON IVA; solo con priceMode = 'custom'. */
  unitPrice?: number;
}

export interface BotnaturaInvoiceRequest {
  branchId: string;
  priceMode: BotnaturaPriceMode;
  paymentMethod: 'PUE' | 'PPD';
  paymentForm?: string;
  lines: BotnaturaLineRequest[];
  sendEmail?: boolean;
  notes?: string;
}

export interface BotnaturaPreviewLine {
  lineNumber: number;
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxLabel: string;
}

export interface BotnaturaPreview {
  priceMode: string;
  receiverRfc: string;
  receiverName: string;
  paymentMethod: string;
  paymentForm: string;
  lines: BotnaturaPreviewLine[];
  subtotal: number;
  taxes: number;
  total: number;
  warnings: string[];
}

export interface BotnaturaCreateResponse {
  invoiceId: string | null;
  folioDisplay: string | null;
  satUuid: string | null;
  providerStatus: string | null;
  total: number | null;
  /** null = timbrada. Con texto = no se timbró y por qué. */
  error: string | null;
}

export interface BotnaturaInvoiceRow {
  id: string;
  folioDisplay: string | null;
  status: string;
  error: string | null;
  satUuid: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentMethod: string | null;
  paymentForm: string | null;
  createdAt: string;
  stampedAt: string | null;
  cancelledAt: string | null;
  branchCode: string | null;
  branchName: string | null;
  priceMode: string;
  concepts: number;
}

export interface BotnaturaInvoicesResponse {
  data: BotnaturaInvoiceRow[];
  total: number;
  page: number;
  limit: number;
}
