'use client';

// EventGuestDialog - Alta y edición de UN invitado de un evento privado.
// Tres casos: es un distribuidor (se liga a su ficha por su número: de ahí
// salen su nombre, teléfono y correo), es acompañante de un distribuidor, o
// solo se tiene su nombre. La validación y la conversión viven en
// lib/events/guests.ts.

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAddEventGuest, useUpdateEventGuest } from '@/hooks/useEventGuests';
import { eventErrorMessage } from '@/lib/events/format';
import {
  EMPTY_GUEST_FORM,
  GUEST_SEATS_MAX,
  formatGuestPhone,
  guestFlagLabel,
  guestToForm,
  toAddGuestInput,
  toUpdateGuestInput,
  validateGuestForm,
  type GuestFormValues,
} from '@/lib/events/guests';
import {
  GUEST_FLAG_HELP,
  GUEST_KIND_LABEL,
  GUEST_KINDS,
  GUEST_STATUS_LABEL,
  GUEST_STATUSES,
  type EventGuestDto,
  type GuestFlag,
  type GuestKind,
  type GuestStatus,
} from '@/types/event-guests';

interface EventGuestDialogProps {
  eventId: string;
  /** Invitado a editar; sin él es un alta. */
  guest?: EventGuestDto | null;
  /** Tipos de acceso que ya existen en la lista (se sugieren). */
  accessTypes: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KIND_HELP: Record<GuestKind, string> = {
  distributor: 'Se liga a su ficha: su nombre, teléfono y correo salen de ahí.',
  companion: 'Va con un distribuidor (cónyuge, invitado…): se guarda quién lo invita.',
  external: 'No es distribuidor ni acompañante: se captura su nombre y su contacto.',
};

export function EventGuestDialog(props: EventGuestDialogProps) {
  // El formulario se monta de nuevo en cada apertura (y por invitado): así
  // siempre arranca con los datos correctos, sin efectos de sincronización.
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {props.open && <GuestForm key={props.guest?.id ?? 'nuevo'} {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function GuestForm({ eventId, guest, accessTypes, onOpenChange }: EventGuestDialogProps) {
  const editing = !!guest;
  const [form, setForm] = useState<GuestFormValues>(guest ? guestToForm(guest) : EMPTY_GUEST_FORM);
  const set = (patch: Partial<GuestFormValues>) => setForm((f) => ({ ...f, ...patch }));
  const addMutation = useAddEventGuest(eventId);
  const updateMutation = useUpdateEventGuest(eventId);
  const isPending = addMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateGuestForm(form);
    if (error) {
      toast.error(error);
      return;
    }
    try {
      if (guest) {
        const input = toUpdateGuestInput(guest, form);
        if (Object.keys(input).length === 0) {
          onOpenChange(false);
          return;
        }
        await updateMutation.mutateAsync({ guestId: guest.id, input });
        toast.success('Invitado actualizado');
      } else {
        const created = await addMutation.mutateAsync(toAddGuestInput(form));
        toast.success(`${created.fullName} quedó en la lista`);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(eventErrorMessage(err, 'No se pudo guardar el invitado.'));
    }
  };

  const markReviewed = async () => {
    if (!guest) return;
    try {
      await updateMutation.mutateAsync({ guestId: guest.id, input: { reviewed: true } });
      toast.success('Marcado como revisado');
      onOpenChange(false);
    } catch (err) {
      toast.error(eventErrorMessage(err, 'No se pudo marcar como revisado.'));
    }
  };

  const fichaName = guest?.kind === 'distributor' ? guest.customerName : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>{editing ? 'Editar invitado' : 'Agregar invitado'}</DialogTitle>
        <DialogDescription>
          {editing
            ? 'Corrige sus datos, sus lugares o su estado. Para sacarlo de la lista usa “Quitar”.'
            : 'Para varios a la vez usa “Carga masiva”.'}
        </DialogDescription>
      </DialogHeader>

      {guest && guest.flags.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Por revisar</p>
          <ul className="mt-1 space-y-1">
            {guest.flags.map((f) => (
              <li key={f}>
                <span className="font-medium">{guestFlagLabel(f)}.</span>{' '}
                {GUEST_FLAG_HELP[f as GuestFlag] ?? ''}
                {f !== 'inactive' && guest.listedNumber && (
                  <span className="text-amber-800"> ID en la lista: {guest.listedNumber}.</span>
                )}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
            onClick={markReviewed}
            disabled={isPending}
          >
            Ya lo revisé: quitar avisos
          </Button>
        </div>
      )}

      <div className="grid gap-2">
        <Label>¿Quién es?</Label>
        <RadioGroup
          value={form.kind}
          onValueChange={(v) => set({ kind: v as GuestKind })}
          className="grid gap-2 sm:grid-cols-3"
        >
          {GUEST_KINDS.map((k) => (
            <label
              key={k}
              htmlFor={`guest-kind-${k}`}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition-colors ${
                form.kind === k ? 'border-[#3E667D] bg-[#C8DDF2]/20' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <RadioGroupItem value={k} id={`guest-kind-${k}`} className="mt-0.5" />
              <span>
                <span className="block font-medium text-gray-900">{GUEST_KIND_LABEL[k]}</span>
                <span className="mt-0.5 block text-xs text-gray-500">{KIND_HELP[k]}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {form.kind === 'distributor' && (
          <div className="grid gap-2">
            <Label htmlFor="guest-number">Número de distribuidor *</Label>
            <Input
              id="guest-number"
              value={form.customerNumber}
              onChange={(e) => set({ customerNumber: e.target.value.replace(/\D/g, '') })}
              placeholder="1786956"
              inputMode="numeric"
              className="font-mono"
              maxLength={12}
            />
            {fichaName && form.customerNumber === (guest?.customerNumber ?? '') && (
              <p className="text-xs text-gray-500">En su ficha: {fichaName}</p>
            )}
          </div>
        )}
        {form.kind === 'companion' && (
          <div className="grid gap-2">
            <Label htmlFor="guest-host">Número del distribuidor que lo invita *</Label>
            <Input
              id="guest-host"
              value={form.hostCustomerNumber}
              onChange={(e) => set({ hostCustomerNumber: e.target.value.replace(/\D/g, '') })}
              placeholder="1786956"
              inputMode="numeric"
              className="font-mono"
              maxLength={12}
            />
            {guest?.hostName && form.hostCustomerNumber === (guest.hostCustomerNumber ?? '') && (
              <p className="text-xs text-gray-500">Titular: {guest.hostName}</p>
            )}
          </div>
        )}
        <div className={`grid gap-2 ${form.kind === 'external' ? 'sm:col-span-2' : ''}`}>
          <Label htmlFor="guest-name">
            Nombre {form.kind === 'distributor' ? '(opcional)' : '*'}
          </Label>
          <Input
            id="guest-name"
            value={form.fullName}
            onChange={(e) => set({ fullName: e.target.value })}
            placeholder={form.kind === 'distributor' ? 'Vacío = el de su ficha' : 'Nombre completo'}
            maxLength={200}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="guest-access">Tipo de acceso</Label>
          <Input
            id="guest-access"
            value={form.accessType}
            onChange={(e) => set({ accessType: e.target.value })}
            placeholder="Acceso General, Todo Incluido, Elite…"
            maxLength={60}
            list="guest-access-types"
          />
          <datalist id="guest-access-types">
            {accessTypes.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="guest-seats">Lugares *</Label>
          <Input
            id="guest-seats"
            type="number"
            min={1}
            max={GUEST_SEATS_MAX}
            step={1}
            value={form.seats}
            onChange={(e) => set({ seats: e.target.value })}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="guest-phone">Teléfono (WhatsApp)</Label>
          <Input
            id="guest-phone"
            value={form.phone}
            onChange={(e) => set({ phone: e.target.value })}
            placeholder={form.kind === 'distributor' ? 'Vacío = el de su ficha' : '10 dígitos'}
            inputMode="tel"
            maxLength={20}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="guest-email">Correo</Label>
          <Input
            id="guest-email"
            type="email"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            placeholder={form.kind === 'distributor' ? 'Vacío = el de su ficha' : 'correo@ejemplo.com'}
            maxLength={200}
          />
        </div>
        {guest && (
          <p className="text-xs text-gray-500 sm:col-span-2">
            Hoy la invitación le llegaría a: teléfono{' '}
            {guest.contactPhone ? formatGuestPhone(guest.contactPhone) : 'sin teléfono'} · correo{' '}
            {guest.contactEmail ?? 'sin correo'}
            {guest.kind === 'distributor' ? ' (lo que no captures aquí sale de su ficha).' : '.'}
          </p>
        )}

        <div className="grid gap-2">
          <Label htmlFor="guest-network">Red</Label>
          <Input
            id="guest-network"
            value={form.network}
            onChange={(e) => set({ network: e.target.value })}
            placeholder="Opcional"
            maxLength={120}
          />
        </div>
        {editing && (
          <div className="grid gap-2">
            <Label htmlFor="guest-status">Estado</Label>
            <SearchableSelect
              id="guest-status"
              options={GUEST_STATUSES.map((s) => ({ value: s, label: GUEST_STATUS_LABEL[s] }))}
              value={form.status}
              onChange={(v) => set({ status: (v || 'invited') as GuestStatus })}
              showAllOption={false}
            />
          </div>
        )}
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="guest-notes">Notas</Label>
          <Textarea
            id="guest-notes"
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
            rows={2}
            maxLength={500}
            placeholder="Opcional"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
          {editing ? 'Guardar cambios' : 'Agregar a la lista'}
        </Button>
      </DialogFooter>
    </form>
  );
}
