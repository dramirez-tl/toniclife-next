'use client';

// InduccionMonitorRecipients - Seccion "Numeros de monitoreo (corporativo)"
// de la pestana Mensajes: lista editable (nombre, telefono E.164 y numero de
// distribuidor opcional) de celulares del corporativo que reciben una copia
// de cada invitacion y recordatorio que sale a la cohorte (campaignKind
// 'induccion_monitor', una vez por envio gracias a la unique telefono+kind+
// key). Se guarda con el PUT de settings (boton Guardar de la pestana).
// "Enviar prueba" manda la invitacion del proximo taller a ese telefono como
// mensaje 'manual' (POST /marketing/induccion/monitor-test), repetible; solo
// admite numeros YA GUARDADOS (el API responde 400 si no), asi que el boton
// se habilita cuando el telefono de la fila coincide con uno guardado.

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useSendMonitorTest } from '@/hooks/useInduction';
import {
  MAX_MONITOR_RECIPIENTS,
  type InductionMonitorRecipient,
} from '@/services/induction.service';
import {
  apiErrorMessage,
  digitsOnly,
  firstName,
  formatLongDateEs,
  isValidE164,
  normalizeE164,
} from './induccion-utils';

interface Props {
  recipients: InductionMonitorRecipient[];
  /** Lista GUARDADA en el API: solo a esos telefonos se puede mandar prueba. */
  saved: InductionMonitorRecipient[];
  onChange: (next: InductionMonitorRecipient[]) => void;
  /** Hay cambios sin guardar en el borrador (la prueba usa lo GUARDADO). */
  dirty: boolean;
  disabled?: boolean;
  /** Proximo taller (YYYY-MM-DD, el que calcula el API) para el dialogo de prueba. */
  workshopDate: string;
}

const MAX_NAME = 80;
const MAX_CUSTOMER_NUMBER = 12;

export default function InduccionMonitorRecipients({
  recipients,
  saved,
  onChange,
  dirty,
  disabled = false,
  workshopDate,
}: Props) {
  const sendTest = useSendMonitorTest();
  const [testTarget, setTestTarget] =
    useState<InductionMonitorRecipient | null>(null);

  // El API solo manda pruebas a telefonos guardados: {{1}} y el boton salen
  // del registro guardado, no de lo tecleado en la fila.
  const savedByPhone = useMemo(
    () => new Map(saved.map((m) => [normalizeE164(m.phone), m])),
    [saved],
  );

  const update = (i: number, partial: Partial<InductionMonitorRecipient>) =>
    onChange(
      recipients.map((r, idx) => (idx === i ? { ...r, ...partial } : r)),
    );
  const remove = (i: number) =>
    onChange(recipients.filter((_, idx) => idx !== i));
  const add = () => onChange([...recipients, { name: '', phone: '' }]);

  const runTest = async () => {
    if (!testTarget) return;
    const phone = normalizeE164(testTarget.phone);
    try {
      const res = await sendTest.mutateAsync({ phone });
      const failed = res.success === false || res.result === 'failed';
      if (failed) {
        const why = res.error || res.reason;
        toast.error(
          `No se pudo enviar la prueba a ${phone}${why ? `: ${why}` : ''}`,
        );
      } else {
        toast.success(
          `Prueba enviada a ${phone}. Revisa el celular y la pestaña Envíos (tipo Manual).`,
        );
      }
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo enviar la prueba'));
    } finally {
      setTestTarget(null);
    }
  };

  const busy = disabled || sendTest.isPending;

  return (
    <div className="rounded-md border p-3">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <DevicePhoneMobileIcon className="h-4 w-4 text-[#3E667D]" />
          Números de monitoreo (corporativo)
          <span className="text-xs font-normal text-muted-foreground">
            {recipients.length}/{MAX_MONITOR_RECIPIENTS}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={add}
          disabled={busy || recipients.length >= MAX_MONITOR_RECIPIENTS}
          title={
            recipients.length >= MAX_MONITOR_RECIPIENTS
              ? `Máximo ${MAX_MONITOR_RECIPIENTS} números`
              : undefined
          }
        >
          <PlusIcon className="h-4 w-4" />
          Agregar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Reciben una copia de cada invitación y recordatorio que salga a la
        cohorte, una sola vez por envío. No cuentan en las métricas de la
        cohorte.
      </p>

      {recipients.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          Sin números de monitoreo. Agrega los celulares del corporativo que
          deban recibir copia.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-md border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">Nombre</th>
                <th className="px-3 py-2 text-left font-medium">
                  Teléfono (E.164)
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  Núm. distribuidor (opcional)
                </th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {recipients.map((r, i) => {
                const phoneOk = isValidE164(r.phone);
                const phoneInvalid = !!r.phone && !phoneOk;
                const savedRow = phoneOk
                  ? savedByPhone.get(normalizeE164(r.phone))
                  : undefined;
                const testTitle = !phoneOk
                  ? 'Captura un teléfono E.164 válido'
                  : !savedRow
                    ? 'Guarda la configuración para poder enviar la prueba a este número'
                    : 'Manda la invitación del próximo taller a este celular (con el nombre y número guardados)';
                return (
                  <tr key={i} className="border-t align-top">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2">
                      <Input
                        value={r.name}
                        maxLength={MAX_NAME}
                        onChange={(e) => update(i, { name: e.target.value })}
                        placeholder="Nombre y apellido"
                        className="h-8 w-56"
                        disabled={busy}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="tel"
                        inputMode="tel"
                        value={r.phone}
                        onChange={(e) =>
                          update(i, { phone: normalizeE164(e.target.value) })
                        }
                        placeholder="+52 477 581 3450"
                        className={`h-8 w-44 font-mono ${
                          phoneInvalid ? 'border-red-400' : ''
                        }`}
                        aria-invalid={phoneInvalid}
                        disabled={busy}
                      />
                      {phoneInvalid && (
                        <p className="mt-1 text-[11px] text-red-600">
                          + y de 11 a 15 dígitos.
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        inputMode="numeric"
                        value={r.customerNumber ?? ''}
                        onChange={(e) =>
                          update(i, {
                            customerNumber: digitsOnly(e.target.value).slice(
                              0,
                              MAX_CUSTOMER_NUMBER,
                            ),
                          })
                        }
                        placeholder="Solo dígitos"
                        className="h-8 w-36 font-mono"
                        disabled={busy}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => savedRow && setTestTarget(savedRow)}
                          disabled={busy || !savedRow}
                          title={testTitle}
                        >
                          <PaperAirplaneIcon className="h-4 w-4" />
                          Enviar prueba
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(i)}
                          disabled={busy}
                          title="Quitar"
                        >
                          <TrashIcon className="h-4 w-4 text-red-600" />
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

      <p className="mt-2 text-[11px] text-muted-foreground">
        La copia usa la misma plantilla, video y datos del taller que el envío
        real; {'{{1}}'} lleva el primer nombre del monitor y el botón su número
        de distribuidor (o 0 si no tiene). Solo los envíos por lote (botón
        &ldquo;Enviar invitaciones a los pendientes&rdquo;, recordatorios y el
        cron) que manden al menos un mensaje real generan copia; los reenvíos
        individuales y las corridas sin envíos no. Requiere la migración 132
        en la base; sin ella las copias se omiten y los envíos reales no se
        afectan.
      </p>

      {/* Dialogo de confirmacion de la prueba */}
      <Dialog
        open={testTarget !== null}
        onOpenChange={(o) => !o && !sendTest.isPending && setTestTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar prueba de monitoreo</DialogTitle>
            <DialogDescription>
              Se enviará un WhatsApp real con la invitación del taller del{' '}
              {formatLongDateEs(workshopDate)} al{' '}
              <span className="font-mono">
                {normalizeE164(testTarget?.phone ?? '')}
              </span>
              {testTarget?.name ? ` (${firstName(testTarget.name)})` : ''}.
              Sale como mensaje manual: no cuenta en la cohorte y se puede
              repetir.
            </DialogDescription>
          </DialogHeader>
          {dirty && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Tienes cambios sin guardar. La prueba usa la configuración
                guardada (plantilla, video, nombre y número de distribuidor
                del monitor); lo que acabas de editar no se refleja hasta
                guardar.
              </span>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTestTarget(null)}
              disabled={sendTest.isPending}
            >
              Cancelar
            </Button>
            <Button onClick={runTest} disabled={sendTest.isPending || !testTarget}>
              {sendTest.isPending ? 'Enviando…' : 'Enviar prueba'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
