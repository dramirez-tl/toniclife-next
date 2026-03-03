// POS Types - Frontend types matching backend DTOs
// Ref: toniclife-api/src/modules/pos/dto/

// ================================
// ENUMS
// ================================

export enum CashRegisterStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  SUSPENDED = 'suspended',
}

export enum SessionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum PosSaleStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIAL_REFUND = 'partial_refund',
}

export enum PosPaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  TRANSFER = 'transfer',
  CREDIT = 'credit',
  MIXED = 'mixed',
  CASHBACK = 'cashback',
  LIGA_BANCOMER = 'liga_bancomer',
  MERCADO_PAGO = 'mercado_pago',
  USD_CASH = 'usd_cash',
  UNDEFINED = 'undefined',
}

export enum CashMovementType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
}

// ================================
// CASH REGISTER TYPES
// ================================

export interface CashRegister {
  id: string;
  branchId: string;
  branchName: string;
  name: string;
  code: string;
  status: CashRegisterStatus;
  currentSessionId?: string;
  allowNegativeBalance: boolean;
  requireOpeningAmount: boolean;
  autoPrintTicket: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateCashRegisterInput {
  branchId: string;
  name: string;
  code: string;
  allowNegativeBalance?: boolean;
  requireOpeningAmount?: boolean;
  autoPrintTicket?: boolean;
}

export interface UpdateCashRegisterInput extends Partial<CreateCashRegisterInput> {
  isActive?: boolean;
}

export interface CashRegisterQueryParams {
  branchId?: string;
  status?: CashRegisterStatus;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CashRegisterListResponse {
  data: CashRegister[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ================================
// SESSION TYPES
// ================================

export interface SessionSummary {
  totalSales: number;
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  totalRefunds: number;
  totalDeposits: number;
  totalWithdrawals: number;
  salesCount: number;
  refundsCount: number;
}

export interface Session {
  id: string;
  cashRegisterId: string;
  cashRegisterName: string;
  branchId: string;
  branchName: string;
  openedBy: string;
  openedByName: string;
  closedBy?: string;
  closedByName?: string;
  openingAmount: number;
  openingNotes?: string;
  expectedClosingAmount?: number;
  actualClosingAmount?: number;
  difference?: number;
  closingNotes?: string;
  summary: SessionSummary;
  openedAt: string;
  closedAt?: string;
  status: SessionStatus;
  currencyId?: string;
  currencyCode?: string;
}

export interface ActiveSession {
  session: Session;
  cashRegister: {
    id: string;
    name: string;
    code: string;
    branchName: string;
  };
}

export interface OpenSessionInput {
  cashRegisterId: string;
  openingAmount: number;
  openingNotes?: string;
  currencyId?: string;
}

export interface CloseSessionInput {
  actualClosingAmount: number;
  closingNotes?: string;
}

export interface SessionQueryParams {
  cashRegisterId?: string;
  branchId?: string;
  openedBy?: string;
  status?: SessionStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface SessionListResponse {
  data: Session[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ================================
// SALE TYPES
// ================================

export interface SaleItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  lotId?: string;
  lotNumber?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  discountPercent?: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  notes?: string;
}

export interface SalePayment {
  id: string;
  paymentMethod: PosPaymentMethod;
  amount: number;
  amountReceived?: number;
  changeGiven?: number;
  cardType?: string;
  cardLast4?: string;
  authorizationCode?: string;
  referenceNumber?: string;
  status: string;
  processedAt: string;
}

export interface Sale {
  id: string;
  saleNumber: string;
  sessionId: string;
  cashRegisterId: string;
  cashRegisterName: string;
  branchId: string;
  branchName: string;
  customerId?: string;
  customerName?: string;
  customerNumber?: string;
  customerRfc?: string;
  sellerId: string;
  sellerName: string;
  status: PosSaleStatus;
  subtotal: number;
  discountAmount: number;
  discountPercent?: number;
  discountReason?: string;
  taxAmount: number;
  total: number;
  paymentMethod: PosPaymentMethod;
  currencyId?: string;
  currencyCode?: string;
  requiresInvoice: boolean;
  invoiceId?: string;
  invoiceUuid?: string;
  notes?: string;
  cancelledAt?: string;
  cancelledByName?: string;
  cancellationReason?: string;
  itemsCount?: number;
  items: SaleItem[];
  payments: SalePayment[];
  createdAt: string;
}

export interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  lotId?: string;
  discountPercent?: number;
  discountAmount?: number;
  notes?: string;
}

export interface CreateSaleInput {
  sessionId: string;
  customerId?: string;
  customerName?: string;
  customerRfc?: string;
  items: CreateSaleItemInput[];
  discountPercent?: number;
  discountAmount?: number;
  discountReason?: string;
  requiresInvoice?: boolean;
  notes?: string;
  currencyId?: string;
}

export interface CancelSaleInput {
  cancellationReason: string;
}

export interface SaleQueryParams {
  sessionId?: string;
  cashRegisterId?: string;
  branchId?: string;
  customerId?: string;
  sellerId?: string;
  status?: PosSaleStatus;
  paymentMethod?: PosPaymentMethod;
  search?: string;
  fromDate?: string;
  toDate?: string;
  withInvoice?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SaleListResponse {
  data: Sale[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DailySalesSummary {
  date: string;
  totalSales: number;
  totalAmount: number;
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  totalRefunds: number;
  refundsCount: number;
  averageTicket: number;
  itemsSold: number;
}

// ================================
// PAYMENT TYPES
// ================================

export interface CreatePaymentInput {
  paymentMethod: PosPaymentMethod;
  amount: number;
  amountReceived?: number;
  cardType?: string;
  cardLast4?: string;
  authorizationCode?: string;
  terminalId?: string;
  referenceNumber?: string;
  bankName?: string;
  notes?: string;
  currencyId?: string;
}

export interface ProcessPaymentInput {
  saleId: string;
  payments: CreatePaymentInput[];
}

export interface PaymentResult {
  success: boolean;
  saleId: string;
  saleNumber: string;
  totalPaid: number;
  changeGiven: number;
  payments: Array<{
    id: string;
    method: string;
    amount: number;
    status: string;
  }>;
  message?: string;
}

// ================================
// CASH MOVEMENT TYPES
// ================================

export interface CashMovement {
  id: string;
  sessionId: string;
  movementType: CashMovementType;
  saleId?: string;
  saleNumber?: string;
  amount: number;
  direction: 'in' | 'out';
  balanceAfter?: number;
  description?: string;
  reference?: string;
  createdBy: string;
  createdByName: string;
  requiresApproval: boolean;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface CreateCashMovementInput {
  sessionId: string;
  movementType: CashMovementType;
  amount: number;
  description: string;
  reference?: string;
}

export interface CashMovementQueryParams {
  sessionId?: string;
  movementType?: CashMovementType;
  direction?: 'in' | 'out';
  pendingApproval?: boolean;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface CashMovementListResponse {
  data: CashMovement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CashBalance {
  sessionId: string;
  openingAmount: number;
  currentBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalSalesCash: number;
  totalRefundsCash: number;
  pendingWithdrawals: number;
}

// ================================
// POS CART (LOCAL STATE)
// ================================

export interface PosCartItem {
  productId: string;
  productSku: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  isIncludedInPrice: boolean;
  discountPercent?: number;
  discountAmount?: number;
  subtotal: number;
  total: number;
  stock?: number;
  points: number;
  businessVolume: number;
  lotId?: string;
  notes?: string;
}

export interface PosCart {
  items: PosCartItem[];
  customerId?: string;
  customerName?: string;
  customerRfc?: string;
  priceTypeId?: string;
  isPublicPrice?: boolean;
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  discountReason?: string;
  taxAmount: number;
  total: number;
  totalPoints: number;
  totalBusinessVolume: number;
  requiresInvoice: boolean;
  notes?: string;
}

// ================================
// QUICK PRODUCT SEARCH
// ================================

export interface QuickProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  imageUrl?: string;
  basePrice: number;
  categoryName?: string;
  stock?: number;
  isActive: boolean;
  taxRate?: number;
  isIncludedInPrice?: boolean;
  points?: number;
  businessVolume?: number;
}
