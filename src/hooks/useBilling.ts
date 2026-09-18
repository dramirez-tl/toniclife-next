// useBilling.ts - React Query hooks para facturación CFDI
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.5 Facturación

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { billingService, type FiscalDataQueryDto, type FacturamaCfdisQuery } from '@/services/billing.service';
import { billingErrorMessage } from '@/lib/billing-error';
import type {
  CancellationResponse,
  CreateFiscalDataDto,
  UpdateFiscalDataDto,
  CreateInvoiceDto,
  CancelInvoiceDto,
  InvoiceQueryDto,
  CreateGlobalInvoiceDto,
  CreatePaymentComplementDto,
} from '@/types/billing';

// ================================
// QUERY KEYS
// ================================

export const billingKeys = {
  all: ['billing'] as const,
  invoices: () => [...billingKeys.all, 'invoices'] as const,
  invoice: (id: string) => [...billingKeys.invoices(), id] as const,
  invoicesList: (query?: InvoiceQueryDto) => [...billingKeys.invoices(), 'list', query] as const,
  fiscalData: () => [...billingKeys.all, 'fiscal-data'] as const,
  fiscalDataList: (query?: FiscalDataQueryDto) => [...billingKeys.fiscalData(), 'list', query] as const,
  fiscalDataById: (id: string) => [...billingKeys.fiscalData(), id] as const,
  fiscalDataByCustomer: (customerId: string) =>
    [...billingKeys.fiscalData(), 'customer', customerId] as const,
  globalInvoices: () => [...billingKeys.all, 'global-invoices'] as const,
  globalInvoice: (id: string) => [...billingKeys.globalInvoices(), id] as const,
  paymentComplements: () => [...billingKeys.all, 'payment-complements'] as const,
  paymentComplement: (id: string) => [...billingKeys.paymentComplements(), id] as const,
  catalogs: () => [...billingKeys.all, 'catalogs'] as const,
  paymentForms: () => [...billingKeys.catalogs(), 'payment-forms'] as const,
  cfdiUses: () => [...billingKeys.catalogs(), 'cfdi-uses'] as const,
  fiscalRegimes: () => [...billingKeys.catalogs(), 'fiscal-regimes'] as const,
  status: () => [...billingKeys.all, 'status'] as const,
  facturamaCfdis: (query?: FacturamaCfdisQuery) => [...billingKeys.all, 'facturama-cfdis', query] as const,
};

// ================================
// FISCAL DATA HOOKS
// ================================

export function useFiscalDataList(query?: FiscalDataQueryDto) {
  return useQuery({
    queryKey: billingKeys.fiscalDataList(query),
    queryFn: () => billingService.listFiscalData(query),
  });
}

export function useFiscalData(id: string | undefined) {
  return useQuery({
    queryKey: billingKeys.fiscalDataById(id || ''),
    queryFn: () => billingService.getFiscalData(id!),
    enabled: !!id,
  });
}

export function useFiscalDataByCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: billingKeys.fiscalDataByCustomer(customerId || ''),
    queryFn: () => billingService.getFiscalDataByCustomer(customerId!),
    enabled: !!customerId,
  });
}

export function useCreateFiscalData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFiscalDataDto) => billingService.createFiscalData(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.fiscalData() });
      toast.success('Datos fiscales guardados correctamente');
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudieron guardar los datos fiscales'));
    },
  });
}

export function useUpdateFiscalData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFiscalDataDto }) =>
      billingService.updateFiscalData(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.fiscalData() });
      toast.success('Datos fiscales actualizados');
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudieron actualizar los datos fiscales'));
    },
  });
}

// ================================
// INVOICE HOOKS
// ================================

export function useInvoices(query?: InvoiceQueryDto) {
  return useQuery({
    queryKey: billingKeys.invoicesList(query),
    queryFn: () => billingService.listInvoices(query),
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: billingKeys.invoice(id || ''),
    queryFn: () => billingService.getInvoice(id!),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvoiceDto) => billingService.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
      toast.success('Factura creada correctamente');
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudo crear la factura'));
    },
  });
}

export function useStampInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, sendEmail = false }: { id: string; sendEmail?: boolean }) =>
      billingService.stampInvoice(id, sendEmail),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoice(data.id) });
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
      toast.success('Factura timbrada correctamente');
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudo timbrar la factura'));
    },
  });
}

/**
 * ¿El SAT dio la cancelación por CONFIRMADA?
 *
 * Fuente de verdad: `confirmed` / `providerStatus`, que el API resuelve con
 * `mapCancellationOutcome` (fail-closed: lo que no confirma queda en proceso).
 * El texto crudo del PAC solo se mira si el API todavía responde el contrato
 * viejo, y con el mismo criterio conservador: "en proceso" gana.
 */
function cancelacionConfirmada(response: CancellationResponse): boolean {
  if (typeof response.confirmed === 'boolean') return response.confirmed;
  if (response.providerStatus) return response.providerStatus === 'cancelled';

  const texto = String(response.status ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  if (!texto) return false;
  const enProceso = ['en proceso', 'pendiente', 'pending', 'espera', 'solicitud'];
  if (enProceso.some((marca) => texto.includes(marca))) return false;
  return ['cancelado', 'cancelada', 'canceled', 'cancelled', 'aceptad'].some((marca) =>
    texto.includes(marca),
  );
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelInvoiceDto }) =>
      billingService.cancelInvoice(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoice(response.invoiceId) });
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
      // El SAT puede dejar la solicitud "en proceso" (espera la aceptación del
      // receptor): no declarar cancelada una factura que sigue vigente.
      //
      // El veredicto sale de `confirmed`/`providerStatus`, que es justo lo que
      // el API resuelve al mapear el acuse. `response.status` es el texto CRUDO
      // del PAC ("Cancelado", "canceled", "Cancelacion aceptada"): compararlo
      // contra 'cancelled' daba SIEMPRE falso y avisaba "en proceso" encima de
      // CFDI ya cancelados. Solo se usa como último recurso si el API todavía
      // responde el contrato viejo (sin `providerStatus`).
      const cancelada = cancelacionConfirmada(response);
      if (cancelada) {
        toast.success('Factura cancelada correctamente');
      } else {
        toast.warning(
          response.statusDetail ||
            response.message ||
            'El SAT dejó la cancelación en proceso: la factura sigue vigente hasta que el receptor la acepte.',
        );
      }
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudo cancelar la factura'));
    },
  });
}

// ================================
// GLOBAL INVOICE HOOKS
// ================================

export function useGlobalInvoice(id: string | undefined) {
  return useQuery({
    queryKey: billingKeys.globalInvoice(id || ''),
    queryFn: () => billingService.getGlobalInvoice(id!),
    enabled: !!id,
  });
}

export function useCreateGlobalInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGlobalInvoiceDto) => billingService.createGlobalInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.globalInvoices() });
      toast.success('Factura global creada');
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudo crear la factura global'));
    },
  });
}

export function useStampGlobalInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => billingService.stampGlobalInvoice(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.globalInvoice(data.id) });
      queryClient.invalidateQueries({ queryKey: billingKeys.globalInvoices() });
      toast.success('Factura global timbrada');
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudo timbrar la factura global'));
    },
  });
}

// ================================
// PAYMENT COMPLEMENT HOOKS
// ================================

export function usePaymentComplement(id: string | undefined) {
  return useQuery({
    queryKey: billingKeys.paymentComplement(id || ''),
    queryFn: () => billingService.getPaymentComplement(id!),
    enabled: !!id,
  });
}

export function useCreatePaymentComplement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentComplementDto) =>
      billingService.createPaymentComplement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.paymentComplements() });
      toast.success('Complemento de pago creado');
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudo crear el complemento de pago'));
    },
  });
}

export function useStampPaymentComplement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => billingService.stampPaymentComplement(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.paymentComplement(data.id) });
      queryClient.invalidateQueries({ queryKey: billingKeys.paymentComplements() });
      toast.success('Complemento de pago timbrado');
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudo timbrar el complemento de pago'));
    },
  });
}

// ================================
// CATALOG HOOKS
// ================================

export function usePaymentForms() {
  return useQuery({
    queryKey: billingKeys.paymentForms(),
    queryFn: () => billingService.getPaymentForms(),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

export function useCfdiUses() {
  return useQuery({
    queryKey: billingKeys.cfdiUses(),
    queryFn: () => billingService.getCfdiUses(),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

export function useFiscalRegimes() {
  return useQuery({
    queryKey: billingKeys.fiscalRegimes(),
    queryFn: () => billingService.getFiscalRegimes(),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

// ================================
// VALIDATION HOOKS
// ================================

export function useValidateRfc() {
  return useMutation({
    mutationFn: (rfc: string) => billingService.validateRfc(rfc),
    onSuccess: (result) => {
      if (result.IsValid) {
        toast.success('RFC válido');
      } else {
        toast.error(`RFC inválido: ${result.Message}`);
      }
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudo validar el RFC'));
    },
  });
}

// ================================
// STATUS HOOKS
// ================================

export function useFacturamaCfdis(query?: FacturamaCfdisQuery) {
  return useQuery({
    queryKey: billingKeys.facturamaCfdis(query),
    queryFn: () => billingService.listFacturamaCfdis(query),
    enabled: !!(query?.dateStart && query?.dateEnd),
  });
}

export function useFacturamaStatus() {
  return useQuery({
    queryKey: billingKeys.status(),
    queryFn: () => billingService.getFacturamaStatus(),
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}
