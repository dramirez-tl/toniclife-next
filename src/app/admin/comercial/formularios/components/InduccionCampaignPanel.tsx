'use client';

// InduccionCampaignPanel - Campana de WhatsApp del Taller de Induccion.
// Se monta en FormResponses SOLO para slug 'induccion', arriba de las
// metricas de respuestas. Secciones (pestanas): Taller, Mensajes,
// Recordatorios, Cohorte y Envios. Un solo borrador de configuracion
// (draft) compartido por las tres primeras; cada una tiene su boton Guardar
// que manda el borrador a PUT /marketing/induccion/settings (el servicio lo
// recorta a las 10 claves del DTO; el resto del GET es de solo lectura).

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  useInductionSettings,
  useUpdateInductionSettings,
  useWhatsAppTemplates,
} from '@/hooks/useInduction';
import { useMarketingFormConfig } from '@/hooks/useMarketingLeads';
import type {
  InductionSettings,
  WhatsAppTemplate,
} from '@/services/induction.service';
import {
  apiErrorInfo,
  apiErrorMessage,
  isApprovedTemplate,
  isValidHhmm,
  WEEKDAY_LABELS,
} from './induccion-utils';
import InduccionWorkshopTab from './InduccionWorkshopTab';
import InduccionMessagesTab from './InduccionMessagesTab';
import InduccionRemindersTab from './InduccionRemindersTab';
import InduccionCohortTab from './InduccionCohortTab';
import InduccionDeliveriesTab from './InduccionDeliveriesTab';

/** Props que comparten las pestanas de configuracion. */
export interface SettingsTabProps {
  draft: InductionSettings;
  patch: (partial: Partial<InductionSettings>) => void;
  /**
   * Guarda el borrador (opcionalmente con cambios extra aplicados al vuelo).
   * Devuelve true si el API lo guardo; false si fallo (ya mostro el toast).
   */
  save: (override?: Partial<InductionSettings>) => Promise<boolean>;
  saving: boolean;
  dirty: boolean;
}

const isWeekday = (n: unknown) =>
  typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 6;

/** Validacion local (espejo de la del API) para avisar antes del PUT. */
function validateSettings(s: InductionSettings): string[] {
  const problems: string[] = [];
  if (!isWeekday(s.workshopWeekday)) problems.push('El día del taller no es válido.');
  if (!isWeekday(s.cohortStartWeekday))
    problems.push('El día de inicio de la cohorte no es válido.');
  if (!isValidHhmm(s.workshopTime))
    problems.push('La hora del taller debe tener formato HH:MM.');
  if (!isValidHhmm(s.inviteDailyTime))
    problems.push('La hora del envío diario debe tener formato HH:MM.');
  if (!s.invitationTemplate?.trim())
    problems.push('Selecciona la plantilla de invitación.');
  s.reminders.forEach((r, i) => {
    if (!isWeekday(r.weekday))
      problems.push(`Recordatorio ${i + 1}: día de la semana inválido.`);
    if (!isValidHhmm(r.time))
      problems.push(`Recordatorio ${i + 1}: la hora debe tener formato HH:MM.`);
    if (!r.template?.trim())
      problems.push(`Recordatorio ${i + 1}: selecciona la plantilla.`);
  });
  return problems;
}

export default function InduccionCampaignPanel() {
  const {
    data: settings,
    isLoading,
    isError,
    error,
  } = useInductionSettings();
  const updateSettings = useUpdateInductionSettings();
  const templatesQuery = useWhatsAppTemplates(!!settings);
  // Enlace del taller: misma query (y cache) que la tarjeta de abajo.
  const { data: formConfig } = useMarketingFormConfig('induccion');

  // Borrador editable derivado en render: mientras NO haya cambios locales
  // se muestra lo guardado (un refetch no pisa lo que el usuario escribe);
  // con cambios (dirty) manda la copia local hasta guardar o descartar.
  const [localDraft, setLocalDraft] = useState<InductionSettings | null>(null);
  const [dirty, setDirty] = useState(false);
  const draft: InductionSettings | null =
    dirty && localDraft ? localDraft : (settings ?? null);

  // Fecha del taller seleccionada en la pestana Cohorte (undefined = la que
  // calcula el API: proximo dia del taller).
  const [workshopDate, setWorkshopDate] = useState<string | undefined>();

  const patch = (partial: Partial<InductionSettings>) => {
    if (!draft) return;
    setLocalDraft({ ...draft, ...partial });
    setDirty(true);
  };

  const save = async (override?: Partial<InductionSettings>): Promise<boolean> => {
    if (!draft) return false;
    const next = { ...draft, ...(override ?? {}) };
    const problems = validateSettings(next);
    if (problems.length) {
      toast.error(problems[0]);
      return false;
    }
    setLocalDraft(next);
    setDirty(true);
    try {
      await updateSettings.mutateAsync(next);
      // La respuesta del PUT ya quedo en cache (setQueryData): vuelve a mandar.
      setDirty(false);
      toast.success('Configuración del taller guardada');
      return true;
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo guardar la configuración'));
      return false;
    }
  };

  const approvedTemplates: WhatsAppTemplate[] = useMemo(
    () =>
      templatesQuery.data?.success
        ? templatesQuery.data.templates.filter(isApprovedTemplate)
        : [],
    [templatesQuery.data],
  );

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (isError || !settings) {
    const info = apiErrorInfo(
      error,
      'No se pudo cargar la campaña de WhatsApp del taller.',
    );
    return (
      <Card>
        <CardContent className="p-5">
          <PanelHeading autoEnabled={false} />
          <p className="mt-3 text-sm font-medium text-red-600">{info.message}</p>
        </CardContent>
      </Card>
    );
  }

  const tabProps: SettingsTabProps | null = draft
    ? { draft, patch, save, saving: updateSettings.isPending, dirty }
    : null;

  return (
    <Card>
      <CardContent className="p-5">
        <PanelHeading
          autoEnabled={settings.autoEnabled}
          summary={`${WEEKDAY_LABELS[settings.workshopWeekday] ?? '?'} ${settings.workshopTime}`}
        />
        <Tabs defaultValue="taller" className="mt-4">
          <div className="overflow-x-auto">
            <TabsList>
              <TabsTrigger value="taller">Taller</TabsTrigger>
              <TabsTrigger value="mensajes">Mensajes</TabsTrigger>
              <TabsTrigger value="recordatorios">
                Recordatorios
                {settings.reminders.length > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({settings.reminders.length})
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="cohorte">Cohorte</TabsTrigger>
              <TabsTrigger value="envios">Envíos</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="taller" className="mt-4">
            {tabProps ? (
              <InduccionWorkshopTab
                {...tabProps}
                meetingUrl={formConfig?.meetingUrl ?? null}
              />
            ) : (
              <Skeleton className="h-40 w-full" />
            )}
          </TabsContent>

          <TabsContent value="mensajes" className="mt-4">
            {tabProps ? (
              <InduccionMessagesTab
                {...tabProps}
                templatesQuery={templatesQuery}
                approvedTemplates={approvedTemplates}
              />
            ) : (
              <Skeleton className="h-40 w-full" />
            )}
          </TabsContent>

          <TabsContent value="recordatorios" className="mt-4">
            {tabProps ? (
              <InduccionRemindersTab
                {...tabProps}
                approvedTemplates={approvedTemplates}
              />
            ) : (
              <Skeleton className="h-40 w-full" />
            )}
          </TabsContent>

          <TabsContent value="cohorte" className="mt-4">
            <InduccionCohortTab
              settings={settings}
              workshopDate={workshopDate}
              onWorkshopDateChange={setWorkshopDate}
            />
          </TabsContent>

          <TabsContent value="envios" className="mt-4">
            <InduccionDeliveriesTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PanelHeading({
  autoEnabled,
  summary,
}: {
  autoEnabled: boolean;
  summary?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <ChatBubbleLeftRightIcon className="h-5 w-5 text-[#3E667D]" />
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Campaña de WhatsApp del Taller de Inducción
          </p>
          <p className="text-xs text-muted-foreground">
            Invitación y recordatorios a los distribuidores nuevos de la semana
            {summary ? ` · taller cada ${summary} (CDMX)` : ''}.
          </p>
        </div>
      </div>
      <Badge
        variant="outline"
        className={
          autoEnabled
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-amber-200 bg-amber-50 text-amber-700'
        }
      >
        Envíos automáticos: {autoEnabled ? 'activados' : 'apagados'}
      </Badge>
    </div>
  );
}
