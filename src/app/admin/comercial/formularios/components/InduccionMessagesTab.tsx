'use client';

// InduccionMessagesTab - Seccion "Mensajes": plantilla de invitacion (solo
// las APROBADAS en Meta) con vista previa del BODY real y las variables
// resueltas para el proximo taller, video del encabezado (path actual +
// subir nuevo), nota sobre la URL del boton de la plantilla y los numeros
// de monitoreo del corporativo (InduccionMonitorRecipients).

import { useMemo, useRef, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useUploadWhatsAppMedia } from '@/hooks/useInduction';
import type {
  InductionSettingsResponse,
  WhatsAppTemplate,
  WhatsAppTemplatesResponse,
} from '@/services/induction.service';
import type { SettingsTabProps } from './InduccionCampaignPanel';
import InduccionMonitorRecipients from './InduccionMonitorRecipients';
import {
  apiErrorInfo,
  apiErrorMessage,
  findComponent,
  findUrlButton,
  formatLongDateEs,
  formatTime12,
  nextWorkshopDate,
  REQUIRED_BUTTON_URL,
  resolveTemplateText,
} from './induccion-utils';

interface Props extends SettingsTabProps {
  /**
   * Configuracion GUARDADA (GET/PUT settings): la prueba de monitoreo solo
   * admite numeros ya guardados y el proximo taller lo calcula el API.
   */
  saved: InductionSettingsResponse;
  templatesQuery: UseQueryResult<WhatsAppTemplatesResponse>;
  approvedTemplates: WhatsAppTemplate[];
}

/** Nombre de muestra para {{1}} en la vista previa. */
const SAMPLE_NAME = 'María';
/** WhatsApp acepta video hasta 16 MB. */
const MAX_VIDEO_MB = 16;

export default function InduccionMessagesTab({
  draft,
  patch,
  save,
  saving,
  dirty,
  saved,
  templatesQuery,
  approvedTemplates,
}: Props) {
  const upload = useUploadWhatsAppMedia();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // GET /whatsapp/templates exige el permiso Comercial (igual que el resto de
  // la campana); un 403 aqui solo impide consultar/verificar plantillas.
  const templatesErrorInfo = templatesQuery.isError
    ? apiErrorInfo(
        templatesQuery.error,
        'No se pudieron consultar las plantillas de Meta.',
      )
    : null;
  const templatesError = templatesErrorInfo
    ? templatesErrorInfo.status === 403
      ? 'Tu rol no puede consultar las plantillas de Meta (requiere el permiso Comercial). La plantilla guardada se sigue usando.'
      : templatesErrorInfo.message
    : templatesQuery.data && !templatesQuery.data.success
      ? `Meta respondió con error: ${templatesQuery.data.error}`
      : null;
  // Solo con la lista REAL de Meta cargada se puede afirmar que una plantilla
  // no esta aprobada; si la consulta fallo, no se sabe.
  const templatesLoaded = templatesQuery.data?.success === true;

  // Si la plantilla guardada no esta entre las aprobadas, igual se lista
  // (marcada) para que el select no quede vacio y se vea el problema.
  const options = useMemo(() => {
    const list = [...approvedTemplates];
    if (
      draft.invitationTemplate &&
      !list.some((t) => t.name === draft.invitationTemplate)
    ) {
      list.push({
        name: draft.invitationTemplate,
        status: 'UNKNOWN',
        language: '',
        category: '',
      });
    }
    return list;
  }, [approvedTemplates, draft.invitationTemplate]);

  const selected = options.find((t) => t.name === draft.invitationTemplate);
  const selectedApproved =
    selected && (selected.status || '').toUpperCase() === 'APPROVED';

  const workshopDate = nextWorkshopDate(draft.workshopWeekday);
  const bodyParams = [
    SAMPLE_NAME,
    formatLongDateEs(workshopDate),
    formatTime12(draft.workshopTime),
  ];
  const header = findComponent(selected, 'HEADER');
  const body = findComponent(selected, 'BODY');
  const footer = findComponent(selected, 'FOOTER');
  const buttons = findComponent(selected, 'BUTTONS')?.buttons ?? [];
  const urlButton = findUrlButton(selected);
  const buttonPersonalized = !!urlButton?.url && /\{\{1\}\}/.test(urlButton.url);

  const onPickFile = (f: File | null) => {
    if (!f) {
      setPendingFile(null);
      return;
    }
    if (f.type !== 'video/mp4') {
      toast.error('El video debe ser MP4.');
      return;
    }
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`El video excede ${MAX_VIDEO_MB} MB (límite de WhatsApp).`);
      return;
    }
    setPendingFile(f);
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    try {
      const res = await upload.mutateAsync(pendingFile);
      if (!res?.path) throw new Error('El servidor no devolvió el path');
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = '';
      // Se guarda de inmediato para que el siguiente envio use el video nuevo;
      // save() ya avisa si el PUT fallo, aqui solo se distingue el resultado.
      const saved = await save({ invitationVideoPath: res.path });
      if (saved) {
        toast.success(`Video subido y configurado: ${res.path}`);
      } else {
        toast.warning(
          `El video se subió (${res.path}) pero no se pudo guardar la configuración; vuelve a pulsar Guardar.`,
        );
      }
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo subir el video'));
    }
  };

  return (
    <div className="space-y-5">
      {/* Plantilla */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Plantilla de invitación (aprobadas en Meta)
              </Label>
              <button
                type="button"
                onClick={() => templatesQuery.refetch()}
                className="inline-flex items-center gap-1 text-xs text-[#3E667D] hover:underline"
                disabled={templatesQuery.isFetching}
              >
                <ArrowPathIcon
                  className={`h-3.5 w-3.5 ${templatesQuery.isFetching ? 'animate-spin' : ''}`}
                />
                Actualizar
              </button>
            </div>
            {templatesQuery.isLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select
                value={draft.invitationTemplate}
                onValueChange={(v) => patch({ invitationTemplate: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una plantilla" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((t) => (
                    <SelectItem key={t.name} value={t.name}>
                      {t.name}
                      {t.language ? ` (${t.language})` : ''}
                      {(t.status || '').toUpperCase() !== 'APPROVED'
                        ? ' · no aprobada'
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {templatesError && (
              <p className="mt-1 text-xs text-red-600">{templatesError}</p>
            )}
            {!templatesError &&
              !templatesQuery.isLoading &&
              approvedTemplates.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  Meta no reporta plantillas aprobadas todavía.
                </p>
              )}
            {selected && !selectedApproved && templatesLoaded && (
              <p className="mt-1 text-xs text-amber-700">
                La plantilla guardada no aparece como aprobada en Meta; los
                envíos fallarán hasta que se apruebe.
              </p>
            )}
            {selected && !selectedApproved && !templatesLoaded && (
              <p className="mt-1 text-xs text-muted-foreground">
                No se pudo verificar la aprobación de la plantilla en Meta.
              </p>
            )}
          </div>

          {/* Video */}
          <div className="rounded-md border p-3">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-900">
              <VideoCameraIcon className="h-4 w-4 text-[#3E667D]" />
              Video del encabezado
            </div>
            <p className="break-all font-mono text-xs text-gray-700">
              {draft.invitationVideoPath || 'Sin video configurado'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Se guarda en Google Cloud Storage y se firma en cada envío. MP4,
              máximo {MAX_VIDEO_MB} MB. Subir un archivo con el mismo nombre lo
              reemplaza.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="video/mp4"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                className="block max-w-full text-xs text-gray-700 file:mr-2 file:rounded-md file:border file:border-input file:bg-background file:px-2 file:py-1 file:text-xs file:font-medium"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleUpload}
                disabled={!pendingFile || upload.isPending || saving}
              >
                {upload.isPending ? 'Subiendo…' : 'Subir video'}
              </Button>
            </div>
          </div>
        </div>

        {/* Vista previa */}
        <div>
          <Label className="mb-1 text-xs text-muted-foreground">
            Vista previa (próximo taller: {formatLongDateEs(workshopDate)})
          </Label>
          {!selected ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Selecciona una plantilla para ver el mensaje.
            </p>
          ) : !selected.components?.length ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              {templatesLoaded
                ? 'Meta no devolvió el contenido de esta plantilla.'
                : 'No se pudieron consultar las plantillas de Meta; la vista previa no está disponible.'}
            </p>
          ) : (
            <div className="rounded-lg bg-[#e5ddd5] p-3">
              <div className="max-w-md rounded-lg bg-white p-3 shadow-sm">
                {header && (
                  <div className="mb-2 rounded-md bg-gray-100 px-3 py-6 text-center text-xs text-muted-foreground">
                    {(header.format || 'TEXT').toUpperCase() === 'VIDEO'
                      ? 'Video del encabezado'
                      : header.text
                        ? resolveTemplateText(header.text, bodyParams)
                        : `Encabezado ${header.format ?? ''}`}
                  </div>
                )}
                {body?.text && (
                  <p className="whitespace-pre-wrap text-sm text-gray-900">
                    {resolveTemplateText(body.text, bodyParams)}
                  </p>
                )}
                {footer?.text && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {footer.text}
                  </p>
                )}
                {buttons.length > 0 && (
                  <div className="mt-2 space-y-1 border-t pt-2">
                    {buttons.map((b, i) => (
                      <div
                        key={`${b.type}-${i}`}
                        className="rounded-md py-1 text-center text-sm font-medium text-[#0A4B94]"
                      >
                        {b.text || b.type}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-2 text-[11px] text-gray-700">
                Variables: {'{{1}}'} nombre ({SAMPLE_NAME}), {'{{2}}'}{' '}
                {bodyParams[1]}, {'{{3}}'} {bodyParams[2]}.
              </p>
            </div>
          )}

          {/* Boton URL */}
          {selected && selected.components?.length ? (
            <div
              className={`mt-3 rounded-md border p-3 text-xs ${
                buttonPersonalized
                  ? 'border-emerald-200 bg-emerald-50/60'
                  : 'border-amber-200 bg-amber-50/60'
              }`}
            >
              <div className="mb-1 flex items-center gap-2">
                {buttonPersonalized ? (
                  <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ExclamationTriangleIcon className="h-4 w-4 text-amber-600" />
                )}
                <span className="font-medium text-gray-900">
                  Botón de la plantilla
                </span>
                {buttonPersonalized && (
                  <Badge variant="success">Enlace por distribuidor</Badge>
                )}
              </div>
              {urlButton ? (
                <p className="break-all font-mono text-gray-700">
                  {urlButton.text ? `${urlButton.text}: ` : ''}
                  {urlButton.url}
                </p>
              ) : (
                <p className="text-gray-700">La plantilla no tiene botón URL.</p>
              )}
              {!buttonPersonalized && (
                <p className="mt-1 text-amber-800">
                  Para que cada persona reciba su enlace, el botón debe apuntar
                  a <span className="font-mono">{REQUIRED_BUTTON_URL}</span> en
                  Meta. Mientras el botón sea estático, todos reciben el mismo
                  enlace y capturan su número en el formulario.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Numeros de monitoreo (corporativo) */}
      <InduccionMonitorRecipients
        recipients={draft.monitorRecipients ?? []}
        saved={saved.monitorRecipients ?? []}
        onChange={(monitorRecipients) => patch({ monitorRecipients })}
        dirty={dirty}
        disabled={saving}
        workshopDate={saved.nextWorkshop?.workshopDate || workshopDate}
      />

      <div className="flex items-center justify-end gap-3">
        {dirty && (
          <span className="text-xs text-amber-700">Cambios sin guardar</span>
        )}
        <Button onClick={() => save()} disabled={saving || !dirty}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}
