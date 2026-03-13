// CorteDiaModal.tsx — Corte del Día: resumen de ventas con CSV y ticket imprimible
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
      {/* Print-only styles */}
      <style>{`
        @media print {
          body > *:not(#corte-print-root) { display: none !important; }
          #corte-print-root { display: block !important; position: static !important; }
          .no-print { display: none !important; }
          .print-ticket {
            width: 80mm;
            font-family: monospace;
            font-size: 11px;
            color: #000;
          }
        }
        @media screen {
          #corte-print-root { display: contents; }
        }
      `}</style>

      {/* Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 no-print" onClick={onClose} />

      {/* Modal */}
      <div
        id="corte-print-root"
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 pointer-events-auto flex flex-col max-h-[90vh] print-ticket"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b no-print">
            <h2 className="text-lg font-bold text-gray-900">Corte del Día</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Print header */}
          <div className="hidden print:block p-4 text-center border-b">
            <p className="font-bold text-base">TONIC LIFE</p>
            <p className="text-sm font-semibold">CORTE DEL DÍA</p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Branch + date */}
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-sm">{branchName}</p>
              <p className="text-xs text-gray-500 capitalize">{displayDate}</p>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-[#3E667D] border-t-transparent rounded-full" />
              </div>
            ) : !summary ? (
              <p className="text-center text-sm text-gray-500 py-8">Sin datos para esta fecha.</p>
            ) : (
              <>
                {/* Ventas */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b pb-1">
                    Ventas Completadas
                  </p>
                  <div className="space-y-1 text-sm">
                    <Row label="Total ventas" value={String(summary.totalSales)} />
                    <Row label="Monto total" value={fmt(summary.totalAmount)} bold />
                    <Row label="Ticket promedio" value={fmt(summary.averageTicket)} />
                    <Row label="Productos vendidos" value={String(summary.itemsSold)} />
                  </div>
                </div>

                {/* Canceladas */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b pb-1">
                    Canceladas / Devoluciones
                  </p>
                  <div className="space-y-1 text-sm">
                    <Row label="Cantidad" value={String(summary.refundsCount)} />
                    <Row label="Monto cancelado" value={fmt(summary.totalRefunds)} />
                  </div>
                </div>

                {/* Por método de pago */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b pb-1">
                    Por Método de Pago
                  </p>
                  {paymentRows.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Sin registros de pago.</p>
                  ) : (
                    <div className="space-y-1 text-sm">
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
            <div className="p-4 border-t flex gap-2 no-print">
              <button
                onClick={handleDownloadCsv}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-[#3E667D] border border-[#3E667D] rounded-lg hover:bg-[#3E667D]/5 transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Descargar CSV
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#3E667D] rounded-lg hover:bg-[#2f5165] transition-colors"
              >
                <PrinterIcon className="h-4 w-4" />
                Imprimir
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className={bold ? 'font-bold text-gray-900' : 'text-gray-800'}>{value}</span>
    </div>
  );
}
