// useBotnatura.ts - Facturación a Botnatura: catálogo, datos fiscales y facturas del módulo.

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { botnaturaService } from '@/services/botnatura.service';
import type {
  BotnaturaInvoiceRequest,
  BotnaturaProductsQuery,
  SaveBotnaturaProduct,
  SaveBotnaturaSettings,
} from '@/types/botnatura';

export const botnaturaKeys = {
  products: (query?: BotnaturaProductsQuery) => ['botnatura', 'products', query ?? {}] as const,
  settings: () => ['botnatura', 'settings'] as const,
  invoices: (page?: number) => ['botnatura', 'invoices', page ?? 1] as const,
};

export function useBotnaturaProducts(query: BotnaturaProductsQuery, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: botnaturaKeys.products(query),
    queryFn: () => botnaturaService.listProducts(query),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useBotnaturaSettings() {
  return useQuery({ queryKey: botnaturaKeys.settings(), queryFn: () => botnaturaService.getSettings() });
}

export function useBotnaturaInvoices(page: number) {
  return useQuery({
    queryKey: botnaturaKeys.invoices(page),
    queryFn: () => botnaturaService.listInvoices({ page, limit: 25 }),
    placeholderData: keepPreviousData,
  });
}

/** Alta (sin id) o corrección (con id) de un producto del catálogo de Botnatura. */
export function useSaveBotnaturaProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id?: string; dto: SaveBotnaturaProduct }) =>
      id ? botnaturaService.updateProduct(id, dto) : botnaturaService.createProduct(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['botnatura', 'products'] });
    },
  });
}

export function useSaveBotnaturaSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SaveBotnaturaSettings) => botnaturaService.saveSettings(dto),
    onSuccess: (data) => {
      queryClient.setQueryData(botnaturaKeys.settings(), data);
    },
  });
}

export function usePreviewBotnaturaInvoice() {
  return useMutation({ mutationFn: (dto: BotnaturaInvoiceRequest) => botnaturaService.previewInvoice(dto) });
}

export function useCreateBotnaturaInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: BotnaturaInvoiceRequest) => botnaturaService.createInvoice(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['botnatura', 'invoices'] });
    },
  });
}
