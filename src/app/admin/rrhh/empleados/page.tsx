'use client';

import { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { parsePhone, isValidLocalNumber } from '@/lib/phone';
import { DataTable, type DataTableColumn } from '@/components/ui';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDepartments } from '@/hooks/useHR';
import { useActiveBranches } from '@/hooks/useBranches';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import type { Employee, EmployeeStatus, CreateEmployeeDto, UpdateEmployeeDto } from '@/types/hr';

const statusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Activo', color: 'bg-green-100 text-green-700' },
  INACTIVE: { label: 'Inactivo', color: 'bg-gray-100 text-gray-700' },
  ON_LEAVE: { label: 'Vacaciones', color: 'bg-yellow-100 text-yellow-700' },
  TERMINATED: { label: 'Baja', color: 'bg-red-100 text-red-700' },
};

export default function EmpleadosPage() {
  return (
    <Suspense>
      <EmpleadosContent />
    </Suspense>
  );
}

function EmpleadosContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    department: 'all',
    branch: 'all',
    status: 'all',
    page: '1',
  });

  const filterDepartment = get('department');
  const filterBranch = get('branch');
  const filterStatus = get('status');
  const page = getNumber('page') || 1;
  const searchQuery = get('search');

  const [searchInput, setSearchInput] = useState(searchQuery);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Mutation hooks
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  // Catálogo de departamentos (tabla departments)
  const { data: departmentsCatalog } = useDepartments();
  const departmentOptions = useMemo(
    () => (departmentsCatalog ?? []).map((d) => ({ value: d.id, label: d.name })),
    [departmentsCatalog],
  );

  // Fetch employees from API
  const { data: employeesData, isLoading, error } = useEmployees({
    search: searchQuery || undefined,
    departmentId: filterDepartment !== 'all' ? filterDepartment : undefined,
    branchId: filterBranch !== 'all' ? filterBranch : undefined,
    status: filterStatus !== 'all' ? (filterStatus as EmployeeStatus) : undefined,
    page,
    limit: 20,
  });

  const employees = employeesData?.data ?? [];
  const pagination = employeesData?.pagination;

  const branches = useMemo(() => {
    const branchSet = new Set(employees.map(e => e.branch).filter((b): b is string => !!b));
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
      departmentId: '',
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
      secondLastName: employee.secondLastName ?? '',
      noiNumber: employee.noiNumber ?? '',
      email: employee.email,
      phone: employee.phone ?? '',
      position: employee.position,
      departmentId: employee.departmentId ?? '',
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
    if (formData.phone) {
      const p = parsePhone(formData.phone);
      if (!isValidLocalNumber(p.country, p.number)) {
        toast.error(`Teléfono incompleto: ${p.country.name} requiere ${p.country.digits} dígitos`);
        return;
      }
    }
    try {
      if (editingEmployee) {
        const dto: UpdateEmployeeDto = {
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          secondLastName: formData.secondLastName ?? undefined,
          noiNumber: formData.noiNumber ?? undefined,
          phone: formData.phone || undefined,
          departmentId: formData.departmentId || undefined,
          branchId: formData.branchId || undefined,
          hireDate: formData.hireDate || undefined,
          isManager: formData.isManager,
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
    // Parsear la parte de fecha como local para evitar el corrimiento de 1 día
    // por timezone (un DATE serializado a medianoche UTC se mostraba un día antes).
    const [y, m, d] = (dateString || '').split('T')[0].split('-').map(Number);
    if (!y || !m || !d) return dateString;
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getAvatarUrl = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=003B7A&color=fff`;
  };

  const columns: DataTableColumn<Employee>[] = [
    {
      key: 'employee',
      header: 'Empleado',
      render: (employee) => {
        const fullName = `${employee.firstName} ${employee.lastName} ${employee.secondLastName ?? ''}`.trim();
        return (
          <div className="flex items-center gap-3">
            <img
              src={getAvatarUrl(fullName)}
              alt={fullName}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="font-semibold text-gray-900">{fullName}</p>
              <p className="text-sm text-gray-500">
                {employee.employeeNumber}
                {employee.noiNumber ? ` · NOI: ${employee.noiNumber}` : ''}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'position',
      header: 'Puesto',
      render: (employee) => (
        <div className="flex items-center gap-2">
          <p className="text-gray-900">{employee.position}</p>
          {employee.isManager && (
            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
              Jefe
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Departamento',
      cellClassName: 'text-gray-600',
      render: (employee) => employee.department || <span className="text-gray-400">Sin asignar</span>,
    },
    {
      key: 'branch',
      header: 'Sucursal',
      render: (employee) => (
        <div className="flex items-center gap-1 text-gray-600">
          <BuildingOfficeIcon className="h-4 w-4" />
          <span>{employee.branch || 'No aplica'}</span>
        </div>
      ),
    },
    {
      key: 'hireDate',
      header: 'Ingreso',
      cellClassName: 'text-sm text-gray-600',
      render: (employee) => formatDate(employee.hireDate),
    },
    {
      key: 'vacation',
      header: 'Vacaciones',
      render: (employee) => {
        const vacationDays = employee.vacationDaysPerYear ?? 12;
        const vacationUsed = employee.vacationDaysUsed ?? 0;
        const vacationRemaining = vacationDays - vacationUsed;
        return (
          <>
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
          </>
        );
      },
    },
    {
      key: 'status',
      header: 'Estado',
      render: (employee) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[employee.status]?.color || 'bg-gray-100 text-gray-700'}`}>
          {statusConfig[employee.status]?.label || employee.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      render: (employee) => (
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
      ),
    },
  ];

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
            <Link href="/admin/usuarios">
              <Button variant="default">
                <PlusIcon className="h-5 w-5" />
                Nuevo Colaborador
              </Button>
            </Link>
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
                  <p className="text-sm text-gray-600">Jefes</p>
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
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setParams({ search: e.target.value });
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Department Filter (catálogo real) */}
              <SearchableSelect
                options={departmentOptions}
                value={filterDepartment}
                onChange={(val) => setParams({ department: val })}
                allLabel="Todos los Departamentos"
                allValue="all"
                className="w-full lg:w-56"
              />

              {/* Branch Filter */}
              <SearchableSelect
                options={branches.map(branch => ({
                  value: branch,
                  label: branch,
                }))}
                value={filterBranch}
                onChange={(val) => setParams({ branch: val })}
                allLabel="Todas las Sucursales"
                allValue="all"
                className="w-full lg:w-52"
              />

              {/* Status Filter */}
              <SearchableSelect
                options={[
                  { value: 'ACTIVE', label: 'Activos' },
                  { value: 'ON_LEAVE', label: 'En Vacaciones' },
                  { value: 'INACTIVE', label: 'Inactivos' },
                ]}
                value={filterStatus}
                onChange={(val) => setParams({ status: val })}
                allLabel="Todos los Estados"
                allValue="all"
                className="w-full lg:w-48"
              />

              {/* Export Button */}
              <Button
                variant="outline"
                onClick={handleExport}
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Employees Table */}
        <Card>
          <CardContent className="p-6">
            <DataTable<Employee>
              columns={columns}
              data={employees}
              getRowKey={(employee) => employee.id}
              emptyState={
                <div className="text-center py-12">
                  <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No se encontraron empleados
                  </h3>
                  <p className="text-gray-600">
                    Intenta ajustar los filtros de búsqueda
                  </p>
                </div>
              }
            />

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
                    onClick={() => setParams({ page: String(Math.max(1, page - 1)) })}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.pages}
                    onClick={() => setParams({ page: String(page + 1) })}
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
  const { data: departmentsCatalog } = useDepartments();

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
          {/* Nombre(s) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre(s) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.firstName ?? ''}
              onChange={(e) => handleChange('firstName', e.target.value)}
              placeholder="Nombre(s)"
              className={inputClassName}
              required
            />
          </div>

          {/* Apellidos */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido Paterno <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName ?? ''}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Apellido Paterno"
                className={inputClassName}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido Materno
              </label>
              <input
                type="text"
                value={formData.secondLastName ?? ''}
                onChange={(e) => handleChange('secondLastName', e.target.value)}
                placeholder="Apellido Materno"
                className={inputClassName}
              />
            </div>
          </div>

          {/* Número NOI (Aspel) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              N° de empleado Aspel NOI
            </label>
            <input
              type="text"
              value={formData.noiNumber ?? ''}
              onChange={(e) => handleChange('noiNumber', e.target.value)}
              placeholder="Vacío si no está en la nómina de NOI"
              className={inputClassName}
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Número con el que RRHH lo lleva en Aspel NOI (nómina). Opcional.
            </p>
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
              Teléfono
            </label>
            <PhoneInput
              value={formData.phone ?? ''}
              onChange={(v) => handleChange('phone', v)}
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

          {/* Department (catálogo) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departamento
            </label>
            <SearchableSelect
              options={(departmentsCatalog ?? []).map((d) => ({ value: d.id, label: d.name }))}
              value={formData.departmentId ?? ''}
              onChange={(val) => handleChange('departmentId', val)}
              showAllOption={false}
              placeholder="Seleccionar departamento..."
            />
          </div>

          {/* Branch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sucursal {!editingEmployee && <span className="text-red-500">*</span>}
            </label>
            <SearchableSelect
              options={activeBranches.map((branch: any) => ({
                value: branch.id,
                label: branch.name,
              }))}
              value={formData.branchId ?? ''}
              onChange={(val) => handleChange('branchId', val)}
              showAllOption={false}
              placeholder="Seleccionar sucursal..."
            />
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
              Dias de Vacaciones por Año
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
              <SearchableSelect
                options={STATUS_OPTIONS}
                value={formData.status ?? 'ACTIVE'}
                onChange={(val) => handleChange('status', val)}
                showAllOption={false}
              />
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
              Es Jefe / Subjefe
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="default" onClick={onSubmit} disabled={isSubmitting}>
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
