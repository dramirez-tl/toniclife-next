'use client';

// NetworkExportCard — Tarjeta "Descarga de tu red" (contrato /distribuidor/red
// §5.6 y §6.3). El archivo es el CSV de SIEMPRE (formato congelado, V1); lo
// nuevo es el mecanismo: POST network/export con el periodo del encabezado
// (D2), estado por fase con barra honesta (en espera con posición · contando ·
// recorriendo N registros aprox. X s · escribiendo a de b (p %) · listo +
// Descargar + "Disponible hasta las HH:MM"), Cancelar en espera/en curso,
// interrumpida/expirada ⇒ "Volver a generar", 429 ⇒ ocupado, reused ⇒ toast,
// cancelada ⇒ info, y descargas recientes (máx. 5, localStorage).
// El sondeo (un solo intervalo) y los avisos al terminar los lleva
// NetworkExportWatcher (layout); aquí se lee la misma query y el estado
// compartido (useNetworkExportStore) y se actúa.

import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowDownTrayIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCancelNetworkExport, useNetworkExportJob, useStartNetworkExport } from '@/hooks/useNetwork';
import { setStoredExportJob, useExportDownloader, useNetworkExportStore } from '@/hooks/useNetworkExportStore';
import { networkApi } from '@/services/networkApi';
import { describeJob, downloadedOnce, exportPanelView, phaseOf } from '@/lib/network/export-job';
import { fmtDate, fmtInt, fmtRelativeTime, minutesSince } from '@/lib/network/format';
import { networkErrorKey } from '@/lib/network/network-error';

interface NetworkExportCardProps {
  /** Periodo elegido en el encabezado; null = actual (lo resuelve el servidor con CURRENT_DATE). */
  periodId: string | null;
  periodName: string | null;
  isCurrentPeriod: boolean;
}

export function NetworkExportCard({ periodId, periodName, isCurrentPeriod }: NetworkExportCardProps) {
  const t = useTranslations('distributor.network');
  const locale = useLocale();
  const { stored, notice, history } = useNetworkExportStore();
  // Misma query que el vigía; el intervalo lo arma solo él (un solo sondeo, §6.3).
  const { job, unreachable, resume, isLoading: jobLoading } = useNetworkExportJob(stored?.jobId, { poll: false });
  const startMutation = useStartNetworkExport();
  const cancelMutation = useCancelNetworkExport();
  const download = useExportDownloader();

  const desc = job ? describeJob(job) : null;
  const view = exportPanelView(job, unreachable);
  const jobActive = job ? !desc?.terminal : Boolean(stored) && !notice && jobLoading;
  const busy = jobActive || startMutation.isPending;

  const handleStart = async (targetPeriodId: string | null, targetPeriodName: string | null) => {
    if (jobActive) {
      toast.info(t('exportPanel.already'));
      return;
    }
    try {
      const res = await startMutation.mutateAsync(targetPeriodId);
      let startedAt = new Date().toISOString();
      let reusedMinutes: number | null = null;
      if (res.reused) {
        const state = await networkApi.getNetworkExportJob(res.jobId).catch(() => null);
        if (state?.startedAt) startedAt = state.startedAt;
        reusedMinutes = minutesSince(state?.finishedAt) ?? 0;
      }
      setStoredExportJob({ jobId: res.jobId, startedAt, periodId: targetPeriodId, periodName: targetPeriodName });
      if (res.reused) toast.info(t('exportPanel.reused', { minutes: reusedMinutes ?? 0 }));
      else toast.info(t('exportPanel.toastStarted'));
    } catch (err) {
      toast.error(t(networkErrorKey(err)));
    }
  };

  const handleCancel = async () => {
    if (!job) return;
    try {
      await cancelMutation.mutateAsync(job.jobId);
    } catch (err) {
      toast.error(t(networkErrorKey(err)));
    }
  };

  // Los conteos se formatean por idioma; posición/porcentaje/eta van crudos (ICU).
  const phaseValues = desc
    ? Object.fromEntries(
        Object.entries(desc.values).map(([key, value]) => [
          key,
          typeof value === 'number' && (key === 'total' || key === 'processed') ? fmtInt(value, locale) : value,
        ]),
      )
    : {};
  const phaseLabel = desc ? t(desc.labelKey, phaseValues) : '';
  const buttonLabel = isCurrentPeriod || !periodName ? t('exportPanel.button') : t('exportPanel.buttonPeriod', { period: periodName });
  const regenerate = () => void handleStart(stored?.periodId ?? periodId, stored?.periodName ?? periodName);

  return (
    <Card data-tour="d-red-export">
      <CardContent className="p-4 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900">{t('exportPanel.title')}</h3>
            <p className="text-sm text-gray-500">{t('exportPanel.subtitle', { period: periodName ?? '' })}</p>
          </div>
          <Button
            onClick={() => void handleStart(periodId, periodName)}
            disabled={busy}
            aria-busy={busy}
            className="w-full shrink-0 sm:w-auto"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t('exportPanel.buttonBusy')}
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                {buttonLabel}
              </>
            )}
          </Button>
        </div>

        {/* Aviso: el job guardado ya no existe (servidor reiniciado o archivo expirado) */}
        {notice && !stored && (
          <div role="status" className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <span>{t(`exportPanel.phase.${notice.kind}`)}</span>
            <Button variant="outline" size="sm" onClick={regenerate} className="w-full sm:w-auto">
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
              {t('exportPanel.regenerate')}
            </Button>
          </div>
        )}

        {/* Estado del job guardado: el aviso "sin conexión" manda sobre el último estado (§6.3) */}
        {stored && (
          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3" aria-live="polite">
            {view === 'unreachable' ? (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-amber-800">{t('errors.unreachable')}</p>
                  <Button variant="outline" size="sm" onClick={resume}>
                    <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
                    {t('overview.retry')}
                  </Button>
                </div>
                {/* Última fase conocida, en gris: el sondeo está detenido hasta reintentar */}
                {desc && <p className="mt-2 text-xs text-gray-500">{phaseLabel}</p>}
              </>
            ) : view === 'job' && job && desc ? (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className={`text-sm font-medium ${desc.phase === 'error' ? 'text-red-700' : 'text-gray-800'}`}>{phaseLabel}</p>
                  <div className="flex flex-wrap gap-2">
                    {desc.canCancel && (
                      <Button variant="ghost" size="sm" onClick={() => void handleCancel()} disabled={cancelMutation.isPending}>
                        <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                        {t('exportPanel.cancel')}
                      </Button>
                    )}
                    {desc.phase === 'done' && (
                      <>
                        {/* Listo y aún sin descargar (p. ej. encontrado al montar): se ofrece, no baja solo (§5.6) */}
                        {!downloadedOnce(job.jobId) && (
                          <span className="inline-flex items-center text-xs font-semibold text-emerald-700">{t('exportPanel.downloadReady')}</span>
                        )}
                        <Button size="sm" onClick={() => void download(job)}>
                          <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                          {t('exportPanel.download')}
                        </Button>
                      </>
                    )}
                    {(desc.phase === 'error' || desc.phase === 'cancelled') && (
                      <Button variant="outline" size="sm" onClick={regenerate}>
                        <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
                        {t('exportPanel.regenerate')}
                      </Button>
                    )}
                  </div>
                </div>
                {!desc.terminal && (
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={desc.indeterminate ? undefined : (desc.percent ?? 0)}
                    aria-valuetext={phaseLabel}
                    className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-200"
                  >
                    {desc.indeterminate ? (
                      <div className="h-full w-2/5 animate-pulse rounded-full bg-[#3E667D]/70" />
                    ) : (
                      <div className="h-full rounded-full bg-[#3E667D] transition-[width] duration-500" style={{ width: `${desc.percent ?? 0}%` }} />
                    )}
                  </div>
                )}
                {desc.phase === 'done' && desc.expiresAt && (
                  <p className="mt-2 text-xs text-gray-500">{t('exportPanel.availableUntil', { time: fmtDate(desc.expiresAt, locale, 'time') })}</p>
                )}
                {!desc.terminal && <p className="mt-2 text-xs text-gray-500">{t('exportPanel.keepBrowsing')}</p>}
              </>
            ) : (
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t('exportPanel.buttonBusy')}
              </p>
            )}
          </div>
        )}

        {/* Descargas recientes (localStorage, máx. 5) */}
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('exportPanel.recent')}</h4>
          {history.length === 0 ? (
            <p className="mt-1 text-sm text-gray-400">{t('exportPanel.recentEmpty')}</p>
          ) : (
            <ul className="mt-1 divide-y divide-gray-100">
              {history.map((item) => {
                const alive = Boolean(job) && job?.jobId === item.jobId && phaseOf(job) === 'done';
                return (
                  <li key={item.jobId} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0 break-all text-sm text-gray-700">
                      {t('exportPanel.recentItem', {
                        filename: item.filename,
                        rows: fmtInt(item.rows, locale),
                        when: fmtRelativeTime(item.finishedAt, locale),
                      })}
                    </span>
                    {alive && job ? (
                      <Button variant="ghost" size="sm" onClick={() => void download(job)} className="text-[#3E667D]">
                        <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                        {t('exportPanel.download')}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleStart(item.periodId ?? null, item.periodName ?? null)}
                        className="text-[#3E667D]"
                      >
                        <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
                        {t('exportPanel.regenerate')}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-400">{t('exportPanel.sameFormat')}</p>
      </CardContent>
    </Card>
  );
}
