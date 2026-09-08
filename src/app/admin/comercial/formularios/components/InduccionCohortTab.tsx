'use client';

// InduccionCohortTab - Seccion "Cohorte del taller <fecha>": selector de
// fecha (talleres anteriores/siguientes), contadores, tabla de la cohorte
// con estado de invitacion y recordatorios, acciones por fila (reenviar,
// excluir/incluir) y envios masivos con dialogo de confirmacion.

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  useInductionCohort,
  useSendInvitations,
  useSendReminder,
  useSetInductionExclusion,
} from '@/hooks/useInduction';
import type {
  InductionCohortRow,
  InductionSendResult,
  InductionSettings,
} from '@/services/induction.service';
import {
  addDays,
  apiErrorInfo,
  apiErrorMessage,
  formatDateTimeCdmx,
  formatLongDateYearEs,
  formatShortDateEs,
  formatTime12,
  isValidYmd,
  KIT_LABELS,
  LIVE_STATUSES,
  nextWorkshopDate,
  reminderKey,
  reminderLabel,
  statusMeta,
  WEEKDAY_LABELS,
} from './induccion-utils';

interface Props {
  settings: InductionSettings;
  workshopDate?: string;
  onWorkshopDateChange: (d?: string) => void;
}

type ConfirmState =
  | { kind: 'invitations'; customerIds?: string[]; count: number; label: string }
  | { kind: 'reminder' }
  | null;

/** '2026-09-08#rec-3-1400' -> 'Mié 14:00'. */
function reminderKeyLabel(key: string): string {
  const m = /#rec-(\d)-(\d{2})(\d{2})$/.exec(key);
  if (!m) return key;
  const wd = WEEKDAY_LABELS[Number(m[1])] ?? '?';
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1, 3)} ${m[2]}:${m[3]}`;
}

const canReceive = (r: InductionCohortRow) =>
  !!r.phoneE164 && !r.optOut && !r.excluded && !r.duplicateOf;

/** Los inputs type=date emiten anios parciales mientras se teclea ('0002-...'). */
const MIN_PICKABLE_DATE = '2000-01-01';

export default function InduccionCohortTab({
  settings,
  workshopDate,
  onWorkshopDateChange,
}: Props) {
  const cohortQuery = useInductionCohort(workshopDate);
  const cohort = cohortQuery.data;
  const sendInvitations = useSendInvitations();
  const sendReminder = useSendReminder();
  const setExclusion = useSetInductionExclusion();

  // Fecha mostrada: la que devolvio el API, o la elegida, o la calculada.
  const shownDate =
    cohort?.workshopDate ??
    workshopDate ??
    nextWorkshopDate(settings.workshopWeekday);

  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [reminderChoice, setReminderChoice] = useState<string>('');
  const [exclusionTarget, setExclusionTarget] = useState<InductionCohortRow | null>(null);
  const [exclusionReason, setExclusionReason] = useState('');
  const [lastResult, setLastResult] = useState<{
    title: string;
    result: InductionSendResult;
  } | null>(null);

  const reminderOptions = useMemo(
    () =>
      settings.reminders.map((r) => ({
        key: reminderKey(shownDate, r),
        label: `${reminderLabel(r)} · ${r.template}`,
      })),
    [settings.reminders, shownDate],
  );
  const activeReminderKey =
    reminderChoice && reminderOptions.some((o) => o.key === reminderChoice)
      ? reminderChoice
      : (reminderOptions[0]?.key ?? '');

  const rows = useMemo(() => cohort?.rows ?? [], [cohort]);
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.customerNumber.toLowerCase().includes(q) ||
        (r.phone ?? '').includes(q),
    );
  }, [rows, search]);

  /** Quienes recibirian el recordatorio elegido (misma regla que el API). */
  const reminderTargets = useMemo(
    () =>
      activeReminderKey
        ? rows.filter(
            (r) =>
              canReceive(r) &&
              !!r.invitation &&
              LIVE_STATUSES.has(r.invitation.status) &&
              !r.reminders.some(
                (x) => x.key === activeReminderKey && x.status !== 'failed',
              ),
          ).length
        : 0,
    [rows, activeReminderKey],
  );

  const pendingCount =
    cohort?.counts.porInvitar ??
    rows.filter(
      (r) =>
        canReceive(r) &&
        (!r.invitation || !LIVE_STATUSES.has(r.invitation.status)),
    ).length;

  const goTo = (d: string) => {
    onWorkshopDateChange(d);
    setSearch('');
  };

  const runInvitations = async (customerIds?: string[]) => {
    try {
      const result = await sendInvitations.mutateAsync({
        workshopDate: shownDate,
        ...(customerIds ? { customerIds } : {}),
      });
      setLastResult({ title: 'Invitaciones', result });
      toast.success(
        `Invitaciones: ${result.sent} enviadas, ${result.failed} fallidas, ${result.skipped} omitidas`,
      );
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudieron enviar las invitaciones'));
    } finally {
      setConfirm(null);
    }
  };

  const runReminder = async () => {
    if (!activeReminderKey) return;
    try {
      const result = await sendReminder.mutateAsync({
        workshopDate: shownDate,
        reminderKey: activeReminderKey,
      });
      setLastResult({ title: 'Recordatorio', result });
      toast.success(
        `Recordatorio: ${result.sent} enviados, ${result.failed} fallidos, ${result.skipped} omitidos`,
      );
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo enviar el recordatorio'));
    } finally {
      setConfirm(null);
    }
  };

  const toggleExclusion = async (row: InductionCohortRow, reason?: string) => {
    try {
      await setExclusion.mutateAsync({
        customerId: row.customerId,
        workshopDate: shownDate,
        excluded: !row.excluded,
        ...(reason ? { reason } : {}),
      });
      toast.success(
        row.excluded
          ? `${row.name} vuelve a la cohorte`
          : `${row.name} excluido del taller`,
      );
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo actualizar la exclusión'));
    } finally {
      setExclusionTarget(null);
      setExclusionReason('');
    }
  };

  const busy =
    sendInvitations.isPending || sendReminder.isPending || setExclusion.isPending;

  const counts = cohort?.counts;
  const counterTiles: Array<{ label: string; value?: number; tone?: string }> = [
    { label: 'En cohorte', value: counts?.total },
    { label: 'Sin teléfono válido', value: counts?.sinTelefono, tone: 'text-amber-700' },
    { label: 'Baja WhatsApp', value: counts?.optOut, tone: 'text-amber-700' },
    { label: 'Excluidos', value: counts?.excluidos },
    { label: 'Teléfono repetido', value: counts?.duplicados ?? 0, tone: 'text-amber-700' },
    { label: 'Por invitar', value: counts?.porInvitar, tone: 'text-[#0A4B94]' },
    { label: 'Invitados', value: counts?.invitados },
    { label: 'Entregados', value: counts?.entregados, tone: 'text-emerald-700' },
    { label: 'Leídos', value: counts?.leidos, tone: 'text-emerald-800' },
    { label: 'Fallidos', value: counts?.fallidos, tone: 'text-red-700' },
  ];

  const errorInfo = cohortQuery.isError
    ? apiErrorInfo(cohortQuery.error, 'No se pudo cargar la cohorte.')
    : null;

  return (
    <div className="space-y-4">
      {/* Selector de fecha */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Cohorte del taller del {formatLongDateYearEs(shownDate)}
          </p>
          <p className="text-xs text-muted-foreground">
            {cohort
              ? `Altas del ${formatShortDateEs(cohort.cohortStart)} al ${formatShortDateEs(cohort.cohortEnd)} · taller ${formatTime12(settings.workshopTime)} CDMX`
              : 'Cargando…'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goTo(addDays(shownDate, -7))}
            title="Taller anterior"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={shownDate}
            onChange={(e) => {
              const v = e.target.value;
              if (!isValidYmd(v) || v < MIN_PICKABLE_DATE) return;
              // Solo dias de taller: cualquier otra fecha se ajusta al
              // siguiente dia del taller (el API rechaza las demas con 400
              // y una cohorte corrida mandaria WhatsApp con la fecha mal).
              goTo(nextWorkshopDate(settings.workshopWeekday, v));
            }}
            className="h-8 w-40"
            title={`Solo ${WEEKDAY_LABELS[settings.workshopWeekday] ?? 'días del taller'}; otra fecha se ajusta al siguiente`}
          />
          <span className="text-xs text-muted-foreground">
            {WEEKDAY_LABELS[settings.workshopWeekday] ?? ''}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goTo(addDays(shownDate, 7))}
            title="Taller siguiente"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => cohortQuery.refetch()}
            disabled={cohortQuery.isFetching}
            title="Actualizar"
          >
            <ArrowPathIcon
              className={`h-4 w-4 ${cohortQuery.isFetching ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-10">
        {counterTiles.map((t) => (
          <div key={t.label} className="rounded-md border p-2 text-center">
            <p className={`text-xl font-bold ${t.tone ?? 'text-gray-900'}`}>
              {t.value ?? '-'}
            </p>
            <p className="text-[11px] leading-tight text-muted-foreground">
              {t.label}
            </p>
          </div>
        ))}
      </div>

      {/* Acciones masivas */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() =>
            setConfirm({
              kind: 'invitations',
              count: pendingCount,
              label: 'a los pendientes',
            })
          }
          disabled={busy || !cohort || pendingCount === 0}
        >
          <PaperAirplaneIcon className="h-4 w-4" />
          Enviar invitaciones a los pendientes ({pendingCount})
        </Button>
        <Button
          variant="outline"
          onClick={() => setConfirm({ kind: 'reminder' })}
          disabled={busy || !cohort || reminderOptions.length === 0}
          title={
            reminderOptions.length === 0
              ? 'Configura al menos un recordatorio en la pestaña Recordatorios'
              : undefined
          }
        >
          Enviar recordatorio ahora
        </Button>
        {!settings.invitationTemplate && (
          <span className="text-xs text-amber-700">
            Falta la plantilla de invitación (pestaña Mensajes).
          </span>
        )}
      </div>

      {/* Resultado del ultimo envio */}
      {lastResult && (
        <div className="rounded-md border bg-muted/30 p-3 text-xs">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-medium text-gray-900">
              {lastResult.title}: {lastResult.result.sent} enviados,{' '}
              {lastResult.result.failed} fallidos, {lastResult.result.skipped}{' '}
              omitidos
            </span>
            <button
              type="button"
              className="text-muted-foreground hover:underline"
              onClick={() => setLastResult(null)}
            >
              Cerrar
            </button>
          </div>
          {lastResult.result.details?.length > 0 && (
            <ul className="max-h-40 space-y-0.5 overflow-y-auto">
              {lastResult.result.details.slice(0, 50).map((d, i) => {
                const st = (d.status ?? d.result ?? '').toString();
                return (
                  <li key={`${d.customerId ?? i}`} className="flex gap-2">
                    <span className="w-16 shrink-0 font-mono">
                      {d.customerNumber ?? ''}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{d.name ?? ''}</span>
                    <span
                      className={
                        st === 'failed'
                          ? 'text-red-700'
                          : st === 'sent'
                            ? 'text-emerald-700'
                            : 'text-muted-foreground'
                      }
                    >
                      {st === 'sent'
                        ? 'enviado'
                        : st === 'failed'
                          ? `falló${d.error ? `: ${d.error}` : ''}`
                          : `omitido${d.reason ? `: ${d.reason}` : ''}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Buscador local */}
      <div className="relative max-w-sm">
        <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrar por nombre, número o teléfono"
          className="pl-8"
        />
      </div>

      {/* Tabla */}
      {cohortQuery.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : errorInfo ? (
        <p className="py-8 text-center text-sm font-medium text-red-600">
          {errorInfo.message}
        </p>
      ) : filteredRows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {rows.length === 0
            ? 'Sin altas en esta cohorte (revisa que las inscripciones tengan fecha de alta y kit).'
            : 'Nadie coincide con el filtro.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Kit</TableHead>
                <TableHead>Alta</TableHead>
                <TableHead>Invitación</TableHead>
                <TableHead>Recordatorios</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((r) => {
                const inv = r.invitation;
                const invMeta = statusMeta(inv?.status);
                const invLive = !!inv && LIVE_STATUSES.has(inv.status);
                const receivable = canReceive(r);
                return (
                  <TableRow
                    key={r.customerId}
                    className={r.excluded ? 'opacity-60' : undefined}
                  >
                    <TableCell className="font-medium text-gray-900">
                      {r.name || '-'}
                      {r.country && r.country !== 'MX' && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          {r.country}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.customerNumber}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {r.phoneE164 ? (
                        <span>{r.phoneE164}</span>
                      ) : (
                        <span className="text-amber-700">Sin teléfono válido</span>
                      )}
                      {r.optOut && (
                        <Badge variant="warning" className="ml-1">
                          Baja
                        </Badge>
                      )}
                      {r.duplicateOf && (
                        <Badge
                          variant="warning"
                          className="ml-1"
                          title={`Mismo teléfono que el número ${r.duplicateOf}; los mensajes van a ese registro`}
                        >
                          Repetido ({r.duplicateOf})
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.kitType ? (
                        KIT_LABELS[r.kitType] ?? r.kitType
                      ) : (
                        <span className="text-amber-700">Sin kit</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatShortDateEs(r.registrationDate)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.excluded ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <NoSymbolIcon className="h-3.5 w-3.5" />
                          Excluido{r.excludedReason ? `: ${r.excludedReason}` : ''}
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <Badge className={invMeta.className}>{invMeta.label}</Badge>
                          {inv?.status === 'failed' && inv.error && (
                            <p
                              className="max-w-56 truncate text-[11px] text-red-700"
                              title={inv.error}
                            >
                              {inv.errorCode ? `[${inv.errorCode}] ` : ''}
                              {inv.error}
                            </p>
                          )}
                          {inv && inv.status !== 'failed' && (
                            <p className="text-[11px] text-muted-foreground">
                              {formatDateTimeCdmx(
                                inv.readAt ??
                                  inv.deliveredAt ??
                                  inv.sentAt ??
                                  inv.createdAt,
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.reminders.length === 0 ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {r.reminders.map((x) => {
                            const m = statusMeta(x.status);
                            return (
                              <div key={x.key} className="space-y-0.5">
                                <Badge className={m.className} title={x.key}>
                                  {reminderKeyLabel(x.key)} · {m.label}
                                </Badge>
                                {x.status === 'failed' && x.error && (
                                  <p
                                    className="max-w-56 truncate text-[11px] text-red-700"
                                    title={x.error}
                                  >
                                    {x.errorCode ? `[${x.errorCode}] ` : ''}
                                    {x.error}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!r.excluded && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy || !receivable || invLive}
                            title={
                              !receivable
                                ? r.duplicateOf
                                  ? `Teléfono repetido: los mensajes van al número ${r.duplicateOf}`
                                  : 'Sin teléfono válido o dado de baja'
                                : invLive
                                  ? 'Ya tiene invitación vigente'
                                  : undefined
                            }
                            onClick={() =>
                              setConfirm({
                                kind: 'invitations',
                                customerIds: [r.customerId],
                                count: 1,
                                label: `a ${r.name || r.customerNumber}`,
                              })
                            }
                          >
                            {inv?.status === 'failed' ? 'Reenviar' : 'Enviar'}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            r.excluded ? toggleExclusion(r) : setExclusionTarget(r)
                          }
                        >
                          {r.excluded ? 'Incluir' : 'Excluir'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogo de confirmacion de envios */}
      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm?.kind === 'reminder'
                ? 'Enviar recordatorio ahora'
                : 'Enviar invitaciones'}
            </DialogTitle>
            <DialogDescription>
              Se enviarán mensajes de WhatsApp reales para el taller del{' '}
              {formatLongDateYearEs(shownDate)}.
            </DialogDescription>
          </DialogHeader>

          {confirm?.kind === 'reminder' ? (
            <div className="space-y-3">
              <div>
                <Label className="mb-1 text-xs text-muted-foreground">
                  Recordatorio
                </Label>
                <Select
                  value={activeReminderKey}
                  onValueChange={setReminderChoice}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elige el recordatorio" />
                  </SelectTrigger>
                  <SelectContent>
                    {reminderOptions.map((o) => (
                      <SelectItem key={o.key} value={o.key}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm">
                Saldrán <strong>{reminderTargets}</strong> mensajes (a quienes
                tienen invitación vigente y aún no reciben este recordatorio).
                Quien ya lo recibió no vuelve a recibirlo.
              </p>
            </div>
          ) : confirm ? (
            <p className="text-sm">
              Saldrán <strong>{confirm.count}</strong>{' '}
              {confirm.count === 1 ? 'mensaje' : 'mensajes'} {confirm.label} con
              la plantilla{' '}
              <span className="font-mono">{settings.invitationTemplate}</span>.
              Quien ya tiene invitación vigente se omite.
            </p>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>
              Cancelar
            </Button>
            {confirm?.kind === 'reminder' ? (
              <Button
                onClick={runReminder}
                disabled={busy || !activeReminderKey || reminderTargets === 0}
              >
                {sendReminder.isPending ? 'Enviando…' : 'Enviar recordatorio'}
              </Button>
            ) : (
              <Button
                onClick={() => runInvitations(confirm?.customerIds)}
                disabled={busy || !confirm || confirm.count === 0}
              >
                {sendInvitations.isPending ? 'Enviando…' : 'Enviar'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogo de exclusion */}
      <Dialog
        open={exclusionTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setExclusionTarget(null);
            setExclusionReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir del taller</DialogTitle>
            <DialogDescription>
              {exclusionTarget?.name} ({exclusionTarget?.customerNumber}) no recibirá la
              invitación ni los recordatorios del taller del{' '}
              {formatLongDateYearEs(shownDate)}. Puedes incluirlo de nuevo después.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="mb-1 text-xs text-muted-foreground">
              Motivo (opcional)
            </Label>
            <Textarea
              value={exclusionReason}
              onChange={(e) => setExclusionReason(e.target.value.slice(0, 200))}
              placeholder="Ej. ya asistió, pidió no recibir mensajes…"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExclusionTarget(null)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                exclusionTarget && toggleExclusion(exclusionTarget, exclusionReason.trim())
              }
              disabled={busy || !exclusionTarget}
            >
              {setExclusion.isPending ? 'Guardando…' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
