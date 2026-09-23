'use client';

// NetworkHeader — Cabecera compacta de "Mi red" (contrato /distribuidor/red
// §5.1, V13): título, línea del periodo 26→25 con días restantes (calculados
// por el servidor con CURRENT_DATE, nunca aquí), UN selector de periodo (hasta
// el actual) que gobierna resumen, explorador, lista, volumen y el Excel (V7),
// y las acciones: Dar de alta socio / Cliente preferente (mismo gate del piloto
// `registerMember`, fail-closed), Enlace de invitación y Descargar Excel
// (desplaza a la tarjeta). Sin "Volver al Panel" (D3).

import { useLocale, useTranslations } from 'next-intl';
import { ArrowDownTrayIcon, CalendarDaysIcon, ShareIcon, UserPlusIcon, UsersIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect';
import { Skeleton } from '@/components/ui/skeleton';
import { fmtPeriodRange } from '@/lib/network/format';
import type { NetworkOverviewPeriod } from '@/types/network';

interface NetworkHeaderProps {
  /** Periodo resuelto por el servidor (overview.period); null mientras carga. */
  period: NetworkOverviewPeriod | null;
  periodOptions: SearchableSelectOption[];
  /** Id elegido ('' mientras no se conoce el actual). */
  selectedPeriodId: string;
  onPeriodChange: (periodId: string) => void;
  registerMemberEnabled: boolean;
  /** Texto del gate del piloto (tooltip de los botones de alta). */
  gateMessage: string;
  onEnroll: () => void;
  onPreferred: () => void;
  onInvite: () => void;
  onDownload: () => void;
}

export function NetworkHeader({
  period,
  periodOptions,
  selectedPeriodId,
  onPeriodChange,
  registerMemberEnabled,
  gateMessage,
  onEnroll,
  onPreferred,
  onInvite,
  onDownload,
}: NetworkHeaderProps) {
  const t = useTranslations('distributor.network.header');
  const locale = useLocale();
  const range = period ? fmtPeriodRange(period.startDate, period.endDate, locale) : null;
  const gateTitle = registerMemberEnabled ? undefined : gateMessage;
  const gatedClass = registerMemberEnabled ? '' : 'opacity-60';

  return (
    <header
      data-tour="d-red-header"
      className="rounded-2xl bg-gradient-to-r from-[#3E667D] to-[#2f5165] px-4 py-5 text-white shadow-lg sm:px-6 lg:px-8"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <UsersIcon className="h-7 w-7 shrink-0" aria-hidden="true" />
            <h1 className="text-2xl font-bold leading-tight lg:text-3xl">{t('title')}</h1>
          </div>
          {period && range ? (
            <p className="mt-1 text-sm text-white/85">
              {t('periodLine', { period: period.name, start: range.start, end: range.end })}
              <span className="text-white/60"> · </span>
              <span className={period.isClosed ? 'text-white/70' : 'font-medium text-[#C8DDF2]'}>
                {period.isClosed ? t('closed') : period.daysLeft != null ? t('daysLeft', { days: period.daysLeft }) : ''}
              </span>
            </p>
          ) : (
            <Skeleton className="mt-2 h-4 w-64 max-w-full bg-white/20" />
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-2.5 py-1.5">
            <CalendarDaysIcon className="h-5 w-5 shrink-0 text-[#C8DDF2]" aria-hidden="true" />
            <div className="w-full min-w-0 sm:w-[220px]">
              <SearchableSelect
                options={periodOptions}
                value={selectedPeriodId}
                onChange={onPeriodChange}
                showAllOption={false}
                disabled={!periodOptions.length}
                className="w-full bg-white text-gray-900"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={onEnroll}
              title={gateTitle}
              aria-disabled={!registerMemberEnabled}
              className={`bg-white text-[#3E667D] hover:bg-white/90 ${gatedClass}`}
            >
              <UserPlusIcon className="h-4 w-4" aria-hidden="true" />
              {t('enroll')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onPreferred}
              title={gateTitle}
              aria-disabled={!registerMemberEnabled}
              className={`border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white ${gatedClass}`}
            >
              <UserPlusIcon className="h-4 w-4" aria-hidden="true" />
              {t('preferred')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onInvite}
              className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <ShareIcon className="h-4 w-4" aria-hidden="true" />
              {t('invite')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
              {t('download')}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
