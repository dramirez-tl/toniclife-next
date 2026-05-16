// hooks/usePos.ts - React Query hooks for POS module
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posService } from '@/services/pos.service';
import { customersService } from '@/services/customers.service';
import type {
  // Cash Register
  CreateCashRegisterInput,
  UpdateCashRegisterInput,
  CashRegisterQueryParams,
  // Session
  SessionQueryParams,
  // Sale
  CreateSaleInput,
  CancelSaleInput,
  SaleQueryParams,
  // Payment
  ProcessPaymentInput,
  // Movement
  CreateCashMovementInput,
  CashMovementQueryParams,
} from '@/types/pos';

// ================================
// QUERY KEYS
// ================================

export const posKeys = {
  all: ['pos'] as const,
  // Cash Registers
  registers: () => [...posKeys.all, 'registers'] as const,
  registerList: (params?: CashRegisterQueryParams) => [...posKeys.registers(), 'list', params] as const,
  registerAvailable: (branchId?: string) => [...posKeys.registers(), 'available', branchId] as const,
  registerDetail: (id: string) => [...posKeys.registers(), 'detail', id] as const,
  // Sessions
  sessions: () => [...posKeys.all, 'sessions'] as const,
  sessionList: (params?: SessionQueryParams) => [...posKeys.sessions(), 'list', params] as const,
  sessionActive: (branchId?: string) => [...posKeys.sessions(), 'active', branchId] as const,
  sessionDetail: (id: string) => [...posKeys.sessions(), 'detail', id] as const,
  // Sales
  sales: () => [...posKeys.all, 'sales'] as const,
  saleList: (params?: SaleQueryParams) => [...posKeys.sales(), 'list', params] as const,
  saleDetail: (id: string) => [...posKeys.sales(), 'detail', id] as const,
  saleSummary: (branchId: string, date?: string) => [...posKeys.sales(), 'summary', branchId, date] as const,
  // Movements
  movements: () => [...posKeys.all, 'movements'] as const,
  movementList: (params?: CashMovementQueryParams) => [...posKeys.movements(), 'list', params] as const,
  movementDetail: (id: string) => [...posKeys.movements(), 'detail', id] as const,
  movementBalance: (sessionId: string) => [...posKeys.movements(), 'balance', sessionId] as const,
  // Products
  productSearch: (query: string, branchId?: string, priceTypeId?: string, countryId?: string) => [...posKeys.all, 'products', 'search', query, branchId, priceTypeId, countryId] as const,
  productCatalog: (branchId?: string, priceTypeId?: string, countryId?: string) => [...posKeys.all, 'products', 'catalog', branchId, priceTypeId, countryId] as const,
  // Customer search
  customerSearch: (query: string, customerNumber?: string) => [...posKeys.all, 'customers', 'search', query, customerNumber] as const,
};

// ================================
// CASH REGISTER HOOKS
// ================================

/**
 * Get list of cash registers
 */
export const useCashRegisters = (params?: CashRegisterQueryParams) => {
  return useQuery({
    queryKey: posKeys.registerList(params),
    queryFn: () => posService.getRegisters(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get register by ID
 */
export const useCashRegister = (id: string, enabled = true) => {
  return useQuery({
    queryKey: posKeys.registerDetail(id),
    queryFn: () => posService.getRegisterById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create cash register mutation
 */
export const useCreateCashRegister = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCashRegisterInput) => posService.createRegister(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: posKeys.registers() });
    },
  });
};

/**
 * Update cash register mutation
 */
export const useUpdateCashRegister = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCashRegisterInput }) =>
      posService.updateRegister(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: posKeys.registers() });
      queryClient.invalidateQueries({ queryKey: posKeys.registerDetail(id) });
    },
  });
};

// ================================
// SESSION HOOKS
// ================================

/**
 * Get list of sessions
 */
export const useSessions = (params?: SessionQueryParams) => {
  return useQuery({
    queryKey: posKeys.sessionList(params),
    queryFn: () => posService.getSessions(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Get current user's active session
 */
export const useActiveSession = (branchId?: string) => {
  return useQuery({
    queryKey: posKeys.sessionActive(branchId),
    queryFn: () => posService.getActiveSession(branchId),
    staleTime: 30 * 1000, // 30 seconds - needs to be fresh
    refetchInterval: 60 * 1000, // Refetch every minute
    enabled: !!branchId, // Don't fetch until branchId is available
  });
};

/**
 * Get session by ID
 */
export const useSession = (id: string, enabled = true) => {
  return useQuery({
    queryKey: posKeys.sessionDetail(id),
    queryFn: () => posService.getSessionById(id),
    enabled: enabled && !!id,
    staleTime: 2 * 60 * 1000,
  });
};

// ================================
// SALE HOOKS
// ================================

/**
 * Get list of sales
 */
export const useSales = (params?: SaleQueryParams, enabled = true) => {
  return useQuery({
    queryKey: posKeys.saleList(params),
    queryFn: () => posService.getSales(params),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled,
  });
};

/**
 * Get daily sales summary
 */
export const useDailySalesSummary = (branchId: string, date?: string) => {
  return useQuery({
    queryKey: posKeys.saleSummary(branchId, date),
    queryFn: () => posService.getDailySummary(branchId, date),
    enabled: !!branchId,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Get sale by ID
 */
export const useSale = (id: string, enabled = true) => {
  return useQuery({
    queryKey: posKeys.saleDetail(id),
    queryFn: () => posService.getSaleById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create sale mutation
 */
export const useCreateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSaleInput) => posService.createSale(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: posKeys.sales() });
      queryClient.invalidateQueries({ queryKey: posKeys.sessionActive() });
    },
  });
};

/**
 * Process payment mutation
 */
export const useProcessPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProcessPaymentInput) => posService.processPayment(data),
    onSuccess: (_, { saleId }) => {
      queryClient.invalidateQueries({ queryKey: posKeys.sales() });
      queryClient.invalidateQueries({ queryKey: posKeys.saleDetail(saleId) });
      queryClient.invalidateQueries({ queryKey: posKeys.sessionActive() });
      queryClient.invalidateQueries({ queryKey: posKeys.movements() });
    },
  });
};

/**
 * Update sale payment method mutation (admin/super_admin only)
 */
export const useUpdateSalePaymentMethod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, paymentMethod }: { id: string; paymentMethod: string }) =>
      posService.updateSalePaymentMethod(id, paymentMethod),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: posKeys.sales() });
      queryClient.invalidateQueries({ queryKey: posKeys.saleDetail(id) });
    },
  });
};

/**
 * Cancel sale mutation
 */
export const useCancelSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelSaleInput }) =>
      posService.cancelSale(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: posKeys.sales() });
      queryClient.invalidateQueries({ queryKey: posKeys.saleDetail(id) });
      queryClient.invalidateQueries({ queryKey: posKeys.sessionActive() });
    },
  });
};

// ================================
// CASH MOVEMENT HOOKS
// ================================

/**
 * Get list of cash movements
 */
export const useCashMovements = (params?: CashMovementQueryParams) => {
  return useQuery({
    queryKey: posKeys.movementList(params),
    queryFn: () => posService.getMovements(params),
    staleTime: 1 * 60 * 1000,
  });
};

/**
 * Get cash balance for a session
 */
export const useCashBalance = (sessionId: string, enabled = true) => {
  return useQuery({
    queryKey: posKeys.movementBalance(sessionId),
    queryFn: () => posService.getBalance(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

/**
 * Get movement by ID
 */
export const useCashMovement = (id: string, enabled = true) => {
  return useQuery({
    queryKey: posKeys.movementDetail(id),
    queryFn: () => posService.getMovementById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create cash movement mutation
 */
export const useCreateCashMovement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCashMovementInput) => posService.createMovement(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: posKeys.movements() });
      queryClient.invalidateQueries({ queryKey: posKeys.movementBalance(result.sessionId) });
      queryClient.invalidateQueries({ queryKey: posKeys.sessionActive() });
    },
  });
};

/**
 * Approve withdrawal mutation
 */
export const useApproveWithdrawal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      posService.approveWithdrawal(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: posKeys.movements() });
      queryClient.invalidateQueries({ queryKey: posKeys.sessionActive() });
    },
  });
};

/**
 * Reject withdrawal mutation
 */
export const useRejectWithdrawal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => posService.rejectWithdrawal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: posKeys.movements() });
    },
  });
};

// ================================
// PRODUCT SEARCH HOOKS
// ================================

/**
 * Search products for POS
 * @param sku - If provided, does exact match by product code instead of ILIKE search
 */
export const usePosProductSearch = (query: string, enabled = true, branchId?: string, priceTypeId?: string, countryId?: string, sku?: string) => {
  return useQuery({
    queryKey: posKeys.productSearch(sku || query, branchId, priceTypeId, countryId),
    queryFn: () => posService.searchProducts(query, 10, branchId, priceTypeId, countryId, sku),
    enabled: enabled && (query.length >= 2 || (!!sku && sku.length >= 1)),
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Fetch all POS products for the branch (catalog grid)
 */
export const usePosProductCatalog = (branchId?: string, priceTypeId?: string, countryId?: string) => {
  return useQuery({
    queryKey: posKeys.productCatalog(branchId, priceTypeId, countryId),
    queryFn: () => posService.searchProducts('', 500, branchId, priceTypeId, countryId),
    enabled: !!branchId,
    staleTime: 60 * 1000,
  });
};

/**
 * Search distributor customers for POS
 * Supports individual name fields (firstName, lastName, mothersLastName) for precise filtering,
 * or customerNumber for exact match.
 */
export const usePosCustomerSearch = (
  query: string,
  enabled = true,
  customerNumber?: string,
  nameFields?: { firstName?: string; lastName?: string; mothersLastName?: string },
) => {
  const hasNameFields = nameFields && (nameFields.firstName || nameFields.lastName || nameFields.mothersLastName);
  return useQuery({
    queryKey: posKeys.customerSearch(query, customerNumber),
    queryFn: () => customersService.getAll({
      // Use individual name fields when available, otherwise fall back to generic search
      search: (customerNumber || hasNameFields) ? undefined : query,
      firstName: hasNameFields ? nameFields.firstName : undefined,
      lastName: hasNameFields ? nameFields.lastName : undefined,
      mothersLastName: hasNameFields ? nameFields.mothersLastName : undefined,
      customerNumber: customerNumber || undefined,
      customerType: 'distributor',
      status: 'active',
      limit: 10,
    }),
    enabled: enabled && (query.length >= 2 || (!!customerNumber && customerNumber.length >= 1)),
    staleTime: 60 * 1000,
  });
};

// ================================
// UTILITY HOOKS
// ================================

/**
 * Invalidate POS cache
 */
export const useRefreshPos = () => {
  const queryClient = useQueryClient();

  return {
    refreshAll: () => {
      queryClient.invalidateQueries({ queryKey: posKeys.all });
    },
    refreshSessions: () => {
      queryClient.invalidateQueries({ queryKey: posKeys.sessions() });
    },
    refreshSales: () => {
      queryClient.invalidateQueries({ queryKey: posKeys.sales() });
    },
    refreshMovements: () => {
      queryClient.invalidateQueries({ queryKey: posKeys.movements() });
    },
  };
};
