// useConfig.ts - React Query hooks para catálogos del sistema
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configService, type ShippingSettings } from '@/services/config.service';
import type {
  Country,
  CreateCountryDto,
  UpdateCountryDto,
  Currency,
  CreateCurrencyDto,
  UpdateCurrencyDto,
  PriceType,
  CreatePriceTypeDto,
  UpdatePriceTypeDto,
  ExchangeRate,
  CreateExchangeRateDto,
  UpdateExchangeRateDto,
  PaymentMethod,
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
  TaxRule,
  CreateTaxRuleDto,
  UpdateTaxRuleDto,
  SatCfdiUse,
  SatTaxRegime,
} from '@/types/config';

// ================================
// QUERY KEYS
// ================================

export const configKeys = {
  all: ['config'] as const,
  countries: () => [...configKeys.all, 'countries'] as const,
  countriesActive: () => [...configKeys.countries(), 'active'] as const,
  countryDetail: (id: string) => [...configKeys.countries(), id] as const,
  currencies: () => [...configKeys.all, 'currencies'] as const,
  currenciesActive: () => [...configKeys.currencies(), 'active'] as const,
  currencyDetail: (id: string) => [...configKeys.currencies(), id] as const,
  priceTypes: () => [...configKeys.all, 'price-types'] as const,
  priceTypesActive: () => [...configKeys.priceTypes(), 'active'] as const,
  priceTypeDetail: (id: string) => [...configKeys.priceTypes(), id] as const,
  priceTypeByCode: (code: string) => [...configKeys.priceTypes(), 'code', code] as const,
  exchangeRates: () => [...configKeys.all, 'exchange-rates'] as const,
  exchangeRatesActive: () => [...configKeys.exchangeRates(), 'active'] as const,
  exchangeRateDetail: (id: string) => [...configKeys.exchangeRates(), id] as const,
  currentRate: (from: string, to: string) => [...configKeys.exchangeRates(), 'rate', from, to] as const,
  paymentMethods: () => [...configKeys.all, 'payment-methods'] as const,
  paymentMethodsActive: () => [...configKeys.paymentMethods(), 'active'] as const,
  paymentMethodDetail: (id: string) => [...configKeys.paymentMethods(), id] as const,
  taxRules: () => [...configKeys.all, 'tax-rules'] as const,
  taxRulesActive: () => [...configKeys.taxRules(), 'active'] as const,
  taxRuleDetail: (id: string) => [...configKeys.taxRules(), id] as const,
  satCfdiUses: () => [...configKeys.all, 'sat-cfdi-uses'] as const,
  satCfdiUsesActive: () => [...configKeys.satCfdiUses(), 'active'] as const,
  satTaxRegimes: () => [...configKeys.all, 'sat-tax-regimes'] as const,
  satTaxRegimesActive: () => [...configKeys.satTaxRegimes(), 'active'] as const,
  shippingSettings: (country?: string) =>
    [...configKeys.all, 'shipping-settings', country ?? 'MX'] as const,
  platformSettings: () => [...configKeys.all, 'platform-settings'] as const,
};

// Stale time para catálogos (cambian raramente)
const CATALOG_STALE_TIME = 5 * 60 * 1000; // 5 minutos

// ================================
// Tipos para opciones de mutación
// ================================

interface MutationOptions<TData = unknown> {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

// ================================
// COUNTRY HOOKS
// ================================

/**
 * Hook para obtener todos los países
 */
export const useCountries = () => {
  return useQuery({
    queryKey: configKeys.countries(),
    queryFn: () => configService.getCountries(),
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para obtener países activos
 */
export const useActiveCountries = () => {
  return useQuery({
    queryKey: configKeys.countriesActive(),
    queryFn: () => configService.getActiveCountries(),
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para obtener país por ID
 */
export const useCountry = (id: string) => {
  return useQuery({
    queryKey: configKeys.countryDetail(id),
    queryFn: () => configService.getCountryById(id),
    enabled: !!id,
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para crear un país
 */
export const useCreateCountry = (options?: MutationOptions<Country>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCountryDto) => configService.createCountry(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: configKeys.countries() });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
};

/**
 * Hook para actualizar un país
 */
export const useUpdateCountry = (options?: MutationOptions<Country>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCountryDto }) =>
      configService.updateCountry(id, dto),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: configKeys.countries() });
      queryClient.invalidateQueries({ queryKey: configKeys.countryDetail(id) });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
};

// ================================
// CURRENCY HOOKS
// ================================

/**
 * Hook para obtener todas las monedas
 */
export const useCurrencies = () => {
  return useQuery({
    queryKey: configKeys.currencies(),
    queryFn: () => configService.getCurrencies(),
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para obtener monedas activas
 */
export const useActiveCurrencies = () => {
  return useQuery({
    queryKey: configKeys.currenciesActive(),
    queryFn: () => configService.getActiveCurrencies(),
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para obtener moneda por ID
 */
export const useCurrency = (id: string) => {
  return useQuery({
    queryKey: configKeys.currencyDetail(id),
    queryFn: () => configService.getCurrencyById(id),
    enabled: !!id,
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para crear una moneda
 */
export const useCreateCurrency = (options?: MutationOptions<Currency>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCurrencyDto) => configService.createCurrency(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: configKeys.currencies() });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
};

/**
 * Hook para actualizar una moneda
 */
export const useUpdateCurrency = (options?: MutationOptions<Currency>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCurrencyDto }) =>
      configService.updateCurrency(id, dto),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: configKeys.currencies() });
      queryClient.invalidateQueries({ queryKey: configKeys.currencyDetail(id) });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
};

// ================================
// PRICE TYPE HOOKS
// ================================

/**
 * Hook para obtener todos los tipos de precio
 */
export const usePriceTypes = () => {
  return useQuery({
    queryKey: configKeys.priceTypes(),
    queryFn: () => configService.getPriceTypes(),
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para obtener tipos de precio activos
 */
export const useActivePriceTypes = () => {
  return useQuery({
    queryKey: configKeys.priceTypesActive(),
    queryFn: () => configService.getActivePriceTypes(),
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para obtener tipo de precio por ID
 */
export const usePriceType = (id: string) => {
  return useQuery({
    queryKey: configKeys.priceTypeDetail(id),
    queryFn: () => configService.getPriceTypeById(id),
    enabled: !!id,
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para obtener tipo de precio por código
 */
export const usePriceTypeByCode = (code: string) => {
  return useQuery({
    queryKey: configKeys.priceTypeByCode(code),
    queryFn: () => configService.getPriceTypeByCode(code),
    enabled: !!code,
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para crear un tipo de precio
 */
export const useCreatePriceType = (options?: MutationOptions<PriceType>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreatePriceTypeDto) => configService.createPriceType(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: configKeys.priceTypes() });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
};

/**
 * Hook para actualizar un tipo de precio
 */
export const useUpdatePriceType = (options?: MutationOptions<PriceType>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePriceTypeDto }) =>
      configService.updatePriceType(id, dto),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: configKeys.priceTypes() });
      queryClient.invalidateQueries({ queryKey: configKeys.priceTypeDetail(id) });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
};

// ================================
// EXCHANGE RATE HOOKS
// ================================

/**
 * Hook para obtener todos los tipos de cambio
 */
export const useExchangeRates = () => {
  return useQuery({
    queryKey: configKeys.exchangeRates(),
    queryFn: () => configService.getExchangeRates(),
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para obtener tipos de cambio activos
 */
export const useActiveExchangeRates = () => {
  return useQuery({
    queryKey: configKeys.exchangeRatesActive(),
    queryFn: () => configService.getActiveExchangeRates(),
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para obtener tipo de cambio por ID
 */
export const useExchangeRate = (id: string) => {
  return useQuery({
    queryKey: configKeys.exchangeRateDetail(id),
    queryFn: () => configService.getExchangeRateById(id),
    enabled: !!id,
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para obtener tipo de cambio actual entre dos monedas
 */
export const useCurrentExchangeRate = (from: string, to: string) => {
  return useQuery({
    queryKey: configKeys.currentRate(from, to),
    queryFn: () => configService.getCurrentRate(from, to),
    enabled: !!from && !!to,
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para crear un tipo de cambio
 */
export const useCreateExchangeRate = (options?: MutationOptions<ExchangeRate>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateExchangeRateDto) => configService.createExchangeRate(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: configKeys.exchangeRates() });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
};

/**
 * Hook para actualizar un tipo de cambio
 */
export const useUpdateExchangeRate = (options?: MutationOptions<ExchangeRate>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateExchangeRateDto }) =>
      configService.updateExchangeRate(id, dto),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: configKeys.exchangeRates() });
      queryClient.invalidateQueries({ queryKey: configKeys.exchangeRateDetail(id) });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
};

// ================================
// PAYMENT METHOD HOOKS
// ================================

/**
 * Hook para obtener todos los métodos de pago
 */
export const usePaymentMethods = () => {
  return useQuery({
    queryKey: configKeys.paymentMethods(),
    queryFn: () => configService.getPaymentMethods(),
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para obtener métodos de pago activos
 */
export const useActivePaymentMethods = () => {
  return useQuery({
    queryKey: configKeys.paymentMethodsActive(),
    queryFn: () => configService.getActivePaymentMethods(),
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para obtener método de pago por ID
 */
export const usePaymentMethod = (id: string) => {
  return useQuery({
    queryKey: configKeys.paymentMethodDetail(id),
    queryFn: () => configService.getPaymentMethodById(id),
    enabled: !!id,
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para crear un método de pago
 */
export const useCreatePaymentMethod = (options?: MutationOptions<PaymentMethod>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreatePaymentMethodDto) => configService.createPaymentMethod(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: configKeys.paymentMethods() });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
};

/**
 * Hook para actualizar un método de pago
 */
export const useUpdatePaymentMethod = (options?: MutationOptions<PaymentMethod>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePaymentMethodDto }) =>
      configService.updatePaymentMethod(id, dto),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: configKeys.paymentMethods() });
      queryClient.invalidateQueries({ queryKey: configKeys.paymentMethodDetail(id) });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
};

// ================================
// TAX RULE HOOKS
// ================================

/**
 * Hook para obtener todas las reglas fiscales
 */
export const useTaxRules = () => {
  return useQuery({
    queryKey: configKeys.taxRules(),
    queryFn: () => configService.getTaxRules(),
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para obtener reglas fiscales activas
 */
export const useActiveTaxRules = () => {
  return useQuery({
    queryKey: configKeys.taxRulesActive(),
    queryFn: () => configService.getActiveTaxRules(),
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para obtener regla fiscal por ID
 */
export const useTaxRule = (id: string) => {
  return useQuery({
    queryKey: configKeys.taxRuleDetail(id),
    queryFn: () => configService.getTaxRuleById(id),
    enabled: !!id,
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para crear una regla fiscal
 */
export const useCreateTaxRule = (options?: MutationOptions<TaxRule>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateTaxRuleDto) => configService.createTaxRule(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: configKeys.taxRules() });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
};

/**
 * Hook para actualizar una regla fiscal
 */
export const useUpdateTaxRule = (options?: MutationOptions<TaxRule>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateTaxRuleDto }) =>
      configService.updateTaxRule(id, dto),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: configKeys.taxRules() });
      queryClient.invalidateQueries({ queryKey: configKeys.taxRuleDetail(id) });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
};

// ================================
// SAT CFDI USE HOOKS (read-only)
// ================================

/**
 * Hook para obtener todos los usos de CFDI del SAT
 */
export const useSatCfdiUses = () => {
  return useQuery({
    queryKey: configKeys.satCfdiUses(),
    queryFn: () => configService.getSatCfdiUses(),
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para obtener usos de CFDI activos del SAT
 */
export const useActiveSatCfdiUses = () => {
  return useQuery({
    queryKey: configKeys.satCfdiUsesActive(),
    queryFn: () => configService.getActiveSatCfdiUses(),
    staleTime: CATALOG_STALE_TIME,
  });
};

// ================================
// SAT TAX REGIME HOOKS (read-only)
// ================================

/**
 * Hook para obtener todos los regímenes fiscales del SAT
 */
export const useSatTaxRegimes = () => {
  return useQuery({
    queryKey: configKeys.satTaxRegimes(),
    queryFn: () => configService.getSatTaxRegimes(),
    staleTime: CATALOG_STALE_TIME,
  });
};

/**
 * Hook para obtener regímenes fiscales activos del SAT
 */
export const useActiveSatTaxRegimes = () => {
  return useQuery({
    queryKey: configKeys.satTaxRegimesActive(),
    queryFn: () => configService.getActiveSatTaxRegimes(),
    staleTime: CATALOG_STALE_TIME,
  });
};

// ================================
// SHIPPING SETTINGS HOOKS
// ================================

/** Costos de envío configurables (admin), por país (default MX). */
export const useShippingSettings = (country?: string) => {
  return useQuery({
    queryKey: configKeys.shippingSettings(country),
    queryFn: () => configService.getShippingSettings(country),
    staleTime: CATALOG_STALE_TIME,
  });
};

/** Actualiza los costos de envío de un país (default MX). */
export const useUpdateShippingSettings = (
  country?: string,
  options?: MutationOptions<ShippingSettings>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: Partial<ShippingSettings>) =>
      configService.updateShippingSettings(dto, country),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: configKeys.shippingSettings(country),
      });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
};

// ================================
// PLATFORM SETTINGS HOOKS
// ================================

/** Ajustes generales de la plataforma (admin → Configuración). */
export const usePlatformSettings = () => {
  return useQuery({
    queryKey: configKeys.platformSettings(),
    queryFn: () => configService.getPlatformSettings(),
    staleTime: CATALOG_STALE_TIME,
  });
};

/** Guarda (merge) los ajustes generales de la plataforma. */
export const useUpdatePlatformSettings = (
  options?: MutationOptions<Record<string, unknown>>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      configService.updatePlatformSettings(patch),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: configKeys.platformSettings() });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
};

// ================================
// UTILITY HOOKS
// ================================

/**
 * Hook para invalidar cache y refrescar datos de catálogos
 */
export const useRefreshConfig = () => {
  const queryClient = useQueryClient();

  return {
    refreshAll: () => {
      queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
    refreshCountries: () => {
      queryClient.invalidateQueries({ queryKey: configKeys.countries() });
    },
    refreshCurrencies: () => {
      queryClient.invalidateQueries({ queryKey: configKeys.currencies() });
    },
    refreshPriceTypes: () => {
      queryClient.invalidateQueries({ queryKey: configKeys.priceTypes() });
    },
    refreshExchangeRates: () => {
      queryClient.invalidateQueries({ queryKey: configKeys.exchangeRates() });
    },
    refreshPaymentMethods: () => {
      queryClient.invalidateQueries({ queryKey: configKeys.paymentMethods() });
    },
    refreshTaxRules: () => {
      queryClient.invalidateQueries({ queryKey: configKeys.taxRules() });
    },
  };
};
