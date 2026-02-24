'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PermissionGuard } from '@/components/auth';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import {
  useStartupProgram,
  useBonusList,
  useBonusSummary,
  useApproveBonuses,
  useMarkBonusesPaid,
} from '@/hooks/useStartupProgram';
import type {
  ProgramStatus,
  BonusTriggerType,
  BonusStatus,
  BonusTransaction,
  BonusQueryParams,
} from '@/types/startup-program';
import {
  ArrowLeftIcon,
  RocketLaunchIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  Cog6ToothIcon,
  ClockIcon,
  CheckCircleIcon,
  BanknotesIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ProgramStatus, string> = {
  draft: 'Borrador',
  active: 'Activo',
  paused: 'Pausado',
  ended: 'Terminado',
};

const STATUS_BADGE_VARIANT: Record<ProgramStatus, 'default' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  active: 'success',
  paused: 'warning',
  ended: 'error',
};

const TRIGGER_LABELS: Record<BonusTriggerType, string> = {
  direct_recruitment: 'Reclutamiento Directo',
  fifth_study: 'Quinto Estudio',
  multilevel_l1: 'Multinivel Nivel 1',
  multilevel_l2: 'Multinivel Nivel 2',
  multilevel_l3: 'Multinivel Nivel 3',
  retention: 'Retencion',
};

const BONUS_STATUS_LABELS: Record<BonusStatus, string> = {
  calculated: 'Calculado',
  approved: 'Aprobado',
  paid: 'Pagado',
  cancelled: 'Cancelado',
};

const BONUS_STATUS_VARIANT: Record<BonusStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  calculated: 'warning',
  approved: 'info',
  paid: 'success',
  cancelled: 'error',
};

type TabKey = 'resumen' | 'bonos' | 'ranking' | 'configuracion' | 'historial';

const TABS: { key: TabKey; label: string; icon: typeof ChartBarIcon }[] = [
  { key: 'resumen', label: 'Resumen', icon: ChartBarIcon },
  { key: 'bonos', label: 'Bonos', icon: CurrencyDollarIcon },
  { key: 'ranking', label: 'Ranking', icon: TrophyIcon },
  { key: 'configuracion', label: 'Configuracion', icon: Cog6ToothIcon },
  { key: 'historial', label: 'Historial', icon: ClockIcon },
];

const inputClassName =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003B7A] focus:border-transparent';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: string | number, currency = 'MXN') {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '$0.00';
  const symbol = currency === 'USD' ? 'US$' : '$';
  return `${symbol}${num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ProgramaArranqueDetailPage() {
  return (
    <PermissionGuard permissions={['startup-program:read', 'startup-program:*']}>
      <ProgramaArranqueDetailContent />
    </PermissionGuard>
  );
}

function ProgramaArranqueDetailContent() {
  const params = useParams();
  const programId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabKey>('resumen');

  const { data: program, isLoading: programLoading } = useStartupProgram(programId);
  const { data: summary, isLoading: summaryLoading } = useBonusSummary(programId);

  if (programLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="animate-pulse flex items-center gap-4">
              <div className="h-8 w-8 bg-white/20 rounded" />
              <div className="space-y-2">
                <div className="h-6 bg-white/20 rounded w-48" />
                <div className="h-4 bg-white/10 rounded w-32" />
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Programa no encontrado</h2>
            <p className="text-gray-500 mb-4">El programa solicitado no existe o fue eliminado.</p>
            <Link href="/admin/programa-arranque">
              <Button variant="primary" size="sm">Volver a Programas</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currency = program.currencyCode;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <RocketLaunchIcon className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">{program.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-blue-200 text-sm">{program.code}</span>
                  <Badge
                    variant={STATUS_BADGE_VARIANT[program.status as ProgramStatus]}
                    size="sm"
                  >
                    {STATUS_LABELS[program.status as ProgramStatus]}
                  </Badge>
                </div>
              </div>
            </div>
            <Link href="/admin/programa-arranque">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Volver
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-[#003B7A] text-[#003B7A]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'resumen' && (
          <TabResumen
            program={program}
            summary={summary}
            summaryLoading={summaryLoading}
            currency={currency}
          />
        )}
        {activeTab === 'bonos' && (
          <TabBonos programId={programId} currency={currency} />
        )}
        {activeTab === 'ranking' && (
          <TabRanking programId={programId} currency={currency} />
        )}
        {activeTab === 'configuracion' && (
          <TabConfiguracion program={program} currency={currency} />
        )}
        {activeTab === 'historial' && (
          <TabHistorial programId={programId} currency={currency} />
        )}
      </div>
    </div>
  );
}

// ─── Tab: Resumen ───────────────────────────────────────────────────────────

function TabResumen({
  program,
  summary,
  summaryLoading,
  currency,
}: {
  program: NonNullable<ReturnType<typeof useStartupProgram>['data']>;
  summary: ReturnType<typeof useBonusSummary>['data'];
  summaryLoading: boolean;
  currency: string;
}) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Bonos Brutos"
          value={summaryLoading ? '...' : formatCurrency(summary?.totalGross ?? 0, currency)}
          icon={<CurrencyDollarIcon className="h-5 w-5 text-[#7AB82E]" />}
        />
        <StatCard
          label="Bonos Netos"
          value={summaryLoading ? '...' : formatCurrency(summary?.totalNet ?? 0, currency)}
          icon={<BanknotesIcon className="h-5 w-5 text-[#003B7A]" />}
        />
        <StatCard
          label="Total Transacciones"
          value={summaryLoading ? '...' : String(summary?.totalTransactions ?? 0)}
          icon={<ArrowTrendingUpIcon className="h-5 w-5 text-purple-500" />}
        />
        <StatCard
          label="ISR + IVA Retenido"
          value={
            summaryLoading
              ? '...'
              : formatCurrency((summary?.totalIsr ?? 0) + (summary?.totalIva ?? 0), currency)
          }
          icon={<ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />}
        />
      </div>

      {/* Breakdown by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Desglose por Tipo de Bono</h3>
            {summaryLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : !summary?.byTriggerType || Object.keys(summary.byTriggerType).length === 0 ? (
              <p className="text-gray-400 text-sm">Sin bonos generados aun</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(summary.byTriggerType).map(([type, info]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#7AB82E]" />
                      <span className="text-sm text-gray-700">
                        {TRIGGER_LABELS[type as BonusTriggerType] ?? type}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(info.gross, currency)}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">({info.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Desglose por Estado</h3>
            {summaryLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : !summary?.byStatus || Object.keys(summary.byStatus).length === 0 ? (
              <p className="text-gray-400 text-sm">Sin bonos generados aun</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(summary.byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <Badge
                      variant={BONUS_STATUS_VARIANT[status as BonusStatus] ?? 'default'}
                      size="sm"
                    >
                      {BONUS_STATUS_LABELS[status as BonusStatus] ?? status}
                    </Badge>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Program Info */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Informacion del Programa</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Pais</p>
              <p className="font-medium text-gray-900">{program.countryCode} / {program.currencyCode}</p>
            </div>
            <div>
              <p className="text-gray-500">Fecha Inicio</p>
              <p className="font-medium text-gray-900">{formatDate(program.startDate)}</p>
            </div>
            <div>
              <p className="text-gray-500">Fecha Fin</p>
              <p className="font-medium text-gray-900">{formatDate(program.endDate)}</p>
            </div>
            <div>
              <p className="text-gray-500">Bono Directo</p>
              <p className="font-medium text-gray-900">
                {formatCurrency(program.directBonusAmount, currency)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Bonos ─────────────────────────────────────────────────────────────

function TabBonos({ programId, currency }: { programId: string; currency: string }) {
  const [page, setPage] = useState(1);
  const [triggerFilter, setTriggerFilter] = useState<BonusTriggerType | ''>('');
  const [statusFilter, setStatusFilter] = useState<BonusStatus | ''>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const queryParams: BonusQueryParams = {
    page,
    limit: 20,
    triggerType: triggerFilter || undefined,
    status: statusFilter || undefined,
  };

  const { data: bonusData, isLoading } = useBonusList(programId, queryParams);
  const approveMutation = useApproveBonuses(programId);
  const markPaidMutation = useMarkBonusesPaid(programId);

  const bonuses = bonusData?.data ?? [];
  const totalPages = bonusData?.totalPages ?? 0;

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === bonuses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(bonuses.map((b) => b.id));
    }
  };

  const handleApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      const result = await approveMutation.mutateAsync(selectedIds);
      toast.success(`${result.approved} bonos aprobados`);
      setSelectedIds([]);
    } catch {
      toast.error('Error al aprobar bonos');
    }
  };

  const handleMarkPaid = async () => {
    if (selectedIds.length === 0) return;
    try {
      const result = await markPaidMutation.mutateAsync(selectedIds);
      toast.success(`${result.paid} bonos marcados como pagados`);
      setSelectedIds([]);
    } catch {
      toast.error('Error al marcar como pagados');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters + Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={triggerFilter}
                onChange={(e) => { setTriggerFilter(e.target.value as BonusTriggerType | ''); setPage(1); }}
                className={`${inputClassName} max-w-[200px]`}
              >
                <option value="">Todos los tipos</option>
                {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as BonusStatus | ''); setPage(1); }}
                className={`${inputClassName} max-w-[180px]`}
              >
                <option value="">Todos los estados</option>
                {Object.entries(BONUS_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApprove}
                  isLoading={approveMutation.isPending}
                >
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Aprobar ({selectedIds.length})
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleMarkPaid}
                  isLoading={markPaidMutation.isPending}
                >
                  <BanknotesIcon className="h-4 w-4 mr-1" />
                  Marcar Pagado ({selectedIds.length})
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Cargando bonos...</div>
          ) : bonuses.length === 0 ? (
            <div className="p-12 text-center">
              <CurrencyDollarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay bonos generados</p>
              <p className="text-gray-400 text-sm mt-1">
                Los bonos se generan automaticamente al inscribir nuevos distribuidores
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === bonuses.length && bonuses.length > 0}
                          onChange={toggleAll}
                          className="rounded"
                        />
                      </th>
                      <th className="text-left px-3 py-3 font-medium text-gray-600">Beneficiario</th>
                      <th className="text-left px-3 py-3 font-medium text-gray-600">Origen</th>
                      <th className="text-left px-3 py-3 font-medium text-gray-600">Tipo</th>
                      <th className="text-left px-3 py-3 font-medium text-gray-600">Estado</th>
                      <th className="text-right px-3 py-3 font-medium text-gray-600">Bruto</th>
                      <th className="text-right px-3 py-3 font-medium text-gray-600">Neto</th>
                      <th className="text-left px-3 py-3 font-medium text-gray-600">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bonuses.map((bonus: BonusTransaction) => (
                      <tr key={bonus.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(bonus.id)}
                            onChange={() => toggleSelection(bonus.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-gray-900">{bonus.beneficiaryName}</div>
                        </td>
                        <td className="px-3 py-3 text-gray-600">{bonus.sourceName}</td>
                        <td className="px-3 py-3">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                            {TRIGGER_LABELS[bonus.triggerType] ?? bonus.triggerType}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <Badge
                            variant={BONUS_STATUS_VARIANT[bonus.status] ?? 'default'}
                            size="sm"
                          >
                            {BONUS_STATUS_LABELS[bonus.status] ?? bonus.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-gray-700">
                          {formatCurrency(bonus.grossAmount, currency)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-gray-900 font-medium">
                          {formatCurrency(bonus.netAmount, currency)}
                        </td>
                        <td className="px-3 py-3 text-gray-500 text-xs">
                          {formatDate(bonus.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <span className="text-sm text-gray-500">
                    Pagina {page} de {totalPages} ({bonusData?.total} bonos)
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Anterior
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Ranking ───────────────────────────────────────────────────────────

function TabRanking({ programId, currency }: { programId: string; currency: string }) {
  const { data: summary, isLoading } = useBonusSummary(programId);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            <UserGroupIcon className="h-4 w-4 inline mr-2" />
            Top Distribuidores por Bonos
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : !summary?.byTriggerType || Object.keys(summary.byTriggerType).length === 0 ? (
            <div className="text-center py-8">
              <TrophyIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aun no hay datos de ranking</p>
              <p className="text-gray-400 text-sm mt-1">
                El ranking se actualizara conforme se generen bonos
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(summary.byTriggerType)
                .sort(([, a], [, b]) => b.gross - a.gross)
                .map(([type, info], idx) => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#003B7A] text-white text-xs flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {TRIGGER_LABELS[type as BonusTriggerType] ?? type}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(info.gross, currency)}
                      </p>
                      <p className="text-xs text-gray-400">{info.count} transacciones</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Configuracion ─────────────────────────────────────────────────────

function TabConfiguracion({
  program,
  currency,
}: {
  program: NonNullable<ReturnType<typeof useStartupProgram>['data']>;
  currency: string;
}) {
  return (
    <div className="space-y-6">
      {/* General */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Informacion General</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <InfoRow label="Codigo" value={program.code} />
            <InfoRow label="Nombre" value={program.name} />
            <InfoRow label="Pais" value={`${program.countryCode} / ${program.currencyCode}`} />
            <InfoRow label="Estado" value={STATUS_LABELS[program.status as ProgramStatus]} />
            <InfoRow label="Fecha Inicio" value={formatDate(program.startDate)} />
            <InfoRow label="Fecha Fin" value={formatDate(program.endDate)} />
            {program.description && (
              <div className="col-span-2">
                <InfoRow label="Descripcion" value={program.description} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bonus Config */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Configuracion de Bonos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <InfoRow
              label="Precio min. Kit"
              value={formatCurrency(program.qualifyingKitMinPrice ?? '0', currency)}
            />
            <InfoRow
              label="Bono Directo"
              value={formatCurrency(program.directBonusAmount, currency)}
            />
            <InfoRow
              label="Quinto Estudio cada"
              value={`${program.fifthBonusEveryN} inscritos`}
            />
            <InfoRow
              label="Bono Quinto"
              value={formatCurrency(program.fifthBonusAmount, currency)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Multilevel */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Bonos Multinivel</h3>
          <div className="space-y-2">
            {(program.multilevelBonusRules ?? []).map((rule) => (
              <div key={rule.level} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Nivel {rule.level}</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(rule.amount, currency)}
                </span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <InfoRow
              label="Puntos personales min."
              value={String(program.multilevelMinPersonalPoints ?? '0')}
            />
            <InfoRow
              label="Directos calificados min."
              value={String(program.multilevelMinQualifiedDirects ?? 0)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Retention */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Retencion y Alertas</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <InfoRow
              label="Meses evaluacion"
              value={`${program.retentionEvaluationMonths} meses`}
            />
            <InfoRow
              label="Alertas en inscritos"
              value={(program.alertAtRecruits ?? []).join(', ') || 'Sin alertas'}
            />
          </div>
          {(program.retentionRules ?? []).length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Reglas de Retencion</p>
              {program.retentionRules.map((rule, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <span className="text-gray-600">
                    Min. {rule.minRepurchases} recompras — {rule.rewardType}
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(rule.bonusAmount, currency)}
                    {rule.rewardName ? ` + ${rule.rewardName}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Historial ─────────────────────────────────────────────────────────

function TabHistorial({ programId, currency }: { programId: string; currency: string }) {
  const [page, setPage] = useState(1);
  const { data: bonusData, isLoading } = useBonusList(programId, { page, limit: 30 });

  const bonuses = bonusData?.data ?? [];
  const totalPages = bonusData?.totalPages ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Cargando historial...</div>
          ) : bonuses.length === 0 ? (
            <div className="p-12 text-center">
              <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Sin historial de transacciones</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {bonuses.map((bonus: BonusTransaction) => (
                  <div key={bonus.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          bonus.status === 'paid'
                            ? 'bg-green-100 text-green-600'
                            : bonus.status === 'approved'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-amber-100 text-amber-600'
                        }`}>
                          {bonus.status === 'paid' ? (
                            <BanknotesIcon className="h-4 w-4" />
                          ) : bonus.status === 'approved' ? (
                            <CheckCircleIcon className="h-4 w-4" />
                          ) : (
                            <ClockIcon className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {TRIGGER_LABELS[bonus.triggerType] ?? bonus.triggerType}
                          </p>
                          <p className="text-xs text-gray-500">
                            {bonus.beneficiaryName} ← {bonus.sourceName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(bonus.netAmount, currency)}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(bonus.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <span className="text-sm text-gray-500">
                    Pagina {page} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Anterior
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Small Components ───────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gray-50">{icon}</div>
        <div>
          <p className="text-xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  );
}
