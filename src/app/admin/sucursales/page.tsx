'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import {
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
} from '@/hooks/useBranches';
import type { Branch, BranchQueryParams, CreateBranchDto, UpdateBranchDto } from '@/types/branch';
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
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/auth';

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
            variant="primary"
            onClick={onSubmit}
            isLoading={isSubmitting}
          >
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
// INITIAL FORM STATE
// ================================

const initialFormState: CreateBranchDto = {
  name: '',
  code: '',
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
};

// ================================
// MAIN PAGE COMPONENT
// ================================

export default function SucursalesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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
    if (filterType === 'warehouse') params.isWarehouse = true;
    if (filterType === 'pickup') params.isPickupPoint = true;
    if (filterType === 'pos') params.isPosEnabled = true;
    if (filterStatus !== 'all') {
      params.isActive = filterStatus === 'active';
    }

    return params;
  }, [searchQuery, filterType, filterStatus, currentPage, pageSize]);

  // API Hooks
  const { data: branchesData, isLoading, isFetching, error, refetch } = useBranches(queryParams);
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();

  // Computed stats
  const stats = useMemo(() => {
    if (!branchesData) {
      return { total: 0, active: 0, warehouses: 0, pos: 0 };
    }
    return {
      total: branchesData.total,
      active: branchesData.data.filter((b) => b.isActive).length,
      warehouses: branchesData.data.filter((b) => b.isWarehouse).length,
      pos: branchesData.data.filter((b) => b.isPosEnabled).length,
    };
  }, [branchesData]);

  // Handlers
  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
    setCurrentPage(1);
  };

  const handleFilterType = (value: string) => {
    setFilterType(value);
    setCurrentPage(1);
  };

  const handleFilterStatus = (value: string) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSearchInput('');
    setFilterType('all');
    setFilterStatus('all');
    setCurrentPage(1);
  };

  const handleOpenCreateModal = () => {
    setEditingBranch(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code,
      addressStreet: branch.addressStreet || '',
      addressCity: branch.addressCity || '',
      addressState: branch.addressState || '',
      addressZip: branch.addressZip || '',
      addressPhone: branch.addressPhone || '',
      addressEmail: branch.addressEmail || '',
      currencyCode: branch.currencyCode || '',
      isWarehouse: branch.isWarehouse,
      isPickupPoint: branch.isPickupPoint,
      isPosEnabled: branch.isPosEnabled,
      isEcommerceEnabled: branch.isEcommerceEnabled,
      shippingFreeThreshold: branch.shippingFreeThreshold,
      shippingCost: branch.shippingCost,
      ticketName: branch.ticketName || '',
      ticketHeader: branch.ticketHeader || '',
      ticketFooter: branch.ticketFooter || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
    setFormData(initialFormState);
  };

  const handleFormChange = (field: keyof CreateBranchDto, value: string | boolean | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
        const dto: UpdateBranchDto = { ...formData };
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
    if (!confirm(`¿Estas seguro de eliminar la sucursal "${branch.name}"? Esta accion no se puede deshacer.`)) {
      return;
    }
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
  const hasActiveFilters = Boolean(searchQuery || filterType !== 'all' || filterStatus !== 'all');
  const totalBranches = branchesData?.total ?? 0;
  const pageStart = totalBranches === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = totalBranches === 0 ? 0 : Math.min(currentPage * pageSize, totalBranches);

  useEffect(() => {
    // Solo ajustar cuando el backend ya devolvió totalPages real;
    // evita volver a página 1 durante estados transitorios de carga.
    if (backendTotalPages && currentPage > backendTotalPages) {
      setCurrentPage(backendTotalPages);
    }
  }, [backendTotalPages, currentPage]);

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
        <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-sm font-mono font-medium text-gray-800">
          {branch.code}
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
                variant="primary"
                leftIcon={<PlusIcon className="h-5 w-5" />}
                onClick={handleOpenCreateModal}
              >
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
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
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
                  <p className="text-3xl font-bold text-green-600">{stats.active}</p>
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
                  <p className="text-3xl font-bold text-amber-600">{stats.warehouses}</p>
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
                  <p className="text-3xl font-bold text-purple-600">{stats.pos}</p>
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
              <div className="lg:col-span-6">
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
                    variant="primary"
                    size="sm"
                    className="h-10 px-4 sm:min-w-[96px]"
                    onClick={handleSearch}
                  >
                    Buscar
                  </Button>
                </div>
              </div>

              {/* Type Filter */}
              <div className="lg:col-span-3">
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3">
                  <FunnelIcon className="h-4 w-4 text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => handleFilterType(e.target.value)}
                  className="w-full bg-transparent py-2.5 text-sm focus:outline-none"
                >
                  <option value="all">Todos los Tipos</option>
                  <option value="warehouse">Almacenes</option>
                  <option value="pickup">Puntos de Recogida</option>
                  <option value="pos">Punto de Venta</option>
                </select>
                </div>
              </div>

              {/* Status Filter */}
              <div className="lg:col-span-3">
                <div className="rounded-lg border border-gray-200 bg-white px-3">
                <select
                  value={filterStatus}
                  onChange={(e) => handleFilterStatus(e.target.value)}
                  className="w-full bg-transparent py-2.5 text-sm focus:outline-none"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="active">Activas</option>
                  <option value="inactive">Inactivas</option>
                </select>
                </div>
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
                      variant="primary"
                      leftIcon={<PlusIcon className="h-4 w-4" />}
                      onClick={handleOpenCreateModal}
                    >
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
                onPageChange={setCurrentPage}
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

        {/* Currency & Shipping */}
        <FormSection title="Moneda y Envios">
          <FormField label="Codigo de Moneda">
            <input
              type="text"
              value={formData.currencyCode || ''}
              onChange={(e) => handleFormChange('currencyCode', e.target.value.toUpperCase())}
              placeholder="Ej: MXN, USD"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm font-mono"
              maxLength={3}
            />
          </FormField>
          <div /> {/* spacer */}
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
    </div>
    </PermissionGuard>
  );
}
