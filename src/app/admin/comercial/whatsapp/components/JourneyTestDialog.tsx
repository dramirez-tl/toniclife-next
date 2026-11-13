'use client';

// JourneyTestDialog - "Probar a monitores": manda la plantilla de un recorrido
// a uno de los números de monitoreo GUARDADOS en la configuración
// (POST /whatsapp/journeys/:code/test, permiso whatsapp:manage, 5 por
// minuto). Sale como mensaje manual con las variables reales del periodo: no
// cuenta en las métricas del recorrido. El API rechaza teléfonos que no estén
// guardados, así que el selector solo ofrece los guardados.
//
// Se monta solo mientras está abierto (el padre lo renderiza condicionalmente),
// así el estado inicial sale de las props sin efectos.

import { useState } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTestJourney } from '@/hooks/useWhatsAppJourneys';
import { apiErrorMessage } from '@/lib/api-error';
import { telefonosDePrueba } from '@/lib/whatsapp-campaign/recorridos';
import type { JourneyItem, JourneyMonitorRecipient, JourneyTestResult } from '@/types/whatsappJourneys';

export function JourneyTestDialog({
  open,
  onOpenChange,
  journeys,
  monitors,
  initialCode = null,
  initialPhone = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journeys: Pick<JourneyItem, 'code' | 'name' | 'templateName'>[];
  /** Lista GUARDADA de monitores (la del GET). */
  monitors: JourneyMonitorRecipient[];
  initialCode?: string | null;
  initialPhone?: string | null;
}) {
  const disponibles = telefonosDePrueba(monitors);
  const [code, setCode] = useState<string>(initialCode ?? journeys[0]?.code ?? '');
  const [phone, setPhone] = useState<string>(initialPhone ?? disponibles[0]?.phone ?? '');
  const [result, setResult] = useState<JourneyTestResult | null>(null);
  const test = useTestJourney();

  const journey = journeys.find((j) => j.code === code);
  const monitor = disponibles.find((m) => m.phone === phone);

  const enviar = async () => {
    if (!code || !phone) return;
    setResult(null);
    try {
      const r = await test.mutateAsync({ code, phone });
      setResult(r);
      if (r.success) toast.success(`Prueba de ${code} enviada a ${monitor?.name || phone}.`);
      else toast.error(`La prueba de ${code} no salió${r.errorCode ? ` (${r.errorCode})` : ''}.`);
    } catch (e) {
      toast.error(
        apiErrorMessage(e, 'No se pudo enviar la prueba.', {
          forbidden: 'Tu rol no puede mandar pruebas (permiso whatsapp:manage).',
          unavailable: 'Falta la migración 185 en la base: todavía no se pueden mandar pruebas.',
          notFound: 'El API todavía no expone la prueba de recorridos (despliegue pendiente).',
        }),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !test.isPending && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Probar a monitores</DialogTitle>
          <DialogDescription>
            Se enviará un WhatsApp real con la plantilla del recorrido y las variables del periodo en
            curso (o de ejemplo) a un número de monitoreo guardado. Sale como mensaje manual: no
            cuenta en las métricas y se puede repetir (máximo 5 por minuto). En J8 llega un mensaje
            por cada promoción de Temporadas a la vista: la de hoy y la que sigue.
          </DialogDescription>
        </DialogHeader>

        {disponibles.length === 0 ? (
          <p className="rounded-md border border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
            No hay números de monitoreo guardados. Agrégalos en &ldquo;Configuración&rdquo; y guarda
            antes de mandar una prueba.
          </p>
        ) : (
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Recorrido</Label>
              <Select value={code} onValueChange={setCode}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegir recorrido" />
                </SelectTrigger>
                <SelectContent>
                  {journeys.map((j) => (
                    <SelectItem key={j.code} value={j.code}>
                      {j.code} · {j.name}
                      {j.templateName ? ` (${j.templateName})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Número de monitoreo (guardado)</Label>
              <Select value={phone} onValueChange={setPhone}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegir monitor" />
                </SelectTrigger>
                <SelectContent>
                  {disponibles.map((m) => (
                    <SelectItem key={m.phone} value={m.phone}>
                      {m.name || 'Sin nombre'} · <span className="font-mono">{m.phone}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {result && (
              <div
                className={
                  result.success
                    ? 'rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : 'rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive'
                }
              >
                {result.success ? (
                  <>
                    Enviada. Meta la aceptó
                    {result.wamid ? ' y asignó identificador' : ''}; revisa el celular y la bitácora del
                    recorrido.
                  </>
                ) : (
                  <>
                    No salió{result.errorCode ? ` (${result.errorCode})` : ''}
                    {result.error ? `: ${result.error}` : '.'}
                  </>
                )}
                {result.messages.length > 0 && (
                  <ul className="mt-1.5 list-disc pl-5 text-xs">
                    {result.messages.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={test.isPending}>
            Cerrar
          </Button>
          <Button onClick={enviar} disabled={test.isPending || !journey || !monitor}>
            <PaperAirplaneIcon className="h-4 w-4" />
            {test.isPending ? 'Enviando…' : 'Enviar prueba'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
