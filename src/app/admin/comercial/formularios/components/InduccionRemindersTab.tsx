'use client';

// InduccionRemindersTab - Seccion "Recordatorios": lista editable de
// (dia de la semana, hora, plantilla) que el cron dispara si los envios
// automaticos estan activados. Cada recordatorio se manda una sola vez por
// cliente y taller (campaign_key '<taller>#rec-<dia>-<HHMM>').

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BellAlertIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import type {
  InductionReminder,
  WhatsAppTemplate,
} from '@/services/induction.service';
import type { SettingsTabProps } from './InduccionCampaignPanel';
import {
  formatLongDateEs,
  formatTime12,
  nextWorkshopDate,
  reminderDate,
  reminderKey,
  WEEKDAY_OPTIONS,
} from './induccion-utils';

interface Props extends SettingsTabProps {
  approvedTemplates: WhatsAppTemplate[];
}

const MAX_REMINDERS = 6;

export default function InduccionRemindersTab({
  draft,
  patch,
  save,
  saving,
  dirty,
  approvedTemplates,
}: Props) {
  const workshopDate = nextWorkshopDate(draft.workshopWeekday);

  const update = (i: number, partial: Partial<InductionReminder>) => {
    const reminders = draft.reminders.map((r, idx) =>
      idx === i ? { ...r, ...partial } : r,
    );
    patch({ reminders });
  };
  const remove = (i: number) =>
    patch({ reminders: draft.reminders.filter((_, idx) => idx !== i) });
  const add = () =>
    patch({
      reminders: [
        ...draft.reminders,
        {
          weekday: draft.cohortStartWeekday,
          time: '14:00',
          template: draft.invitationTemplate,
        },
      ],
    });

  const templateOptions = (current: string) => {
    const list = approvedTemplates.map((t) => t.name);
    if (current && !list.includes(current)) list.push(current);
    return list;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Los recordatorios se envían solo a quienes ya recibieron la invitación
        (no fallida) y aún no han recibido ese recordatorio. La hora es de
        Ciudad de México.
      </p>

      {!draft.autoEnabled && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Los envíos automáticos están apagados (pestaña Taller): estos
            recordatorios no saldrán solos. Puedes mandarlos a mano con
            &ldquo;Enviar recordatorio ahora&rdquo; en la pestaña Cohorte.
          </span>
        </div>
      )}

      {draft.reminders.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          Sin recordatorios configurados.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">Día</th>
                <th className="px-3 py-2 text-left font-medium">Hora</th>
                <th className="px-3 py-2 text-left font-medium">Plantilla</th>
                <th className="px-3 py-2 text-left font-medium">
                  Próximo envío
                </th>
                <th className="px-3 py-2 text-left font-medium">Clave</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {draft.reminders.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2">
                    <Select
                      value={String(r.weekday)}
                      onValueChange={(v) => update(i, { weekday: Number(v) })}
                    >
                      <SelectTrigger size="sm" className="w-36">
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
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="time"
                      value={r.time}
                      onChange={(e) => update(i, { time: e.target.value })}
                      className="h-8 w-32"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={r.template}
                      onValueChange={(v) => update(i, { template: v })}
                    >
                      <SelectTrigger size="sm" className="w-64 max-w-full">
                        <SelectValue placeholder="Plantilla" />
                      </SelectTrigger>
                      <SelectContent>
                        {templateOptions(r.template).map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {formatLongDateEs(reminderDate(workshopDate, r))},{' '}
                    {formatTime12(r.time)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {reminderKey(workshopDate, r)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(i)}
                      title="Quitar recordatorio"
                    >
                      <TrashIcon className="h-4 w-4 text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={add}
          disabled={draft.reminders.length >= MAX_REMINDERS}
        >
          <PlusIcon className="h-4 w-4" />
          Agregar recordatorio
        </Button>
        <div className="flex items-center gap-3">
          {dirty && (
            <span className="text-xs text-amber-700">Cambios sin guardar</span>
          )}
          <Button onClick={() => save()} disabled={saving || !dirty}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <BellAlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Sugerencia: miércoles 14:00, sábado 14:00 y el mismo día del taller a
        las 14:00. El recordatorio del día del taller cae en la fecha del
        taller; los demás en la semana previa.
      </p>
    </div>
  );
}
