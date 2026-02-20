// useInventory.ts - React Query hooks for Inventory Management
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.2 Módulo Productos e Inventario

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventory.service';
import type {
  BranchStockQueryDto,
  LotQueryDto,
  CreateLotDto,
  KardexQueryDto,
  TransferQueryDto,
  CreateTransferDto,
  ApproveTransferDto,
  ShipTransferDto,
  ReceiveTransferDto,
  CancelTransferDto,
  AdjustmentQueryDto,
  CreateAdjustmentDto,
  UpdateAdjustmentDto,
  SubmitAdjustmentDto,
  ApproveAdjustmentDto,
  RejectAdjustmentDto,
  ApplyAdjustmentDto,
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
  // Lots
  lots: () => [...inventoryKeys.all, 'lots'] as const,
  productLots: (productId: string, query?: LotQueryDto) =>
    [...inventoryKeys.lots(), productId, query] as const,
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

// ================================
// LOT QUERIES & MUTATIONS
// ================================

export function useProductLots(productId: string | null, query: LotQueryDto = {}) {
  return useQuery({
    queryKey: inventoryKeys.productLots(productId || '', query),
    queryFn: () => inventoryService.getProductLots(productId!, query),
    enabled: !!productId,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useCreateLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string;
      data: Omit<CreateLotDto, 'productId'>;
    }) => inventoryService.createLot(productId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.productLots(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.stock(),
      });
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

export function useShipTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ShipTransferDto }) =>
      inventoryService.shipTransfer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.transferDetail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transfers() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
    },
  });
}

export function useReceiveTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReceiveTransferDto }) =>
      inventoryService.receiveTransfer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.transferDetail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transfers() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
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
