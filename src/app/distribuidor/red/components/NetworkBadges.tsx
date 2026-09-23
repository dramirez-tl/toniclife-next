'use client';

// Piezas visuales compartidas de "Mi red" (contrato /distribuidor/red §5.4,
// §5.5): avatar de iniciales, chip de rango (color por rankNumber, V14),
// semáforo de compra del periodo (calificado / con puntos / sin puntos, con
// "en riesgo" y "nuevo") y chip de ESTADO de la cuenta con su tooltip (D7: el
// estado no dice si compró; el semáforo sí). Solo tokens del panel.

import { useTranslations } from 'next-intl';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RANK_LABELS } from '@/constants/ranks';
import { initialsOf, rankColorByNumber } from '@/lib/network/rank-color';
import type { NetworkActivity } from '@/types/network';

const CHIP = 'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap';

export function Avatar({ name, className = '' }: { name: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3E667D] to-[#C8DDF2] text-xs font-bold text-white ${className}`}
    >
      {initialsOf(name)}
    </div>
  );
}

/** Rango DEL PERIODO; sin fila ⇒ "Distribuidor" en tono neutro. */
export function RankChip({
  rankName,
  rankNumber,
  className = '',
}: {
  rankName: string | null | undefined;
  rankNumber: number | null | undefined;
  className?: string;
}) {
  return (
    <span className={`${CHIP} ${rankColorByNumber(rankNumber)} ${className}`}>
      {rankName || RANK_LABELS.distribuidor}
    </span>
  );
}

const ACTIVITY_TONE: Record<NetworkActivity, { dot: string; text: string }> = {
  qualified: { dot: 'bg-emerald-500', text: 'text-emerald-700' },
  active: { dot: 'bg-[#3E667D]', text: 'text-[#3E667D]' },
  none: { dot: 'bg-gray-300', text: 'text-gray-500' },
};

/** Semáforo de compra del periodo (misma definición del home: puntos personales). */
export function ActivityBadge({
  activity,
  atRisk,
  isNew,
  className = '',
}: {
  activity: NetworkActivity;
  atRisk?: boolean;
  isNew?: boolean;
  className?: string;
}) {
  const t = useTranslations('distributor.network.explorer.semaphore');
  const risky = activity === 'none' && Boolean(atRisk);
  const tone = risky ? { dot: 'bg-amber-500', text: 'text-amber-700' } : ACTIVITY_TONE[activity];
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium ${tone.text} ${className}`}>
      <span aria-hidden="true" className={`inline-block h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
      <span>{risky ? t('atRisk') : t(activity)}</span>
      {isNew && <span className={`${CHIP} bg-[#C8DDF2] text-[#2f5165]`}>{t('new')}</span>}
    </span>
  );
}

const STATUS_TONE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
  suspended: 'bg-amber-50 text-amber-700',
};

/** Estado de la CUENTA (customers.status) con tooltip: no indica si compró. */
export function StatusChip({ status, className = '' }: { status: string; className?: string }) {
  const t = useTranslations('distributor.network');
  const known = status === 'active' || status === 'inactive' || status === 'suspended';
  const label = known ? t(`status.${status}`) : status;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          aria-label={`${label}. ${t('list.statusTooltip')}`}
          className={`${CHIP} cursor-help focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D] ${STATUS_TONE[status] ?? 'bg-gray-100 text-gray-600'} ${className}`}
        >
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{t('list.statusTooltip')}</TooltipContent>
    </Tooltip>
  );
}
