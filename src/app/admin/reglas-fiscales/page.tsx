'use client';

import { Suspense, useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, type DataTableColumn } from '@/components/ui';
import {
  useTaxRules,
  useCreateTaxRule,
  useUpdateTaxRule,
  useDeleteTaxRule,
} from '@/hooks/useTaxRules';
import type { TaxRule, CreateTaxRuleDto, UpdateTaxRuleDto } from '@/types/config';
import type { TaxRuleQueryParams } from '@/services/tax-rules.service';
import { useStates } from '@/hooks/useStates';
import { useActiveCountries } from '@/hooks/useConfig';
import {
  ReceiptPercentIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  FunnelIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/auth';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

// ================================
// MODAL COMPONENT
// ================================

interface TaxRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  isSubmitting: boolean;
  isEdit: boolean;
}

function TaxRuleModal({ isOpen, onClose, title, children, onSubmit, isSubmitting, isEdit }: TaxRuleModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onSubmit} isLoading={isSubmitting}>
            {isEdit ? 'Guardar Cambios' : 'Crear Regla'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ================================
// FORM SECTION/FIELD HELPERS
// ================================

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2">
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function FormField({ label, required, fullWidth, children }: { label: string; required?: boolean; fullWidth?: boolean; children: React.ReactNode }) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function CheckboxField({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#3E667D] focus:ring-[#a7c1e2]"
      />
      <div>
        <span className="text-sm font-medium text-gray-900">{label}</span>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
    </label>
  );
}

// ================================
// TAX TYPE OPTIONS
// ================================

const TAX_TYPES = [
  { value: 'iva', label: 'IVA' },
  { value: 'ieps', label: 'IEPS' },
  { value: 'ish', label: 'ISH' },
  { value: 'retention', label: 'Retención' },
  { value: 'sales_tax', label: 'Sales Tax' },
  { value: 'vat', label: 'VAT' },
  { value: 'other', label: 'Otro' },
];

// ================================
// INITIAL FORM STATE
// ================================

const initialFormState: CreateTaxRuleDto = {
  code: '',
  name: '',
  description: '',
  taxType: 'iva',
  rate: 0,
  isPercentage: true,
  isIncludedInPrice: true,
  countryCode: 'MX',
  stateCodes: [],
  appliesToProducts: true,
  appliesToShipping: false,
  appliesToServices: false,
};

// ================================
// MAIN PAGE
// ================================

export default function ReglasFiscalesPage() {
  return <Suspense><ReglasFiscalesContent /></Suspense>;
}

function ReglasFiscalesContent() {
  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TaxRule | null>(null);
  const [formData, setFormData] = useState<CreateTaxRuleDto>(initialFormState);

  // Build query params
  const queryParams: TaxRuleQueryParams = useMemo(() => {
    const params: TaxRuleQueryParams = {};
    if (filterCountry !== 'all') params.countryCode = filterCountry;
    if (filterType !== 'all') params.taxType = filterType;
    if (filterStatus !== 'all') params.isActive = filterStatus === 'active';
    return params;
  }, [filterCountry, filterType, filterStatus]);

  // API Hooks
  const { data: taxRules = [], isLoading, error, refetch } = useTaxRules(queryParams);
  const createTaxRule = useCreateTaxRule();
  const updateTaxRule = useUpdateTaxRule();
  const deleteTaxRule = useDeleteTaxRule();
  const { data: countries = [] } = useActiveCountries();
  const { data: states = [] } = useStates(
    formData.countryCode ? { countryId: countries.find(c => c.code === formData.countryCode)?.id } : undefined
  );

  // Client-side search filter
  const filteredRules = useMemo(() => {
    if (!searchQuery) return taxRules;
    const q = searchQuery.toLowerCase();
    return taxRules.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q))
    );
  }, [taxRules, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: taxRules.length,
      active: taxRules.filter((r) => r.isActive).length,
      mx: taxRules.filter((r) => r.countryCode === 'MX').length,
      us: taxRules.filter((r) => r.countryCode === 'US').length,
    };
  }, [taxRules]);

  // Handlers
  const handleSearch = () => setSearchQuery(searchInput.trim());

  const resetFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setFilterCountry('all');
    setFilterType('all');
    setFilterStatus('all');
  };

  const handleOpenCreateModal = () => {
    setEditingRule(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rule: TaxRule) => {
    setEditingRule(rule);
    setFormData({
      code: rule.code,
      name: rule.name,
      description: rule.description || '',
      taxType: rule.taxType,
      rate: rule.rate,
      isPercentage: rule.isPercentage,
      isIncludedInPrice: rule.isIncludedInPrice,
      countryCode: rule.countryCode || 'MX',
      stateCodes: rule.stateCodes || [],
      appliesToProducts: rule.appliesToProducts,
      appliesToShipping: rule.appliesToShipping || false,
      appliesToServices: rule.appliesToServices || false,
      effectiveFrom: rule.effectiveFrom,
      effectiveTo: rule.effectiveTo,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
    setFormData(initialFormState);
  };

  const handleFormChange = (field: keyof CreateTaxRuleDto, value: string | boolean | number | string[] | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.code.trim()) {
      toast.error('El codigo es obligatorio');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (formData.rate < 0 || formData.rate > 100) {
      toast.error('La tasa debe estar entre 0 y 100');
      return;
    }

    try {
      if (editingRule) {
        const dto: UpdateTaxRuleDto = { ...formData };
        await updateTaxRule.mutateAsync({ id: editingRule.id, dto });
        toast.success('Regla fiscal actualizada');
      } else {
        await createTaxRule.mutateAsync(formData);
        toast.success('Regla fiscal creada');
      }
      handleCloseModal();
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Error al ${editingRule ? 'actualizar' : 'crear'} la regla`);
    }
  };

  const handleDelete = async (rule: TaxRule) => {
    if (!confirm(`¿Desactivar la regla fiscal "${rule.name}"?`)) return;
    try {
      await deleteTaxRule.mutateAsync(rule.id);
      toast.success('Regla fiscal desactivada');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al desactivar la regla');
    }
  };

  // Helpers
  const getTypeBadge = (taxType: string) => {
    const colors: Record<string, string> = {
      iva: 'bg-blue-100 text-blue-700',
      ieps: 'bg-purple-100 text-purple-700',
      sales_tax: 'bg-amber-100 text-amber-700',
      vat: 'bg-teal-100 text-teal-700',
      retention: 'bg-red-100 text-red-700',
      ish: 'bg-orange-100 text-orange-700',
      other: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      iva: 'IVA',
      ieps: 'IEPS',
      sales_tax: 'Sales Tax',
      vat: 'VAT',
      retention: 'Retención',
      ish: 'ISH',
      other: 'Otro',
    };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[taxType] || colors.other}`}>
        {labels[taxType] || taxType}
      </span>
    );
  };

  const getCountryBadge = (code?: string) => {
    if (!code) return <span className="text-gray-400 text-sm italic">-</span>;
    const colors: Record<string, string> = {
      MX: 'bg-green-100 text-green-700',
      US: 'bg-blue-100 text-blue-700',
    };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[code] || 'bg-gray-100 text-gray-700'}`}>
        {code}
      </span>
    );
  };

  const hasActiveFilters = Boolean(searchQuery || filterCountry !== 'all' || filterType !== 'all' || filterStatus !== 'all');

  // Table columns
  const columns: DataTableColumn<TaxRule>[] = [
    {
      key: 'code',
      header: 'Codigo',
      sortable: true,
      sortValue: (r) => r.code,
      render: (r) => (
        <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-sm font-mono font-medium text-gray-800">
          {r.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Nombre',
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <div>
          <p className="font-semibold text-gray-900">{r.name}</p>
          {r.description && <p className="text-xs text-gray-500 truncate max-w-[200px]">{r.description}</p>}
        </div>
      ),
    },
    {
      key: 'country',
      header: 'Pais',
      sortable: true,
      sortValue: (r) => r.countryCode ?? '',
      render: (r) => getCountryBadge(r.countryCode),
    },
    {
      key: 'type',
      header: 'Tipo',
      sortable: true,
      sortValue: (r) => r.taxType,
      render: (r) => getTypeBadge(r.taxType),
    },
    {
      key: 'rate',
      header: 'Tasa %',
      sortable: true,
      sortValue: (r) => r.rate,
      render: (r) => (
        <span className="text-sm font-medium text-gray-900">{r.rate}%</span>
      ),
    },
    {
      key: 'includedInPrice',
      header: 'Incluido en Precio',
      render: (r) =>
        r.isIncludedInPrice ? (
          <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
            <CheckCircleIcon className="h-4 w-4" /> Si
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-gray-500 text-xs font-medium">
            <XCircleIcon className="h-4 w-4" /> No
          </span>
        ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (r) =>
        r.isActive ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" /> Activa
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            <XCircleIcon className="h-3 w-3" /> Inactiva
          </span>
        ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (r) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenEditModal(r)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#3E667D] transition-colors"
            title="Editar"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          {r.isActive && (
            <button
              onClick={() => handleDelete(r)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
              title="Desactivar"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-2">
              <ReceiptPercentIcon className="h-10 w-10" />
              <h1 className="text-4xl font-bold">Reglas Fiscales</h1>
            </div>
            <p className="text-white/80 text-lg">Cargando reglas fiscales...</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                    <div className="h-8 w-16 bg-gray-200 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-2">
              <ReceiptPercentIcon className="h-10 w-10" />
              <h1 className="text-4xl font-bold">Reglas Fiscales</h1>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-red-700">
                <ExclamationTriangleIcon className="h-6 w-6" />
                <p>Error al cargar las reglas fiscales.</p>
              </div>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permissions={['config', 'config.catalogs']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <ReceiptPercentIcon className="h-10 w-10" />
                  <h1 className="text-4xl font-bold">Reglas Fiscales</h1>
                </div>
                <p className="text-white/80 text-lg">
                  Administra las reglas de impuestos del sistema
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/admin">
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                    Volver al Panel
                  </Button>
                </Link>
                <Button
                  variant="primary"
                  className="bg-white text-[#3E667D] hover:bg-white/90"
                  onClick={handleOpenCreateModal}
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Nueva Regla
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Reglas</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-[#3E667D]/10 flex items-center justify-center">
                    <ReceiptPercentIcon className="h-6 w-6 text-[#3E667D]" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Activas</p>
                    <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Mexico</p>
                    <p className="text-3xl font-bold text-green-700">{stats.mx}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                    <GlobeAltIcon className="h-6 w-6 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">EE.UU.</p>
                    <p className="text-3xl font-bold text-blue-700">{stats.us}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                    <GlobeAltIcon className="h-6 w-6 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4 items-end">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Buscar por codigo o nombre..."
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#3E667D] focus:border-[#3E667D]"
                    />
                  </div>
                </div>

                {/* Country filter */}
                <div className="w-40">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pais</label>
                  <select
                    value={filterCountry}
                    onChange={(e) => setFilterCountry(e.target.value)}
                    className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-[#3E667D] focus:border-[#3E667D]"
                  >
                    <option value="all">Todos</option>
                    <option value="MX">Mexico</option>
                    <option value="US">EE.UU.</option>
                  </select>
                </div>

                {/* Type filter */}
                <div className="w-40">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-[#3E667D] focus:border-[#3E667D]"
                  >
                    <option value="all">Todos</option>
                    {TAX_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Status filter */}
                <div className="w-36">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-[#3E667D] focus:border-[#3E667D]"
                  >
                    <option value="all">Todos</option>
                    <option value="active">Activas</option>
                    <option value="inactive">Inactivas</option>
                  </select>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={handleSearch}>
                    <MagnifyingGlassIcon className="h-4 w-4" />
                  </Button>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      <FunnelIcon className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <ArrowPathIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={columns}
                data={filteredRules}
                getRowKey={(r) => r.id}
                emptyMessage="No se encontraron reglas fiscales"
              />
            </CardContent>
          </Card>
        </div>

        {/* Modal */}
        <TaxRuleModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingRule ? `Editar: ${editingRule.name}` : 'Nueva Regla Fiscal'}
          onSubmit={handleSubmit}
          isSubmitting={createTaxRule.isPending || updateTaxRule.isPending}
          isEdit={!!editingRule}
        >
          <FormSection title="Informacion General">
            <FormField label="Codigo" required>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleFormChange('code', e.target.value.toUpperCase())}
                placeholder="IVA_16, SALES_TAX_CA..."
                disabled={!!editingRule}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#3E667D] focus:border-[#3E667D] disabled:bg-gray-100"
              />
            </FormField>
            <FormField label="Nombre" required>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="IVA 16%, Sales Tax California..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#3E667D] focus:border-[#3E667D]"
              />
            </FormField>
            <FormField label="Descripcion" fullWidth>
              <input
                type="text"
                value={formData.description || ''}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Descripcion opcional..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#3E667D] focus:border-[#3E667D]"
              />
            </FormField>
          </FormSection>

          <FormSection title="Configuracion Fiscal">
            <FormField label="Tipo de Impuesto" required>
              <select
                value={formData.taxType}
                onChange={(e) => handleFormChange('taxType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#3E667D] focus:border-[#3E667D]"
              >
                {TAX_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Tasa (%)" required>
              <input
                type="number"
                value={formData.rate}
                onChange={(e) => handleFormChange('rate', parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0"
                max="100"
                placeholder="16.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#3E667D] focus:border-[#3E667D]"
              />
            </FormField>
            <FormField label="Pais" required>
              <select
                value={formData.countryCode || ''}
                onChange={(e) => {
                  handleFormChange('countryCode', e.target.value);
                  handleFormChange('stateCodes', []);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#3E667D] focus:border-[#3E667D]"
              >
                <option value="">Seleccionar...</option>
                <option value="MX">Mexico</option>
                <option value="US">Estados Unidos</option>
              </select>
            </FormField>
            {states.length > 0 && (
              <FormField label="Estados (opcional)">
                <select
                  multiple
                  value={formData.stateCodes || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (o) => o.value);
                    handleFormChange('stateCodes', selected);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#3E667D] focus:border-[#3E667D] min-h-[80px]"
                >
                  {states.map((s) => (
                    <option key={s.id} value={s.code}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </FormField>
            )}
          </FormSection>

          <FormSection title="Aplicacion">
            <CheckboxField
              label="Incluido en precio"
              description="El precio del producto ya incluye este impuesto"
              checked={formData.isIncludedInPrice ?? true}
              onChange={(v) => handleFormChange('isIncludedInPrice', v)}
            />
            <CheckboxField
              label="Aplica a productos"
              description="Se aplica a productos"
              checked={formData.appliesToProducts ?? true}
              onChange={(v) => handleFormChange('appliesToProducts', v)}
            />
            <CheckboxField
              label="Aplica a envios"
              description="Se aplica a costos de envio"
              checked={formData.appliesToShipping ?? false}
              onChange={(v) => handleFormChange('appliesToShipping', v)}
            />
            <CheckboxField
              label="Aplica a servicios"
              description="Se aplica a servicios"
              checked={formData.appliesToServices ?? false}
              onChange={(v) => handleFormChange('appliesToServices', v)}
            />
          </FormSection>

          {editingRule && (
            <FormSection title="Estado">
              <CheckboxField
                label="Activa"
                description="Desactivar para dejar de aplicar esta regla"
                checked={formData.isActive ?? true}
                onChange={(v) => handleFormChange('isActive', v)}
              />
            </FormSection>
          )}
        </TaxRuleModal>
      </div>
    </PermissionGuard>
  );
}
