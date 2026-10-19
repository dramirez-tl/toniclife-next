'use client';

// Bono de inscripción (bono por suscrito) con el formato del sistema anterior:
// una fila por kit básico/premium vendido en el rango, pagado al patrocinador
// del comprador con la regla vigente y los impuestos de su régimen. El Excel
// REPORTE_BONO_SUSCRIPCION lo arma el API con las 17 columnas del legacy.

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useKitBonuses } from '@/hooks/useReports';
import { reportsService } from '@/services/reports.service';
import { PermissionGuard } from '@/components/auth';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

/** Mismo tope que el API para el rango. */
const MAX_RANGE_DAYS = 366;

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

export default function BonosInscripcionPage() {
  // Por defecto la semana pasada (lunes→domingo): el legacy lo corría cada lunes.
  const [lastWeekFrom, lastWeekTo] = useMemo(() => weekRange(-1), []);
  const [dateFrom, setDateFrom] = useState(lastWeekFrom);
  const [dateTo, setDateTo] = useState(lastWeekTo);
  const [appliedStart, setAppliedStart] = useState(lastWeekFrom);
  const [appliedEnd, setAppliedEnd] = useState(lastWeekTo);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, isFetching, error, refetch } = useKitBonuses({
    startDate: appliedStart,
    endDate: appliedEnd,
  });

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
      });
      toast.success('Excel generado');
    } catch {
      toast.error('No se pudo generar el Excel');
    } finally {
      setDownloading(false);
    }
  };

  const rows = data?.rows ?? [];
  const summary = data?.summary;
  const retentions = summary ? summary.isr + summary.ivaWithholding + summary.resico : 0;
  const hasData = rows.length > 0;
  const rangeLabel =
    appliedStart === appliedEnd
      ? formatDateDisplay(appliedStart)
      : `${formatDateDisplay(appliedStart)} - ${formatDateDisplay(appliedEnd)}`;

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
              title="REPORTE_BONO_SUSCRIPCION: ID UPLINE | NOMBRES UPLINE | ID | NOMBRES | FECHA REGISTRO | FECHA COMPRA | BONO POR SUSCRITO | TIPO KIT | CLAVE | MONEDA | RÉGIMEN | SUBTOTAL | ISR | IVA | RET IVA | RESICO | TOTAL"
              className="inline-flex items-center gap-2 rounded-lg bg-white text-[#2f5165] px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
            >
              {downloading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2f5165] border-t-transparent" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              )}
              Excel (formato anterior)
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
              <Input
                id="bonos-de"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-auto"
              />
            </div>
            <div>
              <label htmlFor="bonos-hasta" className="block text-xs font-medium text-gray-500 mb-1.5">Hasta</label>
              <Input
                id="bonos-hasta"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <button
                type="button"
                onClick={() => applyDates(...weekRange(-1))}
                className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Semana pasada
              </button>
              <button
                type="button"
                onClick={() => applyDates(...weekRange(0))}
                className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Esta semana
              </button>
              <button
                type="button"
                onClick={() => applyDates(daysAgo(6), daysAgo(0))}
                className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
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
        {data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Bonos</p>
              <p className="text-lg font-bold text-gray-900">{summary?.rows.toLocaleString() ?? 0}</p>
              <p className="text-xs text-gray-400 mt-1">{rangeLabel}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Subtotal</p>
              <p className="text-lg font-bold text-gray-900">{formatAmount(summary?.subtotal ?? 0)}</p>
              <p className="text-xs text-gray-400 mt-1">
                {summary?.byCurrency.map((c) => `${c.currencyCode} ${formatAmount(c.subtotal)}`).join(' · ') || '—'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Retenciones</p>
              <p className="text-lg font-bold text-gray-900">{formatAmount(retentions)}</p>
              <p className="text-xs text-gray-400 mt-1">ISR + Ret. IVA + RESICO · IVA {formatAmount(summary?.iva ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-[#3E667D]/30 bg-[#3E667D] p-4 shadow-sm">
              <p className="text-xs font-medium text-white/70 uppercase tracking-wide mb-2">Total neto</p>
              <p className="text-lg font-bold text-white">{formatAmount(summary?.total ?? 0)}</p>
              <p className="text-xs text-white/70 mt-1">
                {summary?.byCurrency.map((c) => `${c.currencyCode} ${formatAmount(c.total)}`).join(' · ') || '—'}
                {data.periodName && summary && summary.byCurrency.length > 1 ? ` · tasa ${data.periodName}` : ''}
              </p>
            </div>
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
              <p className="text-sm text-gray-400">No hay kits vendidos en el rango seleccionado</p>
              <p className="text-xs text-gray-300">Intenta con otras fechas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
                    {[
                      'Fecha compra',
                      'ID Upline',
                      'Upline',
                      'ID',
                      'Comprador',
                      'Registro',
                      'Kit',
                      'Moneda',
                      'Régimen',
                    ].map((h) => (
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => (
                    <TableRow
                      key={`${r.documentId}-${r.kitCode}-${idx}`}
                      className={`border-b border-gray-100 transition-colors hover:bg-[#3E667D]/[0.03] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
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
                        {r.converted && (
                          <span className="ml-1 text-[10px] text-gray-400" title="Convertido con la tasa del periodo">conv.</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm whitespace-nowrap">
                        {r.regime ? (
                          <span className="text-gray-700">{r.regime}</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            Sin régimen
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-right text-gray-900 whitespace-nowrap tabular-nums">
                        {r.ruleOrigin === 'ninguna' ? (
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                            Sin regla
                          </span>
                        ) : r.missingRate ? (
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                            Sin tasa
                          </span>
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
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="bg-transparent">
                  <TableRow className="border-t-2 border-[#3E667D]/20 bg-[#3E667D]/[0.04] hover:bg-[#3E667D]/[0.04]">
                    <TableCell colSpan={9} className="px-4 py-4 text-sm font-bold text-[#3E667D]">
                      TOTAL ({rows.length} {rows.length === 1 ? 'bono' : 'bonos'})
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm text-right font-bold text-[#3E667D] tabular-nums">{formatAmount(summary?.subtotal ?? 0)}</TableCell>
                    <TableCell className="px-4 py-4 text-sm text-right font-bold text-[#3E667D] tabular-nums">{formatAmount(summary?.isr ?? 0)}</TableCell>
                    <TableCell className="px-4 py-4 text-sm text-right font-bold text-[#3E667D] tabular-nums">{formatAmount(summary?.iva ?? 0)}</TableCell>
                    <TableCell className="px-4 py-4 text-sm text-right font-bold text-[#3E667D] tabular-nums">{formatAmount(summary?.ivaWithholding ?? 0)}</TableCell>
                    <TableCell className="px-4 py-4 text-sm text-right font-bold text-[#3E667D] tabular-nums">{formatAmount(summary?.resico ?? 0)}</TableCell>
                    <TableCell className="px-4 py-4 text-sm text-right font-bold text-[#3E667D] tabular-nums">{formatAmount(summary?.total ?? 0)}</TableCell>
                    <TableCell className="px-4 py-4" />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}
