// config.service.ts - API client para catálogos del sistema

import api from '@/lib/axios';
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

class ConfigService {
  // ================================
  // COUNTRIES
  // ================================

  /**
   * Get active countries (public)
   */
  async getActiveCountries(): Promise<Country[]> {
    const response = await api.get<Country[]>('/config/countries/active');
    return response.data;
  }

  /**
   * Get all countries (admin)
   */
  async getCountries(): Promise<Country[]> {
    const response = await api.get<Country[]>('/config/countries');
    return response.data;
  }

  /**
   * Get country by ID (admin)
   */
  async getCountryById(id: string): Promise<Country> {
    const response = await api.get<Country>(`/config/countries/${id}`);
    return response.data;
  }

  /**
   * Create a new country (admin)
   */
  async createCountry(dto: CreateCountryDto): Promise<Country> {
    const response = await api.post<Country>('/config/countries', dto);
    return response.data;
  }

  /**
   * Update a country (admin)
   */
  async updateCountry(id: string, dto: UpdateCountryDto): Promise<Country> {
    const response = await api.patch<Country>(`/config/countries/${id}`, dto);
    return response.data;
  }

  // ================================
  // CURRENCIES
  // ================================

  /**
   * Get active currencies (public)
   */
  async getActiveCurrencies(): Promise<Currency[]> {
    const response = await api.get<Currency[]>('/config/currencies/active');
    return response.data;
  }

  /**
   * Get all currencies (admin)
   */
  async getCurrencies(): Promise<Currency[]> {
    const response = await api.get<Currency[]>('/config/currencies');
    return response.data;
  }

  /**
   * Get currency by ID (admin)
   */
  async getCurrencyById(id: string): Promise<Currency> {
    const response = await api.get<Currency>(`/config/currencies/${id}`);
    return response.data;
  }

  /**
   * Create a new currency (admin)
   */
  async createCurrency(dto: CreateCurrencyDto): Promise<Currency> {
    const response = await api.post<Currency>('/config/currencies', dto);
    return response.data;
  }

  /**
   * Update a currency (admin)
   */
  async updateCurrency(id: string, dto: UpdateCurrencyDto): Promise<Currency> {
    const response = await api.patch<Currency>(`/config/currencies/${id}`, dto);
    return response.data;
  }

  // ================================
  // PRICE TYPES
  // ================================

  /**
   * Get active price types (public)
   */
  async getActivePriceTypes(): Promise<PriceType[]> {
    const response = await api.get<PriceType[]>('/config/price-types/active');
    return response.data;
  }

  /**
   * Get price type by code (public)
   */
  async getPriceTypeByCode(code: string): Promise<PriceType> {
    const response = await api.get<PriceType>(`/config/price-types/code/${code}`);
    return response.data;
  }

  /**
   * Get all price types (admin)
   */
  async getPriceTypes(): Promise<PriceType[]> {
    const response = await api.get<PriceType[]>('/config/price-types');
    return response.data;
  }

  /**
   * Get price type by ID (admin)
   */
  async getPriceTypeById(id: string): Promise<PriceType> {
    const response = await api.get<PriceType>(`/config/price-types/${id}`);
    return response.data;
  }

  /**
   * Create a new price type (admin)
   */
  async createPriceType(dto: CreatePriceTypeDto): Promise<PriceType> {
    const response = await api.post<PriceType>('/config/price-types', dto);
    return response.data;
  }

  /**
   * Update a price type (admin)
   */
  async updatePriceType(id: string, dto: UpdatePriceTypeDto): Promise<PriceType> {
    const response = await api.patch<PriceType>(`/config/price-types/${id}`, dto);
    return response.data;
  }

  // ================================
  // EXCHANGE RATES
  // ================================

  /**
   * Get active exchange rates (public)
   */
  async getActiveExchangeRates(): Promise<ExchangeRate[]> {
    const response = await api.get<ExchangeRate[]>('/config/exchange-rates/active');
    return response.data;
  }

  /**
   * Get current exchange rate between two currencies (public)
   */
  async getCurrentRate(from: string, to: string): Promise<ExchangeRate> {
    const response = await api.get<ExchangeRate>('/config/exchange-rates/rate', {
      params: { from, to },
    });
    return response.data;
  }

  /**
   * Get all exchange rates (admin)
   */
  async getExchangeRates(): Promise<ExchangeRate[]> {
    const response = await api.get<ExchangeRate[]>('/config/exchange-rates');
    return response.data;
  }

  /**
   * Get exchange rate by ID (admin)
   */
  async getExchangeRateById(id: string): Promise<ExchangeRate> {
    const response = await api.get<ExchangeRate>(`/config/exchange-rates/${id}`);
    return response.data;
  }

  /**
   * Create a new exchange rate (admin)
   */
  async createExchangeRate(dto: CreateExchangeRateDto): Promise<ExchangeRate> {
    const response = await api.post<ExchangeRate>('/config/exchange-rates', dto);
    return response.data;
  }

  /**
   * Update an exchange rate (admin)
   */
  async updateExchangeRate(id: string, dto: UpdateExchangeRateDto): Promise<ExchangeRate> {
    const response = await api.patch<ExchangeRate>(`/config/exchange-rates/${id}`, dto);
    return response.data;
  }

  // ================================
  // PAYMENT METHODS
  // ================================

  /**
   * Get active payment methods (public)
   */
  async getActivePaymentMethods(): Promise<PaymentMethod[]> {
    const response = await api.get<PaymentMethod[]>('/config/payment-methods/active');
    return response.data;
  }

  /**
   * Get all payment methods (admin)
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await api.get<PaymentMethod[]>('/config/payment-methods');
    return response.data;
  }

  /**
   * Get payment method by ID (admin)
   */
  async getPaymentMethodById(id: string): Promise<PaymentMethod> {
    const response = await api.get<PaymentMethod>(`/config/payment-methods/${id}`);
    return response.data;
  }

  /**
   * Create a new payment method (admin)
   */
  async createPaymentMethod(dto: CreatePaymentMethodDto): Promise<PaymentMethod> {
    const response = await api.post<PaymentMethod>('/config/payment-methods', dto);
    return response.data;
  }

  /**
   * Update a payment method (admin)
   */
  async updatePaymentMethod(id: string, dto: UpdatePaymentMethodDto): Promise<PaymentMethod> {
    const response = await api.patch<PaymentMethod>(`/config/payment-methods/${id}`, dto);
    return response.data;
  }

  // ================================
  // TAX RULES
  // ================================

  /**
   * Get active tax rules (public)
   */
  async getActiveTaxRules(): Promise<TaxRule[]> {
    const response = await api.get<TaxRule[]>('/config/tax-rules/active');
    return response.data;
  }

  /**
   * Get all tax rules (admin)
   */
  async getTaxRules(params?: { countryCode?: string; taxType?: string; isActive?: boolean }): Promise<TaxRule[]> {
    const response = await api.get<TaxRule[]>('/config/tax-rules', { params });
    return response.data;
  }

  /**
   * Get tax rule by ID (admin)
   */
  async getTaxRuleById(id: string): Promise<TaxRule> {
    const response = await api.get<TaxRule>(`/config/tax-rules/${id}`);
    return response.data;
  }

  /**
   * Create a new tax rule (admin)
   */
  async createTaxRule(dto: CreateTaxRuleDto): Promise<TaxRule> {
    const response = await api.post<TaxRule>('/config/tax-rules', dto);
    return response.data;
  }

  /**
   * Update a tax rule (admin)
   */
  async updateTaxRule(id: string, dto: UpdateTaxRuleDto): Promise<TaxRule> {
    const response = await api.patch<TaxRule>(`/config/tax-rules/${id}`, dto);
    return response.data;
  }

  async deleteTaxRule(id: string): Promise<void> {
    await api.delete(`/config/tax-rules/${id}`);
  }

  // ================================
  // SAT CFDI USES
  // ================================

  /**
   * Get active SAT CFDI uses (public)
   */
  async getActiveSatCfdiUses(): Promise<SatCfdiUse[]> {
    const response = await api.get<SatCfdiUse[]>('/config/sat-cfdi-uses/active');
    return response.data;
  }

  /**
   * Get all SAT CFDI uses (admin)
   */
  async getSatCfdiUses(): Promise<SatCfdiUse[]> {
    const response = await api.get<SatCfdiUse[]>('/config/sat-cfdi-uses');
    return response.data;
  }

  // ================================
  // SAT TAX REGIMES
  // ================================

  /**
   * Get active SAT tax regimes (public)
   */
  async getActiveSatTaxRegimes(): Promise<SatTaxRegime[]> {
    const response = await api.get<SatTaxRegime[]>('/config/sat-tax-regimes/active');
    return response.data;
  }

  /**
   * Get all SAT tax regimes (admin)
   */
  async getSatTaxRegimes(): Promise<SatTaxRegime[]> {
    const response = await api.get<SatTaxRegime[]>('/config/sat-tax-regimes');
    return response.data;
  }

  // ================================
  // SHIPPING SETTINGS (system_settings)
  // ================================

  /** Costos de envío configurables (admin), por país (default MX). */
  async getShippingSettings(country?: string): Promise<ShippingSettings> {
    const response = await api.get<ShippingSettings>('/config/shipping-settings', {
      params: country ? { country } : undefined,
    });
    return response.data;
  }

  /** Actualiza los costos de envío (solo las claves enviadas), por país. */
  async updateShippingSettings(
    dto: Partial<ShippingSettings>,
    country?: string,
  ): Promise<ShippingSettings> {
    const response = await api.patch<ShippingSettings>(
      '/config/shipping-settings',
      dto,
      { params: country ? { country } : undefined },
    );
    return response.data;
  }

  // ================================
  // PLATFORM SETTINGS (system_settings category='platform')
  // ================================

  /** Ajustes generales de la plataforma (general/negocio/notif/pagos/seguridad). */
  async getPlatformSettings(): Promise<Record<string, unknown>> {
    const response = await api.get<Record<string, unknown>>(
      '/config/platform-settings',
    );
    return response.data;
  }

  // ================================
  // POS OPERATIONS (interruptor global de liberación de terminales)
  // ================================

  /** Estado global de operación del POS (liberado / bloqueado). Super admin. */
  async getPosOperations(): Promise<PosOperationsState> {
    const response = await api.get<PosOperationsState>('/config/pos-operations');
    return response.data;
  }

  /** Libera (enabled=true) o bloquea (false) TODAS las terminales POS. */
  async setPosOperations(
    enabled: boolean,
    message?: string,
  ): Promise<PosOperationsState> {
    const body: { enabled: boolean; message?: string } = { enabled };
    if (message !== undefined) body.message = message;
    const response = await api.patch<PosOperationsState>(
      '/config/pos-operations',
      body,
    );
    return response.data;
  }

  /** Merge + guarda los ajustes de plataforma. */
  async updatePlatformSettings(
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await api.patch<Record<string, unknown>>(
      '/config/platform-settings',
      patch,
    );
    return response.data;
  }
}

/** Costos de envío editables desde el admin. */
export interface ShippingSettings {
  standardCost: number;
  expressCost: number;
  freeThreshold: number;
  kitCost: number;
}

/** Estado global de operación del POS (interruptor de liberación de terminales). */
export interface PosOperationsState {
  enabled: boolean;
  message: string | null;
}

export const configService = new ConfigService();
export default configService;
