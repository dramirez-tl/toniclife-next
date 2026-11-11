'use client';

// CarrierDialog — Agregar o editar una paquetería de un país de la tienda.
//
// Nombre, enlace de rastreo (con `{guia}` donde va el número de guía), si es la
// predeterminada y una nota. Las reglas son las de `lib/store-country/carriers` (las
// mismas del API): aquí se avisa antes de guardar y, si el API rechaza algo, se muestra
// su mensaje junto al campo.

import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useCreateCarrier, useUpdateCarrier } from '@/hooks/useFulfillment';
import { fulfillmentErrorMessage, parseFulfillmentError } from '@/lib/fulfillment/fulfillment-error';
import {
  CARRIER_NAME_MAX,
  CARRIER_NOTES_MAX,
  CARRIER_TRACKING_MAX,
  EMPTY_CARRIER_FORM,
  TRACKING_EXAMPLE_NUMBER,
  TRACKING_EXAMPLE_TEMPLATE,
  TRACKING_PLACEHOLDER,
  buildCreateCarrierPayload,
  buildUpdateCarrierPayload,
  carrierFormValues,
  cleanCarrierName,
  hasCarrierFormErrors,
  isEmptyCarrierPayload,
  trackingUrlExample,
  validateCarrierForm,
  type CarrierFormErrors,
  type CarrierFormField,
  type CarrierFormValues,
} from '@/lib/store-country/carriers';
import type { Carrier } from '@/types/fulfillment';

interface CarrierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countryCode: string;
  /** "México (incluye Frontera)". */
  countryScope: string;
  /** La que se edita; null = se agrega una nueva. */
  carrier: Carrier | null;
  /** Paqueterías del mismo país, para avisar de un nombre repetido. */
  others: Carrier[];
}

const FIELDS: CarrierFormField[] = ['name', 'trackingUrlTemplate', 'notes'];
const isFormField = (field: string | null): field is CarrierFormField => FIELDS.includes(field as CarrierFormField);

export function CarrierDialog({ open, onOpenChange, countryCode, countryScope, carrier, others }: CarrierDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        {/* El cuerpo se desmonta al cerrar: el formulario empieza limpio cada vez. */}
        {open && (
          <CarrierForm
            key={carrier?.id ?? 'new'}
            countryCode={countryCode}
            countryScope={countryScope}
            carrier={carrier}
            others={others}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CarrierForm({
  countryCode,
  countryScope,
  carrier,
  others,
  onDone,
}: Omit<CarrierDialogProps, 'open' | 'onOpenChange'> & { onDone: () => void }) {
  const create = useCreateCarrier();
  const update = useUpdateCarrier();
  const busy = create.isPending || update.isPending;

  const [values, setValues] = useState<CarrierFormValues>(() => (carrier ? carrierFormValues(carrier) : EMPTY_CARRIER_FORM));
  // Los errores se enseñan después del primer intento de guardar, no mientras se escribe.
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<CarrierFormErrors>({});

  const localErrors = validateCarrierForm(values, others, carrier);
  const errors: CarrierFormErrors = attempted ? { ...serverErrors, ...localErrors } : serverErrors;

  const change = (patch: Partial<CarrierFormValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
    // Lo que dijo el servidor de un campo deja de valer en cuanto ese campo cambia.
    setServerErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch)) delete next[key as CarrierFormField];
      return next;
    });
  };

  const example = trackingUrlExample(values.trackingUrlTemplate);
  // Una inactiva no puede ser la predeterminada (primero se reactiva).
  const canBeDefault = !carrier || carrier.isActive;

  const onError = (error: unknown) => {
    const parsed = parseFulfillmentError(error);
    const message = fulfillmentErrorMessage(error, 'No se pudo guardar la paquetería.');
    if (isFormField(parsed.field)) setServerErrors({ [parsed.field]: message });
    toast.error(message);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (hasCarrierFormErrors(localErrors)) return;
    const name = cleanCarrierName(values.name);
    if (carrier) {
      const payload = buildUpdateCarrierPayload(carrier, values);
      if (isEmptyCarrierPayload(payload)) {
        onDone();
        return;
      }
      update.mutate(
        { id: carrier.id, payload },
        {
          onSuccess: () => {
            toast.success(`${name}: cambios guardados`);
            onDone();
          },
          onError,
        },
      );
      return;
    }
    create.mutate(buildCreateCarrierPayload(countryCode, values), {
      onSuccess: () => {
        toast.success(`${name} agregada a las paqueterías de ${countryScope}`);
        onDone();
      },
      onError,
    });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{carrier ? `Editar ${carrier.name}` : 'Agregar paquetería'}</DialogTitle>
        <DialogDescription>
          {carrier
            ? `Paquetería de ${countryScope}. Los envíos que ya la tienen no cambian.`
            : `Se ofrecerá al marcar los envíos de ${countryScope}.`}
        </DialogDescription>
      </DialogHeader>

      <div>
        <Label htmlFor="carrier-name">Nombre</Label>
        <Input
          id="carrier-name"
          className="mt-1"
          value={values.name}
          onChange={(e) => change({ name: e.target.value })}
          placeholder="FedEx, Estafeta, DHL…"
          maxLength={CARRIER_NAME_MAX}
          autoComplete="off"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'carrier-name-error' : undefined}
        />
        {errors.name && (
          <p id="carrier-name-error" role="alert" className="mt-1 text-sm text-red-700">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="carrier-tracking">Enlace de rastreo (opcional)</Label>
        <Input
          id="carrier-tracking"
          className="mt-1"
          value={values.trackingUrlTemplate}
          onChange={(e) => change({ trackingUrlTemplate: e.target.value })}
          placeholder={TRACKING_EXAMPLE_TEMPLATE}
          maxLength={CARRIER_TRACKING_MAX}
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!errors.trackingUrlTemplate}
          aria-describedby="carrier-tracking-help"
        />
        {errors.trackingUrlTemplate && (
          <p role="alert" className="mt-1 text-sm text-red-700">
            {errors.trackingUrlTemplate}
          </p>
        )}
        <div id="carrier-tracking-help" className="mt-1.5 space-y-1 text-xs text-muted-foreground">
          <p>
            Pega el enlace con el que la paquetería deja rastrear un paquete y escribe{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">{TRACKING_PLACEHOLDER}</code> en el
            lugar donde va el número de guía. Con él, quien compra abre el rastreo desde su correo y desde Mis pedidos.
          </p>
          {example ? (
            <p className="break-all">
              Con la guía {TRACKING_EXAMPLE_NUMBER} queda: <span className="text-foreground">{example}</span>
            </p>
          ) : (
            <p className="break-all">
              Ejemplo: <span className="text-foreground">{TRACKING_EXAMPLE_TEMPLATE}</span>
            </p>
          )}
        </div>
      </div>

      <label className={`flex items-start gap-3 rounded-lg border p-3 ${canBeDefault ? '' : 'opacity-60'}`}>
        <Switch
          checked={values.isDefault}
          onCheckedChange={(checked) => change({ isDefault: checked })}
          disabled={!canBeDefault}
          className="mt-0.5"
        />
        <span>
          <span className="block text-sm font-medium text-foreground">Es la predeterminada</span>
          <span className="block text-xs text-muted-foreground">
            {canBeDefault
              ? `Sale ya elegida al marcar un envío de ${countryScope}. Solo puede haber una: si eliges esta, la anterior deja de serlo.`
              : 'Está desactivada: reactívala primero para poder dejarla como predeterminada.'}
          </span>
        </span>
      </label>

      <div>
        <Label htmlFor="carrier-notes">Notas (opcional)</Label>
        <Textarea
          id="carrier-notes"
          className="mt-1"
          value={values.notes}
          onChange={(e) => change({ notes: e.target.value })}
          placeholder="Por ejemplo: días de recolección o a quién llamar."
          maxLength={CARRIER_NOTES_MAX}
          rows={2}
          aria-invalid={!!errors.notes}
        />
        {errors.notes && (
          <p role="alert" className="mt-1 text-sm text-red-700">
            {errors.notes}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 aria-hidden className="animate-spin" />}
          {busy ? 'Guardando…' : carrier ? 'Guardar cambios' : 'Agregar paquetería'}
        </Button>
      </DialogFooter>
    </form>
  );
}
