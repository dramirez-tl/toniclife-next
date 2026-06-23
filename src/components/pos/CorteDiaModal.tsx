// CorteDiaModal.tsx — Corte del Día: drawer lateral derecho
'use client';

import { useState } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import type { DailySalesSummary, Sale } from '@/types/pos';
import { PosSaleStatus } from '@/types/pos';
import { generateCorteDiaPdf } from '@/lib/generate-corte-dia-pdf';
import { formatDateLocal, formatTimeLocal, formatDateTimeLocal, resolveTimeZone } from '@/lib/timezone-utils';

interface CorteDiaModalProps {
  summary: DailySalesSummary | undefined;
  sales: Sale[];
  isLoading: boolean;
  date: string;
  branchName: string;
  timezone: string;
  onClose: () => void;
}

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

// fmtDateTime is defined inside the component to capture timezone — see below

const STATUS_LABEL: Record<string, string> = {
  [PosSaleStatus.COMPLETED]: 'Completada',
  [PosSaleStatus.CANCELLED]: 'Cancelada',
  [PosSaleStatus.REFUNDED]: 'Devuelta',
  [PosSaleStatus.PENDING]: 'Pendiente',
  [PosSaleStatus.PARTIAL_REFUND]: 'Dev. Parcial',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'T. Débito',
  credit: 'T. Crédito',
  transfer: 'Transferencia',
  mercado_pago: 'MercadoPago',
  cashback: 'Cashback',
  promotion: 'Promoción',
  usd_cash: 'USD',
  mixed: 'Mixto',
};

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

export function CorteDiaModal({ summary, sales, isLoading, date, branchName, timezone, onClose }: CorteDiaModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const fmtDateTime = (iso: string) => formatDateTimeLocal(iso, timezone);

  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: resolveTimeZone(timezone),
  });

  function handleDownloadCsv() {
    if (!summary) return;
    const paymentRows = PAYMENT_LABELS.filter(({ key }) => (summary[key] as number) > 0);
    const rows: string[][] = [
      ['Corte del Día', branchName, date],
      [],
      ['RESUMEN'],
      ['Ventas completadas', String(summary.totalSales)],
      ['Monto total', summary.totalAmount.toFixed(2)],
      ['Ticket promedio', summary.averageTicket.toFixed(2)],
      ['Productos vendidos', String(summary.itemsSold)],
      ['Canceladas / devoluciones', String(summary.refundsCount)],
      ['Monto cancelado', summary.totalRefunds.toFixed(2)],
      [],
      ['MÉTODO DE PAGO', 'MONTO'],
      ...paymentRows.map(({ key, label }) => [label, (summary[key] as number).toFixed(2)]),
      [],
      ['DETALLE DE VENTAS'],
      ['Folio', 'Fecha', 'Hora', 'Estatus', 'Método Pago', 'Monto'],
      ...sales.map((s) => [
        s.saleNumber,
        formatDateLocal(s.createdAt, timezone),
        formatTimeLocal(s.createdAt, timezone),
        STATUS_LABEL[s.status] ?? s.status,
        PAYMENT_METHOD_LABEL[s.paymentMethod] ?? s.paymentMethod,
        s.total.toFixed(2),
      ]),
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

  async function handleGeneratePdf() {
    if (!summary) return;
    setIsGenerating(true);
    try {
      const url = await generateCorteDiaPdf(summary, sales, branchName, date, timezone);
      setPdfUrl(url);
    } finally {
      setIsGenerating(false);
    }
  }

  function closePdfPreview() {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
  }

  const paymentRows = PAYMENT_LABELS.filter(({ key }) => summary && (summary[key] as number) > 0);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Side drawer */}
      <div className="fixed top-0 right-0 z-50 h-full w-80 bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-[#3E667D] text-white flex-shrink-0">
          <h2 className="font-bold text-sm">Corte del Día</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 hover:text-white/70">
            <XMarkIcon className="h-5 w-5" />
          </Button>
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
                <p className="text-xs font-bold text-[#3E667D] uppercase tracking-wider mb-2">Ventas Completadas</p>
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
                <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">Canceladas / Devoluciones</p>
                <div className="space-y-1.5">
                  <Row label="Cantidad" value={String(summary.refundsCount)} />
                  <Row label="Monto cancelado" value={fmt(summary.totalRefunds)} />
                </div>
              </div>

              <div className="border-t" />

              {/* Por método de pago */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Por Método de Pago</p>
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

              <div className="border-t" />

              {/* Detalle de ventas */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Detalle de Ventas ({sales.length})
                </p>
                {sales.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Sin ventas registradas.</p>
                ) : (
                  <div className="space-y-1.5">
                    {sales.map((s) => {
                      const isCancelled = s.status === PosSaleStatus.CANCELLED || s.status === PosSaleStatus.REFUNDED;
                      return (
                        <div
                          key={s.id}
                          className={`text-xs border rounded p-2 space-y-0.5 ${isCancelled ? 'opacity-50 bg-gray-50' : 'bg-white'}`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-mono font-semibold text-gray-800">{s.saleNumber}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              isCancelled
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {STATUS_LABEL[s.status] ?? s.status}
                            </span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>{fmtDateTime(s.createdAt)}</span>
                            <span className={`font-semibold ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                              {fmt(s.total)}
                            </span>
                          </div>
                          <div className="text-gray-400">
                            {PAYMENT_METHOD_LABEL[s.paymentMethod] ?? s.paymentMethod}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!isLoading && summary && (
          <div className="p-3 border-t flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCsv}
              className="flex-1 gap-1.5 text-xs text-[#3E667D] border-[#3E667D] hover:bg-[#3E667D]/5"
            >
              <ArrowDownTrayIcon className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              size="sm"
              onClick={handleGeneratePdf}
              disabled={isGenerating}
              className="flex-1 gap-1.5 text-xs"
            >
              {isGenerating ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <PrinterIcon className="h-3.5 w-3.5" />
              )}
              {isGenerating ? 'Generando...' : 'Imprimir'}
            </Button>
          </div>
        )}
      </div>

      {/* PDF Preview Modal — same pattern as ticket preview */}
      {pdfUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl flex flex-col w-[95vw] max-w-md h-[90vh] max-h-[700px]">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900 text-sm">Vista previa — Corte del Día</h3>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={closePdfPreview}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-grow overflow-hidden">
              <iframe src={pdfUrl} className="w-full h-full border-0" title="Corte del Día" />
            </div>
            <div className="flex items-center gap-2 px-4 py-3 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = pdfUrl;
                  a.download = `corte-${branchName.replace(/\s+/g, '_')}-${date}.pdf`;
                  a.click();
                }}
                className="flex-1 text-[#3E667D] border-[#3E667D] hover:bg-[#3E667D]/5"
              >
                Descargar
              </Button>
              <Button
                onClick={() => {
                  const win = window.open(pdfUrl, '_blank');
                  win?.print();
                }}
                className="flex-1 gap-2"
              >
                <PrinterIcon className="h-4 w-4" />
                Imprimir
              </Button>
            </div>
          </div>
        </div>
      )}
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
