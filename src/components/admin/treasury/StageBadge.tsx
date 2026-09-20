'use client';

// StageBadge — etapa derivada de Tesorería (8 etapas, contrato §1.1) con el
// badge "Estimado" cuando la fila pertenece al periodo abierto.

import {
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentCheckIcon,
  PaperAirplaneIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import type { CommissionStage } from '@/types/treasury';
import { STAGE_LABELS, STAGE_TONES } from './treasury-format';

const ICONS: Record<CommissionStage, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  estimated: ClockIcon,
  calculated: ClockIcon,
  ready: DocumentCheckIcon,
  approved: CheckCircleIcon,
  in_dispersion: PaperAirplaneIcon,
  paid: BanknotesIcon,
  reconciled: ShieldCheckIcon,
  cancelled: XCircleIcon,
};

interface StageBadgeProps {
  stage: CommissionStage;
  isEstimate?: boolean;
}

export function StageBadge({ stage, isEstimate }: StageBadgeProps) {
  const Icon = ICONS[stage] ?? ClockIcon;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge variant={STAGE_TONES[stage] ?? 'secondary'}>
        <Icon className="h-3 w-3" aria-hidden />
        {STAGE_LABELS[stage] ?? stage}
      </Badge>
      {isEstimate && stage !== 'estimated' && (
        <Badge variant="outline" className="text-muted-foreground" title="Periodo abierto: la cifra cambia cada 4 h">
          Estimado
        </Badge>
      )}
    </span>
  );
}
