'use client';

// StorageMigrationTab - Pestaña "Archivos (S3)" de /admin/sistema: copia de
// los archivos del API de Google Cloud Storage a Amazon S3, hecha por el
// propio API (las llaves nunca salen de Railway). Es idempotente: lo que ya
// está en S3 con el mismo tamaño se salta, así que se puede simular y copiar
// las veces que haga falta; la simulación también sirve para verificar que
// no falte nada antes y después del corte. Polling cada 3 s mientras corre.

import { useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  StopCircleIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  useStartStorageMigration,
  useStopStorageMigration,
  useStorageMigrationStatus,
} from '@/hooks/useMaintenance';
import type { StorageMigrationJob, StorageMigrationStatus } from '@/types/storageMigration';

const nf = new Intl.NumberFormat('es-MX');

/** Carpetas del bucket (mismas rutas en GCS y S3). */
const PREFIXES = [
  { value: '', label: 'Todo el bucket' },
  { value: 'users/', label: 'users/ · fotos y documentos de personal' },
  { value: 'products/', label: 'products/ · imágenes de productos' },
  { value: 'invoices/', label: 'invoices/ · CFDI (PDF y XML)' },
  { value: 'documents/', label: 'documents/ · documentos y tesorería' },
  { value: 'courses/', label: 'courses/ · cursos y videos' },
  { value: 'marketing/', label: 'marketing/ · materiales' },
  { value: 'whatsapp/', label: 'whatsapp/ · videos de plantillas' },
  { value: 'temp/', label: 'temp/ · temporales' },
];

const STATE_UI: Record<StorageMigrationJob['state'], { label: string; className: string }> = {
  running: { label: 'En curso', className: 'bg-blue-100 text-blue-800' },
  done: { label: 'Terminada', className: 'bg-green-100 text-green-800' },
  stopped: { label: 'Detenida', className: 'bg-amber-100 text-amber-800' },
  failed: { label: 'Falló', className: 'bg-red-100 text-red-800' },
};

const PROVIDER_LABEL: Record<string, string> = {
  gcs: 'Google Cloud Storage',
  s3: 'Amazon S3',
  local: 'Disco local (desarrollo)',
};

function mb(bytes: number): string {
  if (bytes < 1024 * 1024) return `${nf.format(Math.round(bytes / 1024))} KB`;
  return `${nf.format(Math.round((bytes / (1024 * 1024)) * 10) / 10)} MB`;
}

function when(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-MX');
}

function errMsg(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string | string[] } } };
  const m = e?.response?.data?.message;
  if (Array.isArray(m)) return m.join(', ');
  return m || fallback;
}

export function StorageMigrationTab() {
  const { data, isLoading, isError } = useStorageMigrationStatus();
  const start = useStartStorageMigration();
  const stop = useStopStorageMigration();
  const [prefix, setPrefix] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-destructive">
          No se pudo consultar el estado de la migración de archivos (¿el API ya trae el
          adaptador S3?).
        </CardContent>
      </Card>
    );
  }

  const job = data.job;
  const running = job?.state === 'running';
  const ready = data.source.configured && data.target.configured;

  const launch = async (dryRun: boolean) => {
    if (
      !dryRun &&
      !window.confirm(
        `¿Copiar a S3 los archivos que falten${prefix ? ` de ${prefix}` : ''}? No borra nada en Google; lo que ya está en S3 se salta.`,
      )
    ) {
      return;
    }
    try {
      await start.mutateAsync({ dryRun, prefix: prefix || undefined });
      toast.success(dryRun ? 'Simulación iniciada' : 'Copia iniciada');
    } catch (err) {
      toast.error(errMsg(err, 'No se pudo iniciar'));
    }
  };

  const halt = async () => {
    try {
      await stop.mutateAsync();
      toast.info('Se detendrá al terminar el archivo en curso');
    } catch (err) {
      toast.error(errMsg(err, 'No se pudo detener'));
    }
  };

  return (
    <div className="space-y-6">
      <Summary status={data} />

      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h3 className="text-base font-semibold">Copiar archivos a S3</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              1) <strong>Simular</strong> para contar lo que falta. 2) <strong>Copiar
              faltantes</strong> (puede tardar; se puede detener y reanudar). 3) Cambiar{' '}
              <code>STORAGE_PROVIDER=s3</code> en Railway. 4) Volver a simular: debe dar 0
              faltantes. Nada se borra en Google.
            </p>
          </div>

          {!ready && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                Faltan variables en el API:{' '}
                {!data.source.configured && <span>GCS_PROJECT_ID / GCS_BUCKET_NAME</span>}
                {!data.source.configured && !data.target.configured && ' y '}
                {!data.target.configured && (
                  <span>S3_BUCKET / S3_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY</span>
                )}
                .
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Carpeta</span>
              <SearchableSelect
                options={PREFIXES}
                value={prefix}
                onChange={setPrefix}
                showAllOption={false}
                placeholder="Carpeta"
                disabled={running}
                aria-label="Carpeta a copiar"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={!ready || running || start.isPending}
                onClick={() => void launch(true)}
              >
                Simular (contar faltantes)
              </Button>
              <Button
                disabled={!ready || running || start.isPending}
                onClick={() => void launch(false)}
              >
                Copiar faltantes
              </Button>
              {running && (
                <Button variant="destructive" disabled={stop.isPending} onClick={() => void halt()}>
                  <StopCircleIcon className="mr-1.5 h-4 w-4" />
                  Detener
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {job && <Progress job={job} />}
    </div>
  );
}

function Summary({ status }: { status: StorageMigrationStatus }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Origen</p>
          <p className="mt-1 font-medium">Google Cloud Storage</p>
          <p className="font-mono text-sm text-muted-foreground">
            {status.source.bucket ?? 'sin configurar'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Destino</p>
          <p className="mt-1 font-medium">Amazon S3</p>
          <p className="font-mono text-sm text-muted-foreground">
            {status.target.bucket ?? 'sin configurar'}
            {status.target.region ? ` · ${status.target.region}` : ''}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Proveedor activo del API
          </p>
          <p className="mt-1 font-medium">
            {PROVIDER_LABEL[status.activeProvider] ?? status.activeProvider}
          </p>
          <p className="text-sm text-muted-foreground">
            {status.activeProvider === 's3'
              ? 'Las pantallas ya leen y escriben en S3.'
              : 'Las pantallas siguen en Google hasta cambiar STORAGE_PROVIDER.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Progress({ job }: { job: StorageMigrationJob }) {
  const ui = STATE_UI[job.state];
  const counters: { label: string; value: string; hint?: string }[] = [
    { label: 'Vistos en Google', value: nf.format(job.scanned) },
    { label: 'Ya estaban en S3', value: nf.format(job.skipped) },
    job.dryRun
      ? { label: 'Faltantes', value: nf.format(job.pending), hint: mb(job.bytesPending) }
      : { label: 'Copiados', value: nf.format(job.copied), hint: mb(job.bytesCopied) },
    { label: 'Fallidos', value: nf.format(job.failed) },
  ];
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-base font-semibold">
            {job.dryRun ? 'Simulación' : 'Copia'}
            {job.prefix ? ` · ${job.prefix}` : ' · todo el bucket'}
          </h3>
          <Badge className={ui.className}>
            {job.state === 'running' && <ArrowPathIcon className="mr-1 h-3.5 w-3.5 animate-spin" />}
            {job.state === 'done' && <CheckCircleIcon className="mr-1 h-3.5 w-3.5" />}
            {ui.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Inicio {when(job.startedAt)}
            {job.finishedAt ? ` · fin ${when(job.finishedAt)}` : ''}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {counters.map((c) => (
            <div key={c.label} className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-xl font-semibold tabular-nums">{c.value}</p>
              {c.hint && <p className="text-xs text-muted-foreground">{c.hint}</p>}
            </div>
          ))}
        </div>

        {job.lastKey && (
          <p className="truncate font-mono text-xs text-muted-foreground" title={job.lastKey}>
            Último: {job.lastKey}
          </p>
        )}

        {job.state === 'done' && job.dryRun && job.pending === 0 && job.failed === 0 && (
          <p className="text-sm text-green-700">
            Todo lo de Google ya está en S3 con el mismo tamaño.
          </p>
        )}

        {job.error && (
          <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {job.error}
          </p>
        )}

        {job.errors.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium">Archivos con error (últimos {job.errors.length})</p>
            <ul className="max-h-48 space-y-1 overflow-auto rounded-md border p-2 text-xs">
              {job.errors.map((e, i) => (
                <li key={`${e.key}-${i}`} className="font-mono">
                  <span className="text-foreground">{e.key}</span>
                  <span className="text-muted-foreground"> — {e.error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
