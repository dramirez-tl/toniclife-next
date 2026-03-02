'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  UserIcon,
  CalendarIcon,
  BanknotesIcon,
  ChartBarIcon,
  CalculatorIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  useAllCommissions,
  useApproveCommissions,
  useMarkCommissionsAsPaid,
  useCalculateCommissions,
  useCommissionPeriods,
  useCommissionPercentages,
} from '@/hooks/useCommissions';
import { useClosePeriod } from '@/hooks/useMlmPeriods';
import type { CommissionStatus } from '@/types/commissions';
import { PermissionGuard } from '@/components/auth';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useQueryFilters } from '@/hooks/useQueryFilters';

export default function ComisionesPage() {
  return <Suspense><ComisionesContent /></Suspense>;
}

function ComisionesContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    status: 'all',
    page: '1',
  });

  const filterStatus = get('status') as CommissionStatus | 'all';
  const filterPeriod = get('period');
  const searchQuery = get('search');
  const page = getNumber('page');

  // Fetch commissions from API
  const { data: commissionsData, isLoading } = useAllCommissions({
    periodId: filterPeriod || undefined,
    status: filterStatus !== 'all' ? filterStatus : undefined,
    search: searchQuery || undefined,
    page,
    limit: 20,
  });

  // Fetch periods for filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: periodsData } = useCommissionPeriods() as { data: any };

  // Fetch percentages for rates table
  const { data: percentages } = useCommissionPercentages();

  // Approve mutation
  const approveMutation = useApproveCommissions();

  // Mark as paid mutation
  const markPaidMutation = useMarkCommissionsAsPaid();

  // Calculate commissions mutation
  const calculateMutation = useCalculateCommissions();

  // Close period mutation
  const closePeriodMutation = useClosePeriod();

  // Computed values
  const commissions = commissionsData?.data || [];
  const summary = commissionsData?.summary;
  const totalResults = commissionsData?.total ?? 0;
  const totalPages = commissionsData?.totalPages ?? 1;
  // periodsData may be an array or an object with periods/data - handle both
  const periods: Array<{ id: string; name: string; code?: string; isCurrent?: boolean }> =
    Array.isArray(periodsData) ? periodsData : (periodsData?.periods ?? periodsData?.data ?? []);

  // Count pending commissions (calculated = pending approval)
  const pendingCount = commissions.filter(c => c.status === 'calculated').length;

  const handleApproveCommission = async (commissionId: string) => {
    try {
      await approveMutation.mutateAsync([commissionId]);
      toast.success(`Comisión aprobada para pago`);
    } catch {
      toast.error('Error al aprobar comisión');
    }
  };

  const handleApproveAll = async () => {
    const pendingIds = commissions
      .filter(c => c.status === 'calculated')
      .map(c => c.id);

    if (pendingIds.length === 0) {
      toast.info('No hay comisiones pendientes para aprobar');
      return;
    }

    try {
      await approveMutation.mutateAsync(pendingIds);
      toast.success(`${pendingIds.length} comisiones aprobadas para pago`);
    } catch {
      toast.error('Error al aprobar comisiones');
    }
  };

  const handleCalculateCommissions = async () => {
    const periodId = filterPeriod || periods.find((p) => p.isCurrent)?.id;
    if (!periodId) {
      toast.error('Selecciona un periodo primero');
      return;
    }
    try {
      await calculateMutation.mutateAsync({ periodId });
      toast.success('Comisiones calculadas exitosamente');
    } catch {
      toast.error('Error al calcular comisiones');
    }
  };

  const handleMarkAsPaid = async () => {
    const approvedIds = commissions
      .filter(c => c.status === 'approved')
      .map(c => c.id);

    if (approvedIds.length === 0) {
      toast.info('No hay comisiones aprobadas para marcar como pagadas');
      return;
    }

    try {
      await markPaidMutation.mutateAsync(approvedIds);
      toast.success(`${approvedIds.length} comisiones marcadas como pagadas`);
    } catch {
      toast.error('Error al marcar comisiones como pagadas');
    }
  };

  const handleClosePeriod = async () => {
    // Find the current/active period from the list
    const currentPeriod = periods.find((p) => p.isCurrent) || (periods.length > 0 ? periods[0] : null);
    if (!currentPeriod) {
      toast.info('No hay un periodo activo para cerrar');
      return;
    }

    try {
      await closePeriodMutation.mutateAsync(currentPeriod.id);
      toast.success(`Periodo "${currentPeriod.name}" cerrado exitosamente`);
    } catch {
      toast.error('Error al cerrar el periodo');
    }
  };

  // Count approved commissions for "Mark as Paid" button
  const approvedCount = commissions.filter(c => c.status === 'approved').length;

  const handleExport = () => {
    toast.success('Exportando datos de comisiones...');
  };

  // Commission rates from API or defaults
  const commissionRates = useMemo(() => {
    if (percentages && percentages.length > 0) {
      return percentages.map(p => ({
        level: `Nivel ${p.levelNumber}`,
        personalRate: parseFloat(p.basePercentage),
        teamRate: parseFloat(p.upgradedPercentage || '0'),
        minSales: (p.qualifiersRequired || 0) * 1000, // Approximate
      }));
    }
    return [
      { level: 'Nivel 1', personalRate: 5.0, teamRate: 7.0, minSales: 0 },
      { level: 'Nivel 2', personalRate: 2.5, teamRate: 4.0, minSales: 2000 },
      { level: 'Nivel 3', personalRate: 1.5, teamRate: 2.5, minSales: 3000 },
    ];
  }, [percentages]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'calculated':
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <ClockIcon className="h-3 w-3" />
            Pendiente
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Aprobada
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Pagada
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <XCircleIcon className="h-3 w-3" />
            Cancelada
          </span>
        );
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeLabels: Record<string, { label: string; color: string }> = {
      'mlm': { label: 'MLM', color: 'bg-blue-100 text-blue-700' },
      'cedea_bonus': { label: 'CEDEA', color: 'bg-purple-100 text-purple-700' },
      'auto_bonus': { label: 'Auto Bono', color: 'bg-green-100 text-green-700' },
      'adjustment': { label: 'Ajuste', color: 'bg-orange-100 text-orange-700' },
    };
    const config = typeLabels[type] || { label: type, color: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <PermissionGuard permissions={['commissions:read', 'commissions:*']}>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CurrencyDollarIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Gestión de Comisiones</h1>
              </div>
              <p className="text-white/80 text-lg">
                Administra y procesa comisiones de distribuidores
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin">
                <Button variant="secondary">
                  Volver al Panel Principal
                </Button>
              </Link>
              <Button
                variant="outline"
                className="border-white text-white hover:bg-white/10"
                leftIcon={<CalculatorIcon className="h-5 w-5" />}
                onClick={handleCalculateCommissions}
                disabled={calculateMutation.isPending}
              >
                {calculateMutation.isPending ? 'Calculando...' : 'Calcular Comisiones'}
              </Button>
              {approvedCount > 0 && (
                <Button
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
                  leftIcon={<BanknotesIcon className="h-5 w-5" />}
                  onClick={handleMarkAsPaid}
                  disabled={markPaidMutation.isPending}
                >
                  {markPaidMutation.isPending ? 'Procesando...' : `Marcar como Pagadas (${approvedCount})`}
                </Button>
              )}
              <Button
                variant="outline"
                className="border-white text-white hover:bg-white/10"
                leftIcon={<LockClosedIcon className="h-5 w-5" />}
                onClick={handleClosePeriod}
                disabled={closePeriodMutation.isPending}
              >
                {closePeriodMutation.isPending ? 'Cerrando...' : 'Cerrar Periodo'}
              </Button>
              {pendingCount > 0 && (
                <Button
                  variant="primary"
                  leftIcon={<CheckCircleIcon className="h-5 w-5" />}
                  onClick={handleApproveAll}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? 'Aprobando...' : `Aprobar Todas (${pendingCount})`}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pendientes de Pago</p>
                  <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
                  <p className="text-xs text-gray-500 mt-1">comisiones calculadas</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Neto</p>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(parseFloat(summary?.totalNetMxn || '0'))}</p>
                  <p className="text-xs text-gray-500 mt-1">{summary?.transactionCount || 0} transacciones</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Subtotal</p>
                  <p className="text-3xl font-bold text-[#3E667D]">{formatCurrency(parseFloat(summary?.totalSubtotalMxn || '0'))}</p>
                  <p className="text-xs text-gray-500 mt-1">Período seleccionado</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <BanknotesIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Retenciones</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(parseFloat(summary?.totalRetentions || '0'))}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">IVA + ISR + RESICO</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <ChartBarIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Commission Rates Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Tasas de Comisión por Nivel</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Nivel</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Comisión Personal</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Comisión Equipo</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Ventas Mínimas</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionRates.map((rate) => (
                    <tr key={rate.level} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {rate.level}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-green-600">{rate.personalRate}%</td>
                      <td className="py-3 px-4 text-sm font-semibold text-blue-600">{rate.teamRate}%</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{formatCurrency(rate.minSales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, email o ID..."
                    value={searchQuery}
                    onChange={(e) => setParams({ search: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <SearchableSelect
                  options={[
                    { value: 'calculated', label: 'Calculadas' },
                    { value: 'approved', label: 'Aprobadas' },
                    { value: 'paid', label: 'Pagadas' },
                    { value: 'cancelled', label: 'Canceladas' },
                  ]}
                  value={filterStatus}
                  onChange={(val) => setParams({ status: val })}
                  allLabel="Todos los Estados"
                  allValue="all"
                />
              </div>

              {/* Period Filter */}
              <div>
                <SearchableSelect
                  options={periods.map((period) => ({
                    value: period.id,
                    label: period.name,
                  }))}
                  value={filterPeriod}
                  onChange={(val) => setParams({ period: val || null })}
                  allLabel="Todos los Períodos"
                />
              </div>

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

        {/* Commissions List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <div className="inline-block w-12 h-12 border-4 border-[#3E667D] border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600">Cargando comisiones...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {commissions.map((commission) => (
              <Card key={commission.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                    {/* Commission Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">{commission.id.slice(0, 8)}</h3>
                            {getStatusBadge(commission.status)}
                            {getTypeBadge(commission.commissionType)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <UserIcon className="h-4 w-4" />
                            <span className="font-medium">{commission.customerName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <CalendarIcon className="h-4 w-4" />
                            <span className="font-medium">Periodo:</span>
                            <span>{commission.periodCode}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-[#3E667D]">
                            {formatCurrency(commission.totalAmount)}
                          </p>
                          <p className="text-sm text-gray-600">Neto a Pagar</p>
                        </div>
                      </div>

                      {/* Amount Breakdown */}
                      <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Subtotal Ganancias</p>
                          <p className="text-lg font-bold text-gray-900">{formatCurrency(commission.subtotalEarnings)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Retencion IVA</p>
                          <p className="text-lg font-bold text-red-600">-{formatCurrency(commission.ivaWithholding || '0')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">ISR</p>
                          <p className="text-lg font-bold text-red-600">-{formatCurrency(commission.isrAmount || '0')}</p>
                        </div>
                      </div>

                      {/* Additional Info */}
                      {commission.status === 'approved' && commission.approvedAt && (
                        <p className="text-sm text-blue-600">
                          Aprobada el {formatDate(commission.approvedAt)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="lg:w-48 flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.info('Función próximamente disponible')}
                        className="w-full justify-center"
                      >
                        Ver Detalles
                      </Button>
                      {commission.status === 'calculated' && (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<CheckCircleIcon className="h-4 w-4" />}
                          onClick={() => handleApproveCommission(commission.id)}
                          disabled={approveMutation.isPending}
                          className="w-full justify-center"
                        >
                          Aprobar Pago
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                        onClick={() => toast.success('Descargando recibo de comisión...')}
                        className="w-full justify-center"
                      >
                        Descargar Recibo
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && commissions.length === 0 && (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <CurrencyDollarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No se encontraron comisiones
                </h3>
                <p className="text-gray-600">
                  Intenta ajustar los filtros de búsqueda
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {!isLoading && commissions.length > 0 && totalResults > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {commissions.length} de {totalResults} comisiones (Página {page} de {totalPages})
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParams({ page: String(Math.max(1, page - 1)) })}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParams({ page: String(page + 1) })}
                disabled={page >= totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
    </PermissionGuard>
  );
}
