'use client';

// ViaticoDayGrid - Grid semanal de viáticos: concepto × día (como el sistema
// anterior) con categorías plegables, subtotal por categoría, total por
// renglón y por día. Dos variantes:
//   - ViaticoDayGridEditor: captura (montos como texto; Enter/↓/↑ se mueven
//     por la columna; menú por renglón para repetir el monto en la semana).
//   - ViaticoDayGridView: solo lectura (renglones con monto), para el detalle.

import { Fragment, useMemo, useRef, useState } from 'react';
import { ChevronRight, Copy, Eraser, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { dayHeader, todayIso } from '@/lib/viaticos-week';
import type { ViaticoCategory, ViaticoConceptCatalog, ViaticoItem } from '@/types/viaticos';

/** Montos capturados: código de concepto → un texto por día del periodo. */
export type ViaticoGridValues = Record<string, string[]>;

export type ViaticoRowAction = 'weekdays' | 'week' | 'clear';

export const money = (n: number, currency = 'MXN') =>
  n.toLocaleString('es-MX', { style: 'currency', currency });

/** Deja solo dígitos y un punto con 2 decimales (acepta coma como punto). */
export function sanitizeAmount(raw: string): string {
  let s = raw.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const dot = s.indexOf('.');
  if (dot >= 0) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
  const [int, dec] = s.split('.');
  const intPart = int.slice(0, 7);
  return dec !== undefined ? `${intPart}.${dec.slice(0, 2)}` : intPart;
}

export function amountOf(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

function DayHeaderCell({ iso, today }: { iso: string; today: string }) {
  const h = dayHeader(iso);
  return (
    <th
      scope="col"
      className={cn(
        'w-[92px] px-1 py-2 text-center font-normal',
        iso === today && 'text-[#0A4B94]',
      )}
    >
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{h.weekday}</div>
      <div className="text-sm font-semibold">
        {h.day} <span className="text-[11px] font-normal text-muted-foreground">{h.month}</span>
      </div>
    </th>
  );
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

interface EditorProps {
  catalog: ViaticoConceptCatalog;
  days: string[];
  values: ViaticoGridValues;
  onChange: (conceptCode: string, dayIndex: number, value: string) => void;
  onRowAction: (conceptCode: string, action: ViaticoRowAction) => void;
  /** Contenido extra al final de una categoría (p. ej. datos del vehículo). */
  categoryExtra?: Partial<Record<ViaticoCategory, React.ReactNode>>;
  currency?: string;
}

export function ViaticoDayGridEditor({
  catalog,
  days,
  values,
  onChange,
  onRowAction,
  categoryExtra,
  currency = 'MXN',
}: EditorProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const today = todayIso();
  const [closed, setClosed] = useState<Set<ViaticoCategory>>(new Set());

  // Conceptos visibles: activos + los retirados que ya traen monto.
  const groups = useMemo(
    () =>
      catalog.categories.map((cat) => ({
        ...cat,
        concepts: catalog.concepts.filter(
          (c) =>
            c.category === cat.code &&
            (c.active || (values[c.code] ?? []).some((v) => amountOf(v) > 0)),
        ),
      })),
    [catalog, values],
  );

  const rowTotal = (code: string) => sum((values[code] ?? []).map(amountOf));
  const dayTotals = days.map((_, i) =>
    sum(catalog.concepts.map((c) => amountOf(values[c.code]?.[i]))),
  );
  const grand = sum(dayTotals);

  const toggle = (cat: ViaticoCategory) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });

  // Enter / ↓ / ↑: misma columna, renglón siguiente / anterior.
  const move = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const dir = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' || e.key === 'Enter' ? 1 : 0;
    if (!dir) return;
    e.preventDefault();
    const inputs = Array.from(
      tableRef.current?.querySelectorAll<HTMLInputElement>(`input[data-col="${e.currentTarget.dataset.col}"]`) ?? [],
    );
    const idx = inputs.indexOf(e.currentTarget);
    inputs[idx + dir]?.focus();
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table ref={tableRef} className="w-full min-w-[960px] border-collapse text-sm">
        <thead className="bg-muted/60">
          <tr>
            <th scope="col" className="sticky left-0 z-10 w-60 bg-muted px-3 py-2 text-left font-semibold">
              Concepto
            </th>
            {days.map((d) => (
              <DayHeaderCell key={d} iso={d} today={today} />
            ))}
            <th scope="col" className="w-28 px-3 py-2 text-right font-semibold">
              Total
            </th>
            <th scope="col" className="w-10" aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {groups.map((cat) => {
            const isOpen = !closed.has(cat.code);
            const subtotal = sum(cat.concepts.map((c) => rowTotal(c.code)));
            const withAmount = cat.concepts.filter((c) => rowTotal(c.code) > 0).length;
            return (
              <Fragment key={cat.code}>
                <tr className="border-t border-border bg-[#3E667D]/[0.06]">
                  <td colSpan={days.length + 3} className="p-0">
                    <button
                      type="button"
                      onClick={() => toggle(cat.code)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-[#3E667D]/10"
                    >
                      <span className="sticky left-3 flex items-center gap-2 font-semibold text-foreground">
                        <ChevronRight
                          className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-90')}
                        />
                        {cat.label}
                        {withAmount > 0 && (
                          <span className="text-xs font-normal text-muted-foreground">
                            · {withAmount} concepto{withAmount === 1 ? '' : 's'}
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums font-semibold text-foreground">
                        {subtotal > 0 ? money(subtotal, currency) : '—'}
                      </span>
                    </button>
                  </td>
                </tr>
                {isOpen &&
                  cat.concepts.map((c) => {
                    const total = rowTotal(c.code);
                    const hasAny = (values[c.code] ?? []).some((v) => amountOf(v) > 0);
                    return (
                      <tr key={c.code} className="group border-t border-border/60 hover:bg-muted/30">
                        <th
                          scope="row"
                          className="sticky left-0 z-10 bg-background px-3 py-1 text-left font-normal text-foreground group-hover:bg-muted/30"
                        >
                          {c.label}
                        </th>
                        {days.map((d, i) => {
                          const h = dayHeader(d);
                          return (
                            <td key={d} className="px-1 py-1">
                              <input
                                data-col={i}
                                value={values[c.code]?.[i] ?? ''}
                                onChange={(e) => onChange(c.code, i, sanitizeAmount(e.target.value))}
                                onKeyDown={move}
                                inputMode="decimal"
                                autoComplete="off"
                                aria-label={`${c.label}, ${h.weekday} ${h.day}`}
                                className={cn(
                                  'h-8 w-full rounded-md border border-input bg-background px-2 text-right tabular-nums',
                                  'outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40',
                                  amountOf(values[c.code]?.[i]) > 0 && 'border-[#3E667D]/40 bg-[#3E667D]/[0.04]',
                                )}
                              />
                            </td>
                          );
                        })}
                        <td className="px-3 text-right tabular-nums text-foreground">
                          {total > 0 ? money(total, currency) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="pr-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-60 group-hover:opacity-100"
                                aria-label={`Acciones de ${c.label}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem disabled={!hasAny} onSelect={() => onRowAction(c.code, 'weekdays')}>
                                <Copy className="mr-2 h-4 w-4" />
                                Repetir de lunes a viernes
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={!hasAny} onSelect={() => onRowAction(c.code, 'week')}>
                                <Copy className="mr-2 h-4 w-4" />
                                Repetir toda la semana
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem disabled={!hasAny} onSelect={() => onRowAction(c.code, 'clear')}>
                                <Eraser className="mr-2 h-4 w-4" />
                                Limpiar renglón
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                {isOpen && categoryExtra?.[cat.code] && (
                  <tr className="border-t border-border/60">
                    <td colSpan={days.length + 3} className="p-0">
                      <div className="sticky left-0 w-fit max-w-full">{categoryExtra[cat.code]}</div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-muted/60 font-semibold">
            <th scope="row" className="sticky left-0 z-10 bg-muted px-3 py-2 text-left">
              Total por día
            </th>
            {dayTotals.map((t, i) => (
              <td key={days[i]} className="px-1 py-2 text-right tabular-nums">
                {t > 0 ? money(t, currency) : <span className="font-normal text-muted-foreground">—</span>}
              </td>
            ))}
            <td className="px-3 py-2 text-right tabular-nums text-[#0A4B94]">{money(grand, currency)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Solo lectura
// ---------------------------------------------------------------------------

interface ViewProps {
  catalog?: ViaticoConceptCatalog;
  items: ViaticoItem[];
  days: string[];
  currency?: string;
}

const CATEGORY_FALLBACK: { code: ViaticoCategory; label: string }[] = [
  { code: 'lodging', label: 'Hospedaje' },
  { code: 'transport', label: 'Transporte público' },
  { code: 'meals', label: 'Alimentos' },
  { code: 'fuel', label: 'Combustible y vehículo' },
  { code: 'other', label: 'Otros gastos' },
];

export function ViaticoDayGridView({ catalog, items, days, currency = 'MXN' }: ViewProps) {
  const today = todayIso();
  const categories = catalog?.categories ?? CATEGORY_FALLBACK;
  const order = new Map((catalog?.concepts ?? []).map((c, i) => [c.code, i]));

  // concepto → monto por índice de día
  const rows = new Map<string, { label: string; category: ViaticoCategory; amounts: number[] }>();
  for (const it of items) {
    const idx = days.indexOf(it.date);
    if (idx < 0) continue;
    const row = rows.get(it.conceptCode) ?? {
      label: it.conceptLabel,
      category: it.category,
      amounts: days.map(() => 0),
    };
    row.amounts[idx] += it.amount;
    rows.set(it.conceptCode, row);
  }
  const dayTotals = days.map((_, i) => sum([...rows.values()].map((r) => r.amounts[i])));

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[880px] border-collapse text-sm">
        <thead className="bg-muted/60">
          <tr>
            <th scope="col" className="sticky left-0 z-10 w-56 bg-muted px-3 py-2 text-left font-semibold">
              Concepto
            </th>
            {days.map((d) => (
              <DayHeaderCell key={d} iso={d} today={today} />
            ))}
            <th scope="col" className="w-28 px-3 py-2 text-right font-semibold">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => {
            const catRows = [...rows.entries()]
              .filter(([, r]) => r.category === cat.code)
              .sort(([a], [b]) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
            if (catRows.length === 0) return null;
            const subtotal = sum(catRows.map(([, r]) => sum(r.amounts)));
            return (
              <Fragment key={cat.code}>
                <tr className="border-t border-border bg-[#3E667D]/[0.06]">
                  <th scope="rowgroup" colSpan={days.length + 1} className="px-3 py-1.5 text-left font-semibold">
                    <span className="sticky left-3">{cat.label}</span>
                  </th>
                  <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{money(subtotal, currency)}</td>
                </tr>
                {catRows.map(([code, r]) => (
                  <tr key={code} className="border-t border-border/60">
                    <th scope="row" className="sticky left-0 z-10 bg-background px-3 py-1.5 text-left font-normal">
                      {r.label}
                    </th>
                    {r.amounts.map((a, i) => (
                      <td key={days[i]} className="px-2 py-1.5 text-right tabular-nums">
                        {a > 0 ? money(a, currency) : <span className="text-muted-foreground">—</span>}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right tabular-nums">{money(sum(r.amounts), currency)}</td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-muted/60 font-semibold">
            <th scope="row" className="sticky left-0 z-10 bg-muted px-3 py-2 text-left">
              Total por día
            </th>
            {dayTotals.map((t, i) => (
              <td key={days[i]} className="px-2 py-2 text-right tabular-nums">
                {t > 0 ? money(t, currency) : <span className="font-normal text-muted-foreground">—</span>}
              </td>
            ))}
            <td className="px-3 py-2 text-right tabular-nums text-[#0A4B94]">{money(sum(dayTotals), currency)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
