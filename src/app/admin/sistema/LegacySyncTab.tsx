'use client';

// LegacySyncTab - Pestaña "Sincronización legacy" de /admin/sistema (contrato
// de sincronización §5.5): semáforo y frase de estado de la última corrida
// del migrador --auto, interruptor legacy_sync.auto_enabled, pasos y matriz
// de paridad de la última corrida, retenciones por doble identidad con su
// SQL de renumeración y decisión humana, criterios "WhatsApp listo n/7" y
// las últimas 24 corridas con detalle expandible. Polling cada 60 s (patrón
// PilotLiveTab). Todo lo que se muestra viene del API: aquí no se decide
// ningún borde de negocio con el reloj del navegador.

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  useDecideHold,
  useLegacySyncHolds,
  useLegacySyncRun,
  useLegacySyncRuns,
  useLegacySyncStatus,
  useToggleLegacySync,
} from '@/hooks/useMaintenance';
import {
  criterionShortLabel,
  dayOf,
  displayedRun,
  exitCodeLabel,
  formatDuration,
  hhmm,
  hhmmUtc,
  holdAgeText,
  HOLD_DECISION_UI,
  HOLD_DECISIONS,
  legacySyncErrorInfo,
  needsSetup,
  nextWindowLabel,
  normalizeParity,
  normalizeSteps,
  PARITY_LEGEND,
  PARITY_VERDICT_UI,
  paritySummary,
  RUN_STATUS_HELP,
  RUN_STATUS_UI,
  SEMAFORO_UI,
  setupSteps,
  signalLabel,
  statusPhrase,
  stepLabel,
  whatsappChip,
  type ParityChip,
} from '@/lib/legacy-sync/format';
import type {
  LegacySyncHold,
  LegacySyncHoldDecision,
  LegacySyncRun,
  LegacySyncStatus,
  LegacySyncWhatsappReady,
} from '@/types/legacySync';

const nf = new Intl.NumberFormat('es-MX');
const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : nf.format(n);

/**
 * canManage: puede mover el interruptor y decidir retenciones (PATCH/PUT del
 * API: solo super_admin). Sin él la pestaña es de solo lectura (Sistemas, D12).
 */
export function LegacySyncTab({ canManage }: { canManage: boolean }) {
  const status = useLegacySyncStatus();
  const runs = useLegacySyncRuns(24);
  const holds = useLegacySyncHolds('pending');

  if (status.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Sin datos previos y con error: pantalla de error. Si ya había datos y
  // falló un refresco, se siguen mostrando (con aviso) en vez de vaciar todo.
  if (!status.data) {
    const info = legacySyncErrorInfo(
      status.error,
      'No se pudo cargar el estado de la sincronización legacy',
    );
    return (
      <Card>
        <CardContent className="flex items-start gap-3 p-5 text-sm">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="space-y-2">
            <p className="font-medium text-destructive">{info.message}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => status.refetch()}
              disabled={status.isFetching}
            >
              <ArrowPathIcon className="mr-1.5 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = status.data;
  const shown = displayedRun(data);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        <HeaderCard
          status={data}
          isFetching={status.isFetching || runs.isFetching || holds.isFetching}
          onRefresh={() => {
            void status.refetch();
            void runs.refetch();
            void holds.refetch();
          }}
        />

        {status.isError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {legacySyncErrorInfo(status.error, 'No se pudo actualizar el estado').message}{' '}
              Se muestran los últimos datos recibidos ({hhmm(data.nowCdmx) ?? '?'} CDMX).
            </span>
          </div>
        )}

        <SetupCard status={data} runs={runs.data?.runs ?? []} />

        <AutoSwitchCard status={data} canManage={canManage} />

        {shown && (
          <>
            <StepsCard run={shown.run} isDryRun={shown.isDryRun} />
            <ParityCard run={shown.run} isDryRun={shown.isDryRun} />
          </>
        )}

        <HoldsCard
          holdsQuery={holds}
          migrationApplied={data.migrationApplied}
          pendingWithKit={data.holdsPendingWithKit}
          canManage={canManage}
        />

        <WhatsappCard ready={data.whatsappReady} />

        <RunsCard runsQuery={runs} nowCdmx={data.nowCdmx} />
      </div>
    </TooltipProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// (1) Encabezado: semáforo + frase de estado
// ─────────────────────────────────────────────────────────────────────────────

function HeaderCard({
  status,
  isFetching,
  onRefresh,
}: {
  status: LegacySyncStatus;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  const ui = SEMAFORO_UI[status.semaforo] ?? SEMAFORO_UI.sin_datos;
  const phrase = statusPhrase(status);
  return (
    <Card className={cn('border', ui.boxClass)}>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <span
                className={cn('inline-block h-3.5 w-3.5 rounded-full', ui.dotClass)}
                aria-hidden
              />
              <h2 className="text-lg font-semibold">
                Sincronización legacy → v2: {ui.label}
              </h2>
            </div>
            <p className="text-sm font-medium" data-testid="sync-phrase">
              {phrase}
            </p>
            <p className="text-xs opacity-80">{status.semaforoMotivo}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant={status.autoEnabled ? 'success' : 'warning'}>
                Automática {status.autoEnabled ? 'encendida' : 'apagada'}
              </Badge>
              {status.legacyWindowNow && (
                <Badge variant="info">
                  El legacy está refrescando su copia ahora (hora par :00–:35)
                </Badge>
              )}
              <Badge variant="outline">
                Racha ok: {status.okStreak}
              </Badge>
              <Badge variant={status.holdsPending > 0 ? 'warning' : 'outline'}>
                Retenciones pendientes: {status.holdsPending}
                {status.holdsPendingWithKit > 0
                  ? ` (${status.holdsPendingWithKit} con kit)`
                  : ''}
              </Badge>
              <Badge variant="outline">
                Vigilancia {status.watchdog.enabled ? 'activa' : 'apagada'} ·{' '}
                {status.watchdog.env}
              </Badge>
              {status.lastDryRun && (
                <Badge variant="outline">
                  Último ensayo (dry-run):{' '}
                  {hhmm(status.lastDryRun.startedAtCdmx) ?? '?'} CDMX ·{' '}
                  {RUN_STATUS_UI[status.lastDryRun.status]?.label ??
                    status.lastDryRun.status}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs opacity-80">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isFetching}
              className="bg-white/70"
            >
              <ArrowPathIcon
                className={cn('mr-1.5 h-4 w-4', isFetching && 'animate-spin')}
              />
              Actualizar
            </Button>
            <span>
              Ahora {hhmm(status.nowCdmx) ?? '?'} CDMX ({hhmmUtc(status.nowUtc) ?? '?'}{' '}
              UTC) · se refresca cada 60 s
            </span>
            <span>
              Próxima ventana: {nextWindowLabel(status.nextExpectedCdmx, status.nowCdmx)}{' '}
              CDMX ({hhmmUtc(status.nextExpectedUtc) ?? '?'} UTC)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Estado "sin datos" / puesta en marcha: qué falta y cómo se hace (§8).
function SetupCard({
  status,
  runs,
}: {
  status: LegacySyncStatus;
  runs: LegacySyncRun[];
}) {
  const steps = useMemo(() => setupSteps(status, runs), [status, runs]);
  if (!needsSetup(steps)) return null;
  const noData = !status.migrationApplied || (!status.lastRun && !status.lastDryRun);
  const pending = steps.filter((s) => !s.done).length;
  return (
    <Card
      className={cn(
        noData ? 'border-amber-200 bg-amber-50/60' : 'border-blue-100 bg-blue-50/40',
      )}
    >
      <CardContent className="p-5 text-sm">
        <div className="flex items-start gap-3">
          <InformationCircleIcon
            className={cn(
              'mt-0.5 h-5 w-5 shrink-0',
              noData ? 'text-amber-700' : 'text-blue-700',
            )}
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900">
              {!status.migrationApplied
                ? 'Sin datos: falta aplicar la migración 150'
                : noData
                  ? 'Sin datos: todavía no hay corridas registradas'
                  : 'Puesta en marcha'}
              <span className="font-normal text-muted-foreground">
                {' '}
                · {pending} paso(s) pendiente(s)
              </span>
            </p>
            {!status.migrationApplied && (
              <p className="mt-1 text-xs text-amber-900">
                Sin la 150 no existen la bitácora ni el interruptor; el runner
                corre tolerante (warn[sin_bitacora]) pero aquí no hay nada que
                mostrar.
              </p>
            )}
            {status.migrationApplied && noData && (
              <p className="mt-1 text-xs text-muted-foreground">
                La primera fila la escribe el migrador (<code>node index.js --auto</code>,
                o el ensayo <code>--auto --dry-run</code>) desde la tarea
                programada. Siguiente ventana esperada:{' '}
                {nextWindowLabel(status.nextExpectedCdmx, status.nowCdmx)} CDMX.
              </p>
            )}
            <ol className="mt-3 space-y-2">
              {steps.map((s, i) => (
                <li key={s.key} className="flex items-start gap-2">
                  {s.done ? (
                    <CheckCircleIcon
                      className="mt-0.5 h-4 w-4 shrink-0 text-green-600"
                      aria-label="hecho"
                    />
                  ) : (
                    <span
                      className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-gray-400 text-[10px] text-gray-600"
                      aria-label="pendiente"
                    >
                      {i + 1}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div
                      className={cn(
                        s.done ? 'text-muted-foreground line-through' : 'font-medium text-gray-900',
                      )}
                    >
                      {s.label}
                    </div>
                    {!s.done && (
                      <div className="break-words text-xs text-muted-foreground">{s.how}</div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// (2) Interruptor "Sincronización automática" con confirmación
// ─────────────────────────────────────────────────────────────────────────────

function AutoSwitchCard({
  status,
  canManage,
}: {
  status: LegacySyncStatus;
  canManage: boolean;
}) {
  const toggle = useToggleLegacySync();
  const [pending, setPending] = useState<boolean | null>(null);

  const confirm = async () => {
    if (pending === null) return;
    try {
      const res = await toggle.mutateAsync(pending);
      toast.success(
        `Sincronización automática ${res.autoEnabled ? 'ENCENDIDA' : 'apagada'}`,
      );
      setPending(null);
    } catch (e) {
      toast.error(
        legacySyncErrorInfo(e, 'No se pudo cambiar el interruptor').message,
      );
    }
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <label className="flex items-start gap-3">
            <Switch
              checked={status.autoEnabled}
              disabled={!canManage || !status.migrationApplied || toggle.isPending}
              onCheckedChange={(v) => setPending(v)}
              className="mt-0.5"
              aria-label="Sincronización automática"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">
                Sincronización automática
              </span>
              <span className="block text-xs text-muted-foreground">
                Encendida, el migrador (<code>--auto</code>) sincroniza cada hora
                impar a las :05 CDMX cuando la copia del legacy está lista.
                Apagada, cada ventana termina en <em>noop</em> sin escribir. El
                cambio se audita (SYSTEM_LEGACY_SYNC_TOGGLE) y solo super_admin
                puede moverlo.
              </span>
            </span>
          </label>
          {!status.migrationApplied && (
            <Badge variant="warning">Requiere la migración 150</Badge>
          )}
          {!canManage && <Badge variant="outline">Solo lectura</Badge>}
        </div>
        {!status.migrationApplied && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-800">
            <ExclamationTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              El interruptor vive en system_settings (legacy_sync.auto_enabled)
              y lo crea la migración 150 apagado. Hasta aplicarla no se puede
              mover y el runner en modo real termina en noop.
            </span>
          </p>
        )}
        {status.migrationApplied && !status.autoEnabled && status.lastDryRun && !status.lastRun && (
          <p className="mt-3 text-xs text-muted-foreground">
            Ensayo en curso: las corridas dry-run no escriben ni consultan el
            interruptor. Enciéndelo solo tras el GO y con la tarea registrada en
            modo real (register-scheduled-task.ps1 -Force).
          </p>
        )}
      </CardContent>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !toggle.isPending) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending
                ? '¿Encender la sincronización automática?'
                : '¿Apagar la sincronización automática?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {pending ? (
                  <>
                    <p>
                      A partir de la siguiente hora impar (
                      {nextWindowLabel(status.nextExpectedCdmx, status.nowCdmx)}{' '}
                      CDMX) el runner escribirá en v2 sin operador: clientes
                      nuevos, inscripción, ventas POS/online, puntos y rangos.
                      Nunca comisiones, tipo de cambio ni borrados.
                    </p>
                    <p>
                      Asegúrate de que la tarea programada esté registrada y
                      de que la PC de Sistemas no se apague.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Las siguientes ventanas terminarán en <em>noop</em> sin
                      escribir. Si además está encendido &ldquo;Envíos
                      automáticos&rdquo; de WhatsApp, el cron de inducción se
                      detendrá solo por <code>sync_stale</code> cuando la
                      última corrida ok pase de 3 h 15 min.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggle.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={toggle.isPending}
              className={cn(!pending && buttonVariants({ variant: 'destructive' }))}
              onClick={(e) => {
                e.preventDefault();
                void confirm();
              }}
            >
              {toggle.isPending
                ? 'Guardando…'
                : pending
                  ? 'Sí, encender'
                  : 'Sí, apagar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// (3) Tabla de pasos de una corrida
// ─────────────────────────────────────────────────────────────────────────────

function StepsTable({ run }: { run: LegacySyncRun }) {
  const rows = useMemo(() => normalizeSteps(run.steps), [run.steps]);
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta corrida no registró pasos
        {run.status === 'skipped' || run.status === 'noop'
          ? ' (no escribió nada)'
          : ''}
        .
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Paso</TableHead>
            <TableHead className="text-right">Insertados</TableHead>
            <TableHead>Omitidos por motivo</TableHead>
            <TableHead className="text-right">Fallidos</TableHead>
            <TableHead className="text-right">ms</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.name} className={cn(r.crashed && 'bg-red-50/60')}>
              <TableCell className="align-top">
                <div className="font-medium">{stepLabel(r.name)}</div>
                <div className="text-xs text-muted-foreground">{r.name}</div>
                {r.note && (
                  <div
                    className={cn(
                      'mt-1 max-w-md text-xs',
                      r.crashed ? 'text-red-700' : 'text-muted-foreground',
                    )}
                  >
                    {r.note}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right align-top tabular-nums">
                {fmt(r.inserted)}
              </TableCell>
              <TableCell className="align-top">
                {r.skippedBy.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {r.skippedBy.map(([motivo, n]) => (
                      <Badge key={motivo} variant="outline" className="font-normal">
                        {motivo}: {nf.format(n)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">{fmt(r.skippedTotal)}</span>
                )}
              </TableCell>
              <TableCell
                className={cn(
                  'text-right align-top tabular-nums',
                  (r.failed ?? 0) > 0 && 'font-semibold text-red-700',
                )}
              >
                {fmt(r.failed)}
              </TableCell>
              <TableCell className="text-right align-top tabular-nums text-muted-foreground">
                {fmt(r.ms)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StepsCard({ run, isDryRun }: { run: LegacySyncRun; isDryRun: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">
            {isDryRun ? 'Pasos del último ensayo' : 'Pasos de la última corrida'}{' '}
            <span className="font-normal text-muted-foreground">
              ({run.runKey} · {run.runner} · {run.mode})
            </span>
          </h3>
          <RunStatusBadge run={run} />
        </div>
        {isDryRun && (
          <p className="mb-3 text-xs text-muted-foreground">
            Ensayo (dry-run): no escribió nada en v2; los conteos son lo que
            habría hecho. No cuenta para el semáforo ni para la racha de
            WhatsApp.
          </p>
        )}
        <StepsTable run={run} />
        {(run.warnings.length > 0 || run.error) && (
          <div className="mt-3 space-y-1 text-xs">
            {run.warnings.length > 0 && (
              <p className="text-amber-800">
                Avisos: {run.warnings.join(', ')}
              </p>
            )}
            {run.error && <p className="text-red-700">Error: {run.error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RunStatusBadge({ run }: { run: Pick<LegacySyncRun, 'status' | 'reason'> }) {
  const ui = RUN_STATUS_UI[run.status] ?? RUN_STATUS_UI.noop;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Badge variant="outline" className={ui.className}>
            {ui.label}
            {run.reason ? ` · ${run.reason}` : ''}
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {RUN_STATUS_HELP[run.status] ?? run.status}
      </TooltipContent>
    </Tooltip>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// (4) Chips de paridad A..K, D2, T + leyenda
// ─────────────────────────────────────────────────────────────────────────────

function ParityChips({ parity }: { parity: LegacySyncRun['parity'] }) {
  const chips = useMemo(() => normalizeParity(parity), [parity]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <ParityChipView key={c.key} chip={c} />
      ))}
    </div>
  );
}

function ParityChipView({ chip }: { chip: ParityChip }) {
  const ui = PARITY_VERDICT_UI[chip.verdict];
  const legend = PARITY_LEGEND[chip.key];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            ui.className,
          )}
          aria-label={`${chip.key} ${chip.title}: ${ui.label}${chip.figures ? `. ${chip.figures}` : ''}`}
        >
          {chip.key}
          {chip.gating && (
            <span className="font-normal opacity-70" aria-hidden>
              *
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm">
        <p className="font-semibold">
          {chip.key} · {chip.title} — {ui.label}
          {chip.gating ? ' (gatea)' : ''}
        </p>
        <p className="mt-1 text-xs">{chip.figures ?? 'Sin cifras en esta corrida.'}</p>
        {legend && <p className="mt-1 text-xs opacity-80">{legend.description}</p>}
      </TooltipContent>
    </Tooltip>
  );
}

function ParityLegend() {
  return (
    <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
      {Object.entries(PARITY_LEGEND).map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <dt className="w-6 shrink-0 font-semibold">{k}</dt>
          <dd>
            <span className="font-medium text-gray-900">{v.title}</span>
            {PARITY_GATING_TEXT[k] ? (
              <span className="text-muted-foreground"> · {PARITY_GATING_TEXT[k]}</span>
            ) : null}
            <span className="block text-muted-foreground">{v.description}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

const PARITY_GATING_TEXT: Record<string, string> = {
  C: 'gatea',
  D: 'gatea',
  D2: 'gatea',
  E: 'gatea',
  G: 'gatea',
  H: 'gatea',
  I: 'gatea',
  J: 'solo WhatsApp',
};

function ParityCard({ run, isDryRun }: { run: LegacySyncRun; isDryRun: boolean }) {
  const [showLegend, setShowLegend] = useState(false);
  const chips = useMemo(() => normalizeParity(run.parity), [run.parity]);
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">
            {isDryRun
              ? 'Matriz de verificación del último ensayo'
              : 'Matriz de verificación de la última corrida'}{' '}
            <span className="font-normal text-muted-foreground">
              ({paritySummary(chips)})
            </span>
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLegend((v) => !v)}
            aria-expanded={showLegend}
          >
            {showLegend ? 'Ocultar leyenda' : 'Qué significa cada letra'}
          </Button>
        </div>
        <ParityChips parity={run.parity} />
        <p className="mt-2 text-xs text-muted-foreground">
          Pasa el cursor (o el foco) por cada letra para ver la cifra. * = gatea la
          corrida (rojo → exit 9). J solo condiciona WhatsApp; B, F y K son
          informativas.
        </p>
        {showLegend && <ParityLegend />}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// (5) Dobles identidades pendientes
// ─────────────────────────────────────────────────────────────────────────────

function HoldsCard({
  holdsQuery,
  migrationApplied,
  pendingWithKit,
  canManage,
}: {
  holdsQuery: ReturnType<typeof useLegacySyncHolds>;
  migrationApplied: boolean;
  pendingWithKit: number;
  canManage: boolean;
}) {
  const decide = useDecideHold();
  const [dialog, setDialog] = useState<{
    hold: LegacySyncHold;
    decision: LegacySyncHoldDecision;
  } | null>(null);
  const [note, setNote] = useState('');
  const [showSql, setShowSql] = useState(false);

  const data = holdsQuery.data;
  const holds = data?.holds ?? [];
  const sql = data?.renumberSql ?? null;

  const copySql = async () => {
    if (!sql) return;
    try {
      await navigator.clipboard.writeText(sql);
      toast.success('SQL de renumeración copiado al portapapeles');
    } catch {
      setShowSql(true);
      toast.error('No se pudo copiar; el SQL se muestra abajo para copiarlo a mano');
    }
  };

  const confirmDecision = async () => {
    if (!dialog) return;
    try {
      await decide.mutateAsync({
        id: dialog.hold.id,
        input: { status: dialog.decision, note },
      });
      toast.success(
        `Retención ${dialog.hold.nativeCustomerNumber ?? '?'} ↔ ${dialog.hold.legacyCustomerNumber}: ${HOLD_DECISION_UI[dialog.decision].label.toLowerCase()}`,
      );
      setDialog(null);
      setNote('');
    } catch (e) {
      toast.error(legacySyncErrorInfo(e, 'No se pudo guardar la decisión').message);
    }
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">
            Dobles identidades pendientes{' '}
            <span className="font-normal text-muted-foreground">
              ({holds.length}
              {pendingWithKit > 0 ? `, ${pendingWithKit} con kit` : ''})
            </span>
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void copySql()}
              disabled={!sql}
              title={
                sql
                  ? 'Copia el SQL de renumeración de las pendientes con nativo identificado'
                  : 'No hay pares renumerables'
              }
            >
              <ClipboardDocumentIcon className="mr-1.5 h-4 w-4" />
              Copiar SQL
            </Button>
            {sql && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSql((v) => !v)}
                aria-expanded={showSql}
              >
                {showSql ? 'Ocultar SQL' : 'Ver SQL'}
              </Button>
            )}
          </div>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Altas del legacy que coinciden con un cliente nativo de v2 (2000xxx)
          por teléfono/CURP/nombre. El runner las RETIENE: no inserta la ficha
          legacy ni sus ventas mientras sigan pendientes. Renumerar = ejecutar el
          SQL en DBeaver y marcar &ldquo;Renumerado&rdquo;; Fusionado = misma
          persona ya fusionada a mano (nunca se inserta en automático); Liberar
          = son dos personas distintas (la siguiente ventana inserta la ficha
          legacy); Descartar hace lo mismo que Liberar. Si dudas, déjala
          pendiente: sigue retenida.
        </p>

        {!migrationApplied ? (
          <p className="text-sm text-muted-foreground">Sin datos (migración 150 pendiente).</p>
        ) : holdsQuery.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : holdsQuery.isError ? (
          <p className="text-sm text-destructive">
            {legacySyncErrorInfo(holdsQuery.error, 'No se pudieron cargar las retenciones').message}
          </p>
        ) : holds.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircleIcon className="h-4 w-4" />
            Sin retenciones pendientes.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nativo v2</TableHead>
                  <TableHead>Legacy</TableHead>
                  <TableHead>Señales</TableHead>
                  <TableHead>Fuerza</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead className="text-right">Decisión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holds.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="align-top">
                      <div className="font-mono text-sm">
                        {h.nativeCustomerNumber ?? (
                          <span className="text-muted-foreground">sin nativo</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {h.nativeStatus ?? 'ya no existe'}
                        {h.nativeHasKit === true
                          ? ' · con kit'
                          : h.nativeHasKit === false
                            ? ' · sin kit'
                            : ''}
                      </div>
                    </TableCell>
                    <TableCell className="align-top font-mono text-sm">
                      {h.legacyCustomerNumber}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-wrap gap-1">
                        {h.signals.length ? (
                          h.signals.map((s) => (
                            <Badge key={s} variant="outline" className="font-normal">
                              {signalLabel(s)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant={h.strength === 'fuerte' ? 'destructive' : 'warning'}>
                        {h.strength}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      <div>{holdAgeText(h.ageHours)}</div>
                      <div className="text-xs text-muted-foreground">
                        {h.firstSeenAtCdmx} CDMX
                        {h.lastSeenAtCdmx !== h.firstSeenAtCdmx
                          ? ` · visto ${hhmm(h.lastSeenAtCdmx) ?? ''}`
                          : ''}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {!canManage ? (
                        <div className="text-right text-xs text-muted-foreground">
                          Solo super_admin decide
                        </div>
                      ) : (
                        <div className="flex flex-wrap justify-end gap-1">
                          {HOLD_DECISIONS.map((d) => (
                            <Button
                              key={d}
                              size="sm"
                              variant={HOLD_DECISION_UI[d].destructive ? 'destructive' : 'outline'}
                              onClick={() => {
                                setNote('');
                                setDialog({ hold: h, decision: d });
                              }}
                              disabled={decide.isPending}
                            >
                              {HOLD_DECISION_UI[d].label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {showSql && sql && (
          <pre className="mt-3 max-h-80 overflow-auto rounded-md border bg-gray-50 p-3 text-xs">
            {sql}
          </pre>
        )}
      </CardContent>

      <AlertDialog
        open={canManage && dialog !== null}
        onOpenChange={(open) => {
          if (!open && !decide.isPending) setDialog(null);
        }}
      >
        <AlertDialogContent>
          {dialog && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{HOLD_DECISION_UI[dialog.decision].title}</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-sm">
                    <p>
                      Nativo{' '}
                      <span className="font-mono">
                        {dialog.hold.nativeCustomerNumber ?? 'sin nativo'}
                      </span>{' '}
                      ↔ legacy{' '}
                      <span className="font-mono">{dialog.hold.legacyCustomerNumber}</span>{' '}
                      ({dialog.hold.strength}; señales{' '}
                      {dialog.hold.signals.map(signalLabel).join(' + ') || '?'}).
                    </p>
                    <p>{HOLD_DECISION_UI[dialog.decision].description}</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="hold-note">
                  Nota (opcional, máx. 500 caracteres)
                </label>
                <Textarea
                  id="hold-note"
                  value={note}
                  maxLength={500}
                  rows={3}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Qué se revisó y por qué se decidió así"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={decide.isPending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  disabled={decide.isPending}
                  className={cn(
                    HOLD_DECISION_UI[dialog.decision].destructive &&
                      buttonVariants({ variant: 'destructive' }),
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    void confirmDecision();
                  }}
                >
                  {decide.isPending ? 'Guardando…' : HOLD_DECISION_UI[dialog.decision].label}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// (6) WhatsApp: listo para encender n/7
// ─────────────────────────────────────────────────────────────────────────────

function WhatsappCard({ ready }: { ready: LegacySyncWhatsappReady | null | undefined }) {
  const chip = whatsappChip(ready);
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">
            WhatsApp: ¿listo para encender los envíos automáticos?
          </h3>
          <Badge
            variant={
              chip.tone === 'verde' ? 'success' : chip.tone === 'rojo' ? 'destructive' : 'outline'
            }
          >
            {chip.label}
          </Badge>
        </div>
        <ul className="space-y-2">
          {(ready?.criterios ?? []).map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              {c.ok ? (
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-label="cumple" />
              ) : (
                <XCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-label="no cumple" />
              )}
              <div className="min-w-0">
                <div className={cn('font-medium', c.ok ? 'text-gray-900' : 'text-red-800')}>
                  {i + 1}. {criterionShortLabel(i, c.criterio)}
                </div>
                <div className="text-xs text-muted-foreground">{c.criterio}</div>
                <div className="text-xs">{c.detalle}</div>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Se enciende desde Comercial → Formularios → Taller de Inducción →
          &ldquo;Envíos automáticos&rdquo;, idealmente un miércoles ~09:30 tras
          la corrida de las 09:05 en verde. Si la sincronización se atrasa, el cron
          de inducción se detiene solo (sync_stale).
        </p>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// (7) Últimas 24 corridas con detalle expandible
// ─────────────────────────────────────────────────────────────────────────────

function RunsCard({
  runsQuery,
  nowCdmx,
}: {
  runsQuery: ReturnType<typeof useLegacySyncRuns>;
  nowCdmx: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const data = runsQuery.data;
  const runs = data?.runs ?? [];
  const today = dayOf(nowCdmx);

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Últimas corridas{' '}
          <span className="font-normal text-muted-foreground">
            ({runs.length} de hasta {data?.limit ?? 24}; incluye ensayos dry-run)
          </span>
        </h3>
        {runsQuery.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : runsQuery.isError ? (
          <p className="text-sm text-destructive">
            {legacySyncErrorInfo(runsQuery.error, 'No se pudieron cargar las corridas').message}
          </p>
        ) : data && !data.migrationApplied ? (
          <p className="text-sm text-muted-foreground">Sin datos (migración 150 pendiente).</p>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin corridas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Hora CDMX</TableHead>
                  <TableHead>UTC</TableHead>
                  <TableHead>Runner</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Duración</TableHead>
                  <TableHead className="text-right">Espera</TableHead>
                  <TableHead>Exit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => {
                  const open = openId === r.id;
                  const day = dayOf(r.startedAtCdmx);
                  return (
                    <RunRowGroup
                      key={r.id}
                      run={r}
                      open={open}
                      showDay={!!day && day !== today}
                      onToggle={() => setOpenId(open ? null : r.id)}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RunRowGroup({
  run,
  open,
  showDay,
  onToggle,
}: {
  run: LegacySyncRun;
  open: boolean;
  showDay: boolean;
  onToggle: () => void;
}) {
  const Chevron = open ? ChevronDownIcon : ChevronRightIcon;
  return (
    <>
      <TableRow
        className={cn('cursor-pointer', open && 'bg-gray-50')}
        onClick={onToggle}
        aria-expanded={open}
      >
        <TableCell className="align-top">
          <button
            type="button"
            className="rounded p-0.5 hover:bg-gray-100"
            aria-label={open ? 'Ocultar detalle' : 'Ver detalle'}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            <Chevron className="h-4 w-4" />
          </button>
        </TableCell>
        <TableCell className="align-top tabular-nums">
          {showDay ? `${dayOf(run.startedAtCdmx)} ` : ''}
          {hhmm(run.startedAtCdmx) ?? '?'}
        </TableCell>
        <TableCell className="align-top tabular-nums text-muted-foreground">
          {hhmmUtc(run.startedAt) ?? '?'}
        </TableCell>
        <TableCell className="align-top">
          {run.runner}
          {run.mode !== 'auto' && (
            <Badge variant="outline" className="ml-1 font-normal">
              {run.mode}
            </Badge>
          )}
        </TableCell>
        <TableCell className="align-top">
          <RunStatusBadge run={run} />
        </TableCell>
        <TableCell className="text-right align-top tabular-nums">
          {formatDuration(run.durationMs)}
        </TableCell>
        <TableCell className="text-right align-top tabular-nums text-muted-foreground">
          {formatDuration(run.waitedMs)}
          {run.attempts > 1 ? ` (${run.attempts} int.)` : ''}
        </TableCell>
        <TableCell className="align-top">
          <span title={exitCodeLabel(run.exitCode)} className="tabular-nums">
            {run.exitCode ?? '—'}
          </span>
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="bg-gray-50/70 hover:bg-gray-50/70">
          <TableCell colSpan={8} className="p-4">
            <RunDetail run={run} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function RunDetail({ run }: { run: LegacySyncRun }) {
  const detail = useLegacySyncRun(run.id);
  const snapshot = detail.data?.legacySnapshot ?? null;
  const snapshotEntries = snapshot
    ? Object.entries(snapshot).filter(
        ([, v]) => typeof v === 'number' || typeof v === 'string',
      )
    : [];
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
        <Item label="Clave" value={run.runKey} mono />
        <Item label="Salida" value={exitCodeLabel(run.exitCode)} />
        <Item label="Motivo" value={run.reason ?? '—'} />
        <Item label="Periodos" value={run.periodNumbers.length ? run.periodNumbers.join(', ') : '—'} />
        <Item label="Inicio" value={`${run.startedAtCdmx} CDMX`} />
        <Item label="Lista (guarda)" value={run.readyAtCdmx ? `${run.readyAtCdmx} CDMX` : '—'} />
        <Item label="Fin" value={run.finishedAtCdmx ? `${run.finishedAtCdmx} CDMX` : 'sin cerrar'} />
        <Item label="Copia legacy hasta" value={run.legacyWatermarkCdmx ?? '—'} />
        <Item label="Día de la copia" value={run.legacyCopyDay ?? '—'} />
        <Item
          label="Huella"
          value={run.legacyGeneration ? run.legacyGeneration.slice(0, 12) : '—'}
          mono
        />
        <Item label="Retenciones" value={String(run.holdsPending)} />
        <Item
          label="Pares nuevos (D2)"
          value={String(run.duplicatesNew)}
          className={run.duplicatesNew > 0 ? 'text-red-700 font-semibold' : undefined}
        />
      </dl>
      {(run.warnings.length > 0 || run.error) && (
        <div className="space-y-1 text-xs">
          {run.warnings.length > 0 && (
            <p className="text-amber-800">Avisos: {run.warnings.join(', ')}</p>
          )}
          {run.error && <p className="text-red-700">Error: {run.error}</p>}
        </div>
      )}
      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Pasos</h4>
        <StepsTable run={run} />
      </div>
      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Matriz de verificación
        </h4>
        <ParityChips parity={run.parity} />
      </div>
      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Conteos de la copia legacy
        </h4>
        {detail.isLoading ? (
          <Skeleton className="h-6 w-64" />
        ) : detail.isError ? (
          <p className="text-xs text-destructive">
            {legacySyncErrorInfo(detail.error, 'No se pudo cargar el detalle').message}
          </p>
        ) : snapshotEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin snapshot en esta corrida.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {snapshotEntries.map(([k, v]) => (
              <Badge key={k} variant="outline" className="font-normal">
                {k}: {typeof v === 'number' ? nf.format(v) : String(v)}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Item({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted-foreground">{label}:</dt>
      <dd className={cn('break-all', mono && 'font-mono', className)}>{value}</dd>
    </div>
  );
}
