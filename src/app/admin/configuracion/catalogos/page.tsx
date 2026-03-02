'use client';

import { useState, useMemo, useCallback, Suspense } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { CatalogTable, CatalogFormModal, type Column } from '@/components/admin/catalogs';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import {
  useCountries,
  useCreateCountry,
  useUpdateCountry,
  useCurrencies,
  useCreateCurrency,
  useUpdateCurrency,
  usePriceTypes,
  useCreatePriceType,
  useUpdatePriceType,
  useExchangeRates,
  useCreateExchangeRate,
  useUpdateExchangeRate,
  usePaymentMethods,
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  useTaxRules,
  useCreateTaxRule,
  useUpdateTaxRule,
  useSatCfdiUses,
  useSatTaxRegimes,
} from '@/hooks/useConfig';
import type {
  Country,
  CreateCountryDto,
  Currency,
  CreateCurrencyDto,
  PriceType,
  CreatePriceTypeDto,
  ExchangeRate,
  CreateExchangeRateDto,
  PaymentMethod,
  CreatePaymentMethodDto,
  TaxRule,
  CreateTaxRuleDto,
  SatCfdiUse,
  SatTaxRegime,
} from '@/types/config';

// ================================
// TABS DEFINITION
// ================================

type TabKey =
  | 'countries'
  | 'currencies'
  | 'priceTypes'
  | 'exchangeRates'
  | 'paymentMethods'
  | 'taxRules'
  | 'satCfdiUses'
  | 'satTaxRegimes';

interface Tab {
  key: TabKey;
  label: string;
}

const TABS: Tab[] = [
  { key: 'countries', label: 'Paises' },
  { key: 'currencies', label: 'Monedas' },
  { key: 'priceTypes', label: 'Tipos de Precio' },
  { key: 'exchangeRates', label: 'Tipos de Cambio' },
  { key: 'paymentMethods', label: 'Metodos de Pago' },
  { key: 'taxRules', label: 'Reglas Fiscales' },
  { key: 'satCfdiUses', label: 'Usos CFDI' },
  { key: 'satTaxRegimes', label: 'Regimenes Fiscales' },
];

const READ_ONLY_TABS: TabKey[] = ['satCfdiUses', 'satTaxRegimes'];

// ================================
// HELPER: Status Badge
// ================================

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? 'success' : 'error'} size="sm">
      {active ? 'Activo' : 'Inactivo'}
    </Badge>
  );
}

function BoolIcon({ value }: { value: boolean }) {
  return value ? (
    <svg className="h-5 w-5 text-[#3E667D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ================================
// HELPER: Form field components
// ================================

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function FormInput({
  label,
  required,
  value,
  onChange,
  type = 'text',
  placeholder,
  maxLength,
}: {
  label: string;
  required?: boolean;
  value: string | number;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <FormField label={label} required={required}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
      />
    </FormField>
  );
}

function FormSelect({
  label,
  required,
  value,
  onChange,
  options,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <FormField label={label} required={required}>
      <SearchableSelect
        options={options}
        value={value}
        onChange={onChange}
        allLabel="Seleccionar..."
        className="w-full"
      />
    </FormField>
  );
}

function FormCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 text-[#3E667D] border-gray-300 rounded focus:ring-[#a7c1e2]"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

// ================================
// HELPER: client-side filter
// ================================

function filterBySearch<T>(
  items: T[],
  term: string,
  keys: (keyof T)[]
): T[] {
  if (!term.trim()) return items;
  const lower = term.toLowerCase();
  return items.filter((item) =>
    keys.some((k) => {
      const val = item[k];
      return typeof val === 'string' && val.toLowerCase().includes(lower);
    })
  );
}

// ================================
// COLUMN DEFINITIONS
// ================================

const countryColumns: Column<Country>[] = [
  { key: 'code', header: 'Codigo' },
  { key: 'name', header: 'Nombre' },
  { key: 'nameEn', header: 'Nombre (EN)', render: (r) => r.nameEn || '-' },
  { key: 'phoneCode', header: 'Tel. Codigo', render: (r) => r.phoneCode || '-' },
  {
    key: 'isActive',
    header: 'Estado',
    render: (r) => <StatusBadge active={r.isActive} />,
  },
];

const currencyColumns: Column<Currency>[] = [
  { key: 'code', header: 'Codigo' },
  { key: 'name', header: 'Nombre' },
  { key: 'symbol', header: 'Simbolo' },
  { key: 'decimalPlaces', header: 'Decimales' },
  {
    key: 'isActive',
    header: 'Estado',
    render: (r) => <StatusBadge active={r.isActive} />,
  },
];

const priceTypeColumns: Column<PriceType>[] = [
  { key: 'code', header: 'Codigo' },
  { key: 'name', header: 'Nombre' },
  {
    key: 'discountPercentage',
    header: 'Descuento',
    render: (r) => `${r.discountPercentage}%`,
  },
  {
    key: 'appliesTo',
    header: 'Aplica a',
    render: (r) => (
      <div className="flex flex-wrap gap-1">
        {r.appliesTo.map((a) => (
          <Badge key={a} variant="info" size="sm">
            {a}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    key: 'isActive',
    header: 'Estado',
    render: (r) => <StatusBadge active={r.isActive} />,
  },
];

const exchangeRateColumns: Column<ExchangeRate>[] = [
  {
    key: 'pair',
    header: 'Par',
    render: (r) => (
      <span className="font-medium">
        {r.fromCurrencyCode} <span className="text-gray-400 mx-1">&rarr;</span> {r.toCurrencyCode}
      </span>
    ),
  },
  {
    key: 'rate',
    header: 'Tasa',
    render: (r) => r.rate.toFixed(4),
  },
  { key: 'source', header: 'Fuente', render: (r) => r.source || '-' },
  {
    key: 'effectiveDate',
    header: 'Vigencia',
    render: (r) => new Date(r.effectiveDate).toLocaleDateString('es-MX'),
  },
  {
    key: 'isActive',
    header: 'Estado',
    render: (r) => <StatusBadge active={r.isActive} />,
  },
];

const paymentMethodColumns: Column<PaymentMethod>[] = [
  { key: 'code', header: 'Codigo' },
  { key: 'name', header: 'Nombre' },
  { key: 'paymentType', header: 'Tipo' },
  {
    key: 'availableForEcommerce',
    header: 'E-comm',
    render: (r) => <BoolIcon value={r.availableForEcommerce} />,
    className: 'text-center',
  },
  {
    key: 'availableForPos',
    header: 'POS',
    render: (r) => <BoolIcon value={r.availableForPos} />,
    className: 'text-center',
  },
  {
    key: 'isActive',
    header: 'Estado',
    render: (r) => <StatusBadge active={r.isActive} />,
  },
];

const taxRuleColumns: Column<TaxRule>[] = [
  { key: 'code', header: 'Codigo' },
  { key: 'name', header: 'Nombre' },
  { key: 'taxType', header: 'Tipo' },
  {
    key: 'rate',
    header: 'Tasa',
    render: (r) => `${r.rate}%`,
  },
  {
    key: 'isActive',
    header: 'Estado',
    render: (r) => <StatusBadge active={r.isActive} />,
  },
];

const satCfdiUseColumns: Column<SatCfdiUse>[] = [
  { key: 'code', header: 'Codigo' },
  { key: 'name', header: 'Nombre' },
  {
    key: 'isActive',
    header: 'Estado',
    render: (r) => <StatusBadge active={r.isActive} />,
  },
];

const satTaxRegimeColumns: Column<SatTaxRegime>[] = [
  { key: 'code', header: 'Codigo' },
  { key: 'name', header: 'Nombre' },
  { key: 'appliesTo', header: 'Aplica a', render: (r) => r.appliesTo || '-' },
  {
    key: 'isActive',
    header: 'Estado',
    render: (r) => <StatusBadge active={r.isActive} />,
  },
];

// ================================
// INITIAL FORM DATA FACTORIES
// ================================

const emptyCountryForm = (): Record<string, string | number> => ({
  name: '',
  code: '',
  codeAlpha3: '',
  nameEn: '',
  phoneCode: '',
  currencyCode: '',
  displayOrder: 0,
});

const emptyCurrencyForm = (): Record<string, string | number> => ({
  name: '',
  code: '',
  symbol: '',
  nameEn: '',
  symbolPosition: 'before',
  decimalPlaces: 2,
  decimalSeparator: '.',
  thousandsSeparator: ',',
  displayOrder: 0,
});

const emptyPriceTypeForm = (): Record<string, string | number> => ({
  name: '',
  code: '',
  description: '',
  discountPercentage: 0,
  appliesTo: '',
  priority: 0,
});

const emptyExchangeRateForm = (): Record<string, string | number> => ({
  fromCurrencyCode: '',
  toCurrencyCode: '',
  rate: 0,
  inverseRate: 0,
  source: '',
  effectiveDate: '',
  expirationDate: '',
});

const emptyPaymentMethodForm = (): Record<string, string | number | boolean> => ({
  code: '',
  name: '',
  paymentType: '',
  description: '',
  commissionPercentage: 0,
  availableForEcommerce: false,
  availableForPos: false,
  satPaymentMethodCode: '',
  displayOrder: 0,
});

const emptyTaxRuleForm = (): Record<string, string | number | boolean> => ({
  code: '',
  name: '',
  taxType: '',
  rate: 0,
  isPercentage: true,
  isIncludedInPrice: false,
  satTaxCode: '',
  countryCode: '',
  effectiveFrom: '',
  effectiveTo: '',
});

// ================================
// MAIN COMPONENT
// ================================

export default function CatalogosPage() {
  return (
    <Suspense>
      <CatalogosContent />
    </Suspense>
  );
}

function CatalogosContent() {
  // -- Tab state (from URL)
  const { get, setParams } = useQueryFilters({
    tab: 'countries',
  });

  const activeTab = get('tab') as TabKey;
  const [searchTerm, setSearchTerm] = useState('');

  // -- Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<Record<string, any>>({});

  // ================================
  // DATA HOOKS
  // ================================

  const { data: countries = [], isLoading: loadingCountries } = useCountries();
  const { data: currencies = [], isLoading: loadingCurrencies } = useCurrencies();
  const { data: priceTypes = [], isLoading: loadingPriceTypes } = usePriceTypes();
  const { data: exchangeRates = [], isLoading: loadingExchangeRates } = useExchangeRates();
  const { data: paymentMethods = [], isLoading: loadingPaymentMethods } = usePaymentMethods();
  const { data: taxRules = [], isLoading: loadingTaxRules } = useTaxRules();
  const { data: satCfdiUses = [], isLoading: loadingSatCfdiUses } = useSatCfdiUses();
  const { data: satTaxRegimes = [], isLoading: loadingSatTaxRegimes } = useSatTaxRegimes();

  // ================================
  // MUTATION HOOKS
  // ================================

  const createCountry = useCreateCountry({
    onSuccess: () => {
      toast.success('Registro creado');
      closeModal();
    },
    onError: () => toast.error('Error al crear'),
  });
  const updateCountry = useUpdateCountry({
    onSuccess: () => {
      toast.success('Registro actualizado');
      closeModal();
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const createCurrency = useCreateCurrency({
    onSuccess: () => {
      toast.success('Registro creado');
      closeModal();
    },
    onError: () => toast.error('Error al crear'),
  });
  const updateCurrency = useUpdateCurrency({
    onSuccess: () => {
      toast.success('Registro actualizado');
      closeModal();
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const createPriceType = useCreatePriceType({
    onSuccess: () => {
      toast.success('Registro creado');
      closeModal();
    },
    onError: () => toast.error('Error al crear'),
  });
  const updatePriceType = useUpdatePriceType({
    onSuccess: () => {
      toast.success('Registro actualizado');
      closeModal();
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const createExchangeRate = useCreateExchangeRate({
    onSuccess: () => {
      toast.success('Registro creado');
      closeModal();
    },
    onError: () => toast.error('Error al crear'),
  });
  const updateExchangeRate = useUpdateExchangeRate({
    onSuccess: () => {
      toast.success('Registro actualizado');
      closeModal();
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const createPaymentMethod = useCreatePaymentMethod({
    onSuccess: () => {
      toast.success('Registro creado');
      closeModal();
    },
    onError: () => toast.error('Error al crear'),
  });
  const updatePaymentMethod = useUpdatePaymentMethod({
    onSuccess: () => {
      toast.success('Registro actualizado');
      closeModal();
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const createTaxRule = useCreateTaxRule({
    onSuccess: () => {
      toast.success('Registro creado');
      closeModal();
    },
    onError: () => toast.error('Error al crear'),
  });
  const updateTaxRule = useUpdateTaxRule({
    onSuccess: () => {
      toast.success('Registro actualizado');
      closeModal();
    },
    onError: () => toast.error('Error al actualizar'),
  });

  // ================================
  // MODAL HELPERS
  // ================================

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({});
  }, []);

  const openCreate = useCallback(() => {
    setEditingItem(null);
    switch (activeTab) {
      case 'countries':
        setFormData(emptyCountryForm());
        break;
      case 'currencies':
        setFormData(emptyCurrencyForm());
        break;
      case 'priceTypes':
        setFormData(emptyPriceTypeForm());
        break;
      case 'exchangeRates':
        setFormData(emptyExchangeRateForm());
        break;
      case 'paymentMethods':
        setFormData(emptyPaymentMethodForm());
        break;
      case 'taxRules':
        setFormData(emptyTaxRuleForm());
        break;
      default:
        break;
    }
    setIsModalOpen(true);
  }, [activeTab]);

  const openEdit = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (item: any) => {
      setEditingItem(item);
      switch (activeTab) {
        case 'countries': {
          const c = item as Country;
          setFormData({
            name: c.name,
            code: c.code,
            codeAlpha3: c.codeAlpha3,
            nameEn: c.nameEn || '',
            phoneCode: c.phoneCode || '',
            currencyCode: c.currencyCode || '',
            displayOrder: c.displayOrder || 0,
          });
          break;
        }
        case 'currencies': {
          const c = item as Currency;
          setFormData({
            name: c.name,
            code: c.code,
            symbol: c.symbol,
            nameEn: c.nameEn || '',
            symbolPosition: c.symbolPosition || 'before',
            decimalPlaces: c.decimalPlaces,
            decimalSeparator: c.decimalSeparator,
            thousandsSeparator: c.thousandsSeparator,
            displayOrder: c.displayOrder || 0,
          });
          break;
        }
        case 'priceTypes': {
          const p = item as PriceType;
          setFormData({
            name: p.name,
            code: p.code,
            description: p.description || '',
            discountPercentage: p.discountPercentage,
            appliesTo: p.appliesTo.join(', '),
            priority: p.priority,
          });
          break;
        }
        case 'exchangeRates': {
          const e = item as ExchangeRate;
          setFormData({
            fromCurrencyCode: e.fromCurrencyCode,
            toCurrencyCode: e.toCurrencyCode,
            rate: e.rate,
            inverseRate: e.inverseRate || 0,
            source: e.source || '',
            effectiveDate: e.effectiveDate ? e.effectiveDate.substring(0, 10) : '',
            expirationDate: e.expirationDate ? e.expirationDate.substring(0, 10) : '',
          });
          break;
        }
        case 'paymentMethods': {
          const pm = item as PaymentMethod;
          setFormData({
            code: pm.code,
            name: pm.name,
            paymentType: pm.paymentType,
            description: pm.description || '',
            commissionPercentage: pm.commissionPercentage || 0,
            availableForEcommerce: pm.availableForEcommerce,
            availableForPos: pm.availableForPos,
            satPaymentMethodCode: pm.satPaymentMethodCode || '',
            displayOrder: pm.displayOrder || 0,
          });
          break;
        }
        case 'taxRules': {
          const t = item as TaxRule;
          setFormData({
            code: t.code,
            name: t.name,
            taxType: t.taxType,
            rate: t.rate,
            isPercentage: t.isPercentage,
            isIncludedInPrice: t.isIncludedInPrice,
            satTaxCode: t.satTaxCode || '',
            countryCode: t.countryCode || '',
            effectiveFrom: t.effectiveFrom ? t.effectiveFrom.substring(0, 10) : '',
            effectiveTo: t.effectiveTo ? t.effectiveTo.substring(0, 10) : '',
          });
          break;
        }
        default:
          break;
      }
      setIsModalOpen(true);
    },
    [activeTab]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateField = useCallback((key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ================================
  // SUBMIT HANDLER
  // ================================

  const handleSubmit = useCallback(() => {
    const isEditing = !!editingItem;
    const itemId = (editingItem as Record<string, unknown>)?.id as string;

    switch (activeTab) {
      case 'countries': {
        const dto: CreateCountryDto = {
          name: formData.name as string,
          code: formData.code as string,
          codeAlpha3: formData.codeAlpha3 as string,
          nameEn: (formData.nameEn as string) || undefined,
          phoneCode: (formData.phoneCode as string) || undefined,
          currencyCode: (formData.currencyCode as string) || undefined,
          displayOrder: Number(formData.displayOrder) || undefined,
        };
        if (isEditing) {
          updateCountry.mutate({ id: itemId, dto });
        } else {
          createCountry.mutate(dto);
        }
        break;
      }
      case 'currencies': {
        const dto: CreateCurrencyDto = {
          name: formData.name as string,
          code: formData.code as string,
          symbol: formData.symbol as string,
          nameEn: (formData.nameEn as string) || undefined,
          symbolPosition: (formData.symbolPosition as 'before' | 'after') || undefined,
          decimalPlaces: Number(formData.decimalPlaces),
          decimalSeparator: (formData.decimalSeparator as string) || undefined,
          thousandsSeparator: (formData.thousandsSeparator as string) || undefined,
          displayOrder: Number(formData.displayOrder) || undefined,
        };
        if (isEditing) {
          updateCurrency.mutate({ id: itemId, dto });
        } else {
          createCurrency.mutate(dto);
        }
        break;
      }
      case 'priceTypes': {
        const appliesToStr = formData.appliesTo as string;
        const dto: CreatePriceTypeDto = {
          name: formData.name as string,
          code: formData.code as string,
          description: (formData.description as string) || undefined,
          discountPercentage: Number(formData.discountPercentage),
          appliesTo: appliesToStr
            ? appliesToStr.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
          priority: Number(formData.priority) || undefined,
        };
        if (isEditing) {
          updatePriceType.mutate({ id: itemId, dto });
        } else {
          createPriceType.mutate(dto);
        }
        break;
      }
      case 'exchangeRates': {
        const dto: CreateExchangeRateDto = {
          fromCurrencyCode: formData.fromCurrencyCode as string,
          toCurrencyCode: formData.toCurrencyCode as string,
          rate: Number(formData.rate),
          inverseRate: Number(formData.inverseRate) || undefined,
          source: (formData.source as string) || undefined,
          effectiveDate: formData.effectiveDate as string,
          expirationDate: (formData.expirationDate as string) || undefined,
        };
        if (isEditing) {
          updateExchangeRate.mutate({ id: itemId, dto });
        } else {
          createExchangeRate.mutate(dto);
        }
        break;
      }
      case 'paymentMethods': {
        const dto: CreatePaymentMethodDto = {
          code: formData.code as string,
          name: formData.name as string,
          paymentType: formData.paymentType as string,
          description: (formData.description as string) || undefined,
          commissionPercentage: Number(formData.commissionPercentage) || undefined,
          availableForEcommerce: formData.availableForEcommerce as boolean,
          availableForPos: formData.availableForPos as boolean,
          satPaymentMethodCode: (formData.satPaymentMethodCode as string) || undefined,
          displayOrder: Number(formData.displayOrder) || undefined,
        };
        if (isEditing) {
          updatePaymentMethod.mutate({ id: itemId, dto });
        } else {
          createPaymentMethod.mutate(dto);
        }
        break;
      }
      case 'taxRules': {
        const dto: CreateTaxRuleDto = {
          code: formData.code as string,
          name: formData.name as string,
          taxType: formData.taxType as string,
          rate: Number(formData.rate),
          isPercentage: formData.isPercentage as boolean,
          isIncludedInPrice: formData.isIncludedInPrice as boolean,
          satTaxCode: (formData.satTaxCode as string) || undefined,
          countryCode: (formData.countryCode as string) || undefined,
          effectiveFrom: (formData.effectiveFrom as string) || undefined,
          effectiveTo: (formData.effectiveTo as string) || undefined,
        };
        if (isEditing) {
          updateTaxRule.mutate({ id: itemId, dto });
        } else {
          createTaxRule.mutate(dto);
        }
        break;
      }
      default:
        break;
    }
  }, [
    activeTab,
    editingItem,
    formData,
    createCountry,
    updateCountry,
    createCurrency,
    updateCurrency,
    createPriceType,
    updatePriceType,
    createExchangeRate,
    updateExchangeRate,
    createPaymentMethod,
    updatePaymentMethod,
    createTaxRule,
    updateTaxRule,
  ]);

  // ================================
  // IS SUBMITTING
  // ================================

  const isSubmitting =
    createCountry.isPending ||
    updateCountry.isPending ||
    createCurrency.isPending ||
    updateCurrency.isPending ||
    createPriceType.isPending ||
    updatePriceType.isPending ||
    createExchangeRate.isPending ||
    updateExchangeRate.isPending ||
    createPaymentMethod.isPending ||
    updatePaymentMethod.isPending ||
    createTaxRule.isPending ||
    updateTaxRule.isPending;

  // ================================
  // FILTERED DATA
  // ================================

  const filteredCountries = useMemo(
    () => filterBySearch(countries, searchTerm, ['name', 'code']),
    [countries, searchTerm]
  );
  const filteredCurrencies = useMemo(
    () => filterBySearch(currencies, searchTerm, ['name', 'code']),
    [currencies, searchTerm]
  );
  const filteredPriceTypes = useMemo(
    () => filterBySearch(priceTypes, searchTerm, ['name', 'code']),
    [priceTypes, searchTerm]
  );
  const filteredExchangeRates = useMemo(
    () =>
      filterBySearch(exchangeRates, searchTerm, [
        'fromCurrencyCode',
        'toCurrencyCode',
      ]),
    [exchangeRates, searchTerm]
  );
  const filteredPaymentMethods = useMemo(
    () => filterBySearch(paymentMethods, searchTerm, ['name', 'code']),
    [paymentMethods, searchTerm]
  );
  const filteredTaxRules = useMemo(
    () => filterBySearch(taxRules, searchTerm, ['name', 'code']),
    [taxRules, searchTerm]
  );
  const filteredSatCfdiUses = useMemo(
    () => filterBySearch(satCfdiUses, searchTerm, ['name', 'code']),
    [satCfdiUses, searchTerm]
  );
  const filteredSatTaxRegimes = useMemo(
    () => filterBySearch(satTaxRegimes, searchTerm, ['name', 'code']),
    [satTaxRegimes, searchTerm]
  );

  // ================================
  // MODAL TITLE
  // ================================

  const modalTitle = useMemo(() => {
    const prefix = editingItem ? 'Editar' : 'Nuevo';
    const labels: Record<TabKey, string> = {
      countries: 'Pais',
      currencies: 'Moneda',
      priceTypes: 'Tipo de Precio',
      exchangeRates: 'Tipo de Cambio',
      paymentMethods: 'Metodo de Pago',
      taxRules: 'Regla Fiscal',
      satCfdiUses: '',
      satTaxRegimes: '',
    };
    return `${prefix} ${labels[activeTab] || ''}`;
  }, [activeTab, editingItem]);

  // ================================
  // FORM FIELDS RENDERER
  // ================================

  const renderFormFields = () => {
    switch (activeTab) {
      case 'countries':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Nombre"
                required
                value={formData.name || ''}
                onChange={(v) => updateField('name', v)}
              />
              <FormInput
                label="Codigo (2 chars)"
                required
                value={formData.code || ''}
                onChange={(v) => updateField('code', v.toUpperCase())}
                maxLength={2}
                placeholder="MX"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Codigo Alpha-3"
                required
                value={formData.codeAlpha3 || ''}
                onChange={(v) => updateField('codeAlpha3', v.toUpperCase())}
                maxLength={3}
                placeholder="MEX"
              />
              <FormInput
                label="Nombre (EN)"
                value={formData.nameEn || ''}
                onChange={(v) => updateField('nameEn', v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Codigo Telefono"
                value={formData.phoneCode || ''}
                onChange={(v) => updateField('phoneCode', v)}
                placeholder="+52"
              />
              <FormInput
                label="Codigo Moneda"
                value={formData.currencyCode || ''}
                onChange={(v) => updateField('currencyCode', v.toUpperCase())}
                placeholder="MXN"
              />
            </div>
            <FormInput
              label="Orden"
              value={formData.displayOrder || 0}
              onChange={(v) => updateField('displayOrder', v)}
              type="number"
            />
          </>
        );

      case 'currencies':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Nombre"
                required
                value={formData.name || ''}
                onChange={(v) => updateField('name', v)}
              />
              <FormInput
                label="Codigo (3 chars)"
                required
                value={formData.code || ''}
                onChange={(v) => updateField('code', v.toUpperCase())}
                maxLength={3}
                placeholder="MXN"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Simbolo"
                required
                value={formData.symbol || ''}
                onChange={(v) => updateField('symbol', v)}
                placeholder="$"
              />
              <FormInput
                label="Nombre (EN)"
                value={formData.nameEn || ''}
                onChange={(v) => updateField('nameEn', v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormSelect
                label="Posicion Simbolo"
                value={formData.symbolPosition || 'before'}
                onChange={(v) => updateField('symbolPosition', v)}
                options={[
                  { value: 'before', label: 'Antes ($100)' },
                  { value: 'after', label: 'Despues (100$)' },
                ]}
              />
              <FormInput
                label="Decimales"
                value={formData.decimalPlaces ?? 2}
                onChange={(v) => updateField('decimalPlaces', v)}
                type="number"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Separador Decimal"
                value={formData.decimalSeparator || '.'}
                onChange={(v) => updateField('decimalSeparator', v)}
                maxLength={1}
              />
              <FormInput
                label="Separador Miles"
                value={formData.thousandsSeparator || ','}
                onChange={(v) => updateField('thousandsSeparator', v)}
                maxLength={1}
              />
            </div>
            <FormInput
              label="Orden"
              value={formData.displayOrder || 0}
              onChange={(v) => updateField('displayOrder', v)}
              type="number"
            />
          </>
        );

      case 'priceTypes':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Nombre"
                required
                value={formData.name || ''}
                onChange={(v) => updateField('name', v)}
              />
              <FormInput
                label="Codigo"
                required
                value={formData.code || ''}
                onChange={(v) => updateField('code', v.toUpperCase())}
              />
            </div>
            <FormInput
              label="Descripcion"
              value={formData.description || ''}
              onChange={(v) => updateField('description', v)}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="% Descuento"
                value={formData.discountPercentage ?? 0}
                onChange={(v) => updateField('discountPercentage', v)}
                type="number"
              />
              <FormInput
                label="Prioridad"
                value={formData.priority ?? 0}
                onChange={(v) => updateField('priority', v)}
                type="number"
              />
            </div>
            <FormInput
              label="Aplica a (separado por comas)"
              value={formData.appliesTo || ''}
              onChange={(v) => updateField('appliesTo', v)}
              placeholder="distributor, customer"
            />
          </>
        );

      case 'exchangeRates':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Moneda Origen"
                required
                value={formData.fromCurrencyCode || ''}
                onChange={(v) => updateField('fromCurrencyCode', v.toUpperCase())}
                placeholder="USD"
              />
              <FormInput
                label="Moneda Destino"
                required
                value={formData.toCurrencyCode || ''}
                onChange={(v) => updateField('toCurrencyCode', v.toUpperCase())}
                placeholder="MXN"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Tasa"
                required
                value={formData.rate ?? 0}
                onChange={(v) => updateField('rate', v)}
                type="number"
              />
              <FormInput
                label="Tasa Inversa"
                value={formData.inverseRate ?? 0}
                onChange={(v) => updateField('inverseRate', v)}
                type="number"
              />
            </div>
            <FormInput
              label="Fuente"
              value={formData.source || ''}
              onChange={(v) => updateField('source', v)}
              placeholder="Banxico, Manual..."
            />
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Fecha Vigencia"
                required
                value={formData.effectiveDate || ''}
                onChange={(v) => updateField('effectiveDate', v)}
                type="date"
              />
              <FormInput
                label="Fecha Expiracion"
                value={formData.expirationDate || ''}
                onChange={(v) => updateField('expirationDate', v)}
                type="date"
              />
            </div>
          </>
        );

      case 'paymentMethods':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Codigo"
                required
                value={formData.code || ''}
                onChange={(v) => updateField('code', v.toUpperCase())}
              />
              <FormInput
                label="Nombre"
                required
                value={formData.name || ''}
                onChange={(v) => updateField('name', v)}
              />
            </div>
            <FormSelect
              label="Tipo de Pago"
              required
              value={formData.paymentType || ''}
              onChange={(v) => updateField('paymentType', v)}
              options={[
                { value: 'cash', label: 'Efectivo' },
                { value: 'card', label: 'Tarjeta' },
                { value: 'transfer', label: 'Transferencia' },
                { value: 'oxxo', label: 'OXXO' },
                { value: 'other', label: 'Otro' },
              ]}
            />
            <FormInput
              label="Descripcion"
              value={formData.description || ''}
              onChange={(v) => updateField('description', v)}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="% Comision"
                value={formData.commissionPercentage ?? 0}
                onChange={(v) => updateField('commissionPercentage', v)}
                type="number"
              />
              <FormInput
                label="Codigo SAT Metodo"
                value={formData.satPaymentMethodCode || ''}
                onChange={(v) => updateField('satPaymentMethodCode', v)}
              />
            </div>
            <div className="flex gap-6">
              <FormCheckbox
                label="Disponible E-commerce"
                checked={!!formData.availableForEcommerce}
                onChange={(v) => updateField('availableForEcommerce', v)}
              />
              <FormCheckbox
                label="Disponible POS"
                checked={!!formData.availableForPos}
                onChange={(v) => updateField('availableForPos', v)}
              />
            </div>
            <FormInput
              label="Orden"
              value={formData.displayOrder || 0}
              onChange={(v) => updateField('displayOrder', v)}
              type="number"
            />
          </>
        );

      case 'taxRules':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Codigo"
                required
                value={formData.code || ''}
                onChange={(v) => updateField('code', v.toUpperCase())}
              />
              <FormInput
                label="Nombre"
                required
                value={formData.name || ''}
                onChange={(v) => updateField('name', v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormSelect
                label="Tipo de Impuesto"
                required
                value={formData.taxType || ''}
                onChange={(v) => updateField('taxType', v)}
                options={[
                  { value: 'IVA', label: 'IVA' },
                  { value: 'ISR', label: 'ISR' },
                  { value: 'IEPS', label: 'IEPS' },
                ]}
              />
              <FormInput
                label="Tasa"
                required
                value={formData.rate ?? 0}
                onChange={(v) => updateField('rate', v)}
                type="number"
              />
            </div>
            <div className="flex gap-6">
              <FormCheckbox
                label="Es porcentaje"
                checked={formData.isPercentage ?? true}
                onChange={(v) => updateField('isPercentage', v)}
              />
              <FormCheckbox
                label="Incluido en precio"
                checked={!!formData.isIncludedInPrice}
                onChange={(v) => updateField('isIncludedInPrice', v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Codigo SAT Impuesto"
                value={formData.satTaxCode || ''}
                onChange={(v) => updateField('satTaxCode', v)}
              />
              <FormInput
                label="Codigo Pais"
                value={formData.countryCode || ''}
                onChange={(v) => updateField('countryCode', v.toUpperCase())}
                placeholder="MX"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Vigencia Desde"
                value={formData.effectiveFrom || ''}
                onChange={(v) => updateField('effectiveFrom', v)}
                type="date"
              />
              <FormInput
                label="Vigencia Hasta"
                value={formData.effectiveTo || ''}
                onChange={(v) => updateField('effectiveTo', v)}
                type="date"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  // ================================
  // TAB CONTENT RENDERER
  // ================================

  const renderTabContent = () => {
    const isReadOnly = READ_ONLY_TABS.includes(activeTab);

    // Build table/data per tab
    let tableElement: React.ReactNode = null;

    switch (activeTab) {
      case 'countries':
        tableElement = (
          <CatalogTable<Country>
            columns={countryColumns}
            data={filteredCountries}
            isLoading={loadingCountries}
            onEdit={openEdit}
            showActions={true}
            emptyMessage="No se encontraron paises."
          />
        );
        break;
      case 'currencies':
        tableElement = (
          <CatalogTable<Currency>
            columns={currencyColumns}
            data={filteredCurrencies}
            isLoading={loadingCurrencies}
            onEdit={openEdit}
            showActions={true}
            emptyMessage="No se encontraron monedas."
          />
        );
        break;
      case 'priceTypes':
        tableElement = (
          <CatalogTable<PriceType>
            columns={priceTypeColumns}
            data={filteredPriceTypes}
            isLoading={loadingPriceTypes}
            onEdit={openEdit}
            showActions={true}
            emptyMessage="No se encontraron tipos de precio."
          />
        );
        break;
      case 'exchangeRates':
        tableElement = (
          <CatalogTable<ExchangeRate>
            columns={exchangeRateColumns}
            data={filteredExchangeRates}
            isLoading={loadingExchangeRates}
            onEdit={openEdit}
            showActions={true}
            emptyMessage="No se encontraron tipos de cambio."
          />
        );
        break;
      case 'paymentMethods':
        tableElement = (
          <CatalogTable<PaymentMethod>
            columns={paymentMethodColumns}
            data={filteredPaymentMethods}
            isLoading={loadingPaymentMethods}
            onEdit={openEdit}
            showActions={true}
            emptyMessage="No se encontraron metodos de pago."
          />
        );
        break;
      case 'taxRules':
        tableElement = (
          <CatalogTable<TaxRule>
            columns={taxRuleColumns}
            data={filteredTaxRules}
            isLoading={loadingTaxRules}
            onEdit={openEdit}
            showActions={true}
            emptyMessage="No se encontraron reglas fiscales."
          />
        );
        break;
      case 'satCfdiUses':
        tableElement = (
          <CatalogTable<SatCfdiUse>
            columns={satCfdiUseColumns}
            data={filteredSatCfdiUses}
            isLoading={loadingSatCfdiUses}
            showActions={false}
            emptyMessage="No se encontraron usos de CFDI."
          />
        );
        break;
      case 'satTaxRegimes':
        tableElement = (
          <CatalogTable<SatTaxRegime>
            columns={satTaxRegimeColumns}
            data={filteredSatTaxRegimes}
            isLoading={loadingSatTaxRegimes}
            showActions={false}
            emptyMessage="No se encontraron regimenes fiscales."
          />
        );
        break;
    }

    return (
      <div className="space-y-4">
        {/* Search + Create button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1 w-full sm:max-w-sm">
            <Input
              placeholder="Buscar por nombre o codigo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              }
            />
          </div>
          {!isReadOnly && (
            <Button variant="primary" size="sm" onClick={openCreate}>
              Nuevo
            </Button>
          )}
        </div>

        {/* Table */}
        <Card padding="none">
          <CardContent className="p-0">
            {tableElement}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ================================
  // RENDER
  // ================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-3 mb-2">
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
              />
            </svg>
            <h1 className="text-3xl font-bold">Catalogos del Sistema</h1>
          </div>
          <p className="text-white/70 text-base">
            Administra los catalogos base de la plataforma: paises, monedas, tipos de precio, metodos de pago y mas.
          </p>
        </div>
      </div>

      {/* ── Tab navigation ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex overflow-x-auto -mb-px scrollbar-none" aria-label="Tabs">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setParams({ tab: tab.key });
                    setSearchTerm('');
                  }}
                  className={`
                    whitespace-nowrap py-3.5 px-4 text-sm font-medium border-b-2 transition-colors duration-150
                    ${
                      isActive
                        ? 'border-[#a7c1e2] text-[#3E667D] font-medium'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderTabContent()}
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      <CatalogFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalTitle}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isEdit={!!editingItem}
      >
        {renderFormFields()}
      </CatalogFormModal>
    </div>
  );
}
