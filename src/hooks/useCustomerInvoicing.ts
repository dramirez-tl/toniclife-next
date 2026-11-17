// useCustomerInvoicing.ts - Hooks de "Mis facturas" en el portal del distribuidor.
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { customerInvoicingService } from '@/services/customerInvoicing.service';
import type {
  MyInvoicingOverview,
  SaveMyFiscalDataPayload,
} from '@/types/customer-invoicing';

export const customerInvoicingKeys = {
  all: ['customer-invoicing'] as const,
  overview: () => [...customerInvoicingKeys.all, 'overview'] as const,
  catalogs: (regime: string) =>
    [...customerInvoicingKeys.all, 'catalogs', regime] as const,
};

export const useMyInvoicing = () =>
  useQuery({
    queryKey: customerInvoicingKeys.overview(),
    queryFn: () => customerInvoicingService.getOverview(),
    staleTime: 30 * 1000,
    retry: 1,
  });

/** Catálogos del SAT: regímenes siempre; usos de CFDI solo con un régimen de 3 dígitos. */
export const useInvoicingCatalogs = (regime: string, enabled = true) => {
  const code = /^[0-9]{3}$/.test(regime) ? regime : '';
  return useQuery({
    queryKey: customerInvoicingKeys.catalogs(code),
    queryFn: () => customerInvoicingService.getCatalogs(code || undefined),
    enabled,
    // Al cambiar de régimen la lista de regímenes no se vacía mientras llegan los usos nuevos
    // (`isPlaceholderData` dice que los usos todavía son los del régimen anterior).
    placeholderData: keepPreviousData,
    // Los catálogos del SAT cambian, si acaso, una vez al año.
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
};

export const useSaveMyFiscalData = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveMyFiscalDataPayload) =>
      customerInvoicingService.saveFiscalData(payload),
    // Espera la relectura: la tarjeta pasa a "guardado" con lo que quedó en el servidor.
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: customerInvoicingKeys.overview() }),
  });
};

export const useInvoiceMyOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => customerInvoicingService.invoiceOrder(orderId),
    onSuccess: (order) => {
      // El pedido ya facturado se pinta de inmediato; la lista se vuelve a leer detrás.
      qc.setQueryData<MyInvoicingOverview>(
        customerInvoicingKeys.overview(),
        (prev) =>
          prev
            ? {
                ...prev,
                orders: prev.orders.map((o) =>
                  o.orderId === order.orderId ? order : o,
                ),
              }
            : prev,
      );
      void qc.invalidateQueries({ queryKey: customerInvoicingKeys.overview() });
    },
    // Un rechazo puede haber cambiado el estado del pedido (ya facturado, ya en la global).
    onError: () =>
      void qc.invalidateQueries({ queryKey: customerInvoicingKeys.overview() }),
  });
};
