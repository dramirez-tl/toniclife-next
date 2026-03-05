// useInventory.ts - React Query hooks for Inventory Management
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.2 Módulo Productos e Inventario

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventory.service';
import type {
  BranchStockQueryDto,
  KardexQueryDto,
  TransferQueryDto,
  CreateTransferDto,
  ApproveTransferDto,
  CancelTransferDto,
  AdjustmentQueryDto,
  CreateAdjustmentDto,
  UpdateAdjustmentDto,
  SubmitAdjustmentDto,
  ApproveAdjustmentDto,
  RejectAdjustmentDto,
  ApplyAdjustmentDto,
  UpdateStockSettingsDto,
  MovementQueryDto,
  CreateMovementDto,
} from '@/types/inventory';

// ================================
// QUERY KEYS
// ================================

export const inventoryKeys = {
  all: ['inventory'] as const,
  // Stock
  stock: () => [...inventoryKeys.all, 'stock'] as const,
  branchStock: (branchId: string, query?: BranchStockQueryDto) =>
    [...inventoryKeys.stock(), 'branch', branchId, query] as const,
  productStock: (productId: string) =>
    [...inventoryKeys.stock(), 'product', productId] as const,
  // Kardex
  kardex: () => [...inventoryKeys.all, 'kardex'] as const,
  productKardex: (productId: string, query?: KardexQueryDto) =>
    [...inventoryKeys.kardex(), productId, query] as const,
  // Transfers
  transfers: () => [...inventoryKeys.all, 'transfers'] as const,
  transfersList: (query?: TransferQueryDto) =>
    [...inventoryKeys.transfers(), 'list', query] as const,
  transferDetail: (id: string) =>
    [...inventoryKeys.transfers(), 'detail', id] as const,
  // Summary
  summary: () => [...inventoryKeys.all, 'summary'] as const,
  // Movements (Entradas/Salidas)
  movements: () => [...inventoryKeys.all, 'movements'] as const,
  movementsList: (query?: MovementQueryDto) =>
    [...inventoryKeys.movements(), 'list', query] as const,
  movementDetail: (id: string) =>
    [...inventoryKeys.movements(), 'detail', id] as const,
  // Adjustments
  adjustments: () => [...inventoryKeys.all, 'adjustments'] as const,
  adjustmentsList: (query?: AdjustmentQueryDto) =>
    [...inventoryKeys.adjustments(), 'list', query] as const,
  adjustmentDetail: (id: string) =>
    [...inventoryKeys.adjustments(), 'detail', id] as const,
};

// ================================
// INVENTORY SUMMARY
// ================================

export function useInventorySummary() {
  return useQuery({
    queryKey: inventoryKeys.summary(),
    queryFn: () => inventoryService.getInventorySummary(),
    staleTime: 60 * 1000, // 1 minute
  });
}

// ================================
// STOCK QUERIES
// ================================

export function useBranchStock(branchId: string | null, query: BranchStockQueryDto = {}) {
  return useQuery({
    queryKey: inventoryKeys.branchStock(branchId || '', query),
    queryFn: () => inventoryService.getBranchStock(branchId!, query),
    enabled: !!branchId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useProductStock(productId: string | null) {
  return useQuery({
    queryKey: inventoryKeys.productStock(productId || ''),
    queryFn: () => inventoryService.getProductStock(productId!),
    enabled: !!productId,
    staleTime: 30 * 1000,
  });
}

export function useUpdateStockSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      branchId,
      productId,
      dto,
    }: {
      branchId: string;
      productId: string;
      dto: UpdateStockSettingsDto;
    }) => inventoryService.updateStockSettings(branchId, productId, dto),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.productStock(productId) });
    },
  });
}

// ================================
// KARDEX QUERIES
// ================================

export function useKardex(productId: string | null, query: KardexQueryDto = {}) {
  return useQuery({
    queryKey: inventoryKeys.productKardex(productId || '', query),
    queryFn: () => inventoryService.getKardex(productId!, query),
    enabled: !!productId,
    staleTime: 30 * 1000,
  });
}

// ================================
// TRANSFER QUERIES & MUTATIONS
// ================================

export function useTransfers(query: TransferQueryDto = {}) {
  return useQuery({
    queryKey: inventoryKeys.transfersList(query),
    queryFn: () => inventoryService.getTransfers(query),
    staleTime: 30 * 1000,
  });
}

export function useTransfer(id: string | null) {
  return useQuery({
    queryKey: inventoryKeys.transferDetail(id || ''),
    queryFn: () => inventoryService.getTransfer(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransferDto) => inventoryService.createTransfer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transfers() });
    },
  });
}

export function useApproveTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ApproveTransferDto }) =>
      inventoryService.approveTransfer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.transferDetail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transfers() });
    },
  });
}

export function useCancelTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelTransferDto }) =>
      inventoryService.cancelTransfer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.transferDetail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transfers() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
    },
  });
}

export function useRejectTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { reason: string } }) =>
      inventoryService.rejectTransfer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.transferDetail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transfers() });
    },
  });
}

export function useApplyTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => inventoryService.applyTransfer(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.transferDetail(id),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transfers() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
    },
  });
}

// ================================
// MOVEMENT QUERIES & MUTATIONS (Entradas/Salidas)
// ================================

export function useMovements(query: MovementQueryDto = {}) {
  return useQuery({
    queryKey: inventoryKeys.movementsList(query),
    queryFn: () => inventoryService.getMovements(query),
    staleTime: 30 * 1000,
  });
}

export function useMovement(id: string | null) {
  return useQuery({
    queryKey: inventoryKeys.movementDetail(id || ''),
    queryFn: () => inventoryService.getMovement(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useCreateMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMovementDto) => inventoryService.createMovement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.movements() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
    },
  });
}

export function useApproveMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      inventoryService.approveMovement(id, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.movementDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.movements() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
    },
  });
}

export function useRejectMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      inventoryService.rejectMovement(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.movementDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.movements() });
    },
  });
}

// ================================
// ADJUSTMENT QUERIES & MUTATIONS
// ================================

export function useAdjustments(query: AdjustmentQueryDto = {}) {
  return useQuery({
    queryKey: inventoryKeys.adjustmentsList(query),
    queryFn: () => inventoryService.getAdjustments(query),
    staleTime: 30 * 1000,
  });
}

export function useAdjustment(id: string | null) {
  return useQuery({
    queryKey: inventoryKeys.adjustmentDetail(id || ''),
    queryFn: () => inventoryService.getAdjustment(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdjustmentDto) => inventoryService.createAdjustment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.adjustments() });
    },
  });
}

export function useUpdateAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdjustmentDto }) =>
      inventoryService.updateAdjustment(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.adjustmentDetail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.adjustments() });
    },
  });
}

export function useSubmitAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: SubmitAdjustmentDto }) =>
      inventoryService.submitAdjustment(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.adjustmentDetail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.adjustments() });
    },
  });
}

export function useApproveAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ApproveAdjustmentDto }) =>
      inventoryService.approveAdjustment(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.adjustmentDetail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.adjustments() });
    },
  });
}

export function useRejectAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectAdjustmentDto }) =>
      inventoryService.rejectAdjustment(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.adjustmentDetail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.adjustments() });
    },
  });
}

export function useApplyAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ApplyAdjustmentDto }) =>
      inventoryService.applyAdjustment(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.adjustmentDetail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.adjustments() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
    },
  });
}

export function useCancelAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => inventoryService.cancelAdjustment(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.adjustmentDetail(id),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.adjustments() });
    },
  });
}
