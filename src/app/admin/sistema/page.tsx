'use client';

// /admin/sistema - Mantenimiento del sistema (EXCLUSIVO super_admin).
// Tab Limpieza: vacía la BD por bloques en orden FK-seguro (1→10).
// Tab Carga masiva: pobla por fases vía CSV con plantillas descargables.

import { Suspense, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PermissionGuard } from '@/components/auth';
import {
  maintenanceKeys,
  useLoadJobs,
  useMaintenanceOverview,
  useRunCleanupBlock,
  useStartImport,
} from '@/hooks/useMaintenance';
import { maintenanceService } from '@/services/maintenance.service';
import type { CleanupBlockStatus, LoadPhaseStatus } from '@/types/maintenance';

const nf = new Intl.NumberFormat('es-MX');

function rowsLabel(rows: number, isEmpty: boolean): string {
  if (isEmpty) return 'vacío';
  return `~${nf.format(rows)} filas`;
}

export default function SistemaPage() {
  return (
    <PermissionGuard roles={['super_admin']}>
      <Suspense fallback={<SistemaSkeleton />}>
        <SistemaContent />
      </Suspense>
    </PermissionGuard>
  );
}

function SistemaSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-8">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

function SistemaContent() {
  const { data, isLoading, isError } = useMaintenanceOverview();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-2 flex items-center gap-3">
            <WrenchScrewdriverIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">Sistema</h1>
          </div>
          <p className="text-base text-white/80 sm:text-lg">
            Limpieza y carga masiva de datos. Acceso exclusivo del Super
            Administrador.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading && <SistemaSkeleton />}
        {isError && (
          <Card>
            <CardContent className="p-6 text-sm text-destructive">
              No se pudo cargar el estado del sistema. Verifica que el API esté
              disponible y que tu sesión sea de super administrador.
            </CardContent>
          </Card>
        )}
        {data && (
          <>
            {!data.superuser.exists && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                  El superusuario <strong>{data.superuser.email}</strong> no
                  existe en la base de datos. La limpieza está bloqueada por
                  seguridad: el bloque de usuarios conservaría a nadie.
                </p>
              </div>
            )}

            <Tabs defaultValue="limpieza">
              <TabsList>
                <TabsTrigger value="limpieza">Limpieza</TabsTrigger>
                <TabsTrigger value="carga">Carga masiva</TabsTrigger>
              </TabsList>

              <TabsContent value="limpieza" className="mt-6">
                <p className="mb-4 text-sm text-muted-foreground">
                  Orden estricto 2 → 11 (FK-seguro): cada bloque se habilita
                  cuando los anteriores quedan vacíos. El bloque 1 (logs) es
                  independiente: se regenera con el uso y puedes re-limpiarlo
                  cuando quieras. El bloque 10 vacía el catálogo de estados
                  (geo). El resto de catálogos, roles, periodos 26→25 y tu
                  superusuario se conservan.
                </p>
                <div className="space-y-3">
                  {data.cleanup.map((block) => (
                    <CleanupBlockCard key={block.id} block={block} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="carga" className="mt-6">
                <p className="mb-4 text-sm text-muted-foreground">
                  Pobla el sistema por fases con archivos <strong>Excel (.xlsx)</strong> o
                  CSV. Excel conserva acentos y signos automáticamente; el CSV se
                  detecta como UTF-8 o Windows-1252 (Excel) y respeta los acentos.
                  La validación es todo-o-nada: si una fila es inválida, no se
                  inserta ninguna.
                </p>
                <div className="space-y-3">
                  {data.load.map((phase) => (
                    <LoadPhaseCard key={phase.key} phase={phase} />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Limpieza
// ----------------------------------------------------------------

function CleanupBlockCard({ block }: { block: CleanupBlockStatus }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const runCleanup = useRunCleanupBlock();

  const tablesPreview = block.tables.slice(0, 4).map((t) => t.name);
  const remaining = block.tables.length - tablesPreview.length;

  const handleRun = async () => {
    try {
      const result = await runCleanup.mutateAsync(block.id);
      setConfirmOpen(false);
      const extras = [
        result.deletedUsers !== undefined
          ? `${nf.format(result.deletedUsers)} usuarios borrados`
          : null,
        result.deletedWorkers !== undefined
          ? `${nf.format(result.deletedWorkers)} workers borrados`
          : null,
        result.deletedCustomers !== undefined
          ? `${nf.format(result.deletedCustomers)} clientes borrados`
          : null,
        result.deletedBranches !== undefined
          ? `${nf.format(result.deletedBranches)} sucursales borradas`
          : null,
      ]
        .filter(Boolean)
        .join(', ');
      toast.success(
        `Bloque ${result.blockId} (${result.label}) limpio en ${(result.durationMs / 1000).toFixed(1)}s` +
          (extras ? ` — ${extras}` : ''),
      );
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Error al ejecutar la limpieza';
      toast.error(message);
    }
  };

  return (
    <Card className={block.isEmpty ? 'opacity-70' : ''}>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {block.id}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-foreground">{block.label}</h3>
              {block.isEmpty ? (
                <Badge variant="success">Vacío</Badge>
              ) : (
                <Badge variant="warning">
                  ~{nf.format(block.totalRows)} filas
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {block.description}
            </p>
            {block.tables.length > 0 && (
              <p className="mt-1 truncate text-xs text-muted-foreground/70">
                {block.tables.length} tablas: {tablesPreview.join(', ')}
                {remaining > 0 ? ` +${remaining} más` : ''}
              </p>
            )}
            {!block.canRun &&
              !block.isEmpty &&
              block.blockedBy &&
              block.blockedBy.length > 0 && (
                <p className="mt-1 text-xs font-medium text-amber-600">
                  Inactivo: primero vacía estas tablas que referencian customers
                  — {block.blockedBy.join(', ')}.
                </p>
              )}
          </div>
        </div>
        <div className="shrink-0 sm:pl-4">
          <Button
            variant="destructive"
            size="sm"
            disabled={!block.canRun || runCleanup.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            {runCleanup.isPending ? 'Limpiando…' : 'Limpiar'}
          </Button>
        </div>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Limpiar bloque {block.id}: {block.label}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Se eliminarán <strong>~{nf.format(block.totalRows)}</strong>{' '}
                  filas de {block.tables.length} tablas de forma{' '}
                  <strong>irreversible</strong>:
                </p>
                <p className="rounded bg-muted p-2 text-xs">
                  {block.tables.map((t) => t.name).join(', ') || '(sin tablas)'}
                </p>
                {block.special === 'users' && (
                  <p className="font-medium text-destructive">
                    Se conservará ÚNICAMENTE el superusuario y su worker
                    vinculado.
                  </p>
                )}
                {block.special === 'reset' && (
                  <p>
                    Reinicia los folios (sequence_counters a 0) y refresca la
                    matview network_stats.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={runCleanup.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRun}
              disabled={runCleanup.isPending}
            >
              {runCleanup.isPending
                ? 'Limpiando…'
                : `Sí, limpiar bloque ${block.id}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ----------------------------------------------------------------
// Carga masiva
// ----------------------------------------------------------------

function LoadPhaseCard({ phase }: { phase: LoadPhaseStatus }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startImport = useStartImport();
  const { data: jobs } = useLoadJobs();
  const queryClient = useQueryClient();
  const ready = phase.status === 'ready';

  // Job vivo de ESTA fase (jobs viene del más reciente al más viejo). La carga
  // corre en el backend: al recargar/navegar, esto la reencuentra y reconecta.
  const job = jobs?.find((j) => j.key === phase.key);
  const running = job?.status === 'running';
  const busy = running || startImport.isPending;
  const prog = job?.progress;

  // Aviso de fin (éxito/error) UNA sola vez, solo en transiciones observadas en
  // vivo (no al montar viendo un job que ya había terminado antes).
  const prevStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevStatus.current;
    const cur = job?.status;
    if (prev === 'running' && cur === 'done' && job?.result) {
      const r = job.result;
      const extra = r.extra
        ? ' — ' +
          Object.entries(r.extra)
            .map(([k, v]) => `${k}: ${nf.format(v)}`)
            .join(', ')
        : '';
      toast.success(
        `${phase.label}: ${nf.format(r.inserted)} insertadas, ${nf.format(r.skipped)} saltadas (duplicadas)${extra}`,
      );
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
    } else if (prev === 'running' && cur === 'error') {
      const errs = job?.error?.errors;
      const detail = errs?.length
        ? ` — ${errs.slice(0, 3).join(' · ')}${errs.length > 3 ? ` (+${errs.length - 3} más)` : ''}`
        : '';
      toast.error(`${job?.error?.message ?? 'Error en la carga'}${detail}`, {
        duration: 10000,
      });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
    }
    prevStatus.current = cur;
  }, [job?.status, job?.result, job?.error, phase.label, queryClient]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      await startImport.mutateAsync({ key: phase.key, file });
      toast.info(
        `${phase.label}: carga iniciada en segundo plano. Puedes seguir navegando; el avance se actualiza solo.`,
      );
    } catch (error: unknown) {
      const data = (
        error as {
          response?: { data?: { message?: string; errors?: string[] } };
        }
      )?.response?.data;
      const detail = data?.errors?.length
        ? `${data.errors.slice(0, 3).join(' · ')}${data.errors.length > 3 ? ` (+${data.errors.length - 3} más)` : ''}`
        : '';
      toast.error(
        `${data?.message ?? 'No se pudo iniciar la carga'}${detail ? ` — ${detail}` : ''}`,
        { duration: 10000 },
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Card className={ready ? '' : 'opacity-60'}>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
            {phase.phase}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-foreground">{phase.label}</h3>
              {ready ? (
                phase.totalRows > 0 ? (
                  <Badge variant="info">
                    ~{nf.format(phase.totalRows)} filas cargadas
                  </Badge>
                ) : (
                  <Badge variant="outline">Sin datos</Badge>
                )
              ) : (
                <Badge variant="outline">En preparación</Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {phase.description}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground/70">
              Tablas:{' '}
              {phase.tables
                .map((t) => `${t.name} (${rowsLabel(t.rows, t.isEmpty)})`)
                .join(', ')}
            </p>
            {running && prog && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{prog.stage}</span>
                  <span>
                    {nf.format(prog.processed)} / {nf.format(prog.total)} (
                    {prog.percent}%)
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${prog.percent}%` }}
                  />
                </div>
              </div>
            )}
            {running && !prog && (
              <p className="mt-2 text-xs text-muted-foreground">
                Procesando en segundo plano…
              </p>
            )}
          </div>
        </div>
        {ready && (
          <div className="flex shrink-0 items-center gap-2 sm:pl-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                maintenanceService
                  .downloadTemplate(phase.key)
                  .catch(() => toast.error('No se pudo descargar la plantilla'))
              }
            >
              Plantilla CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button
              size="sm"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              {busy ? 'Procesando…' : 'Subir archivo'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
