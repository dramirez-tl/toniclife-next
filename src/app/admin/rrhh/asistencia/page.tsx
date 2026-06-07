'use client';

import { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ClockIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  UserGroupIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, type DataTableColumn } from '@/components/ui';
import { useAttendanceReport, useManualAttendance } from '@/hooks/useHR';
import { useQueryFilters } from '@/hooks/useQueryFilters';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PRESENT: { label: 'Completo', color: 'bg-green-100 text-green-700', icon: CheckCircleIcon },
  WORKING: { label: 'Trabajando', color: 'bg-blue-100 text-blue-700', icon: ClockIcon },
  ABSENT: { label: 'Ausente', color: 'bg-red-100 text-red-700', icon: XCircleIcon },
  VACATION: { label: 'Vacaciones', color: 'bg-yellow-100 text-yellow-700', icon: CalendarIcon },
  LATE: { label: 'Retardo', color: 'bg-orange-100 text-orange-700', icon: ClockIcon },
};

const todayStr = () => new Date().toISOString().split('T')[0];

type AttendanceRecord = {
  id: string;
  employeeId?: string;
  status?: string;
  checkIn?: string;
  checkOut?: string;
  hoursWorked?: number;
  employee?: { firstName: string; lastName: string; employeeNumber?: string; branch?: string };
};

export default function AsistenciaPage() {
  return (
    <Suspense>
      <AsistenciaContent />
    </Suspense>
  );
}

function AsistenciaContent() {
  const { get, setParams } = useQueryFilters({
    status: 'all',
    branch: 'all',
  });

  const filterStatus = get('status');
  const filterBranch = get('branch');
  const selectedDate = get('date') || todayStr();

  const [searchQuery, setSearchQuery] = useState('');

  // Get date range for single day
  const startDate = selectedDate;
  const endDate = selectedDate;

  // Fetch attendance from API
  const { data: attendanceData, isLoading, error } = useAttendanceReport({
    startDate,
    endDate,
    branchId: filterBranch !== 'all' ? filterBranch : undefined,
  });

  const manualAttendance = useManualAttendance();

  const attendance = attendanceData?.data ?? [];

  // Filter attendance locally
  const filteredAttendance = useMemo(() => {
    return attendance.filter(record => {
      const employeeName = record.employee
        ? `${record.employee.firstName} ${record.employee.lastName}`
        : '';
      const matchesSearch =
        employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.employee?.employeeNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || record.type === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [attendance, searchQuery, filterStatus]);

  // Extract branches from data
  const branches = useMemo(() => {
    const branchSet = new Set(attendance.map(a => a.employee?.branch).filter((b): b is string => !!b));
    return Array.from(branchSet);
  }, [attendance]);

  const stats = useMemo(() => {
    // Cast to any for API compatibility - the actual API response may have different shape
    const records = attendance as unknown as Array<{status?: string; hoursWorked?: number}>;
    const presentCount = records.filter(a => a.status === 'PRESENT' || a.status === 'WORKING').length;
    const absentCount = records.filter(a => a.status === 'ABSENT').length;
    const vacationCount = records.filter(a => a.status === 'VACATION').length;
    const withHours = records.filter(a => a.hoursWorked && a.hoursWorked > 0);
    const avgHours = withHours.length > 0
      ? withHours.reduce((acc, a) => acc + (a.hoursWorked || 0), 0) / withHours.length
      : 0;

    return {
      total: attendanceData?.summary?.totalPresent ?? attendance.length,
      present: presentCount,
      absent: absentCount,
      onVacation: vacationCount,
      avgHours,
    };
  }, [attendance, attendanceData]);

  const handleExport = () => {
    toast.success('Exportando reporte de asistencia...');
  };

  const handleManualCheckIn = async (employeeId: string) => {
    try {
      await manualAttendance.mutateAsync({
        employeeId,
        timestamp: new Date().toISOString(),
        type: 'CHECK_IN',
      });
      toast.success('Entrada registrada manualmente');
    } catch {
      toast.error('Error al registrar entrada');
    }
  };

  const handleManualCheckOut = async (employeeId: string) => {
    try {
      await manualAttendance.mutateAsync({
        employeeId,
        timestamp: new Date().toISOString(),
        type: 'CHECK_OUT',
      });
      toast.success('Salida registrada manualmente');
    } catch {
      toast.error('Error al registrar salida');
    }
  };

  const getAvatarUrl = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=003B7A&color=fff`;
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns = useMemo<DataTableColumn<AttendanceRecord>[]>(() => [
    {
      key: 'employee',
      header: 'Empleado',
      render: (record) => {
        const employeeName = record.employee
          ? `${record.employee.firstName} ${record.employee.lastName}`
          : 'Empleado';
        return (
          <div className="flex items-center gap-3">
            <img
              src={getAvatarUrl(employeeName)}
              alt={employeeName}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="font-semibold text-gray-900">{employeeName}</p>
              <p className="text-sm text-gray-500">{record.employee?.employeeNumber || ''}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'branch',
      header: 'Sucursal',
      cellClassName: 'text-gray-600',
      render: (record) => record.employee?.branch || 'Sin asignar',
    },
    {
      key: 'checkIn',
      header: 'Entrada',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (record) => {
        const checkInTime = formatTime(record.checkIn || null);
        return checkInTime ? (
          <div className="flex items-center justify-center gap-1 text-green-600">
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            <span className="font-medium">{checkInTime}</span>
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        );
      },
    },
    {
      key: 'checkOut',
      header: 'Salida',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (record) => {
        const checkOutTime = formatTime(record.checkOut || null);
        return checkOutTime ? (
          <div className="flex items-center justify-center gap-1 text-red-600">
            <ArrowLeftOnRectangleIcon className="h-4 w-4" />
            <span className="font-medium">{checkOutTime}</span>
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        );
      },
    },
    {
      key: 'hoursWorked',
      header: 'Horas',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (record) => record.hoursWorked ? (
        <span className="font-semibold text-gray-900">{record.hoursWorked.toFixed(1)}h</span>
      ) : (
        <span className="text-gray-400">—</span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (record) => {
        const StatusIcon = statusConfig[record.status || 'PRESENT']?.icon || ClockIcon;
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[record.status || 'PRESENT']?.color || 'bg-gray-100 text-gray-700'}`}>
            <StatusIcon className="h-3 w-3" />
            {statusConfig[record.status || 'PRESENT']?.label || record.status}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      render: (record) => (
        <div className="flex items-center justify-end gap-2">
          {!record.checkIn && record.status !== 'VACATION' && record.employeeId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleManualCheckIn(record.employeeId!)}
              disabled={manualAttendance.isPending}
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 text-green-600" />
            </Button>
          )}
          {record.checkIn && !record.checkOut && record.employeeId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleManualCheckOut(record.employeeId!)}
              disabled={manualAttendance.isPending}
            >
              <ArrowLeftOnRectangleIcon className="h-4 w-4 text-red-600" />
            </Button>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [manualAttendance.isPending]);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Control de Asistencia</h1>
          <p className="text-gray-600">Registro de entradas, salidas y horas trabajadas</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Control de Asistencia</h1>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-700">
              <ExclamationTriangleIcon className="h-6 w-6" />
              <p>Error al cargar los datos de asistencia. Por favor, intenta de nuevo.</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Control de Asistencia</h1>
            <p className="text-gray-600">Registro de entradas, salidas y horas trabajadas</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/rrhh">
              <Button variant="secondary">
                Volver a RRHH
              </Button>
            </Link>
            <Button
              variant="default"
              onClick={() => toast.info('Reportes detallados próximamente')}
            >
              <ChartBarIcon className="h-5 w-5" />
              Ver Reportes
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
                  <UserGroupIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs text-gray-600">Total Empleados</p>
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
                  <p className="text-2xl font-bold text-green-600">{stats.present}</p>
                  <p className="text-xs text-gray-600">Presentes Hoy</p>
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
                  <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                  <p className="text-xs text-gray-600">Ausentes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.onVacation}</p>
                  <p className="text-xs text-gray-600">Vacaciones</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#C8DDF2] to-[#C8DDF2]/90 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <ClockIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgHours.toFixed(1)}h</p>
                  <p className="text-xs text-white/80">Promedio Horas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Date Picker */}
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setParams({ date: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                />
              </div>

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
              />

              {/* Status Filter */}
              <SearchableSelect
                options={[
                  { value: 'PRESENT', label: 'Completo' },
                  { value: 'WORKING', label: 'Trabajando' },
                  { value: 'ABSENT', label: 'Ausente' },
                  { value: 'VACATION', label: 'Vacaciones' },
                ]}
                value={filterStatus}
                onChange={(val) => setParams({ status: val })}
                allLabel="Todos los Estados"
                allValue="all"
              />

              {/* Export */}
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

        {/* Attendance Table */}
        <Card>
          <CardContent className="p-6">
            <DataTable<AttendanceRecord>
              columns={columns}
              data={filteredAttendance as unknown as AttendanceRecord[]}
              getRowKey={(record, index) => String(record.id ?? index)}
              emptyState={
                <div className="text-center py-12">
                  <ClockIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No se encontraron registros
                  </h3>
                  <p className="text-gray-600">
                    Intenta ajustar los filtros de búsqueda o seleccionar otra fecha
                  </p>
                </div>
              }
            />
          </CardContent>
        </Card>
    </div>
  );
}
