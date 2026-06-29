// components/commissions/CommissionBreakdown.tsx
// Desglose paso a paso de "cómo se calculó tu comisión" del periodo, usando
// datos reales (resumen + estructura, ya convertidos a la moneda del distribuidor).
'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('distributor.commissions.breakdown');
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
    { key: 'mlm', label: t('typeMlm'), amount: parseFloat(summary.mlmCommissionsMxn || '0'), color: 'text-blue-600' },
    { key: 'cedea', label: t('typeCedea'), amount: parseFloat(summary.cedeaBonusesMxn || '0'), color: 'text-yellow-600' },
    { key: 'auto', label: t('typeAuto'), amount: parseFloat(summary.autoBonusesMxn || '0'), color: 'text-purple-600' },
    { key: 'adj', label: t('typeAdjustment'), amount: parseFloat(summary.adjustmentsMxn || '0'), color: 'text-gray-600' },
  ].filter((tp) => tp.amount !== 0);

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
            <h3 className="text-lg font-bold text-gray-900">{t('title')}</h3>
            <p className="text-sm text-gray-500">
              {t('subtitle', { active: isActivePeriod ? t('subtitleActive') : '' })}
            </p>
          </div>
        </div>

        <div>
          {/* Paso 1: rango y alcance */}
          <Step n={1} icon={TrophyIcon} title={t('step1Title')}>
            <p className="text-sm text-gray-600">
              {t('step1RankPrefix')} <span className="font-semibold text-gray-900">{userRankName}</span> {t('step1LevelText')}{' '}
              <span className="font-semibold text-gray-900">{t('step1LevelHighlight', { level: userLevelMax })}</span>
              {userGenerationMax > 0 ? (
                <>{t('step1GenerationText')}<span className="font-semibold text-gray-900">{t('step1GenerationHighlight', { generation: userGenerationMax })}</span>{t('step1Period')}</>
              ) : (
                <>{t('step1NoGeneration')}</>
              )}
            </p>
          </Step>

          {/* Paso 2: calificados → % → monto por nivel */}
          <Step n={2} icon={UserGroupIcon} title={t('step2Title')}>
            <p className="text-sm text-gray-600">
              {t.rich('step2Body', {
                count: userQualifiedCount,
                strong: (chunks) => <span className="font-semibold text-gray-900">{chunks}</span>,
              })}
              {hasLevelAmounts && t('step2HasAmounts')}
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
                        <p className="text-[11px] text-gray-500">{t('step2Level', { n: l.levelNumber })}</p>
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
                            {t('step2Members', { count: bd.members })}
                          </span>
                        ) : (
                          <span />
                        )}
                        {upgraded && (
                          <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-0.5">
                            <CheckCircleIcon className="h-3 w-3" /> {t('step2Upgraded')}
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
                  {t('step2TotalMlm')}
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
          <Step n={3} icon={ReceiptPercentIcon} title={t('step3Title')}>
            {types.length > 0 ? (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                {types.map((tp) => (
                  <div key={tp.key} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-600">{tp.label}</span>
                    <span className={`text-sm font-semibold tabular-nums ${tp.color}`}>{fmt(tp.amount)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
                  <span className="text-sm font-semibold text-gray-700">{t('step3Subtotal')}</span>
                  <span className="text-sm font-bold text-gray-900 tabular-nums">{fmt(subtotal)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                {t('step3Empty')}
              </p>
            )}
          </Step>

          {/* Paso 4: bruto → impuestos → neto */}
          <Step n={4} icon={ArrowRightIcon} title={t('step4Title')}>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                <span className="text-sm text-gray-600">{t('step4Gross')}</span>
                <span className="text-sm font-semibold text-gray-900 tabular-nums">{fmt(subtotal)}</span>
              </div>
              {iva > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                  <span className="text-sm text-gray-600">{t('step4Iva')}</span>
                  <span className="text-sm font-semibold text-blue-600 tabular-nums">+ {fmt(iva)}</span>
                </div>
              )}
              {ivaWh > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                  <span className="text-sm text-gray-600">{t('step4IvaWithholding')}</span>
                  <span className="text-sm font-semibold text-red-500 tabular-nums">- {fmt(ivaWh)}</span>
                </div>
              )}
              {isr > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                  <span className="text-sm text-gray-600">{t('step4Isr')}</span>
                  <span className="text-sm font-semibold text-red-500 tabular-nums">- {fmt(isr)}</span>
                </div>
              )}
              {resico > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                  <span className="text-sm text-gray-600">{t('step4Resico')}</span>
                  <span className="text-sm font-semibold text-red-500 tabular-nums">- {fmt(resico)}</span>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3 bg-[#3E667D]/5">
                <span className="text-sm font-bold text-[#3E667D]">{t('step4Net')}</span>
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
