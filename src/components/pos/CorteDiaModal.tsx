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
      ...PAYMENT_LABELS
        .filter(({ key }) => (summary[key] as number) > 0)
        .map(({ key, label }) => [label, (summary[key] as number).toFixed(2)]),
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
    window.print();
  }

  const paymentRows = PAYMENT_LABELS.filter(({ key }) => summary && (summary[key] as number) > 0);

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#corte-print-panel) { display: none !important; }
          #corte-print-panel {
            position: static !important;
            width: 80mm !important;
            font-family: monospace;
            font-size: 11px;
            color: #000;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 no-print"
        onClick={onClose}
      />

      {/* Side drawer — right side */}
      <div
        id="corte-print-panel"
        className="fixed top-0 right-0 z-50 h-full w-80 bg-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-[#3E667D] text-white no-print">
          <h2 className="font-bold text-sm">Corte del Día</h2>
          <button onClick={onClose} className="hover:text-white/70 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Print-only header */}
        <div className="hidden print:block p-3 text-center border-b">
          <p className="font-bold">TONIC LIFE</p>
          <p className="text-sm">CORTE DEL DÍA</p>
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
                <div className="space-y-1.5 text-sm">
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
                <div className="space-y-1.5 text-sm">
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
                  <div className="space-y-1.5 text-sm">
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
          <div className="p-3 border-t flex gap-2 no-print">
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
