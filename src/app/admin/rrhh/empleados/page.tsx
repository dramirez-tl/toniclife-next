'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  BriefcaseIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useEmployees, useCreateEmployee, useUpdateEmployee } from '@/hooks/useHR';
import { useActiveBranches } from '@/hooks/useBranches';
import type { Employee, EmployeeStatus, CreateEmployeeDto, UpdateEmployeeDto } from '@/types/hr';

const statusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Activo', color: 'bg-green-100 text-green-700' },
  INACTIVE: { label: 'Inactivo', color: 'bg-gray-100 text-gray-700' },
  ON_LEAVE: { label: 'Vacaciones', color: 'bg-yellow-100 text-yellow-700' },
  TERMINATED: { label: 'Baja', color: 'bg-red-100 text-red-700' },
};

export default function EmpleadosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterStatus, setFilterStatus] = useState<EmployeeStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Mutation hooks
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  // Fetch employees from API
  const { data: employeesData, isLoading, error } = useEmployees({
    search: searchQuery || undefined,
    department: filterDepartment !== 'all' ? filterDepartment : undefined,
    branchId: filterBranch !== 'all' ? filterBranch : undefined,
    status: filterStatus !== 'all' ? filterStatus : undefined,
    page,
    limit: 20,
  });

  const employees = employeesData?.data ?? [];
  const pagination = employeesData?.pagination;

  // Extract unique departments and branches from data
  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(depts);
  }, [employees]);

  const branches = useMemo(() => {
    const branchSet = new Set(employees.map(e => e.branch).filter(Boolean));
    return Array.from(branchSet);
  }, [employees]);

  const stats = useMemo(() => ({
    total: pagination?.total ?? employees.length,
    active: employees.filter(e => e.status === 'ACTIVE').length,
    onLeave: employees.filter(e => e.status === 'ON_LEAVE').length,
    managers: employees.filter(e => e.isManager).length,
  }), [employees, pagination]);

  const handleExport = () => {
    toast.success('Exportando datos de empleados...');
  };

  // Modal handlers
  const openCreateModal = () => {
    setEditingEmployee(null);
    setFormData({
      userId: '',
      employeeNumber: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      branchId: '',
      hireDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      isManager: false,
      vacationDaysPerYear: 12,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone ?? '',
      position: employee.position,
      department: employee.department ?? '',
      branchId: employee.branchId ?? '',
      hireDate: employee.hireDate ? employee.hireDate.split('T')[0] : '',
      status: employee.status,
      isManager: employee.isManager,
      vacationDaysPerYear: employee.vacationDaysPerYear ?? 12,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormData({});
  };

  const handleSubmit = async () => {
    try {
      if (editingEmployee) {
        const dto: UpdateEmployeeDto = {
          position: formData.position || undefined,
          department: formData.department || undefined,
          branchId: formData.branchId || undefined,
          isManager: formData.isManager,
          vacationDaysPerYear: formData.vacationDaysPerYear ? Number(formData.vacationDaysPerYear) : undefined,
          status: formData.status as EmployeeStatus,
        };
        await updateEmployee.mutateAsync({ id: editingEmployee.id, data: dto });
        toast.success('Empleado actualizado correctamente');
      } else {
        const dto: CreateEmployeeDto = {
          userId: formData.userId,
          employeeNumber: formData.employeeNumber,
          position: formData.position,
          department: formData.department || undefined,
          branchId: formData.branchId,
          isManager: formData.isManager,
          hireDate: formData.hireDate,
          vacationDaysPerYear: formData.vacationDaysPerYear ? Number(formData.vacationDaysPerYear) : undefined,
        };
        await createEmployee.mutateAsync(dto);
        toast.success('Empleado creado correctamente');
      }
      closeModal();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          (editingEmployee ? 'Error al actualizar el empleado' : 'Error al crear el empleado')
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getAvatarUrl = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=003B7A&color=fff`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
          <p className="text-gray-600">Gestión de personal y expedientes</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-8 w-8 bg-gray-200 rounded mb-4" />
                  <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                  <div className="h-8 w-16 bg-gray-200 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-700">
              <ExclamationTriangleIcon className="h-6 w-6" />
              <p>Error al cargar los empleados. Por favor, intenta de nuevo.</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
            <p className="text-gray-600">Gestión de personal y expedientes</p>
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
              Nuevo Empleado
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Empleados</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <UserGroupIcon className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Activos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">En Vacaciones</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.onLeave}</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Gerentes</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.managers}</p>
                </div>
                <BriefcaseIcon className="h-8 w-8 text-purple-500" />
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
                    placeholder="Buscar por nombre, email o número de empleado..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Department Filter */}
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
              >
                <option value="all">Todos los Departamentos</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              {/* Branch Filter */}
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
              >
                <option value="all">Todas las Sucursales</option>
                {branches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
              >
                <option value="all">Todos los Estados</option>
                <option value="ACTIVE">Activos</option>
                <option value="ON_LEAVE">En Vacaciones</option>
                <option value="INACTIVE">Inactivos</option>
              </select>

              {/* Export Button */}
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

        {/* Employees Table */}
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Empleado</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Puesto</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Departamento</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Sucursal</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Ingreso</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Vacaciones</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Estado</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => {
                    const vacationDays = employee.vacationDaysPerYear ?? 12;
                    const vacationUsed = employee.vacationDaysUsed ?? 0;
                    const vacationRemaining = vacationDays - vacationUsed;
                    const fullName = `${employee.firstName} ${employee.lastName}`;

                    return (
                      <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={getAvatarUrl(fullName)}
                              alt={fullName}
                              className="w-10 h-10 rounded-full"
                            />
                            <div>
                              <p className="font-semibold text-gray-900">{fullName}</p>
                              <p className="text-sm text-gray-500">{employee.employeeNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <p className="text-gray-900">{employee.position}</p>
                            {employee.isManager && (
                              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                                Gerente
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-600">{employee.department}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1 text-gray-600">
                            <BuildingOfficeIcon className="h-4 w-4" />
                            <span>{employee.branch || 'Sin asignar'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {formatDate(employee.hireDate)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm">
                            <span className="font-semibold text-gray-900">
                              {vacationRemaining}
                            </span>
                            <span className="text-gray-500"> / {vacationDays} días</span>
                          </div>
                          <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{
                                width: `${Math.max(0, (vacationRemaining / vacationDays) * 100)}%`,
                              }}
                            />
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[employee.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                            {statusConfig[employee.status]?.label || employee.status}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(employee)}
                              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar empleado"
                            >
                              <PencilIcon className="h-4 w-4 text-blue-600" />
                            </button>
                            <a
                              href={`mailto:${employee.email}`}
                              className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                              title="Enviar email"
                            >
                              <EnvelopeIcon className="h-4 w-4 text-green-600" />
                            </a>
                            {employee.phone && (
                              <a
                                href={`tel:${employee.phone}`}
                                className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Llamar"
                              >
                                <PhoneIcon className="h-4 w-4 text-purple-600" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {employees.length === 0 && (
              <div className="text-center py-12">
                <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No se encontraron empleados
                </h3>
                <p className="text-gray-600">
                  Intenta ajustar los filtros de búsqueda
                </p>
              </div>
            )}

            {/* Pagination */}
            {employees.length > 0 && pagination && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Mostrando {employees.length} de {pagination.total} empleados
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.pages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Employee Create/Edit Modal */}
      <EmployeeFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        editingEmployee={editingEmployee}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isSubmitting={createEmployee.isPending || updateEmployee.isPending}
      />
    </div>
  );
}

// ================================
// EMPLOYEE FORM MODAL COMPONENT
// ================================

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingEmployee: Employee | null;
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'INACTIVE', label: 'Inactivo' },
  { value: 'ON_LEAVE', label: 'En Vacaciones' },
  { value: 'TERMINATED', label: 'Baja' },
];

function EmployeeFormModal({
  isOpen,
  onClose,
  editingEmployee,
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
}: EmployeeFormModalProps) {
  const { data: branchesData } = useActiveBranches();
  const activeBranches = branchesData ?? [];

  if (!isOpen) return null;

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const inputClassName =
    'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}
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
          {/* Row: First Name + Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName ?? ''}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="Nombre"
                className={inputClassName}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName ?? ''}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Apellido"
                className={inputClassName}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email ?? ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="correo@ejemplo.com"
              className={inputClassName}
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefono
            </label>
            <input
              type="tel"
              value={formData.phone ?? ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+52 123 456 7890"
              className={inputClassName}
            />
          </div>

          {/* Only show these fields for create */}
          {!editingEmployee && (
            <>
              {/* User ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID de Usuario <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.userId ?? ''}
                  onChange={(e) => handleChange('userId', e.target.value)}
                  placeholder="ID del usuario en el sistema"
                  className={inputClassName}
                  required
                />
              </div>

              {/* Employee Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numero de Empleado <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.employeeNumber ?? ''}
                  onChange={(e) => handleChange('employeeNumber', e.target.value)}
                  placeholder="EMP-001"
                  className={inputClassName}
                  required
                />
              </div>
            </>
          )}

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Puesto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.position ?? ''}
              onChange={(e) => handleChange('position', e.target.value)}
              placeholder="Ej: Gerente de Ventas"
              className={inputClassName}
              required
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departamento
            </label>
            <input
              type="text"
              value={formData.department ?? ''}
              onChange={(e) => handleChange('department', e.target.value)}
              placeholder="Ej: Ventas, Operaciones, RRHH"
              className={inputClassName}
            />
          </div>

          {/* Branch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sucursal {!editingEmployee && <span className="text-red-500">*</span>}
            </label>
            <select
              value={formData.branchId ?? ''}
              onChange={(e) => handleChange('branchId', e.target.value)}
              className={inputClassName}
            >
              <option value="">Seleccionar sucursal...</option>
              {activeBranches.map((branch: any) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Hire Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Ingreso {!editingEmployee && <span className="text-red-500">*</span>}
            </label>
            <input
              type="date"
              value={formData.hireDate ?? ''}
              onChange={(e) => handleChange('hireDate', e.target.value)}
              className={inputClassName}
            />
          </div>

          {/* Vacation Days Per Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dias de Vacaciones por Ano
            </label>
            <input
              type="number"
              min="0"
              max="60"
              value={formData.vacationDaysPerYear ?? 12}
              onChange={(e) => handleChange('vacationDaysPerYear', e.target.value)}
              className={inputClassName}
            />
          </div>

          {/* Status - only for edit */}
          {editingEmployee && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={formData.status ?? 'ACTIVE'}
                onChange={(e) => handleChange('status', e.target.value)}
                className={inputClassName}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Is Manager */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isManager"
              checked={formData.isManager ?? false}
              onChange={(e) => handleChange('isManager', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#3E667D] focus:ring-[#3E667D]"
            />
            <label htmlFor="isManager" className="text-sm font-medium text-gray-700">
              Es Gerente / Supervisor
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? 'Guardando...'
              : editingEmployee
                ? 'Guardar Cambios'
                : 'Crear Empleado'}
          </Button>
        </div>
      </div>
    </div>
  );
}
