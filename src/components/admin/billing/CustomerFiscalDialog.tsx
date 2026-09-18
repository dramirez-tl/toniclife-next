'use client';

// Datos fiscales de un cliente desde Preparación fiscal (Contabilidad).
//
// El RFC manda: cuando es VÁLIDO, su longitud decide el tipo de persona
// (12 moral / 13 física) y con eso se filtran los regímenes del catálogo;
// mientras se teclea (longitud intermedia) no se filtra ni se limpia nada.
// El régimen y el uso solo se vacían cuando el tipo de persona realmente
// cambia (física ↔ moral) o cuando el usuario cambia el régimen a mano.
// El régimen filtra los usos de CFDI compatibles (sat_cfdi_use_regimes); si
// el uso guardado no está entre ellos se vacía y se avisa, para que el
// faltante `incompatible_use` se vea y se corrija.
//
// Guarda con PUT /billing/fiscal-data/:customerId (validación fuerte en el
// API: formato de RFC, régimen aplicable, uso compatible, CP, correo).

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useCfdiUses, useFiscalRegimes, useUpdateCustomerFiscal } from '@/hooks/useBilling';
import {
  CUSTOMER_ISSUE_INFO,
  GENERIC_RFCS,
  isValidEmail,
  isValidRfc,
  isValidZip,
  rfcPersonType,
  satCatalogOptions,
  type PersonType,
  type ReadinessCustomerRow,
  type SatCatalogItem,
} from '@/types/billing';

interface FormState {
  rfc: string;
  legalName: string;
  taxRegime: string;
  cfdiUse: string;
  zip: string;
  email: string;
}

function fromRow(row: ReadinessCustomerRow): FormState {
  return {
    rfc: (row.rfc ?? '').toUpperCase(),
    legalName: row.legalName ?? '',
    taxRegime: row.taxRegime ?? '',
    cfdiUse: row.cfdiUseCode ?? '',
    zip: row.fiscalZipCode ?? '',
    email: row.fiscalEmail ?? row.email ?? '',
  };
}

function isGenericRfc(rfc: string): boolean {
  return GENERIC_RFCS.includes(rfc.trim().toUpperCase());
}

export function CustomerFiscalDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: ReadinessCustomerRow | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {/* El formulario se monta por cliente (key): su estado inicial sale de
            la fila y se descarta al cerrar, sin efectos de sincronización. */}
        {customer && (
          <CustomerFiscalForm
            key={customer.customerId}
            customer={customer}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CustomerFiscalForm({
  customer,
  onClose,
}: {
  customer: ReadinessCustomerRow;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => fromRow(customer));
  const [touched, setTouched] = useState(false);
  // Uso guardado que se vació por no ser compatible con el régimen; el aviso
  // se muestra hasta que se elija otro uso o cambie el régimen.
  const [clearedUse, setClearedUse] = useState<string | null>(null);
  const update = useUpdateCustomerFiscal();

  const rfcOk = isValidRfc(form.rfc);
  const isGeneric = isGenericRfc(form.rfc);
  // El tipo de persona solo cuenta con un RFC válido: a media captura la
  // longitud no dice nada y filtrar por ella borraba el régimen al editar.
  const personType = rfcOk ? rfcPersonType(form.rfc) : null;

  const { data: regimes, isLoading: loadingRegimes } = useFiscalRegimes(personType ?? undefined);
  const { data: uses, isLoading: loadingUses } = useCfdiUses(form.taxRegime || undefined);

  const regimeOptions = useMemo(() => satCatalogOptions(regimes), [regimes]);
  const useOptions = useMemo(() => satCatalogOptions(uses), [uses]);

  // Régimen y uso se limpian SOLO cuando el tipo de persona del último RFC
  // válido cambia de verdad (física ↔ moral). Ajuste de estado durante el
  // render, como recomienda React para reaccionar a un dato derivado. El RFC
  // genérico ya trae 616/S01 fijados por onRfcChange y no se tocan.
  const [lastValidPersonType, setLastValidPersonType] = useState<PersonType | null>(personType);
  if (personType && personType !== lastValidPersonType) {
    const changed = lastValidPersonType !== null;
    setLastValidPersonType(personType);
    if (changed && !isGeneric) {
      setClearedUse(null);
      setForm((prev) => ({ ...prev, taxRegime: '', cfdiUse: '' }));
    }
  }

  // Uso guardado que no está entre los compatibles con el régimen: se vacía y
  // se avisa (así el faltante `incompatible_use` se ve y se corrige). `uses`
  // siempre corresponde al régimen actual (la query cambia de llave con él).
  // Arranca en undefined a propósito: si el catálogo ya estaba en caché llega
  // en el primer render y la revisión tiene que correr también entonces.
  const [seenUses, setSeenUses] = useState<SatCatalogItem[] | undefined>(undefined);
  if (uses !== seenUses) {
    setSeenUses(uses);
    if (uses && form.cfdiUse && !uses.some((u) => (u.code || u.Value) === form.cfdiUse)) {
      setClearedUse(form.cfdiUse);
      setForm((prev) => ({ ...prev, cfdiUse: '' }));
    }
  }

  // Régimen guardado que no aplica al tipo de persona del RFC (dato heredado):
  // no se borra solo, se marca para que Contabilidad elija otro.
  const regimeNotApplicable =
    !!form.taxRegime &&
    !!personType &&
    !!regimes &&
    !regimes.some((r) => (r.code || r.Value) === form.taxRegime);

  const onRfcChange = (raw: string) => {
    const rfc = raw.toUpperCase().replace(/[^A-ZÑ&0-9]/g, '').slice(0, 13);
    setForm((prev) => {
      // RFC genérico ⇒ régimen 616 y uso S01 (regla del SAT que el API también aplica).
      if (isGenericRfc(rfc)) return { ...prev, rfc, taxRegime: '616', cfdiUse: 'S01' };
      return { ...prev, rfc };
    });
  };

  const errors = {
    rfc: !form.rfc.trim()
      ? 'El RFC es obligatorio'
      : !rfcOk
        ? 'Formato inválido: 12 caracteres (persona moral) o 13 (persona física)'
        : '',
    legalName: !form.legalName.trim()
      ? 'La razón social es obligatoria (como en la constancia de situación fiscal)'
      : '',
    taxRegime: !form.taxRegime
      ? 'Elige el régimen fiscal del cliente'
      : regimeNotApplicable
        ? 'El régimen guardado no aplica al tipo de persona del RFC; elige otro'
        : '',
    cfdiUse: !form.cfdiUse ? 'Elige un uso compatible con el régimen' : '',
    zip: !isValidZip(form.zip) ? 'El CP fiscal debe tener 5 dígitos' : '',
    email: form.email.trim() && !isValidEmail(form.email) ? 'Correo con formato inválido' : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const showError = (key: keyof typeof errors) => (touched ? errors[key] : '');
  // Estos dos se muestran aunque no se haya intentado guardar: son datos
  // heredados que el usuario no tecleó y necesita ver de inmediato.
  const regimeMessage = regimeNotApplicable ? errors.taxRegime : showError('taxRegime');
  const useMessage = clearedUse
    ? 'El uso de CFDI guardado no es compatible con el régimen; elige otro'
    : showError('cfdiUse');

  const submit = async () => {
    setTouched(true);
    if (hasErrors) return;
    try {
      await update.mutateAsync({
        customerId: customer.customerId,
        data: {
          rfc: form.rfc.trim().toUpperCase(),
          legalName: form.legalName.trim(),
          fiscalRegime: form.taxRegime,
          postalCode: form.zip.trim(),
          cfdiUse: form.cfdiUse,
          email: form.email.trim() || undefined,
        },
      });
      onClose();
    } catch {
      // El hook ya mostró el error con billingErrorMessage.
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Datos fiscales del cliente</DialogTitle>
        <DialogDescription>
          <span className="font-medium text-foreground">{customer.name}</span>
          {customer.code ? <span className="font-mono"> · {customer.code}</span> : null}. Captura lo
          que aparece en su constancia de situación fiscal.
        </DialogDescription>
      </DialogHeader>

      {customer.issues.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          {customer.issues.map((issue) => (
            <li key={issue}>
              <span className="font-medium">{CUSTOMER_ISSUE_INFO[issue]?.label ?? issue}:</span>{' '}
              {CUSTOMER_ISSUE_INFO[issue]?.why}
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="cf-rfc">RFC *</Label>
          <Input
            id="cf-rfc"
            value={form.rfc}
            onChange={(e) => onRfcChange(e.target.value)}
            maxLength={13}
            autoComplete="off"
            className="font-mono uppercase"
            aria-invalid={!!showError('rfc')}
            aria-describedby={showError('rfc') ? 'cf-rfc-hint cf-rfc-error' : 'cf-rfc-hint'}
            placeholder="XAXX010101000"
          />
          <p id="cf-rfc-hint" className="mt-1 text-xs text-muted-foreground">
            {personType === 'moral'
              ? 'Persona moral (12 caracteres).'
              : personType === 'fisica'
                ? 'Persona física (13 caracteres).'
                : 'La longitud del RFC define los regímenes disponibles.'}
          </p>
          {showError('rfc') && (
            <p id="cf-rfc-error" className="mt-1 text-xs text-red-600" role="alert">
              {errors.rfc}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="cf-legal-name">Razón social / nombre fiscal *</Label>
          <Input
            id="cf-legal-name"
            value={form.legalName}
            onChange={(e) => setForm((prev) => ({ ...prev, legalName: e.target.value.toUpperCase() }))}
            autoComplete="off"
            className="uppercase"
            aria-invalid={!!showError('legalName')}
            aria-describedby={showError('legalName') ? 'cf-legal-name-error' : undefined}
            placeholder="Como en la constancia, sin S.A. DE C.V."
          />
          {showError('legalName') && (
            <p id="cf-legal-name-error" className="mt-1 text-xs text-red-600" role="alert">
              {errors.legalName}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="cf-regime">Régimen fiscal *</Label>
          <SearchableSelect
            id="cf-regime"
            aria-invalid={!!regimeMessage}
            aria-describedby={regimeMessage ? 'cf-regime-error' : undefined}
            options={regimeOptions}
            value={form.taxRegime}
            onChange={(val) => {
              setClearedUse(null);
              setForm((prev) => ({ ...prev, taxRegime: val, cfdiUse: '' }));
            }}
            showAllOption={false}
            placeholder={loadingRegimes ? 'Cargando regímenes…' : 'Elige el régimen'}
            disabled={loadingRegimes || isGeneric}
          />
          {regimeMessage && (
            <p id="cf-regime-error" className="mt-1 text-xs text-red-600" role="alert">
              {regimeMessage}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="cf-use">Uso de CFDI *</Label>
          <SearchableSelect
            id="cf-use"
            aria-invalid={!!useMessage}
            aria-describedby={useMessage ? 'cf-use-error' : undefined}
            options={useOptions}
            value={form.cfdiUse}
            onChange={(val) => {
              setClearedUse(null);
              setForm((prev) => ({ ...prev, cfdiUse: val }));
            }}
            showAllOption={false}
            placeholder={
              !form.taxRegime
                ? 'Primero elige el régimen'
                : loadingUses
                  ? 'Cargando usos…'
                  : 'Elige el uso'
            }
            disabled={!form.taxRegime || loadingUses || isGeneric}
          />
          {useMessage && (
            <p id="cf-use-error" className="mt-1 text-xs text-red-600" role="alert">
              {useMessage}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="cf-zip">CP fiscal *</Label>
          <Input
            id="cf-zip"
            value={form.zip}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, zip: e.target.value.replace(/\D/g, '').slice(0, 5) }))
            }
            inputMode="numeric"
            maxLength={5}
            className="font-mono"
            aria-invalid={!!showError('zip')}
            aria-describedby={showError('zip') ? 'cf-zip-error' : undefined}
            placeholder="37000"
          />
          {showError('zip') && (
            <p id="cf-zip-error" className="mt-1 text-xs text-red-600" role="alert">
              {errors.zip}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="cf-email">Correo fiscal</Label>
          <Input
            id="cf-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            autoComplete="off"
            aria-invalid={!!showError('email')}
            aria-describedby={showError('email') ? 'cf-email-error' : undefined}
            placeholder="facturas@cliente.com"
          />
          {showError('email') && (
            <p id="cf-email-error" className="mt-1 text-xs text-red-600" role="alert">
              {errors.email}
            </p>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={update.isPending}>
          Cancelar
        </Button>
        <Button onClick={() => void submit()} disabled={update.isPending}>
          {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </>
  );
}
