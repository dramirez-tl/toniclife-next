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
import { billingErrorMessage, isBillingErrorCode } from '@/lib/billing-error';
import type {
  CreateFiscalDataDto,
  UpdateFiscalDataDto,
  CreateInvoiceDto,
  CancelInvoiceDto,
  CreateGlobalInvoiceDto,
  CreatePaymentComplementDto,
  GlobalDaysQuery,
  GlobalPreviewQuery,
  InvoiceListQuery,
  InvoiceableSalesQuery,
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
  invoicesList: (query?: InvoiceListQuery) => [...billingKeys.invoices(), 'list', query] as const,
  invoiceFiles: (id: string) => [...billingKeys.invoices(), id, 'files'] as const,
  invoiceableSales: () => [...billingKeys.all, 'invoiceable-sales'] as const,
  invoiceableSalesList: (query?: InvoiceableSalesQuery) =>
    [...billingKeys.invoiceableSales(), 'list', query] as const,
  fiscalData: () => [...billingKeys.all, 'fiscal-data'] as const,
  fiscalDataList: (query?: FiscalDataQueryDto) => [...billingKeys.fiscalData(), 'list', query] as const,
  fiscalDataById: (id: string) => [...billingKeys.fiscalData(), id] as const,
  fiscalDataByCustomer: (customerId: string) =>
    [...billingKeys.fiscalData(), 'customer', customerId] as const,
  globalDays: () => [...billingKeys.all, 'global-days'] as const,
  globalDaysList: (query?: GlobalDaysQuery) => [...billingKeys.globalDays(), query] as const,
  globalPreview: () => [...billingKeys.all, 'global-preview'] as const,
  globalPreviewFor: (query?: GlobalPreviewQuery) => [...billingKeys.globalPreview(), query] as const,
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
// INVOICE HOOKS (Fase 2)
// ================================

export function useInvoices(query?: InvoiceListQuery, enabled = true) {
  return useQuery({
    queryKey: billingKeys.invoicesList(query),
    queryFn: () => billingService.listInvoices(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: billingKeys.invoice(id || ''),
    queryFn: () => billingService.getInvoice(id!),
    enabled: !!id,
  });
}

/** URLs firmadas de PDF/XML; solo se pide cuando la factura ya tiene archivos. */
export function useInvoiceFiles(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: billingKeys.invoiceFiles(id || ''),
    queryFn: () => billingService.getInvoiceFiles(id!),
    enabled: !!id && enabled,
    staleTime: 10 * 60 * 1000, // las URLs firmadas duran 15 min
    retry: false,
  });
}

/** Invalida detalle + listados + días/preview de la global + ventas por facturar. */
function useInvalidateInvoices() {
  const queryClient = useQueryClient();
  return (invoiceId?: string) => {
    if (invoiceId) queryClient.invalidateQueries({ queryKey: billingKeys.invoice(invoiceId) });
    queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
    queryClient.invalidateQueries({ queryKey: billingKeys.invoiceableSales() });
    queryClient.invalidateQueries({ queryKey: billingKeys.globalDays() });
    queryClient.invalidateQueries({ queryKey: billingKeys.globalPreview() });
  };
}

/** `POST /billing/invoices { posSaleId | orderId }`: crea y timbra la nominativa. */
export function useCreateInvoice() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (data: CreateInvoiceDto) => billingService.createInvoice(data),
    onSuccess: (invoice) => {
      invalidate(invoice.id);
      if (invoice.providerStatus === 'stamped') {
        toast.success(`Factura ${invoice.folioDisplay} timbrada`);
      } else {
        toast.warning(
          invoice.providerError ||
            'La factura se creó pero no quedó timbrada: revisa el detalle y reintenta.',
        );
      }
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudo facturar'));
    },
  });
}

/**
 * Reintento de timbrado (`pending`/`error`/`stamping` caducado). Con
 * `acknowledgeGlobal` el usuario ya reconoció los 3 pasos del §5.3.7; sin él un
 * ticket que está en una global viva responde 409 `CFDI_IN_GLOBAL`, que NO se
 * avisa con toast: la pantalla abre la confirmación de 3 pasos.
 */
export function useStampInvoice() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: ({ id, acknowledgeGlobal }: { id: string; acknowledgeGlobal?: boolean }) =>
      billingService.stampInvoice(id, { acknowledgeGlobal }),
    onSuccess: (invoice) => {
      invalidate(invoice.id);
      if (invoice.providerStatus === 'stamped') {
        toast.success(`Factura ${invoice.folioDisplay} timbrada`);
      } else {
        toast.warning(invoice.providerError || 'El timbrado no se pudo confirmar.');
      }
    },
    onError: (error: unknown, { acknowledgeGlobal }) => {
      if (!acknowledgeGlobal && isBillingErrorCode(error, 'CFDI_IN_GLOBAL')) return;
      toast.error(billingErrorMessage(error, 'No se pudo timbrar la factura'));
    },
  });
}

/** Desecha un intento sin UUID de una nominativa o de un complemento de pago. */
export function useDiscardInvoice() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (id: string) => billingService.discardInvoice(id),
    onSuccess: (result, id) => {
      invalidate(id);
      toast.success(
        result.releasedDocuments > 0
          ? `Intento desechado: ${result.releasedDocuments} documento(s) quedaron libres`
          : 'Intento desechado',
      );
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudo desechar el intento'));
    },
  });
}

export function useCancelInvoice() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelInvoiceDto }) =>
      billingService.cancelInvoice(id, data),
    onSuccess: (result) => {
      invalidate(result.invoiceId);
      // El SAT puede dejar la solicitud "en proceso" (espera la aceptación del
      // receptor): no declarar cancelada una factura que sigue vigente. El
      // veredicto es `confirmed` (el API lo resuelve con mapCancellationOutcome).
      if (result.confirmed) {
        toast.success('Factura cancelada: el SAT confirmó la cancelación');
      } else if (result.cancellationClass === 'rejected') {
        toast.error(
          result.message ||
            'El SAT rechazó la cancelación (o venció el plazo): la factura sigue vigente. Puedes volver a solicitarla.',
        );
      } else if (result.refreshed) {
        toast.warning(
          result.message ||
            'Se consultó al SAT (se usó 1 timbre): la cancelación sigue en proceso y la factura sigue vigente.',
        );
      } else {
        toast.warning(
          result.message ||
            'El SAT dejó la cancelación en proceso: la factura sigue vigente hasta que el receptor la acepte.',
        );
      }
    },
    onError: (error: unknown) => {
      if (isBillingErrorCode(error, 'CFDI_STATUS_RATE_LIMITED')) {
        toast.warning(
          'El estatus de esta factura ya se consultó hace menos de 10 minutos. Espera unos minutos antes de volver a preguntar al SAT (cada consulta usa 1 timbre).',
        );
        return;
      }
      toast.error(billingErrorMessage(error, 'No se pudo cancelar la factura'));
    },
  });
}

/** Sustitución (nueva con relación 04 + cancelación 01 de la original). */
export function useReplaceInvoice() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (id: string) => billingService.replaceInvoice(id),
    onSuccess: (result) => {
      invalidate(result.id);
      invalidate(result.previousInvoiceId);
      // `result.cancellation` es la de la sustituta (null recién timbrada): el
      // resultado de la cancelación 01 de la ORIGINAL viene en `previousCancellation`.
      const previous = result.previousCancellation;
      if (previous?.requested && !previous.error) {
        toast.success(`Sustituta ${result.folioDisplay} timbrada; cancelación 01 de la original solicitada`);
      } else {
        toast.warning(
          `Sustituta ${result.folioDisplay} timbrada, pero la original aún no se cancela: usa "Cancelar factura" (motivo 01) en la original.${previous?.error ? ` Detalle: ${previous.error}` : ''}`,
        );
      }
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudo sustituir la factura'));
    },
  });
}

/** Consulta al SAT (consume un folio). */
export function useRefreshInvoiceStatus() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: ({ id, force = false }: { id: string; force?: boolean }) =>
      billingService.refreshInvoiceStatus(id, force),
    onSuccess: (result, { id }) => {
      invalidate(id);
      const summary = `Estatus SAT: ${result.satStatus} (se usó ${result.foliosUsed} timbre)`;
      const options = result.message ? { description: result.message, duration: 10000 } : undefined;
      // `confirmed` = esta consulta confirmó la cancelación y liberó el origen.
      if (result.confirmed) toast.success(summary, options);
      else toast.info(summary, options);
    },
    onError: (error: unknown) => {
      if (isBillingErrorCode(error, 'CFDI_STATUS_RATE_LIMITED')) {
        toast.warning(
          'El estatus de esta factura ya se consultó hace menos de 10 minutos. Espera unos minutos antes de volver a preguntar al SAT (cada consulta usa 1 timbre).',
        );
        return;
      }
      toast.error(billingErrorMessage(error, 'No se pudo consultar el estatus ante el SAT'));
    },
  });
}

export function useSendInvoiceEmail() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: ({ id, to }: { id: string; to?: string[] }) => billingService.sendInvoiceEmail(id, to),
    onSuccess: (result, { id }) => {
      invalidate(id);
      toast.success(`Factura enviada a ${result.sentTo.join(', ')}`);
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudo enviar la factura por correo'));
    },
  });
}

// ================================
// VENTAS POR FACTURAR
// ================================

/** El API exige `branchId`: sin sucursal (`null`) no se consulta. */
export function useInvoiceableSales(query: InvoiceableSalesQuery | null) {
  return useQuery({
    queryKey: billingKeys.invoiceableSalesList(query ?? undefined),
    queryFn: () => billingService.listInvoiceableSales(query!),
    placeholderData: keepPreviousData,
    enabled: !!query?.branchId,
  });
}

// ================================
// FACTURA GLOBAL
// ================================

export function useGlobalDays(query: GlobalDaysQuery | null) {
  return useQuery({
    queryKey: billingKeys.globalDaysList(query ?? undefined),
    queryFn: () => billingService.getGlobalDays(query!),
    enabled: !!query?.branchId && !!query?.from && !!query?.to,
    staleTime: 30 * 1000,
  });
}

export function useGlobalPreview(query: GlobalPreviewQuery | null, enabled = true) {
  return useQuery({
    queryKey: billingKeys.globalPreviewFor(query ?? undefined),
    queryFn: () => billingService.previewGlobalInvoice(query!),
    enabled: enabled && !!query?.branchId && !!query?.date,
    retry: false,
  });
}

export function useCreateGlobalInvoice() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (data: CreateGlobalInvoiceDto) => billingService.createGlobalInvoice(data),
    onSuccess: (invoice) => {
      invalidate(invoice.id);
      if (invoice.providerStatus === 'stamped') {
        toast.success(`Factura global ${invoice.folioDisplay} timbrada`);
      } else {
        toast.warning(invoice.providerError || 'La global se creó pero no quedó timbrada.');
      }
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudo emitir la factura global'));
    },
  });
}

export function useDiscardGlobalInvoice() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (id: string) => billingService.discardGlobalInvoice(id),
    onSuccess: (_, id) => {
      invalidate(id);
      toast.success('Intento de factura global desechado');
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudo desechar la factura global'));
    },
  });
}

export function useReissueGlobalInvoice() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (id: string) => billingService.reissueGlobalInvoice(id),
    onSuccess: (result, originalId) => {
      invalidate(originalId);
      if (result.invoice) invalidate(result.invoice.id);
      if (result.state === 'waiting_sat') {
        toast.warning(
          result.message ||
            'El SAT aún no confirma la cancelación 04 de la global: todavía no se emite la nueva. Vuelve a intentar más tarde.',
        );
        return;
      }
      if (result.state === 'nothing_to_reissue') {
        toast.info(result.message || 'No hay nada que reexpedir en esta global.');
        return;
      }
      const invoice = result.invoice;
      if (invoice?.providerStatus === 'stamped') {
        toast.success(`Global reexpedida: ${invoice.folioDisplay}`);
      } else {
        toast.warning(
          invoice?.providerError || result.message || 'La nueva global no quedó timbrada: revisa el detalle y reintenta.',
        );
      }
      if (result.relationDropped) {
        toast.warning(
          'El PAC rechazó la relación 04: la nueva global se emitió SIN relación con la cancelada. Avisa a Contabilidad para que lo documente.',
          { duration: 15000 },
        );
      }
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudo reexpedir la factura global'));
    },
  });
}

// ================================
// COMPLEMENTO DE PAGO
// ================================

export function useCreatePaymentComplement() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (data: CreatePaymentComplementDto) => billingService.createPaymentComplement(data),
    onSuccess: (invoice) => {
      invalidate(invoice.id);
      if (invoice.providerStatus === 'stamped') {
        toast.success(`Complemento de pago ${invoice.folioDisplay} timbrado`);
      } else {
        toast.warning(invoice.providerError || 'El complemento se creó pero no quedó timbrado.');
      }
    },
    onError: (error: unknown) => {
      // El formulario regenera la llave y conserva la selección (ver la página).
      if (isBillingErrorCode(error, 'CFDI_IDEMPOTENCY_CONFLICT')) {
        toast.warning(
          'Los datos del pago cambiaron respecto al intento anterior. Ya se preparó un intento nuevo con tu selección: revisa y vuelve a confirmar.',
        );
        return;
      }
      toast.error(billingErrorMessage(error, 'No se pudo crear el complemento de pago'));
    },
  });
}

// ================================
// SUCURSAL: "Factura en v2 desde"
// ================================

export function useSetBranchInvoicingSince() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      branchId,
      since,
      acknowledgeLegacyStopped,
    }: {
      branchId: string;
      since: string | null;
      acknowledgeLegacyStopped?: boolean;
    }) =>
      billingService.setBranchInvoicingSince(branchId, {
        since,
        acknowledgeLegacyStopped: acknowledgeLegacyStopped || undefined,
      }),
    onSuccess: (result, { since }) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.readiness() });
      queryClient.invalidateQueries({ queryKey: billingKeys.status() });
      queryClient.invalidateQueries({ queryKey: billingKeys.globalDays() });
      queryClient.invalidateQueries({ queryKey: billingKeys.globalPreview() });
      queryClient.invalidateQueries({ queryKey: billingKeys.invoiceableSales() });
      const terminals =
        typeof result.terminalsOn === 'number' && typeof result.terminalsTotal === 'number'
          ? ` Terminales con Facturación encendida: ${result.terminalsOn} de ${result.terminalsTotal}.`
          : '';
      toast.success(
        since
          ? `La sucursal factura en v2 desde el ${since.split('-').reverse().join('/')}.${terminals}`
          : 'La sucursal vuelve a facturar en el sistema anterior',
      );
      if (result.warning) toast.warning(result.warning, { duration: 15000 });
    },
    onError: (error: unknown) => {
      toast.error(billingErrorMessage(error, 'No se pudo fijar la fecha de arranque'));
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

/** Alias: `GET /billing/status` también trae `v2FlowsEnabled`, `globalConceptMode`, etc. */
export const useBillingStatus = useFacturamaStatus;
