'use client';

// JourneyCard - Tarjeta de un recorrido (J1…J12): interruptor con
// confirmación al encender (manda WhatsApp reales) y deshabilitado con motivo
// (`blockReason` del API, permiso, migración 185), categoría, plantilla
// configurada (`templateName`) y su estado en Meta, cuándo corre, próxima y
// última corrida (horas `*Cdmx` del API), alcance estimado y controles (% de
// control, tope diario, rampa por porcentaje y sucursales, hora, plantilla en
// Meta con confirmación, parámetros). Botones: Vista previa · Correr ahora
// (solo con maestro y recorrido encendidos: el API responde 409 si no) ·
// Probar a monitores · Ver envíos · Ajustes. La última corrida se pinta con
// OlaCard (mapeo de errores a tramos en recorridos.ts).

import { useState } from 'react';
import {
  AdjustmentsHorizontalIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
  PaperAirplaneIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
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
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useActiveBranches } from '@/hooks/useBranches';
import { useRunJourney, useUpdateJourney } from '@/hooks/useWhatsAppJourneys';
import { apiErrorMessage, type ApiErrorMessages } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import { badgeContraste, n, pct } from '@/lib/whatsapp-campaign/format';
import {
  CONTROL_OPCIONES,
  ajustesDe,
  camposParams,
  controlTexto,
  estadoPlantilla,
  etiquetaCategoria,
  etiquetaEstadoCorrida,
  gateRecorrido,
  motivosOrdenados,
  olaDeCorrida,
  patchDeAjustes,
  plantillaConfigurada,
  resumenCorrida,
  toneCategoriaRecorrido,
  toneEstadoCorrida,
  validarAjustes,
  type AjustesRecorrido,
} from '@/lib/whatsapp-campaign/recorridos';
import type { ChannelTemplate } from '@/types/whatsappChannel';
import type { JourneyItem, JourneyPatchInput } from '@/types/whatsappJourneys';
import { JourneyPreviewDialog } from './JourneyPreviewDialog';
import { JourneySendsDialog } from './JourneySendsDialog';
import { OlaCard } from './WavesPanel';

const WRITE_ERRORS: ApiErrorMessages = {
  forbidden: 'Tu rol no puede encender, pausar ni configurar recorridos (permiso whatsapp:manage).',
  unavailable: 'Falta la migración 185 en la base: todavía no se puede guardar.',
  notFound: 'El API todavía no expone los recorridos (despliegue pendiente).',
};

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{children}</dd>
    </>
  );
}

function RampaSucursales({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
}) {
  const branches = useActiveBranches();
  const lista = (branches.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const toggle = (id: string, on: boolean) =>
    onChange(on ? Array.from(new Set([...value, id])) : value.filter((x) => x !== id));
  return (
    <details className="rounded-md border p-2 text-sm">
      <summary className="cursor-pointer font-medium">
        Sucursales de la rampa{' '}
        <span className="font-normal text-muted-foreground">
          ({value.length === 0 ? 'todas' : `${value.length} elegidas`})
        </span>
      </summary>
      <p className="mt-1 text-xs text-muted-foreground">
        Sin sucursales elegidas, la rampa aplica a todas. Con sucursales, solo entran las personas de esas
        sucursales (y de ellas, el porcentaje de la rampa).
      </p>
      {branches.isLoading ? (
        <p className="mt-2 text-xs text-muted-foreground">Cargando sucursales…</p>
      ) : lista.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No se pudo cargar la lista de sucursales.</p>
      ) : (
        <div className="mt-2 grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">
          {lista.map((b) => (
            <label key={b.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={value.includes(b.id)}
                onCheckedChange={(c) => toggle(b.id, c === true)}
                disabled={disabled}
              />
              <span className="truncate">{b.name}</span>
            </label>
          ))}
        </div>
      )}
    </details>
  );
}

export function JourneyCard({
  item,
  canManage,
  masterEnabled,
  marketingPaused,
  optInCount,
  migrationPending,
  channelTemplate,
  periodNumber,
  onTest,
}: {
  item: JourneyItem;
  canManage: boolean;
  masterEnabled: boolean;
  marketingPaused: boolean;
  optInCount: number | null;
  migrationPending: boolean;
  /** Plantilla en la salud del canal (respaldo si el item no la trae). */
  channelTemplate: ChannelTemplate | null;
  periodNumber: number | null;
  onTest: (code: string) => void;
}) {
  const update = useUpdateJourney();
  const run = useRunJourney();
  const [confirmOn, setConfirmOn] = useState(false);
  const [confirmRun, setConfirmRun] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendsOpen, setSendsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<AjustesRecorrido | null>(null);
  /** PATCH pendiente de confirmar porque cambia la plantilla en Meta. */
  const [confirmTemplate, setConfirmTemplate] = useState<JourneyPatchInput | null>(null);

  const gate = gateRecorrido({ item, canManage, masterEnabled, marketingPaused, optInCount, migrationPending });
  const plantillaMeta = item.template ?? channelTemplate;
  const plantilla = estadoPlantilla(plantillaMeta);
  const nombrePlantilla = plantillaConfigurada(item);
  const catTone = toneCategoriaRecorrido(item.category);
  const ola = olaDeCorrida(item);
  const motivos = motivosOrdenados(item.lastRun?.byReason);
  const puedeEscribir = canManage && !migrationPending;
  const busy = update.isPending || run.isPending;
  // La corrida manual exige maestro y recorrido encendidos (el API responde 409).
  const puedeCorrer = puedeEscribir && item.enabled && masterEnabled;
  const motivoCorrer = !canManage
    ? 'Permiso whatsapp:manage'
    : migrationPending
      ? 'Falta la migración 185'
      : !masterEnabled
        ? 'El interruptor maestro está apagado: enciéndelo en Configuración para poder correrlo'
        : !item.enabled
          ? 'Enciende el recorrido para poder correrlo'
          : 'Corre el recorrido ahora respetando los candados, el horario local de cada zona y los topes';

  const setEnabled = async (v: boolean) => {
    try {
      await update.mutateAsync({ code: item.code, patch: { enabled: v } });
      toast.success(v ? `${item.code} ${item.name}: encendido` : `${item.code} ${item.name}: pausado`);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo cambiar el recorrido.', WRITE_ERRORS));
    }
  };

  const onToggle = (v: boolean) => {
    if (v && gate.needsConfirm) {
      setConfirmOn(true);
      return;
    }
    void setEnabled(v);
  };

  const correr = async () => {
    try {
      const r = await run.mutateAsync(item.code);
      const c = r.counts;
      const detalle = r.error ?? r.message;
      // 200 con status 'skipped' = no corrió (sin candidatos, presupuesto agotado…);
      // los bloqueos duros (horario, domingo, en curso…) llegan como 409 al catch.
      if (r.status === 'skipped') {
        toast.info(`${item.code}: no corrió${detalle ? ` · ${detalle}` : ''}`);
        return;
      }
      toast.success(
        `${item.code}: corrida ${etiquetaEstadoCorrida(r.status).toLowerCase()} · ${n(c?.sent)} enviados · ${n(c?.failed)} fallidos${
          detalle ? ` · ${detalle}` : ''
        }`,
      );
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo correr el recorrido.', WRITE_ERRORS));
    }
  };

  const abrirAjustes = () => {
    setDraft(ajustesDe(item));
    setEditing(true);
  };

  const aplicarPatch = async (patch: JourneyPatchInput) => {
    try {
      await update.mutateAsync({ code: item.code, patch });
      toast.success(
        patch.templateName
          ? `${item.code}: ajustes guardados · plantilla ${patch.templateName}`
          : `${item.code}: ajustes guardados`,
      );
      setEditing(false);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudieron guardar los ajustes.', WRITE_ERRORS));
    }
  };

  const guardar = () => {
    if (!draft) return;
    const errores = validarAjustes(draft);
    if (errores.length) {
      toast.error(errores[0]);
      return;
    }
    const patch = patchDeAjustes(item, draft);
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      return;
    }
    // Cambiar la plantilla en Meta cambia lo que recibe la gente: se confirma aparte.
    if (patch.templateName !== undefined) {
      setConfirmTemplate(patch);
      return;
    }
    void aplicarPatch(patch);
  };

  const campos = camposParams(item.code);

  return (
    <article
      className={cn(
        'grid content-start gap-3 rounded-lg border bg-card p-4 shadow-xs',
        item.enabled && 'border-emerald-200 dark:border-emerald-900/60',
      )}
      aria-label={`Recorrido ${item.code} ${item.name}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">{item.code}</p>
          <h3 className="text-base font-semibold leading-tight text-balance">{item.name}</h3>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground" title={gate.motivo ?? undefined}>
          {item.enabled ? 'Encendido' : 'Apagado'}
          <Switch
            checked={item.enabled}
            onCheckedChange={onToggle}
            disabled={!gate.puede || busy}
            aria-label={`${item.enabled ? 'Pausar' : 'Encender'} ${item.code} ${item.name}`}
          />
        </label>
      </header>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <Badge variant={catTone} className={badgeContraste(catTone)}>
          {etiquetaCategoria(item.category)}
        </Badge>
        {/* Nombre configurado en el recorrido (el API lo manda aunque no exista en Meta). */}
        <span className="font-mono text-muted-foreground" title="Plantilla configurada en el recorrido">
          {nombrePlantilla || '—'}
        </span>
        <Badge
          variant={plantilla.variant}
          className={badgeContraste(plantilla.variant)}
          title={!plantillaMeta && item.blockReason ? item.blockReason : undefined}
        >
          {plantilla.texto}
        </Badge>
      </div>

      {gate.motivo && (
        <p className="rounded-md border border-amber-200 bg-amber-50/60 p-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          {gate.motivo}
        </p>
      )}
      {/* El motivo del API se muestra siempre (p. ej. plantilla inexistente en Meta), salvo que ya sea el motivo del interruptor. */}
      {item.blockReason && item.blockReason !== gate.motivo && (
        <p className="text-xs text-muted-foreground">
          {!plantillaMeta && nombrePlantilla ? (
            <>
              <span className="font-mono">{nombrePlantilla}</span>: {item.blockReason}
            </>
          ) : (
            item.blockReason
          )}
        </p>
      )}

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        <Dato label="Cuándo">{item.scheduleText || `${item.sendTime} hora local`}</Dato>
        <Dato label="Próxima corrida">{item.nextRunCdmx ?? '—'}</Dato>
        <Dato label="Alcance estimado">{item.audienceEstimate == null ? '—' : `${n(item.audienceEstimate)} personas`}</Dato>
        <Dato label="Control">{controlTexto(item.controlPct)}</Dato>
        <Dato label="Tope diario">{n(item.dailyCap)}</Dato>
        <Dato label="Rampa">
          {pct(item.rampPct / 100)}
          {item.rampBranchIds.length > 0 ? ` · ${item.rampBranchIds.length} sucursales` : ' · todas las sucursales'}
        </Dato>
      </dl>

      <div className="grid gap-1 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground">Última corrida:</span>
          {item.lastRun ? (
            <Badge variant={toneEstadoCorrida(item.lastRun.status)} className={badgeContraste(toneEstadoCorrida(item.lastRun.status))}>
              {etiquetaEstadoCorrida(item.lastRun.status)}
            </Badge>
          ) : null}
          <span className="tabular-nums text-muted-foreground">{resumenCorrida(item.lastRun)}</span>
        </div>
        {ola && (
          <details className="group rounded-md border p-2">
            <summary className="cursor-pointer text-xs font-medium">Detalle de la última corrida</summary>
            <div className="mt-2 grid gap-2">
              <OlaCard ola={ola} />
              {motivos.length > 0 && (
                <ul className="grid gap-0.5 text-xs text-muted-foreground">
                  {motivos.map((m) => (
                    <li key={m.id} className="flex justify-between gap-2">
                      <span>{m.etiqueta}</span>
                      <span className="tabular-nums">{n(m.n)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
          <EyeIcon className="h-4 w-4" />
          Vista previa
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmRun(true)}
          disabled={!puedeCorrer || busy}
          title={motivoCorrer}
        >
          <PlayIcon className="h-4 w-4" />
          Correr ahora
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onTest(item.code)}
          disabled={!canManage}
          title={canManage ? 'Manda la plantilla a un número de monitoreo guardado' : 'Permiso whatsapp:manage'}
        >
          <PaperAirplaneIcon className="h-4 w-4" />
          Probar a monitores
        </Button>
        <Button variant="outline" size="sm" onClick={() => setSendsOpen(true)}>
          <ClipboardDocumentListIcon className="h-4 w-4" />
          Ver envíos
        </Button>
        <Button
          variant={editing ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => (editing ? setEditing(false) : abrirAjustes())}
          disabled={!puedeEscribir}
          title={canManage ? undefined : 'Permiso whatsapp:manage'}
        >
          <AdjustmentsHorizontalIcon className="h-4 w-4" />
          Ajustes
        </Button>
      </div>

      {editing && draft && (
        <div className="grid gap-3 rounded-md border bg-muted/30 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Grupo de control</Label>
              <Select
                value={String(draft.controlPct)}
                onValueChange={(v) => setDraft({ ...draft, controlPct: Number(v) })}
                disabled={busy}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTROL_OPCIONES.map((c) => (
                    <SelectItem key={c} value={String(c)}>
                      {c === 0 ? 'Sin control (0 %)' : `${pct(c)} no reciben (control)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Se decide al congelar a cada persona en el periodo; no cambia dentro del periodo.
              </p>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Hora de envío (hora local)</Label>
              <Input
                type="time"
                value={draft.sendTime}
                onChange={(e) => setDraft({ ...draft, sendTime: e.target.value })}
                disabled={busy}
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Tope diario del recorrido</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={100000}
                value={draft.dailyCap}
                onChange={(e) => setDraft({ ...draft, dailyCap: e.target.value })}
                disabled={busy}
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Rampa (% de las personas que entran)</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={draft.rampPct}
                onChange={(e) => setDraft({ ...draft, rampPct: e.target.value })}
                disabled={busy}
              />
            </div>
          </div>
          <RampaSucursales
            value={draft.rampBranchIds}
            onChange={(ids) => setDraft({ ...draft, rampBranchIds: ids })}
            disabled={busy}
          />
          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground">Plantilla en Meta</Label>
            <Input
              value={draft.templateName}
              onChange={(e) => setDraft({ ...draft, templateName: e.target.value.trim().toLowerCase() })}
              placeholder={nombrePlantilla || 'nombre_de_la_plantilla'}
              className="font-mono"
              spellCheck={false}
              disabled={busy}
            />
            <p className="text-[11px] text-muted-foreground">
              Nombre exacto de la plantilla aprobada en Meta (minúsculas, dígitos y guion bajo). Cambiarla
              pide confirmación; para encender el recorrido debe existir, estar aprobada y ser de la
              categoría {etiquetaCategoria(item.category)}.
            </p>
          </div>
          {campos.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {campos.map((c) => (
                <div key={c.key} className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">{c.label}</Label>
                  <Input
                    type={c.tipo === 'numero' ? 'number' : c.tipo === 'fecha' ? 'date' : c.tipo === 'url' ? 'url' : 'text'}
                    value={draft.params[c.key] ?? ''}
                    onChange={(e) => setDraft({ ...draft, params: { ...draft.params, [c.key]: e.target.value } })}
                    disabled={busy}
                  />
                  {c.ayuda && <p className="text-[11px] text-muted-foreground">{c.ayuda}</p>}
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={update.isPending}>
              Cancelar
            </Button>
            <Button size="sm" onClick={guardar} disabled={update.isPending}>
              {update.isPending ? 'Guardando…' : 'Guardar ajustes'}
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={confirmOn} onOpenChange={setConfirmOn}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Encender {item.code} {item.name}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Con el recorrido encendido (y el maestro encendido) el sistema manda WhatsApp reales a
                  los distribuidores que cumplan el segmento, en su horario local, con la plantilla{' '}
                  <span className="font-mono">{nombrePlantilla || '—'}</span>.{' '}
                  {item.scheduleText}
                  {item.audienceEstimate != null ? ` Alcance estimado hoy: ${n(item.audienceEstimate)} personas.` : ''}
                </p>
                {gate.avisos.length > 0 && (
                  <ul className="space-y-1.5">
                    {gate.avisos.map((a) => (
                      <li
                        key={a}
                        className="rounded-md border border-amber-200 bg-amber-50/60 p-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
                      >
                        {a}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: 'destructive' }))}
              onClick={() => void setEnabled(true)}
            >
              Encender
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRun} onOpenChange={setConfirmRun}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Correr {item.code} {item.name} ahora?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Es una corrida manual con las mismas reglas que la automática: respeta los candados
              (consentimiento, topes por persona, control, rampa), el horario local de cada zona (sucursal)
              y los topes diario y por hora; manda WhatsApp reales a quien entre. Exige el maestro y el
              recorrido encendidos; si está fuera de horario, es domingo (Marketing) o ya hay una corrida
              en curso, el API la rechaza. Usa &ldquo;Vista previa&rdquo; para ver quién entraría sin
              enviar nada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: 'destructive' }))}
              onClick={() => void correr()}
            >
              Correr ahora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmTemplate !== null} onOpenChange={(o) => !o && setConfirmTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar la plantilla en Meta de {item.code}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  El recorrido dejará de usar{' '}
                  <span className="font-mono">{nombrePlantilla || '—'}</span> y mandará{' '}
                  <span className="font-mono">{confirmTemplate?.templateName}</span> en los próximos envíos.
                  Las variables deben coincidir con las que espera el recorrido; si la plantilla no existe
                  en Meta, no está aprobada o es de otra categoría, el recorrido no se podrá encender.
                </p>
                {Object.keys(confirmTemplate ?? {}).length > 1 && (
                  <p className="text-xs text-muted-foreground">Se guardan también los demás ajustes capturados.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: 'destructive' }))}
              onClick={() => {
                const patch = confirmTemplate;
                setConfirmTemplate(null);
                if (patch) void aplicarPatch(patch);
              }}
            >
              Cambiar plantilla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <JourneyPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} item={item} periodNumber={periodNumber} />
      <JourneySendsDialog open={sendsOpen} onOpenChange={setSendsOpen} item={item} />
    </article>
  );
}
