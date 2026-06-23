// components/commissions/CommissionBreakdown.tsx
// Desglose paso a paso de "cómo se calculó tu comisión" del periodo, usando
// datos reales (resumen + estructura, ya convertidos a la moneda del distribuidor).
'use client';

import {
  CommissionStructure,
  CommissionSummary,
  CommissionLevelBreakdown,
} from '@/types/commissions';
import { Card, CardContent } from '@/components/ui/card';
import {
  CalculatorIcon,
  TrophyIcon,
  UserGroupIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline';

interface CommissionBreakdownProps {
  summary: CommissionSummary | null;
  structure: CommissionStructure | null;
  levelBreakdown?: CommissionLevelBreakdown | null;
  currencyCode?: string;
  isActivePeriod?: boolean;
}

export function CommissionBreakdown({
  summary,
  structure,
  levelBreakdown,
  currencyCode = 'MXN',
  isActivePeriod,
}: CommissionBreakdownProps) {
  if (!summary) return null;

  const isUsd = currencyCode === 'USD';
  const fmt = (v: string | number) => {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return new Intl.NumberFormat(isUsd ? 'en-US' : 'es-MX', {
      style: 'currency',
      currency: currencyCode || 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(isNaN(n) ? 0 : n);
  };
  const pct = (v?: string) => `${(parseFloat(v || '0') * 100).toFixed(0)}%`;

  const subtotal = parseFloat(summary.totalSubtotalMxn || '0');
  const net = parseFloat(summary.totalNetMxn || '0');
  const iva = parseFloat(summary.totalIva || '0');
  const ivaWh = parseFloat(summary.totalIvaWithholding || '0');
  const isr = parseFloat(summary.totalIsr || '0');
  const resico = parseFloat(summary.totalResico || '0');

  const types = [
    { key: 'mlm', label: 'Comisiones por nivel (MLM)', amount: parseFloat(summary.mlmCommissionsMxn || '0'), color: 'text-blue-600' },
    { key: 'cedea', label: 'Bonos por generación', amount: parseFloat(summary.cedeaBonusesMxn || '0'), color: 'text-yellow-600' },
    { key: 'auto', label: 'Bonos automáticos', amount: parseFloat(summary.autoBonusesMxn || '0'), color: 'text-purple-600' },
    { key: 'adj', label: 'Ajustes', amount: parseFloat(summary.adjustmentsMxn || '0'), color: 'text-gray-600' },
  ].filter((t) => t.amount !== 0);

  const userLevelMax = structure?.userLevelMax ?? 2;
  const userQualifiedCount = structure?.userQualifiedCount ?? 0;
  const userRankName = structure?.userRankName ?? 'Distribuidor';
  const userGenerationMax = structure?.userGenerationMax ?? 0;
  const applicableLevels = (structure?.levels ?? []).filter(
    (l) => l.levelNumber <= userLevelMax,
  );
  const breakdownByLevel = new Map(
    (levelBreakdown?.levels ?? []).map((b) => [b.level, b]),
  );
  const hasLevelAmounts =
    !!levelBreakdown && parseFloat(levelBreakdown.totalMlm || '0') > 0;

  const Step = ({
    n,
    icon: Icon,
    title,
    children,
  }: {
    n: number;
    icon: typeof TrophyIcon;
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#3E667D] text-sm font-bold text-white">
          {n}
        </div>
        <div className="mt-1 w-px flex-1 bg-gray-200 last:hidden" />
      </div>
      <div className="flex-1 pb-6">
        <div className="mb-2 flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#3E667D]" />
          <h4 className="font-semibold text-gray-900">{title}</h4>
        </div>
        {children}
      </div>
    </div>
  );

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardContent className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3E667D]/10">
            <CalculatorIcon className="h-6 w-6 text-[#3E667D]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Cómo se calculó tu comisión</h3>
            <p className="text-sm text-gray-500">
              Paso a paso, con los datos reales del periodo
              {isActivePeriod ? ' (en curso, se cierra al final del periodo)' : ''}.
            </p>
          </div>
        </div>

        <div>
          {/* Paso 1: rango y alcance */}
          <Step n={1} icon={TrophyIcon} title="Tu rango define hasta dónde cobras">
            <p className="text-sm text-gray-600">
              Con rango <span className="font-semibold text-gray-900">{userRankName}</span> cobras
              comisión por nivel <span className="font-semibold text-gray-900">hasta el nivel {userLevelMax}</span>
              {userGenerationMax > 0 ? (
                <> y bonos por generación <span className="font-semibold text-gray-900">hasta la generación {userGenerationMax}</span>.</>
              ) : (
                <>. Las generaciones requieren rango Plata o superior.</>
              )}
            </p>
          </Step>

          {/* Paso 2: calificados → % → monto por nivel */}
          <Step n={2} icon={UserGroupIcon} title="Tus calificados definen el porcentaje de cada nivel">
            <p className="text-sm text-gray-600">
              Tienes <span className="font-semibold text-gray-900">{userQualifiedCount} calificado(s)</span> en
              tu primer nivel. De eso depende si en cada nivel cobras el % base o el % aumentado.
              {hasLevelAmounts && ' Abajo, el monto exacto que aportó cada nivel a tu comisión MLM.'}
            </p>
            {applicableLevels.length > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {applicableLevels.map((l) => {
                  const qualReq = l.qualifiersRequired || 0;
                  const upgraded = parseFloat(l.upgradedPercentage || '0') > 0 && qualReq > 0 && userQualifiedCount >= qualReq;
                  const rate = upgraded ? l.upgradedPercentage : l.basePercentage;
                  const bd = breakdownByLevel.get(l.levelNumber);
                  return (
                    <div key={l.levelNumber} className="rounded-lg border border-gray-200 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-gray-500">Nivel {l.levelNumber}</p>
                        <p className="text-sm font-bold text-[#3E667D]">{pct(rate)}</p>
                      </div>
                      {bd && (
                        <p className="mt-0.5 text-sm font-semibold text-gray-900 tabular-nums">
                          {fmt(bd.amount)}
                        </p>
                      )}
                      <div className="mt-0.5 flex items-center justify-between">
                        {bd && bd.members > 0 ? (
                          <span className="text-[10px] text-gray-400">
                            {bd.members} dist.
                          </span>
                        ) : (
                          <span />
                        )}
                        {upgraded && (
                          <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-0.5">
                            <CheckCircleIcon className="h-3 w-3" /> aumentado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {hasLevelAmounts && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-[#3E667D]/5 px-4 py-2.5">
                <span className="text-sm font-semibold text-[#3E667D]">
                  Total comisión por nivel (MLM)
                </span>
                <span className="text-sm font-bold text-[#3E667D] tabular-nums">
                  {fmt(levelBreakdown!.totalMlm)}{' '}
                  <span className="text-[10px] font-semibold text-[#3E667D]/60">
                    {currencyCode}
                  </span>
                </span>
              </div>
            )}
          </Step>

          {/* Paso 3: desglose por tipo */}
          <Step n={3} icon={ReceiptPercentIcon} title="Tu comisión bruta por tipo">
            {types.length > 0 ? (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                {types.map((t) => (
                  <div key={t.key} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-600">{t.label}</span>
                    <span className={`text-sm font-semibold tabular-nums ${t.color}`}>{fmt(t.amount)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
                  <span className="text-sm font-semibold text-gray-700">Subtotal bruto</span>
                  <span className="text-sm font-bold text-gray-900 tabular-nums">{fmt(subtotal)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Aún no hay comisiones registradas en este periodo.
              </p>
            )}
          </Step>

          {/* Paso 4: bruto → impuestos → neto */}
          <Step n={4} icon={ArrowRightIcon} title="Del bruto al neto (impuestos)">
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                <span className="text-sm text-gray-600">Bruto</span>
                <span className="text-sm font-semibold text-gray-900 tabular-nums">{fmt(subtotal)}</span>
              </div>
              {iva > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                  <span className="text-sm text-gray-600">IVA 16%</span>
                  <span className="text-sm font-semibold text-blue-600 tabular-nums">+ {fmt(iva)}</span>
                </div>
              )}
              {ivaWh > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Retención IVA</span>
                  <span className="text-sm font-semibold text-red-500 tabular-nums">- {fmt(ivaWh)}</span>
                </div>
              )}
              {isr > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                  <span className="text-sm text-gray-600">ISR</span>
                  <span className="text-sm font-semibold text-red-500 tabular-nums">- {fmt(isr)}</span>
                </div>
              )}
              {resico > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                  <span className="text-sm text-gray-600">RESICO</span>
                  <span className="text-sm font-semibold text-red-500 tabular-nums">- {fmt(resico)}</span>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3 bg-[#3E667D]/5">
                <span className="text-sm font-bold text-[#3E667D]">Neto a pagar</span>
                <span className="text-base font-bold text-[#3E667D] tabular-nums">
                  {fmt(net)} <span className="text-[10px] font-semibold text-[#3E667D]/60">{currencyCode}</span>
                </span>
              </div>
            </div>
          </Step>
        </div>
      </CardContent>
    </Card>
  );
}
