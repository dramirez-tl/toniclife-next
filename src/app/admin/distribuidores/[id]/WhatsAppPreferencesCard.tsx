'use client';

// WhatsAppPreferencesCard — bloque "WhatsApp" de la ficha del distribuidor
// (admin): estado del consentimiento (mig 175; `whatsappMarketing` del API o
// derivado), fuente y fecha, y un Select para cambiarlo con
// PATCH /customers/:id/whatsapp-preferences (el API lo guarda con fuente
// 'admin' y lo deja en la auditoría). Se confirma tanto la baja total como
// salir de ella (vuelve a recibir mensajes). El Select solo aparece con el
// permiso customers:update (nunca por rol). Degrada si el API todavía no
// expone los campos: avisa "despliegue pendiente" y conserva el Select,
// porque el PATCH puede existir aunque el GET aún no mande los campos.

import { useState } from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { hasAnyPermission } from '@/lib/admin-nav-filter';
import { apiErrorMessage } from '@/lib/api-error';
import { customersService } from '@/services/customers.service';
import { useAppSelector } from '@/store/hooks';
import { selectUserPermissions } from '@/store/slices/authSlice';
import type { Customer, WhatsAppMarketingPreference } from '@/types/customer';
import {
  WHATSAPP_PREFERENCE_OPTIONS,
  formatCdmx,
  preferenceLabel,
  whatsappConsentView,
} from './whatsapp-preferences';

interface WhatsAppPreferencesCardProps {
  customer: Customer;
  /** Se llama tras guardar para recargar la ficha. */
  onSaved: () => void;
}

export function WhatsAppPreferencesCard({ customer, onSaved }: WhatsAppPreferencesCardProps) {
  const permissions = useAppSelector(selectUserPermissions);
  const canEdit = hasAnyPermission(permissions, ['customers:update']);
  const view = whatsappConsentView(customer);
  const [saving, setSaving] = useState(false);
  const [confirmNone, setConfirmNone] = useState(false);
  /** Valor pendiente al salir de la baja total (vuelve a recibir mensajes). */
  const [confirmReactivate, setConfirmReactivate] = useState<WhatsAppMarketingPreference | null>(null);
  // El API escribe la preferencia por teléfono: sin número no hay dónde aplicarla.
  const noPhone = !customer.phone;

  const save = async (value: WhatsAppMarketingPreference) => {
    setSaving(true);
    try {
      await customersService.updateWhatsAppPreferences(customer.id, value);
      toast.success(`WhatsApp: ${preferenceLabel(value)}`);
      onSaved();
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, 'No se pudo guardar la preferencia de WhatsApp'));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (raw: string) => {
    const value = raw as WhatsAppMarketingPreference;
    if (value === view.preference) return;
    // La baja total silencia TODO el canal: se confirma antes de escribirla.
    if (value === 'none') {
      setConfirmNone(true);
      return;
    }
    // Salir de la baja total reactiva el canal: también se confirma (fue decisión de la persona).
    if (view.preference === 'none') {
      setConfirmReactivate(value);
      return;
    }
    void save(value);
  };

  let help = 'Se guarda con tu usuario (fuente "admin") y queda en la auditoría.';
  if (noPhone) help = 'Sin teléfono registrado: la preferencia no se puede aplicar.';
  else if (saving) help = 'Guardando…';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <ChatBubbleLeftRightIcon className="h-5 w-5" />
        WhatsApp
      </h2>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-500">Estado</label>
          <div className="mt-1">
            <Badge variant={view.statusTone}>{view.statusLabel}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Fuente</label>
            <p className="font-medium text-gray-900">{view.sourceLabel ?? '—'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Fecha</label>
            <p className="font-medium text-gray-900">{formatCdmx(view.at) ?? '—'}</p>
          </div>
        </div>

        {view.unreachableAt && (
          <p className="text-xs text-amber-700">
            Meta reportó que este número no tiene WhatsApp (131026) el{' '}
            {formatCdmx(view.unreachableAt)}. La marca se quita sola al cambiar el
            teléfono o cuando Meta entregue un mensaje.
          </p>
        )}
        {view.cappedUntil && (
          <p className="text-xs text-amber-700">
            Meta limitó las promociones a este número hasta el {formatCdmx(view.cappedUntil)}{' '}
            (131049).
          </p>
        )}
        {view.dataMissing && (
          <p className="text-xs text-gray-500">
            El API todavía no expone los datos de consentimiento de WhatsApp (despliegue
            pendiente).
          </p>
        )}

        {canEdit ? (
          <div>
            <label className="text-sm text-gray-500" htmlFor="whatsapp-preference">
              Cambiar preferencia
            </label>
            <Select
              value={view.preference}
              onValueChange={handleChange}
              disabled={saving || noPhone}
            >
              <SelectTrigger
                id="whatsapp-preference"
                className="mt-1 w-full bg-white text-sm text-gray-900"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WHATSAPP_PREFERENCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-gray-500">{help}</p>
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Solo lectura: cambiarla requiere el permiso customers:update.
          </p>
        )}
      </div>

      <AlertDialog open={confirmNone} onOpenChange={setConfirmNone}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Dar de baja total de WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              {customer.firstName} {customer.lastName} dejará de recibir TODOS los mensajes
              de Tonic Life por WhatsApp (avisos de su cuenta y promociones). Se puede
              revertir desde aquí o si la persona responde ALTA por WhatsApp.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={() => {
                setConfirmNone(false);
                void save('none');
              }}
            >
              Dar de baja
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmReactivate !== null} onOpenChange={(o) => !o && setConfirmReactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Volver a enviar WhatsApp a este número?</AlertDialogTitle>
            <AlertDialogDescription>
              Este número pidió no recibir mensajes de WhatsApp; al cambiarlo volverá a recibirlos
              {confirmReactivate ? ` (${preferenceLabel(confirmReactivate)})` : ''}. Hazlo solo si la
              persona lo pidió; el cambio queda en la auditoría con tu usuario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={() => {
                const value = confirmReactivate;
                setConfirmReactivate(null);
                if (value) void save(value);
              }}
            >
              Volver a enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
