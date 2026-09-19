'use client';

// Pestaña Sucursales (solo México): CP de la sucursal (= lugar de expedición
// del CFDI) y regla de IVA que aplica. El PATCH deja UNA sola regla IVA activa
// por sucursal; el aviso "Frontera con 16%" sale cuando el CP cae en franja
// fronteriza y la regla es 16% (podría aplicar el estímulo del 8%).
//
// Fase 2: "Factura en v2 desde" (`branches.v2_invoicing_since`) por sucursal,
// con confirmación: es el candado de fecha que decide qué sistema factura
// (PUT /billing/branches/:id/invoicing-since { since: 'YYYY-MM-DD' | null }).
// El API lo exige a super_admin: para el resto es de solo lectura. Una fecha
// PASADA volvería facturables en v2 días que el sistema anterior ya globalizó
// (doble declaración), así que el campo arranca en hoy (zona de la sucursal) y
// una fecha anterior pide la casilla explícita `acknowledgeLegacyStopped`.

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import {
  useReadinessBranches,
  useSetBranchInvoicingSince,
  useUpdateBranchFiscal,
} from '@/hooks/useBilling';
import { useActiveTaxRules } from '@/hooks/useConfig';
import { billingErrorMessage } from '@/lib/billing-error';
import { DEFAULT_TIMEZONE } from '@/lib/timezone-utils';
import { useAppSelector } from '@/store/hooks';
import { selectUserRoles } from '@/store/slices/authSlice';
import {
  BRANCH_ISSUE_INFO,
  isValidZip,
  taxRatePct,
  type BranchInvoicingSinceResult,
  type ReadinessBranch,
} from '@/types/billing';
import { localDateInZone } from '../invoices/useBranchTimezone';

interface Draft {
  zip: string;
  ivaRuleId: string;
}

const ZIP_ERROR = 'El CP debe tener 5 dígitos';

/** 'YYYY-MM-DD' → '18/09/2026' sin pasar por Date (evita el corrimiento UTC). */
function formatSince(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

interface SinceTarget {
  row: ReadinessBranch;
  /** null = quitar la fecha (la sucursal vuelve al sistema anterior). */
  since: string | null;
  /** La fecha es anterior a hoy (zona de la sucursal): exige la casilla explícita. */
  isPast: boolean;
}

const SINCE_READONLY_HINT =
  'Solo Sistemas (super_admin) puede fijar o cambiar esta fecha: decide qué sistema factura la sucursal.';

export function BranchesTab({ canManage }: { canManage: boolean }) {
  const { data, isLoading, error, refetch } = useReadinessBranches();
  // Endpoint público de reglas activas: `/config/tax-rules` exige admin y
  // Contabilidad no lo es. Si falla se avisa arriba de la tabla.
  const { data: taxRules, error: rulesError } = useActiveTaxRules();
  const update = useUpdateBranchFiscal();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const setSince = useSetBranchInvoicingSince();
  const roles = useAppSelector(selectUserRoles);
  // El PUT exige super_admin (billing:manage no alcanza): el resto solo mira.
  const canSetSince = roles.includes('super_admin');
  const [sinceDrafts, setSinceDrafts] = useState<Record<string, string>>({});
  const [sinceTarget, setSinceTarget] = useState<SinceTarget | null>(null);
  const [legacyStopped, setLegacyStopped] = useState(false);
  // Respuesta del último cambio por sucursal: terminales encendidas y aviso del API.
  const [sinceResults, setSinceResults] = useState<Record<string, BranchInvoicingSinceResult>>({});

  const currentSince = (row: ReadinessBranch) => (row.v2InvoicingSince ?? '').slice(0, 10);
  const sinceDraftOf = (row: ReadinessBranch) => sinceDrafts[row.id] ?? currentSince(row);
  /** Hoy en la zona de la sucursal: mínimo del campo de fecha. */
  const todayOf = (row: ReadinessBranch) => localDateInZone(row.timezone || DEFAULT_TIMEZONE);

  const openSinceTarget = (row: ReadinessBranch, since: string | null) => {
    setLegacyStopped(false);
    setSinceTarget({ row, since, isPast: !!since && since < todayOf(row) });
  };

  const confirmSince = async () => {
    if (!sinceTarget) return;
    const { row, since, isPast } = sinceTarget;
    if (isPast && !legacyStopped) return;
    try {
      const result = await setSince.mutateAsync({
        branchId: row.id,
        since,
        acknowledgeLegacyStopped: isPast ? true : undefined,
      });
      setSinceResults((prev) => ({ ...prev, [row.id]: result }));
      setSinceDrafts((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      setSinceTarget(null);
    } catch {
      // El hook ya avisó.
    }
  };

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
      key: 'since',
      header: 'Factura en v2 desde',
      render: (row) => {
        const current = currentSince(row);
        if (!canSetSince) {
          // Solo lectura: el valor se ve, pero no hay controles que terminen en un 403.
          return (
            <div className="min-w-[210px] space-y-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={0}
                      className="inline-block rounded-md border border-dashed border-gray-300 px-2 py-1 text-sm text-gray-800"
                      aria-label={`${row.name}: ${current ? `factura en v2 desde el ${formatSince(current)}` : 'sin fecha de arranque en v2'}. ${SINCE_READONLY_HINT}`}
                    >
                      {current ? formatSince(current) : 'Sin fecha'}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{SINCE_READONLY_HINT}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {!current && (
                <p className="text-xs text-muted-foreground">Sin fecha: factura el sistema anterior.</p>
              )}
            </div>
          );
        }
        const draft = sinceDraftOf(row);
        const changed = draft !== current;
        const today = todayOf(row);
        const draftIsPast = !!draft && changed && draft < today;
        const hintId = `br-since-hint-${row.id}`;
        const lastResult = sinceResults[row.id];
        const hasTerminals =
          typeof lastResult?.terminalsOn === 'number' && typeof lastResult?.terminalsTotal === 'number';
        return (
          <div className="min-w-[210px] space-y-1">
            <Input
              id={`br-since-${row.id}`}
              type="date"
              value={draft}
              min={today}
              onChange={(e) => setSinceDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))}
              disabled={setSince.isPending}
              aria-label={`Fecha desde la que ${row.name} factura en v2`}
              aria-describedby={draftIsPast ? hintId : undefined}
            />
            {draftIsPast && (
              <p id={hintId} className="text-xs text-amber-700">
                Fecha anterior a hoy: al confirmar tendrás que declarar que el sistema anterior ya dejó de facturar
                esta sucursal.
              </p>
            )}
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                variant="secondary"
                disabled={!draft || !changed || setSince.isPending}
                onClick={() => openSinceTarget(row, draft)}
              >
                {current ? 'Cambiar fecha' : 'Fijar fecha'}
              </Button>
              {current && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={setSince.isPending}
                  onClick={() => openSinceTarget(row, null)}
                >
                  Quitar
                </Button>
              )}
            </div>
            {!current && (
              <p className="text-xs text-muted-foreground">Sin fecha: factura el sistema anterior.</p>
            )}
            {lastResult && (hasTerminals || lastResult.warning) && (
              <div className="space-y-0.5 text-xs" role="status">
                {hasTerminals && (
                  <p
                    className={
                      lastResult.terminalsOn === lastResult.terminalsTotal ? 'text-emerald-700' : 'text-amber-700'
                    }
                  >
                    Terminales con Facturación encendida: {lastResult.terminalsOn} de {lastResult.terminalsTotal}
                  </p>
                )}
                {lastResult.warning && <p className="text-amber-700">{lastResult.warning}</p>}
              </div>
            )}
          </div>
        );
      },
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
        <p>
          <strong>Factura en v2 desde:</strong> primer día (zona de la sucursal) cuyas ventas factura v2.
          Las ventas anteriores a esa fecha se facturan en el sistema anterior; la factura global exige
          además todas las terminales de la sucursal con Facturación encendida. Sin fecha, v2 no factura
          nada de esa sucursal. {canSetSince ? 'La fecha normal es hoy o un día futuro.' : SINCE_READONLY_HINT}
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

      {sinceTarget && (
        <ConfirmDialog
          open={!!sinceTarget}
          onOpenChange={(open) => {
            if (!open) setSinceTarget(null);
          }}
          title={
            sinceTarget.since
              ? `Facturar ${sinceTarget.row.name} en v2 desde el ${formatSince(sinceTarget.since)}`
              : `Quitar la fecha de arranque de ${sinceTarget.row.name}`
          }
          description={
            sinceTarget.since
              ? 'Desde ese día v2 emite las facturas nominativas y la global de esta sucursal.'
              : 'La sucursal vuelve a facturar solo en el sistema anterior: v2 rechazará sus ventas y sus días.'
          }
          confirmLabel={sinceTarget.since ? 'Fijar fecha' : 'Quitar fecha'}
          cancelLabel="Volver"
          confirmText="CONFIRMAR"
          destructive={!sinceTarget.since || sinceTarget.isPast}
          disabled={sinceTarget.isPast && !legacyStopped}
          isPending={setSince.isPending}
          onConfirm={confirmSince}
        >
          {sinceTarget.isPast && (
            <div className="mb-3 space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-900" role="alert">
              <p className="font-semibold">La fecha {formatSince(sinceTarget.since)} ya pasó.</p>
              <p className="text-xs">
                Los días entre esa fecha y hoy quedarían facturables en v2. Si el sistema anterior ya emitió la
                factura global de alguno de esos días, el mismo ingreso se declararía dos veces.
              </p>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="br-since-legacy-stopped"
                  checked={legacyStopped}
                  onCheckedChange={(v) => setLegacyStopped(v === true)}
                  disabled={setSince.isPending}
                  className="mt-0.5"
                />
                <Label htmlFor="br-since-legacy-stopped" className="text-sm font-medium leading-snug">
                  El sistema anterior ya dejó de facturar esta sucursal desde el {formatSince(sinceTarget.since)} y no
                  emitió globales de esos días.
                </Label>
              </div>
            </div>
          )}
          <ul className="list-disc space-y-1 pl-5">
            {sinceTarget.since ? (
              <>
                <li>
                  El sistema anterior debe dejar de emitir la factura global de esta sucursal a partir del{' '}
                  <strong>{formatSince(sinceTarget.since)}</strong>; si no, habrá dos globales del mismo día.
                </li>
                <li>Las ventas anteriores a esa fecha se siguen facturando en el sistema anterior.</li>
                <li>La global exige todas las terminales de la sucursal con Facturación encendida.</li>
              </>
            ) : (
              <li>
                Fecha actual: <strong>{formatSince(currentSince(sinceTarget.row)) || 'sin fecha'}</strong>. Las
                facturas ya timbradas en v2 no cambian.
              </li>
            )}
            <li>El cambio queda en la bitácora de auditoría (riesgo alto).</li>
          </ul>
        </ConfirmDialog>
      )}
    </div>
  );
}
