'use client';

// TreasurySettingsTab — ajustes `treasury.*` (contrato §4.7, mig 142 §10).
// Solo super_admin (GET/PATCH /settings/treasury). Todo es fail-closed por
// defecto: el corte v2 (first_v2_payout_period_code) en null = nada aprobable
// ni pagable; fijarlo exige teclear el código (ConfirmDialog con confirmText)
// y se hace SOLO después de marcar los periodos anteriores como pagados por
// el sistema anterior (script sql/fixes/corte-legacy-comisiones.sql).

import { useId, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowPathIcon, ExclamationTriangleIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useTreasurySettings, useUpdateTreasurySettings } from '@/hooks/useTreasury';
import { treasuryErrorMessage } from '@/components/admin/treasury/treasury-error';
import { detectBankFromClabe, isValidClabe } from '@/lib/mx-ids';
import {
  TREASURY_SETTINGS_DEFAULTS,
  type PayoutCurrencyPolicy,
  type TreasurySettings,
  type TreasurySettingsPatch,
} from '@/types/treasury';

const PERIOD_CODE_RE = /^\d{2}-\d{4}$/;

type BoolKey = {
  [K in keyof TreasurySettings]: TreasurySettings[K] extends boolean ? K : never;
}[keyof TreasurySettings];

const BOOL_SETTINGS: Array<{ key: BoolKey; label: string; hint: string; risky?: boolean }> = [
  {
    key: 'requireValidatedData',
    label: 'Exigir datos validados para aprobar/lotear/pagar',
    hint: 'false = solo advierte y guarda los bloqueadores en readiness_snapshot. Recomendado: activo.',
    risky: true,
  },
  {
    key: 'requireTaxRegimeMx',
    label: 'Exigir régimen fiscal de comisión a MX/FN',
    hint: 'Sin régimen no se aprueba (TRS_REGIME_MISSING); nunca SIN_IMPUESTO por omisión.',
    risky: true,
  },
  {
    key: 'notifyDistributorOnReview',
    label: 'Avisar al distribuidor al validar/rechazar documentos',
    hint: 'In-app + correo (WhatsApp solo con plantilla aprobada).',
  },
  {
    key: 'notifyDistributorOnPayment',
    label: 'Avisar al distribuidor al registrar el pago',
    hint: 'Plantilla commission-paid.',
  },
  {
    key: 'notifyDistributorOnWithholding',
    label: 'Avisar al crear/pausar/cancelar/liquidar un convenio',
    hint: 'Decisión C-6 del cliente.',
  },
  {
    key: 'distributorSeesAgreements',
    label: 'El distribuidor ve el detalle de sus convenios',
    hint: 'Sección "Convenios con la empresa" en Datos para Comisiones (decisión C-6).',
  },
  {
    key: 'blockDuplicateIds',
    label: 'Rechazar RFC/CURP/cuenta ya usados por otro distribuidor',
    hint: 'false = solo alerta en la revisión de Tesorería.',
  },
];

export function TreasurySettingsTab() {
  const settingsQuery = useTreasurySettings();
  const update = useUpdateTreasurySettings();
  const settings = settingsQuery.data ?? TREASURY_SETTINGS_DEFAULTS;

  if (settingsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (settingsQuery.isError) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span className="text-destructive">
            {treasuryErrorMessage(
              settingsQuery.error,
              'No se pudieron cargar los ajustes de Tesorería (GET /settings/treasury)',
            )}
          </span>
          <Button variant="outline" size="sm" onClick={() => void settingsQuery.refetch()}>
            <ArrowPathIcon className="mr-2 h-4 w-4" aria-hidden />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const save = async (patch: TreasurySettingsPatch, okMessage: string) => {
    try {
      await update.mutateAsync(patch);
      toast.success(okMessage);
      return true;
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo guardar el ajuste'));
      return false;
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Ajustes <code className="font-mono">treasury.*</code> de comisiones y dispersión. Todos son
        fail-closed: ante la duda no se aprueba ni se paga. Solo el Super Administrador los cambia y
        cada cambio queda en auditoría.
      </p>

      <CutoverCard settings={settings} onSave={save} isPending={update.isPending} />
      <PolicyCard settings={settings} onSave={save} isPending={update.isPending} />
      <SwitchesCard settings={settings} onSave={save} isPending={update.isPending} />
      <NumbersCard settings={settings} onSave={save} isPending={update.isPending} />
    </div>
  );
}

type SaveFn = (patch: TreasurySettingsPatch, okMessage: string) => Promise<boolean>;

// ─────────────────────────────────────────────────────────────────────────────
// Corte v2 (first_v2_payout_period_code)
// ─────────────────────────────────────────────────────────────────────────────

function CutoverCard({
  settings,
  onSave,
  isPending,
}: {
  settings: TreasurySettings;
  onSave: SaveFn;
  isPending: boolean;
}) {
  const [draft, setDraft] = useState(settings.firstV2PayoutPeriodCode ?? '');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const inputId = useId();
  const helpId = `${inputId}-help`;
  const current = settings.firstV2PayoutPeriodCode;
  const valid = PERIOD_CODE_RE.test(draft.trim());
  const changed = draft.trim() !== (current ?? '');

  return (
    <Card className={current ? 'border-emerald-200' : 'border-amber-300 bg-amber-50/40'}>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                current ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              <LockClosedIcon className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-foreground">Corte v2: primer periodo pagable desde v2</h3>
                <Badge variant={current ? 'success' : 'warning'}>
                  {current ? `Fijado en ${current}` : 'Sin fijar · nada aprobable'}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Código <code className="font-mono">MM-YYYY</code> del primer periodo 26→25 que se
                aprueba y paga desde v2. Mientras esté vacío, aprobar/pagar responde{' '}
                <code className="font-mono">TRS_CUTOVER_NOT_SET</code>. Fíjalo SOLO después de
                ejecutar el corte del sistema anterior (marcar P≤corte como pagadas por legacy) para
                no pagar dos veces.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor={inputId}>Periodo de corte (MM-YYYY)</Label>
            <Input
              id={inputId}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="09-2026"
              inputMode="numeric"
              maxLength={7}
              aria-describedby={helpId}
              aria-invalid={draft.length > 0 && !valid}
              disabled={isPending}
            />
            <p id={helpId} className="text-xs text-muted-foreground">
              Debe existir en commission_periods y estar cerrado; el API lo verifica.
            </p>
          </div>
          <Button onClick={() => setConfirmOpen(true)} disabled={!valid || !changed || isPending}>
            Fijar corte
          </Button>
          {current && (
            <Button variant="outline" onClick={() => setClearOpen(true)} disabled={isPending}>
              Quitar (cerrar)
            </Button>
          )}
        </div>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`Fijar el corte v2 en ${draft.trim()}`}
          description="A partir de este periodo (inclusive) Tesorería podrá aprobar y pagar desde v2. Los periodos anteriores quedan como pagados por el sistema anterior."
          confirmLabel="Fijar corte"
          confirmText={draft.trim()}
          isPending={isPending}
          onConfirm={async () => {
            const ok = await onSave({ firstV2PayoutPeriodCode: draft.trim() }, `Corte v2 fijado en ${draft.trim()}`);
            if (ok) setConfirmOpen(false);
          }}
        >
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              Confirma que el script <code className="font-mono">corte-legacy-comisiones.sql</code> ya se
              ejecutó para los periodos anteriores a {draft.trim() || 'MM-YYYY'}. Si no, se podría pagar dos
              veces.
            </p>
          </div>
        </ConfirmDialog>

        <ConfirmDialog
          open={clearOpen}
          onOpenChange={setClearOpen}
          title="Quitar el corte v2"
          description="Vuelve a cerrar la aprobación y el pago desde v2 (TRS_CUTOVER_NOT_SET). No borra nada ya aprobado o pagado."
          confirmLabel="Quitar corte"
          confirmText="CERRAR"
          destructive
          isPending={isPending}
          onConfirm={async () => {
            const ok = await onSave({ firstV2PayoutPeriodCode: null }, 'Corte v2 retirado: nada es aprobable');
            if (ok) {
              setDraft('');
              setClearOpen(false);
            }
          }}
        />
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Política de moneda y formato de layout
// ─────────────────────────────────────────────────────────────────────────────

const POLICY_OPTIONS: Array<{ value: PayoutCurrencyPolicy; label: string }> = [
  { value: 'local', label: 'Moneda del país del distribuidor (FX del periodo)' },
  { value: 'mxn_all', label: 'Todo en MXN' },
];

const LAYOUT_OPTIONS = [
  { value: 'generic_csv', label: 'CSV genérico' },
  { value: 'spei_csv', label: 'SPEI (STP) CSV' },
];

function PolicyCard({
  settings,
  onSave,
  isPending,
}: {
  settings: TreasurySettings;
  onSave: SaveFn;
  isPending: boolean;
}) {
  const policyId = useId();
  const layoutId = useId();
  const layoutOptions = useMemo(
    () =>
      LAYOUT_OPTIONS.some((o) => o.value === settings.defaultLayoutFormat)
        ? LAYOUT_OPTIONS
        : [...LAYOUT_OPTIONS, { value: settings.defaultLayoutFormat, label: settings.defaultLayoutFormat }],
    [settings.defaultLayoutFormat],
  );

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h3 className="font-semibold text-foreground">Dispersión</h3>
          <p className="text-sm text-muted-foreground">
            Moneda en que se arma cada lote y formato por defecto del layout bancario (decisión C-2).
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={policyId}>Moneda de dispersión</Label>
            <SearchableSelect
              id={policyId}
              options={POLICY_OPTIONS}
              value={settings.payoutCurrencyPolicy}
              onChange={(v) => {
                if (v === 'local' || v === 'mxn_all') {
                  void onSave({ payoutCurrencyPolicy: v }, 'Política de moneda guardada');
                }
              }}
              showAllOption={false}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Con moneda local nada se paga sin cuenta verificada en esa moneda ni sin FX del periodo.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={layoutId}>Formato de layout por defecto</Label>
            <SearchableSelect
              id={layoutId}
              options={layoutOptions}
              value={settings.defaultLayoutFormat}
              onChange={(v) => {
                if (v) void onSave({ defaultLayoutFormat: v }, 'Formato de layout guardado');
              }}
              showAllOption={false}
              disabled={isPending}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Interruptores
// ─────────────────────────────────────────────────────────────────────────────

function SwitchesCard({
  settings,
  onSave,
  isPending,
}: {
  settings: TreasurySettings;
  onSave: SaveFn;
  isPending: boolean;
}) {
  const [riskyTarget, setRiskyTarget] = useState<BoolKey | null>(null);
  const baseId = useId();

  const toggle = (key: BoolKey, next: boolean, label: string) => {
    const meta = BOOL_SETTINGS.find((s) => s.key === key);
    // Apagar un candado fail-closed pide confirmación explícita.
    if (meta?.risky && !next) {
      setRiskyTarget(key);
      return;
    }
    void onSave({ [key]: next } as TreasurySettingsPatch, `${label}: ${next ? 'activado' : 'desactivado'}`);
  };

  const risky = riskyTarget ? BOOL_SETTINGS.find((s) => s.key === riskyTarget) : null;

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h3 className="font-semibold text-foreground">Candados y avisos</h3>
          <p className="text-sm text-muted-foreground">
            Cada interruptor guarda al instante. Apagar un candado fail-closed pide confirmación.
          </p>
        </div>
        <ul className="divide-y divide-border">
          {BOOL_SETTINGS.map((s) => {
            const id = `${baseId}-${s.key}`;
            return (
              <li key={s.key} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <Label htmlFor={id} className="flex-wrap">
                    {s.label}
                    {s.risky && (
                      <Badge variant="outline" className="text-amber-700">
                        fail-closed
                      </Badge>
                    )}
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
                </div>
                <Switch
                  id={id}
                  checked={settings[s.key]}
                  onCheckedChange={(v) => toggle(s.key, v, s.label)}
                  disabled={isPending}
                  aria-label={s.label}
                />
              </li>
            );
          })}
        </ul>

        <ConfirmDialog
          open={!!riskyTarget}
          onOpenChange={(o) => !o && setRiskyTarget(null)}
          title={`Desactivar: ${risky?.label ?? ''}`}
          description="Este candado evita aprobar o pagar sin datos validados. Al apagarlo el API solo advierte y guarda los bloqueadores como evidencia."
          confirmLabel="Desactivar"
          confirmText="DESACTIVAR"
          destructive
          isPending={isPending}
          onConfirm={async () => {
            if (!riskyTarget) return;
            const ok = await onSave(
              { [riskyTarget]: false } as TreasurySettingsPatch,
              `${risky?.label ?? 'Ajuste'}: desactivado`,
            );
            if (ok) setRiskyTarget(null);
          }}
        />
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Números y textos
// ─────────────────────────────────────────────────────────────────────────────

function NumbersCard({
  settings,
  onSave,
  isPending,
}: {
  settings: TreasurySettings;
  onSave: SaveFn;
  isPending: boolean;
}) {
  const [maxPct, setMaxPct] = useState(String(settings.withholdingMaxPctPerPeriod));
  const [sla, setSla] = useState(String(settings.reviewSlaDays));
  const [consent, setConsent] = useState(settings.privacyConsentVersion);
  const [waTemplate, setWaTemplate] = useState(settings.whatsappReviewTemplate ?? '');
  const [speiClabe, setSpeiClabe] = useState(settings.speiSourceClabe ?? '');
  const pctId = useId();
  const slaId = useId();
  const consentId = useId();
  const waId = useId();
  const speiId = useId();
  const speiHelpId = `${speiId}-help`;

  const pctNum = Number(maxPct);
  const slaNum = Number(sla);
  const pctOk = Number.isFinite(pctNum) && pctNum >= 0 && pctNum <= 100;
  const slaOk = Number.isInteger(slaNum) && slaNum >= 0 && slaNum <= 60;
  const consentOk = consent.trim().length >= 1 && consent.trim().length <= 20;
  const speiTrim = speiClabe.replace(/\s+/g, '');
  const speiCheck = speiTrim ? isValidClabe(speiTrim) : null;
  const speiOk = !speiTrim || speiCheck?.ok === true;
  const speiBank = speiCheck?.ok ? detectBankFromClabe(speiTrim) : null;

  const dirty =
    pctNum !== settings.withholdingMaxPctPerPeriod ||
    slaNum !== settings.reviewSlaDays ||
    consent.trim() !== settings.privacyConsentVersion ||
    (waTemplate.trim() || null) !== settings.whatsappReviewTemplate ||
    (speiTrim || null) !== settings.speiSourceClabe;

  const handleSave = async () => {
    const patch: TreasurySettingsPatch = {};
    if (pctNum !== settings.withholdingMaxPctPerPeriod) patch.withholdingMaxPctPerPeriod = pctNum;
    if (slaNum !== settings.reviewSlaDays) patch.reviewSlaDays = slaNum;
    if (consent.trim() !== settings.privacyConsentVersion) patch.privacyConsentVersion = consent.trim();
    if ((waTemplate.trim() || null) !== settings.whatsappReviewTemplate)
      patch.whatsappReviewTemplate = waTemplate.trim() || null;
    if ((speiTrim || null) !== settings.speiSourceClabe) patch.speiSourceClabe = speiTrim || null;
    await onSave(patch, 'Ajustes guardados');
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h3 className="font-semibold text-foreground">Topes, SLA y plantillas</h3>
          <p className="text-sm text-muted-foreground">
            El tope global de convenios aplica por fila y periodo sobre el remanente, además del tope
            de cada convenio.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={pctId}>Tope global de convenios por periodo (%)</Label>
            <Input
              id={pctId}
              type="number"
              min={0}
              max={100}
              step={1}
              value={maxPct}
              onChange={(e) => setMaxPct(e.target.value)}
              aria-invalid={!pctOk}
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={slaId}>SLA de revisión de expedientes (días)</Label>
            <Input
              id={slaId}
              type="number"
              min={0}
              max={60}
              step={1}
              value={sla}
              onChange={(e) => setSla(e.target.value)}
              aria-invalid={!slaOk}
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={consentId}>Versión vigente del aviso de privacidad</Label>
            <Input
              id={consentId}
              value={consent}
              maxLength={20}
              onChange={(e) => setConsent(e.target.value)}
              aria-invalid={!consentOk}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Cambiarla obliga a los distribuidores a aceptar de nuevo en Datos para Comisiones.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={waId}>Plantilla WhatsApp de revisión (opcional)</Label>
            <Input
              id={waId}
              value={waTemplate}
              onChange={(e) => setWaTemplate(e.target.value)}
              placeholder="Vacío = sin WhatsApp"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Nombre de la plantilla aprobada en Meta; respeta whatsapp_opt_out.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={speiId}>CLABE ordenante para layout SPEI (opcional)</Label>
            <Input
              id={speiId}
              value={speiClabe}
              inputMode="numeric"
              maxLength={18}
              onChange={(e) => setSpeiClabe(e.target.value.replace(/\D/g, ''))}
              placeholder="18 dígitos · vacío = formato spei_csv no disponible"
              aria-invalid={!speiOk}
              aria-describedby={speiHelpId}
              disabled={isPending}
            />
            <p id={speiHelpId} className="text-xs text-muted-foreground">
              {speiTrim && !speiOk
                ? 'CLABE inválida (longitud o dígito verificador).'
                : speiBank
                  ? `Cuenta de la empresa en ${speiBank.shortName}; sin ella el formato spei_csv nunca queda listo.`
                  : 'Cuenta de la empresa desde la que se dispersa; sin ella el formato spei_csv nunca queda listo.'}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!dirty || !pctOk || !slaOk || !consentOk || !speiOk || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
