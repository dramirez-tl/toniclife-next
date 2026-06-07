'use client';

import { Suspense, useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import {
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
  useCedeaInfo,
  usePosUsers,
  useCreatePosUser,
  useDeactivatePosUser,
} from '@/hooks/useBranches';
import type { Branch, BranchQueryParams, CreateBranchDto, UpdateBranchDto, PosUser } from '@/types/branch';
import {
  usePosLicensesByBranch,
  useCreatePosLicense,
  useRevokePosLicense,
  useUnbindPosLicense,
} from '@/hooks/usePosLicenses';
import type { PosLicense } from '@/types/posLicense';
import { PosLicensesModal } from '@/components/pos-licenses/PosLicensesModal';
import { useStates } from '@/hooks/useStates';
import { useBranchTaxRules, useAssignBranchTaxRule, useRemoveBranchTaxRule, useActiveTaxRules } from '@/hooks/useTaxRules';
import type { BranchTaxRule } from '@/services/tax-rules.service';
import { ReceiptPercentIcon } from '@heroicons/react/24/outline';
import {
  BuildingOffice2Icon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  XCircleIcon,
  CheckCircleIcon,
  FunnelIcon,
  MapPinIcon,
  CubeIcon,
  ComputerDesktopIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  XMarkIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  ClipboardDocumentIcon,
  LockClosedIcon,
  LockOpenIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/utils';
import { PermissionGuard } from '@/components/auth';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useActiveCountries } from '@/hooks/useConfig';
import type { Country } from '@/types/config';
import { getTimezoneLabel, getTimezoneShortLabel } from '@/lib/timezone-utils';

// ================================
// TIMEZONE OPTIONS
// ================================

const TIMEZONE_OPTIONS = [
  {
    group: 'México',
    options: [
      { value: 'America/Mexico_City', label: 'Ciudad de México (CST/CDT)' },
      { value: 'America/Tijuana', label: 'Tijuana / Baja California (PST/PDT)' },
      { value: 'America/Cancun', label: 'Cancún (EST fijo)' },
      { value: 'America/Hermosillo', label: 'Hermosillo / Sonora (MST fijo)' },
      { value: 'America/Chihuahua', label: 'Chihuahua (MST/MDT)' },
    ],
  },
  {
    group: 'EE.UU.',
    options: [
      { value: 'America/Los_Angeles', label: 'Pacífico — Los Angeles (PST/PDT)' },
      { value: 'America/Denver', label: 'Montaña — Denver (MST/MDT)' },
      { value: 'America/Chicago', label: 'Central — Chicago / Tulsa (CST/CDT)' },
      { value: 'America/New_York', label: 'Este — New York (EST/EDT)' },
    ],
  },
  {
    group: 'Centroamérica',
    options: [
      { value: 'America/Guatemala', label: 'Guatemala (CST fijo)' },
      { value: 'America/Tegucigalpa', label: 'Honduras (CST fijo)' },
      { value: 'America/El_Salvador', label: 'El Salvador (CST fijo)' },
      { value: 'America/Managua', label: 'Nicaragua (CST fijo)' },
      { value: 'America/Costa_Rica', label: 'Costa Rica (CST fijo)' },
      { value: 'America/Panama', label: 'Panamá (EST fijo)' },
    ],
  },
  {
    group: 'Sudamérica',
    options: [
      { value: 'America/Bogota', label: 'Colombia (COT fijo)' },
      { value: 'America/Lima', label: 'Perú (PET fijo)' },
      { value: 'America/Caracas', label: 'Venezuela (VET fijo)' },
      { value: 'America/Santiago', label: 'Chile (CLT/CLST)' },
      { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (ART fijo)' },
    ],
  },
];

// ================================
// BRANCH MODAL COMPONENT
// ================================

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  isSubmitting: boolean;
  isEdit: boolean;
}

function BranchModal({ isOpen, onClose, title, children, onSubmit, isSubmitting, isEdit }: BranchModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="default"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEdit ? 'Guardar Cambios' : 'Crear Sucursal'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ================================
// FORM SECTION COMPONENT
// ================================

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2">
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}

// ================================
// FORM FIELD COMPONENT
// ================================

interface FormFieldProps {
  label: string;
  required?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

function FormField({ label, required, fullWidth, children }: FormFieldProps) {
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

// ================================
// CHECKBOX FIELD COMPONENT
// ================================

interface CheckboxFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function CheckboxField({ label, description, checked, onChange }: CheckboxFieldProps) {
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
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
    </label>
  );
}

// ================================
// TIMEZONE SECTION COMPONENT
// ================================

function TimezoneSection({ timezone, onChange }: { timezone: string; onChange: (tz: string) => void }) {
  const [localTime, setLocalTime] = useState('');

  useEffect(() => {
    const update = () => {
      setLocalTime(
        new Date().toLocaleTimeString('es-MX', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [timezone]);

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2">
        Zona Horaria
      </h3>
      <div className="grid grid-cols-1 gap-4">
        <FormField label="Zona horaria de la sucursal" fullWidth>
          <select
            value={timezone}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm"
          >
            {TIMEZONE_OPTIONS.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Afecta fechas en tickets, facturas y reportes diarios del POS
          </p>
          {localTime && (
            <p className="text-xs text-gray-500 mt-1">
              🕐 Hora actual en esta zona: <span className="font-mono font-medium">{localTime}</span>
            </p>
          )}
        </FormField>
      </div>
    </div>
  );
}

// ================================
// INITIAL FORM STATE
// ================================

const formatNumber = (n: number) => new Intl.NumberFormat('es-MX').format(n);

const initialFormState: CreateBranchDto = {
  name: '',
  code: '',
  countryId: '',
  stateId: '',
  addressStreet: '',
  addressCity: '',
  addressState: '',
  addressZip: '',
  addressPhone: '',
  addressEmail: '',
  currencyCode: '',
  isWarehouse: false,
  isPickupPoint: false,
  isPosEnabled: false,
  isEcommerceEnabled: false,
  shippingFreeThreshold: undefined,
  shippingCost: undefined,
  ticketName: '',
  ticketHeader: '',
  ticketFooter: '',
  timezone: 'America/Mexico_City',
};

// ================================
// MAIN PAGE COMPONENT
// ================================

export default function SucursalesPage() {
  return <Suspense><SucursalesContent /></Suspense>;
}

function SucursalesContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    type: 'all',
    status: 'all',
    country: 'all',
    page: '1',
    limit: '20',
  });

  const searchQuery = get('search');
  const filterCountry = get('country');
  const filterType = get('type');
  const filterStatus = get('status');
  const currentPage = getNumber('page') || 1;
  const pageSize = getNumber('limit') || 20;

  const [searchInput, setSearchInput] = useState(searchQuery);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<CreateBranchDto>(initialFormState);

  // Build query params
  const queryParams: BranchQueryParams = useMemo(() => {
    const params: BranchQueryParams = {
      page: currentPage,
      limit: pageSize,
    };

    if (searchQuery) params.search = searchQuery;
    if (filterCountry !== 'all') params.countryId = filterCountry;
    if (filterType === 'warehouse') params.isWarehouse = true;
    if (filterType === 'pickup') params.isPickupPoint = true;
    if (filterType === 'pos') params.isPosEnabled = true;
    if (filterType === 'cedea') params.isCedea = true;
    if (filterType === 'no-cedea') params.isCedea = false;
    if (filterStatus !== 'all') {
      params.isActive = filterStatus === 'active';
    }

    return params;
  }, [searchQuery, filterCountry, filterType, filterStatus, currentPage, pageSize]);

  // Lightweight stats queries (server-side totals, independent of pagination/filter)
  const baseStatsParams: BranchQueryParams = useMemo(() => ({
    search: searchQuery || undefined,
    countryId: filterCountry !== 'all' ? filterCountry : undefined,
    limit: 1,
    page: 1,
  }), [searchQuery, filterCountry]);

  const activeStatsParams: BranchQueryParams = useMemo(() => ({ ...baseStatsParams, isActive: true }), [baseStatsParams]);
  const warehouseStatsParams: BranchQueryParams = useMemo(() => ({ ...baseStatsParams, isWarehouse: true }), [baseStatsParams]);
  const posStatsParams: BranchQueryParams = useMemo(() => ({ ...baseStatsParams, isPosEnabled: true }), [baseStatsParams]);

  const { data: baseStatsData } = useBranches(baseStatsParams);
  const { data: activeStatsData } = useBranches(activeStatsParams);
  const { data: warehouseStatsData } = useBranches(warehouseStatsParams);
  const { data: posStatsData } = useBranches(posStatsParams);

  // API Hooks
  const { data: branchesData, isLoading, isFetching, error, refetch } = useBranches(queryParams);
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();
  const { data: countries = [] } = useActiveCountries();

  // States for selected country
  const selectedCountryId = formData.countryId || editingBranch?.countryId || '';
  const { data: statesForCountry = [] } = useStates(
    selectedCountryId ? { countryId: selectedCountryId } : undefined
  );

  // Branch tax rules (only when editing)
  const { data: branchTaxRules = [] } = useBranchTaxRules(editingBranch?.id || '');
  const { data: allActiveTaxRules = [] } = useActiveTaxRules();
  const assignTaxRule = useAssignBranchTaxRule();
  const removeTaxRule = useRemoveBranchTaxRule();

  // CEDEA hooks (only when editing a CEDEA branch)
  const { data: cedeaInfo } = useCedeaInfo(editingBranch?.isCedea ? editingBranch.id : '');
  const { data: posUsers = [], refetch: refetchPosUsers } = usePosUsers(editingBranch?.isCedea ? editingBranch.id : '');
  const createPosUser = useCreatePosUser({ onSuccess: () => refetchPosUsers() });
  const deactivatePosUser = useDeactivatePosUser({ onSuccess: () => refetchPosUsers() });

  // POS user form state
  const [showPosUserForm, setShowPosUserForm] = useState(false);
  const [posUserForm, setPosUserForm] = useState({ email: '', password: '', firstName: '', lastName: '' });

  // POS Licenses (Electron terminals) — only when editing an existing branch with POS enabled
  const isPosEnabledForLicenses = !!editingBranch && (
    formData.isPosEnabled ?? editingBranch.isPosEnabled ?? false
  );
  const { data: posLicenses = [] } = usePosLicensesByBranch(
    isPosEnabledForLicenses ? editingBranch?.id : undefined,
  );
  const createPosLicense = useCreatePosLicense();
  const revokePosLicense = useRevokePosLicense();
  const unbindPosLicense = useUnbindPosLicense();
  const [licenseLabelInput, setLicenseLabelInput] = useState('');

  // Modal dedicado de licencias (lanzado desde el row action en la tabla).
  const [licensesBranch, setLicensesBranch] = useState<Branch | null>(null);

  // Computed stats (server-side totals)
  const stats = useMemo(() => ({
    total: baseStatsData?.total ?? 0,
    active: activeStatsData?.total ?? 0,
    warehouses: warehouseStatsData?.total ?? 0,
    pos: posStatsData?.total ?? 0,
  }), [baseStatsData, activeStatsData, warehouseStatsData, posStatsData]);

  // Handlers
  const handleSearch = () => {
    setParams({ search: searchInput.trim() });
  };

  const handleFilterCountry = (value: string) => {
    setParams({ country: value, page: null });
  };

  const handleFilterType = (value: string) => {
    setParams({ type: value, page: null });
  };

  const handleFilterStatus = (value: string) => {
    setParams({ status: value, page: null });
  };

  const handlePageSizeChange = (value: string) => {
    setParams({ limit: value, page: null });
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const resetFilters = () => {
    setSearchInput('');
    setParams({ search: null, country: 'all', type: 'all', status: 'all', page: null });
  };

  const handleOpenCreateModal = () => {
    setEditingBranch(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    const country = countries.find((c: Country) => c.id === branch.countryId);
    setFormData({
      name: branch.name,
      code: branch.code,
      countryId: branch.countryId || '',
      stateId: branch.stateId || '',
      addressStreet: branch.addressStreet || '',
      addressCity: branch.addressCity || '',
      addressState: branch.addressState || '',
      addressZip: branch.addressZip || '',
      addressPhone: branch.addressPhone || '',
      addressEmail: branch.addressEmail || '',
      currencyCode: country?.currencyCode || branch.currencyCode || '',
      isWarehouse: branch.isWarehouse,
      isPickupPoint: branch.isPickupPoint,
      isPosEnabled: branch.isPosEnabled,
      isEcommerceEnabled: branch.isEcommerceEnabled,
      shippingFreeThreshold: branch.shippingFreeThreshold,
      shippingCost: branch.shippingCost,
      ticketName: branch.ticketName || '',
      ticketHeader: branch.ticketHeader || '',
      ticketFooter: branch.ticketFooter || '',
      timezone: branch.timezone || 'America/Mexico_City',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
    setFormData(initialFormState);
    setShowPosUserForm(false);
    setPosUserForm({ email: '', password: '', firstName: '', lastName: '' });
  };

  const handleFormChange = (field: keyof CreateBranchDto, value: string | boolean | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCountryChange = (countryId: string) => {
    const country = countries.find((c: Country) => c.id === countryId);
    setFormData((prev) => ({
      ...prev,
      countryId: countryId || '',
      stateId: '',
      currencyCode: country?.currencyCode || '',
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('El nombre de la sucursal es obligatorio');
      return;
    }
    if (!formData.code.trim()) {
      toast.error('El codigo de la sucursal es obligatorio');
      return;
    }

    try {
      if (editingBranch) {
        const { code, ...updateFields } = formData;
        // Strip empty strings for optional email validation
        const dto: UpdateBranchDto = {
          ...updateFields,
          addressEmail: updateFields.addressEmail?.trim() || undefined,
        };
        await updateBranch.mutateAsync({ id: editingBranch.id, dto });
        toast.success('Sucursal actualizada correctamente');
      } else {
        await createBranch.mutateAsync(formData);
        toast.success('Sucursal creada correctamente');
      }
      handleCloseModal();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || `Error al ${editingBranch ? 'actualizar' : 'crear'} la sucursal`
      );
    }
  };

  const handleToggleActive = async (branch: Branch) => {
    try {
      await updateBranch.mutateAsync({
        id: branch.id,
        dto: { isActive: !branch.isActive },
      });
      toast.success(
        branch.isActive ? 'Sucursal desactivada correctamente' : 'Sucursal activada correctamente'
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cambiar el estado de la sucursal');
    }
  };

  const handleDeleteBranch = async (branch: Branch) => {
    const ok = await confirmAction(`¿Estás seguro de eliminar la sucursal "${branch.name}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    try {
      await deleteBranch.mutateAsync(branch.id);
      toast.success('Sucursal eliminada correctamente');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar la sucursal');
    }
  };

  // Helper functions
  const getTypeBadges = (branch: Branch) => {
    const badges = [];
    if (branch.isWarehouse) {
      badges.push(
        <span
          key="warehouse"
          className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium"
        >
          <CubeIcon className="h-3 w-3" />
          Almacen
        </span>
      );
    }
    if (branch.isPickupPoint) {
      badges.push(
        <span
          key="pickup"
          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
        >
          <MapPinIcon className="h-3 w-3" />
          Punto de Recogida
        </span>
      );
    }
    if (branch.isPosEnabled) {
      badges.push(
        <span
          key="pos"
          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
        >
          <ComputerDesktopIcon className="h-3 w-3" />
          POS
        </span>
      );
    }
    if (branch.isEcommerceEnabled) {
      badges.push(
        <span
          key="ecommerce"
          className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium"
        >
          <GlobeAltIcon className="h-3 w-3" />
          E-commerce
        </span>
      );
    }
    if (badges.length === 0) {
      badges.push(
        <span
          key="none"
          className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium"
        >
          Sin tipo
        </span>
      );
    }
    return badges;
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <CheckCircleIcon className="h-3 w-3" />
          Activa
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
        <XCircleIcon className="h-3 w-3" />
        Inactiva
      </span>
    );
  };

  const getLocationString = (branch: Branch) => {
    const parts = [];
    if (branch.addressCity) parts.push(branch.addressCity);
    if (branch.addressState) parts.push(branch.addressState);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  const branches = branchesData?.data ?? [];
  const totalPages = branchesData?.totalPages ?? 1;
  const backendTotalPages = branchesData?.totalPages;
  const hasActiveFilters = Boolean(searchQuery || filterCountry !== 'all' || filterType !== 'all' || filterStatus !== 'all');
  const totalBranches = branchesData?.total ?? 0;
  const pageStart = totalBranches === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = totalBranches === 0 ? 0 : Math.min(currentPage * pageSize, totalBranches);

  useEffect(() => {
    // Solo ajustar cuando el backend ya devolvió totalPages real;
    // evita volver a página 1 durante estados transitorios de carga.
    if (backendTotalPages && currentPage > backendTotalPages) {
      setParams({ page: String(backendTotalPages) });
    }
  }, [backendTotalPages, currentPage, setParams]);

  // Loading state
  if (isLoading && !branchesData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-2">
              <BuildingOffice2Icon className="h-10 w-10" />
              <h1 className="text-4xl font-bold">Gestion de Sucursales</h1>
            </div>
            <p className="text-white/80 text-lg">Cargando sucursales...</p>
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

  // Error state
  if (error && !branchesData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-2">
              <BuildingOffice2Icon className="h-10 w-10" />
              <h1 className="text-4xl font-bold">Gestion de Sucursales</h1>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-red-700">
                <ExclamationTriangleIcon className="h-6 w-6" />
                <p>Error al cargar las sucursales. Por favor, intenta de nuevo.</p>
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

  const branchTableColumns: DataTableColumn<Branch>[] = [
    {
      key: 'name',
      header: 'Nombre',
      sortable: true,
      sortValue: (branch) => branch.name,
      render: (branch) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-[#3E667D]/10 flex items-center justify-center">
            <BuildingOffice2Icon className="h-5 w-5 text-[#3E667D]" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{branch.name}</p>
            {branch.addressEmail && (
              <p className="text-sm text-gray-500">{branch.addressEmail}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Codigo',
      sortable: true,
      sortValue: (branch) => branch.code,
      render: (branch) => (
        <div>
          <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-sm font-mono font-medium text-gray-800">
            {branch.code}
          </span>
          {branch.isCedea && (
            <div className="mt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                <ShieldCheckIcon className="h-3 w-3" />
                CEDEA
              </span>
              {branch.cedeaDistributorName && (
                <p className="text-xs text-gray-500 mt-0.5">{branch.cedeaDistributorName}</p>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'country',
      header: 'Pais',
      sortable: true,
      sortValue: (branch) => branch.countryName ?? '',
      render: (branch) => (
        <span className="text-sm text-gray-600">
          {branch.countryName || <span className="text-gray-400 italic">Sin pais</span>}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Ciudad / Estado',
      sortable: true,
      sortValue: (branch) => getLocationString(branch),
      render: (branch) => (
        <span className="text-sm text-gray-600">{getLocationString(branch)}</span>
      ),
    },
    {
      key: 'timezone',
      header: 'Zona Horaria',
      render: (branch) => (
        <span
          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium"
          title={getTimezoneLabel(branch.timezone)}
        >
          {getTimezoneShortLabel(branch.timezone || 'America/Mexico_City')}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (branch) => (
        <div className="flex flex-wrap gap-1">
          {getTypeBadges(branch)}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      sortValue: (branch) => (branch.isActive ? 1 : 0),
      render: (branch) => getStatusBadge(branch.isActive),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (branch) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleOpenEditModal(branch)}
            className="rounded-lg p-2 transition-colors hover:bg-blue-50"
            title="Editar sucursal"
            aria-label={`Editar ${branch.name}`}
          >
            <PencilIcon className="h-4 w-4 text-blue-600" />
          </button>
          {branch.isPosEnabled && (
            <button
              onClick={() => setLicensesBranch(branch)}
              className="rounded-lg p-2 transition-colors hover:bg-[#3E667D]/10"
              title="Licencias POS"
              aria-label={`Licencias POS de ${branch.name}`}
            >
              <KeyIcon className="h-4 w-4 text-[#3E667D]" />
            </button>
          )}
          {branch.isActive ? (
            <button
              onClick={() => handleToggleActive(branch)}
              className="rounded-lg p-2 transition-colors hover:bg-yellow-50"
              title="Desactivar sucursal"
              disabled={updateBranch.isPending}
              aria-label={`Desactivar ${branch.name}`}
            >
              <XCircleIcon className="h-4 w-4 text-yellow-600" />
            </button>
          ) : (
            <button
              onClick={() => handleToggleActive(branch)}
              className="rounded-lg p-2 transition-colors hover:bg-green-50"
              title="Activar sucursal"
              disabled={updateBranch.isPending}
              aria-label={`Activar ${branch.name}`}
            >
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
            </button>
          )}
          <button
            onClick={() => handleDeleteBranch(branch)}
            className="rounded-lg p-2 transition-colors hover:bg-red-50"
            title="Eliminar sucursal"
            disabled={deleteBranch.isPending}
            aria-label={`Eliminar ${branch.name}`}
          >
            <TrashIcon className="h-4 w-4 text-red-600" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PermissionGuard permissions={['settings:read', 'settings:*']}>
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <BuildingOffice2Icon className="h-9 w-9" />
                <h1 className="text-3xl font-bold sm:text-4xl">Gestion de Sucursales</h1>
              </div>
              <p className="text-base text-white/80 sm:text-lg">
                Administra sucursales, almacenes y puntos de venta
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin">
                <Button variant="secondary">Volver al Panel Principal</Button>
              </Link>
              <Button
                variant="default"
                onClick={handleOpenCreateModal}
              >
                <PlusIcon className="h-5 w-5" />
                Nueva Sucursal
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Sucursales</p>
                  <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.total)}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <BuildingOffice2Icon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Activas</p>
                  <p className="text-3xl font-bold text-green-600">{formatNumber(stats.active)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Almacenes</p>
                  <p className="text-3xl font-bold text-amber-600">{formatNumber(stats.warehouses)}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <CubeIcon className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Punto de Venta</p>
                  <p className="text-3xl font-bold text-purple-600">{formatNumber(stats.pos)}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <ComputerDesktopIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6 border-gray-100 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-gray-700">Busqueda y filtros</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-gray-600"
                  onClick={handleRefresh}
                  disabled={isFetching}
                >
                  <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                  {isFetching ? 'Actualizando...' : 'Actualizar'}
                </Button>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
              {/* Search */}
              <div className="lg:col-span-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o codigo..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-10 px-4 sm:min-w-[96px]"
                    onClick={handleSearch}
                  >
                    Buscar
                  </Button>
                </div>
              </div>

              {/* Country Filter */}
              <div className="lg:col-span-3">
                <SearchableSelect
                  options={countries.map((c: Country) => ({
                    value: c.id,
                    label: `${c.name} (${c.code})`,
                  }))}
                  value={filterCountry}
                  onChange={handleFilterCountry}
                  allLabel="Todos los Paises"
                  allValue="all"
                  className="w-full"
                />
              </div>

              {/* Type Filter */}
              <div className="lg:col-span-2">
                <SearchableSelect
                  options={[
                    { value: 'warehouse', label: 'Almacenes' },
                    { value: 'pickup', label: 'Puntos de Recogida' },
                    { value: 'pos', label: 'Punto de Venta' },
                    { value: 'cedea', label: 'Solo CEDEA' },
                    { value: 'no-cedea', label: 'Sin CEDEA' },
                  ]}
                  value={filterType}
                  onChange={handleFilterType}
                  allLabel="Todos los Tipos"
                  allValue="all"
                  className="w-full"
                />
              </div>

              {/* Status Filter */}
              <div className="lg:col-span-2">
                <SearchableSelect
                  options={[
                    { value: 'active', label: 'Activas' },
                    { value: 'inactive', label: 'Inactivas' },
                  ]}
                  value={filterStatus}
                  onChange={handleFilterStatus}
                  allLabel="Todos los Estados"
                  allValue="all"
                  className="w-full"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                  Filtros activos
                </span>
                {searchQuery && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                    Busqueda: {searchQuery}
                  </span>
                )}
                {filterCountry !== 'all' && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                    Pais: {countries.find((c: Country) => c.id === filterCountry)?.name ?? filterCountry}
                  </span>
                )}
                {filterType !== 'all' && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                    Tipo: {filterType}
                  </span>
                )}
                {filterStatus !== 'all' && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                    Estado: {filterStatus}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Branches Table */}
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900">Listado de sucursales</h2>
              <p className="text-sm text-gray-600">
                Mostrando {branches.length} de {branchesData?.total ?? 0}
              </p>
            </div>
            {isFetching && (
              <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                Actualizando resultados...
              </div>
            )}
            <DataTable
              columns={branchTableColumns}
              data={branches}
              isLoading={isLoading && !branchesData}
              getRowKey={(branch) => branch.id}
              minWidthClassName="min-w-[920px]"
              emptyState={
                <div className="py-2 text-center">
                  <BuildingOffice2Icon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                  <h3 className="mb-2 text-xl font-bold text-gray-900">
                    No se encontraron sucursales
                  </h3>
                  <p className="text-gray-600">Intenta ajustar los filtros de busqueda o crear una nueva sucursal.</p>
                  <div className="mt-4 flex justify-center gap-2">
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={resetFilters}>
                        Limpiar filtros
                      </Button>
                    )}
                    <Button
                      variant="default"
                      onClick={handleOpenCreateModal}
                    >
                      <PlusIcon className="h-4 w-4" />
                      Nueva Sucursal
                    </Button>
                  </div>
                </div>
              }
            />

            {/* Pagination */}
            {branches.length > 0 && (
              <DataTablePagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={totalBranches}
                isLoading={isLoading || isFetching}
                onPageChange={(p) => setParams({ page: String(p) })}
                onPageSizeChange={(size) => handlePageSizeChange(String(size))}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <BranchModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingBranch ? `Editar Sucursal: ${editingBranch.name}` : 'Nueva Sucursal'}
        onSubmit={handleSubmit}
        isSubmitting={createBranch.isPending || updateBranch.isPending}
        isEdit={!!editingBranch}
      >
        {/* Basic Info */}
        <FormSection title="Informacion Basica">
          <FormField label="Nombre" required>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              placeholder="Ej: Sucursal Monterrey Centro"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm"
            />
          </FormField>
          <FormField label="Codigo" required>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => handleFormChange('code', e.target.value.toUpperCase())}
              placeholder="Ej: MTY-CTR"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm font-mono"
            />
          </FormField>
        </FormSection>

        {/* Address */}
        <FormSection title="Direccion">
          <FormField label="Calle" fullWidth>
            <input
              type="text"
              value={formData.addressStreet || ''}
              onChange={(e) => handleFormChange('addressStreet', e.target.value)}
              placeholder="Calle y numero"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm"
            />
          </FormField>
          <FormField label="Ciudad">
            <input
              type="text"
              value={formData.addressCity || ''}
              onChange={(e) => handleFormChange('addressCity', e.target.value)}
              placeholder="Ciudad"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm"
            />
          </FormField>
          <FormField label="Estado">
            <input
              type="text"
              value={formData.addressState || ''}
              onChange={(e) => handleFormChange('addressState', e.target.value)}
              placeholder="Estado"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm"
            />
          </FormField>
          <FormField label="Codigo Postal">
            <input
              type="text"
              value={formData.addressZip || ''}
              onChange={(e) => handleFormChange('addressZip', e.target.value)}
              placeholder="C.P."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm"
            />
          </FormField>
        </FormSection>

        {/* Contact */}
        <FormSection title="Contacto">
          <FormField label="Telefono">
            <input
              type="tel"
              value={formData.addressPhone || ''}
              onChange={(e) => handleFormChange('addressPhone', e.target.value)}
              placeholder="(81) 1234-5678"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm"
            />
          </FormField>
          <FormField label="Correo electrónico">
            <input
              type="email"
              value={formData.addressEmail || ''}
              onChange={(e) => handleFormChange('addressEmail', e.target.value)}
              placeholder="sucursal@toniclife.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm"
            />
          </FormField>
        </FormSection>

        {/* Timezone */}
        <TimezoneSection
          timezone={formData.timezone || 'America/Mexico_City'}
          onChange={(tz) => handleFormChange('timezone', tz)}
        />

        {/* Features */}
        <FormSection title="Caracteristicas">
          <CheckboxField
            label="Almacen"
            description="Esta sucursal funciona como almacen de inventario"
            checked={formData.isWarehouse ?? false}
            onChange={(val) => handleFormChange('isWarehouse', val)}
          />
          <CheckboxField
            label="Punto de Recogida"
            description="Los clientes pueden recoger pedidos aqui"
            checked={formData.isPickupPoint ?? false}
            onChange={(val) => handleFormChange('isPickupPoint', val)}
          />
          <CheckboxField
            label="Punto de Venta (POS)"
            description="Tiene terminal de punto de venta habilitado"
            checked={formData.isPosEnabled ?? false}
            onChange={(val) => handleFormChange('isPosEnabled', val)}
          />
          <CheckboxField
            label="E-commerce"
            description="Vende a traves de la tienda en linea"
            checked={formData.isEcommerceEnabled ?? false}
            onChange={(val) => handleFormChange('isEcommerceEnabled', val)}
          />
        </FormSection>

        {/* Country, Currency & Shipping */}
        <FormSection title="Pais, Moneda y Envios">
          <FormField label="Pais" required>
            <select
              value={formData.countryId || ''}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm"
            >
              <option value="">Seleccionar pais...</option>
              {countries.map((c: Country) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </FormField>
          {statesForCountry.length > 0 && (
            <FormField label="Estado / Region">
              <select
                value={formData.stateId || ''}
                onChange={(e) => handleFormChange('stateId', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm"
              >
                <option value="">Seleccionar estado...</option>
                {statesForCountry.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </FormField>
          )}
          <FormField label="Moneda">
            <input
              type="text"
              value={formData.currencyCode || '—'}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-mono text-gray-600 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Se asigna automaticamente segun el pais</p>
          </FormField>
          <FormField label="Envio Gratis Desde">
            <input
              type="number"
              value={formData.shippingFreeThreshold ?? ''}
              onChange={(e) =>
                handleFormChange(
                  'shippingFreeThreshold',
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              placeholder="Monto minimo para envio gratis"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm"
              min={0}
              step={0.01}
            />
          </FormField>
          <FormField label="Costo de Envio">
            <input
              type="number"
              value={formData.shippingCost ?? ''}
              onChange={(e) =>
                handleFormChange(
                  'shippingCost',
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              placeholder="Costo base de envio"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm"
              min={0}
              step={0.01}
            />
          </FormField>
        </FormSection>

        {/* Branch Tax Rules (only when editing) */}
        {editingBranch && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2 flex items-center gap-2">
              <ReceiptPercentIcon className="h-4 w-4" />
              Reglas Fiscales de la Sucursal
            </h3>
            <div className="border rounded-lg overflow-hidden mb-3">
              <DataTable<BranchTaxRule>
                columns={[
                  {
                    key: 'name',
                    header: 'Regla',
                    render: (btr) => (
                      <>
                        <span className="font-medium text-gray-900">{btr.name}</span>
                        <span className="ml-2 text-xs text-gray-500 font-mono">{btr.code}</span>
                      </>
                    ),
                  },
                  {
                    key: 'taxType',
                    header: 'Tipo',
                    render: (btr) => (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {btr.taxType}
                      </span>
                    ),
                  },
                  {
                    key: 'rate',
                    header: 'Tasa',
                    headerClassName: 'text-right',
                    cellClassName: 'text-right font-medium',
                    render: (btr) => <>{btr.rate}%</>,
                  },
                  {
                    key: 'isIncludedInPrice',
                    header: 'Incluido',
                    headerClassName: 'text-center',
                    cellClassName: 'text-center',
                    render: (btr) =>
                      btr.isIncludedInPrice ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 text-gray-400 mx-auto" />
                      ),
                  },
                  {
                    key: 'actions',
                    header: '',
                    headerClassName: 'text-right',
                    cellClassName: 'text-right',
                    render: (btr) => (
                      <button
                        onClick={async () => {
                          try {
                            await removeTaxRule.mutateAsync({ branchId: editingBranch.id, taxRuleId: btr.taxRuleId });
                            toast.success('Regla fiscal removida');
                          } catch (err: any) {
                            toast.error(err.response?.data?.message || 'Error al remover regla');
                          }
                        }}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Quitar regla"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    ),
                  },
                ]}
                data={branchTaxRules}
                getRowKey={(btr, i) => String(btr.id ?? i)}
                emptyMessage="No hay reglas fiscales asignadas a esta sucursal."
              />
            </div>
            {/* Add tax rule */}
            <div className="flex items-center gap-2">
              <select
                id="add-tax-rule-select"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#3E667D] focus:border-[#3E667D]"
                defaultValue=""
              >
                <option value="" disabled>Seleccionar regla fiscal...</option>
                {allActiveTaxRules
                  .filter((tr) => !branchTaxRules.some((btr: BranchTaxRule) => btr.taxRuleId === tr.id))
                  .map((tr) => (
                    <option key={tr.id} value={tr.id}>{tr.name} ({tr.code}) - {tr.rate}%</option>
                  ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const select = document.getElementById('add-tax-rule-select') as HTMLSelectElement;
                  const taxRuleId = select?.value;
                  if (!taxRuleId) {
                    toast.error('Selecciona una regla fiscal');
                    return;
                  }
                  try {
                    await assignTaxRule.mutateAsync({ branchId: editingBranch.id, taxRuleId });
                    toast.success('Regla fiscal asignada');
                    select.value = '';
                  } catch (err: any) {
                    toast.error(err.response?.data?.message || 'Error al asignar regla');
                  }
                }}
                disabled={assignTaxRule.isPending}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>
          </div>
        )}

        {/* CEDEA Section (only for CEDEA branches when editing) */}
        {editingBranch?.isCedea && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2 flex items-center gap-2">
              <ShieldCheckIcon className="h-4 w-4" />
              Informacion CEDEA
            </h3>

            {/* Distributor info */}
            {cedeaInfo && (
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div>
                  <span className="text-gray-500">Distribuidor:</span>
                  <p className="font-medium text-gray-900">{cedeaInfo.distributorName}</p>
                </div>
                <div>
                  <span className="text-gray-500">No. Distribuidor:</span>
                  <p className="font-medium text-gray-900">{cedeaInfo.distributorNumber || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <p className="font-medium text-gray-900">{cedeaInfo.distributorEmail || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">No. Contrato:</span>
                  <p className="font-medium text-gray-900">{cedeaInfo.contractNumber || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Comision:</span>
                  <p className="font-medium text-gray-900">
                    {cedeaInfo.commissionRate != null ? `${(cedeaInfo.commissionRate * 100).toFixed(0)}%` : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    cedeaInfo.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {cedeaInfo.status || '-'}
                  </span>
                </div>
              </div>
            )}

            {/* POS Users Table */}
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <UserGroupIcon className="h-4 w-4" />
              Usuarios POS ({posUsers.length})
            </h4>

            <div className="border rounded-lg overflow-hidden mb-3">
              <DataTable<PosUser>
                columns={[
                  {
                    key: 'name',
                    header: 'Nombre',
                    cellClassName: 'font-medium text-gray-900',
                    render: (user) => (
                      <>
                        {user.firstName} {user.lastName}
                      </>
                    ),
                  },
                  {
                    key: 'email',
                    header: 'Email',
                    cellClassName: 'text-gray-600',
                    render: (user) => <>{user.email}</>,
                  },
                  {
                    key: 'roleCode',
                    header: 'Rol',
                    render: (user) => (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        {user.roleCode}
                      </span>
                    ),
                  },
                  {
                    key: 'isActive',
                    header: 'Estado',
                    headerClassName: 'text-center',
                    cellClassName: 'text-center',
                    render: (user) =>
                      user.isActive ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 text-gray-400 mx-auto" />
                      ),
                  },
                  {
                    key: 'actions',
                    header: '',
                    headerClassName: 'text-right',
                    cellClassName: 'text-right',
                    render: (user) =>
                      user.isActive ? (
                        <button
                          onClick={async () => {
                            if (!(await confirmAction(`Desactivar usuario ${user.firstName} ${user.lastName}?`))) return;
                            try {
                              await deactivatePosUser.mutateAsync({ branchId: editingBranch.id, userId: user.id });
                              toast.success('Usuario POS desactivado');
                            } catch (err: any) {
                              toast.error(err.response?.data?.message || 'Error al desactivar usuario');
                            }
                          }}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="Desactivar usuario"
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </button>
                      ) : null,
                  },
                ]}
                data={posUsers}
                getRowKey={(user, i) => String(user.id ?? i)}
                emptyMessage="No hay usuarios POS asignados a esta sucursal."
              />
            </div>

            {/* Create POS User Form */}
            {!showPosUserForm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPosUserForm(true)}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Crear Usuario POS
              </Button>
            ) : (
              <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                <h5 className="text-sm font-medium text-gray-700">Nuevo Usuario POS</h5>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={posUserForm.firstName}
                    onChange={(e) => setPosUserForm((p) => ({ ...p, firstName: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#3E667D] focus:border-[#3E667D]"
                  />
                  <input
                    type="text"
                    placeholder="Apellido"
                    value={posUserForm.lastName}
                    onChange={(e) => setPosUserForm((p) => ({ ...p, lastName: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#3E667D] focus:border-[#3E667D]"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={posUserForm.email}
                    onChange={(e) => setPosUserForm((p) => ({ ...p, email: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#3E667D] focus:border-[#3E667D]"
                  />
                  <input
                    type="password"
                    placeholder="Contrasena"
                    value={posUserForm.password}
                    onChange={(e) => setPosUserForm((p) => ({ ...p, password: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#3E667D] focus:border-[#3E667D]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={async () => {
                      if (!posUserForm.email || !posUserForm.password || !posUserForm.firstName || !posUserForm.lastName) {
                        toast.error('Todos los campos son obligatorios');
                        return;
                      }
                      try {
                        await createPosUser.mutateAsync({ branchId: editingBranch.id, dto: posUserForm });
                        toast.success('Usuario POS creado correctamente');
                        setPosUserForm({ email: '', password: '', firstName: '', lastName: '' });
                        setShowPosUserForm(false);
                      } catch (err: any) {
                        toast.error(err.response?.data?.message || 'Error al crear usuario POS');
                      }
                    }}
                    disabled={createPosUser.isPending}
                  >
                    {createPosUser.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Crear
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPosUserForm(false);
                      setPosUserForm({ email: '', password: '', firstName: '', lastName: '' });
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* POS Licenses Section (Electron terminals) */}
        {isPosEnabledForLicenses && editingBranch && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2 flex items-center gap-2">
              <KeyIcon className="h-4 w-4" />
              Licencias POS (Terminales Electron) ({posLicenses.length})
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Cada licencia activa una terminal Electron en un equipo especifico.
              Tras la primera activacion la licencia queda vinculada al hardware y no
              puede usarse en otra maquina hasta liberarla o revocarla.
            </p>

            <div className="border rounded-lg overflow-hidden mb-3">
              <DataTable<PosLicense>
                columns={[
                  {
                    key: 'licenseKey',
                    header: 'Clave',
                    cellClassName: 'font-mono text-xs text-gray-900',
                    render: (license) => <>{license.licenseKey}</>,
                  },
                  {
                    key: 'label',
                    header: 'Etiqueta',
                    cellClassName: 'text-gray-700',
                    render: (license) =>
                      license.label || <span className="text-gray-400 italic">sin etiqueta</span>,
                  },
                  {
                    key: 'status',
                    header: 'Estado',
                    render: (license) => (
                      <>
                        {license.status === 'active' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <LockClosedIcon className="h-3 w-3" />
                            Activa
                          </span>
                        )}
                        {license.status === 'inactive' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <LockOpenIcon className="h-3 w-3" />
                            Sin canjear
                          </span>
                        )}
                        {license.status === 'revoked' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <XCircleIcon className="h-3 w-3" />
                            Revocada
                          </span>
                        )}
                      </>
                    ),
                  },
                  {
                    key: 'hardware',
                    header: 'Equipo',
                    cellClassName: 'text-xs text-gray-600',
                    render: (license) =>
                      license.status === 'active' && license.hardwareFingerprint ? (
                        <div className="flex items-center gap-1">
                          <ComputerDesktopIcon className="h-3 w-3 text-gray-400 shrink-0" />
                          <div>
                            <div className="font-medium text-gray-800">
                              {(license.hardwareInfo?.hostname as string | undefined) ??
                                `HW-${license.hardwareFingerprint.slice(0, 12).toUpperCase()}`}
                            </div>
                            {license.hardwareInfo?.osPlatform && (
                              <div className="text-gray-500">
                                {license.hardwareInfo.osPlatform as string}{' '}
                                {(license.hardwareInfo.osRelease as string | undefined) ?? ''}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">no vinculada</span>
                      ),
                  },
                  {
                    key: 'actions',
                    header: 'Acciones',
                    headerClassName: 'text-right',
                    cellClassName: 'text-right',
                    render: (license) => (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(license.licenseKey);
                              toast.success('Clave copiada al portapapeles');
                            } catch {
                              toast.error('No se pudo copiar la clave');
                            }
                          }}
                          className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Copiar clave"
                        >
                          <ClipboardDocumentIcon className="h-4 w-4" />
                        </button>
                        {license.status === 'active' && (
                          <button
                            onClick={async () => {
                              if (!(await confirmAction(
                                `Liberar la licencia ${license.licenseKey} del equipo actual? Quedara lista para activarse en otra maquina.`,
                              ))) return;
                              try {
                                await unbindPosLicense.mutateAsync(license.id);
                                toast.success('Licencia liberada del equipo');
                              } catch (err) {
                                const e = err as { response?: { data?: { message?: string } } };
                                toast.error(e.response?.data?.message || 'Error al liberar licencia');
                              }
                            }}
                            className="p-1 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                            title="Liberar del equipo (sigue siendo valida)"
                          >
                            <LockOpenIcon className="h-4 w-4" />
                          </button>
                        )}
                        {license.status !== 'revoked' && (
                          <button
                            onClick={async () => {
                              if (!(await confirmAction(
                                `Revocar la licencia ${license.licenseKey} permanentemente? Esta accion no se puede deshacer.`,
                              ))) return;
                              try {
                                await revokePosLicense.mutateAsync({ id: license.id });
                                toast.success('Licencia revocada');
                              } catch (err) {
                                const e = err as { response?: { data?: { message?: string } } };
                                toast.error(e.response?.data?.message || 'Error al revocar licencia');
                              }
                            }}
                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                            title="Revocar permanentemente"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ),
                  },
                ]}
                data={posLicenses}
                getRowKey={(license, i) => String(license.id ?? i)}
                emptyMessage="Esta sucursal aun no tiene licencias POS generadas."
              />
            </div>

            {/* Inline create form */}
            <div className="border rounded-lg p-3 bg-gray-50 flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Etiqueta para identificar la terminal (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Caja 1 mostrador, Call Center turno noche"
                  value={licenseLabelInput}
                  onChange={(e) => setLicenseLabelInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  maxLength={100}
                />
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={async () => {
                  try {
                    const license = await createPosLicense.mutateAsync({
                      branchId: editingBranch.id,
                      label: licenseLabelInput.trim() || undefined,
                    });
                    toast.success(`Licencia generada: ${license.licenseKey}`);
                    setLicenseLabelInput('');
                    try {
                      await navigator.clipboard.writeText(license.licenseKey);
                      toast.success('Clave copiada al portapapeles', { duration: 2500 });
                    } catch {
                      // ignore clipboard failure
                    }
                  } catch (err) {
                    const e = err as { response?: { data?: { message?: string } } };
                    toast.error(e.response?.data?.message || 'Error al generar licencia');
                  }
                }}
                disabled={createPosLicense.isPending}
              >
                {createPosLicense.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                <PlusIcon className="h-4 w-4" />
                Generar licencia
              </Button>
            </div>
          </div>
        )}

        {/* Ticket */}
        <FormSection title="Configuracion de Ticket">
          <FormField label="Nombre en Ticket" fullWidth>
            <input
              type="text"
              value={formData.ticketName || ''}
              onChange={(e) => handleFormChange('ticketName', e.target.value)}
              placeholder="Nombre que aparece en el ticket de venta"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm"
            />
          </FormField>
          <FormField label="Encabezado del Ticket" fullWidth>
            <textarea
              value={formData.ticketHeader || ''}
              onChange={(e) => handleFormChange('ticketHeader', e.target.value)}
              placeholder="Texto que aparece en la parte superior del ticket"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm resize-none"
            />
          </FormField>
          <FormField label="Pie del Ticket" fullWidth>
            <textarea
              value={formData.ticketFooter || ''}
              onChange={(e) => handleFormChange('ticketFooter', e.target.value)}
              placeholder="Texto que aparece en la parte inferior del ticket"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm resize-none"
            />
          </FormField>
        </FormSection>
      </BranchModal>

      {/* Modal dedicado de licencias POS (lanzado desde el row action). */}
      {licensesBranch && (
        <PosLicensesModal
          isOpen={!!licensesBranch}
          onClose={() => setLicensesBranch(null)}
          branchId={licensesBranch.id}
          branchName={licensesBranch.name}
          branchCode={licensesBranch.code}
        />
      )}
    </div>
    </PermissionGuard>
  );
}
