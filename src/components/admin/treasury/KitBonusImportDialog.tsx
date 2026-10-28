'use client';

// Carga masiva de pagos del Bono de Inscripción desde el Excel con el que
// depositó Tesorería (28-oct-2026): una fila por ID upline con la suma de sus
// bonos y una hoja por fecha de pago ("27 oct pagados"). Flujo: elegir el
// archivo → vista previa (el API casa cada renglón con los grupos pendientes
// del rango y los filtros de la página) → desmarcar lo que no se quiera →
// "Marcar pagados" (mismo camino que marcar a mano: montos congelados) y, si
// se deja la casilla, la página timbra uno por uno los recibos de nómina de los
// grupos ASIMILADOS que quedaron listos.
//
// Ventana del cruce: Tesorería paga semanas atrasadas y mezcla CEDIS y CEDEAS
// en la misma hoja (con el Excel real del 27-oct-2026: 71 de 83 renglones
// casan buscando 60 días antes del pago en todas las sucursales, contra 44 con
// la semana y el filtro CEDIS de la página), por eso el default es "60 días
// antes de la fecha de pago · todas las sucursales"; se puede usar el rango y
// los filtros de la página.

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useImportKitBonusPayments } from '@/hooks/useReports';
import type {
  KitBonusBranchType,
  KitBonusImportGroupRef,
  KitBonusImportResult,
  KitBonusImportRow,
  KitBonusImportRowStatus,
} from '@/types/reports';

type WindowMode = 'before_paid' | 'page';
type BranchScope = 'all' | 'page';
const WINDOW_DAYS_OPTIONS = [30, 60, 90, 120] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startDate: string;
  endDate: string;
  branchType: KitBonusBranchType;
  country?: string;
  /** "CEDIS · todos los países · 19/10/2026 - 25/10/2026" (lo que se cruza). */
  filtersLabel: string;
  /** La página está ocupada (otro pago, timbrado…). */
  busy: boolean;
  /** Ya se marcaron los pagos; la página decide si timbra los recibos. */
  onApplied: (result: KitBonusImportResult, stampAfter: boolean) => Promise<void> | void;
}

const STATUS_META: Record<KitBonusImportRowStatus, { label: string; className: string; selectable: boolean }> = {
  matched: { label: 'Casa', className: 'bg-green-50 text-green-700 ring-green-600/20', selectable: true },
  matched_oldest: { label: 'Casa (semana más antigua)', className: 'bg-amber-50 text-amber-800 ring-amber-600/20', selectable: true },
  ambiguous: { label: 'En duda', className: 'bg-amber-50 text-amber-800 ring-amber-600/20', selectable: false },
  amount_mismatch: { label: 'Monto distinto', className: 'bg-red-50 text-red-700 ring-red-600/20', selectable: false },
  not_found: { label: 'Sin bonos en el rango', className: 'bg-red-50 text-red-700 ring-red-600/20', selectable: false },
  already_paid: { label: 'Ya pagado', className: 'bg-gray-100 text-gray-600 ring-gray-400/30', selectable: false },
  held: { label: 'Apartado', className: 'bg-violet-50 text-violet-700 ring-violet-600/20', selectable: false },
  invalid: { label: 'Inválido', className: 'bg-red-50 text-red-700 ring-red-600/20', selectable: false },
};

function money(n: number, currency = 'MXN'): string {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function dateDisplay(d: string | null): string {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
}

function weekLabel(g: KitBonusImportGroupRef): string {
  return g.weekStart ? `${dateDisplay(g.weekStart)}–${dateDisplay(g.weekEnd)}` : 'varias semanas';
}

/** Mensaje del API ({ code, message }) o el texto de respaldo. */
function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: unknown } } };
  const m = e?.response?.data?.message;
  if (typeof m === 'string' && m.trim()) return m;
  if (Array.isArray(m) && m.length) return String(m[0]);
  return fallback;
}

function StatusBadge({ status }: { status: KitBonusImportRowStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export function KitBonusImportDialog({
  open,
  onOpenChange,
  startDate,
  endDate,
  branchType,
  country,
  filtersLabel,
  busy,
  onApplied,
}: Props) {
  const importMutation = useImportKitBonusPayments();
  const [file, setFile] = useState<File | null>(null);
  const [sheet, setSheet] = useState('');
  const [paidAt, setPaidAt] = useState('');
  const [reference, setReference] = useState('');
  const [tieBreak, setTieBreak] = useState<'oldest' | 'none'>('oldest');
  const [preview, setPreview] = useState<KitBonusImportResult | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [stampAfter, setStampAfter] = useState(true);
  const [windowMode, setWindowMode] = useState<WindowMode>('before_paid');
  const [windowDays, setWindowDays] = useState<number>(60);
  const [branchScope, setBranchScope] = useState<BranchScope>('all');
  const [applying, setApplying] = useState(false);

  const working = importMutation.isPending || applying;

  const reset = () => {
    setFile(null);
    setSheet('');
    setPaidAt('');
    setReference('');
    setTieBreak('oldest');
    setPreview(null);
    setExcluded(new Set());
    setStampAfter(true);
    setWindowMode('before_paid');
    setWindowDays(60);
    setBranchScope('all');
  };

  const close = (next: boolean) => {
    if (!next && (working || busy)) return;
    if (!next) reset();
    onOpenChange(next);
  };

  interface Overrides {
    sheet?: string;
    tieBreak?: 'oldest' | 'none';
    windowMode?: WindowMode;
    windowDays?: number;
    branchScope?: BranchScope;
  }

  const basePayload = (f: File, o: Overrides = {}) => {
    const scope = o.branchScope ?? branchScope;
    const mode = o.windowMode ?? windowMode;
    const sheetName = o.sheet ?? sheet;
    return {
      file: f,
      startDate,
      endDate,
      branchType: scope === 'all' ? ('all' as const) : branchType,
      ...(country && scope === 'page' ? { country } : {}),
      ...(sheetName ? { sheet: sheetName } : {}),
      ...(paidAt ? { paidAt } : {}),
      ...(reference.trim() ? { reference: reference.trim() } : {}),
      tieBreak: o.tieBreak ?? tieBreak,
      window: mode,
      ...(mode === 'before_paid' ? { windowDays: o.windowDays ?? windowDays } : {}),
    };
  };

  const runPreview = async (override: Overrides = {}) => {
    if (!file) {
      toast.error('Elige el Excel de pagos');
      return;
    }
    try {
      const r = await importMutation.mutateAsync({
        ...basePayload(file, override),
        apply: false,
      });
      setPreview(r);
      setExcluded(new Set());
      setSheet(r.sheet);
      if (!paidAt) setPaidAt(r.paidAt);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo leer el Excel'));
    }
  };

  const selectable = useMemo(
    () => (preview?.rows ?? []).filter((r) => STATUS_META[r.status].selectable),
    [preview],
  );
  const chosen = selectable.filter((r) => !excluded.has(r.row));
  const chosenAmount = chosen.reduce((a, r) => a + r.amount, 0);
  const chosenBonuses = chosen.reduce((a, r) => a + r.groups.reduce((b, g) => b + g.bonuses, 0), 0);
  const chosenPayroll = chosen.filter((r) => r.groups.some((g) => g.regime === 'ASIMILADOS' && g.currencyCode === 'MXN')).length;

  const toggleRow = (row: number) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });
  const allChosen = selectable.length > 0 && chosen.length === selectable.length;
  const toggleAll = () => setExcluded(allChosen ? new Set(selectable.map((r) => r.row)) : new Set());

  const apply = async () => {
    if (!file || !preview || chosen.length === 0) return;
    if (!paidAt) {
      toast.error('Captura la fecha de pago');
      return;
    }
    setApplying(true);
    try {
      const r = await importMutation.mutateAsync({
        ...basePayload(file),
        apply: true,
        excludeRows: [...excluded],
      });
      onOpenChange(false);
      reset();
      await onApplied(r, stampAfter);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudieron registrar los pagos'));
    } finally {
      setApplying(false);
    }
  };

  const s = preview?.summary;
  const problems = (preview?.rows ?? []).filter((r) => !STATUS_META[r.status].selectable);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Subir Excel de pagos</DialogTitle>
          <DialogDescription>
            El Excel con el que depositó Tesorería: una fila por <strong>ID upline</strong> con la <strong>suma</strong> de sus bonos
            (como la hoja &ldquo;Etiquetas de fila · Suma de SUBTOTAL&rdquo;). Cada renglón se cruza con los bonos <strong>pendientes</strong> del
            patrocinador en la ventana elegida (por defecto los 60 días anteriores a la fecha de pago, en todas las sucursales):
            casa si el monto es la suma de todos sus grupos pendientes o de algunos (semanas pagadas juntas). Lo que casa se marca
            pagado con los montos congelados del sistema (ISR por semana).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <Label htmlFor="bonos-import-file">Archivo (.xlsx)</Label>
            <Input
              id="bonos-import-file"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="mt-1"
              disabled={working}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setPreview(null);
                setExcluded(new Set());
                setSheet('');
              }}
            />
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="bonos-import-sheet">Hoja</Label>
            {preview && preview.sheets.length > 1 ? (
              <select
                id="bonos-import-sheet"
                value={sheet}
                disabled={working}
                onChange={(e) => {
                  setSheet(e.target.value);
                  setPaidAt('');
                  void runPreview({ sheet: e.target.value });
                }}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {preview.sheets.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
              <Input id="bonos-import-sheet" value={preview?.sheet ?? sheet} placeholder="Primera hoja" className="mt-1" disabled />
            )}
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="bonos-import-paid-at">Fecha de pago</Label>
            <Input
              id="bonos-import-paid-at"
              type="date"
              value={paidAt}
              disabled={working}
              onChange={(e) => setPaidAt(e.target.value)}
              className="mt-1"
            />
            {preview?.paidAtHint && (
              <p className="mt-1 text-[11px] text-gray-500">Según la hoja: {dateDisplay(preview.paidAtHint)}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="bonos-import-ref">Referencia</Label>
            <Input
              id="bonos-import-ref"
              value={reference}
              maxLength={100}
              disabled={working}
              onChange={(e) => setReference(e.target.value)}
              className="mt-1"
              placeholder="Opcional"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => void runPreview()} disabled={!file || working}>
            {importMutation.isPending && !applying ? 'Leyendo…' : preview ? 'Volver a cruzar' : 'Vista previa'}
          </Button>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <span>Mismo monto en varias semanas:</span>
            <select
              value={tieBreak}
              disabled={working}
              onChange={(e) => {
                const v = e.target.value as 'oldest' | 'none';
                setTieBreak(v);
                if (preview) void runPreview({ tieBreak: v });
              }}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="oldest">tomar la semana más antigua</option>
              <option value="none">dejar en duda (no marcar)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <span>Buscar bonos pendientes:</span>
            <select
              value={windowMode === 'page' ? 'page' : String(windowDays)}
              disabled={working}
              onChange={(e) => {
                const v = e.target.value;
                const next: Overrides = v === 'page' ? { windowMode: 'page' } : { windowMode: 'before_paid', windowDays: Number(v) };
                setWindowMode(next.windowMode!);
                if (next.windowDays) setWindowDays(next.windowDays);
                if (preview) void runPreview(next);
              }}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              {WINDOW_DAYS_OPTIONS.map((d) => (
                <option key={d} value={String(d)}>
                  {d} días antes de la fecha de pago
                </option>
              ))}
              <option value="page">en el rango de la página</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <span>Sucursal del kit:</span>
            <select
              value={branchScope}
              disabled={working}
              onChange={(e) => {
                const v = e.target.value as BranchScope;
                setBranchScope(v);
                if (preview) void runPreview({ branchScope: v });
              }}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="all">todas (CEDIS + CEDEAS)</option>
              <option value="page">las del filtro de la página</option>
            </select>
          </label>
        </div>

        {preview && s && (
          <>
            <p className="text-xs text-gray-500">
              Bonos pendientes buscados del <strong>{dateDisplay(preview.startDate)}</strong> al <strong>{dateDisplay(preview.endDate)}</strong>
              {' · '}
              {branchScope === 'all' ? 'todas las sucursales (CEDIS + CEDEAS)' : filtersLabel}
              {' · '}pago del <strong>{dateDisplay(paidAt || preview.paidAt)}</strong>
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                {s.rows} renglones · Excel {money(s.excelAmount)}
              </span>
              <span className="rounded-full bg-green-50 px-2.5 py-1 font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                Casan {s.matched + s.matchedOldest} · {money(s.matchedAmount)}
              </span>
              {s.matchedOldest > 0 && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800 ring-1 ring-inset ring-amber-600/20">
                  {s.matchedOldest} por semana más antigua
                </span>
              )}
              {s.ambiguous > 0 && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800 ring-1 ring-inset ring-amber-600/20">{s.ambiguous} en duda</span>
              )}
              {s.amountMismatch > 0 && (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700 ring-1 ring-inset ring-red-600/20">{s.amountMismatch} con monto distinto</span>
              )}
              {s.notFound > 0 && (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700 ring-1 ring-inset ring-red-600/20">{s.notFound} sin bonos en el rango</span>
              )}
              {s.alreadyPaid > 0 && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">{s.alreadyPaid} ya pagados</span>}
              {s.held > 0 && (
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700 ring-1 ring-inset ring-violet-600/20">{s.held} apartados</span>
              )}
              {s.invalid > 0 && <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700 ring-1 ring-inset ring-red-600/20">{s.invalid} renglones inválidos</span>}
              {s.isrWarnings > 0 && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800 ring-1 ring-inset ring-amber-600/20" title="Tesorería retuvo un ISR distinto al que calcula el sistema (p. ej. sobre la suma de dos semanas). Se congela el calculado.">
                  {s.isrWarnings} con ISR distinto
                </span>
              )}
            </div>

            <div className="max-h-[42vh] overflow-auto rounded-lg border border-gray-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-2 py-2">
                      <Checkbox checked={allChosen} onCheckedChange={toggleAll} disabled={working || selectable.length === 0} aria-label="Marcar todos los que casan" />
                    </th>
                    <th className="px-2 py-2">Renglón</th>
                    <th className="px-2 py-2">ID upline</th>
                    <th className="px-2 py-2">Patrocinador</th>
                    <th className="px-2 py-2 text-right">Monto Excel</th>
                    <th className="px-2 py-2">Resultado</th>
                    <th className="px-2 py-2">Bonos que se marcan / detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.rows.map((r: KitBonusImportRow) => {
                    const meta = STATUS_META[r.status];
                    const checked = meta.selectable && !excluded.has(r.row);
                    return (
                      <tr key={r.row} className={meta.selectable ? (checked ? '' : 'opacity-60') : 'bg-gray-50/60'}>
                        <td className="px-2 py-1.5">
                          {meta.selectable && (
                            <Checkbox checked={checked} onCheckedChange={() => toggleRow(r.row)} disabled={working} aria-label={`Renglón ${r.row}`} />
                          )}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums text-gray-500">{r.row}</td>
                        <td className="px-2 py-1.5 font-medium tabular-nums">{r.sponsorNumber}</td>
                        <td className="px-2 py-1.5">{r.sponsorName ?? '—'}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{money(r.amount)}</td>
                        <td className="px-2 py-1.5">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-2 py-1.5 text-gray-600">
                          {r.groups.length > 0 && (
                            <span>
                              {r.groups.map((g) => `${g.bonuses} ${g.bonuses === 1 ? 'bono' : 'bonos'} · ${weekLabel(g)} · ${money(g.subtotal, g.currencyCode)} (${g.regime})`).join(' + ')}
                              {r.computedIsr !== null && ` · ISR ${r.computedIsr.toFixed(2)}`}
                            </span>
                          )}
                          {r.message && <p className={`mt-0.5 ${meta.selectable ? 'text-amber-700' : 'text-gray-500'}`}>{r.message}</p>}
                        </td>
                      </tr>
                    );
                  })}
                  {preview.invalid.map((inv) => (
                    <tr key={`inv-${inv.row}`} className="bg-gray-50/60">
                      <td className="px-2 py-1.5" />
                      <td className="px-2 py-1.5 tabular-nums text-gray-500">{inv.row}</td>
                      <td className="px-2 py-1.5" colSpan={3}>
                        —
                      </td>
                      <td className="px-2 py-1.5">
                        <StatusBadge status="invalid" />
                      </td>
                      <td className="px-2 py-1.5 text-gray-500">{inv.reason}</td>
                    </tr>
                  ))}
                  {preview.rows.length === 0 && preview.invalid.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-gray-400">
                        La hoja no trae renglones con ID y monto
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {problems.length > 0 && (
              <p className="text-xs text-gray-500">
                Los renglones que no casan no se tocan: revisa el rango de fechas y el filtro CEDIS/CEDEAS de la página, o márcalos a mano.
              </p>
            )}
          </>
        )}

        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <Checkbox checked={stampAfter} onCheckedChange={(v) => setStampAfter(v === true)} disabled={working} />
            <span>
              Timbrar después los recibos de nómina (ASIMILADOS con RFC, CURP y CP)
              {preview && chosenPayroll > 0 ? ` · ${chosenPayroll} ${chosenPayroll === 1 ? 'patrocinador' : 'patrocinadores'}` : ''}
            </span>
          </label>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => close(false)} disabled={working}>
              Cancelar
            </Button>
            <Button
              onClick={() => void apply()}
              disabled={!preview || chosen.length === 0 || working || busy || !paidAt}
              className="bg-green-700 text-white hover:bg-green-800"
            >
              {applying
                ? 'Registrando…'
                : chosen.length > 0
                  ? `Marcar pagados: ${chosen.length} ${chosen.length === 1 ? 'patrocinador' : 'patrocinadores'} · ${chosenBonuses} ${chosenBonuses === 1 ? 'bono' : 'bonos'} · ${money(chosenAmount)}`
                  : 'Marcar pagados'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
