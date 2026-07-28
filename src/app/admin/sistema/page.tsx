'use client';

// /admin/sistema - Mantenimiento del sistema (EXCLUSIVO super_admin).
// Tab Limpieza: vacía la BD por bloques en orden FK-seguro (1→10).
// Tab Carga masiva: pobla por fases vía CSV con plantillas descargables.

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  ComputerDesktopIcon,
  LockClosedIcon,
  LockOpenIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  usePeriodSalesPreview,
  useResetPeriodSales,
  useRunCleanupBlock,
  useStartImport,
  useStartSyncApply,
  useStartSyncPreview,
} from '@/hooks/useMaintenance';
import { useCommissionPeriods } from '@/hooks/useCommissions';
import { useQuery, useMutation } from '@tanstack/react-query';
import { maintenanceService } from '@/services/maintenance.service';
import { configService } from '@/services/config.service';
import {
  usePosLicenses,
  useSetPosLicenseRelease,
  useSetPosLicenseInvoicing,
} from '@/hooks/usePosLicenses';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Switch } from '@/components/ui/switch';
import { PilotLiveTab } from './PilotLiveTab';
import type { CleanupBlockStatus, LoadPhaseStatus } from '@/types/maintenance';
import type { PosLicense } from '@/types/posLicense';

const cf = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

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

const SISTEMA_TABS = ['pos', 'piloto', 'limpieza', 'carga', 'reset'];

function SistemaContent() {
  const { data, isLoading, isError } = useMaintenanceOverview();

  // Pestaña activa en la URL (?tab=piloto): sobrevive recargas y redeploys —
  // clave para la pantalla de monitoreo proyectada con "Piloto en vivo".
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab =
    tabParam && SISTEMA_TABS.includes(tabParam) ? tabParam : 'pos';
  // Modo pantalla (?tv=1): sin encabezado de Sistema ni fila de pestañas —
  // pensado para proyectar "Piloto en vivo" en un monitor (con F11).
  const tvMode = searchParams.get('tv') === '1';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      {!tvMode && (
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
      )}

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

            <Tabs
              value={activeTab}
              onValueChange={(v) =>
                router.replace(`/admin/sistema?tab=${v}`, { scroll: false })
              }
            >
              <TabsList className={tvMode ? 'hidden' : undefined}>
                <TabsTrigger value="pos">Puntos de Venta</TabsTrigger>
                <TabsTrigger value="piloto">
                  <span className="relative mr-1.5 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  Piloto en vivo
                </TabsTrigger>
                <TabsTrigger value="limpieza">Limpieza</TabsTrigger>
                <TabsTrigger value="carga">Carga masiva</TabsTrigger>
                <TabsTrigger value="reset">Reset por periodo</TabsTrigger>
              </TabsList>

              <TabsContent value="piloto" className="mt-6">
                <PilotLiveTab />
              </TabsContent>

              <TabsContent value="pos" className="mt-6">
                <p className="mb-4 text-sm text-muted-foreground">
                  Interruptor global de las terminales POS (Electron). Mientras
                  esté <strong>bloqueado</strong>, las sucursales pueden instalar
                  el POS, activar su licencia y configurar la impresora térmica,
                  pero la pantalla de venta muestra la leyenda de “próximamente”.
                  Al <strong>liberar</strong>, todas las terminales se activan en
                  su siguiente latido (≤ 60 s), sin reinstalar.
                </p>
                <PosOperationsCard />
              </TabsContent>

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
                  Pobla el sistema por fases con archivos{' '}
                  <strong>Excel (.xlsx)</strong> o CSV. Excel conserva acentos y
                  signos automáticamente; el CSV se detecta como UTF-8 o
                  Windows-1252 (Excel) y respeta los acentos. La validación es
                  todo-o-nada: si una fila es inválida, no se inserta ninguna.
                </p>
                <div className="space-y-3">
                  {data.load.map((phase) => (
                    <LoadPhaseCard key={phase.key} phase={phase} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="reset" className="mt-6">
                <p className="mb-4 text-sm text-muted-foreground">
                  Borra TODAS las ventas (pedidos ecommerce + ventas de
                  sucursal) de un periodo por rango de fecha 26→25, para poder
                  re-correr la migración histórica. NO toca comisiones, puntos,
                  rangos ni red (la re-migración los reescribe).
                </p>
                <ResetPeriodSalesCard />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Puntos de Venta (interruptor global de liberación)
// ----------------------------------------------------------------

const DEFAULT_LOCK_MESSAGE =
  'El punto de venta se habilitará muy pronto. Mientras tanto puedes configurar la impresora térmica desde el ícono de ajustes. En cuanto se libere, esta pantalla se activará automáticamente.';

function PosOperationsCard() {
  const posOpsKey = ['config', 'pos-operations'] as const;
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: posOpsKey,
    queryFn: () => configService.getPosOperations(),
    staleTime: 30_000,
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [messageDraft, setMessageDraft] = useState<string | null>(null);

  // Draft del mensaje: null = usar lo que vino del server (aún sin editar).
  const message = messageDraft ?? data?.message ?? '';
  const messageDirty =
    messageDraft !== null && (messageDraft.trim() || '') !== (data?.message ?? '');

  const toggle = useMutation({
    mutationFn: (enabled: boolean) => configService.setPosOperations(enabled),
    onSuccess: (res) => {
      setConfirmOpen(false);
      toast.success(
        res.enabled
          ? 'POS liberado. Las terminales se activarán en ≤ 60 s.'
          : 'POS bloqueado. Las terminales mostrarán la leyenda de próximamente.',
      );
      void refetch();
    },
    onError: () => toast.error('No se pudo cambiar el estado del POS'),
  });

  const saveMessage = useMutation({
    mutationFn: (msg: string) =>
      configService.setPosOperations(data?.enabled ?? false, msg),
    onSuccess: () => {
      setMessageDraft(null);
      toast.success('Leyenda actualizada');
      void refetch();
    },
    onError: () => toast.error('No se pudo guardar la leyenda'),
  });

  if (isLoading) return <Skeleton className="h-56 w-full" />;
  if (isError || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-destructive">
          No se pudo cargar el estado del POS.
        </CardContent>
      </Card>
    );
  }

  const enabled = data.enabled;

  return (
    <>
      <Card>
        <CardContent className="space-y-6 p-6">
          {/* Estado actual */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                  enabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {enabled ? (
                  <LockOpenIcon className="h-6 w-6" />
                ) : (
                  <LockClosedIcon className="h-6 w-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">
                    Terminales POS
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      enabled
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                    }
                  >
                    {enabled ? 'Liberado' : 'Bloqueado'}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {enabled
                    ? 'La operación de venta está activa en todas las sucursales.'
                    : 'Instalación y configuración disponibles; venta bloqueada hasta liberar.'}
                </p>
              </div>
            </div>
            <Button
              size="lg"
              variant={enabled ? 'outline' : 'default'}
              onClick={() => setConfirmOpen(true)}
              disabled={toggle.isPending}
              className={
                enabled ? '' : 'bg-green-600 text-white hover:bg-green-700'
              }
            >
              {enabled ? (
                <>
                  <LockClosedIcon className="h-5 w-5" />
                  Bloquear POS
                </>
              ) : (
                <>
                  <LockOpenIcon className="h-5 w-5" />
                  Liberar POS
                </>
              )}
            </Button>
          </div>

          {/* Leyenda de bloqueo */}
          <div className="space-y-2 border-t pt-4">
            <label className="text-sm font-medium text-gray-700">
              Leyenda mientras está bloqueado
            </label>
            <p className="text-xs text-muted-foreground">
              Se muestra en la terminal en la zona de venta. Déjala vacía para
              usar el texto por defecto.
            </p>
            <Input
              value={message}
              onChange={(e) => setMessageDraft(e.target.value)}
              placeholder={DEFAULT_LOCK_MESSAGE}
            />
            <div className="flex justify-end gap-2">
              {messageDirty && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMessageDraft(null)}
                >
                  Cancelar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={!messageDirty || saveMessage.isPending}
                onClick={() => saveMessage.mutate(messageDraft ?? '')}
              >
                Guardar leyenda
              </Button>
            </div>
          </div>

          {/* Liberación por terminal (pilotos) */}
          <PosLicenseReleaseList globalEnabled={enabled} />
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {enabled ? 'Bloquear todas las terminales POS' : 'Liberar todas las terminales POS'}
            </DialogTitle>
            <DialogDescription>
              {enabled
                ? 'La pantalla de venta de TODAS las terminales quedará bloqueada con la leyenda de próximamente. Las ventas en curso podrían interrumpirse. ¿Continuar?'
                : 'Se habilitará la operación de venta en TODAS las terminales instaladas. Cada una lo aplicará en su siguiente latido (≤ 60 segundos). ¿Continuar?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={enabled ? 'destructive' : 'default'}
              disabled={toggle.isPending}
              onClick={() => toggle.mutate(!enabled)}
              className={enabled ? '' : 'bg-green-600 text-white hover:bg-green-700'}
            >
              {toggle.isPending
                ? 'Aplicando…'
                : enabled
                  ? 'Sí, bloquear'
                  : 'Sí, liberar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function fmtLastSeen(iso?: string): string {
  if (!iso) return 'nunca';
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const POS_STATUS_LABEL: Record<string, string> = {
  active: 'Activa',
  inactive: 'Sin activar',
  revoked: 'Revocada',
};

/**
 * Lista de terminales con un switch para liberar individualmente (pilotos).
 * La liberación por licencia es un allowlist SOBRE el flag global: cuando el
 * global está liberado, todas operan y estos switches quedan informativos.
 */
function PosLicenseReleaseList({ globalEnabled }: { globalEnabled: boolean }) {
  const { data: licenses = [], isLoading } = usePosLicenses();
  const setRelease = useSetPosLicenseRelease();
  const setInvoicing = useSetPosLicenseInvoicing();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingInvoicingId, setPendingInvoicingId] = useState<string | null>(
    null,
  );

  // Excluir revocadas: no son instalables.
  const rows = licenses.filter((l) => l.status !== 'revoked');

  // El API explica el motivo real del rechazo (p.ej. "migración 097 no
  // aplicada", permisos) — mostrarlo en vez de un genérico.
  const apiError = (err: unknown, fallback: string) => {
    const msg = (err as { response?: { data?: { message?: string | string[] } } })
      ?.response?.data?.message;
    toast.error(Array.isArray(msg) ? msg.join(' ') : (msg ?? fallback));
  };

  const handleToggle = (lic: PosLicense, released: boolean) => {
    setPendingId(lic.id);
    setRelease.mutate(
      { id: lic.id, released },
      {
        onSuccess: () =>
          toast.success(
            released
              ? `${lic.branchName ?? lic.licenseKey}: liberada para pruebas`
              : `${lic.branchName ?? lic.licenseKey}: vuelta a bloqueada`,
          ),
        onError: (err) => apiError(err, 'No se pudo cambiar la terminal'),
        onSettled: () => setPendingId(null),
      },
    );
  };

  const handleToggleInvoicing = (lic: PosLicense, enabled: boolean) => {
    setPendingInvoicingId(lic.id);
    setInvoicing.mutate(
      { id: lic.id, enabled },
      {
        onSuccess: () =>
          toast.success(
            enabled
              ? `${lic.branchName ?? lic.licenseKey}: facturación habilitada en la terminal`
              : `${lic.branchName ?? lic.licenseKey}: facturación deshabilitada — la factura se emite en el sistema anterior`,
          ),
        onError: (err) => apiError(err, 'No se pudo cambiar la facturación'),
        onSettled: () => setPendingInvoicingId(null),
      },
    );
  };

  return (
    <div className="space-y-2 border-t pt-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700">
            Liberar terminales individuales (pruebas)
          </label>
          <p className="text-xs text-muted-foreground">
            Activa una terminal para operar aunque el POS global esté bloqueado.
            Ideal para pilotos: instala en todas y prueba en las que elijas. En
            las terminales liberadas puedes además apagar la{' '}
            <strong>Facturación</strong> (piloto doble captura: la factura se
            emite solo en el sistema anterior para no timbrar dos veces).
          </p>
        </div>
      </div>

      {globalEnabled && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          El POS global está liberado: todas las terminales operan. Estos
          controles aplican solo cuando el POS global está bloqueado.
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : rows.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">
          No hay terminales registradas todavía. Genera licencias desde
          Sucursales.
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {rows.map((lic) => (
            <div
              key={lic.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-gray-900">
                    {lic.branchName ?? 'Sucursal sin nombre'}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      lic.status === 'active'
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-gray-50 text-gray-500'
                    }
                  >
                    {POS_STATUS_LABEL[lic.status] ?? lic.status}
                  </Badge>
                  {!globalEnabled && lic.operationsReleased && (
                    <Badge
                      variant="outline"
                      className="border-blue-200 bg-blue-50 text-blue-700"
                    >
                      En pruebas
                    </Badge>
                  )}
                  {!lic.invoicingEnabled && (
                    <Badge
                      variant="outline"
                      className="border-amber-200 bg-amber-50 text-amber-700"
                    >
                      Sin facturar
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{lic.licenseKey}</span>
                  {lic.label && <span>· {lic.label}</span>}
                  <span>· visto {fmtLastSeen(lic.lastSeenAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Facturación por terminal: visible solo cuando la terminal
                    puede operar. Apagar durante el piloto de doble captura
                    (la factura se emite en el legacy, no dos veces). */}
                {(globalEnabled || lic.operationsReleased) && (
                  <div className="mr-2 flex items-center gap-2 border-r pr-4">
                    <span className="text-xs text-muted-foreground">
                      Facturación
                    </span>
                    <Switch
                      checked={lic.invoicingEnabled}
                      disabled={pendingInvoicingId === lic.id}
                      onCheckedChange={(v) => handleToggleInvoicing(lic, v)}
                      aria-label={`Facturación de ${lic.branchName ?? lic.licenseKey}`}
                    />
                  </div>
                )}
                <span className="text-xs text-muted-foreground">
                  {lic.operationsReleased ? 'Liberada' : 'Bloqueada'}
                </span>
                <Switch
                  checked={lic.operationsReleased}
                  disabled={pendingId === lic.id}
                  onCheckedChange={(v) => handleToggle(lic, v)}
                  aria-label={`Liberar ${lic.branchName ?? lic.licenseKey}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
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
  const [syncOpen, setSyncOpen] = useState(false);
  // La fase de clientes admite SINCRONIZAR (upsert + reconciliación de borrado)
  // contra el archivo maestro completo, además de la carga insert-only.
  const canSync = phase.key === 'clientes-red';

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
            {canSync && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setSyncOpen(true)}
                title="Sincronizar con el archivo maestro (actualiza, agrega y borra los de prueba)"
              >
                Sincronizar…
              </Button>
            )}
          </div>
        )}
      </CardContent>
      {canSync && (
        <ClientesSyncDialog open={syncOpen} onOpenChange={setSyncOpen} />
      )}
    </Card>
  );
}

// ----------------------------------------------------------------
// SYNC de clientes: upsert + reconciliación (preview → aplicar)
// ----------------------------------------------------------------

function ClientesSyncDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [applyJobId, setApplyJobId] = useState<string | null>(null);
  const [force, setForce] = useState(false);
  const startPreview = useStartSyncPreview();
  const startApply = useStartSyncApply();
  const { data: jobs } = useLoadJobs();
  const queryClient = useQueryClient();

  const previewJob = jobs?.find((j) => j.id === previewJobId);
  const applyJob = jobs?.find((j) => j.id === applyJobId);
  const plan = previewJob?.status === 'done' ? previewJob.syncPlan : undefined;
  const previewing = startPreview.isPending || previewJob?.status === 'running';
  const applying = startApply.isPending || applyJob?.status === 'running';

  const reset = () => {
    setFile(null);
    setPreviewJobId(null);
    setApplyJobId(null);
    setForce(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  // Aviso de fin del apply (una sola vez) + cierre.
  const prevApply = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevApply.current;
    const cur = applyJob?.status;
    if (prev === 'running' && cur === 'done' && applyJob?.syncApply) {
      const r = applyJob.syncApply;
      toast.success(
        `SYNC de clientes: ${nf.format(r.actualizados)} actualizados, ${nf.format(r.insertados)} nuevos, ${nf.format(r.borrados)} borrados` +
          (r.borradosOmitidos > 0
            ? ` (${nf.format(r.borradosOmitidos)} omitidos por tener red)`
            : ''),
        { duration: 10000 },
      );
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
      onOpenChange(false);
      reset();
    } else if (prev === 'running' && cur === 'error') {
      const errs = applyJob?.error?.errors;
      const detail = errs?.length ? ` — ${errs.slice(0, 3).join(' · ')}` : '';
      toast.error(
        `${applyJob?.error?.message ?? 'Error al aplicar'}${detail}`,
        {
          duration: 12000,
        },
      );
    }
    prevApply.current = cur;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyJob?.status]);

  // Aviso de error del preview.
  const prevPreview = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevPreview.current === 'running' && previewJob?.status === 'error') {
      const errs = previewJob?.error?.errors;
      const detail = errs?.length
        ? ` — ${errs.slice(0, 3).join(' · ')}${errs.length > 3 ? ` (+${errs.length - 3})` : ''}`
        : '';
      toast.error(
        `${previewJob?.error?.message ?? 'Error al previsualizar'}${detail}`,
        { duration: 12000 },
      );
    }
    prevPreview.current = previewJob?.status;
  }, [previewJob?.status, previewJob?.error]);

  const handlePickFile = async (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setApplyJobId(null);
    setForce(false);
    try {
      const { jobId } = await startPreview.mutateAsync(f);
      setPreviewJobId(jobId);
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { message?: string } } })
        ?.response?.data;
      toast.error(data?.message ?? 'No se pudo iniciar el preview');
    }
  };

  const handleApply = async () => {
    if (!file || !plan) return;
    try {
      const { jobId } = await startApply.mutateAsync({
        file,
        token: plan.token,
        force,
      });
      setApplyJobId(jobId);
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { message?: string } } })
        ?.response?.data;
      toast.error(data?.message ?? 'No se pudo iniciar el apply');
    }
  };

  const nothingToDo =
    plan &&
    plan.aInsertar === 0 &&
    plan.aActualizar === 0 &&
    plan.aBorrar === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v && !applying) reset();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sincronizar clientes (archivo maestro)</DialogTitle>
          <DialogDescription>
            El archivo debe ser la lista <strong>COMPLETA</strong> de clientes.
            Se actualizan los que cambiaron, se agregan los nuevos y se borran
            los distribuidores que ya no estén (cuentas de prueba). Primero
            previsualiza; nada se escribe hasta que confirmes.
          </DialogDescription>
        </DialogHeader>

        {/* Paso 1: elegir archivo */}
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => handlePickFile(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={previewing || applying}
            onClick={() => fileRef.current?.click()}
          >
            {file ? 'Cambiar archivo' : 'Elegir archivo'}
          </Button>
          <span className="truncate text-sm text-muted-foreground">
            {file?.name ?? 'Ningún archivo seleccionado'}
          </span>
        </div>

        {previewing && (
          <p className="text-sm text-muted-foreground">
            Analizando el archivo (dry-run, no se escribe nada)…
          </p>
        )}

        {plan && (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <SyncStat
                label="Actualizar"
                value={plan.aActualizar}
                tone="info"
              />
              <SyncStat label="Agregar" value={plan.aInsertar} tone="success" />
              <SyncStat label="Borrar" value={plan.aBorrar} tone="warning" />
              <SyncStat
                label="Omitidos (red)"
                value={plan.aBorrarBloqueados}
                tone="outline"
              />
            </div>

            {plan.excedeUmbral && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                ⚠️ Se borraría el <strong>{plan.pctBorrar}%</strong> de los
                distribuidores (sobre el umbral de {plan.umbralPct}%). Verifica
                que el archivo maestro esté completo. Marca la casilla para
                forzar si es intencional.
                <label className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={force}
                    onChange={(e) => setForce(e.target.checked)}
                  />
                  <span>Entiendo el riesgo; borrar de todos modos (force)</span>
                </label>
              </div>
            )}

            {/* Cambios de patrocinador (solo se reportan) */}
            {plan.sponsorChanges.length > 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-medium">
                  {plan.sponsorChanges.length} cambio(s) de patrocinador
                  detectado(s) — NO se aplican (la red no se recoloca):
                </p>
                <ul className="mt-1 max-h-28 overflow-y-auto text-xs">
                  {plan.sponsorChanges.slice(0, 50).map((s) => (
                    <li key={s.customerNumber}>
                      {s.customerNumber} ({s.nombre}): {s.sponsorActual ?? '—'}{' '}
                      → {s.sponsorArchivo ?? '—'}
                    </li>
                  ))}
                  {plan.sponsorChanges.length > 50 && (
                    <li>… (+{plan.sponsorChanges.length - 50} más)</li>
                  )}
                </ul>
              </div>
            )}

            {/* Detalle de los que se borrarían */}
            {plan.removals.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium text-foreground">
                  Distribuidores ausentes del archivo ({plan.removals.length})
                </p>
                <div className="max-h-56 overflow-y-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="text-left">
                        <th className="p-2">#</th>
                        <th className="p-2">Nombre</th>
                        <th className="p-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.removals.slice(0, 300).map((r) => (
                        <tr
                          key={r.customerNumber}
                          className="border-t border-border/50"
                        >
                          <td className="p-2 font-mono">{r.customerNumber}</td>
                          <td className="p-2">{r.nombre}</td>
                          <td className="p-2">
                            {!r.deletable ? (
                              <Badge variant="outline">
                                Omitido — {r.motivoBloqueo ?? 'tiene red'}
                              </Badge>
                            ) : r.tieneTransaccional ? (
                              <Badge variant="warning">
                                Borrar + su historial (ventas/puntos)
                              </Badge>
                            ) : (
                              <Badge variant="success">Borrar</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {plan.removals.length > 300 && (
                    <p className="p-2 text-xs text-muted-foreground">
                      … mostrando 300 de {plan.removals.length}
                    </p>
                  )}
                </div>
              </div>
            )}

            {nothingToDo && (
              <p className="text-sm text-muted-foreground">
                No hay cambios: el archivo coincide con la BD.
              </p>
            )}
          </div>
        )}

        {applying && (
          <div className="text-sm">
            <p className="text-muted-foreground">
              {applyJob?.progress?.stage ?? 'Aplicando cambios'}…
            </p>
            {applyJob?.progress && applyJob.progress.total > 0 && (
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${applyJob.progress.percent}%` }}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              if (!applying) reset();
            }}
            disabled={applying}
          >
            Cerrar
          </Button>
          <Button
            variant="destructive"
            disabled={
              !plan ||
              applying ||
              previewing ||
              nothingToDo ||
              (plan.excedeUmbral && !force)
            }
            onClick={handleApply}
          >
            {applying ? 'Aplicando…' : 'Aplicar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SyncStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'info' | 'success' | 'warning' | 'outline';
}) {
  return (
    <div className="rounded-md border p-2 text-center">
      <div className="text-lg font-bold text-foreground">
        {nf.format(value)}
      </div>
      <Badge variant={tone} className="mt-0.5">
        {label}
      </Badge>
    </div>
  );
}

// ----------------------------------------------------------------
// Reset de ventas por periodo (para re-correr la migración histórica)
// ----------------------------------------------------------------

function ResetPeriodSalesCard() {
  const { data: periodsData, isLoading: periodsLoading } =
    useCommissionPeriods();
  const [periodId, setPeriodId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const preview = usePeriodSalesPreview(periodId || null);
  const reset = useResetPeriodSales();

  const periodsRaw = Array.isArray(periodsData)
    ? periodsData
    : ((periodsData as { data?: unknown[] } | undefined)?.data ?? []);
  const options = (
    periodsRaw as Array<{ id: string; name: string; isCurrent?: boolean }>
  ).map((p) => ({
    value: p.id,
    label: `${p.name}${p.isCurrent ? ' (Actual)' : ''}`,
  }));

  const pv = preview.data;

  const handleReset = async () => {
    if (!periodId) return;
    try {
      const r = await reset.mutateAsync(periodId);
      setConfirmOpen(false);
      toast.success(
        `Periodo "${r.periodName}" reseteado: ${nf.format(r.deletedOrders)} pedidos y ` +
          `${nf.format(r.deletedPosSales)} ventas de sucursal borradas en ${(r.durationMs / 1000).toFixed(1)}s.`,
      );
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Error al resetear las ventas del periodo';
      toast.error(message);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <strong>Irreversible.</strong> Borra todas las ventas del periodo
            (pedidos ecommerce y ventas de sucursal, con sus items, pagos y
            envíos) cuyo registro cae en el rango de fechas 26→25 —{' '}
            <strong>incluyendo ventas reales</strong>. Úsalo solo para re-correr
            la migración histórica.
          </p>
        </div>

        <div className="max-w-md">
          <label className="mb-1 block text-sm font-medium text-foreground">
            Periodo a resetear
          </label>
          <SearchableSelect
            options={options}
            value={periodId}
            onChange={setPeriodId}
            placeholder={
              periodsLoading ? 'Cargando periodos…' : 'Selecciona un periodo'
            }
            showAllOption={false}
          />
        </div>

        {periodId && (
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            {preview.isLoading && (
              <p className="text-sm text-muted-foreground">
                Calculando ventas del periodo…
              </p>
            )}
            {preview.isError && (
              <p className="text-sm text-destructive">
                No se pudo calcular el periodo.
              </p>
            )}
            {pv && (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Rango <strong>{pv.startDate}</strong> →{' '}
                  <strong>{pv.endDate}</strong>
                  {pv.isClosed ? ' · cerrado' : ' · abierto'}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded bg-background p-3">
                    <p className="text-xs text-muted-foreground">
                      Pedidos ecommerce
                    </p>
                    <p className="font-semibold text-foreground">
                      {nf.format(pv.orders)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cf.format(pv.ordersTotal)}
                    </p>
                  </div>
                  <div className="rounded bg-background p-3">
                    <p className="text-xs text-muted-foreground">
                      Ventas de sucursal
                    </p>
                    <p className="font-semibold text-foreground">
                      {nf.format(pv.posSales)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cf.format(pv.posSalesTotal)}
                    </p>
                  </div>
                  <div className="rounded bg-background p-3">
                    <p className="text-xs text-muted-foreground">
                      Total a borrar
                    </p>
                    <p className="font-semibold text-foreground">
                      {nf.format(pv.totalSales)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cf.format(pv.totalAmount)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <Button
            variant="destructive"
            disabled={
              !periodId || !pv || pv.totalSales === 0 || reset.isPending
            }
            onClick={() => setConfirmOpen(true)}
          >
            {reset.isPending ? 'Reseteando…' : 'Resetear ventas del periodo'}
          </Button>
          {pv && pv.totalSales === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              El periodo no tiene ventas que borrar.
            </p>
          )}
        </div>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetear ventas de {pv?.periodName}</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Se borrarán de forma <strong>irreversible</strong> todas las
                  ventas del rango <strong>{pv?.startDate}</strong> →{' '}
                  <strong>{pv?.endDate}</strong>:
                </p>
                <p className="rounded bg-muted p-2 text-xs">
                  {nf.format(pv?.orders ?? 0)} pedidos (
                  {cf.format(pv?.ordersTotal ?? 0)}) ·{' '}
                  {nf.format(pv?.posSales ?? 0)} ventas de sucursal (
                  {cf.format(pv?.posSalesTotal ?? 0)})
                </p>
                <p className="text-muted-foreground">
                  Comisiones, puntos, rangos y red NO se tocan. Después podrás
                  re-correr la migración del periodo.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={reset.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={reset.isPending}
            >
              {reset.isPending ? 'Reseteando…' : 'Sí, borrar las ventas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
