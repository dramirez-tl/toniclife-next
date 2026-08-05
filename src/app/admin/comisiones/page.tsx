'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { withholdingsService } from '@/services/withholdings.service';
import {
  useAllCommissions,
  useApproveCommissions,
  useMarkCommissionsAsPaid,
  useCalculateCommissions,
  useCalculateProgress,
  useCommissionPeriods,
  useCommissionPercentages,
  commissionKeys,
  periodsUpToCurrent,
} from '@/hooks/useCommissions';
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

  // Fetch periods for filter (el selector solo muestra hasta el corriente)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: periodsData } = useCommissionPeriods() as { data: any };
  // periodsData may be an array or an object with periods/data - handle both
  const periods: Array<{
    id: string;
    name: string;
    code?: string;
    isCurrent?: boolean;
    isClosed?: boolean;
    startDate?: string;
    endDate?: string;
    periodNumber?: number;
  }> =
    Array.isArray(periodsData) ? periodsData : (periodsData?.periods ?? periodsData?.data ?? []);
  const visiblePeriods = periodsUpToCurrent(periods);
  const currentPeriodId = periods.find((p) => p.isCurrent)?.id;

  // Filtro efectivo: por DEFECTO el periodo actual. 'all' (elegir "Todos los
  // Períodos") muestra todo de forma explícita.
  const effectivePeriodId =
    filterPeriod === 'all' ? undefined : filterPeriod || currentPeriodId;

  // ── Selector de periodo (controla los datos de TODA la página) ────────────
  // visiblePeriods viene ordenado por fecha DESC (más reciente primero), por lo
  // que el "anterior" (más viejo) está en idx+1 y el "siguiente" en idx-1.
  const isAllPeriods = filterPeriod === 'all';
  const selectedIdx = visiblePeriods.findIndex((p) => p.id === effectivePeriodId);
  const selectedPeriod = selectedIdx >= 0 ? visiblePeriods[selectedIdx] : null;
  const olderPeriod = selectedIdx >= 0 ? visiblePeriods[selectedIdx + 1] : undefined;
  const newerPeriod = selectedIdx > 0 ? visiblePeriods[selectedIdx - 1] : undefined;

  // Formatea el rango 26→25 desde las partes Y-M-D (evita el desfase de TZ que
  // provoca `new Date('YYYY-MM-DD')` al interpretarse como UTC medianoche).
  const formatPeriodRange = (p?: { startDate?: string; endDate?: string } | null) => {
    if (!p?.startDate || !p?.endDate) return null;
    const fmt = (d: string) => {
      const [y, m, day] = d.slice(0, 10).split('-').map(Number);
      if (!y || !m || !day) return d;
      return new Date(y, m - 1, day).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    };
    return `${fmt(p.startDate)} — ${fmt(p.endDate)}`;
  };
  const selectedRange = formatPeriodRange(selectedPeriod);

  // Fetch commissions from API
  const { data: commissionsData, isLoading } = useAllCommissions({
    periodId: effectivePeriodId || undefined,
    status: filterStatus !== 'all' ? filterStatus : undefined,
    search: searchQuery || undefined,
    page,
    limit: 20,
  });

  // Fetch percentages for rates table
  const { data: percentages } = useCommissionPercentages();

  // Approve mutation
  const approveMutation = useApproveCommissions();

  // Mark as paid mutation
  const markPaidMutation = useMarkCommissionsAsPaid();

  // Calculate commissions mutation
  const calculateMutation = useCalculateCommissions();

  // Computed values
  const commissions = commissionsData?.data || [];
  const summary = commissionsData?.summary;
  const totalResults = commissionsData?.total ?? 0;
  const totalPages = commissionsData?.totalPages ?? 1;

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
  const activePeriodId = effectivePeriodId || currentPeriodId;

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

    // Preview de retenciones de Tesorería (convenios de préstamo/ad-hoc):
    // se muestran ANTES de dispersar para que Tesorería confirme cuánto se
    // retendrá a quién. Si la mig 115 no está aplicada, se paga sin retención.
    try {
      if (effectivePeriodId) {
        const preview = await withholdingsService.preview(effectivePeriodId);
        if (preview.items.length > 0) {
          const totals = Object.entries(preview.totalByCurrency)
            .map(([cur, v]) => `${formatCurrency(String(v))} ${cur}`)
            .join(' + ');
          const names = preview.items
            .slice(0, 5)
            .map(i => `• ${i.customerName} (#${i.customerNumber}): -${formatCurrency(String(i.totalWithheld))} ${i.currencyCode}`)
            .join('\n');
          const extra = preview.items.length > 5 ? `\n…y ${preview.items.length - 5} más` : '';
          const ok = window.confirm(
            `Se aplicarán retenciones de Tesorería por ${totals} a ${preview.items.length} distribuidor(es):\n\n${names}${extra}\n\n¿Continuar con el pago? (el detalle queda en Tesorería → Retenciones)`,
          );
          if (!ok) return;
        }
      }
    } catch {
      // preview no disponible (mig 115 sin aplicar / permiso): pagar sin retención
    }

    try {
      await markPaidMutation.mutateAsync(approvedIds);
      toast.success(`${approvedIds.length} comisiones marcadas como pagadas`);
    } catch {
      toast.error('Error al marcar comisiones como pagadas');
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
          <Badge variant="warning">
            <ClockIcon className="h-3 w-3" />
            Pendiente
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="info">
            <CheckCircleIcon className="h-3 w-3" />
            Aprobada
          </Badge>
        );
      case 'paid':
        return (
          <Badge variant="success">
            <CheckCircleIcon className="h-3 w-3" />
            Pagada
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive">
            <XCircleIcon className="h-3 w-3" />
            Cancelada
          </Badge>
        );
      default:
        return null;
    }
  };

  type BadgeVariant = 'default' | 'secondary' | 'success' | 'info' | 'warning' | 'destructive' | 'outline';

  const getTypeBadge = (type: string) => {
    const typeLabels: Record<string, { label: string; variant: BadgeVariant }> = {
      'mlm': { label: 'MLM', variant: 'info' },
      'cedea_bonus': { label: 'CEDEA', variant: 'default' },
      'auto_bonus': { label: 'Auto Bono', variant: 'success' },
      'adjustment': { label: 'Ajuste', variant: 'warning' },
    };
    const config = typeLabels[type] || { label: type, variant: 'secondary' as BadgeVariant };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  /**
   * Formatea un monto EN SU PROPIA MONEDA. Antes estaba fijo en MXN, así que
   * una comisión en USD/COP se mostraba con formato de pesos mexicanos.
   * `currency` es el `currencyCode` de cada comisión (default MXN).
   */
  const formatCurrency = (amount: number | string, currency = 'MXN') => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
    try {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: currency || 'MXN',
      }).format(numAmount);
    } catch {
      // Código de moneda desconocido → formato numérico + código.
      return `${new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(numAmount)} ${currency}`;
    }
  };

  const commissionColumns: DataTableColumn<Commission>[] = [
    {
      key: 'customerName',
      header: 'Distribuidor',
      sortable: true,
      sortValue: (c) => c.customerName,
      render: (c) => (
        <div>
          {/* Clic → ficha del distribuidor */}
          <Link
            href={`/admin/distribuidores/${c.customerId}`}
            className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
          >
            {c.customerName}
          </Link>
          <p className="text-xs text-muted-foreground">
            {c.customerNumber ? `#${c.customerNumber}` : c.periodCode}
            {c.customerNumber && c.customerCountry ? ` · ${c.customerCountry}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'commissionType',
      header: 'Tipo',
      render: (c) => getTypeBadge(c.commissionType),
    },
    {
      key: 'currencyCode',
      header: 'Moneda',
      sortable: true,
      sortValue: (c) => c.currencyCode || 'MXN',
      render: (c) => (
        <Badge variant="outline" className="font-mono text-muted-foreground">
          {c.currencyCode || 'MXN'}
        </Badge>
      ),
    },
    {
      key: 'subtotalEarnings',
      header: 'Bruto',
      sortable: true,
      sortValue: (c) => parseFloat(c.subtotalEarnings),
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (c) => (
        <span className="text-sm font-medium tabular-nums text-foreground">{formatCurrency(c.subtotalEarnings, c.currencyCode)}</span>
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
          ? <span className="text-sm font-medium tabular-nums text-blue-600 dark:text-blue-400">+{formatCurrency(c.ivaAmount || '0', c.currencyCode)}</span>
          : <span className="text-xs text-muted-foreground/50">—</span>;
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
          ? <span className="text-sm font-medium tabular-nums text-destructive">-{formatCurrency(c.ivaWithholding || '0', c.currencyCode)}</span>
          : <span className="text-xs text-muted-foreground/50">—</span>;
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
          ? <span className="text-sm font-medium tabular-nums text-destructive">-{formatCurrency(c.isrAmount || '0', c.currencyCode)}</span>
          : <span className="text-xs text-muted-foreground/50">—</span>;
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
        <span className="text-sm font-bold tabular-nums text-primary">{formatCurrency(c.totalAmount, c.currencyCode)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (c) => getStatusBadge(c.status),
    },
    {
      key: 'paid',
      header: 'Pagada',
      sortable: true,
      sortValue: (c) => (c.status === 'paid' ? 1 : 0),
      render: (c) =>
        c.status === 'paid' ? (
          <Badge variant="success">
            <CheckCircleIcon className="h-3 w-3" />
            Sí
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            <XCircleIcon className="h-3 w-3" />
            No
          </Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/admin/distribuidores/${c.customerId}`}
            className="rounded-lg p-1.5 transition-colors hover:bg-muted"
            title="Ver detalle del distribuidor"
          >
            <EyeIcon className="h-4 w-4 text-primary" />
          </Link>
          {c.status === 'calculated' && (
            <button
              onClick={() => handleApproveCommission(c.id)}
              disabled={approveMutation.isPending}
              className="rounded-lg p-1.5 transition-colors hover:bg-muted"
              title="Aprobar pago"
            >
              <CheckCircleIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </button>
          )}
          <button
            onClick={() => toast.success('Descargando recibo...')}
            className="rounded-lg p-1.5 transition-colors hover:bg-muted"
            title="Descargar recibo"
          >
            <ArrowDownTrayIcon className="h-4 w-4 text-muted-foreground" />
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
      render: (rate) => <Badge variant="info">{rate.level}</Badge>,
    },
    {
      key: 'personalRate',
      header: 'Comisión Personal',
      cellClassName: 'text-sm font-semibold text-emerald-600 dark:text-emerald-400',
      render: (rate) => <>{rate.personalRate}%</>,
    },
    {
      key: 'teamRate',
      header: 'Comisión Equipo',
      cellClassName: 'text-sm font-semibold text-blue-600 dark:text-blue-400',
      render: (rate) => <>{rate.teamRate}%</>,
    },
    {
      key: 'minSales',
      header: 'Ventas Mínimas',
      cellClassName: 'text-sm text-foreground',
      render: (rate) => <>{formatCurrency(rate.minSales)}</>,
    },
  ];

  return (
    <PermissionGuard permissions={['commissions:read', 'commissions:*']}>
    <div className="min-h-screen">
      {/* Header (banda de marca, slim) */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2.5">
                <CurrencyDollarIcon className="h-7 w-7" />
                <h1 className="text-2xl font-bold sm:text-3xl">Gestión de Comisiones</h1>
              </div>
              <p className="text-sm text-white/80 sm:text-base">
                Administra y procesa comisiones de distribuidores
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                variant="ghost"
                className="border border-white/25 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/admin">Volver al Panel</Link>
              </Button>
              <Button
                variant="ghost"
                className="border border-white/25 text-white hover:bg-white/10 hover:text-white"
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
                  variant="ghost"
                  className="border border-white/25 text-white hover:bg-white/10 hover:text-white"
                  onClick={handleMarkAsPaid}
                  disabled={markPaidMutation.isPending}
                >
                  <BanknotesIcon className="h-5 w-5" />
                  {markPaidMutation.isPending ? 'Procesando...' : `Marcar como Pagadas (${approvedCount})`}
                </Button>
              )}
              {pendingCount > 0 && (
                <Button
                  className="bg-card text-primary hover:bg-card/90"
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
        {/* Selector de Periodo — controla los datos de TODA la página */}
        <Card className="mb-6 border-border shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <CalendarDaysIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Periodo · afecta toda la página
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-bold leading-tight text-foreground">
                      {isAllPeriods ? 'Todos los períodos' : selectedPeriod?.name ?? '—'}
                    </p>
                    {!isAllPeriods && selectedRange && (
                      <span className="text-xs text-muted-foreground">{selectedRange}</span>
                    )}
                    {!isAllPeriods && selectedPeriod?.isCurrent && (
                      <Badge variant="success">Actual</Badge>
                    )}
                    {!isAllPeriods && selectedPeriod && !selectedPeriod.isCurrent && selectedPeriod.isClosed && (
                      <Badge variant="outline" className="text-muted-foreground">Cerrado</Badge>
                    )}
                    {!isAllPeriods && selectedPeriod && !selectedPeriod.isCurrent && !selectedPeriod.isClosed && (
                      <Badge variant="warning">Abierto</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-2.5"
                  disabled={!olderPeriod}
                  onClick={() => olderPeriod && setParams({ period: olderPeriod.id, page: '1' })}
                  title="Periodo anterior"
                  aria-label="Periodo anterior"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>

                <div className="w-44 sm:w-56">
                  <SearchableSelect
                    options={visiblePeriods.map((period) => ({
                      value: period.id,
                      label: period.name,
                    }))}
                    value={isAllPeriods ? '' : effectivePeriodId || ''}
                    onChange={(val) => setParams({ period: val || 'all', page: '1' })}
                    allLabel="Todos los Períodos"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-2.5"
                  disabled={!newerPeriod}
                  onClick={() => newerPeriod && setParams({ period: newerPeriod.id, page: '1' })}
                  title="Periodo siguiente"
                  aria-label="Periodo siguiente"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>

                {currentPeriodId && !isAllPeriods && effectivePeriodId !== currentPeriodId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 text-primary"
                    onClick={() => setParams({ period: null, page: '1' })}
                  >
                    Ir al actual
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-sm text-muted-foreground">Pendientes de Pago</p>
                  <p className="text-3xl font-bold leading-tight text-amber-600 dark:text-amber-400">{pendingCount}</p>
                  <p className="mt-1 text-xs text-muted-foreground">comisiones calculadas</p>
                </div>
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <ClockIcon className="h-5 w-5" />
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-sm text-muted-foreground">Total Neto</p>
                  <p className="text-xl font-bold leading-tight text-emerald-600 dark:text-emerald-400">{formatCurrency(parseFloat(summary?.totalNetMxn || '0'))}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Intl.NumberFormat('es-MX').format(summary?.transactionCount || 0)} transacciones</p>
                </div>
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircleIcon className="h-5 w-5" />
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-sm text-muted-foreground">Total Subtotal</p>
                  <p className="text-xl font-bold leading-tight text-primary">{formatCurrency(parseFloat(summary?.totalSubtotalMxn || '0'))}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{isAllPeriods ? 'Todos los períodos' : selectedPeriod?.name ?? 'Período seleccionado'}</p>
                </div>
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BanknotesIcon className="h-5 w-5" />
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-sm text-muted-foreground">Total Retenciones</p>
                  <p className="text-xl font-bold leading-tight text-foreground">
                    {formatCurrency(parseFloat(summary?.totalRetentions || '0'))}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Ret. IVA + ISR + RESICO</p>
                </div>
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <ChartBarIcon className="h-5 w-5" />
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desglose Fiscal */}
        {summary && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="mb-4 text-lg font-bold text-foreground">Desglose Fiscal</h3>
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="flex items-center justify-between border-b border-border bg-muted/50 px-5 py-3">
                  <span className="text-sm font-medium text-foreground">BRUTO</span>
                  <span className="text-sm font-bold tabular-nums text-foreground">{formatCurrency(summary.totalSubtotalMxn)}</span>
                </div>
                {parseFloat(summary.totalIva || '0') > 0 && (
                  <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <span className="text-sm text-muted-foreground">IVA 16%</span>
                    <span className="text-sm font-semibold tabular-nums text-blue-600 dark:text-blue-400">+ {formatCurrency(summary.totalIva || '0')}</span>
                  </div>
                )}
                {parseFloat(summary.totalIvaWithholding || '0') > 0 && (
                  <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <span className="text-sm text-muted-foreground">RET IVA 10.6667%</span>
                    <span className="text-sm font-semibold tabular-nums text-destructive">- {formatCurrency(summary.totalIvaWithholding || '0')}</span>
                  </div>
                )}
                {parseFloat(summary.totalIsr || '0') > 0 && (
                  <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <span className="text-sm text-muted-foreground">ISR</span>
                    <span className="text-sm font-semibold tabular-nums text-destructive">- {formatCurrency(summary.totalIsr || '0')}</span>
                  </div>
                )}
                {parseFloat(summary.totalResico || '0') > 0 && (
                  <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <span className="text-sm text-muted-foreground">RESICO</span>
                    <span className="text-sm font-semibold tabular-nums text-destructive">- {formatCurrency(summary.totalResico || '0')}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border bg-primary/5 px-5 py-3">
                  <span className="text-sm font-bold text-primary">NETO</span>
                  <span className="text-sm font-bold tabular-nums text-primary">{formatCurrency(summary.totalNetMxn)}</span>
                </div>
                {/* Retenciones de Tesorería (convenios de préstamo/ad-hoc,
                    mig 115) aplicadas al pagar — para que el desglose cuadre
                    con lo realmente dispersado. */}
                {parseFloat(summary.companyWithholdings || '0') > 0 && (
                  <>
                    <div className="flex items-center justify-between border-t border-border px-5 py-3">
                      <span className="text-sm text-muted-foreground">Retenciones de empresa (convenios)</span>
                      <span className="text-sm font-semibold tabular-nums text-destructive">- {formatCurrency(summary.companyWithholdings || '0')}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border bg-emerald-500/5 px-5 py-3">
                      <span className="text-sm font-bold text-emerald-700">DISPERSADO</span>
                      <span className="text-sm font-bold tabular-nums text-emerald-700">{formatCurrency(summary.netAfterWithholdings || summary.totalNetMxn)}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Commission Rates Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-bold text-foreground">Tasas de Comisión por Nivel</h3>
            <DataTable
              columns={commissionRateColumns}
              data={commissionRates}
              getRowKey={(rate) => rate.level}
            />
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6 border-border shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
              <div className="lg:col-span-6">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, email o No. de distribuidor (ej. 88197)..."
                    value={searchQuery}
                    onChange={(e) => setParams({ search: e.target.value, page: '1' })}
                    className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                </div>
              </div>
              <div className="lg:col-span-4">
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
              <div className="lg:col-span-2">
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
        <Card className="border-border shadow-sm">
          <CardContent className="p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Listado de Comisiones</h2>
              <p className="text-sm text-muted-foreground">{totalResults} resultados</p>
            </div>
            <DataTable
              columns={commissionColumns}
              data={commissions}
              isLoading={isLoading}
              getRowKey={(c) => c.id}
              minWidthClassName="min-w-[1150px]"
              emptyState={
                <div className="py-4 text-center">
                  <CurrencyDollarIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground">No se encontraron comisiones</p>
                  <p className="mt-1 text-xs text-muted-foreground">Intenta ajustar los filtros de busqueda</p>
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
