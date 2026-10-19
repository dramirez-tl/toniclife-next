'use client';

// Bono de inscripción (bono por suscrito) con el formato del sistema anterior:
// una fila por kit básico/premium vendido en el rango, pagado al patrocinador
// del comprador con la regla vigente y los impuestos de su régimen. El Excel
// REPORTE_BONO_SUSCRIPCION lo arma el API con las 17 columnas del legacy.
//
// Control de pago (Tesorería, permiso commissions:validate): cada bono está
// pendiente, pagado (montos congelados al pagar) o no pagado (excluido con
// motivo); se marca por selección o todos los pendientes del rango, y se
// puede revertir (vuelve a pendiente, queda historial).

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useKitBonuses, useMarkKitBonusPayments, useRevertKitBonusPayment } from '@/hooks/useReports';
import { reportsService } from '@/services/reports.service';
import { authService } from '@/services/auth.service';
import { PermissionGuard } from '@/components/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import type { KitBonusGroup, KitBonusPaymentStatus, KitBonusRow } from '@/types/reports';

/** Mismo tope que el API para el rango. */
const MAX_RANGE_DAYS = 366;
/** Permiso de Tesorería para marcar/revertir pagos (mig 142). */
const PAY_PERMISSION = 'commissions:validate';

const pad = (n: number) => String(n).padStart(2, '0');
const toInputDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Lunes→domingo de la semana actual (0) o de semanas anteriores (-1, -2…), hora local. */
function weekRange(offsetWeeks: number): [string, string] {
  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // lunes = 0
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dow + offsetWeeks * 7);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return [toInputDate(monday), toInputDate(sunday)];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toInputDate(d);
}

function formatDateDisplay(dateStr: string | null): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function formatAmount(value: number): string {
  return value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const KIT_LABEL: Record<string, string> = { basico: 'Básico', premium: 'Premium' };

type StatusFilter = 'all' | KitBonusPaymentStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'paid', label: 'Pagados' },
  { key: 'excluded', label: 'No pagados' },
];

const rowKey = (r: KitBonusRow) => `${r.source}:${r.itemId}`;

/** País del patrocinador = quien cobra; por aquí se reparte el pago entre tesorerías. */
const COUNTRY_LABEL: Record<string, string> = { MX: 'México', FN: 'Frontera', US: 'EE. UU.', CO: 'Colombia', GT: 'Guatemala' };
const COUNTRY_ORDER = ['MX', 'FN', 'US', 'CO', 'GT'];
const sortCountries = (list: string[]) =>
  [...list].sort((a, b) => {
    const ia = COUNTRY_ORDER.indexOf(a);
    const ib = COUNTRY_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
  });
const chipClass = (active: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? 'border-[#3E667D] bg-[#3E667D] text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`;

function StatusBadge({ row }: { row: KitBonusRow }) {
  if (row.paymentStatus === 'paid') {
    return (
      <span
        className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20"
        title={[row.paymentReference ? `Ref. ${row.paymentReference}` : '', row.paymentNotes ?? ''].filter(Boolean).join(' · ') || undefined}
      >
        Pagado {formatDateDisplay(row.paidAt)}
      </span>
    );
  }
  if (row.paymentStatus === 'excluded') {
    return (
      <span
        className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20"
        title={row.paymentNotes ?? undefined}
      >
        No pagado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
      Pendiente
    </span>
  );
}

type DialogMode = { kind: 'paid' | 'excluded'; count: number; all: boolean } | { kind: 'revert'; row: KitBonusRow } | null;

function GroupStatusBadge({ g }: { g: KitBonusGroup }) {
  if (g.paymentStatus === 'paid') {
    return (
      <span
        className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20"
        title={g.paymentReference ? `Ref. ${g.paymentReference}` : undefined}
      >
        Pagado {formatDateDisplay(g.paidAt)}
      </span>
    );
  }
  if (g.paymentStatus === 'excluded') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
        No pagado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
      Pendiente
    </span>
  );
}

interface GroupedTableProps {
  groups: KitBonusGroup[];
  canPay: boolean;
  selected: Set<string>;
  allSelected: boolean;
  anyPending: boolean;
  onToggleGroup: (g: KitBonusGroup) => void;
  onToggleAll: () => void;
  expanded: Set<string>;
  onToggleExpand: (key: string) => void;
  totalLabel: string;
}

/** Un renglón por patrocinador: lo que Tesorería deposita. */
function GroupedTable({
  groups,
  canPay,
  selected,
  allSelected,
  anyPending,
  onToggleGroup,
  onToggleAll,
  expanded,
  onToggleExpand,
  totalLabel,
}: GroupedTableProps) {
  const colSpan = canPay ? 9 : 8;
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
            {canPay && (
              <TableHead className="px-4 py-3.5 w-10">
                <Checkbox checked={allSelected} onCheckedChange={onToggleAll} disabled={!anyPending} aria-label="Seleccionar todos los patrocinadores pendientes" />
              </TableHead>
            )}
            {['Estatus', 'ID Upline', 'Upline', 'País', 'Régimen', 'Moneda', 'Bonos', 'Suscritos'].map((h) => (
              <TableHead key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                {h}
              </TableHead>
            ))}
            {['Subtotal', 'ISR', 'IVA', 'Ret IVA', 'RESICO', 'Total'].map((h) => (
              <TableHead key={h} className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                {h}
              </TableHead>
            ))}
            <TableHead className="px-4 py-3.5" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((g, idx) => {
            const isSelected = g.paymentStatus === 'pending' && g.items.every((i) => selected.has(`${i.source}:${i.itemId}`));
            const open = expanded.has(g.key);
            return (
              <Fragment key={g.key}>
                <TableRow
                  className={`border-b border-gray-100 transition-colors hover:bg-[#3E667D]/[0.03] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${g.paymentStatus === 'excluded' ? 'opacity-60' : ''}`}
                >
                  {canPay && (
                    <TableCell className="px-4 py-3 w-10">
                      {g.paymentStatus === 'pending' && (
                        <Checkbox checked={isSelected} onCheckedChange={() => onToggleGroup(g)} aria-label={`Seleccionar los bonos de ${g.sponsorName}`} />
                      )}
                    </TableCell>
                  )}
                  <TableCell className="px-4 py-3 whitespace-nowrap"><GroupStatusBadge g={g} /></TableCell>
                  <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap tabular-nums">{g.sponsorNumber}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{g.sponsorName}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap" title={g.sponsorCountry ? COUNTRY_LABEL[g.sponsorCountry] ?? g.sponsorCountry : undefined}>
                    {g.sponsorCountry ?? '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm whitespace-nowrap">
                    {g.regime ? (
                      <span className="text-gray-700">{g.regime}</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">Sin régimen</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{g.currencyCode}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap tabular-nums">
                    {g.bonuses}
                    {g.recomputed && (
                      <span className="ml-1 rounded bg-[#3E667D]/10 px-1 text-[10px] font-semibold text-[#3E667D]" title="Más de un bono: impuestos calculados sobre la suma">
                        Σ
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={g.items.map((i) => `${i.buyerNumber} ${i.buyerName}`).join(' · ')}>
                    {g.items.map((i) => i.buyerName).join(', ')}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right text-gray-900 whitespace-nowrap tabular-nums">{formatMoney(g.subtotal, g.currencyCode)}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right text-gray-600 whitespace-nowrap tabular-nums">{g.isr ? formatAmount(g.isr) : '—'}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right text-gray-600 whitespace-nowrap tabular-nums">{g.iva ? formatAmount(g.iva) : '—'}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right text-gray-600 whitespace-nowrap tabular-nums">{g.ivaWithholding ? formatAmount(g.ivaWithholding) : '—'}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right text-gray-600 whitespace-nowrap tabular-nums">{g.resico ? formatAmount(g.resico) : '—'}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums">{formatMoney(g.total, g.currencyCode)}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <button type="button" onClick={() => onToggleExpand(g.key)} className="text-xs text-[#3E667D] hover:underline">
                      {open ? 'Ocultar' : 'Ver bonos'}
                    </button>
                  </TableCell>
                </TableRow>
                {open && (
                  <TableRow className="bg-[#3E667D]/[0.03] hover:bg-[#3E667D]/[0.03]">
                    <TableCell colSpan={colSpan + 7} className="px-6 py-2">
                      <ul className="space-y-0.5 text-xs text-gray-600">
                        {g.items.map((i) => (
                          <li key={`${i.source}:${i.itemId}`}>
                            <span className="font-mono text-gray-500">{i.buyerNumber}</span> {i.buyerName} · {KIT_LABEL[i.kitType] ?? i.kitType}{' '}
                            <span className="text-gray-400">{i.kitCode}</span> · {formatDateDisplay(i.purchaseDate)} · {i.documentId} · bono{' '}
                            {formatAmount(i.subtotal)} → neto {formatAmount(i.total)}
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
        <TableFooter className="bg-transparent">
          <TableRow className="border-t-2 border-[#3E667D]/20 bg-[#3E667D]/[0.04] hover:bg-[#3E667D]/[0.04]">
            <TableCell colSpan={colSpan} className="px-4 py-4 text-sm font-bold text-[#3E667D]">
              {totalLabel} ({groups.length} {groups.length === 1 ? 'patrocinador' : 'patrocinadores'} ·{' '}
              {groups.reduce((acc, g) => acc + g.bonuses, 0)} bonos)
            </TableCell>
            {(['subtotal', 'isr', 'iva', 'ivaWithholding', 'resico', 'total'] as const).map((k) => (
              <TableCell key={k} className="px-4 py-4 text-sm text-right font-bold text-[#3E667D] tabular-nums">
                {formatAmount(groups.reduce((acc, g) => acc + g[k], 0))}
              </TableCell>
            ))}
            <TableCell className="px-4 py-4" />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

export default function BonosInscripcionPage() {
  // Por defecto la semana pasada (lunes→domingo): el legacy lo corría cada lunes.
  const [lastWeekFrom, lastWeekTo] = useMemo(() => weekRange(-1), []);
  const [dateFrom, setDateFrom] = useState(lastWeekFrom);
  const [dateTo, setDateTo] = useState(lastWeekTo);
  const [appliedStart, setAppliedStart] = useState(lastWeekFrom);
  const [appliedEnd, setAppliedEnd] = useState(lastWeekTo);
  const [downloading, setDownloading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<DialogMode>(null);
  // Vista compacta por patrocinador (lo que se deposita) o una fila por bono.
  const [view, setView] = useState<'grouped' | 'detail'>('grouped');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [paidAt, setPaidAt] = useState(() => daysAgo(0));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  // Permiso leído en cliente (localStorage) para no desfasar el render del servidor.
  const [canPay, setCanPay] = useState(false);
  useEffect(() => {
    setCanPay(authService.hasPermission(PAY_PERMISSION));
  }, []);
  // Filtro por país del patrocinador (quien cobra): el API filtra, así los
  // totales y el Excel son solo de ese país y "marcar pagados" no toca otros.
  const [countries, setCountries] = useState<Set<string>>(new Set());
  const [knownCountries, setKnownCountries] = useState<string[]>([]);
  const countryParam = countries.size ? sortCountries([...countries]).join(',') : undefined;
  const toggleCountry = (code: string) => {
    setCountries((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
    setSelected(new Set());
  };

  const { data, isLoading, isFetching, error, refetch } = useKitBonuses({
    startDate: appliedStart,
    endDate: appliedEnd,
    ...(countryParam ? { country: countryParam } : {}),
  });
  useEffect(() => {
    if (!data) return;
    const found = data.rows.map((r) => r.sponsorCountry).filter((c): c is string => !!c);
    if (found.length === 0) return;
    setKnownCountries((prev) => sortCountries([...new Set([...prev, ...found])]));
  }, [data]);
  const markMutation = useMarkKitBonusPayments();
  const revertMutation = useRevertKitBonusPayment();

  const applyDates = useCallback((from: string, to: string) => {
    if (!from || !to) {
      toast.error('Captura las fechas De y Hasta');
      return;
    }
    if (from > to) {
      toast.error('La fecha "De" no puede ser mayor que "Hasta"');
      return;
    }
    const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
    if (days > MAX_RANGE_DAYS) {
      toast.error(`El rango no puede exceder ${MAX_RANGE_DAYS} días`);
      return;
    }
    setDateFrom(from);
    setDateTo(to);
    setAppliedStart(from);
    setAppliedEnd(to);
    setSelected(new Set());
  }, []);

  const handleDownload = async () => {
    if (!appliedStart || !appliedEnd) {
      toast.error('Aplica un rango de fechas');
      return;
    }
    setDownloading(true);
    try {
      await reportsService.downloadKitBonusesLegacyXlsx({
        startDate: appliedStart,
        endDate: appliedEnd,
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        ...(countryParam ? { country: countryParam } : {}),
      });
      toast.success(statusFilter === 'all' ? 'Excel generado' : `Excel generado (solo ${STATUS_FILTERS.find((f) => f.key === statusFilter)?.label.toLowerCase()})`);
    } catch {
      toast.error('No se pudo generar el Excel');
    } finally {
      setDownloading(false);
    }
  };

  const allRows = useMemo(() => data?.rows ?? [], [data]);
  const rows = useMemo(
    () => (statusFilter === 'all' ? allRows : allRows.filter((r) => r.paymentStatus === statusFilter)),
    [allRows, statusFilter],
  );
  const summary = data?.summary;
  const byStatus = summary?.byStatus;
  const retentions = summary ? summary.isr + summary.ivaWithholding + summary.resico : 0;
  const hasData = rows.length > 0;
  const rangeLabel =
    appliedStart === appliedEnd
      ? formatDateDisplay(appliedStart)
      : `${formatDateDisplay(appliedStart)} - ${formatDateDisplay(appliedEnd)}`;

  // Selección: solo filas pendientes visibles.
  const visiblePending = useMemo(() => rows.filter((r) => r.paymentStatus === 'pending'), [rows]);
  const selectedVisible = visiblePending.filter((r) => selected.has(rowKey(r)));
  const allVisibleSelected = visiblePending.length > 0 && selectedVisible.length === visiblePending.length;
  const toggleRow = (r: KitBonusRow) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const k = rowKey(r);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visiblePending.forEach((r) => next.delete(rowKey(r)));
      else visiblePending.forEach((r) => next.add(rowKey(r)));
      return next;
    });

  // Grupos por patrocinador (mismo filtro de estatus). Seleccionar un grupo =
  // seleccionar todos sus bonos pendientes (las claves son las de las filas).
  const groups = useMemo(
    () => (data?.groups ?? []).filter((g) => statusFilter === 'all' || g.paymentStatus === statusFilter),
    [data, statusFilter],
  );
  const groupKeys = (g: KitBonusGroup) => g.items.map((i) => `${i.source}:${i.itemId}`);
  const pendingGroups = groups.filter((g) => g.paymentStatus === 'pending');
  const allGroupsSelected =
    pendingGroups.length > 0 && pendingGroups.every((g) => groupKeys(g).every((k) => selected.has(k)));
  const selectedGroupCount = pendingGroups.filter((g) => groupKeys(g).every((k) => selected.has(k))).length;
  const toggleGroup = (g: KitBonusGroup) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const keys = groupKeys(g);
      const all = keys.every((k) => next.has(k));
      keys.forEach((k) => (all ? next.delete(k) : next.add(k)));
      return next;
    });
  const toggleExpand = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const filtersLabel = `${countryParam ? countryParam.split(',').map((c) => COUNTRY_LABEL[c] ?? c).join(' + ') : 'todos los países'} · ${rangeLabel}`;
  // Sin selección se marcan los pendientes VISIBLES (respetando país y estatus),
  // nunca todo el rango: cada tesorería marca solo lo que pagó.
  const openMark = (kind: 'paid' | 'excluded') => {
    const count = selectedVisible.length || visiblePending.length;
    if (count === 0) {
      toast.error('No hay bonos pendientes con los filtros actuales');
      return;
    }
    setPaidAt(daysAgo(0));
    setReference('');
    setNotes('');
    setDialog({ kind, count, all: selectedVisible.length === 0 });
  };

  const submitMark = async () => {
    if (!dialog || dialog.kind === 'revert') return;
    if (dialog.kind === 'excluded' && !notes.trim()) {
      toast.error('Indica el motivo por el que no se paga');
      return;
    }
    try {
      const targets = dialog.all ? visiblePending : selectedVisible;
      const items = targets.map((r) => ({ source: r.source, itemId: r.itemId }));
      const result = await markMutation.mutateAsync({
        startDate: appliedStart,
        endDate: appliedEnd,
        status: dialog.kind,
        items,
        ...(dialog.kind === 'paid' ? { paidAt, reference: reference.trim() || undefined } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      toast.success(
        `${result.marked} ${result.marked === 1 ? 'bono marcado' : 'bonos marcados'} como ${dialog.kind === 'paid' ? 'pagados' : 'no pagados'}` +
          (result.skipped ? ` · ${result.skipped} ya tenían estatus` : ''),
      );
      setSelected(new Set());
      setDialog(null);
    } catch {
      toast.error('No se pudo registrar el pago');
    }
  };

  const submitRevert = async () => {
    if (!dialog || dialog.kind !== 'revert' || !dialog.row.paymentId) return;
    try {
      await revertMutation.mutateAsync({ id: dialog.row.paymentId, reason: notes.trim() || undefined });
      toast.success('Registro revertido: el bono vuelve a pendiente');
      setDialog(null);
    } catch {
      toast.error('No se pudo revertir');
    }
  };

  const busy = markMutation.isPending || revertMutation.isPending;

  return (
    <PermissionGuard permissions={['reports:read', 'reports:*']}>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8 pb-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#3E667D] to-[#2f5165] px-6 py-6 shadow-lg">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
          <div className="absolute -right-4 bottom-0 h-24 w-24 rounded-full bg-white/5" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Bono de Inscripción</h1>
              <p className="text-sm text-white/70 mt-1">
                Bono por suscrito de cada kit básico/premium vendido, pagado al patrocinador del comprador
                con los impuestos de su régimen (como el sistema anterior)
              </p>
            </div>
            <button
              onClick={handleDownload}
              disabled={!appliedStart || !appliedEnd || isFetching || downloading}
              title="REPORTE_BONO_SUSCRIPCION: hoja POR PATROCINADOR (un renglón por patrocinador, impuestos sobre la suma: la que se usa para depositar) + Hoja1 con las 17 columnas del sistema anterior (una fila por suscrito) + ESTATUS PAGO"
              className="inline-flex items-center gap-2 rounded-lg bg-white text-[#2f5165] px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
            >
              {downloading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2f5165] border-t-transparent" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              )}
              Excel (formato anterior){statusFilter !== 'all' ? ` · ${STATUS_FILTERS.find((f) => f.key === statusFilter)?.label.toLowerCase()}` : ''}
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#3E667D]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
            </svg>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Fecha de compra del kit</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div>
              <label htmlFor="bonos-de" className="block text-xs font-medium text-gray-500 mb-1.5">De</label>
              <Input id="bonos-de" type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className="w-auto" />
            </div>
            <div>
              <label htmlFor="bonos-hasta" className="block text-xs font-medium text-gray-500 mb-1.5">Hasta</label>
              <Input id="bonos-hasta" type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className="w-auto" />
            </div>
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <button type="button" onClick={() => applyDates(...weekRange(-1))} className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Semana pasada
              </button>
              <button type="button" onClick={() => applyDates(...weekRange(0))} className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Esta semana
              </button>
              <button type="button" onClick={() => applyDates(daysAgo(6), daysAgo(0))} className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Últimos 7 días
              </button>
              <span className="text-xs text-gray-400">Día local de la sucursal de la venta</span>
            </div>
            <button
              onClick={() => applyDates(dateFrom, dateTo)}
              disabled={isFetching || !dateFrom || !dateTo}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3E667D] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2f5165] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all whitespace-nowrap"
            >
              {isFetching ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Cargando...
                </>
              ) : (
                'Aplicar'
              )}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500">País del patrocinador (quien cobra):</span>
            <button
              type="button"
              onClick={() => {
                setCountries(new Set());
                setSelected(new Set());
              }}
              className={chipClass(countries.size === 0)}
            >
              Todos
            </button>
            {knownCountries.map((c) => (
              <button key={c} type="button" onClick={() => toggleCountry(c)} className={chipClass(countries.has(c))}>
                {c} · {COUNTRY_LABEL[c] ?? c}
              </button>
            ))}
            {countries.size > 0 && (
              <span className="text-xs text-gray-400">Totales, Excel y marcar pagados: solo {countryParam?.split(',').map((c) => COUNTRY_LABEL[c] ?? c).join(' + ')}</span>
            )}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Solo kits vendidos en este sistema (ventas POS completadas y pedidos en línea pagados). Las semanas
            anteriores al cambio de sistema se siguen bajando del sistema anterior.
          </p>
        </div>

        {/* Avisos */}
        {summary && (summary.missingRegime > 0 || summary.missingRule > 0 || summary.missingRate > 0) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-1">
            {summary.missingRegime > 0 && (
              <p>
                <strong>{summary.missingRegime}</strong> {summary.missingRegime === 1 ? 'bono va' : 'bonos van'} sin
                ISR/IVA porque el patrocinador no tiene régimen fiscal capturado en este sistema (el anterior usaba
                el régimen del patrocinador). Captúralo en la ficha del distribuidor.
              </p>
            )}
            {summary.missingRule > 0 && (
              <p>
                <strong>{summary.missingRule}</strong> {summary.missingRule === 1 ? 'kit' : 'kits'} sin regla de bono
                para su país (subtotal 0). Revísalo en Configuración → Kits.
              </p>
            )}
            {summary.missingRate > 0 && (
              <p>
                <strong>{summary.missingRate}</strong> {summary.missingRate === 1 ? 'bono' : 'bonos'} sin tipo de
                cambio para convertir a la moneda del patrocinador (subtotal 0). Captura la tasa del periodo.
              </p>
            )}
          </div>
        )}

        {/* Resumen */}
        {data && byStatus && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Bonos</p>
              <p className="text-lg font-bold text-gray-900">{summary?.rows.toLocaleString() ?? 0}</p>
              <p className="text-xs text-gray-400 mt-1">
                {rangeLabel} · subtotal {formatAmount(summary?.subtotal ?? 0)} · retenciones {formatAmount(retentions)}
              </p>
            </div>
            <div className="rounded-xl border border-[#3E667D]/30 bg-[#3E667D] p-4 shadow-sm">
              <p className="text-xs font-medium text-white/70 uppercase tracking-wide mb-2">Pendiente por pagar</p>
              <p className="text-lg font-bold text-white">{formatAmount(byStatus.pending.total)}</p>
              <p className="text-xs text-white/70 mt-1">
                {byStatus.pending.rows} {byStatus.pending.rows === 1 ? 'bono' : 'bonos'} ·{' '}
                {byStatus.pending.byCurrency.map((c) => `${c.currencyCode} ${formatAmount(c.total)}`).join(' · ') || '—'}
              </p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
              <p className="text-xs font-medium text-green-700/70 uppercase tracking-wide mb-2">Pagado</p>
              <p className="text-lg font-bold text-green-800">{formatAmount(byStatus.paid.total)}</p>
              <p className="text-xs text-green-700/70 mt-1">
                {byStatus.paid.rows} {byStatus.paid.rows === 1 ? 'bono' : 'bonos'} ·{' '}
                {byStatus.paid.byCurrency.map((c) => `${c.currencyCode} ${formatAmount(c.total)}`).join(' · ') || '—'}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <p className="text-xs font-medium text-amber-700/70 uppercase tracking-wide mb-2">No pagados</p>
              <p className="text-lg font-bold text-amber-800">{byStatus.excluded.rows}</p>
              <p className="text-xs text-amber-700/70 mt-1">
                {byStatus.excluded.rows ? `${formatAmount(byStatus.excluded.total)} excluidos del pago` : 'ninguno'}
              </p>
            </div>
          </div>
        )}

        {/* Barra de estatus / acciones */}
        {data && (
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs font-medium" role="tablist" aria-label="Estatus de pago">
              {STATUS_FILTERS.map((f) => {
                const n = f.key === 'all' ? allRows.length : (byStatus?.[f.key].rows ?? 0);
                return (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className={`rounded-md px-3 py-1.5 transition-colors ${statusFilter === f.key ? 'bg-white text-[#3E667D] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {f.label} <span className="text-gray-400">({n})</span>
                  </button>
                );
              })}
            </div>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs font-medium" role="tablist" aria-label="Vista">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'grouped'}
                onClick={() => setView('grouped')}
                className={`rounded-md px-3 py-1.5 transition-colors ${view === 'grouped' ? 'bg-white text-[#3E667D] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                title="Un renglón por patrocinador con la suma de sus bonos; impuestos sobre la suma"
              >
                Por patrocinador <span className="text-gray-400">({groups.length})</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'detail'}
                onClick={() => setView('detail')}
                className={`rounded-md px-3 py-1.5 transition-colors ${view === 'detail' ? 'bg-white text-[#3E667D] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Por bono <span className="text-gray-400">({rows.length})</span>
              </button>
            </div>
            {canPay && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">
                  {selectedVisible.length
                    ? `${selectedVisible.length} ${selectedVisible.length === 1 ? 'bono seleccionado' : 'bonos seleccionados'}${selectedGroupCount ? ` · ${selectedGroupCount} ${selectedGroupCount === 1 ? 'patrocinador' : 'patrocinadores'}` : ''}`
                    : `Sin selección: aplica a los ${visiblePending.length} pendientes visibles (${filtersLabel})`}
                </span>
                <Button size="sm" onClick={() => openMark('paid')} disabled={busy || visiblePending.length === 0} className="bg-green-700 hover:bg-green-800 text-white">
                  Marcar como pagados
                </Button>
                <Button size="sm" variant="outline" onClick={() => openMark('excluded')} disabled={busy || visiblePending.length === 0}>
                  Marcar como no pagados
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tabla */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {isLoading || isFetching ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#3E667D]" />
              <span className="text-sm text-gray-400">Calculando bonos...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <p className="text-sm text-red-500 font-medium">Error al cargar el reporte</p>
              <button onClick={() => refetch()} className="text-xs text-[#3E667D] hover:underline">
                Reintentar
              </button>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <p className="text-sm text-gray-400">
                {statusFilter === 'all' ? 'No hay kits vendidos en el rango seleccionado' : 'No hay bonos con ese estatus en el rango'}
              </p>
              <p className="text-xs text-gray-300">Intenta con otras fechas o cambia el filtro de estatus</p>
            </div>
          ) : view === 'grouped' ? (
            <GroupedTable
              groups={groups}
              canPay={canPay}
              selected={selected}
              allSelected={allGroupsSelected}
              anyPending={pendingGroups.length > 0}
              onToggleGroup={toggleGroup}
              onToggleAll={toggleAllVisible}
              expanded={expanded}
              onToggleExpand={toggleExpand}
              totalLabel={statusFilter === 'all' ? 'TOTAL' : `TOTAL ${STATUS_FILTERS.find((f) => f.key === statusFilter)?.label.toUpperCase()}`}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
                    {canPay && (
                      <TableHead className="px-4 py-3.5 w-10">
                        <Checkbox
                          checked={allVisibleSelected}
                          onCheckedChange={toggleAllVisible}
                          disabled={visiblePending.length === 0}
                          aria-label="Seleccionar todos los pendientes visibles"
                        />
                      </TableHead>
                    )}
                    {['Estatus', 'Fecha compra', 'ID Upline', 'Upline', 'ID', 'Comprador', 'Registro', 'Kit', 'Moneda', 'País', 'Régimen'].map((h) => (
                      <TableHead key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                    {['Subtotal', 'ISR', 'IVA', 'Ret IVA', 'RESICO', 'Total'].map((h) => (
                      <TableHead key={h} className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                    <TableHead className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Documento
                    </TableHead>
                    {canPay && <TableHead className="px-4 py-3.5" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => (
                    <TableRow
                      key={rowKey(r)}
                      className={`border-b border-gray-100 transition-colors hover:bg-[#3E667D]/[0.03] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${r.paymentStatus === 'excluded' ? 'opacity-60' : ''}`}
                    >
                      {canPay && (
                        <TableCell className="px-4 py-3 w-10">
                          {r.paymentStatus === 'pending' && (
                            <Checkbox checked={selected.has(rowKey(r))} onCheckedChange={() => toggleRow(r)} aria-label="Seleccionar bono" />
                          )}
                        </TableCell>
                      )}
                      <TableCell className="px-4 py-3 whitespace-nowrap"><StatusBadge row={r} /></TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDateDisplay(r.purchaseDate)}</TableCell>
                      <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap tabular-nums">{r.sponsorNumber}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{r.sponsorName}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap tabular-nums">{r.buyerNumber}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{r.buyerName}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDateDisplay(r.registrationDate)}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {KIT_LABEL[r.kitType] ?? r.kitType} <span className="text-xs text-gray-400">{r.kitCode}</span>
                        {r.units > 1 && <span className="ml-1 text-xs text-gray-400">×{r.units}</span>}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {r.currencyCode}
                        {r.converted && <span className="ml-1 text-[10px] text-gray-400" title="Convertido con la tasa del periodo">conv.</span>}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap" title={r.sponsorCountry ? COUNTRY_LABEL[r.sponsorCountry] ?? r.sponsorCountry : undefined}>
                        {r.sponsorCountry ?? '—'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm whitespace-nowrap">
                        {r.regime ? (
                          <span className="text-gray-700">{r.regime}</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">Sin régimen</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-right text-gray-900 whitespace-nowrap tabular-nums">
                        {r.ruleOrigin === 'ninguna' ? (
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">Sin regla</span>
                        ) : r.missingRate ? (
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">Sin tasa</span>
                        ) : (
                          formatMoney(r.subtotal, r.currencyCode)
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-right text-gray-600 whitespace-nowrap tabular-nums">{r.isr ? formatAmount(r.isr) : '—'}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-right text-gray-600 whitespace-nowrap tabular-nums">{r.iva ? formatAmount(r.iva) : '—'}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-right text-gray-600 whitespace-nowrap tabular-nums">{r.ivaWithholding ? formatAmount(r.ivaWithholding) : '—'}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-right text-gray-600 whitespace-nowrap tabular-nums">{r.resico ? formatAmount(r.resico) : '—'}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums">{formatMoney(r.total, r.currencyCode)}</TableCell>
                      <TableCell className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {r.documentId} <span className="text-gray-300">· {r.source === 'online' ? 'En línea' : 'POS'}</span>
                      </TableCell>
                      {canPay && (
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          {r.paymentStatus !== 'pending' && r.paymentId && (
                            <button
                              type="button"
                              onClick={() => {
                                setNotes('');
                                setDialog({ kind: 'revert', row: r });
                              }}
                              disabled={busy}
                              className="text-xs text-[#3E667D] hover:underline disabled:opacity-50"
                            >
                              Revertir
                            </button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="bg-transparent">
                  <TableRow className="border-t-2 border-[#3E667D]/20 bg-[#3E667D]/[0.04] hover:bg-[#3E667D]/[0.04]">
                    <TableCell colSpan={canPay ? 12 : 11} className="px-4 py-4 text-sm font-bold text-[#3E667D]">
                      {statusFilter === 'all' ? 'TOTAL' : `TOTAL ${STATUS_FILTERS.find((f) => f.key === statusFilter)?.label.toUpperCase()}`} ({rows.length}{' '}
                      {rows.length === 1 ? 'bono' : 'bonos'})
                    </TableCell>
                    {(['subtotal', 'isr', 'iva', 'ivaWithholding', 'resico', 'total'] as const).map((k) => (
                      <TableCell key={k} className="px-4 py-4 text-sm text-right font-bold text-[#3E667D] tabular-nums">
                        {formatAmount(rows.reduce((acc, r) => acc + r[k], 0))}
                      </TableCell>
                    ))}
                    <TableCell className="px-4 py-4" />
                    {canPay && <TableCell className="px-4 py-4" />}
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </div>

        {/* Diálogo: marcar pagados / no pagados / revertir */}
        <Dialog open={dialog !== null} onOpenChange={(open) => !open && !busy && setDialog(null)}>
          <DialogContent className="sm:max-w-md">
            {dialog?.kind === 'paid' && (
              <>
                <DialogHeader>
                  <DialogTitle>Marcar como pagados</DialogTitle>
                  <DialogDescription>
                    {dialog.all ? `Los ${dialog.count} bonos pendientes visibles (${filtersLabel})` : `${dialog.count} ${dialog.count === 1 ? 'bono seleccionado' : 'bonos seleccionados'}`}.
                    Se congelan subtotal, impuestos y total; si un patrocinador tiene varios bonos en este pago, los
                    impuestos se calculan sobre la suma.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="bonos-paid-at">Fecha de pago</Label>
                    <Input id="bonos-paid-at" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="mt-1 w-auto" />
                  </div>
                  <div>
                    <Label htmlFor="bonos-ref">Referencia (lote, transferencia)</Label>
                    <Input id="bonos-ref" value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} className="mt-1" placeholder="Opcional" />
                  </div>
                  <div>
                    <Label htmlFor="bonos-notes">Comentario</Label>
                    <Textarea id="bonos-notes" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} className="mt-1" placeholder="Opcional" rows={2} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>Cancelar</Button>
                  <Button onClick={submitMark} disabled={busy || !paidAt} className="bg-green-700 hover:bg-green-800 text-white">
                    {busy ? 'Guardando…' : 'Confirmar pago'}
                  </Button>
                </DialogFooter>
              </>
            )}
            {dialog?.kind === 'excluded' && (
              <>
                <DialogHeader>
                  <DialogTitle>Marcar como no pagados</DialogTitle>
                  <DialogDescription>
                    {dialog.all ? `Los ${dialog.count} bonos pendientes visibles (${filtersLabel})` : `${dialog.count} ${dialog.count === 1 ? 'bono seleccionado' : 'bonos seleccionados'}`}.
                    Quedan fuera de lo pendiente; se puede revertir después.
                  </DialogDescription>
                </DialogHeader>
                <div>
                  <Label htmlFor="bonos-reason">Motivo</Label>
                  <Textarea id="bonos-reason" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} className="mt-1" placeholder="Ej. venta duplicada, patrocinador dado de baja…" rows={3} />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>Cancelar</Button>
                  <Button onClick={submitMark} disabled={busy || !notes.trim()}>
                    {busy ? 'Guardando…' : 'Confirmar'}
                  </Button>
                </DialogFooter>
              </>
            )}
            {dialog?.kind === 'revert' && (
              <>
                <DialogHeader>
                  <DialogTitle>Revertir registro de pago</DialogTitle>
                  <DialogDescription>
                    El bono de {dialog.row.sponsorNumber} por el kit {dialog.row.kitCode} ({dialog.row.documentId}) vuelve a pendiente; el registro
                    actual queda como historial.
                  </DialogDescription>
                </DialogHeader>
                <div>
                  <Label htmlFor="bonos-revert-reason">Motivo</Label>
                  <Textarea id="bonos-revert-reason" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} className="mt-1" placeholder="Opcional" rows={2} />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>Cancelar</Button>
                  <Button variant="destructive" onClick={submitRevert} disabled={busy}>
                    {busy ? 'Revirtiendo…' : 'Revertir'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
