'use client';

import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import {
  DataTable,
  type DataTableColumn,
} from '@/components/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { RankProjectionResponse } from '@/types/simulacion';
import { exportReportPdf } from '../utils/exportPdf';
import { toast } from 'sonner';

const fmtNumber = (n: number) => n.toLocaleString('es-MX');
const fmtCurrency = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

interface Props {
  report: RankProjectionResponse;
}

export function SimulationReport({ report }: Props) {
  const {
    distributor,
    periodCode,
    periodName,
    currentSituation,
    legs,
    targetRank,
    requirements,
    scenario,
    rankComparison,
    potentialLeaders,
    commissionHistory,
    summary,
  } = report;

  const handlePrint = () => window.print();
  const handlePdf = () => {
    try {
      exportReportPdf(report);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo exportar el PDF');
    }
  };

  return (
    <div>
      {/* Action bar (no se imprime) */}
      <div className="flex items-center justify-end gap-2 mb-3 print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
        >
          <PrinterIcon className="h-4 w-4" />
          Imprimir
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handlePdf}
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Descargar PDF
        </Button>
      </div>

      {/* Reporte (área que se imprime/exporta) */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <ReportHeader
          distributorName={distributor.fullName}
          legacyId={distributor.legacyId}
          targetRankName={targetRank.name}
          periodName={periodName}
          periodCode={periodCode}
          status={distributor.status}
          branchName={distributor.branchName}
        />

        <div className="p-6 space-y-8">
          <Section title="Situación actual">
            <KpiGrid current={currentSituation} />
          </Section>

          {legs.length > 0 && (
            <Section title="Estructura de piernas con volumen">
              <LegList legs={legs} />
            </Section>
          )}

          <Section title={`¿Qué necesita para llegar a ${targetRank.name}?`}>
            <RequirementsTable rows={requirements} />
          </Section>

          {summary.problems.length > 0 && (
            <ProblemBox problems={summary.problems} />
          )}
          {summary.opportunities.length > 0 && (
            <OpportunityBox opportunities={summary.opportunities} />
          )}

          <Section title={`Escenario simulado: llega a ${targetRank.name}`}>
            <Scenario scenario={scenario} />
          </Section>

          <Section title={`Comparativo por rango — ${periodCode}`}>
            <RankComparisonTable rows={rankComparison} />
          </Section>

          {potentialLeaders.length > 0 && (
            <Section title="Líderes potenciales en la red (rangos calculados)">
              <PotentialLeadersTable rows={potentialLeaders} />
            </Section>
          )}

          {commissionHistory.length > 0 && (
            <Section title={`Historial de comisiones — ${distributor.fullName}`}>
              <CommissionHistoryTable rows={commissionHistory} />
            </Section>
          )}

          <SummaryBox summary={summary} targetRankName={targetRank.name} />
        </div>

        <div className="border-t border-gray-100 px-6 py-3 text-xs text-gray-500 text-center">
          Simulación generada con datos reales del periodo {periodCode} • Uso
          interno
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-componentes
// -----------------------------------------------------------------------------

function ReportHeader({
  distributorName,
  legacyId,
  targetRankName,
  periodName,
  periodCode,
  status,
  branchName,
}: {
  distributorName: string;
  legacyId: number;
  targetRankName: string;
  periodName: string;
  periodCode: string;
  status: string;
  branchName?: string;
}) {
  return (
    <div className="bg-gradient-to-r from-[#3E667D] to-[#2f5165] text-white px-6 py-6">
      <div className="text-xs uppercase tracking-wider opacity-80">
        Simulación de Rango
      </div>
      <div className="flex flex-wrap items-baseline gap-3 mt-1">
        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white/15 text-sm font-semibold">
          ▪ {targetRankName}
        </span>
        <h2 className="text-2xl font-bold">
          {distributorName} · #{legacyId}
        </h2>
      </div>
      <div className="mt-2 text-sm text-white/80 flex flex-wrap gap-4">
        <span>
          Periodo: <span className="font-semibold">{periodName}</span> ({periodCode})
        </span>
        <span>
          Status: <span className="font-semibold capitalize">{status}</span>
        </span>
        {branchName && (
          <span>
            Sucursal: <span className="font-semibold">{branchName}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-base font-semibold text-[#3E667D] mb-3">{title}</h3>
      {children}
    </section>
  );
}

function KpiGrid({
  current,
}: {
  current: RankProjectionResponse['currentSituation'];
}) {
  const items = [
    {
      label: 'Rango actual',
      value: current.currentRank?.name ?? 'Sin rango',
      sub: current.currentRank ? `#${current.currentRank.rankNumber}` : '—',
    },
    {
      label: 'Compra personal',
      value: `${fmtNumber(current.personalPoints)} pts`,
      sub:
        current.personalPoints >= 3300
          ? 'Calificado'
          : 'No calificado (<3,300)',
    },
    {
      label: 'N1 directos',
      value: fmtNumber(current.directDownlinesCount),
      sub: `${current.qualifiedFirstLevelCount} calificados`,
    },
    {
      label: 'Volumen total de red',
      value: fmtCurrency(current.totalNetworkVolume),
      sub: '',
    },
    {
      label: 'Comisión actual',
      value: fmtCurrency(current.currentMonthlyCommission),
      sub: 'periodo seleccionado',
    },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-lg bg-[#C8DDF2]/30 p-3 border border-[#C8DDF2]/50"
        >
          <div className="text-xs text-gray-600">{it.label}</div>
          <div className="text-base font-bold text-[#2f5165] mt-1">
            {it.value}
          </div>
          {it.sub && (
            <div className="text-[11px] text-gray-500 mt-0.5">{it.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function LegList({
  legs,
}: {
  legs: RankProjectionResponse['legs'];
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm">
      {legs.map((leg, idx) => (
        <div key={leg.headCustomerId} className="py-1">
          <span className="font-bold">
            Pierna {idx + 1} — {leg.headFullName} (#{leg.headLegacyId}):
          </span>{' '}
          <span className="text-emerald-700 font-semibold">
            {fmtCurrency(leg.totalVolume)}
          </span>{' '}
          <span className="text-gray-500">
            ({leg.percentOfTotal.toFixed(1)}% del total · cap{' '}
            {fmtCurrency(leg.cappedVolume)})
          </span>
        </div>
      ))}
    </div>
  );
}

function RequirementsTable({
  rows,
}: {
  rows: RankProjectionResponse['requirements'];
}) {
  type RequirementRow = RankProjectionResponse['requirements'][number];
  const columns: DataTableColumn<RequirementRow>[] = [
    {
      key: 'label',
      header: 'Requisito',
      render: (r) => r.label,
    },
    {
      key: 'required',
      header: 'Necesita',
      cellClassName: 'font-bold',
      render: (r) => r.required,
    },
    {
      key: 'current',
      header: 'Actualmente',
      render: (r) => (
        <span
          className={
            r.meets
              ? 'text-emerald-700 font-semibold'
              : 'text-red-600 font-semibold'
          }
        >
          {r.current}{' '}
          {r.meets && <CheckCircleIcon className="inline h-4 w-4 ml-1" />}
        </span>
      ),
    },
    {
      key: 'gap',
      header: 'Qué falta',
      render: (r) => (
        <span className={r.meets ? 'text-emerald-700' : 'text-red-600'}>
          {r.gap}
        </span>
      ),
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <DataTable<RequirementRow>
        columns={columns}
        data={rows}
        getRowKey={(r, i) => String(r.label ?? i)}
      />
    </div>
  );
}

function ProblemBox({ problems }: { problems: string[] }) {
  return (
    <div className="rounded-lg border-l-4 border-red-400 bg-red-50 p-4 flex gap-3">
      <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <div className="font-semibold text-red-700 text-sm uppercase tracking-wider">
          Problema principal
        </div>
        <ul className="mt-1 text-sm text-gray-800 space-y-1 list-disc list-inside">
          {problems.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function OpportunityBox({ opportunities }: { opportunities: string[] }) {
  return (
    <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4 flex gap-3">
      <LightBulbIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div>
        <div className="font-semibold text-amber-700 text-sm uppercase tracking-wider">
          Oportunidad oculta
        </div>
        <ul className="mt-1 text-sm text-gray-800 space-y-1 list-disc list-inside">
          {opportunities.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Scenario({
  scenario,
}: {
  scenario: RankProjectionResponse['scenario'];
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold text-gray-700 mb-1">Supuestos:</div>
        <ul className="text-sm text-gray-700 list-disc list-inside space-y-0.5">
          {scenario.assumptions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <Table className="min-w-full divide-y divide-gray-200">
          <TableHeader className="bg-[#3E667D] text-white">
            <TableRow className="hover:bg-transparent">
              <Th>Concepto</Th>
              <Th>Cálculo</Th>
              <Th align="right">Monto</Th>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 bg-white text-sm">
            {scenario.commissionBreakdown.map((line, i) => (
              <TableRow key={i}>
                <Td>{line.concept}</Td>
                <Td className="text-gray-500">{line.calculation}</Td>
                <Td align="right" className="font-semibold text-emerald-700">
                  {fmtCurrency(line.amount)}
                </Td>
              </TableRow>
            ))}
            <TableRow className="bg-[#C8DDF2]/40">
              <Td className="font-bold uppercase">Total estimado</Td>
              <Td />
              <Td align="right" className="font-bold text-[#2f5165] text-base">
                {fmtCurrency(scenario.totalEstimated)}
              </Td>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {scenario.notes.length > 0 && (
        <ul className="text-xs text-gray-500 italic space-y-0.5 list-disc list-inside">
          {scenario.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RankComparisonTable({
  rows,
}: {
  rows: RankProjectionResponse['rankComparison'];
}) {
  type RankComparisonRow = RankProjectionResponse['rankComparison'][number];
  const columns: DataTableColumn<RankComparisonRow>[] = [
    {
      key: 'rankName',
      header: 'Rango',
      render: (r) => (
        <>
          {r.isTarget && '▪ '}
          {r.rankName}
        </>
      ),
    },
    {
      key: 'ml1',
      header: 'ML1',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (r) => fmtCurrency(r.ml1),
    },
    {
      key: 'ml2',
      header: 'ML2',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (r) => fmtCurrency(r.ml2),
    },
    {
      key: 'ml3',
      header: 'ML3',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (r) => fmtCurrency(r.ml3),
    },
    {
      key: 'generations',
      header: 'Generaciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (r) => fmtCurrency(r.generations),
    },
    {
      key: 'total',
      header: 'Total',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (r) => (
        <span
          className={
            r.isTarget
              ? 'text-emerald-700 font-bold'
              : 'font-semibold text-gray-800'
          }
        >
          {fmtCurrency(r.total)}
        </span>
      ),
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <DataTable<RankComparisonRow>
        columns={columns}
        data={rows}
        getRowKey={(r, i) => String(r.rankCode ?? i)}
        rowClassName={(r) => (r.isTarget ? 'bg-emerald-50 font-semibold' : '')}
      />
    </div>
  );
}

function PotentialLeadersTable({
  rows,
}: {
  rows: RankProjectionResponse['potentialLeaders'];
}) {
  type PotentialLeaderRow = RankProjectionResponse['potentialLeaders'][number];
  const columns: DataTableColumn<PotentialLeaderRow>[] = [
    {
      key: 'leader',
      header: 'Líder',
      render: (r) => (
        <>
          <div className="font-semibold">{r.fullName}</div>
          <div className="text-xs text-gray-500">#{r.legacyId}</div>
        </>
      ),
    },
    {
      key: 'relativeDepth',
      header: 'Profundidad',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (r) => `N${r.relativeDepth}`,
    },
    {
      key: 'personalPoints',
      header: 'Compra pers.',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (r) => fmtNumber(r.personalPoints),
    },
    {
      key: 'qualifiedFirstLevelCount',
      header: 'N1 calif.',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (r) => r.qualifiedFirstLevelCount,
    },
    {
      key: 'rollOverCapped',
      header: 'Roll over',
      headerClassName: 'text-right',
      cellClassName: 'text-right font-semibold',
      render: (r) => fmtCurrency(r.rollOverCapped),
    },
    {
      key: 'potentialRankName',
      header: 'Rango pot.',
      render: (r) => (
        <span className="inline-block rounded-md px-2 py-0.5 bg-[#C8DDF2]/40 text-[#2f5165] text-xs font-semibold">
          {r.potentialRankName}
        </span>
      ),
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <DataTable<PotentialLeaderRow>
        columns={columns}
        data={rows}
        getRowKey={(r, i) => String(r.customerId ?? i)}
      />
    </div>
  );
}

function CommissionHistoryTable({
  rows,
}: {
  rows: RankProjectionResponse['commissionHistory'];
}) {
  const avg =
    rows.reduce((acc, r) => acc + r.totalCommission, 0) / Math.max(1, rows.length);
  type CommissionHistoryRow = RankProjectionResponse['commissionHistory'][number];
  const columns: DataTableColumn<CommissionHistoryRow>[] = [
    {
      key: 'period',
      header: 'Periodo',
      render: (r) => (
        <>
          {r.periodName} ({r.periodCode})
        </>
      ),
    },
    {
      key: 'rankName',
      header: 'Rango',
      render: (r) =>
        r.rankName ? (
          <span className="inline-block rounded-md px-2 py-0.5 bg-[#C8DDF2]/40 text-[#2f5165] text-xs font-semibold">
            {r.rankName}
          </span>
        ) : (
          <span className="text-xs text-gray-400">Sin rango</span>
        ),
    },
    {
      key: 'totalCommission',
      header: 'Comisión total',
      headerClassName: 'text-right',
      cellClassName: 'text-right font-semibold',
      render: (r) => fmtCurrency(r.totalCommission),
    },
    {
      key: 'recordsCount',
      header: 'Registros',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (r) => r.recordsCount,
    },
  ];
  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <DataTable<CommissionHistoryRow>
          columns={columns}
          data={rows}
          getRowKey={(r, i) => String(r.periodCode ?? i)}
        />
      </div>
      <p className="text-xs text-gray-500 italic mt-2">
        Promedio mensual: {fmtCurrency(avg)} — sumatoria de aportaciones en{' '}
        commission_details. El rango proviene del último cambio registrado en
        rank_history vigente al cierre de cada periodo.
      </p>
    </>
  );
}

function SummaryBox({
  summary,
  targetRankName,
}: {
  summary: RankProjectionResponse['summary'];
  targetRankName: string;
}) {
  return (
    <div className="rounded-lg bg-[#C8DDF2]/30 border border-[#C8DDF2]/60 p-5">
      <div className="text-sm font-bold text-[#2f5165] uppercase tracking-wider mb-2">
        Resumen
      </div>
      <p className="text-sm text-gray-800">{summary.headline}</p>
      {summary.monthlyGap > 0 && (
        <p className="mt-2 text-sm font-semibold text-red-700">
          Lo que deja en la mesa cada mes por no estar en {targetRankName}:{' '}
          {fmtCurrency(summary.monthlyGap)}.
        </p>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Helpers de tabla
// -----------------------------------------------------------------------------

function Th({
  children,
  align,
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
}) {
  const cls =
    align === 'right'
      ? 'text-right'
      : align === 'center'
        ? 'text-center'
        : 'text-left';
  return (
    <th
      className={`${cls} px-3 py-2 text-xs font-semibold uppercase tracking-wider`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  className = '',
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  const cls =
    align === 'right'
      ? 'text-right'
      : align === 'center'
        ? 'text-center'
        : 'text-left';
  return <td className={`${cls} px-3 py-2 ${className}`}>{children}</td>;
}
