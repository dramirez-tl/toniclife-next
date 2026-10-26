'use client';

// CustomerAddressForm - Alta y edición de direcciones de un distribuidor desde
// el admin (26-oct-2026; el "+ Agregar" de la ficha caía en 404). Domicilio
// ESTRUCTURADO por país (lib/address-forms: el mismo formulario del alta en
// POS y portal; MX/US/GT/CO con sus campos y el estado/departamento del
// catálogo GET /states?countryId=), tipo (envío / facturación), alias,
// teléfono E.164 (PhoneInput), referencias y predeterminada. Crea con
// POST customers/:id/addresses y edita con PATCH customers/:id/addresses/
// :addressId (customers:update); en edición también "hacer predeterminada"
// (POST …/set-default) y eliminar (DELETE).

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeftIcon, MapPinIcon, StarIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useActiveCountries } from '@/hooks/useConfig';
import {
  buildAddressPayload,
  getAddressForm,
  validateAddress,
  type AddressFieldSpec,
} from '@/lib/address-forms';
import { customersService } from '@/services/customers.service';
import { statesService } from '@/services/states.service';
import type { AddressType, CreateAddressDto, Customer, CustomerAddress, UpdateAddressDto } from '@/types/customer';

type Values = Partial<Record<AddressFieldSpec['key'], string>>;

interface FormState {
  countryId: string;
  type: AddressType;
  alias: string;
  values: Values;
  stateName: string;
  phone: string;
  isDefault: boolean;
}

interface Props {
  customerId: string;
  /** Con id = edición; sin id = alta. */
  addressId?: string;
  /** Al guardar, eliminar o cancelar (normalmente volver a la ficha). */
  onDone: () => void;
}

const customerName = (c: Customer) =>
  [c.firstName, c.lastName, c.lastNameMother].filter(Boolean).join(' ').trim();

function apiErrorMessage(err: unknown, fallback: string): string {
  const m = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(m)) return m.join(' · ');
  return typeof m === 'string' && m ? m : fallback;
}

function fromAddress(a: CustomerAddress, fallbackCountryId: string): FormState {
  return {
    countryId: a.countryId ?? fallbackCountryId,
    type: a.type,
    alias: a.alias ?? '',
    values: {
      street: a.street ?? '',
      extNumber: a.exteriorNumber ?? '',
      intNumber: a.interiorNumber ?? '',
      neighborhood: a.neighborhood ?? '',
      city: a.city ?? '',
      zipCode: a.postalCode ?? '',
      reference: a.reference ?? '',
    },
    stateName: a.state ?? '',
    phone: a.phone ?? '',
    isDefault: a.isDefault,
  };
}

export function CustomerAddressForm({ customerId, addressId, onDone }: Props) {
  const isEdit = !!addressId;
  const queryClient = useQueryClient();
  const customerQ = useQuery({
    queryKey: ['customers', 'detail', customerId],
    queryFn: () => customersService.getById(customerId),
  });
  const addressesQ = useQuery({
    queryKey: ['customers', customerId, 'addresses'],
    queryFn: () => customersService.getAddresses(customerId),
  });
  const addressQ = useQuery({
    queryKey: ['customers', customerId, 'addresses', addressId],
    queryFn: () => customersService.getAddress(customerId, addressId!),
    enabled: isEdit,
  });
  const countriesQ = useActiveCountries();
  const countries = countriesQ.data ?? [];

  // Carga inicial UNA vez (estado derivado durante el render): alta = país y
  // teléfono del distribuidor, predeterminada si es su primera dirección;
  // edición = la dirección guardada. Un refetch posterior no pisa lo editado.
  const [form, setForm] = useState<FormState | null>(null);
  const customer = customerQ.data;
  if (form === null && customer && countries.length > 0 && addressesQ.data && (!isEdit || addressQ.data)) {
    const mx = countries.find((c) => c.code?.toUpperCase() === 'MX');
    const fallbackCountryId = customer.countryId ?? mx?.id ?? '';
    setForm(
      isEdit && addressQ.data
        ? fromAddress(addressQ.data, fallbackCountryId)
        : {
            countryId: fallbackCountryId,
            type: 'shipping',
            alias: '',
            values: {},
            stateName: '',
            phone: customer.phone ?? '',
            isDefault: addressesQ.data.length === 0,
          },
    );
  }

  const countryCode = countries.find((c) => c.id === form?.countryId)?.code?.toUpperCase();
  const addressForm = getAddressForm(countryCode);
  const statesQ = useQuery({
    queryKey: ['states', form?.countryId ?? ''],
    queryFn: () => statesService.getStates({ countryId: form!.countryId, isActive: true }),
    enabled: !!form?.countryId,
    staleTime: 10 * 60 * 1000,
  });
  const catalogStates = (statesQ.data ?? []).map((s) => ({ value: s.name, label: s.name }));
  // Un estado guardado que no está en el catálogo (capturas antiguas) se
  // conserva como opción para no perderlo al editar otra cosa.
  const stateOptions =
    form?.stateName && !catalogStates.some((o) => o.value === form.stateName)
      ? [{ value: form.stateName, label: form.stateName }, ...catalogStates]
      : catalogStates;

  const save = useMutation({
    mutationFn: (dto: CreateAddressDto | UpdateAddressDto) =>
      isEdit
        ? customersService.updateAddress(customerId, addressId!, dto as UpdateAddressDto)
        : customersService.createAddress(customerId, dto as CreateAddressDto),
    onSuccess: () => {
      toast.success(isEdit ? 'Dirección actualizada' : 'Dirección agregada');
      void queryClient.invalidateQueries({ queryKey: ['customers', customerId] });
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'No se pudo guardar la dirección')),
  });
  const makeDefault = useMutation({
    mutationFn: () => customersService.setDefaultAddress(customerId, addressId!),
    onSuccess: () => {
      toast.success('Ahora es la dirección predeterminada');
      void queryClient.invalidateQueries({ queryKey: ['customers', customerId] });
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'No se pudo marcar como predeterminada')),
  });
  const remove = useMutation({
    mutationFn: () => customersService.deleteAddress(customerId, addressId!),
    onSuccess: () => {
      toast.success('Dirección eliminada');
      void queryClient.invalidateQueries({ queryKey: ['customers', customerId] });
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'No se pudo eliminar la dirección')),
  });
  const busy = save.isPending || makeDefault.isPending || remove.isPending;

  const set = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const setValue = (key: AddressFieldSpec['key'], v: string) =>
    setForm((f) => (f ? { ...f, values: { ...f.values, [key]: v } } : f));

  const submit = () => {
    if (!form) return;
    if (!form.countryId) {
      toast.error('Elige el país del domicilio');
      return;
    }
    const err = validateAddress(addressForm, form.values, form.stateName);
    if (err) {
      toast.error(err);
      return;
    }
    const p = buildAddressPayload(form.values, form.stateName);
    const phone = form.phone.trim();
    const base = {
      type: form.type,
      street: p.street,
      city: p.city,
      state: p.stateName,
      countryId: form.countryId,
      isDefault: form.isDefault,
    };
    if (isEdit) {
      // En edición los opcionales vacíos viajan vacíos para poder borrarlos
      // (undefined = el API conserva lo guardado).
      const dto: UpdateAddressDto = {
        ...base,
        alias: form.alias.trim(),
        exteriorNumber: p.extNumber ?? '',
        interiorNumber: p.intNumber ?? '',
        neighborhood: p.neighborhood ?? '',
        postalCode: p.zipCode ?? '',
        reference: p.reference ?? '',
        phone: phone || null,
      };
      save.mutate(dto);
    } else {
      const dto: CreateAddressDto = {
        ...base,
        alias: form.alias.trim() || undefined,
        exteriorNumber: p.extNumber,
        interiorNumber: p.intNumber,
        neighborhood: p.neighborhood,
        postalCode: p.zipCode,
        reference: p.reference,
        phone: phone || undefined,
      };
      save.mutate(dto);
    }
  };

  const loading = customerQ.isLoading || countriesQ.isLoading || addressesQ.isLoading || (isEdit && addressQ.isLoading);
  const failed = customerQ.isError || addressesQ.isError || (isEdit && addressQ.isError);
  const backHref = `/admin/distribuidores/${customerId}`;
  const hasReferenceField = addressForm.fields.some((f) => f.key === 'reference');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href={backHref} className="mb-3 inline-flex items-center gap-1 text-sm text-white/80 hover:text-white">
            <ArrowLeftIcon className="h-4 w-4" />
            Volver a la ficha
          </Link>
          <div className="flex items-center gap-3">
            <MapPinIcon className="h-9 w-9" />
            <div>
              <h1 className="text-3xl font-bold">{isEdit ? 'Editar dirección' : 'Nueva dirección'}</h1>
              <p className="text-white/80">
                {customer ? (
                  <>
                    <span className="font-mono">#{customer.customerNumber ?? ''}</span> {customerName(customer)}
                  </>
                ) : (
                  '…'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        {failed ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            No se pudo cargar {isEdit ? 'la dirección' : 'al distribuidor'}.{' '}
            <Link href={backHref} className="underline">Volver a la ficha</Link>
          </p>
        ) : loading || !form ? (
          <p className="py-10 text-center text-sm text-gray-500">Cargando…</p>
        ) : (
          <Card>
            <CardContent className="space-y-5 p-6">
              {/* Tipo y alias */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-gray-600">Tipo de dirección</Label>
                  <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm">
                    {(['shipping', 'billing'] as AddressType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={form.type === t}
                        onClick={() => set({ type: t })}
                        className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                          form.type === t ? 'bg-[#3E667D] text-white shadow-sm' : 'text-gray-600 hover:bg-white'
                        }`}
                      >
                        {t === 'shipping' ? 'Envío' : 'Facturación'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="addr-alias" className="mb-1.5 block text-xs font-medium text-gray-600">
                    Alias <span className="font-normal text-gray-400">(opcional)</span>
                  </Label>
                  <Input id="addr-alias" value={form.alias} onChange={(e) => set({ alias: e.target.value })} placeholder="Casa, Oficina…" maxLength={50} />
                </div>
              </div>

              {/* País */}
              <div>
                <Label className="mb-1.5 block text-xs font-medium text-gray-600">País</Label>
                <SearchableSelect
                  options={countries.map((c) => ({ value: c.id, label: c.name }))}
                  value={form.countryId}
                  // Al cambiar de país cambian los campos y el catálogo de estados.
                  onChange={(v) => set({ countryId: v, stateName: '' })}
                  showAllOption={false}
                  placeholder="Elegir país…"
                  className="w-full"
                />
              </div>

              {/* Campos del país */}
              <div className="grid gap-4 sm:grid-cols-2">
                {addressForm.fields.map((f) => (
                  <div key={f.key} className={f.half ? '' : 'sm:col-span-2'}>
                    <Label htmlFor={`addr-${f.key}`} className="mb-1.5 block text-xs font-medium text-gray-600">
                      {f.label}
                      {f.required && ' *'}
                    </Label>
                    <Input
                      id={`addr-${f.key}`}
                      value={form.values[f.key] ?? ''}
                      onChange={(e) => setValue(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      maxLength={f.maxLength}
                    />
                    {f.patternHint && <p className="mt-1 text-[11px] text-gray-400">{f.patternHint}</p>}
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block text-xs font-medium text-gray-600">{addressForm.stateLabel} *</Label>
                  {stateOptions.length > 0 ? (
                    <SearchableSelect
                      options={stateOptions}
                      value={form.stateName}
                      onChange={(v) => set({ stateName: v })}
                      showAllOption={false}
                      placeholder={statesQ.isLoading ? 'Cargando…' : `Elegir ${addressForm.stateLabel.toLowerCase()}…`}
                      className="w-full"
                    />
                  ) : (
                    <Input
                      value={form.stateName}
                      onChange={(e) => set({ stateName: e.target.value })}
                      placeholder={statesQ.isLoading ? 'Cargando catálogo…' : addressForm.stateLabel}
                      maxLength={100}
                    />
                  )}
                </div>
                {!hasReferenceField && (
                  <div className="sm:col-span-2">
                    <Label htmlFor="addr-reference" className="mb-1.5 block text-xs font-medium text-gray-600">
                      Referencias <span className="font-normal text-gray-400">(opcional)</span>
                    </Label>
                    <Input
                      id="addr-reference"
                      value={form.values.reference ?? ''}
                      onChange={(e) => setValue('reference', e.target.value)}
                      maxLength={255}
                    />
                  </div>
                )}
              </div>

              {/* Teléfono y predeterminada */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-gray-600">
                    Teléfono de contacto <span className="font-normal text-gray-400">(opcional)</span>
                  </Label>
                  <PhoneInput value={form.phone} onChange={(e164) => set({ phone: e164 })} disabled={busy} />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
                    <Checkbox checked={form.isDefault} onCheckedChange={(v) => set({ isDefault: v === true })} />
                    Predeterminada para {form.type === 'shipping' ? 'envíos' : 'facturación'}
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                <div className="flex flex-wrap gap-2">
                  {isEdit && !form.isDefault && (
                    <Button type="button" variant="outline" className="gap-1" onClick={() => makeDefault.mutate()} disabled={busy}>
                      <StarIcon className="h-4 w-4" />
                      Hacer predeterminada
                    </Button>
                  )}
                  {isEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => {
                        if (window.confirm('¿Eliminar esta dirección? No se puede deshacer.')) remove.mutate();
                      }}
                      disabled={busy}
                    >
                      <TrashIcon className="h-4 w-4" />
                      Eliminar
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={submit} disabled={busy}>
                    {save.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Agregar dirección'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
