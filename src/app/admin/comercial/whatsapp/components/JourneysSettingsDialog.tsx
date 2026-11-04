'use client';

// JourneysSettingsDialog - Configuración global de los recorridos
// (GET/PUT /whatsapp/journeys/settings, PUT con permiso whatsapp:manage):
// interruptor maestro (con confirmación al encender: manda WhatsApp reales),
// horario de envío en hora local de la sucursal, tope por hora, ventana de
// atribución, números de monitoreo (nombre, teléfono E.164, número de
// distribuidor opcional; "Enviar prueba" solo a los YA guardados) y tarifas
// por mensaje entregado (USD) para el costo del impacto.
//
// Se monta solo mientras está abierto (el padre lo renderiza
// condicionalmente): el borrador arranca de la configuración guardada.

import { useState } from 'react';
import {
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  PlusIcon,
  TrashIcon,
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
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Switch } from '@/components/ui/switch';
import { useUpdateJourneySettings } from '@/hooks/useWhatsAppJourneys';
import { apiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import { n } from '@/lib/whatsapp-campaign/format';
import {
  E164_RE,
  FX_SUGERIDO,
  MAX_MONITORES,
  TARIFAS_SUGERIDAS,
  conValoresSugeridos,
  payloadSettings,
  validarSettings,
} from '@/lib/whatsapp-campaign/recorridos';
import type { JourneyCosts, JourneyMonitorRecipient, JourneysSettings } from '@/types/whatsappJourneys';

const MAX_NAME = 80;
const MAX_CUSTOMER_NUMBER = 12;

const COSTO_LABELS: Array<{ key: keyof JourneyCosts; label: string }> = [
  { key: 'marketingUsdMx', label: 'Marketing · México' },
  { key: 'utilityUsdMx', label: 'Utilidad · México' },
  { key: 'marketingUsdUs', label: 'Marketing · EE. UU.' },
  { key: 'utilityUsdUs', label: 'Utilidad · EE. UU.' },
];

const clonar = (s: JourneysSettings): JourneysSettings => JSON.parse(JSON.stringify(s)) as JourneysSettings;

function Campo({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function JourneysSettingsDialog({
  open,
  onOpenChange,
  saved,
  canManage,
  onTest,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Configuración GUARDADA (la del GET): base del borrador y de las pruebas. */
  saved: JourneysSettings;
  canManage: boolean;
  /** Abre el diálogo de prueba con ese teléfono guardado. */
  onTest: (phone: string) => void;
}) {
  const [draft, setDraft] = useState<JourneysSettings>(() => clonar(saved));
  const [confirmMaster, setConfirmMaster] = useState(false);
  const update = useUpdateJourneySettings();

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const busy = update.isPending || !canManage;
  const savedPhones = new Set(saved.monitorRecipients.map((m) => m.phone));

  const patch = (p: Partial<JourneysSettings>) => setDraft((d) => ({ ...d, ...p }));
  const patchMonitor = (i: number, p: Partial<JourneyMonitorRecipient>) =>
    setDraft((d) => ({
      ...d,
      monitorRecipients: d.monitorRecipients.map((m, idx) => (idx === i ? { ...m, ...p } : m)),
    }));
  const removeMonitor = (i: number) =>
    setDraft((d) => ({ ...d, monitorRecipients: d.monitorRecipients.filter((_, idx) => idx !== i) }));
  const addMonitor = () =>
    setDraft((d) => ({ ...d, monitorRecipients: [...d.monitorRecipients, { name: '', phone: '' }] }));
  const patchCost = (key: keyof JourneyCosts, raw: string) => {
    const v = raw.trim() === '' ? null : Number(raw);
    setDraft((d) => ({ ...d, costs: { ...d.costs, [key]: v === null || Number.isFinite(v) ? v : d.costs[key] } }));
  };

  const onMasterChange = (v: boolean) => {
    if (v && !draft.enabled) {
      setConfirmMaster(true);
      return;
    }
    patch({ enabled: v });
  };

  const guardar = async () => {
    const errores = validarSettings(draft);
    if (errores.length) {
      toast.error(errores[0]);
      return;
    }
    try {
      await update.mutateAsync(payloadSettings(draft));
      toast.success('Configuración de recorridos guardada');
      onOpenChange(false);
    } catch (e) {
      toast.error(
        apiErrorMessage(e, 'No se pudo guardar la configuración.', {
          forbidden: 'Tu rol no puede cambiar la configuración de recorridos (permiso whatsapp:manage).',
          unavailable: 'Falta la migración 185 en la base: todavía no se puede guardar.',
          notFound: 'El API todavía no expone la configuración de recorridos (despliegue pendiente).',
        }),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !update.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Configuración de los recorridos</DialogTitle>
          <DialogDescription>
            Reglas que aplican a los 12 recorridos. Los cambios se guardan con el botón de abajo
            {!canManage ? '; tu rol solo puede consultarlas (permiso whatsapp:manage para editar)' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div
            className={cn(
              'rounded-md border p-3',
              draft.enabled
                ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/30'
                : 'border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/30',
            )}
          >
            <label className="flex items-start gap-3">
              <Switch checked={draft.enabled} onCheckedChange={onMasterChange} disabled={busy} className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium text-foreground">Interruptor maestro de recorridos</span>
                <span className="mt-1 flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                  <ExclamationTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Encendido, los recorridos que estén encendidos mandan WhatsApp reales sin intervención
                    (cada 5 minutos se revisa qué toca). Apagado, ningún recorrido manda nada aunque esté
                    encendido, ni en automático ni con &ldquo;Correr ahora&rdquo; (el API rechaza la
                    corrida manual); solo quedan las pruebas a monitores.
                  </span>
                </span>
              </span>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo label="Envíos desde (hora local)" hint="Hora local de la sucursal de cada persona.">
              <Input
                type="time"
                value={draft.quietStart}
                onChange={(e) => patch({ quietStart: e.target.value })}
                disabled={busy}
              />
            </Campo>
            <Campo label="Envíos hasta (hora local)">
              <Input type="time" value={draft.quietEnd} onChange={(e) => patch({ quietEnd: e.target.value })} disabled={busy} />
            </Campo>
            <Campo label="Tope global por hora" hint="Mensajes de todos los recorridos juntos.">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={draft.hourlyCap}
                onChange={(e) => patch({ hourlyCap: Number(e.target.value) })}
                disabled={busy}
              />
            </Campo>
            <Campo label="Ventana de atribución (días)" hint="Compras después del aviso que cuentan en el impacto.">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={60}
                value={draft.attributionDays}
                onChange={(e) => patch({ attributionDays: Number(e.target.value) })}
                disabled={busy}
              />
            </Campo>
          </div>

          <div className="rounded-md border p-3">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <DevicePhoneMobileIcon className="h-4 w-4 text-primary" />
                Números de monitoreo (corporativo)
                <span className="text-xs font-normal text-muted-foreground">
                  {draft.monitorRecipients.length}/{MAX_MONITORES}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addMonitor}
                disabled={busy || draft.monitorRecipients.length >= MAX_MONITORES}
              >
                <PlusIcon className="h-4 w-4" />
                Agregar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Reciben una copia del primer envío real de cada corrida de los recorridos fechados y son los
              únicos teléfonos a los que se puede mandar &ldquo;Probar a monitores&rdquo;. No cuentan en las
              métricas.
            </p>
            {draft.monitorRecipients.length === 0 ? (
              <p className="mt-3 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                Sin números de monitoreo.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-md border">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">#</th>
                      <th className="px-3 py-2 text-left font-medium">Nombre</th>
                      <th className="px-3 py-2 text-left font-medium">Teléfono (lada + número)</th>
                      <th className="px-3 py-2 text-left font-medium">Núm. distribuidor (opcional)</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {draft.monitorRecipients.map((m, i) => {
                      const phoneOk = E164_RE.test(m.phone);
                      const guardado = phoneOk && savedPhones.has(m.phone);
                      return (
                        <tr key={i} className="border-t align-top">
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2">
                            <Input
                              value={m.name}
                              maxLength={MAX_NAME}
                              onChange={(e) => patchMonitor(i, { name: e.target.value })}
                              placeholder="Nombre y apellido"
                              className="h-8 w-52"
                              disabled={busy}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <PhoneInput
                              value={m.phone}
                              onChange={(e164) => patchMonitor(i, { phone: e164 })}
                              disabled={busy}
                              showHint={false}
                              className="w-72"
                            />
                            {!!m.phone && !phoneOk && (
                              <p className="mt-1 text-[11px] text-destructive">Elige la lada y captura el número completo.</p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              inputMode="numeric"
                              value={m.customerNumber ?? ''}
                              onChange={(e) =>
                                patchMonitor(i, {
                                  customerNumber: e.target.value.replace(/\D/g, '').slice(0, MAX_CUSTOMER_NUMBER),
                                })
                              }
                              placeholder="Solo dígitos"
                              className="h-8 w-32 font-mono"
                              disabled={busy}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onTest(m.phone)}
                                disabled={!canManage || !guardado}
                                title={
                                  !phoneOk
                                    ? 'Elige la lada y captura el número completo'
                                    : !guardado
                                      ? 'Guarda la configuración para poder mandar la prueba a este número'
                                      : 'Mandar la plantilla de un recorrido a este celular'
                                }
                              >
                                <PaperAirplaneIcon className="h-4 w-4" />
                                Enviar prueba
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => removeMonitor(i)} disabled={busy} title="Quitar">
                                <TrashIcon className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-md border p-3">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">Tarifas por mensaje entregado (USD)</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDraft((d) => conValoresSugeridos(d))}
                disabled={busy}
                title={`Meta nov-2026: ${COSTO_LABELS.map((c) => `${c.label} ${TARIFAS_SUGERIDAS[c.key]}`).join(' · ')} · tipo de cambio ${FX_SUGERIDO}`}
              >
                Restablecer valores sugeridos
              </Button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Con ellas se calcula el costo del impacto: entregados × tarifa por categoría y país × tipo de
              cambio del periodo. Las cuatro tarifas son obligatorias (USD por mensaje entregado): sin
              alguna no se puede guardar.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {COSTO_LABELS.map((c) => (
                <Campo key={c.key} label={c.label} hint={`Sugerido: ${TARIFAS_SUGERIDAS[c.key]}`}>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.0001"
                    min={0}
                    value={draft.costs[c.key] ?? ''}
                    onChange={(e) => patchCost(c.key, e.target.value)}
                    disabled={busy}
                    placeholder={String(TARIFAS_SUGERIDAS[c.key])}
                    aria-invalid={draft.costs[c.key] == null || undefined}
                  />
                </Campo>
              ))}
              <Campo
                label="Tipo de cambio de respaldo (MXN por USD)"
                hint={`Solo si el periodo no tiene el suyo. Vacío conserva el valor guardado (sugerido: ${FX_SUGERIDO}).`}
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  placeholder={String(FX_SUGERIDO)}
                  value={draft.fxUsdMxnFallback ?? ''}
                  onChange={(e) => {
                    const v = e.target.value.trim() === '' ? null : Number(e.target.value);
                    patch({ fxUsdMxnFallback: v === null || Number.isFinite(v) ? v : draft.fxUsdMxnFallback });
                  }}
                  disabled={busy}
                />
              </Campo>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {dirty && <span className="mr-auto self-center text-xs text-amber-700 dark:text-amber-400">Cambios sin guardar</span>}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            {canManage ? 'Cancelar' : 'Cerrar'}
          </Button>
          {canManage && (
            <Button onClick={guardar} disabled={update.isPending || !dirty}>
              {update.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          )}
        </DialogFooter>

        <AlertDialog open={confirmMaster} onOpenChange={setConfirmMaster}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Encender el interruptor maestro?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>
                    Con el maestro encendido, los recorridos que estén encendidos mandan WhatsApp reales
                    a los distribuidores en su horario local ({draft.quietStart}–{draft.quietEnd}), con tope
                    de {n(draft.hourlyCap)} mensajes por hora. Las promociones (Marketing) solo salen a quien
                    aceptó recibirlas.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    El cambio queda en el borrador: después hay que pulsar &ldquo;Guardar&rdquo;.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className={cn(buttonVariants({ variant: 'destructive' }))}
                onClick={() => patch({ enabled: true })}
              >
                Encender
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
