'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
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
import { useAttendanceReport, useManualAttendance } from '@/hooks/useHR';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PRESENT: { label: 'Completo', color: 'bg-green-100 text-green-700', icon: CheckCircleIcon },
  WORKING: { label: 'Trabajando', color: 'bg-blue-100 text-blue-700', icon: ClockIcon },
  ABSENT: { label: 'Ausente', color: 'bg-red-100 text-red-700', icon: XCircleIcon },
  VACATION: { label: 'Vacaciones', color: 'bg-yellow-100 text-yellow-700', icon: CalendarIcon },
  LATE: { label: 'Retardo', color: 'bg-orange-100 text-orange-700', icon: ClockIcon },
};

export default function AsistenciaPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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
    const branchSet = new Set(attendance.map(a => a.employee?.branch).filter(Boolean));
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
              variant="primary"
              leftIcon={<ChartBarIcon className="h-5 w-5" />}
              onClick={() => toast.info('Reportes detallados próximamente')}
            >
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

          <Card className="bg-gradient-to-br from-[#7AB82E] to-[#7AB82E]/90 text-white">
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
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
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
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Branch Filter */}
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
              >
                <option value="all">Todas las Sucursales</option>
                {branches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
              >
                <option value="all">Todos los Estados</option>
                <option value="PRESENT">Completo</option>
                <option value="WORKING">Trabajando</option>
                <option value="ABSENT">Ausente</option>
                <option value="VACATION">Vacaciones</option>
              </select>

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

        {/* Attendance Table */}
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Empleado</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Sucursal</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">Entrada</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">Salida</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">Horas</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">Estado</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(filteredAttendance as unknown as Array<{id: string; employeeId?: string; status?: string; checkIn?: string; checkOut?: string; hoursWorked?: number; employee?: {firstName: string; lastName: string; employeeNumber?: string; branch?: string}}>).map((record) => {
                    const StatusIcon = statusConfig[record.status || 'PRESENT']?.icon || ClockIcon;
                    const employeeName = record.employee
                      ? `${record.employee.firstName} ${record.employee.lastName}`
                      : 'Empleado';
                    const checkInTime = formatTime(record.checkIn || null);
                    const checkOutTime = formatTime(record.checkOut || null);

                    return (
                      <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
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
                        </td>
                        <td className="py-4 px-4 text-gray-600">{record.employee?.branch || 'Sin asignar'}</td>
                        <td className="py-4 px-4 text-center">
                          {checkInTime ? (
                            <div className="flex items-center justify-center gap-1 text-green-600">
                              <ArrowRightOnRectangleIcon className="h-4 w-4" />
                              <span className="font-medium">{checkInTime}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {checkOutTime ? (
                            <div className="flex items-center justify-center gap-1 text-red-600">
                              <ArrowLeftOnRectangleIcon className="h-4 w-4" />
                              <span className="font-medium">{checkOutTime}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {record.hoursWorked ? (
                            <span className="font-semibold text-gray-900">{record.hoursWorked.toFixed(1)}h</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[record.status || 'PRESENT']?.color || 'bg-gray-100 text-gray-700'}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig[record.status || 'PRESENT']?.label || record.status}
                          </span>
                        </td>
                        <td className="py-4 px-4">
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredAttendance.length === 0 && (
              <div className="text-center py-12">
                <ClockIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No se encontraron registros
                </h3>
                <p className="text-gray-600">
                  Intenta ajustar los filtros de búsqueda o seleccionar otra fecha
                </p>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
