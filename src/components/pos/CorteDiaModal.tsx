// CorteDiaModal.tsx — Corte del Día: drawer lateral derecho
'use client';

import { XMarkIcon, ArrowDownTrayIcon, PrinterIcon } from '@heroicons/react/24/outline';
import type { DailySalesSummary } from '@/types/pos';

interface CorteDiaModalProps {
  summary: DailySalesSummary | undefined;
  isLoading: boolean;
  date: string;
  branchName: string;
  onClose: () => void;
}

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

const PAYMENT_LABELS: { key: keyof DailySalesSummary; label: string }[] = [
  { key: 'totalCash', label: 'Efectivo' },
  { key: 'totalCard', label: 'Tarjeta Débito' },
  { key: 'totalCredit', label: 'Tarjeta Crédito' },
  { key: 'totalTransfer', label: 'Transferencia' },
  { key: 'totalMercadoPago', label: 'Mercado Pago' },
  { key: 'totalCashback', label: 'Cashback / Vale' },
  { key: 'totalPromotion', label: 'Promociones' },
  { key: 'totalUsdCash', label: 'Dólares (USD)' },
  { key: 'totalMixed', label: 'Pago Mixto' },
];

export function CorteDiaModal({ summary, isLoading, date, branchName, onClose }: CorteDiaModalProps) {
  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  function handleDownloadCsv() {
    if (!summary) return;
    const paymentRows = PAYMENT_LABELS.filter(({ key }) => (summary[key] as number) > 0);
    const rows: string[][] = [
      ['Corte del Día', branchName, date],
      [],
      ['VENTAS'],
      ['Ventas completadas', String(summary.totalSales)],
      ['Monto total', summary.totalAmount.toFixed(2)],
      ['Ticket promedio', summary.averageTicket.toFixed(2)],
      ['Productos vendidos', String(summary.itemsSold)],
      [],
      ['CANCELADAS / DEVOLUCIONES'],
      ['Cantidad', String(summary.refundsCount)],
      ['Monto', summary.totalRefunds.toFixed(2)],
      [],
      ['MÉTODO DE PAGO', 'MONTO'],
      ...paymentRows.map(({ key, label }) => [label, (summary[key] as number).toFixed(2)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corte-${branchName.replace(/\s+/g, '_')}-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    if (!summary) return;
    const paymentRows = PAYMENT_LABELS.filter(({ key }) => (summary[key] as number) > 0);

    const rows = paymentRows
      .map(({ key, label }) => `
        <tr>
          <td>${label}</td>
          <td style="text-align:right">${fmt(summary[key] as number)}</td>
        </tr>`)
      .join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Corte del Día</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 11px; width: 80mm; padding: 8px; color: #000; }
    h1 { font-size: 13px; text-align: center; margin-bottom: 2px; }
    .center { text-align: center; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .section-title { font-weight: bold; font-size: 10px; text-transform: uppercase; margin: 6px 0 3px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 1px 0; vertical-align: top; }
    td:last-child { text-align: right; white-space: nowrap; }
    .bold { font-weight: bold; }
    .footer { text-align: center; margin-top: 8px; font-size: 10px; }
  </style>
</head>
<body>
  <h1>TONIC LIFE</h1>
  <p class="center" style="font-size:10px">CORTE DEL DÍA</p>
  <div class="divider"></div>
  <p class="center">${branchName}</p>
  <p class="center" style="text-transform:capitalize">${displayDate}</p>
  <div class="divider"></div>

  <p class="section-title">Ventas Completadas</p>
  <table>
    <tr><td>Total ventas</td><td>${summary.totalSales}</td></tr>
    <tr><td class="bold">Monto total</td><td class="bold">${fmt(summary.totalAmount)}</td></tr>
    <tr><td>Ticket promedio</td><td>${fmt(summary.averageTicket)}</td></tr>
    <tr><td>Productos vendidos</td><td>${summary.itemsSold}</td></tr>
  </table>

  <div class="divider"></div>

  <p class="section-title">Canceladas / Devoluciones</p>
  <table>
    <tr><td>Cantidad</td><td>${summary.refundsCount}</td></tr>
    <tr><td>Monto cancelado</td><td>${fmt(summary.totalRefunds)}</td></tr>
  </table>

  <div class="divider"></div>

  <p class="section-title">Por Método de Pago</p>
  <table>
    ${rows || '<tr><td colspan="2">Sin registros</td></tr>'}
  </table>

  <div class="divider"></div>
  <p class="footer">*** Fin del corte ***</p>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  const paymentRows = PAYMENT_LABELS.filter(({ key }) => summary && (summary[key] as number) > 0);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Side drawer — right side */}
      <div className="fixed top-0 right-0 z-50 h-full w-80 bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-[#3E667D] text-white">
          <h2 className="font-bold text-sm">Corte del Día</h2>
          <button onClick={onClose} className="hover:text-white/70 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Branch + date */}
          <div className="text-center pb-2 border-b">
            <p className="font-semibold text-gray-800 text-sm">{branchName}</p>
            <p className="text-xs text-gray-500 capitalize mt-0.5">{displayDate}</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-6 w-6 border-2 border-[#3E667D] border-t-transparent rounded-full" />
            </div>
          ) : !summary ? (
            <p className="text-center text-sm text-gray-500 py-10">Sin datos para esta fecha.</p>
          ) : (
            <>
              {/* Ventas completadas */}
              <div>
                <p className="text-xs font-bold text-[#3E667D] uppercase tracking-wider mb-2">
                  Ventas Completadas
                </p>
                <div className="space-y-1.5">
                  <Row label="Total ventas" value={String(summary.totalSales)} />
                  <Row label="Monto total" value={fmt(summary.totalAmount)} bold />
                  <Row label="Ticket promedio" value={fmt(summary.averageTicket)} />
                  <Row label="Productos vendidos" value={String(summary.itemsSold)} />
                </div>
              </div>

              <div className="border-t" />

              {/* Canceladas */}
              <div>
                <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">
                  Canceladas / Devoluciones
                </p>
                <div className="space-y-1.5">
                  <Row label="Cantidad" value={String(summary.refundsCount)} />
                  <Row label="Monto cancelado" value={fmt(summary.totalRefunds)} />
                </div>
              </div>

              <div className="border-t" />

              {/* Por método de pago */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Por Método de Pago
                </p>
                {paymentRows.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Sin registros de pago.</p>
                ) : (
                  <div className="space-y-1.5">
                    {paymentRows.map(({ key, label }) => (
                      <Row key={key} label={label} value={fmt(summary[key] as number)} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        {!isLoading && summary && (
          <div className="p-3 border-t flex gap-2">
            <button
              onClick={handleDownloadCsv}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#3E667D] border border-[#3E667D] rounded-lg hover:bg-[#3E667D]/5 transition-colors"
            >
              <ArrowDownTrayIcon className="h-3.5 w-3.5" />
              CSV
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#3E667D] rounded-lg hover:bg-[#2f5165] transition-colors"
            >
              <PrinterIcon className="h-3.5 w-3.5" />
              Imprimir
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className={`text-xs ${bold ? 'font-bold text-gray-900' : 'text-gray-800'}`}>{value}</span>
    </div>
  );
}
