// useNetworkExportStore.ts — Estado COMPARTIDO de la descarga de "Mi red"
// (contrato /distribuidor/red §6.3): el job guardado en localStorage
// (tl_red_export_job), el historial de descargas (tl_red_export_history) y un
// aviso en memoria (interrumpida/expirada) que la tarjeta muestra con "Volver a
// generar". Lo leen la tarjeta (/distribuidor/red) y NetworkExportWatcher
// (layout) con useSyncExternalStore: un cambio en cualquiera de los dos —o en
// otra pestaña, vía el evento `storage`— se refleja en ambos sin efectos ni
// setState en cascada. La lógica de storage vive en lib/network/export-job.ts.
'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { networkApi } from '@/services/networkApi';
import type { NetworkExportJob } from '@/types/network';
import {
  EXPORT_STORAGE_HISTORY_KEY,
  EXPORT_STORAGE_JOB_KEY,
  clearStoredJob as clearStoredJobInStorage,
  historyItemFromJob,
  markDownloaded,
  pushHistory,
  readHistory,
  readStoredJob,
  writeHistory,
  writeStoredJob,
  type ExportHistoryItem,
  type StoredExportJob,
} from '@/lib/network/export-job';
import { fmtInt } from '@/lib/network/format';
import { networkErrorKey } from '@/lib/network/network-error';

export interface ExportNotice {
  kind: 'interrupted' | 'expired';
  jobId: string;
}

export interface ExportStoreSnapshot {
  /** Job guardado (en curso, listo o terminado con error) o null. */
  stored: StoredExportJob | null;
  /** El job guardado desapareció del servidor (404): se muestra hasta generar de nuevo. */
  notice: ExportNotice | null;
  /** Descargas recientes (máx. 5, la más reciente primero). */
  history: ExportHistoryItem[];
}

/** Id del toast persistente "Tu archivo está listo" (uno por job). */
export const exportToastId = (jobId: string): string => `red-export-${jobId}`;

const EMPTY: ExportStoreSnapshot = { stored: null, notice: null, history: [] };
const listeners = new Set<() => void>();
let notice: ExportNotice | null = null;
let lastJobRaw: string | null | undefined;
let lastHistoryRaw: string | null | undefined;
let snapshot: ExportStoreSnapshot = EMPTY;

const rawOf = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** Snapshot estable: solo cambia de identidad cuando cambia algo (requisito de useSyncExternalStore). */
function getSnapshot(): ExportStoreSnapshot {
  const jobRaw = rawOf(EXPORT_STORAGE_JOB_KEY);
  const historyRaw = rawOf(EXPORT_STORAGE_HISTORY_KEY);
  if (jobRaw !== lastJobRaw || historyRaw !== lastHistoryRaw || snapshot.notice !== notice) {
    lastJobRaw = jobRaw;
    lastHistoryRaw = historyRaw;
    snapshot = { stored: readStoredJob(), notice, history: readHistory() };
  }
  return snapshot;
}

const getServerSnapshot = (): ExportStoreSnapshot => EMPTY;

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === EXPORT_STORAGE_JOB_KEY || event.key === EXPORT_STORAGE_HISTORY_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Guarda el job recién iniciado (o reconectado) y borra cualquier aviso previo. */
export function setStoredExportJob(job: StoredExportJob): void {
  writeStoredJob(job);
  notice = null;
  emit();
}

/** Quita el job guardado; con `next` deja el aviso (interrumpida/expirada) para la tarjeta. */
export function clearStoredExportJob(next: ExportNotice | null = null): void {
  clearStoredJobInStorage();
  notice = next;
  emit();
}

export function dismissExportNotice(): void {
  if (!notice) return;
  notice = null;
  emit();
}

export function recordExportHistory(item: ExportHistoryItem): void {
  writeHistory(pushHistory(readHistory(), item));
  emit();
}

export function useNetworkExportStore(): ExportStoreSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Descarga el archivo de un job LISTO (stream del servidor + save-as), lo marca
 * como descargado, lo agrega al historial y avisa. Lo comparten la tarjeta, el
 * watcher y el toast persistente. Devuelve true si el navegador recibió el archivo.
 */
export function useExportDownloader(): (job: NetworkExportJob) => Promise<boolean> {
  const t = useTranslations('distributor.network');
  const locale = useLocale();
  return useCallback(
    async (job: NetworkExportJob) => {
      try {
        const filename = await networkApi.downloadNetworkExportFile(job.jobId, job.filename);
        markDownloaded(job.jobId);
        const item = historyItemFromJob(job);
        if (item) recordExportHistory({ ...item, filename });
        toast.dismiss(exportToastId(job.jobId));
        toast.success(t('exportPanel.toastDownloaded', { count: fmtInt(job.total, locale) }));
        return true;
      } catch (err) {
        toast.error(t(networkErrorKey(err)));
        return false;
      }
    },
    [t, locale],
  );
}
