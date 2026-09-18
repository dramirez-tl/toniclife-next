// useBilling.ts - React Query hooks para facturación CFDI
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.5 Facturación

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  billingService,
  type CfdiUsesQuery,
  type FiscalDataQueryDto,
  type FacturamaCfdisQuery,
} from '@/services/billing.service';
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
  PersonType,
  ReadinessCustomersQuery,
  ReadinessProductsQuery,
  SatCodeKind,
  UpdateBranchFiscalDto,
  UpdateEmitterDto,
  UpdatePaymentMethodFiscalDto,
  UpdateProductFiscalDto,
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
  cfdiUses: (query?: CfdiUsesQuery) => [...billingKeys.catalogs(), 'cfdi-uses', query] as const,
  fiscalRegimes: (personType?: PersonType) =>
    [...billingKeys.catalogs(), 'fiscal-regimes', personType ?? 'all'] as const,
  satCodes: (kind: SatCodeKind, keyword: string) =>
    [...billingKeys.catalogs(), 'sat-codes', kind, keyword] as const,
  status: () => [...billingKeys.all, 'status'] as const,
  facturamaCfdis: (query?: FacturamaCfdisQuery) => [...billingKeys.all, 'facturama-cfdis', query] as const,
  // Preparación fiscal (Fase 1). Todo cuelga de `readiness()` para que una
  // sola invalidación recalcule conteos, listados, emisor y bloqueadores.
  readiness: () => [...billingKeys.all, 'readiness'] as const,
  readinessProducts: (query?: ReadinessProductsQuery) =>
    [...billingKeys.readiness(), 'products', query] as const,
  readinessCustomers: (query?: ReadinessCustomersQuery) =>
    [...billingKeys.readiness(), 'customers', query] as const,
  readinessDuplicates: (query?: { page?: number; limit?: number }) =>
    [...billingKeys.readiness(), 'duplicates', query] as const,
  readinessPaymentMethods: () => [...billingKeys.readiness(), 'payment-methods'] as const,
  readinessBranches: () => [...billingKeys.readiness(), 'branches'] as const,
  emitter: () => [...billingKeys.readiness(), 'emitter'] as const,
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

/**
 * Usos de CFDI desde BD. Con `regime` solo devuelve los compatibles con ese
 * régimen (`sat_cfdi_use_regimes`); sin él, el catálogo completo.
 */
export function useCfdiUses(regime?: string, personType?: PersonType) {
  const query: CfdiUsesQuery = {
    regime: regime || undefined,
    personType: personType || undefined,
  };
  return useQuery({
    queryKey: billingKeys.cfdiUses(query),
    queryFn: () => billingService.getCfdiUses(query),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/** Regímenes fiscales desde BD, filtrables por tipo de persona (según el RFC). */
export function useFiscalRegimes(personType?: PersonType) {
  return useQuery({
    queryKey: billingKeys.fiscalRegimes(personType),
    queryFn: () => billingService.getFiscalRegimes(personType),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Búsqueda en el catálogo del PAC para `SatCodeSearch`. Solo dispara con 3+
 * caracteres; el que llama ya aplica el retraso de 300 ms.
 */
export function useSatCodeSearch(kind: SatCodeKind, keyword: string) {
  const term = keyword.trim();
  return useQuery({
    queryKey: billingKeys.satCodes(kind, term),
    queryFn: () => billingService.searchSatCodes(kind, term),
    enabled: term.length >= 3,
    staleTime: 60 * 60 * 1000, // 1 hour (mismo cache que el API)
    retry: false,
  });
}

// ================================
// PREPARACIÓN FISCAL (Fase 1)
// ================================

export function useBillingReadiness() {
  return useQuery({
    queryKey: billingKeys.readiness(),
    queryFn: () => billingService.getReadiness(),
    staleTime: 60 * 1000,
  });
}

/** Tras cualquier corrección hay que recalcular conteos y bloqueadores. */
function useInvalidateReadiness() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: billingKeys.readiness() });
  };
}

export function useReadinessProducts(query: ReadinessProductsQuery) {
  return useQuery({
    queryKey: billingKeys.readinessProducts(query),
    queryFn: () => billingService.listReadinessProducts(query),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateProductFiscal() {
  const invalidate = useInvalidateReadiness();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductFiscalDto }) =>
      billingService.updateProductFiscal(id, data),
    onSuccess: () => {
      invalidate();
      toast.success('Datos fiscales del producto guardados');
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudieron guardar los datos fiscales del producto'));
    },
  });
}

/** Importación CSV. El diálogo muestra el resultado; aquí solo se invalida al aplicar. */
export function useImportProductFiscal() {
  const invalidate = useInvalidateReadiness();
  return useMutation({
    mutationFn: ({ file, dryRun }: { file: File; dryRun: boolean }) =>
      billingService.importProductFiscal(file, dryRun),
    onSuccess: (_, { dryRun }) => {
      if (!dryRun) invalidate();
    },
  });
}

export function useReadinessCustomers(query: ReadinessCustomersQuery) {
  return useQuery({
    queryKey: billingKeys.readinessCustomers(query),
    queryFn: () => billingService.listReadinessCustomers(query),
    placeholderData: keepPreviousData,
  });
}

/**
 * Guarda los datos fiscales de un cliente desde Preparación fiscal.
 * Misma ruta que `useUpdateFiscalData` (PUT /billing/fiscal-data/:customerId),
 * pero además invalida los conteos de preparación.
 */
export function useUpdateCustomerFiscal() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateReadiness();
  return useMutation({
    mutationFn: ({ customerId, data }: { customerId: string; data: UpdateFiscalDataDto }) =>
      billingService.updateFiscalData(customerId, data),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: billingKeys.fiscalData() });
      toast.success('Datos fiscales del cliente guardados');
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudieron guardar los datos fiscales del cliente'));
    },
  });
}

/** Limpieza de RFC inválidos: la vista previa (dryRun) no invalida nada. */
export function useCleanInvalidRfc() {
  const invalidate = useInvalidateReadiness();
  return useMutation({
    mutationFn: (dryRun: boolean) => billingService.cleanInvalidRfc(dryRun),
    onSuccess: (result) => {
      if (!result.dryRun) {
        invalidate();
        toast.success(`Se limpiaron ${result.affected} RFC inválidos`);
      }
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudo limpiar los RFC inválidos'));
    },
  });
}

export function useRfcDuplicates(query: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: billingKeys.readinessDuplicates(query),
    queryFn: () => billingService.listRfcDuplicates(query),
    placeholderData: keepPreviousData,
  });
}

export function useReadinessPaymentMethods() {
  return useQuery({
    queryKey: billingKeys.readinessPaymentMethods(),
    queryFn: () => billingService.listReadinessPaymentMethods(),
  });
}

export function useUpdatePaymentMethodFiscal() {
  const invalidate = useInvalidateReadiness();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentMethodFiscalDto }) =>
      billingService.updatePaymentMethodFiscal(id, data),
    onSuccess: () => {
      invalidate();
      toast.success('Forma de pago actualizada');
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudo actualizar la forma de pago'));
    },
  });
}

export function useReadinessBranches() {
  return useQuery({
    queryKey: billingKeys.readinessBranches(),
    queryFn: () => billingService.listReadinessBranches(),
  });
}

export function useUpdateBranchFiscal() {
  const invalidate = useInvalidateReadiness();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBranchFiscalDto }) =>
      billingService.updateBranchFiscal(id, data),
    onSuccess: () => {
      invalidate();
      toast.success('Sucursal actualizada');
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudo actualizar la sucursal'));
    },
  });
}

export function useEmitter() {
  return useQuery({
    queryKey: billingKeys.emitter(),
    queryFn: () => billingService.getEmitter(),
  });
}

export function useUpdateEmitter() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateReadiness();
  return useMutation({
    mutationFn: (data: UpdateEmitterDto) => billingService.updateEmitter(data),
    onSuccess: (data) => {
      queryClient.setQueryData(billingKeys.emitter(), data);
      invalidate();
      toast.success('Datos del emisor guardados');
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudieron guardar los datos del emisor'));
    },
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
