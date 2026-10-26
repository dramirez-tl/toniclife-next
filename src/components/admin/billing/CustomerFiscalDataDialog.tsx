'use client';

// CustomerFiscalDataDialog - Ver y editar los datos fiscales de un
// distribuidor sin salir de la captura (factura libre sin ticket, 26-oct-2026).
// Lee GET billing/customers/:id/fiscal-data (siempre una fila; RFC vacío =
// todavía sin datos) y guarda con PUT billing/fiscal-data/:customerId
// (billing:manage; misma ruta y validaciones que Facturación › Datos Fiscales:
// RFC ↔ régimen ↔ uso, CP de 5 dígitos, y el API cruza el RFC con el SAT vía
// PAC cuando responde). Los catálogos de régimen y uso vienen del API según
// el tipo de persona del RFC y el régimen elegido.

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
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
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  useCfdiUses,
  useFiscalDataByCustomer,
  useFiscalRegimes,
  useUpdateFiscalData,
  useValidateRfc,
} from '@/hooks/useBilling';
import { rfcPersonType, satCatalogOptions, type FiscalData } from '@/types/billing';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerNumber: string;
  customerName: string;
  /** Tras guardar: la ficha ya tiene RFC y régimen (sirve como receptor). */
  onSaved?: () => void;
}

interface FormState {
  rfc: string;
  legalName: string;
  taxRegime: string;
  cfdiUse: string;
  postalCode: string;
  email: string;
}

const RFC_RE = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/;

const formFrom = (d: FiscalData): FormState => ({
  rfc: d.rfc ?? '',
  legalName: d.legalName ?? '',
  taxRegime: d.taxRegime ?? '',
  cfdiUse: d.defaultCfdiUse ?? '',
  postalCode: d.postalCode ?? '',
  email: d.email ?? '',
});

export function CustomerFiscalDataDialog({ open, onOpenChange, customerId, customerNumber, customerName, onSaved }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Datos fiscales · <span className="font-mono text-base text-gray-500">#{customerNumber}</span> {customerName}
          </DialogTitle>
          <DialogDescription>
            Son los de su ficha (Facturación › Datos Fiscales): lo que guardes aquí sirve para esta factura y las siguientes.
          </DialogDescription>
        </DialogHeader>
        {/* Se monta solo abierto y por distribuidor: cada apertura carga la ficha fresca. */}
        {open && <FiscalDataEditor key={customerId} customerId={customerId} onClose={() => onOpenChange(false)} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function FiscalDataEditor({ customerId, onClose, onSaved }: { customerId: string; onClose: () => void; onSaved?: () => void }) {
  const { data, isLoading, isError } = useFiscalDataByCustomer(customerId);
  const current = data?.[0] ?? null;
  // La ficha se carga UNA vez al llegar (estado derivado durante el render);
  // un refetch posterior (foco de ventana) no pisa lo que se está editando.
  const [form, setForm] = useState<FormState | null>(null);
  if (current && form === null) setForm(formFrom(current));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const update = useUpdateFiscalData();
  const validateRfc = useValidateRfc();
  const { data: regimeCatalog } = useFiscalRegimes(form ? (rfcPersonType(form.rfc) ?? undefined) : undefined);
  const { data: cfdiUseCatalog } = useCfdiUses(form?.taxRegime || undefined);

  if (isLoading || (!form && !isError)) {
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-gray-500">
        <Loader2 className="size-4 animate-spin" />
        Cargando la ficha…
      </p>
    );
  }
  if (!form) {
    return <p className="py-6 text-sm text-red-700">No se pudo cargar la ficha del distribuidor.</p>;
  }

  const hasData = !!current?.rfc;
  const set = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!RFC_RE.test(form.rfc.trim().toUpperCase())) e.rfc = 'RFC de 12 o 13 caracteres';
    if (form.legalName.trim().length < 3) e.legalName = 'Nombre o razón social como en el SAT';
    if (!form.taxRegime) e.taxRegime = 'Elige el régimen';
    if (!form.cfdiUse) e.cfdiUse = 'Elige el uso de CFDI';
    if (!/^\d{5}$/.test(form.postalCode.trim())) e.postalCode = 'CP de 5 dígitos';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Correo inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    try {
      await update.mutateAsync({
        id: customerId,
        data: {
          rfc: form.rfc.trim().toUpperCase(),
          legalName: form.legalName.trim(),
          fiscalRegime: form.taxRegime,
          cfdiUse: form.cfdiUse,
          postalCode: form.postalCode.trim(),
          email: form.email.trim() || undefined,
        },
      });
      onSaved?.();
      onClose();
    } catch {
      // El hook ya mostró el motivo (RFC que el SAT no reconoce, uso incompatible…).
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 text-xs">
        {!hasData ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
            <ExclamationTriangleIcon className="h-4 w-4" />
            Todavía sin datos fiscales: captúralos
          </span>
        ) : current?.isValidated ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
            <CheckCircleIcon className="h-4 w-4" />
            RFC validado ante el SAT
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-600">
            Con datos · RFC sin validar
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="RFC" error={errors.rfc}>
          <div className="flex gap-2">
            <Input
              value={form.rfc}
              onChange={(e) => set({ rfc: e.target.value.toUpperCase() })}
              maxLength={13}
              placeholder="XAXX010101000"
              className="font-mono uppercase"
              autoFocus={!hasData}
            />
            <Button type="button" variant="outline" onClick={() => void validateRfc.mutateAsync(form.rfc.trim().toUpperCase()).catch(() => undefined)} disabled={!form.rfc.trim() || validateRfc.isPending}>
              {validateRfc.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
              Validar
            </Button>
          </div>
        </Field>
        <Field label="Código postal fiscal" error={errors.postalCode}>
          <Input value={form.postalCode} onChange={(e) => set({ postalCode: e.target.value.replace(/\D/g, '').slice(0, 5) })} maxLength={5} inputMode="numeric" className="font-mono" placeholder="36500" />
        </Field>
        <Field label="Nombre o razón social (como en el SAT, sin régimen de sociedad)" error={errors.legalName} className="sm:col-span-2">
          <Input value={form.legalName} onChange={(e) => set({ legalName: e.target.value })} maxLength={254} />
        </Field>
        <Field label="Régimen fiscal" error={errors.taxRegime}>
          <SearchableSelect
            options={satCatalogOptions(regimeCatalog)}
            value={form.taxRegime}
            // Al cambiar el régimen el uso se vacía: los usos válidos dependen de él.
            onChange={(v) => set({ taxRegime: v, cfdiUse: '' })}
            showAllOption={false}
            placeholder="Elegir régimen…"
            className="w-full"
          />
        </Field>
        <Field label="Uso de CFDI" error={errors.cfdiUse}>
          <SearchableSelect
            options={satCatalogOptions(cfdiUseCatalog)}
            value={form.cfdiUse}
            onChange={(v) => set({ cfdiUse: v })}
            showAllOption={false}
            placeholder={form.taxRegime ? 'Elegir uso…' : 'Primero el régimen'}
            className="w-full"
          />
        </Field>
        <Field label="Correo fiscal (opcional, para enviar el CFDI)" error={errors.email} className="sm:col-span-2">
          <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={update.isPending}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => void submit()} disabled={update.isPending}>
          {update.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
          Guardar datos fiscales
        </Button>
      </DialogFooter>
    </>
  );
}

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
