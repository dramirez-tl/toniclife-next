'use client';

// Pestaña Emisor: datos de TONIC WORLD CENTER que van en el CFDI.
//
// El GET devuelve el RFC ENMASCARADO (TWC****8R6): por eso el campo RFC
// arranca vacío y Contabilidad lo escribe completo para confirmarlo con PUT.
// En Fase 1 el CFDI sigue tomando el emisor del entorno; si lo guardado no
// coincide (`envRfcMatches === false`) el API lo reporta como bloqueador.

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useEmitter, useFiscalRegimes, useUpdateEmitter } from '@/hooks/useBilling';
import { billingErrorMessage } from '@/lib/billing-error';
import {
  isValidEmail,
  isValidRfc,
  isValidZip,
  rfcPersonType,
  satCatalogOptions,
  type EmitterConfig,
} from '@/types/billing';

interface FormState {
  legalName: string;
  rfc: string;
  taxRegimeCode: string;
  expeditionZip: string;
  fiscalZip: string;
  email: string;
  phone: string;
}

function fromEmitter(e: EmitterConfig): FormState {
  return {
    legalName: e.legalName ?? '',
    rfc: '',
    taxRegimeCode: e.taxRegimeCode ?? '',
    expeditionZip: e.expeditionZip ?? '',
    fiscalZip: e.fiscalZip ?? '',
    email: e.email ?? '',
    phone: e.phone ?? '',
  };
}

const SOURCE_TEXT: Record<EmitterConfig['source'], string> = {
  db: 'Guardado en la base de datos (tenant_config).',
  env: 'Tomado del entorno del API (FACTURAMA_ISSUER_RFC): aún no se ha confirmado aquí.',
  none: 'Sin configurar: ni en la base de datos ni en el entorno.',
};

export function EmitterTab({ canManage }: { canManage: boolean }) {
  const { data, isLoading, error, refetch } = useEmitter();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span className="text-destructive">
            {billingErrorMessage(error, 'No se pudo cargar el emisor')}
          </span>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  // El formulario se monta con el emisor ya cargado: su estado inicial sale de
  // ahí y no se pisa con cada refetch (el usuario no pierde lo que teclea).
  return <EmitterForm canManage={canManage} emitter={data} />;
}

function EmitterForm({ canManage, emitter }: { canManage: boolean; emitter: EmitterConfig }) {
  const update = useUpdateEmitter();
  const { data: regimes, isLoading: loadingRegimes } = useFiscalRegimes('moral');
  const regimeOptions = useMemo(() => satCatalogOptions(regimes), [regimes]);

  const [form, setForm] = useState<FormState>(() => fromEmitter(emitter));
  const [touched, setTouched] = useState(false);

  const errors = {
    legalName: !form.legalName.trim() ? 'La razón social es obligatoria' : '',
    rfc: !form.rfc.trim()
      ? 'Escribe el RFC completo para confirmarlo'
      : !isValidRfc(form.rfc) || rfcPersonType(form.rfc) !== 'moral'
        ? 'Debe ser un RFC de persona moral (12 caracteres)'
        : '',
    taxRegimeCode: !form.taxRegimeCode ? 'Elige el régimen (persona moral)' : '',
    expeditionZip: !isValidZip(form.expeditionZip) ? 'CP de expedición de 5 dígitos' : '',
    fiscalZip: form.fiscalZip.trim() && !isValidZip(form.fiscalZip) ? 'CP fiscal de 5 dígitos' : '',
    email: form.email.trim() && !isValidEmail(form.email) ? 'Correo con formato inválido' : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const showError = (key: keyof typeof errors) => (touched ? errors[key] : '');

  const submit = async () => {
    setTouched(true);
    if (hasErrors) return;
    try {
      await update.mutateAsync({
        legalName: form.legalName.trim(),
        rfc: form.rfc.trim().toUpperCase(),
        taxRegimeCode: form.taxRegimeCode,
        expeditionZip: form.expeditionZip.trim(),
        fiscalZip: form.fiscalZip.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      setTouched(false);
    } catch {
      // El hook ya avisó con billingErrorMessage.
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
        <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#3E667D]" aria-hidden />
        <div>
          <p>
            <span className="font-medium">Origen:</span> {SOURCE_TEXT[emitter.source]}
          </p>
          <p className="text-muted-foreground">
            RFC actual: <span className="font-mono">{emitter.rfcMasked ?? '—'}</span>
            {emitter.sandboxMode ? ' · El PAC está en modo pruebas (sandbox).' : ''}
            {' '}En esta fase el CFDI sigue tomando el emisor del entorno; en la Fase 2 se toma de aquí.
          </p>
        </div>
      </div>

      {emitter.envRfcMatches === false && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alert">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
          <p>
            El RFC guardado aquí <strong>no coincide</strong> con el del entorno del API
            (FACTURAMA_ISSUER_RFC). Mientras no coincidan, la facturación queda bloqueada:
            corrige uno de los dos con Sistemas.
          </p>
        </div>
      )}

      {emitter.pacRfcMatches === false && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alert">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
          <p>
            El RFC configurado no coincide con la cuenta de Facturama
            {emitter.pacLegalName ? (
              <>
                {' '}(registrada como <strong>{emitter.pacLegalName}</strong>)
              </>
            ) : null}
            . El PAC timbraría a nombre de otro emisor: revisa las credenciales con Sistemas.
          </p>
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="em-legal-name">Razón social *</Label>
              <Input
                id="em-legal-name"
                value={form.legalName}
                onChange={(e) => setForm((p) => ({ ...p, legalName: e.target.value.toUpperCase() }))}
                className="uppercase"
                disabled={!canManage}
                aria-invalid={!!showError('legalName')}
                aria-describedby={showError('legalName') ? 'em-legal-name-error' : undefined}
                placeholder="TONIC WORLD CENTER"
              />
              {showError('legalName') && (
                <p id="em-legal-name-error" className="mt-1 text-xs text-red-600" role="alert">
                  {errors.legalName}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="em-rfc">RFC (persona moral) *</Label>
              <Input
                id="em-rfc"
                value={form.rfc}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    rfc: e.target.value.toUpperCase().replace(/[^A-ZÑ&0-9]/g, '').slice(0, 12),
                  }))
                }
                maxLength={12}
                autoComplete="off"
                className="font-mono uppercase"
                disabled={!canManage}
                aria-invalid={!!showError('rfc')}
                aria-describedby={showError('rfc') ? 'em-rfc-hint em-rfc-error' : 'em-rfc-hint'}
                placeholder={emitter.rfcMasked ?? 'TWC000000XX0'}
              />
              <p id="em-rfc-hint" className="mt-1 text-xs text-muted-foreground">
                Se guarda completo pero solo se muestra enmascarado. Escríbelo entero cada vez que guardes.
              </p>
              {showError('rfc') && (
                <p id="em-rfc-error" className="mt-1 text-xs text-red-600" role="alert">
                  {errors.rfc}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="em-regime">Régimen fiscal *</Label>
              <SearchableSelect
                id="em-regime"
                aria-invalid={!!showError('taxRegimeCode')}
                aria-describedby={showError('taxRegimeCode') ? 'em-regime-error' : undefined}
                options={regimeOptions}
                value={form.taxRegimeCode}
                onChange={(val) => setForm((p) => ({ ...p, taxRegimeCode: val }))}
                showAllOption={false}
                placeholder={loadingRegimes ? 'Cargando regímenes…' : 'Elige el régimen'}
                disabled={!canManage || loadingRegimes}
              />
              {showError('taxRegimeCode') && (
                <p id="em-regime-error" className="mt-1 text-xs text-red-600" role="alert">
                  {errors.taxRegimeCode}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="em-expedition-zip">CP de expedición *</Label>
              <Input
                id="em-expedition-zip"
                value={form.expeditionZip}
                onChange={(e) =>
                  setForm((p) => ({ ...p, expeditionZip: e.target.value.replace(/\D/g, '').slice(0, 5) }))
                }
                inputMode="numeric"
                maxLength={5}
                className="font-mono"
                disabled={!canManage}
                aria-invalid={!!showError('expeditionZip')}
                aria-describedby={
                  showError('expeditionZip')
                    ? 'em-expedition-zip-hint em-expedition-zip-error'
                    : 'em-expedition-zip-hint'
                }
                placeholder="37000"
              />
              <p id="em-expedition-zip-hint" className="mt-1 text-xs text-muted-foreground">
                Lugar de expedición por defecto del CFDI (cada sucursal puede tener el suyo).
              </p>
              {showError('expeditionZip') && (
                <p id="em-expedition-zip-error" className="mt-1 text-xs text-red-600" role="alert">
                  {errors.expeditionZip}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="em-fiscal-zip">CP del domicilio fiscal</Label>
              <Input
                id="em-fiscal-zip"
                value={form.fiscalZip}
                onChange={(e) =>
                  setForm((p) => ({ ...p, fiscalZip: e.target.value.replace(/\D/g, '').slice(0, 5) }))
                }
                inputMode="numeric"
                maxLength={5}
                className="font-mono"
                disabled={!canManage}
                aria-invalid={!!showError('fiscalZip')}
                aria-describedby={showError('fiscalZip') ? 'em-fiscal-zip-error' : undefined}
                placeholder="37000"
              />
              {showError('fiscalZip') && (
                <p id="em-fiscal-zip-error" className="mt-1 text-xs text-red-600" role="alert">
                  {errors.fiscalZip}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="em-email">Correo de facturación</Label>
              <Input
                id="em-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                disabled={!canManage}
                aria-invalid={!!showError('email')}
                aria-describedby={showError('email') ? 'em-email-error' : undefined}
                placeholder="facturacion@toniclife.com"
              />
              {showError('email') && (
                <p id="em-email-error" className="mt-1 text-xs text-red-600" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="em-phone">Teléfono</Label>
              <Input
                id="em-phone"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                disabled={!canManage}
                placeholder="477 000 0000"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            {!canManage && (
              <span className="mr-auto text-xs text-muted-foreground">
                Solo lectura: necesitas el permiso billing:manage para guardar.
              </span>
            )}
            <Button onClick={() => void submit()} disabled={!canManage || update.isPending}>
              {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar emisor
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
