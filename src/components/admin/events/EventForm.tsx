'use client';

// EventForm - Formulario de evento (alta y edición) agrupado por bloques:
// Datos del evento, Fecha y horario, Sede, Boletos, Fiscal, Textos y Ventana
// de venta. Trabaja con texto (EventFormValues); la validación y la
// conversión a DTO viven en lib/events/form.ts.

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useActiveCountries } from '@/hooks/useConfig';
import { EMPTY_EVENT_FORM, validateEventForm, type EventFormValues } from '@/lib/events/form';
import { EVENT_TAX_MODE_LABEL, EVENT_TAX_MODES, type EventTaxMode } from '@/types/events';
import { IncludedProductPicker } from './IncludedProductPicker';

interface EventFormProps {
  mode: 'create' | 'edit';
  /** Valores iniciales (edición). En el alta se parte de EMPTY_EVENT_FORM. */
  initial?: EventFormValues;
  /** Se llama con el formulario ya validado. */
  onSubmit: (values: EventFormValues) => Promise<void> | void;
  isPending?: boolean;
  submitLabel?: string;
  /** Botón secundario (regresar/cancelar). */
  onCancel?: () => void;
}

const TIMEZONE_OPTIONS = [
  { value: 'America/Mexico_City', label: 'Ciudad de México (centro)' },
  { value: 'America/Cancun', label: 'Cancún (sureste)' },
  { value: 'America/Chihuahua', label: 'Chihuahua (pacífico)' },
  { value: 'America/Hermosillo', label: 'Hermosillo (Sonora)' },
  { value: 'America/Tijuana', label: 'Tijuana (noroeste)' },
  { value: 'America/Bogota', label: 'Bogotá' },
  { value: 'America/Guatemala', label: 'Guatemala' },
  { value: 'America/Chicago', label: 'Chicago (EE. UU. centro)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles (EE. UU. pacífico)' },
];

export function EventForm({
  mode,
  initial,
  onSubmit,
  isPending = false,
  submitLabel = mode === 'create' ? 'Crear evento' : 'Guardar cambios',
  onCancel,
}: EventFormProps) {
  const [form, setForm] = useState<EventFormValues>(initial ?? EMPTY_EVENT_FORM);
  const set = (patch: Partial<EventFormValues>) => setForm((f) => ({ ...f, ...patch }));

  // Si la ficha se vuelve a cargar (p. ej. tras guardar), el formulario se
  // alinea con lo que regresó el API.
  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  const { data: countriesData } = useActiveCountries();
  const countryOptions = useMemo(
    () => (countriesData ?? []).map((c) => ({ value: c.id, label: c.name })),
    [countriesData],
  );
  // País por defecto: México (en el alta, cuando aún no se eligió ninguno).
  useEffect(() => {
    if (mode !== 'create' || form.countryId || !countriesData?.length) return;
    const mx = countriesData.find((c) => c.code?.toUpperCase() === 'MX');
    if (mx) setForm((f) => (f.countryId ? f : { ...f, countryId: mx.id }));
  }, [mode, form.countryId, countriesData]);

  const timezoneOptions = useMemo(() => {
    if (form.timezone && !TIMEZONE_OPTIONS.some((o) => o.value === form.timezone)) {
      return [{ value: form.timezone, label: form.timezone }, ...TIMEZONE_OPTIONS];
    }
    return TIMEZONE_OPTIONS;
  }, [form.timezone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateEventForm(form, mode);
    if (error) {
      toast.error(error);
      return;
    }
    await onSubmit(form);
  };

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initial ?? EMPTY_EVENT_FORM),
    [form, initial],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Datos del evento ── */}
      <Card>
        <CardHeader>
          <CardTitle>Datos del evento</CardTitle>
          <CardDescription>
            La clave es la que se teclea en el POS para cobrar el boleto (como cualquier producto).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="ev-code">Clave *</Label>
            <Input
              id="ev-code"
              value={form.code}
              onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
              placeholder="FOCADE26"
              className="font-mono uppercase"
              maxLength={30}
              disabled={mode === 'edit'}
              readOnly={mode === 'edit'}
            />
            <p className="text-xs text-gray-400">
              {mode === 'edit'
                ? 'La clave no se cambia una vez creado el evento.'
                : '3 a 30 caracteres: letras, números, guion y guion bajo.'}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-name">Nombre del evento *</Label>
            <Input
              id="ev-name"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="FOCADE Teziutlán"
              maxLength={200}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-product-name">Nombre del producto en el POS (opcional)</Label>
            <Input
              id="ev-product-name"
              value={form.productName}
              onChange={(e) => set({ productName: e.target.value })}
              placeholder="Vacío = el nombre del evento"
              maxLength={255}
            />
            <p className="text-xs text-gray-400">Así aparece en el ticket de venta y en la factura.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-speaker">Ponente</Label>
            <Input
              id="ev-speaker"
              value={form.speaker}
              onChange={(e) => set({ speaker: e.target.value })}
              placeholder="Dr. César Lozano"
              maxLength={200}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="ev-description">Descripción</Label>
            <Textarea
              id="ev-description"
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={3}
              maxLength={4000}
              placeholder="De qué trata el evento (visible en el admin y el correo)."
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Fecha y horario ── */}
      <Card>
        <CardHeader>
          <CardTitle>Fecha y horario</CardTitle>
          <CardDescription>Las horas se imprimen en el boleto tal cual se capturan.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="grid gap-2">
            <Label htmlFor="ev-date">Fecha *</Label>
            <Input
              id="ev-date"
              type="date"
              value={form.eventDate}
              onChange={(e) => set({ eventDate: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-doors">Registro (apertura)</Label>
            <Input
              id="ev-doors"
              type="time"
              value={form.doorsTime}
              onChange={(e) => set({ doorsTime: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-start">Inicio</Label>
            <Input
              id="ev-start"
              type="time"
              value={form.startTime}
              onChange={(e) => set({ startTime: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-end">Término</Label>
            <Input
              id="ev-end"
              type="time"
              value={form.endTime}
              onChange={(e) => set({ endTime: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-tz">Zona horaria</Label>
            <SearchableSelect
              id="ev-tz"
              options={timezoneOptions}
              value={form.timezone}
              onChange={(v) => set({ timezone: v || 'America/Mexico_City' })}
              showAllOption={false}
              placeholder="Zona horaria"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Sede ── */}
      <Card>
        <CardHeader>
          <CardTitle>Sede</CardTitle>
          <CardDescription>Solo las sucursales del país del evento pueden venderlo.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="ev-venue">Nombre de la sede</Label>
            <Input
              id="ev-venue"
              value={form.venueName}
              onChange={(e) => set({ venueName: e.target.value })}
              placeholder="Centro de Convenciones"
              maxLength={200}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-address">Dirección</Label>
            <Input
              id="ev-address"
              value={form.venueAddress}
              onChange={(e) => set({ venueAddress: e.target.value })}
              placeholder="Av. Tomás Conde #6, Col. Centro"
              maxLength={500}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-city">Ciudad</Label>
            <Input
              id="ev-city"
              value={form.city}
              onChange={(e) => set({ city: e.target.value })}
              placeholder="Teziutlán"
              maxLength={120}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-state">Estado</Label>
            <Input
              id="ev-state"
              value={form.state}
              onChange={(e) => set({ state: e.target.value })}
              placeholder="Puebla"
              maxLength={120}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-country">País</Label>
            <SearchableSelect
              id="ev-country"
              options={countryOptions}
              value={form.countryId}
              onChange={(v) => set({ countryId: v })}
              showAllOption={false}
              placeholder="Selecciona el país"
            />
            {mode === 'edit' && (
              <p className="text-xs text-gray-400">
                Si cambias el país, revisa la asignación de sucursales.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Boletos ── */}
      <Card>
        <CardHeader>
          <CardTitle>Boletos</CardTitle>
          <CardDescription>
            Cada unidad vendida en el POS genera los boletos indicados, uno por asistente.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="ev-price">Precio al público (IVA incluido) *</Label>
            <Input
              id="ev-price"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={form.ticketPrice}
              onChange={(e) => set({ ticketPrice: e.target.value })}
              placeholder="850.00"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-per-unit">Boletos por unidad *</Label>
            <Input
              id="ev-per-unit"
              type="number"
              min={1}
              max={20}
              step={1}
              value={form.ticketsPerUnit}
              onChange={(e) => set({ ticketsPerUnit: e.target.value })}
            />
            <p className="text-xs text-gray-400">p. ej. 2 = acceso + 1 invitado</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-capacity">Aforo (opcional)</Label>
            <Input
              id="ev-capacity"
              type="number"
              min={1}
              step={1}
              value={form.capacity}
              onChange={(e) => set({ capacity: e.target.value })}
              placeholder="Sin tope"
            />
            <p className="text-xs text-gray-400">Tope total de unidades que se pueden asignar a sucursales.</p>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="ev-included">Producto incluido (opcional)</Label>
            <IncludedProductPicker
              id="ev-included"
              productId={form.includedProductId}
              productLabel={form.includedProductLabel}
              onChange={({ productId, productLabel }) =>
                set({ includedProductId: productId, includedProductLabel: productLabel })
              }
            />
            <p className="text-xs text-gray-400">
              Informativo: se imprime en el boleto como “Incluye”. No descuenta inventario.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-included-qty">Cantidad incluida</Label>
            <Input
              id="ev-included-qty"
              type="number"
              min={0.01}
              step="0.01"
              value={form.includedQuantity}
              onChange={(e) => set({ includedQuantity: e.target.value })}
              disabled={!form.includedProductId}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Fiscal ── */}
      <Card>
        <CardHeader>
          <CardTitle>Fiscal</CardTitle>
          <CardDescription>Cómo se factura el boleto (CFDI).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="ev-tax">Impuesto</Label>
            <SearchableSelect
              id="ev-tax"
              options={EVENT_TAX_MODES.map((m) => ({ value: m, label: EVENT_TAX_MODE_LABEL[m] }))}
              value={form.taxMode}
              onChange={(v) => set({ taxMode: (v || 'iva_16') as EventTaxMode })}
              showAllOption={false}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-sat-prod">Clave SAT producto/servicio</Label>
            <Input
              id="ev-sat-prod"
              value={form.satProductCode}
              onChange={(e) => set({ satProductCode: e.target.value.replace(/\D/g, '').slice(0, 8) })}
              placeholder="01010101"
              className="font-mono"
              inputMode="numeric"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-sat-unit">Clave SAT de unidad</Label>
            <Input
              id="ev-sat-unit"
              value={form.satUnitCode}
              onChange={(e) => set({ satUnitCode: e.target.value.toUpperCase().slice(0, 3) })}
              placeholder="E48"
              className="font-mono uppercase"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Textos ── */}
      <Card>
        <CardHeader>
          <CardTitle>Textos</CardTitle>
          <CardDescription>Lo que lee el asistente en su boleto y en el correo.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ev-ticket-notes">Notas del boleto</Label>
            <Textarea
              id="ev-ticket-notes"
              value={form.ticketNotes}
              onChange={(e) => set({ ticketNotes: e.target.value })}
              rows={3}
              maxLength={2000}
              placeholder="Reglas de acceso: presentar identificación, no reembolsable, etc."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-email-notes">Notas del correo</Label>
            <Textarea
              id="ev-email-notes"
              value={form.emailNotes}
              onChange={(e) => set({ emailNotes: e.target.value })}
              rows={3}
              maxLength={4000}
              placeholder="Texto adicional que va en el correo con los boletos."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-image">URL de la imagen / flyer</Label>
            <Input
              id="ev-image"
              type="url"
              value={form.imageUrl}
              onChange={(e) => set({ imageUrl: e.target.value })}
              placeholder="https://…/flyer.jpg"
              maxLength={500}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Ventana de venta ── */}
      <Card>
        <CardHeader>
          <CardTitle>Ventana de venta</CardTitle>
          <CardDescription>
            Opcional. Fuera de estas fechas el POS no vende el boleto aunque el evento esté activo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="ev-sale-from">Se vende desde</Label>
            <Input
              id="ev-sale-from"
              type="date"
              value={form.saleStartsOn}
              onChange={(e) => set({ saleStartsOn: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-sale-to">Se vende hasta</Label>
            <Input
              id="ev-sale-to"
              type="date"
              value={form.saleEndsOn}
              onChange={(e) => set({ saleEndsOn: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
            {mode === 'create' ? 'Cancelar' : 'Descartar cambios'}
          </Button>
        )}
        <Button type="submit" disabled={isPending || (mode === 'edit' && !dirty)}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
          {isPending ? 'Guardando…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
