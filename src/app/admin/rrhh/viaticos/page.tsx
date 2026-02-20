'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  BanknotesIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PlusIcon,
  DocumentTextIcon,
  MapPinIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  EyeIcon,
  TruckIcon,
  HomeIcon,
  ShoppingBagIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useExpenses, useApproveExpense, useRejectExpense } from '@/hooks/useHR';
import { ExpenseStatus } from '@/types/hr';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: 'Borrador', color: 'bg-gray-100 text-gray-700', icon: DocumentTextIcon },
  PENDING: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: ClockIcon },
  SUBMITTED: { label: 'Enviado', color: 'bg-blue-100 text-blue-700', icon: DocumentTextIcon },
  APPROVED: { label: 'Aprobado', color: 'bg-green-100 text-green-700', icon: CheckCircleIcon },
  REJECTED: { label: 'Rechazado', color: 'bg-red-100 text-red-700', icon: XCircleIcon },
  VERIFIED: { label: 'Verificado', color: 'bg-purple-100 text-purple-700', icon: DocumentTextIcon },
  REFUNDED: { label: 'Reembolsado', color: 'bg-emerald-100 text-emerald-700', icon: BanknotesIcon },
};

const categoryConfig: Record<string, { label: string; icon: any; color: string }> = {
  TRANSPORTATION: { label: 'Transporte', icon: TruckIcon, color: 'text-blue-600' },
  LODGING: { label: 'Hospedaje', icon: HomeIcon, color: 'text-purple-600' },
  MEALS: { label: 'Alimentos', icon: ShoppingBagIcon, color: 'text-orange-600' },
  SUPPLIES: { label: 'Materiales', icon: ShoppingBagIcon, color: 'text-green-600' },
  OTHER: { label: 'Otros', icon: DocumentTextIcon, color: 'text-gray-600' },
};

export default function ViaticosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<ExpenseStatus | 'all'>('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);

  // Fetch expenses from API
  const { data: expensesData, isLoading, error } = useExpenses({
    status: filterStatus !== 'all' ? filterStatus : undefined,
  });

  const approveExpense = useApproveExpense();
  const rejectExpense = useRejectExpense();

  const expenses = expensesData?.data ?? [];

  // Extract departments from data
  const departments = useMemo(() => {
    const deptSet = new Set(expenses.map(e => e.employee?.department).filter(Boolean));
    return Array.from(deptSet);
  }, [expenses]);

  // Filter expenses locally
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const employeeName = expense.employee
        ? `${expense.employee.firstName} ${expense.employee.lastName}`
        : '';
      const matchesSearch =
        employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (expense.expenseNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDepartment = filterDepartment === 'all' || expense.employee?.department === filterDepartment;
      return matchesSearch && matchesDepartment;
    });
  }, [expenses, searchQuery, filterDepartment]);

  const stats = useMemo(() => ({
    total: expensesData?.total ?? expenses.length,
    pending: expenses.filter(e => e.status === 'PENDING' || e.status === 'SUBMITTED').length,
    approved: expenses.filter(e => e.status === 'APPROVED' || e.status === 'VERIFIED').length,
    refunded: expenses.filter(e => e.status === 'REFUNDED').length,
    totalPending: expenses
      .filter(e => e.status === 'PENDING' || e.status === 'SUBMITTED')
      .reduce((acc, e) => acc + e.totalAmount, 0),
  }), [expenses, expensesData]);

  const handleApprove = async (id: string) => {
    try {
      await approveExpense.mutateAsync({ id });
      toast.success('Viático aprobado correctamente');
    } catch {
      toast.error('Error al aprobar el viático');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectExpense.mutateAsync({ id, reason: 'Rechazado por administrador' });
      toast.success('Viático rechazado');
    } catch {
      toast.error('Error al rechazar el viático');
    }
  };

  const handleExport = () => {
    toast.success('Exportando viáticos...');
  };

  const getAvatarUrl = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=003B7A&color=fff`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
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
          <h1 className="text-2xl font-bold text-gray-900">Viáticos</h1>
          <p className="text-gray-600">Gestión de gastos de viaje y reembolsos</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
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
          <h1 className="text-2xl font-bold text-gray-900">Viáticos</h1>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-700">
              <ExclamationTriangleIcon className="h-6 w-6" />
              <p>Error al cargar los viáticos. Por favor, intenta de nuevo.</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Viáticos</h1>
            <p className="text-gray-600">Gestión de gastos de viaje y reembolsos</p>
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
              onClick={() => toast.info('Formulario de viático próximamente')}
            >
              Nuevo Viático
            </Button>
          </div>
        </div>
      </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BanknotesIcon className="h-5 w-5 text-blue-600" />
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
                  <p className="text-xs text-gray-600">Por Aprobar</p>
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
                  <p className="text-xs text-gray-600">Aprobados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#7AB82E] to-[#7AB82E]/90 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <CurrencyDollarIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalPending)}</p>
                  <p className="text-xs text-white/80">Monto Pendiente</p>
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
                    placeholder="Buscar por nombre, número o título..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Department Filter */}
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
              >
                <option value="all">Todos los Departamentos</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ExpenseStatus | 'all')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
              >
                <option value="all">Todos los Estados</option>
                <option value="PENDING">Pendientes</option>
                <option value="APPROVED">Aprobados</option>
                <option value="VERIFIED">Verificados</option>
                <option value="REFUNDED">Reembolsados</option>
                <option value="REJECTED">Rechazados</option>
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

        {/* Expenses List */}
        <div className="space-y-4">
          {filteredExpenses.map((expense) => {
            const StatusIcon = statusConfig[expense.status]?.icon || ClockIcon;
            const isExpanded = expandedExpense === expense.id;
            const employeeName = expense.employee
              ? `${expense.employee.firstName} ${expense.employee.lastName}`
              : 'Empleado';
            const isPending = expense.status === 'PENDING' || expense.status === 'SUBMITTED';
            const isProcessing = approveExpense.isPending || rejectExpense.isPending;

            return (
              <Card key={expense.id} className={isPending ? 'border-l-4 border-l-yellow-500' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <img
                        src={getAvatarUrl(employeeName)}
                        alt={employeeName}
                        className="w-12 h-12 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900">{expense.title}</h3>
                          {expense.expenseNumber && (
                            <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{expense.expenseNumber}</code>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {employeeName} · {expense.employee?.department || ''}
                        </p>
                        <div className="flex items-center gap-4 text-sm mt-2">
                          {expense.destination && (
                            <div className="flex items-center gap-1">
                              <MapPinIcon className="h-4 w-4 text-gray-400" />
                              <span>{expense.destination}</span>
                            </div>
                          )}
                          {expense.tripStartDate && expense.tripEndDate && (
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-4 w-4 text-gray-400" />
                              <span>{formatDateRange(expense.tripStartDate, expense.tripEndDate)}</span>
                            </div>
                          )}
                        </div>

                        {expense.status === 'REJECTED' && expense.rejectionReason && (
                          <p className="text-sm text-red-600 mt-2">
                            <span className="font-medium">Motivo:</span> {expense.rejectionReason}
                          </p>
                        )}

                        {/* Expandable Items */}
                        {isExpanded && expense.items && expense.items.length > 0 && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold text-gray-900 mb-3">Desglose de Gastos</h4>
                            <div className="space-y-2">
                              {expense.items.map((item, idx) => {
                                const category = categoryConfig[item.category];
                                const CategoryIcon = category?.icon || DocumentTextIcon;
                                return (
                                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                                    <div className="flex items-center gap-2">
                                      <CategoryIcon className={`h-4 w-4 ${category?.color || 'text-gray-600'}`} />
                                      <span className="text-sm text-gray-600">{item.description}</span>
                                    </div>
                                    <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-gray-400 mt-2">
                          Solicitado el {formatDate(expense.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 ml-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig[expense.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                        <StatusIcon className="h-4 w-4" />
                        {statusConfig[expense.status]?.label || expense.status}
                      </span>

                      <p className="text-2xl font-bold text-[#003B7A]">
                        {formatCurrency(expense.totalAmount)}
                      </p>

                      <div className="flex gap-2">
                        {expense.items && expense.items.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedExpense(isExpanded ? null : expense.id)}
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            {isExpanded ? 'Ocultar' : 'Ver Detalles'}
                          </Button>
                        )}

                        {isPending && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReject(expense.id)}
                              className="text-red-600 hover:bg-red-50"
                              disabled={isProcessing}
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleApprove(expense.id)}
                              disabled={isProcessing}
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>

                      {expense.approvedBy && (
                        <p className="text-xs text-gray-500">
                          Aprobado por ID: {expense.approvedBy}
                        </p>
                      )}
                      {expense.refundReference && (
                        <p className="text-xs text-emerald-600">
                          Ref: {expense.refundReference}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredExpenses.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <BanknotesIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No se encontraron viáticos
              </h3>
              <p className="text-gray-600">
                Intenta ajustar los filtros de búsqueda
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
