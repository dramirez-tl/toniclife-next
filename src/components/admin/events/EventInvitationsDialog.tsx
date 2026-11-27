'use client';

// EventInvitationsDialog - Envío masivo de las invitaciones de un evento
// privado, eligiendo el canal (correo y/o WhatsApp) y a quién (toda la lista,
// un tipo de acceso o los seleccionados).
//
// Primero la REVISIÓN (no manda nada: dice a cuántos les saldría por cada canal
// y a cuántos no, y por qué) y después el envío, en tandas con su avance. Se
// puede detener: lo que ya salió queda registrado y al repetir el envío solo
// sale lo que falta.

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useInvitationPreview,
  useRefreshGuestList,
  useSendInvitationBatch,
} from '@/hooks/useEventInvitations';
import { eventErrorMessage } from '@/lib/events/format';
import {
  addBatch,
  chunkIds,
  emptyProgress,
  progressPercent,
  resultSummary,
  sendSummary,
  sendableChannels,
  type SendProgress,
} from '@/lib/events/invitations';
import type { EventDto } from '@/types/events';
import {
  INVITATION_BATCH_SIZE,
  INVITATION_CHANNEL_LABEL,
  type InvitationChannel,
  type InvitationChannelPreview,
  type InvitationPreview,
} from '@/types/event-invitations';

type Scope = 'all' | 'access' | 'selected';

interface Props {
  event: EventDto;
  /** Invitados marcados en la lista (se ofrece mandarles solo a ellos). */
  selectedIds: string[];
  accessTypes: string[];
  totalGuests: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const n = (v: number) => v.toLocaleString('es-MX');

export function EventInvitationsDialog({ event, selectedIds, accessTypes, totalGuests, open, onOpenChange }: Props) {
  // Mientras se está enviando no se cierra por accidente (clic fuera o Esc).
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => (busy && !o ? undefined : onOpenChange(o))}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        {open && (
          <Body
            event={event}
            selectedIds={selectedIds}
            accessTypes={accessTypes}
            totalGuests={totalGuests}
            onBusy={setBusy}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Body({
  event,
  selectedIds,
  accessTypes,
  totalGuests,
  onBusy,
  onClose,
}: Omit<Props, 'open' | 'onOpenChange'> & { onBusy: (busy: boolean) => void; onClose: () => void }) {
  const [scope, setScope] = useState<Scope>(selectedIds.length > 0 ? 'selected' : 'all');
  const [accessType, setAccessType] = useState(accessTypes[0] ?? '');
  const [email, setEmail] = useState(true);
  const [whatsapp, setWhatsapp] = useState(true);
  const [resend, setResend] = useState(false);
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'setup' | 'sending' | 'done'>('setup');
  const [progress, setProgress] = useState<SendProgress>(emptyProgress(0));
  const [sendError, setSendError] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);
  const stopRef = useRef(false);
  const requestRef = useRef(0);

  const previewMutation = useInvitationPreview(event.id);
  const sendMutation = useSendInvitationBatch(event.id);
  const refreshList = useRefreshGuestList(event.id);
  const { mutateAsync: requestPreview } = previewMutation;

  const channels = useMemo<InvitationChannel[]>(
    () => [...(email ? (['email'] as const) : []), ...(whatsapp ? (['whatsapp'] as const) : [])],
    [email, whatsapp],
  );

  // La revisión se pide sola cada vez que cambian las opciones. Solo cuenta la
  // respuesta de la última petición (las anteriores se descartan).
  useEffect(() => {
    if (phase !== 'setup') return;
    if (channels.length === 0 || (scope === 'access' && !accessType)) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    const request = ++requestRef.current;
    setPreviewError(null);
    requestPreview({
      channels,
      guestIds: scope === 'selected' ? selectedIds : undefined,
      accessType: scope === 'access' ? accessType : undefined,
      resend,
    })
      .then((data) => {
        if (request === requestRef.current) setPreview(data);
      })
      .catch((e) => {
        if (request !== requestRef.current) return;
        setPreview(null);
        setPreviewError(eventErrorMessage(e, 'No se pudo revisar el envío.'));
      });
  }, [phase, channels, scope, accessType, resend, selectedIds, requestPreview]);

  const canChannels = sendableChannels(preview, channels);
  const summary = sendSummary(preview, channels);
  const loadingPreview = previewMutation.isPending;
  const canSend = phase === 'setup' && !loadingPreview && canChannels.length > 0 && (preview?.guestIds.length ?? 0) > 0;

  const handleSend = async () => {
    if (!preview || canChannels.length === 0) return;
    const ids = preview.guestIds;
    stopRef.current = false;
    setStopped(false);
    setSendError(null);
    setPhase('sending');
    onBusy(true);
    let acc = emptyProgress(ids.length);
    setProgress(acc);
    try {
      for (const chunk of chunkIds(ids, INVITATION_BATCH_SIZE)) {
        if (stopRef.current) break;
        const result = await sendMutation.mutateAsync({ channels: canChannels, guestIds: chunk, resend });
        acc = addBatch(acc, result);
        setProgress(acc);
      }
    } catch (e) {
      setSendError(eventErrorMessage(e, 'El envío se interrumpió.'));
    } finally {
      onBusy(false);
      setStopped(stopRef.current);
      setPhase('done');
      refreshList();
    }
    const failed = acc.emailFailed + acc.whatsappFailed;
    if (failed > 0) toast.warning(resultSummary(acc));
    else if (acc.emailSent + acc.whatsappSent > 0) toast.success(resultSummary(acc));
  };

  if (phase !== 'setup') {
    const sending = phase === 'sending';
    const pending = progress.total - progress.done;
    return (
      <>
        <DialogHeader>
          <DialogTitle>{sending ? 'Enviando invitaciones…' : 'Envío terminado'}</DialogTitle>
          <DialogDescription>
            {sending
              ? 'No cierres esta ventana. Si la detienes, lo que ya salió queda registrado.'
              : `${event.name}: así quedó el envío.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm text-gray-600">
              <span>
                {n(progress.done)} de {n(progress.total)} invitados
              </span>
              <span className="tabular-nums">{progressPercent(progress)} %</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#3E667D] transition-all"
                style={{ width: `${progressPercent(progress)}%` }}
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {canChannels.map((c) => {
              const sent = c === 'email' ? progress.emailSent : progress.whatsappSent;
              const failed = c === 'email' ? progress.emailFailed : progress.whatsappFailed;
              return (
                <div key={c} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                  <p className="font-medium text-gray-900">{INVITATION_CHANNEL_LABEL[c]}</p>
                  <p className="text-emerald-700">{n(sent)} enviadas</p>
                  {failed > 0 && <p className="text-red-700">{n(failed)} fallaron</p>}
                </div>
              );
            })}
          </div>
          {!sending && (
            <div className="space-y-2 text-sm">
              <p className="flex items-start gap-2 text-gray-700">
                <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                {resultSummary(progress)}.
              </p>
              {(stopped || sendError) && pending > 0 && (
                <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                  <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>
                    {sendError ?? 'Detuviste el envío.'} Faltaron {n(pending)} invitados: vuelve a abrir “Enviar
                    invitaciones” y solo saldrá lo que falta.
                  </span>
                </p>
              )}
              {progress.emailFailed + progress.whatsappFailed > 0 && (
                <p className="text-gray-600">
                  Para ver a quién le falló y por qué, filtra la lista con “Invitación: falló”.
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          {sending ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                stopRef.current = true;
                setStopped(true);
              }}
              disabled={stopped}
            >
              {stopped ? 'Deteniendo…' : 'Detener'}
            </Button>
          ) : (
            <Button type="button" onClick={onClose}>
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Enviar invitaciones</DialogTitle>
        <DialogDescription>
          {event.name}. Cada invitado recibe los datos del evento y la liga de su boleto con su código QR.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-2">
        {/* A quién */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-gray-900">¿A quién?</legend>
          <RadioGroup value={scope} onValueChange={(v) => setScope(v as Scope)} className="space-y-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id="inv-scope-all" />
              <Label htmlFor="inv-scope-all" className="font-normal">
                A toda la lista ({n(totalGuests)} invitados)
              </Label>
            </div>
            {accessTypes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <RadioGroupItem value="access" id="inv-scope-access" />
                <Label htmlFor="inv-scope-access" className="font-normal">
                  Solo a un tipo de acceso
                </Label>
                {scope === 'access' && (
                  <div className="w-56">
                    <SearchableSelect
                      options={accessTypes.map((a) => ({ value: a, label: a }))}
                      value={accessType}
                      onChange={setAccessType}
                      allLabel="Elige el tipo de acceso"
                    />
                  </div>
                )}
              </div>
            )}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <RadioGroupItem value="selected" id="inv-scope-selected" />
                <Label htmlFor="inv-scope-selected" className="font-normal">
                  Solo a los {n(selectedIds.length)} seleccionados en la lista
                </Label>
              </div>
            )}
          </RadioGroup>
        </fieldset>

        {/* Por dónde */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-gray-900">¿Por dónde?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChannelCard
              id="inv-channel-email"
              icon={<EnvelopeIcon className="h-5 w-5" />}
              label="Correo"
              checked={email}
              onChange={setEmail}
              preview={email ? (preview?.email ?? null) : null}
              loading={email && loadingPreview}
            />
            <ChannelCard
              id="inv-channel-whatsapp"
              icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
              label="WhatsApp"
              checked={whatsapp}
              onChange={setWhatsapp}
              preview={whatsapp ? (preview?.whatsapp ?? null) : null}
              loading={whatsapp && loadingPreview}
            />
          </div>
          {channels.length === 0 && <p className="text-sm text-amber-700">Elige al menos un canal.</p>}
        </fieldset>

        <div className="flex items-start gap-2">
          <Checkbox id="inv-resend" checked={resend} onCheckedChange={(v) => setResend(v === true)} className="mt-0.5" />
          <Label htmlFor="inv-resend" className="font-normal leading-snug">
            Volver a mandarla también a quien ya la recibió
            <span className="block text-xs text-gray-500">
              Sin marcar, solo sale a quien todavía no le ha llegado por ese canal (o le falló).
            </span>
          </Label>
        </div>

        {preview && !preview.canSend && preview.reason && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
            {preview.reason}
          </p>
        )}
        {previewError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{previewError}</p>
        )}
      </div>

      <DialogFooter className="items-center gap-2 sm:justify-between">
        <p className="text-sm text-gray-600">
          {loadingPreview ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Revisando…
            </span>
          ) : (
            summary
          )}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSend} disabled={!canSend}>
            <PaperAirplaneIcon className="mr-2 h-4 w-4" />
            Enviar
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

function ChannelCard({
  id,
  icon,
  label,
  checked,
  onChange,
  preview,
  loading,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  preview: InvitationChannelPreview | null;
  loading: boolean;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${checked ? 'border-[#a7c1e2] bg-[#C8DDF2]/10' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-2">
        <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
        <Label htmlFor={id} className="flex items-center gap-1.5 font-medium text-gray-900">
          {icon}
          {label}
        </Label>
      </div>
      {checked && (
        <div className="mt-2 space-y-1 pl-6 text-sm">
          {loading && !preview ? (
            <p className="text-gray-400">Revisando…</p>
          ) : preview ? (
            <>
              {preview.available ? (
                <p className="text-gray-900">
                  Le saldría a <span className="font-semibold tabular-nums">{n(preview.toSend)}</span>
                </p>
              ) : (
                <p className="text-amber-800">{preview.reason}</p>
              )}
              {preview.skipped.map((s) => (
                <p key={s.reason} className="text-xs text-gray-500">
                  {n(s.guests)} no: {s.label.charAt(0).toLowerCase() + s.label.slice(1)}
                </p>
              ))}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
