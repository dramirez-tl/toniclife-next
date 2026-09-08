'use client';

// InduccionWorkshopTab - Seccion "Taller": dia y hora del taller, inicio de
// la cohorte, filtros de elegibilidad, interruptor de envios automaticos y
// hora del envio diario. El enlace del taller se muestra de solo lectura: se
// edita en la tarjeta "Enlace del Taller de Induccion" que ya existe abajo.

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import type { SettingsTabProps } from './InduccionCampaignPanel';
import {
  addDays,
  formatLongDateYearEs,
  formatTime12,
  nextWorkshopDate,
  WEEKDAY_LABELS,
  WEEKDAY_OPTIONS,
} from './induccion-utils';

interface Props extends SettingsTabProps {
  meetingUrl: string | null;
}

export default function InduccionWorkshopTab({
  draft,
  patch,
  save,
  saving,
  dirty,
  meetingUrl,
}: Props) {
  const nextDate = nextWorkshopDate(draft.workshopWeekday);
  // La cohorte va del dia de inicio (semana anterior) al dia del taller. Si
  // ambos dias coinciden son 6 dias atras (ventana de 7 dias inclusive), igual
  // que cohortStartFor en el API; con 7 el dia del taller anterior entraria
  // en dos cohortes.
  const back = (draft.workshopWeekday - draft.cohortStartWeekday + 7) % 7 || 6;
  const cohortStart = addDays(nextDate, -back);

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-[#3E667D]/20 bg-[#3E667D]/5 p-3 text-sm">
        <div className="flex items-center gap-2 font-medium text-gray-900">
          <CalendarDaysIcon className="h-4 w-4 text-[#3E667D]" />
          Próximo taller: {formatLongDateYearEs(nextDate)},{' '}
          {formatTime12(draft.workshopTime)} (CDMX)
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Cohorte: altas del {formatLongDateYearEs(cohortStart)} al{' '}
          {formatLongDateYearEs(nextDate)} (inclusive).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label className="mb-1 text-xs text-muted-foreground">
            Día del taller
          </Label>
          <Select
            value={String(draft.workshopWeekday)}
            onValueChange={(v) => patch({ workshopWeekday: Number(v) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 text-xs text-muted-foreground">
            Hora del taller (CDMX)
          </Label>
          <Input
            type="time"
            value={draft.workshopTime}
            onChange={(e) => patch({ workshopTime: e.target.value })}
          />
        </div>
        <div>
          <Label className="mb-1 text-xs text-muted-foreground">
            Inicio de la cohorte
          </Label>
          <Select
            value={String(draft.cohortStartWeekday)}
            onValueChange={(v) => patch({ cohortStartWeekday: Number(v) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label} anterior
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 text-xs text-muted-foreground">
            Hora del envío diario de invitaciones
          </Label>
          <Input
            type="time"
            value={draft.inviteDailyTime}
            onChange={(e) => patch({ inviteDailyTime: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-md border p-3">
          <Switch
            checked={draft.requireKit}
            onCheckedChange={(v) => patch({ requireKit: v })}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium text-gray-900">
              Solo altas con kit
            </span>
            <span className="block text-xs text-muted-foreground">
              Sin kit la inscripción no es válida; no se invita.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-md border p-3">
          <Switch
            checked={draft.includePreferred}
            onCheckedChange={(v) => patch({ includePreferred: v })}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium text-gray-900">
              Incluir clientes preferentes
            </span>
            <span className="block text-xs text-muted-foreground">
              Por defecto solo se invita a distribuidores.
            </span>
          </span>
        </label>
      </div>

      <label
        className={`flex items-start gap-3 rounded-md border p-3 ${
          draft.autoEnabled
            ? 'border-emerald-200 bg-emerald-50/60'
            : 'border-amber-200 bg-amber-50/60'
        }`}
      >
        <Switch
          checked={draft.autoEnabled}
          onCheckedChange={(v) => patch({ autoEnabled: v })}
          className="mt-0.5"
        />
        <span>
          <span className="block text-sm font-medium text-gray-900">
            Envíos automáticos
          </span>
          <span className="mt-1 flex items-start gap-1.5 text-xs text-amber-800">
            <ExclamationTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Con esto activado el sistema manda mensajes de WhatsApp reales
              sin intervención: la invitación todos los días a las{' '}
              {draft.inviteDailyTime} a los nuevos de la cohorte y los
              recordatorios programados (máximo 500 envíos por corrida). Apagado,
              solo se envía desde la pestaña Cohorte.
            </span>
          </span>
        </span>
      </label>

      <div className="rounded-md border p-3">
        <div className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-900">
          <LinkIcon className="h-4 w-4 text-[#3E667D]" />
          Enlace del taller
        </div>
        {meetingUrl ? (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-sm text-[#0A4B94] hover:underline"
          >
            {meetingUrl}
          </a>
        ) : (
          <p className="text-sm text-amber-700">
            Sin enlace configurado: quien complete el formulario verá un aviso
            de &ldquo;se publicará pronto&rdquo;.
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Se edita en la tarjeta &ldquo;Enlace del Taller de Inducción&rdquo;,
          más abajo en esta misma pestaña. El botón de la plantilla de WhatsApp
          lleva al formulario /induccion, que a su vez manda a este enlace.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3">
        {dirty && (
          <span className="text-xs text-amber-700">Cambios sin guardar</span>
        )}
        <Button onClick={() => save()} disabled={saving || !dirty}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Cohorte del taller del {WEEKDAY_LABELS[draft.workshopWeekday]}: altas
        desde el {WEEKDAY_LABELS[draft.cohortStartWeekday]} anterior hasta el
        mismo día del taller. La fecha de alta viene de la inscripción en el
        sistema anterior (registration_date), no de la fecha de sincronización.
      </p>
    </div>
  );
}
