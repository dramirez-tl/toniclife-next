'use client';

// BotnaturaSettingsTab - Datos fiscales de Botnatura (GET/PUT billing/botnatura/settings): el
// receptor de TODAS las facturas del módulo y la sucursal que expide por omisión. Se capturan
// una vez, tal como vienen en su Constancia de Situación Fiscal.

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useActiveBranches } from '@/hooks/useBranches';
import { useBotnaturaSettings, useSaveBotnaturaSettings } from '@/hooks/useBotnatura';
import { billingErrorMessage } from '@/lib/billing-error';
import { receiverProblems, receiverToForm } from '@/lib/billing/botnatura';
import { CFDI_USES, FISCAL_REGIMES } from '@/types/billing';
import type { BotnaturaSettings } from '@/types/botnatura';

const SELECT = 'h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm';

export function BotnaturaSettingsTab({ onSaved }: { onSaved?: () => void }) {
  const settings = useBotnaturaSettings();
  if (settings.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
        {billingErrorMessage(settings.error, 'No se pudieron leer los datos de Botnatura')}
      </div>
    );
  }
  if (!settings.data) return <div className="h-64 animate-pulse rounded-lg bg-gray-100" />;
  return <SettingsForm initial={settings.data} onSaved={onSaved} />;
}

function SettingsForm({ initial, onSaved }: { initial: BotnaturaSettings; onSaved?: () => void }) {
  const [form, setForm] = useState(() => receiverToForm(initial.receiver));
  const [branchId, setBranchId] = useState(initial.defaultBranchId ?? '');
  const { data: branches } = useActiveBranches();
  const branchOptions = useMemo(
    () => (branches ?? []).map((b) => ({ value: b.id, label: `${b.code} - ${b.name}` })),
    [branches],
  );
  const save = useSaveBotnaturaSettings();
  const problems = receiverProblems(form);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    if (problems.length > 0) return;
    try {
      await save.mutateAsync({
        rfc: form.rfc.trim().toUpperCase(),
        name: form.name.trim(),
        taxRegimeCode: form.taxRegimeCode,
        cfdiUseCode: form.cfdiUseCode,
        zipCode: form.zipCode,
        email: form.email.trim() || null,
        defaultBranchId: branchId || null,
      });
      toast.success('Datos fiscales de Botnatura guardados');
      onSaved?.();
    } catch (err) {
      toast.error(billingErrorMessage(err, 'No se pudieron guardar los datos'));
    }
  };

  return (
    <Card className="max-w-3xl">
      <CardContent className="space-y-5 p-5">
        <div
          className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${initial.ready ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}
        >
          {initial.ready ? (
            <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <span>
            {initial.ready
              ? 'Datos completos: ya se puede facturar a Botnatura.'
              : 'Faltan datos fiscales. Captúralos tal como vienen en la Constancia de Situación Fiscal de Botnatura; si no coinciden con el SAT, el timbrado se rechaza.'}
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="RFC">
            <Input
              value={form.rfc}
              onChange={(e) => set({ rfc: e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 13) })}
              className="font-mono"
              maxLength={13}
            />
          </Field>
          <Field label="Código postal fiscal">
            <Input
              value={form.zipCode}
              onChange={(e) => set({ zipCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
              className="font-mono"
              inputMode="numeric"
              maxLength={5}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Razón social (sin el régimen de capital: sin “SA de CV”)">
              <Input value={form.name} onChange={(e) => set({ name: e.target.value.toUpperCase() })} maxLength={300} />
            </Field>
          </div>
          <Field label="Régimen fiscal">
            <select value={form.taxRegimeCode} onChange={(e) => set({ taxRegimeCode: e.target.value })} className={SELECT}>
              <option value="">Elegir…</option>
              {FISCAL_REGIMES.map((r) => (
                <option key={r.Value} value={r.Value}>
                  {r.Value} · {r.Name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Uso del CFDI">
            <select value={form.cfdiUseCode} onChange={(e) => set({ cfdiUseCode: e.target.value })} className={SELECT}>
              <option value="">Elegir…</option>
              {CFDI_USES.map((u) => (
                <option key={u.Value} value={u.Value}>
                  {u.Value} · {u.Name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Correo para enviar el CFDI (opcional)">
            <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label="Sucursal que expide por omisión (opcional)">
            <SearchableSelect
              options={branchOptions}
              value={branchId}
              onChange={setBranchId}
              allLabel="Elegir en cada factura"
              placeholder="Buscar sucursal…"
              className="w-full"
            />
          </Field>
        </div>
        {problems.length > 0 && <p className="text-xs text-red-600">Revisa: {problems.join(', ')}.</p>}
        <div className="flex justify-end">
          <Button type="button" onClick={() => void submit()} disabled={problems.length > 0 || save.isPending}>
            {save.isPending ? 'Guardando…' : 'Guardar datos'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}
