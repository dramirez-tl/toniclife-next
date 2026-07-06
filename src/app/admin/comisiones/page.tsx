'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import {
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
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
  useCalculateProgress,
  useCommissionPeriods,
  useCommissionPercentages,
  commissionKeys,
} from '@/hooks/useCommissions';
import { useClosePeriod } from '@/hooks/useMlmPeriods';
import type { Commission, CommissionStatus } from '@/types/commissions';
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

  // Periodo objetivo del recálculo (filtro seleccionado o el actual).
  const activePeriodId = filterPeriod || periods.find((p) => p.isCurrent)?.id;

  // Avance del recálculo en el backend (polling solo mientras corre).
  const queryClient = useQueryClient();
  const { data: calcProgress } = useCalculateProgress(activePeriodId);
  const calcRunning = calcProgress?.status === 'running';
  const prevCalcStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevCalcStatus.current === 'running' && calcProgress?.status === 'done') {
      toast.success(
        `Comisiones calculadas: ${calcProgress.calculated ?? 0} (sin calificar: ${calcProgress.skipped ?? 0})`,
      );
      queryClient.invalidateQueries({ queryKey: commissionKeys.all });
    } else if (
      prevCalcStatus.current === 'running' &&
      calcProgress?.status === 'error'
    ) {
      toast.error(`El recálculo falló: ${calcProgress.error ?? 'error desconocido'}`);
    }
    prevCalcStatus.current = calcProgress?.status;
  }, [calcProgress, queryClient]);

  const handleCalculateCommissions = async () => {
    if (!activePeriodId) {
      toast.error('Selecciona un periodo primero');
      return;
    }
    try {
      const res = await calculateMutation.mutateAsync({ periodId: activePeriodId });
      if (res.alreadyRunning) {
        toast.info('Ya hay un recálculo corriendo para este periodo');
      } else if (res.started) {
        toast.info('Recálculo iniciado — el botón muestra el avance');
      } else {
        toast.success('Comisiones calculadas exitosamente');
      }
    } catch {
      toast.error('Error al iniciar el cálculo');
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

  const commissionColumns: DataTableColumn<Commission>[] = [
    {
      key: 'customerName',
      header: 'Distribuidor',
      sortable: true,
      sortValue: (c) => c.customerName,
      render: (c) => (
        <div>
          <p className="font-semibold text-gray-900 text-sm">{c.customerName}</p>
          <p className="text-xs text-gray-400">{c.periodCode}</p>
        </div>
      ),
    },
    {
      key: 'commissionType',
      header: 'Tipo',
      render: (c) => getTypeBadge(c.commissionType),
    },
    {
      key: 'subtotalEarnings',
      header: 'Bruto',
      sortable: true,
      sortValue: (c) => parseFloat(c.subtotalEarnings),
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (c) => (
        <span className="text-sm font-medium text-gray-900 tabular-nums">{formatCurrency(c.subtotalEarnings)}</span>
      ),
    },
    {
      key: 'ivaAmount',
      header: 'IVA',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (c) => {
        const val = parseFloat(c.ivaAmount || '0');
        return val > 0
          ? <span className="text-sm font-medium text-blue-600 tabular-nums">+{formatCurrency(c.ivaAmount || '0')}</span>
          : <span className="text-xs text-gray-300">—</span>;
      },
    },
    {
      key: 'ivaWithholding',
      header: 'Ret. IVA',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (c) => {
        const val = parseFloat(c.ivaWithholding || '0');
        return val > 0
          ? <span className="text-sm font-medium text-red-500 tabular-nums">-{formatCurrency(c.ivaWithholding || '0')}</span>
          : <span className="text-xs text-gray-300">—</span>;
      },
    },
    {
      key: 'isrAmount',
      header: 'ISR',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (c) => {
        const val = parseFloat(c.isrAmount || '0');
        return val > 0
          ? <span className="text-sm font-medium text-red-500 tabular-nums">-{formatCurrency(c.isrAmount || '0')}</span>
          : <span className="text-xs text-gray-300">—</span>;
      },
    },
    {
      key: 'totalAmount',
      header: 'Neto',
      sortable: true,
      sortValue: (c) => parseFloat(c.totalAmount),
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (c) => (
        <span className="text-sm font-bold text-[#3E667D] tabular-nums">{formatCurrency(c.totalAmount)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (c) => getStatusBadge(c.status),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          {c.status === 'calculated' && (
            <button
              onClick={() => handleApproveCommission(c.id)}
              disabled={approveMutation.isPending}
              className="rounded-lg p-1.5 transition-colors hover:bg-green-50"
              title="Aprobar pago"
            >
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
            </button>
          )}
          <button
            onClick={() => toast.success('Descargando recibo...')}
            className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
            title="Descargar recibo"
          >
            <ArrowDownTrayIcon className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      ),
    },
  ];

  type CommissionRate = { level: string; personalRate: number; teamRate: number; minSales: number };
  const commissionRateColumns: DataTableColumn<CommissionRate>[] = [
    {
      key: 'level',
      header: 'Nivel',
      render: (rate) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          {rate.level}
        </span>
      ),
    },
    {
      key: 'personalRate',
      header: 'Comisión Personal',
      cellClassName: 'text-sm font-semibold text-green-600',
      render: (rate) => <>{rate.personalRate}%</>,
    },
    {
      key: 'teamRate',
      header: 'Comisión Equipo',
      cellClassName: 'text-sm font-semibold text-blue-600',
      render: (rate) => <>{rate.teamRate}%</>,
    },
    {
      key: 'minSales',
      header: 'Ventas Mínimas',
      cellClassName: 'text-sm text-gray-900',
      render: (rate) => <>{formatCurrency(rate.minSales)}</>,
    },
  ];

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
                onClick={handleCalculateCommissions}
                disabled={calculateMutation.isPending || calcRunning}
              >
                <CalculatorIcon className="h-5 w-5" />
                {calcRunning
                  ? `Calculando… ${calcProgress?.percent ?? 0}%`
                  : calculateMutation.isPending
                    ? 'Iniciando...'
                    : 'Calcular Comisiones'}
              </Button>
              {approvedCount > 0 && (
                <Button
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
                  onClick={handleMarkAsPaid}
                  disabled={markPaidMutation.isPending}
                >
                  <BanknotesIcon className="h-5 w-5" />
                  {markPaidMutation.isPending ? 'Procesando...' : `Marcar como Pagadas (${approvedCount})`}
                </Button>
              )}
              <Button
                variant="outline"
                className="border-white text-white hover:bg-white/10"
                onClick={handleClosePeriod}
                disabled={closePeriodMutation.isPending}
              >
                <LockClosedIcon className="h-5 w-5" />
                {closePeriodMutation.isPending ? 'Cerrando...' : 'Cerrar Periodo'}
              </Button>
              {pendingCount > 0 && (
                <Button
                  variant="default"
                  onClick={handleApproveAll}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircleIcon className="h-5 w-5" />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-600 mb-1">Pendientes de Pago</p>
                  <p className="text-3xl font-bold text-yellow-600 leading-tight">{pendingCount}</p>
                  <p className="text-xs text-gray-500 mt-1">comisiones calculadas</p>
                </div>
                <div className="w-10 h-10 flex-shrink-0 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-600 mb-1">Total Neto</p>
                  <p className="text-xl font-bold text-green-600 leading-tight">{formatCurrency(parseFloat(summary?.totalNetMxn || '0'))}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Intl.NumberFormat('es-MX').format(summary?.transactionCount || 0)} transacciones</p>
                </div>
                <div className="w-10 h-10 flex-shrink-0 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-600 mb-1">Total Subtotal</p>
                  <p className="text-xl font-bold text-[#3E667D] leading-tight">{formatCurrency(parseFloat(summary?.totalSubtotalMxn || '0'))}</p>
                  <p className="text-xs text-gray-500 mt-1">Período seleccionado</p>
                </div>
                <div className="w-10 h-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                  <BanknotesIcon className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-600 mb-1">Total Retenciones</p>
                  <p className="text-xl font-bold text-gray-900 leading-tight">
                    {formatCurrency(parseFloat(summary?.totalRetentions || '0'))}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Ret. IVA + ISR + RESICO</p>
                </div>
                <div className="w-10 h-10 flex-shrink-0 bg-purple-100 rounded-full flex items-center justify-center">
                  <ChartBarIcon className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desglose Fiscal */}
        {summary && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Desglose Fiscal</h3>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-700">BRUTO</span>
                  <span className="text-sm font-bold text-gray-900 tabular-nums">{formatCurrency(summary.totalSubtotalMxn)}</span>
                </div>
                {parseFloat(summary.totalIva || '0') > 0 && (
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <span className="text-sm text-gray-600">IVA 16%</span>
                    <span className="text-sm font-semibold text-blue-600 tabular-nums">+ {formatCurrency(summary.totalIva || '0')}</span>
                  </div>
                )}
                {parseFloat(summary.totalIvaWithholding || '0') > 0 && (
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <span className="text-sm text-gray-600">RET IVA 10.6667%</span>
                    <span className="text-sm font-semibold text-red-500 tabular-nums">- {formatCurrency(summary.totalIvaWithholding || '0')}</span>
                  </div>
                )}
                {parseFloat(summary.totalIsr || '0') > 0 && (
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <span className="text-sm text-gray-600">ISR</span>
                    <span className="text-sm font-semibold text-red-500 tabular-nums">- {formatCurrency(summary.totalIsr || '0')}</span>
                  </div>
                )}
                {parseFloat(summary.totalResico || '0') > 0 && (
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <span className="text-sm text-gray-600">RESICO</span>
                    <span className="text-sm font-semibold text-red-500 tabular-nums">- {formatCurrency(summary.totalResico || '0')}</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-5 py-3 bg-[#3E667D]/5 border-t border-gray-200">
                  <span className="text-sm font-bold text-[#3E667D]">NETO</span>
                  <span className="text-sm font-bold text-[#3E667D] tabular-nums">{formatCurrency(summary.totalNetMxn)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Commission Rates Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Tasas de Comisión por Nivel</h3>
            <DataTable
              columns={commissionRateColumns}
              data={commissionRates}
              getRowKey={(rate) => rate.level}
            />
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6 border-gray-100 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
              <div className="lg:col-span-5">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, email o ID..."
                    value={searchQuery}
                    onChange={(e) => setParams({ search: e.target.value, page: '1' })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div className="lg:col-span-3">
                <SearchableSelect
                  options={[
                    { value: 'calculated', label: 'Calculadas' },
                    { value: 'approved', label: 'Aprobadas' },
                    { value: 'paid', label: 'Pagadas' },
                    { value: 'cancelled', label: 'Canceladas' },
                  ]}
                  value={filterStatus}
                  onChange={(val) => setParams({ status: val, page: '1' })}
                  allLabel="Todos los Estados"
                  allValue="all"
                />
              </div>
              <div className="lg:col-span-3">
                <SearchableSelect
                  options={periods.map((period) => ({
                    value: period.id,
                    label: period.name,
                  }))}
                  value={filterPeriod}
                  onChange={(val) => setParams({ period: val || null, page: '1' })}
                  allLabel="Todos los Períodos"
                />
              </div>
              <div className="lg:col-span-1">
                <Button
                  variant="outline"
                  onClick={handleExport}
                  className="w-full"
                  size="sm"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commissions Table */}
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900">Listado de Comisiones</h2>
              <p className="text-sm text-gray-500">{totalResults} resultados</p>
            </div>
            <DataTable
              columns={commissionColumns}
              data={commissions}
              isLoading={isLoading}
              getRowKey={(c) => c.id}
              minWidthClassName="min-w-[900px]"
              emptyState={
                <div className="py-4 text-center">
                  <CurrencyDollarIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p className="text-sm font-medium text-gray-700">No se encontraron comisiones</p>
                  <p className="text-xs text-gray-500 mt-1">Intenta ajustar los filtros de busqueda</p>
                </div>
              }
            />
            {commissions.length > 0 && (
              <DataTablePagination
                currentPage={page}
                pageSize={20}
                totalItems={totalResults}
                isLoading={isLoading}
                onPageChange={(p) => setParams({ page: String(p) })}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </PermissionGuard>
  );
}
