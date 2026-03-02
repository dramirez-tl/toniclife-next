'use client';

import { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useVacations, useApproveVacation, useRejectVacation, useCreateVacation } from '@/hooks/useHR';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import type { VacationStatus, CreateVacationDto } from '@/types/hr';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: ClockIcon },
  APPROVED: { label: 'Aprobada', color: 'bg-green-100 text-green-700', icon: CheckCircleIcon },
  REJECTED: { label: 'Rechazada', color: 'bg-red-100 text-red-700', icon: XCircleIcon },
  CANCELLED: { label: 'Cancelada', color: 'bg-gray-100 text-gray-700', icon: XCircleIcon },
};

export default function VacacionesPage() {
  return (
    <Suspense>
      <VacacionesContent />
    </Suspense>
  );
}

function VacacionesContent() {
  const { get, setParams } = useQueryFilters({
    status: 'all',
    department: 'all',
  });

  const filterStatus = get('status');
  const filterDepartment = get('department');

  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vacationFormData, setVacationFormData] = useState<Record<string, any>>({});

  // Fetch vacations from API
  const { data: vacationsData, isLoading, error } = useVacations({
    status: filterStatus !== 'all' ? (filterStatus as VacationStatus) : undefined,
  });

  const approveVacation = useApproveVacation();
  const rejectVacation = useRejectVacation();
  const createVacation = useCreateVacation();

  const vacations = vacationsData?.data ?? [];

  // Extract departments from data
  const departments = useMemo(() => {
    const deptSet = new Set(vacations.map(v => v.employee?.department).filter((d): d is string => !!d));
    return Array.from(deptSet);
  }, [vacations]);

  // Filter vacations locally
  const filteredVacations = useMemo(() => {
    return vacations.filter(vacation => {
      const employeeName = vacation.employee
        ? `${vacation.employee.firstName} ${vacation.employee.lastName}`
        : '';
      const matchesSearch =
        employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vacation.employee?.employeeNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDepartment = filterDepartment === 'all' || vacation.employee?.department === filterDepartment;
      return matchesSearch && matchesDepartment;
    });
  }, [vacations, searchQuery, filterDepartment]);

  const stats = useMemo(() => ({
    total: vacationsData?.total ?? vacations.length,
    pending: vacations.filter(v => v.status === 'PENDING').length,
    approved: vacations.filter(v => v.status === 'APPROVED').length,
    rejected: vacations.filter(v => v.status === 'REJECTED').length,
    daysRequestedPending: vacations.filter(v => v.status === 'PENDING').reduce((acc, v) => acc + v.daysRequested, 0),
  }), [vacations, vacationsData]);

  const handleApprove = async (id: string) => {
    try {
      await approveVacation.mutateAsync({ id });
      toast.success('Solicitud de vacaciones aprobada');
    } catch {
      toast.error('Error al aprobar la solicitud');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectVacation.mutateAsync({ id, reason: 'Rechazado por administrador' });
      toast.success('Solicitud de vacaciones rechazada');
    } catch {
      toast.error('Error al rechazar la solicitud');
    }
  };

  const handleExport = () => {
    toast.success('Exportando solicitudes de vacaciones...');
  };

  // Modal handlers
  const openCreateModal = () => {
    setVacationFormData({
      startDate: '',
      endDate: '',
      reason: '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setVacationFormData({});
  };

  const handleCreateVacation = async () => {
    if (!vacationFormData.startDate || !vacationFormData.endDate) {
      toast.error('Las fechas de inicio y fin son obligatorias');
      return;
    }

    if (new Date(vacationFormData.endDate) < new Date(vacationFormData.startDate)) {
      toast.error('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }

    try {
      const dto: CreateVacationDto = {
        startDate: vacationFormData.startDate,
        endDate: vacationFormData.endDate,
        reason: vacationFormData.reason || undefined,
      };
      await createVacation.mutateAsync(dto);
      toast.success('Solicitud de vacaciones creada correctamente');
      closeModal();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Error al crear la solicitud de vacaciones'
      );
    }
  };

  const getAvatarUrl = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=003B7A&color=fff`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startStr = startDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    const endStr = endDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Vacaciones</h1>
          <p className="text-gray-600">Solicitudes y aprobaciones de vacaciones</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-10 w-10 bg-gray-200 rounded-lg mb-2" />
                  <div className="h-6 w-12 bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="flex gap-4">
                    <div className="h-12 w-12 bg-gray-200 rounded-full" />
                    <div className="flex-1">
                      <div className="h-5 w-48 bg-gray-200 rounded mb-2" />
                      <div className="h-4 w-32 bg-gray-200 rounded" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Vacaciones</h1>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-700">
              <ExclamationTriangleIcon className="h-6 w-6" />
              <p>Error al cargar las vacaciones. Por favor, intenta de nuevo.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vacaciones</h1>
            <p className="text-gray-600">Solicitudes y aprobaciones de vacaciones</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/rrhh">
              <Button variant="secondary">
                Volver a RRHH
              </Button>
            </Link>
            <Button
              variant="primary"
              leftIcon={<PlusIcon className="h-5 w-5" />}
              onClick={openCreateModal}
            >
              Nueva Solicitud
            </Button>
          </div>
        </div>
      </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs text-gray-600">Total Solicitudes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <ClockIcon className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  <p className="text-xs text-gray-600">Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                  <p className="text-xs text-gray-600">Aprobadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircleIcon className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                  <p className="text-xs text-gray-600">Rechazadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#C8DDF2] to-[#C8DDF2]/90 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.daysRequestedPending}</p>
                  <p className="text-xs text-white/80">Días por Aprobar</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o número de empleado..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Department Filter */}
              <SearchableSelect
                options={departments.map(dept => ({
                  value: dept,
                  label: dept,
                }))}
                value={filterDepartment}
                onChange={(val) => setParams({ department: val })}
                allLabel="Todos los Departamentos"
                allValue="all"
              />

              {/* Status Filter */}
              <SearchableSelect
                options={[
                  { value: 'PENDING', label: 'Pendientes' },
                  { value: 'APPROVED', label: 'Aprobadas' },
                  { value: 'REJECTED', label: 'Rechazadas' },
                ]}
                value={filterStatus}
                onChange={(val) => setParams({ status: val })}
                allLabel="Todos los Estados"
                allValue="all"
              />

              {/* Export */}
              <Button
                variant="outline"
                leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
                onClick={handleExport}
              >
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Vacations List */}
        <div className="space-y-4">
          {filteredVacations.map((vacation) => {
            const StatusIcon = statusConfig[vacation.status]?.icon || ClockIcon;
            const employeeName = vacation.employee
              ? `${vacation.employee.firstName} ${vacation.employee.lastName}`
              : 'Empleado';
            const isPending = vacation.status === 'PENDING';
            const isProcessing = approveVacation.isPending || rejectVacation.isPending;

            return (
              <Card key={vacation.id} className={isPending ? 'border-l-4 border-l-yellow-500' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <img
                        src={getAvatarUrl(employeeName)}
                        alt={employeeName}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900">{employeeName}</h3>
                          <span className="text-sm text-gray-500">({vacation.employee?.employeeNumber || ''})</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{vacation.employee?.department || ''}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{formatDateRange(vacation.startDate, vacation.endDate)}</span>
                          </div>
                          <span className="text-gray-400">|</span>
                          <span className="font-semibold text-[#3E667D]">{vacation.daysRequested} días</span>
                        </div>
                        {vacation.reason && (
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Motivo:</span> {vacation.reason}
                          </p>
                        )}
                        {vacation.status === 'REJECTED' && vacation.rejectionReason && (
                          <p className="text-sm text-red-600 mt-1">
                            <span className="font-medium">Motivo rechazo:</span> {vacation.rejectionReason}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          Solicitado el {formatDate(vacation.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig[vacation.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                        <StatusIcon className="h-4 w-4" />
                        {statusConfig[vacation.status]?.label || vacation.status}
                      </span>

                      {isPending && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(vacation.id)}
                            className="text-red-600 hover:bg-red-50"
                            disabled={isProcessing}
                          >
                            <XCircleIcon className="h-4 w-4 mr-1" />
                            Rechazar
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprove(vacation.id)}
                            disabled={isProcessing}
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Aprobar
                          </Button>
                        </div>
                      )}

                      {vacation.reviewedBy && (
                        <p className="text-xs text-gray-500">
                          Revisado por ID: {vacation.reviewedBy}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredVacations.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <CalendarDaysIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No se encontraron solicitudes
              </h3>
              <p className="text-gray-600">
                Intenta ajustar los filtros de búsqueda
              </p>
            </CardContent>
          </Card>
        )}

      {/* Vacation Request Modal */}
      <VacationRequestModal
        isOpen={isModalOpen}
        onClose={closeModal}
        formData={vacationFormData}
        setFormData={setVacationFormData}
        onSubmit={handleCreateVacation}
        isSubmitting={createVacation.isPending}
      />
    </div>
  );
}

// ================================
// VACATION REQUEST MODAL COMPONENT
// ================================

interface VacationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function VacationRequestModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
}: VacationRequestModalProps) {
  if (!isOpen) return null;

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  // Calculate days between dates
  const calculateDays = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays > 0 ? diffDays : 0;
    }
    return 0;
  };

  const inputClassName =
    'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent';

  const daysCount = calculateDays();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Nueva Solicitud de Vacaciones
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Inicio <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.startDate ?? ''}
              onChange={(e) => handleChange('startDate', e.target.value)}
              className={inputClassName}
              required
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Fin <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.endDate ?? ''}
              onChange={(e) => handleChange('endDate', e.target.value)}
              min={formData.startDate || undefined}
              className={inputClassName}
              required
            />
          </div>

          {/* Days Count Info */}
          {daysCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-700">
                <CalendarDaysIcon className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {daysCount} {daysCount === 1 ? 'dia' : 'dias'} solicitados
                </span>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo / Notas
            </label>
            <textarea
              value={formData.reason ?? ''}
              onChange={(e) => handleChange('reason', e.target.value)}
              placeholder="Describe el motivo de la solicitud (opcional)"
              rows={3}
              className={inputClassName}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
          </Button>
        </div>
      </div>
    </div>
  );
}
