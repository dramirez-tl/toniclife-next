'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  UserGroupIcon,
  ClockIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  useHRStats,
  useHRRecentActivity,
  useHRPendingApprovals,
  useApproveVacation,
  useRejectVacation,
  useApproveExpense,
  useRejectExpense,
} from '@/hooks/useHR';
import { PermissionGuard } from '@/components/auth';

export default function RRHHDashboard() {
  const { data: stats, isLoading: loadingStats } = useHRStats();
  const { data: recentActivity, isLoading: loadingActivity } = useHRRecentActivity();
  const { data: pendingApprovals, isLoading: loadingApprovals } = useHRPendingApprovals();

  const approveVacationMutation = useApproveVacation();
  const rejectVacationMutation = useRejectVacation();
  const approveExpenseMutation = useApproveExpense();
  const rejectExpenseMutation = useRejectExpense();

  const handleApprove = async (item: { id: string; type: 'vacation' | 'expense' }) => {
    try {
      if (item.type === 'vacation') {
        await approveVacationMutation.mutateAsync({ id: item.id });
      } else {
        await approveExpenseMutation.mutateAsync({ id: item.id });
      }
      toast.success('Aprobado exitosamente');
    } catch {
      toast.error('Error al aprobar');
    }
  };

  const handleReject = async (item: { id: string; type: 'vacation' | 'expense' }) => {
    try {
      if (item.type === 'vacation') {
        await rejectVacationMutation.mutateAsync({ id: item.id, reason: 'Rechazado por admin' });
      } else {
        await rejectExpenseMutation.mutateAsync({ id: item.id, reason: 'Rechazado por admin' });
      }
      toast.success('Rechazado exitosamente');
    } catch {
      toast.error('Error al rechazar');
    }
  };
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'attendance':
        return <ClockIcon className="h-4 w-4 text-blue-600" />;
      case 'vacation':
        return <CalendarDaysIcon className="h-4 w-4 text-green-600" />;
      case 'expense':
        return <BanknotesIcon className="h-4 w-4 text-purple-600" />;
      default:
        return <ChartBarIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  // Loading state
  if (loadingStats) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Recursos Humanos</h1>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg mb-2" />
                  <div className="h-6 w-12 bg-gray-200 rounded mb-1" />
                  <div className="h-3 w-20 bg-gray-200 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permissions={['hr:read', 'hr:*']}>
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <UserGroupIcon className="h-8 w-8 text-[#3E667D]" />
          <h1 className="text-2xl font-bold text-gray-900">Recursos Humanos</h1>
        </div>
        <p className="text-gray-600">
          Gestión de empleados, asistencia, vacaciones y viáticos
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserGroupIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalEmployees ?? 0}</p>
                <p className="text-xs text-gray-600">Empleados Total</p>
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
                <p className="text-2xl font-bold text-green-600">{stats?.activeEmployees ?? 0}</p>
                <p className="text-xs text-gray-600">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <CalendarDaysIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats?.onLeave ?? 0}</p>
                <p className="text-xs text-gray-600">En Vacaciones</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats?.pendingVacations ?? 0}</p>
                <p className="text-xs text-gray-600">Vacaciones Pend.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <BanknotesIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats?.pendingExpenses ?? 0}</p>
                <p className="text-xs text-gray-600">Viáticos Pend.</p>
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
                <p className="text-2xl font-bold">{stats?.todayAttendance ?? 0}</p>
                <p className="text-xs text-white/80">Asistencia Hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/admin/rrhh/empleados">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                    <UserGroupIcon className="h-7 w-7 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">Empleados</p>
                    <p className="text-sm text-gray-600">Gestionar personal</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/rrhh/asistencia">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                    <ClockIcon className="h-7 w-7 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">Asistencia</p>
                    <p className="text-sm text-gray-600">Control de horarios</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/rrhh/vacaciones">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center">
                    <CalendarDaysIcon className="h-7 w-7 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">Vacaciones</p>
                    <p className="text-sm text-gray-600">Solicitudes y aprobaciones</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/rrhh/viaticos">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                    <BanknotesIcon className="h-7 w-7 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">Viáticos</p>
                    <p className="text-sm text-gray-600">Gastos de viaje</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Pending Approvals */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Aprobaciones Pendientes</h2>
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                    {pendingApprovals?.length ?? 0} pendientes
                  </span>
                </div>

                {loadingApprovals ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                        <div className="flex-1">
                          <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                          <div className="h-3 w-48 bg-gray-200 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(pendingApprovals ?? []).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            item.type === 'vacation' ? 'bg-orange-100' : 'bg-purple-100'
                          }`}>
                            {item.type === 'vacation' ? (
                              <CalendarDaysIcon className="h-5 w-5 text-orange-600" />
                            ) : (
                              <BanknotesIcon className="h-5 w-5 text-purple-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{item.employeeName}</p>
                            <p className="text-sm text-gray-600">
                              {item.description}
                              {item.amount && ` - $${item.amount.toLocaleString('es-MX')} MXN`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(item)}
                            disabled={rejectVacationMutation.isPending || rejectExpenseMutation.isPending}
                          >
                            <XCircleIcon className="h-4 w-4 text-red-600" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApprove(item)}
                            disabled={approveVacationMutation.isPending || approveExpenseMutation.isPending}
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loadingApprovals && (pendingApprovals ?? []).length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600">No hay aprobaciones pendientes</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Actividad Reciente</h2>
                {loadingActivity ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse flex gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
                        <div className="flex-1">
                          <div className="h-3 w-full bg-gray-200 rounded mb-2" />
                          <div className="h-2 w-16 bg-gray-200 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(recentActivity ?? []).length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No hay actividad reciente</p>
                    ) : (
                      (recentActivity ?? []).map((activity) => (
                        <div key={activity.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">{activity.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatTime(activity.timestamp)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
