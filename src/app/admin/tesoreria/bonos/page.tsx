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
//
// Comprobante del bono pagado (20-oct-2026): a los patrocinadores ASIMILADOS
// (MXN) Tonic Life les EMITE un recibo de nómina (CFDI N) por grupo pagado
// ("Timbrar"); los RESICO/FIC/MORAL/FRONTERIZA emiten su propio CFDI y aquí
// se REGISTRA el XML contra el pago. Lo pinta la columna "Comprobante" de la
// vista por patrocinador.
//
// 26-oct-2026: vive en Tesorería (/admin/tesoreria/bonos; la ruta vieja de
// Reportes redirige). Apartados: un patrocinador de México/Frontera SIN
// régimen fiscal asignado no se paga (el ISR/IVA debe generarse siempre); el
// API lo manda como `paymentStatus: 'held'`, fuera de lo pendiente y sin
// casilla, con enlace para capturar sus datos en Validación de datos.

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowDownTrayIcon, ChevronDownIcon, ChevronUpIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { TreasuryHeader, TreasuryTabs } from '@/components/admin/treasury';
import { paymentMethodLabel } from '@/lib/delivery-print';
import {
  useKitBonuses,
  useMarkKitBonusPayments,
  useRegisterKitBonusReceivedCfdi,
  useRevertKitBonusPayment,
  useStampKitBonusPayroll,
  useUnlinkKitBonusReceivedCfdi,
} from '@/hooks/useReports';
import { reportsService } from '@/services/reports.service';
import { authService } from '@/services/auth.service';
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
import type {
  KitBonusBranchType,
  KitBonusGroup,
  KitBonusGroupItem,
  KitBonusGroupVoucher,
  KitBonusHoldReason,
  KitBonusPaymentLine,
  KitBonusPaymentStatus,
  KitBonusRow,
} from '@/types/reports';

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
  { key: 'held', label: 'Apartados' },
  { key: 'paid', label: 'Pagados' },
  { key: 'excluded', label: 'No pagados' },
];

/**
 * Sucursal donde se vendió el kit (27-oct-2026): los inscritos en CEDEAS se
 * pagan aparte de los de CEDIS (sucursales normales). El API filtra por
 * branches.is_cedea, así que totales, Excel y "marcar pagados" respetan el
 * filtro; por defecto CEDIS.
 */
const BRANCH_TYPE_OPTIONS: { key: KitBonusBranchType; label: string; short: string }[] = [
  { key: 'cedis', label: 'CEDIS · sucursales', short: 'CEDIS' },
  { key: 'cedeas', label: 'CEDEAS', short: 'CEDEAS' },
  { key: 'all', label: 'Todas', short: 'CEDIS + CEDEAS' },
];
const branchTypeShort = (t: KitBonusBranchType) => BRANCH_TYPE_OPTIONS.find((o) => o.key === t)?.short ?? t;

/** Badge sutil del canal del kit: CEDIS (sucursal normal) o CEDEA; un grupo que mezcla muestra los dos. */
function ChannelBadge({ cedea }: { cedea: boolean }) {
  return cedea ? (
    <span className="inline-flex items-center rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 ring-1 ring-inset ring-violet-600/20" title="Kit vendido en una CEDEA (se paga aparte)">
      CEDEA
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 ring-1 ring-inset ring-gray-300/60" title="Kit vendido en una sucursal normal (CEDIS)">
      CEDIS
    </span>
  );
}

function GroupChannelBadges({ items }: { items: KitBonusGroupItem[] }) {
  const hasCedis = items.some((i) => !i.saleBranchIsCedea);
  const hasCedea = items.some((i) => i.saleBranchIsCedea === true);
  return (
    <span className="inline-flex items-center gap-1">
      {hasCedis && <ChannelBadge cedea={false} />}
      {hasCedea && <ChannelBadge cedea />}
    </span>
  );
}

const rowKey = (r: KitBonusRow) => `${r.source}:${r.itemId}`;

/** Por qué un bono está apartado (mismo texto que el API en el Excel). */
const HOLD_MESSAGES: Record<KitBonusHoldReason, string> = {
  REGIME_MISSING:
    'El patrocinador cobra en México/Frontera y no tiene régimen fiscal asignado: pídele sus datos fiscales (constancia) y asígnalo en Validación de datos. Hasta entonces el bono no se paga.',
};
const holdMessage = (reason: KitBonusHoldReason | null) => (reason ? HOLD_MESSAGES[reason] : 'Bono apartado');
/** Bandeja de Tesorería donde se asigna el régimen de comisión del patrocinador. */
const fiscalDataHref = (sponsorId: string) => `/admin/tesoreria/validacion-datos?review=${encodeURIComponent(sponsorId)}`;

function HeldPill({ reason }: { reason: KitBonusHoldReason | null }) {
  return (
    <span
      className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20"
      title={holdMessage(reason)}
    >
      Sin datos fiscales
    </span>
  );
}

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
  if (row.paymentStatus === 'held') return <HeldPill reason={row.holdReason} />;
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
      Pendiente
    </span>
  );
}

type DialogMode =
  | { kind: 'paid' | 'excluded'; count: number; all: boolean }
  | { kind: 'revert'; row: KitBonusRow }
  | { kind: 'stamp'; group: KitBonusGroup }
  | { kind: 'received'; group: KitBonusGroup }
  | { kind: 'unlink'; group: KitBonusGroup }
  | null;

/** Mensaje del API ({ code, message } de BillingErrorFilter o de Nest) o el texto de respaldo. */
function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: unknown } } };
  const m = e?.response?.data?.message;
  if (typeof m === 'string' && m.trim()) return m;
  if (Array.isArray(m) && m.length) return String(m[0]);
  return fallback;
}

/** kit_bonus_payments.id de los bonos del grupo (los pagados siempre lo traen). */
const groupPaymentIds = (g: KitBonusGroup) => g.items.map((i) => i.paymentId).filter((id): id is string => !!id);

/** Grupo ASIMILADOS al que se le puede (volver a) emitir el recibo: sin recibo vivo y con datos completos. */
function isPayrollReady(g: KitBonusGroup): boolean {
  const v = g.voucher;
  return (
    !!v &&
    v.mode === 'payroll' &&
    (v.status === 'not_stamped' || v.status === 'cancelled' || v.status === 'error') &&
    v.issues.length === 0 &&
    groupPaymentIds(g).length === g.items.length
  );
}

const shortUuid = (uuid: string | null) => (uuid ? `${uuid.slice(0, 8)}…` : '');

interface VoucherCellProps {
  g: KitBonusGroup;
  canPay: boolean;
  busy: boolean;
  onStamp: (g: KitBonusGroup) => void;
  onRegister: (g: KitBonusGroup) => void;
  onUnlink: (g: KitBonusGroup) => void;
  onDownload: (g: KitBonusGroup, ext: 'pdf' | 'xml') => void;
}

/** Columna "Comprobante": recibo de nómina (ASIMILADOS) o CFDI del distribuidor (RESICO…). */
function VoucherCell({ g, canPay, busy, onStamp, onRegister, onUnlink, onDownload }: VoucherCellProps) {
  const v: KitBonusGroupVoucher | null = g.voucher;
  if (g.paymentStatus !== 'paid' || !v || v.mode === 'none') {
    return <span className="text-xs text-gray-300">—</span>;
  }
  const link = 'text-xs text-[#3E667D] hover:underline disabled:opacity-50';
  const pill = (cls: string, text: string, title?: string) => (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`} title={title}>
      {text}
    </span>
  );
  const partial = v.partial ? pill('bg-red-50 text-red-700 ring-red-600/20', 'Parcial', 'El comprobante no cubre todos los bonos del grupo: revisa') : null;

  if (v.mode === 'payroll') {
    if (v.status === 'stamped') {
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {pill('bg-green-50 text-green-700 ring-green-600/20', `Nómina ${v.folio ?? shortUuid(v.uuid)}`, v.uuid ?? undefined)}
          <button type="button" onClick={() => onDownload(g, 'pdf')} className={link}>PDF</button>
          <button type="button" onClick={() => onDownload(g, 'xml')} className={link}>XML</button>
          {partial}
        </div>
      );
    }
    if (v.status === 'in_progress') {
      return pill('bg-blue-50 text-blue-700 ring-blue-600/20', 'Timbrando…', 'El recibo se está timbrando; actualiza en unos segundos');
    }
    const issues = v.issues.length ? v.issues.join(' · ') : '';
    const label = v.status === 'error' ? 'Reintentar' : v.status === 'cancelled' ? 'Timbrar de nuevo' : 'Timbrar';
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {v.status === 'error' && pill('bg-red-50 text-red-700 ring-red-600/20', 'Error PAC', v.error ?? undefined)}
        {v.status === 'cancelled' && pill('bg-gray-100 text-gray-600 ring-gray-500/10', 'Recibo cancelado', v.uuid ?? undefined)}
        {v.status === 'not_stamped' && !issues && pill('bg-amber-50 text-amber-700 ring-amber-600/20', 'Sin recibo')}
        {issues && pill('bg-red-50 text-red-700 ring-red-600/20', 'Faltan datos', issues)}
        {canPay && (
          <button type="button" onClick={() => onStamp(g)} disabled={busy || !!issues} className={link} title={issues || 'Emitir el recibo de nómina (CFDI) de este pago'}>
            {label}
          </button>
        )}
      </div>
    );
  }

  // CFDI del distribuidor
  if (v.status === 'registered') {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {pill('bg-green-50 text-green-700 ring-green-600/20', `CFDI ${v.folio ?? shortUuid(v.uuid)}`, [v.uuid, v.issuerName, v.total !== null ? formatAmount(v.total) : ''].filter(Boolean).join(' · '))}
        {canPay && (
          <button type="button" onClick={() => onUnlink(g)} disabled={busy} className={link} title="Quitar el CFDI registrado (el bono vuelve a quedar sin CFDI)">
            Quitar
          </button>
        )}
        {partial}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pill('bg-amber-50 text-amber-700 ring-amber-600/20', 'Sin CFDI', 'El distribuidor debe emitir su CFDI a Tonic Life por este pago')}
      {canPay && (
        <button type="button" onClick={() => onRegister(g)} disabled={busy} className={link} title="Subir el XML del CFDI que emitió el distribuidor">
          Registrar CFDI
        </button>
      )}
    </div>
  );
}

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
  if (g.paymentStatus === 'held') return <HeldPill reason={g.holdReason} />;
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
      Pendiente
    </span>
  );
}

/** Métodos de pago que no cubre paymentMethodLabel: códigos de payment_methods (pedidos en línea). */
const PAYMENT_CODE_LABEL: Record<string, string> = {
  credit_card: 'Tarjeta de crédito',
  debit_card: 'Tarjeta de débito',
  bank_transfer: 'Transferencia',
  spei: 'SPEI',
  oxxo: 'OXXO',
  paypal: 'PayPal',
  square: 'Square',
  santander: 'Santander',
  points: 'Puntos',
  cash_usd: 'Efectivo USD',
  to_be_defined: 'Por definir',
};
const CARD_TYPE_LABEL: Record<string, string> = { credit: 'crédito', debit: 'débito' };

function kitPaymentLabel(p: KitBonusPaymentLine): string {
  const base = PAYMENT_CODE_LABEL[p.method] ?? paymentMethodLabel(p.method);
  const card = p.cardType ? ` ${CARD_TYPE_LABEL[p.cardType.toLowerCase()] ?? p.cardType}` : '';
  return `${base}${card}`;
}

/** Documento con el que se compró el kit: el pedido en línea o la venta en Reportes › Ventas (buscador por folio). */
function documentHref(i: KitBonusGroupItem): string {
  return i.source === 'online'
    ? `/admin/pedidos/${i.documentUuid}`
    : `/admin/reportes/ventas?search=${encodeURIComponent(i.documentId)}`;
}

/**
 * Desplegable de un patrocinador (27-oct-2026): a quién inscribió, con qué kit
 * y clave, cómo se pagó el kit (métodos y montos), en qué sucursal se registró
 * y a quién impactó en la red (el patrocinador que cobra y, si difiere, bajo
 * quién quedó colocado).
 */
function GroupEnrollments({ g }: { g: KitBonusGroup }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#3E667D]/15 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#3E667D]">
          Inscritos por {g.sponsorNumber} · {g.sponsorName} ({g.items.length})
        </p>
        <p className="text-[11px] text-gray-400">Pago del kit en la moneda de la sucursal · bono en {g.currencyCode}</p>
      </div>
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50/80">
          <tr>
            {['Inscrito', 'Kit y clave', 'Compra', 'Cómo se pagó el kit', 'Impactó a'].map((h) => (
              <th key={h} className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                {h}
              </th>
            ))}
            <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Bono</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {g.items.map((i) => {
            const placedElsewhere = !!i.placementId && i.placementId !== g.sponsorId;
            return (
              <tr key={`${i.source}:${i.itemId}`} className="align-top">
                <td className="px-4 py-2.5">
                  {/* Los enlaces abren en pestaña nueva: la revisión (filtros, desplegables) se queda como está. */}
                  <Link
                    href={`/admin/distribuidores/${i.buyerId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#3E667D] hover:underline"
                    title="Ver la ficha del inscrito (pestaña nueva)"
                  >
                    <span className="font-mono">{i.buyerNumber}</span> {i.buyerName}
                  </Link>
                  <p className="text-gray-500">Alta {formatDateDisplay(i.registrationDate)}</p>
                </td>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-gray-900">{i.kitName || KIT_LABEL[i.kitType] || i.kitType}</p>
                  <p className="text-gray-500">
                    Clave <span className="font-mono text-gray-700">{i.kitCode || '—'}</span> · {KIT_LABEL[i.kitType] ?? i.kitType}
                    {i.units > 1 ? ` · ${i.units} pzas` : ''}
                  </p>
                </td>
                <td className="px-4 py-2.5">
                  <p className="text-gray-900">
                    {formatDateDisplay(i.purchaseDate)} ·{' '}
                    <Link
                      href={documentHref(i)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[#3E667D] hover:underline"
                      title={i.source === 'online' ? 'Ver el pedido (pestaña nueva)' : 'Ver la venta en Reportes › Ventas (pestaña nueva)'}
                    >
                      {i.documentId}
                    </Link>{' '}
                    <span className="text-gray-400">({i.source === 'online' ? 'en línea' : 'POS'})</span>
                  </p>
                  <p className="text-gray-500">
                    Sucursal {i.branchCode} · {i.branchName}
                    {i.saleCountry ? ` (${i.saleCountry})` : ''}
                    {i.saleBranchIsCedea && (
                      <span className="ml-1.5 inline-flex items-center rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-600/20">
                        CEDEA
                      </span>
                    )}
                  </p>
                </td>
                <td className="px-4 py-2.5">
                  {i.payments.length === 0 ? (
                    <p className="text-amber-700">Sin registro de pago</p>
                  ) : (
                    <ul className="space-y-0.5">
                      {i.payments.map((p, idx) => (
                        <li key={idx} className="text-gray-900">
                          {kitPaymentLabel(p)} <span className="tabular-nums">{formatMoney(p.amount, i.saleCurrency)}</span>
                          {p.reference ? <span className="text-gray-400"> · ref. {p.reference}</span> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-gray-500">
                    Kit {formatMoney(i.kitAmount, i.saleCurrency)}
                    {Math.abs(i.documentTotal - i.kitAmount) > 0.005 ? ` · ticket ${formatMoney(i.documentTotal, i.saleCurrency)}` : ''}
                  </p>
                </td>
                <td className="px-4 py-2.5">
                  <p className="text-gray-900">
                    <span className="font-mono">{g.sponsorNumber}</span> {g.sponsorName}{' '}
                    <span className="text-gray-400">(patrocinador, cobra el bono)</span>
                  </p>
                  {placedElsewhere ? (
                    <p className="text-amber-700">
                      En la red quedó bajo{' '}
                      <Link
                        href={`/admin/distribuidores/${i.placementId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline"
                        title="Ver la ficha del upline (pestaña nueva)"
                      >
                        <span className="font-mono">{i.placementNumber}</span> {i.placementName}
                      </Link>
                    </p>
                  ) : i.placementId ? (
                    <p className="text-gray-500">En la red quedó directamente bajo el patrocinador</p>
                  ) : (
                    <p className="text-rose-700">Sin nodo en la red (revisar en su ficha)</p>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  <p className="text-gray-900">{formatAmount(i.subtotal)}</p>
                  <p className="text-gray-500">neto {formatAmount(i.total)}</p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
  /** Comprobante del grupo pagado (recibo de nómina / CFDI recibido). */
  busyKey: string | null;
  onStamp: (g: KitBonusGroup) => void;
  onRegister: (g: KitBonusGroup) => void;
  onUnlink: (g: KitBonusGroup) => void;
  onDownload: (g: KitBonusGroup, ext: 'pdf' | 'xml') => void;
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
  busyKey,
  onStamp,
  onRegister,
  onUnlink,
  onDownload,
}: GroupedTableProps) {
  const colSpan = canPay ? 11 : 10;
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
            {['Estatus', 'ID Upline', 'Upline', 'Canal', 'País', 'Régimen', 'Moneda', 'Bonos', 'Suscritos', 'Comprobante'].map((h) => (
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
                  className={`border-b border-gray-100 transition-colors hover:bg-[#3E667D]/[0.03] ${g.paymentStatus === 'held' ? 'bg-rose-50/40' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${g.paymentStatus === 'excluded' ? 'opacity-60' : ''}`}
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
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <GroupChannelBadges items={g.items} />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap" title={g.sponsorCountry ? COUNTRY_LABEL[g.sponsorCountry] ?? g.sponsorCountry : undefined}>
                    {g.sponsorCountry ?? '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm whitespace-nowrap">
                    {g.regime ? (
                      <span className="text-gray-700">{g.regime}</span>
                    ) : g.paymentStatus === 'held' ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">Sin régimen</span>
                        <Link href={fiscalDataHref(g.sponsorId)} className="text-xs font-medium text-rose-700 hover:underline" title={holdMessage(g.holdReason)}>
                          Capturar datos
                        </Link>
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">Sin régimen</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{g.currencyCode}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap tabular-nums">
                    {g.bonuses}
                    {g.recomputed && (
                      <span
                        className="ml-1 rounded bg-[#3E667D]/10 px-1 text-[10px] font-semibold text-[#3E667D]"
                        title={`Impuestos calculados sobre la suma de la semana${g.weekStart ? ` ${g.weekStart} a ${g.weekEnd ?? g.weekStart}` : ''} (ISR por tabla progresiva)`}
                      >
                        Σ
                      </span>
                    )}
                    {g.priorPaidSubtotal > 0 && (
                      <span
                        className="ml-1 rounded bg-amber-50 px-1 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20"
                        title={`ISR acumulado: esta semana ya se pagaron ${g.priorPaidBonuses} bono(s) de este patrocinador por ${formatAmount(g.priorPaidSubtotal)} con ISR ${formatAmount(g.priorPaidIsr)}; este grupo retiene ISR(total de la semana) menos eso`}
                      >
                        acum.
                      </span>
                    )}
                  </TableCell>
                  <TableCell
                    className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate cursor-pointer decoration-dotted underline-offset-2 hover:underline hover:text-[#3E667D]"
                    title={`${g.items.map((i) => `${i.buyerNumber} ${i.buyerName}`).join(' · ')} — clic para ver el detalle de cada inscrito`}
                    onClick={() => onToggleExpand(g.key)}
                  >
                    {g.items.map((i) => i.buyerName).join(', ')}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <VoucherCell
                      g={g}
                      canPay={canPay}
                      busy={busyKey !== null}
                      onStamp={onStamp}
                      onRegister={onRegister}
                      onUnlink={onUnlink}
                      onDownload={onDownload}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right text-gray-900 whitespace-nowrap tabular-nums">{formatMoney(g.subtotal, g.currencyCode)}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right text-gray-600 whitespace-nowrap tabular-nums">{g.isr ? formatAmount(g.isr) : '—'}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right text-gray-600 whitespace-nowrap tabular-nums">{g.iva ? formatAmount(g.iva) : '—'}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right text-gray-600 whitespace-nowrap tabular-nums">{g.ivaWithholding ? formatAmount(g.ivaWithholding) : '—'}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right text-gray-600 whitespace-nowrap tabular-nums">{g.resico ? formatAmount(g.resico) : '—'}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums">{formatMoney(g.total, g.currencyCode)}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onToggleExpand(g.key)}
                      className="inline-flex items-center gap-1 rounded-md border border-[#3E667D]/20 px-2 py-1 text-xs font-medium text-[#3E667D] hover:bg-[#3E667D]/5"
                      aria-expanded={open}
                      title="Ver a quién inscribió, con qué kit, cómo se pagó y dónde se registró"
                    >
                      {open ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
                      {open ? 'Ocultar' : `Ver inscritos (${g.items.length})`}
                    </button>
                  </TableCell>
                </TableRow>
                {open && (
                  <TableRow className="bg-[#3E667D]/[0.03] hover:bg-[#3E667D]/[0.03]">
                    <TableCell colSpan={colSpan + 7} className="px-6 py-3">
                      <GroupEnrollments g={g} />
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

  // CEDIS / CEDEAS por la sucursal de la venta del kit (se pagan aparte); CEDIS por defecto.
  const [branchType, setBranchType] = useState<KitBonusBranchType>('cedis');
  const changeBranchType = (t: KitBonusBranchType) => {
    setBranchType(t);
    setSelected(new Set());
  };

  const { data, isLoading, isFetching, error, refetch } = useKitBonuses({
    startDate: appliedStart,
    endDate: appliedEnd,
    ...(countryParam ? { country: countryParam } : {}),
    branchType,
  });
  useEffect(() => {
    if (!data) return;
    const found = data.rows.map((r) => r.sponsorCountry).filter((c): c is string => !!c);
    if (found.length === 0) return;
    setKnownCountries((prev) => sortCountries([...new Set([...prev, ...found])]));
  }, [data]);
  const markMutation = useMarkKitBonusPayments();
  const revertMutation = useRevertKitBonusPayment();
  // Comprobante del bono pagado: recibo de nómina (ASIMILADOS) o CFDI del distribuidor.
  const stampMutation = useStampKitBonusPayroll();
  const registerMutation = useRegisterKitBonusReceivedCfdi();
  const unlinkMutation = useUnlinkKitBonusReceivedCfdi();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [stampAllProgress, setStampAllProgress] = useState<string | null>(null);

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
        branchType,
      });
      toast.success(
        `Excel generado (${branchTypeShort(branchType)}${statusFilter === 'all' ? '' : ` · solo ${STATUS_FILTERS.find((f) => f.key === statusFilter)?.label.toLowerCase()}`})`,
      );
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

  const filtersLabel = `${branchTypeShort(branchType)} · ${countryParam ? countryParam.split(',').map((c) => COUNTRY_LABEL[c] ?? c).join(' + ') : 'todos los países'} · ${rangeLabel}`;
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

  // ---- Comprobante del bono pagado -------------------------------------------------
  const readyPayroll = useMemo(() => groups.filter(isPayrollReady), [groups]);

  const stampGroup = async (g: KitBonusGroup): Promise<boolean> => {
    setBusyKey(g.key);
    try {
      const r = await stampMutation.mutateAsync(groupPaymentIds(g));
      if (r.status === 'stamped' || r.status === 'sent') {
        toast.success(`Recibo de nómina ${r.folio ?? ''} timbrado para ${g.sponsorName}`.replace(/\s+/g, ' '));
        return true;
      }
      if (r.status === 'error') {
        toast.error(`El PAC rechazó el recibo de ${g.sponsorName}: ${r.error ?? 'sin detalle'}`);
        return false;
      }
      toast.info(`Recibo de ${g.sponsorName} en proceso (${r.status}); actualiza en unos segundos`);
      return false;
    } catch (err) {
      toast.error(apiErrorMessage(err, `No se pudo timbrar el recibo de ${g.sponsorName}`));
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  const submitStamp = async () => {
    if (!dialog || dialog.kind !== 'stamp') return;
    const g = dialog.group;
    setDialog(null);
    await stampGroup(g);
  };

  // Uno por uno (cada recibo es una llamada al PAC); se detiene en el primer error del PAC.
  const stampAllReady = async () => {
    const targets = readyPayroll;
    if (targets.length === 0) return;
    let ok = 0;
    for (let i = 0; i < targets.length; i++) {
      setStampAllProgress(`${i + 1}/${targets.length}`);
      const done = await stampGroup(targets[i]);
      if (!done) break;
      ok++;
    }
    setStampAllProgress(null);
    if (ok > 0) toast.success(`${ok} ${ok === 1 ? 'recibo timbrado' : 'recibos timbrados'}`);
  };

  const submitReceived = async () => {
    if (!dialog || dialog.kind !== 'received' || !xmlFile) return;
    const g = dialog.group;
    setBusyKey(g.key);
    try {
      const r = await registerMutation.mutateAsync({
        paymentIds: groupPaymentIds(g),
        file: xmlFile,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      toast.success(`CFDI ${r.uuid.slice(0, 8)}… registrado (${formatAmount(r.total)}) para ${g.sponsorName}`);
      setDialog(null);
      setXmlFile(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo registrar el CFDI'));
    } finally {
      setBusyKey(null);
    }
  };

  const submitUnlink = async () => {
    if (!dialog || dialog.kind !== 'unlink' || !dialog.group.voucher?.id) return;
    const g = dialog.group;
    setBusyKey(g.key);
    try {
      await unlinkMutation.mutateAsync({ id: g.voucher!.id!, reason: notes.trim() || undefined });
      toast.success('CFDI desvinculado: el pago vuelve a quedar sin comprobante');
      setDialog(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo quitar el CFDI'));
    } finally {
      setBusyKey(null);
    }
  };

  const handleDownloadVoucher = async (g: KitBonusGroup, ext: 'pdf' | 'xml') => {
    const v = g.voucher;
    if (!v?.id) return;
    try {
      await reportsService.downloadKitBonusPayrollFile(v.id, ext, `NOMINA_BONO_${g.sponsorNumber}_${(v.uuid ?? v.id).slice(0, 8)}.${ext}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, `No se pudo descargar el ${ext.toUpperCase()}`));
    }
  };

  const submitMark = async () => {
    if (!dialog || (dialog.kind !== 'paid' && dialog.kind !== 'excluded')) return;
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
          (result.skipped ? ` · ${result.skipped} ya tenían estatus` : '') +
          (result.held ? ` · ${result.held} ${result.held === 1 ? 'apartado sin datos fiscales no se marcó' : 'apartados sin datos fiscales no se marcaron'}` : ''),
      );
      setSelected(new Set());
      setDialog(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo registrar el pago'));
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

  const busy =
    markMutation.isPending ||
    revertMutation.isPending ||
    stampMutation.isPending ||
    registerMutation.isPending ||
    unlinkMutation.isPending ||
    stampAllProgress !== null;

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-8">
      <TreasuryHeader
        icon={UserPlusIcon}
        title="Bono de Inscripción"
        subtitle="Bono por suscrito de cada kit básico/premium vendido, pagado al patrocinador del comprador con los impuestos de su régimen (como el sistema anterior). En México y Frontera solo se paga con régimen fiscal asignado; sin él, el bono queda apartado."
        note={!canPay ? 'Solo lectura: marcar pagos y comprobantes requiere commissions:validate.' : undefined}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleDownload()}
            disabled={!appliedStart || !appliedEnd || isFetching || downloading}
            title="REPORTE_BONO_SUSCRIPCION: hoja POR PATROCINADOR (un renglón por patrocinador, impuestos sobre la suma: la que se usa para depositar) + APARTADOS (a quién pedirle datos) + Hoja1 con las 17 columnas del sistema anterior (una fila por suscrito) + ESTATUS PAGO"
          >
            {downloading ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <ArrowDownTrayIcon className="mr-2 h-4 w-4" aria-hidden />
            )}
            Excel (formato anterior){statusFilter !== 'all' ? ` · ${STATUS_FILTERS.find((f) => f.key === statusFilter)?.label.toLowerCase()}` : ''}
          </Button>
        }
      />

      <div className="mb-6">
        <TreasuryTabs active="bonos" />
      </div>

      <div className="space-y-6">
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Sucursal del kit:</span>
            {BRANCH_TYPE_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => changeBranchType(o.key)}
                className={chipClass(branchType === o.key)}
                title={
                  o.key === 'cedeas'
                    ? 'Kits vendidos en una CEDEA (se pagan aparte)'
                    : o.key === 'cedis'
                      ? 'Kits vendidos en sucursales normales (CEDIS)'
                      : 'Sin separar CEDIS y CEDEAS'
                }
              >
                {o.label}
              </button>
            ))}
            <span className="text-xs text-gray-400">
              Los inscritos en CEDEAS se pagan aparte; se decide por la sucursal donde se vendió el kit. Totales, Excel y marcar
              pagados: solo {branchTypeShort(branchType)}.
            </span>
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
              <p className="text-rose-800">
                <strong>{summary.missingRegime}</strong> {summary.missingRegime === 1 ? 'bono apartado' : 'bonos apartados'}: el
                patrocinador cobra en México/Frontera y no tiene régimen fiscal asignado, así que no se {summary.missingRegime === 1 ? 'paga' : 'pagan'} ni
                {summary.missingRegime === 1 ? ' entra' : ' entran'} en &ldquo;Pendiente por pagar&rdquo;. Pídele sus datos fiscales y asígnale el régimen en{' '}
                <Link href="/admin/tesoreria/validacion-datos" className="font-medium underline">Validación de datos</Link>
                {' · '}
                <button type="button" onClick={() => setStatusFilter('held')} className="font-medium underline">
                  ver apartados
                </button>
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
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
            <button
              type="button"
              onClick={() => setStatusFilter('held')}
              className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-left shadow-sm transition-colors hover:bg-rose-100/60"
              title="Patrocinadores de México/Frontera sin régimen fiscal: no se pagan hasta capturar sus datos"
            >
              <p className="text-xs font-medium text-rose-700/70 uppercase tracking-wide mb-2">Apartados · sin datos fiscales</p>
              <p className="text-lg font-bold text-rose-800">{byStatus.held?.rows ?? 0}</p>
              <p className="text-xs text-rose-700/70 mt-1">
                {byStatus.held?.rows
                  ? `${byStatus.held.byCurrency.map((c) => `${c.currencyCode} ${formatAmount(c.subtotal)}`).join(' · ')} bruto · pedir datos`
                  : 'ninguno'}
              </p>
            </button>
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
                const n = f.key === 'all' ? allRows.length : (byStatus?.[f.key]?.rows ?? 0);
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
              // Acciones a la derecha: la leyenda arriba y los botones juntos en
              // una sola fila (antes la leyenda larga partía los botones en dos
              // renglones).
              <div className="flex w-full flex-col items-start gap-1.5 lg:ml-auto lg:w-auto lg:items-end">
                <span className="text-xs text-gray-500">
                  {selectedVisible.length ? (
                    <>
                      <span className="font-semibold text-gray-700">{selectedVisible.length}</span>{' '}
                      {selectedVisible.length === 1 ? 'bono seleccionado' : 'bonos seleccionados'}
                      {selectedGroupCount ? ` · ${selectedGroupCount} ${selectedGroupCount === 1 ? 'patrocinador' : 'patrocinadores'}` : ''}
                    </>
                  ) : (
                    <>
                      Sin selección: aplica a los <span className="font-semibold text-gray-700">{visiblePending.length}</span> pendientes visibles
                      <span className="hidden sm:inline"> · {filtersLabel}</span>
                    </>
                  )}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={() => openMark('paid')} disabled={busy || visiblePending.length === 0} className="bg-green-700 hover:bg-green-800 text-white">
                    Marcar como pagados
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openMark('excluded')} disabled={busy || visiblePending.length === 0}>
                    Marcar como no pagados
                  </Button>
                  {view === 'grouped' && readyPayroll.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={stampAllReady}
                      disabled={busy}
                      className="border-[#3E667D] text-[#3E667D] hover:bg-[#3E667D]/5"
                      title="Emite el recibo de nómina (CFDI) de cada pago ASIMILADOS que aún no lo tiene y ya trae RFC, CURP y CP; uno por uno"
                    >
                      {stampAllProgress ? `Timbrando ${stampAllProgress}…` : `Timbrar recibos (${readyPayroll.length})`}
                    </Button>
                  )}
                </div>
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
              busyKey={busy ? (busyKey ?? '*') : null}
              onStamp={(g) => setDialog({ kind: 'stamp', group: g })}
              onRegister={(g) => {
                setNotes('');
                setXmlFile(null);
                setDialog({ kind: 'received', group: g });
              }}
              onUnlink={(g) => {
                setNotes('');
                setDialog({ kind: 'unlink', group: g });
              }}
              onDownload={handleDownloadVoucher}
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
                    {['Estatus', 'Fecha compra', 'ID Upline', 'Upline', 'Canal', 'ID', 'Comprador', 'Registro', 'Kit', 'Moneda', 'País', 'Régimen'].map((h) => (
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
                      className={`border-b border-gray-100 transition-colors hover:bg-[#3E667D]/[0.03] ${r.paymentStatus === 'held' ? 'bg-rose-50/40' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${r.paymentStatus === 'excluded' ? 'opacity-60' : ''}`}
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
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <ChannelBadge cedea={r.saleBranchIsCedea === true} />
                      </TableCell>
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
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${r.paymentStatus === 'held' ? 'bg-rose-50 text-rose-700 ring-rose-600/20' : 'bg-amber-50 text-amber-700 ring-amber-600/20'}`}
                            title={r.paymentStatus === 'held' ? holdMessage(r.holdReason) : undefined}
                          >
                            Sin régimen
                          </span>
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
                          {r.paymentStatus === 'held' ? (
                            <Link href={fiscalDataHref(r.sponsorId)} className="text-xs font-medium text-rose-700 hover:underline" title={holdMessage(r.holdReason)}>
                              Capturar datos
                            </Link>
                          ) : r.paymentStatus !== 'pending' && r.paymentId ? (
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
                          ) : null}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="bg-transparent">
                  <TableRow className="border-t-2 border-[#3E667D]/20 bg-[#3E667D]/[0.04] hover:bg-[#3E667D]/[0.04]">
                    <TableCell colSpan={canPay ? 13 : 12} className="px-4 py-4 text-sm font-bold text-[#3E667D]">
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
            {dialog?.kind === 'stamp' && (
              <>
                <DialogHeader>
                  <DialogTitle>Emitir recibo de nómina</DialogTitle>
                  <DialogDescription>
                    Se timbra ante el SAT un CFDI de nómina (ingresos asimilados a salarios) a nombre de{' '}
                    <strong>{dialog.group.sponsorNumber} {dialog.group.sponsorName}</strong> por el pago del{' '}
                    {formatDateDisplay(dialog.group.paidAt)} y se le envía por correo.
                  </DialogDescription>
                </DialogHeader>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-gray-500">Bonos (suscritos)</dt>
                  <dd className="text-right tabular-nums">{dialog.group.bonuses}</dd>
                  <dt className="text-gray-500">Percepción (bono)</dt>
                  <dd className="text-right tabular-nums">{formatMoney(dialog.group.subtotal, dialog.group.currencyCode)}</dd>
                  <dt className="text-gray-500">ISR retenido</dt>
                  <dd className="text-right tabular-nums">{formatAmount(dialog.group.isr)}</dd>
                  <dt className="font-semibold text-gray-700">Neto (depositado)</dt>
                  <dd className="text-right font-semibold tabular-nums">{formatMoney(dialog.group.total, dialog.group.currencyCode)}</dd>
                </dl>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>Cancelar</Button>
                  <Button onClick={submitStamp} disabled={busy} className="bg-[#3E667D] hover:bg-[#2f5165] text-white">
                    {busy ? 'Timbrando…' : 'Timbrar'}
                  </Button>
                </DialogFooter>
              </>
            )}
            {dialog?.kind === 'received' && (
              <>
                <DialogHeader>
                  <DialogTitle>Registrar CFDI del distribuidor</DialogTitle>
                  <DialogDescription>
                    XML del CFDI que <strong>{dialog.group.sponsorNumber} {dialog.group.sponsorName}</strong> ({dialog.group.regime}) emitió a
                    Tonic Life por el pago del {formatDateDisplay(dialog.group.paidAt)}. Debe ser de ingreso, con su RFC como emisor y por{' '}
                    <strong>{formatMoney(dialog.group.total, dialog.group.currencyCode)}</strong> (neto pagado).
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="bonos-xml">Archivo XML</Label>
                    <Input
                      id="bonos-xml"
                      type="file"
                      accept=".xml,text/xml,application/xml"
                      onChange={(e) => setXmlFile(e.target.files?.[0] ?? null)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bonos-xml-notes">Comentario</Label>
                    <Textarea id="bonos-xml-notes" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} className="mt-1" placeholder="Opcional" rows={2} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>Cancelar</Button>
                  <Button onClick={submitReceived} disabled={busy || !xmlFile} className="bg-[#3E667D] hover:bg-[#2f5165] text-white">
                    {busy ? 'Registrando…' : 'Registrar'}
                  </Button>
                </DialogFooter>
              </>
            )}
            {dialog?.kind === 'unlink' && (
              <>
                <DialogHeader>
                  <DialogTitle>Quitar CFDI registrado</DialogTitle>
                  <DialogDescription>
                    El CFDI {dialog.group.voucher?.folio ?? shortUuid(dialog.group.voucher?.uuid ?? null)} deja de estar ligado al pago de{' '}
                    <strong>{dialog.group.sponsorNumber} {dialog.group.sponsorName}</strong>; el registro queda como historial y se puede subir otro.
                  </DialogDescription>
                </DialogHeader>
                <div>
                  <Label htmlFor="bonos-unlink-reason">Motivo</Label>
                  <Textarea id="bonos-unlink-reason" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} className="mt-1" placeholder="Opcional" rows={2} />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>Cancelar</Button>
                  <Button variant="destructive" onClick={submitUnlink} disabled={busy}>
                    {busy ? 'Quitando…' : 'Quitar'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
