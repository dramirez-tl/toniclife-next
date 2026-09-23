'use client';

// NetworkExportWatcher — Vigía SIN UI de la descarga de "Mi red" (contrato
// /distribuidor/red §6.3, V12). Se monta una vez en app/distribuidor/layout.tsx:
// - al montar consulta GET network/export-jobs y decide (reconnectDecision):
//   reconectar al job vivo, ofrecer la descarga de uno listo, o avisar
//   "interrumpida"/"expirada" si el guardado ya no existe (404 ⇒ por startedAt);
// - comparte la query de estado con la tarjeta (misma clave: un solo sondeo,
//   pausado con la pestaña oculta) y, al terminar, muestra un toast persistente
//   "Tu archivo está listo" con "Descargar" desde CUALQUIER /distribuidor/*;
// - descarga automática UNA sola vez por job (tl_red_export_done_<jobId>,
//   varias pestañas sondean pero solo una descarga) y avisa una vez por job
//   (tl_red_export_seen_<jobId>) aunque se recargue la página;
// - un job que YA estaba listo al montar (offerDownload) se ofrece (toast con
//   "Descargar" + botón de la tarjeta) y no se descarga solo (§5.6): se anota
//   en `offered` y claimAutoDownload lo salta.
// No renderiza nada. Sin setState dentro de efectos: el estado compartido vive
// en useNetworkExportStore y las decisiones corren en callbacks.

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { networkKeys, useNetworkExportJob } from '@/hooks/useNetwork';
import {
  clearStoredExportJob,
  exportToastId,
  setStoredExportJob,
  useExportDownloader,
  useNetworkExportStore,
} from '@/hooks/useNetworkExportStore';
import { networkApi } from '@/services/networkApi';
import type { NetworkExportJob } from '@/types/network';
import {
  claimAutoDownload,
  claimNotified,
  clearDownloaded,
  describeJob,
  downloadedOnce,
  phaseOf,
  readStoredJob,
  reconnectDecision,
} from '@/lib/network/export-job';

export function NetworkExportWatcher() {
  const t = useTranslations('distributor.network');
  const queryClient = useQueryClient();
  const { stored } = useNetworkExportStore();
  const download = useExportDownloader();
  // Hasta decidir con export-jobs no se sondea: así un job guardado que ya no
  // existe se resuelve UNA vez (aquí) y no también por el 404 del sondeo.
  const [decided, setDecided] = useState(false);
  const { job, gone } = useNetworkExportJob(stored?.jobId, { enabled: decided });
  /** Jobs listos encontrados al montar: se ofrecen, no se descargan solos (por pestaña). */
  const offered = useRef(new Set<string>());

  // Decisión al montar (una vez). Lo no reactivo (t, decisión) va en un
  // "effect event": el efecto solo depende del queryClient.
  const decide = useEffectEvent((jobs: NetworkExportJob[] | null) => {
    const storedAtMount = readStoredJob();
    const decision = reconnectDecision({ jobs, stored: storedAtMount, isDownloaded: downloadedOnce });
    if (decision.kind === 'reconnect' || decision.kind === 'offerDownload') {
      if (decision.kind === 'offerDownload') offered.current.add(decision.jobId);
      if (!storedAtMount || storedAtMount.jobId !== decision.jobId) {
        setStoredExportJob({
          jobId: decision.jobId,
          startedAt: decision.job?.startedAt ?? new Date().toISOString(),
          periodId: decision.job?.periodId ?? null,
          periodName: decision.job?.periodName ?? null,
        });
      }
      if (decision.job) queryClient.setQueryData(networkKeys.exportJob(decision.jobId), decision.job);
    } else if (decision.kind === 'interrupted' || decision.kind === 'expired') {
      clearStoredExportJob({ kind: decision.kind, jobId: decision.jobId });
      if (claimNotified(decision.jobId)) toast.error(t(`exportPanel.phase.${decision.kind}`));
    }
    setDecided(true);
  });

  useEffect(() => {
    let cancelled = false;
    queryClient
      .fetchQuery({ queryKey: networkKeys.exportJobs(), queryFn: () => networkApi.listNetworkExportJobs(), staleTime: 0 })
      .then(
        (jobs) => jobs,
        () => null,
      )
      .then((jobs) => {
        if (!cancelled) decide(jobs);
      });
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  // Fin del job: aviso una vez por job y descarga automática una vez por job
  // (nunca para un job que ya estaba listo al montar: solo se ofrece).
  const onJobUpdate = useEffectEvent((current: NetworkExportJob) => {
    const phase = phaseOf(current);
    if (phase === 'done') {
      const first = claimAutoDownload(current.jobId, offered.current);
      if (claimNotified(current.jobId)) {
        toast.success(t('exportPanel.toastDone', { filename: current.filename }), {
          id: exportToastId(current.jobId),
          duration: Infinity,
          action: { label: t('exportPanel.toastDoneAction'), onClick: () => void download(current) },
        });
      }
      if (first) {
        // Si el navegador bloquea la descarga automática, queda el botón del toast/tarjeta.
        void download(current).then((ok) => {
          if (!ok) clearDownloaded(current.jobId);
        });
      }
      return;
    }
    if (phase === 'error' && claimNotified(current.jobId)) {
      const desc = describeJob(current);
      toast.error(t(desc.labelKey, desc.values));
      return;
    }
    if (phase === 'cancelled' && claimNotified(current.jobId)) {
      toast.info(t('exportPanel.phase.cancelled'));
    }
  });

  useEffect(() => {
    if (job) onJobUpdate(job);
  }, [job]);

  // 404 al sondear: el servidor se reinició (interrumpida) o el archivo expiró
  // (TTL 10 min desde startedAt). Se decide con lo guardado y se avisa una vez.
  const onGone = useEffectEvent(() => {
    const storedNow = readStoredJob();
    if (!storedNow) return;
    const decision = reconnectDecision({ jobs: [], stored: storedNow });
    const kind = decision.kind === 'expired' ? 'expired' : 'interrupted';
    clearStoredExportJob({ kind, jobId: storedNow.jobId });
    if (claimNotified(storedNow.jobId)) toast.error(t(`exportPanel.phase.${kind}`));
  });

  useEffect(() => {
    if (gone) onGone();
  }, [gone]);

  return null;
}
