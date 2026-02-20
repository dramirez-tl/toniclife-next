// config.ts - Tipos para catálogos del sistema
// Ref: toniclife-api/src/modules/config/

// ================================
// ENUMS
// ================================

export enum SymbolPosition {
  BEFORE = 'before',
  AFTER = 'after',
}

// ================================
// CATALOG TYPE
// ================================

export type CatalogType =
  | 'countries'
  | 'currencies'
  | 'price-types'
  | 'exchange-rates'
  | 'payment-methods'
  | 'tax-rules'
  | 'sat-cfdi-uses'
  | 'sat-tax-regimes';

// ================================
// COUNTRY
// ================================

export interface Country {
  id: string;
  name: string;
  code: string;
  codeAlpha3: string;
  numericCode?: string;
  nameEn?: string;
  phoneCode?: string;
  currencyCode?: string;
  isActive: boolean;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCountryDto {
  name: string;
  code: string;
  codeAlpha3: string;
  numericCode?: string;
  nameEn?: string;
  phoneCode?: string;
  currencyCode?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateCountryDto extends Partial<CreateCountryDto> {}

// ================================
// CURRENCY
// ================================

export interface Currency {
  id: string;
  name: string;
  code: string;
  symbol: string;
  nameEn?: string;
  symbolPosition: SymbolPosition | 'before' | 'after';
  decimalPlaces: number;
  decimalSeparator: string;
  thousandsSeparator: string;
  isActive: boolean;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCurrencyDto {
  name: string;
  code: string;
  symbol: string;
  nameEn?: string;
  symbolPosition?: SymbolPosition | 'before' | 'after';
  decimalPlaces?: number;
  decimalSeparator?: string;
  thousandsSeparator?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateCurrencyDto extends Partial<CreateCurrencyDto> {}

// ================================
// PRICE TYPE
// ================================

export interface PriceType {
  id: string;
  name: string;
  code: string;
  description?: string;
  discountPercentage: number;
  appliesTo: string[];
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePriceTypeDto {
  name: string;
  code: string;
  description?: string;
  discountPercentage: number;
  appliesTo: string[];
  priority?: number;
  isActive?: boolean;
}

export interface UpdatePriceTypeDto extends Partial<CreatePriceTypeDto> {}

// ================================
// EXCHANGE RATE
// ================================

export interface ExchangeRate {
  id: string;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rate: number;
  inverseRate?: number;
  source?: string;
  effectiveDate: string;
  expirationDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateExchangeRateDto {
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rate: number;
  inverseRate?: number;
  source?: string;
  effectiveDate: string;
  expirationDate?: string;
  isActive?: boolean;
}

export interface UpdateExchangeRateDto extends Partial<CreateExchangeRateDto> {}

// ================================
// PAYMENT METHOD
// ================================

export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  description?: string;
  paymentType: string;
  processor?: string;
  processorConfig?: Record<string, unknown>;
  requiresReference: boolean;
  referenceLabel?: string;
  requiresAuthorization: boolean;
  commissionPercentage?: number;
  commissionFixed?: number;
  minAmount?: number;
  maxAmount?: number;
  availableForEcommerce: boolean;
  availableForPos: boolean;
  satPaymentMethodCode?: string;
  satPaymentFormCode?: string;
  iconUrl?: string;
  displayOrder?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentMethodDto {
  code: string;
  name: string;
  description?: string;
  paymentType: string;
  processor?: string;
  processorConfig?: Record<string, unknown>;
  requiresReference?: boolean;
  referenceLabel?: string;
  requiresAuthorization?: boolean;
  commissionPercentage?: number;
  commissionFixed?: number;
  minAmount?: number;
  maxAmount?: number;
  availableForEcommerce?: boolean;
  availableForPos?: boolean;
  satPaymentMethodCode?: string;
  satPaymentFormCode?: string;
  iconUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdatePaymentMethodDto extends Partial<CreatePaymentMethodDto> {}

// ================================
// TAX RULE
// ================================

export interface TaxRule {
  id: string;
  code: string;
  name: string;
  description?: string;
  taxType: string;
  rate: number;
  isPercentage: boolean;
  isIncludedInPrice: boolean;
  satTaxCode?: string;
  satFactorType?: string;
  appliesToProducts: boolean;
  appliesToShipping?: boolean;
  appliesToServices?: boolean;
  countryCode?: string;
  stateCodes?: string[];
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxRuleDto {
  code: string;
  name: string;
  description?: string;
  taxType: string;
  rate: number;
  isPercentage?: boolean;
  isIncludedInPrice?: boolean;
  satTaxCode?: string;
  satFactorType?: string;
  appliesToProducts?: boolean;
  appliesToShipping?: boolean;
  appliesToServices?: boolean;
  countryCode?: string;
  stateCodes?: string[];
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
}

export interface UpdateTaxRuleDto extends Partial<CreateTaxRuleDto> {}

// ================================
// SAT CFDI USE (read-only catalog)
// ================================

export interface SatCfdiUse {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

// ================================
// SAT TAX REGIME (read-only catalog)
// ================================

export interface SatTaxRegime {
  id: string;
  code: string;
  name: string;
  appliesTo?: string;
  isActive: boolean;
}
