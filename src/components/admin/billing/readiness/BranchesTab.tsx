'use client';

// Pestaña Sucursales (solo México): CP de la sucursal (= lugar de expedición
// del CFDI) y regla de IVA que aplica. El PATCH deja UNA sola regla IVA activa
// por sucursal; el aviso "Frontera con 16%" sale cuando el CP cae en franja
// fronteriza y la regla es 16% (podría aplicar el estímulo del 8%).

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useReadinessBranches, useUpdateBranchFiscal } from '@/hooks/useBilling';
import { useActiveTaxRules } from '@/hooks/useConfig';
import { billingErrorMessage } from '@/lib/billing-error';
import { BRANCH_ISSUE_INFO, isValidZip, taxRatePct, type ReadinessBranch } from '@/types/billing';

interface Draft {
  zip: string;
  ivaRuleId: string;
}

const ZIP_ERROR = 'El CP debe tener 5 dígitos';

export function BranchesTab({ canManage }: { canManage: boolean }) {
  const { data, isLoading, error, refetch } = useReadinessBranches();
  // Endpoint público de reglas activas: `/config/tax-rules` exige admin y
  // Contabilidad no lo es. Si falla se avisa arriba de la tabla.
  const { data: taxRules, error: rulesError } = useActiveTaxRules();
  const update = useUpdateBranchFiscal();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const ivaRules = useMemo(
    () => (taxRules ?? []).filter((r) => r.taxType === 'iva' && r.isActive),
    [taxRules],
  );
  const ivaRuleIds = useMemo(() => new Set(ivaRules.map((r) => r.id)), [ivaRules]);
  const ivaOptions = useMemo(
    () =>
      ivaRules.map((r) => ({
        value: r.id,
        label: `${r.name} (${taxRatePct(r.rate)})`,
        hint: r.code,
      })),
    [ivaRules],
  );

  const rows = data ?? [];

  // La regla IVA vigente se identifica por su tipo (el API lo manda); el
  // respaldo por id del catálogo cubre una respuesta vieja sin `taxType`.
  const currentIvaRule = (row: ReadinessBranch) =>
    row.taxRules.find((r) => r.taxType === 'iva') ??
    row.taxRules.find((r) => ivaRuleIds.has(r.id)) ??
    null;

  const draftOf = (row: ReadinessBranch): Draft =>
    drafts[row.id] ?? { zip: row.addressZip ?? '', ivaRuleId: currentIvaRule(row)?.id ?? '' };

  const zipChanged = (row: ReadinessBranch, d: Draft) => d.zip !== (row.addressZip ?? '');

  /**
   * El CP solo se manda cuando cambió, y entonces tiene que ser de 5 dígitos:
   * vaciarlo ('') también cuenta como inválido porque el API lo rechaza con
   * 400. Un CP original vacío que no se toca no bloquea guardar la regla.
   */
  const zipError = (row: ReadinessBranch, d: Draft): string =>
    zipChanged(row, d) && !isValidZip(d.zip) ? ZIP_ERROR : '';

  const isDirty = (row: ReadinessBranch) => {
    const d = draftOf(row);
    return zipChanged(row, d) || d.ivaRuleId !== (currentIvaRule(row)?.id ?? '');
  };

  const setDraft = (row: ReadinessBranch, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [row.id]: { ...draftOf(row), ...patch } }));

  const save = async (row: ReadinessBranch) => {
    const d = draftOf(row);
    if (zipError(row, d)) return;
    setSavingId(row.id);
    try {
      await update.mutateAsync({
        id: row.id,
        data: {
          addressZip: zipChanged(row, d) ? d.zip : undefined,
          ivaTaxRuleId: d.ivaRuleId && d.ivaRuleId !== currentIvaRule(row)?.id ? d.ivaRuleId : undefined,
        },
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
    } catch {
      // El hook ya avisó.
    } finally {
      setSavingId(null);
    }
  };

  const columns: DataTableColumn<ReadinessBranch>[] = [
    {
      key: 'name',
      header: 'Sucursal',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{row.code}</p>
        </div>
      ),
    },
    {
      key: 'zip',
      header: 'CP (lugar de expedición)',
      render: (row) => {
        const d = draftOf(row);
        const err = zipError(row, d);
        const errorId = `br-zip-error-${row.id}`;
        return (
          <div className="w-28">
            <Input
              id={`br-zip-${row.id}`}
              value={d.zip}
              onChange={(e) => setDraft(row, { zip: e.target.value.replace(/\D/g, '').slice(0, 5) })}
              inputMode="numeric"
              maxLength={5}
              className="font-mono"
              disabled={!canManage}
              aria-label={`CP de ${row.name}`}
              aria-invalid={!!err}
              aria-describedby={err ? errorId : undefined}
              placeholder="00000"
            />
            {err && (
              <p id={errorId} className="mt-1 text-xs text-red-600" role="alert">
                {err}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'ivaRule',
      header: 'Regla IVA',
      render: (row) => (
        <div className="min-w-[240px]">
          <SearchableSelect
            id={`br-iva-${row.id}`}
            aria-label={`Regla de IVA de ${row.name}`}
            options={ivaOptions}
            value={draftOf(row).ivaRuleId}
            onChange={(val) => setDraft(row, { ivaRuleId: val })}
            showAllOption={false}
            placeholder={rulesError ? 'No se cargaron las reglas' : 'Elige la regla de IVA'}
            disabled={!canManage || ivaOptions.length === 0}
          />
        </div>
      ),
    },
    {
      key: 'zone',
      header: 'Zona',
      render: (row) =>
        row.borderZone ? (
          <Badge variant="info">Franja fronteriza</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Interior</span>
        ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row) =>
        row.issues.length === 0 ? (
          <Badge variant="success">Lista</Badge>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.issues.map((issue) => (
              <Badge
                key={issue}
                variant={issue === 'border_with_16' ? 'warning' : 'destructive'}
                title={BRANCH_ISSUE_INFO[issue]?.why}
              >
                {BRANCH_ISSUE_INFO[issue]?.label ?? issue}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (row) => {
        const d = draftOf(row);
        const bad = !!zipError(row, d);
        return (
          <Button
            size="sm"
            onClick={() => void save(row)}
            disabled={!canManage || !isDirty(row) || bad || savingId === row.id}
          >
            {savingId === row.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        );
      },
    },
  ];

  if (error && !data) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span className="text-destructive">
            {billingErrorMessage(error, 'No se pudieron cargar las sucursales')}
          </span>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-sm text-muted-foreground">
        <p>
          Sucursales activas de México. El CP es el <strong>lugar de expedición</strong> del CFDI y la
          regla de IVA define la tasa que desglosa el POS. Al guardar una regla, queda como la única
          regla de IVA activa de esa sucursal.
        </p>
        <ul className="list-disc space-y-0.5 pl-5 text-xs">
          {(Object.keys(BRANCH_ISSUE_INFO) as (keyof typeof BRANCH_ISSUE_INFO)[]).map((k) => (
            <li key={k}>
              <span className="font-medium text-gray-700">{BRANCH_ISSUE_INFO[k].label}:</span>{' '}
              {BRANCH_ISSUE_INFO[k].why}
            </li>
          ))}
        </ul>
      </div>
      {rulesError ? (
        <Card className="border-amber-300 bg-amber-50/60" role="alert">
          <CardContent className="p-4 text-sm text-amber-900">
            No se pudieron cargar las reglas de IVA, así que no se puede asignar una regla por sucursal:{' '}
            {billingErrorMessage(rulesError, 'error al consultar /config/tax-rules/active')}
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={rows}
            getRowKey={(row) => row.id}
            isLoading={isLoading}
            emptyMessage="No hay sucursales activas en México."
          />
        </CardContent>
      </Card>
    </div>
  );
}
