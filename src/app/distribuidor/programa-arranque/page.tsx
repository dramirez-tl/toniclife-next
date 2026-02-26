'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import {
  useActivePrograms,
  useMyProgress,
  useMyBonuses,
  useMyBonusSummary,
  useMyRecruits,
} from '@/hooks/useStartupProgram';
import type {
  ProgramConfig,
  BonusTriggerType,
  BonusStatus,
  BonusTransaction,
  RecruitItem,
  BonusQueryParams,
} from '@/types/startup-program';
import {
  RocketLaunchIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  SparklesIcon,
  TrophyIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

// ─── Constants ──────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<BonusTriggerType, string> = {
  direct_recruitment: 'Reclutamiento Directo',
  fifth_study: 'Quinto Estudio',
  multilevel_l1: 'Multinivel Niv. 1',
  multilevel_l2: 'Multinivel Niv. 2',
  multilevel_l3: 'Multinivel Niv. 3',
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

type SectionKey = 'progreso' | 'bonos' | 'inscritos';

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

export default function DistribuidorProgramaArranquePage() {
  const { data: activePrograms, isLoading: programsLoading } = useActivePrograms();
  const [selectedSection, setSelectedSection] = useState<SectionKey>('progreso');

  // Use the first active program
  const program = activePrograms?.[0] as ProgramConfig | undefined;
  const programId = program?.id ?? '';
  const currency = program?.currencyCode ?? 'MXN';

  const { data: progress, isLoading: progressLoading } = useMyProgress(programId, !!programId);
  const { data: bonusSummary, isLoading: summaryLoading } = useMyBonusSummary(!!programId);

  if (programsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/distribuidor">
            <Button variant="ghost" size="sm">
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Volver
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <RocketLaunchIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Sin Programa Activo</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              No hay un programa de arranque activo para tu pais en este momento.
              Contacta a tu upline para mas informacion.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/80 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <RocketLaunchIcon className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Programa de Arranque</h1>
              <p className="text-blue-200 text-sm">{program.name}</p>
            </div>
          </div>
          <Link href="/distribuidor">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Volver
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          icon={<UserGroupIcon className="h-5 w-5 text-[#3E667D]" />}
          label="Inscritos"
          value={progressLoading ? '...' : String(progress?.totalRecruits ?? 0)}
          subtitle={progress?.nextMilestone
            ? `Faltan ${progress.nextMilestone.recruitsRemaining} para bono`
            : 'Sin hito pendiente'
          }
        />
        <KpiCard
          icon={<CurrencyDollarIcon className="h-5 w-5 text-[#3E667D]" />}
          label="Bonos Brutos"
          value={progressLoading ? '...' : formatCurrency(progress?.totalBonusesGross ?? '0', currency)}
          subtitle="Total generado"
        />
        <KpiCard
          icon={<BanknotesIcon className="h-5 w-5 text-purple-500" />}
          label="Bonos Netos"
          value={progressLoading ? '...' : formatCurrency(progress?.totalBonusesNet ?? '0', currency)}
          subtitle="Despues de impuestos"
        />
      </div>

      {/* Progress Bar */}
      {progress?.nextMilestone && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progreso al siguiente hito
              </span>
              <span className="text-sm text-gray-500">
                {progress.totalRecruits} / {progress.nextMilestone.recruitsNeeded} inscritos
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-[#C8DDF2] to-[#5a9420] h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, progress.nextMilestone.recruitsNeeded > 0
                    ? (progress.totalRecruits / progress.nextMilestone.recruitsNeeded) * 100
                    : 0)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Bono de {formatCurrency(progress.nextMilestone.bonusAmount, currency)} al llegar a{' '}
              {progress.nextMilestone.recruitsNeeded} inscritos
            </p>
          </CardContent>
        </Card>
      )}

      {/* Milestones */}
      {progress?.milestones && progress.milestones.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              <TrophyIcon className="h-4 w-4 inline mr-2" />
              Hitos del Programa
            </h3>
            <div className="flex flex-wrap gap-3">
              {progress.milestones.map((milestone, i) => {
                const reached = progress.totalRecruits >= milestone.recruitsNeeded;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                      reached
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}
                  >
                    {reached ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <ClockIcon className="h-4 w-4 text-gray-400" />
                    )}
                    <span>{milestone.recruitsNeeded} inscritos</span>
                    <span className="font-medium">
                      {formatCurrency(milestone.bonusAmount, currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        {([
          { key: 'progreso' as SectionKey, label: 'Desglose de Bonos', icon: ArrowTrendingUpIcon },
          { key: 'bonos' as SectionKey, label: 'Mis Bonos', icon: CurrencyDollarIcon },
          { key: 'inscritos' as SectionKey, label: 'Mis Inscritos', icon: UserGroupIcon },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedSection(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              selectedSection === tab.key
                ? 'border-[#3E667D] text-[#3E667D]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Section Content */}
      {selectedSection === 'progreso' && (
        <SectionDesglose progress={progress} summaryLoading={summaryLoading} currency={currency} bonusSummary={bonusSummary} />
      )}
      {selectedSection === 'bonos' && (
        <SectionBonos currency={currency} programId={programId} />
      )}
      {selectedSection === 'inscritos' && (
        <SectionInscritos programId={programId} currency={currency} />
      )}
    </div>
  );
}

// ─── Section: Desglose ──────────────────────────────────────────────────────

function SectionDesglose({
  progress,
  bonusSummary,
  summaryLoading,
  currency,
}: {
  progress: ReturnType<typeof useMyProgress>['data'];
  bonusSummary: ReturnType<typeof useMyBonusSummary>['data'];
  summaryLoading: boolean;
  currency: string;
}) {
  const byType = progress?.bonusesByType ?? bonusSummary?.byTriggerType ?? {};

  return (
    <Card>
      <CardContent className="p-5">
        {summaryLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : Object.keys(byType).length === 0 ? (
          <div className="text-center py-8">
            <SparklesIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aun no tienes bonos generados</p>
            <p className="text-gray-400 text-sm mt-1">
              Inscribe nuevos distribuidores con Kit Prosperity para generar bonos
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(byType).map(([type, info]) => {
              const total = Object.values(byType).reduce((s, v) => s + v.gross, 0);
              const pct = total > 0 ? Math.round((info.gross / total) * 100) : 0;
              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">
                      {TRIGGER_LABELS[type as BonusTriggerType] ?? type}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(info.gross, currency)}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        ({info.count}) {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-[#C8DDF2] h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section: Bonos ─────────────────────────────────────────────────────────

function SectionBonos({ currency, programId }: { currency: string; programId: string }) {
  const [page, setPage] = useState(1);
  const queryParams: BonusQueryParams = { page, limit: 15 };
  const { data: bonusData, isLoading } = useMyBonuses(queryParams, !!programId);

  const bonuses = bonusData?.data ?? [];
  const totalPages = bonusData?.totalPages ?? 0;

  return (
    <Card>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Cargando bonos...</div>
        ) : bonuses.length === 0 ? (
          <div className="p-12 text-center">
            <CurrencyDollarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Sin bonos aun</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Origen</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Bruto</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Neto</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bonuses.map((bonus: BonusTransaction) => (
                    <tr key={bonus.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                          {TRIGGER_LABELS[bonus.triggerType] ?? bonus.triggerType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{bonus.sourceName}</td>
                      <td className="px-4 py-3">
                        <Badge variant={BONUS_STATUS_VARIANT[bonus.status]} size="sm">
                          {BONUS_STATUS_LABELS[bonus.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        {formatCurrency(bonus.grossAmount, currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">
                        {formatCurrency(bonus.netAmount, currency)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(bonus.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
  );
}

// ─── Section: Inscritos ─────────────────────────────────────────────────────

function SectionInscritos({ programId, currency }: { programId: string; currency: string }) {
  const [page, setPage] = useState(1);
  const { data: recruitsData, isLoading } = useMyRecruits(programId, { page, limit: 15 });

  const recruits = recruitsData?.data ?? [];
  const totalPages = recruitsData?.totalPages ?? 0;

  return (
    <Card>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Cargando inscritos...</div>
        ) : recruits.length === 0 ? (
          <div className="p-12 text-center">
            <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Sin inscritos aun</p>
            <p className="text-gray-400 text-sm mt-1">
              Comparte tu enlace de referido para inscribir distribuidores
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Distribuidor</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha Inscripcion</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Kit</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Bono</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Monto Bono</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recruits.map((recruit: RecruitItem) => (
                    <tr key={recruit.customerId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{recruit.customerName}</div>
                        <div className="text-xs text-gray-500">{recruit.customerCode}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(recruit.enrollmentDate)}</td>
                      <td className="px-4 py-3 text-center">
                        {recruit.hasKitOrder ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {recruit.bonusGenerated ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <ClockIcon className="h-5 w-5 text-amber-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        {recruit.bonusAmount
                          ? formatCurrency(recruit.bonusAmount, currency)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-50">{icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
            <p className="text-xs text-gray-400 truncate">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
