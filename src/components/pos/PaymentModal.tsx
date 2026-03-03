// components/pos/PaymentModal.tsx - Payment processing modal for POS
'use client';

import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  BanknotesIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  PrinterIcon,
  ArrowPathIcon,
  LinkIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { PosPaymentMethod, type CreatePaymentInput, type Sale } from '@/types/pos';
import { generatePosTicketPdf, type PosTicketBranchConfig } from '@/lib/generate-pos-ticket';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onPaymentComplete: (payments: CreatePaymentInput[], change: number) => Promise<Sale | undefined> | Sale | void;
  currencySymbol?: string;
  branchConfig?: PosTicketBranchConfig;
}

type MethodKey = 'cash' | 'card_credit' | 'card_debit' | 'transfer' | 'cashback' | 'liga_bancomer' | 'mercado_pago' | 'usd_cash' | 'undefined';

const paymentMethods: { key: MethodKey; method: PosPaymentMethod; name: string; icon: typeof BanknotesIcon; cardType?: string }[] = [
  { key: 'cash', method: PosPaymentMethod.CASH, name: 'Efectivo', icon: BanknotesIcon },
  { key: 'card_credit', method: PosPaymentMethod.CARD, name: 'T. Crédito', icon: CreditCardIcon, cardType: 'credit' },
  { key: 'card_debit', method: PosPaymentMethod.CARD, name: 'T. Débito', icon: CreditCardIcon, cardType: 'debit' },
  { key: 'transfer', method: PosPaymentMethod.TRANSFER, name: 'Transferencia', icon: BuildingLibraryIcon },
  { key: 'cashback', method: PosPaymentMethod.CASHBACK, name: 'Cashback', icon: ArrowPathIcon },
  { key: 'liga_bancomer', method: PosPaymentMethod.LIGA_BANCOMER, name: 'Liga Bancomer', icon: LinkIcon },
  { key: 'mercado_pago', method: PosPaymentMethod.MERCADO_PAGO, name: 'Mercado Pago', icon: ShoppingCartIcon },
  { key: 'usd_cash', method: PosPaymentMethod.USD_CASH, name: 'Pago en Dólares', icon: CurrencyDollarIcon },
  { key: 'undefined', method: PosPaymentMethod.UNDEFINED, name: 'Sin Definir', icon: QuestionMarkCircleIcon },
];

const quickAmounts = [50, 100, 200, 500, 1000];

export function PaymentModal({ isOpen, onClose, total, onPaymentComplete, currencySymbol = '$', branchConfig }: PaymentModalProps) {
  const fmt = (amount: number) =>
    `${currencySymbol}${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const [selectedKey, setSelectedKey] = useState<MethodKey>('cash');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [payments, setPayments] = useState<CreatePaymentInput[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [change, setChange] = useState(0);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);

  const selected = paymentMethods.find(m => m.key === selectedKey)!;

  const remainingAmount = total - payments.reduce((sum, p) => sum + p.amount, 0);
  const receivedNum = parseFloat(amountReceived) || 0;
  const currentChange = selectedKey === 'cash'
    ? Math.max(0, receivedNum - remainingAmount)
    : 0;

  useEffect(() => {
    if (isOpen) {
      setSelectedKey('cash');
      setAmountReceived('');
      setPayments([]);
      setIsProcessing(false);
      setIsComplete(false);
      setChange(0);
      setCompletedSale(null);
      if (ticketUrl) {
        URL.revokeObjectURL(ticketUrl);
        setTicketUrl(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleAddPayment = () => {
    if (receivedNum <= 0) return;

    const payment: CreatePaymentInput = {
      paymentMethod: selected.method,
      amount: Math.min(receivedNum, remainingAmount),
    };

    if (selectedKey === 'cash') {
      payment.amountReceived = receivedNum;
    }
    if (selected.cardType) {
      payment.cardType = selected.cardType;
    }

    setPayments([...payments, payment]);
    setAmountReceived('');
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleCompletePayment = async () => {
    // Auto-add current input as payment if none added yet (single payment flow)
    let finalPayments = [...payments];
    if (finalPayments.length === 0 && receivedNum > 0) {
      const payment: CreatePaymentInput = {
        paymentMethod: selected.method,
        amount: Math.min(receivedNum, total),
      };
      if (selectedKey === 'cash') {
        payment.amountReceived = receivedNum;
      }
      if (selected.cardType) {
        payment.cardType = selected.cardType;
      }
      finalPayments = [payment];
    }

    const finalRemaining = total - finalPayments.reduce((sum, p) => sum + p.amount, 0);
    if (finalRemaining > 0.01) return;

    setIsProcessing(true);

    // Calculate change for cash payments
    const cashPayment = finalPayments.find(p => p.paymentMethod === PosPaymentMethod.CASH);
    const totalChange = cashPayment?.amountReceived
      ? Math.max(0, cashPayment.amountReceived - total)
      : 0;

    try {
      const result = await onPaymentComplete(finalPayments, totalChange);
      if (result) setCompletedSale(result);
      setIsProcessing(false);
      setIsComplete(true);
      setChange(totalChange);
    } catch {
      // Error is handled by the parent (toast.error) — just stop processing
      setIsProcessing(false);
    }
  };

  const handleQuickAmount = (amount: number) => {
    setAmountReceived(amount.toString());
  };

  const handleExactAmount = () => {
    setAmountReceived(remainingAmount.toFixed(2));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <h2 className="text-2xl font-bold text-gray-900">
            {isComplete ? 'Pago Completado' : 'Procesar Pago'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {isComplete ? (
          // Success View — either ticket preview or summary
          ticketUrl ? (
            <div className="flex flex-col" style={{ height: 'calc(90vh - 80px)' }}>
              <iframe
                src={ticketUrl}
                className="flex-grow w-full border-0"
                title="Ticket de venta"
              />
              <div className="flex gap-4 justify-center p-4 border-t bg-gray-50">
                <button
                  onClick={() => {
                    if (ticketUrl) {
                      URL.revokeObjectURL(ticketUrl);
                      setTicketUrl(null);
                    }
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium"
                >
                  Volver
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-[#3E667D] text-white rounded-xl hover:bg-[#2d4f63] font-medium"
                >
                  Nueva Venta
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <CheckCircleIcon className="h-24 w-24 text-green-500 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Venta Completada!</h3>
              <p className="text-gray-600 mb-6">
                Total: <span className="font-bold">{fmt(total)}</span>
              </p>
              {change > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                  <p className="text-lg font-bold text-yellow-800">
                    Cambio: {fmt(change)}
                  </p>
                </div>
              )}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={async () => {
                    if (!completedSale) return;
                    try {
                      const url = await generatePosTicketPdf(completedSale, {
                        branch: branchConfig,
                      });
                      setTicketUrl(url);
                    } catch {
                      // Fallback: open in new window
                      if (completedSale) {
                        const url = await generatePosTicketPdf(completedSale, {
                          branch: branchConfig,
                        });
                        window.open(url, '_blank');
                      }
                    }
                  }}
                  disabled={!completedSale}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PrinterIcon className="h-5 w-5" />
                  Imprimir Ticket
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-[#3E667D] text-white rounded-xl hover:bg-[#2d4f63] font-medium"
                >
                  Nueva Venta
                </button>
              </div>
            </div>
          )
        ) : (
          // Payment Form
          <div className="p-6 space-y-6">
            {/* Total Display */}
            <div className="text-center p-6 bg-[#3E667D] rounded-xl text-white">
              <p className="text-sm opacity-80">Total a pagar</p>
              <p className="text-4xl font-bold">{fmt(total)}</p>
              {payments.length > 0 && remainingAmount > 0 && (
                <p className="text-sm mt-2 opacity-80">
                  Restante: {fmt(remainingAmount)}
                </p>
              )}
            </div>

            {/* Payment Methods */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.key}
                    onClick={() => setSelectedKey(method.key)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                      selectedKey === method.key
                        ? 'border-[#a7c1e2] bg-[#C8DDF2]/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`h-6 w-6 ${
                      selectedKey === method.key ? 'text-[#3E667D]' : 'text-gray-400'
                    }`} />
                    <span className={`text-[11px] font-medium text-center leading-tight ${
                      selectedKey === method.key ? 'text-[#3E667D]' : 'text-gray-600'
                    }`}>
                      {method.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {selectedKey === 'cash' ? 'Monto recibido' : 'Monto'}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">{currencySymbol}</span>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-4 text-2xl font-bold text-right border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
                  step="0.01"
                  min="0"
                />
              </div>

              {/* Quick Amounts (Cash only) */}
              {selectedKey === 'cash' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleExactAmount}
                    className="px-4 py-2 bg-[#3E667D] text-white rounded-lg text-sm font-medium hover:bg-[#002d5f]"
                  >
                    Exacto
                  </button>
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleQuickAmount(amount)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                    >
                      {currencySymbol}{amount}
                    </button>
                  ))}
                </div>
              )}

              {/* Change Display (Cash) */}
              {selectedKey === 'cash' && currentChange > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-lg font-bold text-yellow-800">
                    Cambio: {fmt(currentChange)}
                  </p>
                </div>
              )}
            </div>

            {/* Add Payment Button (for split payments) */}
            {remainingAmount > 0.01 && (
              <button
                onClick={handleAddPayment}
                disabled={receivedNum <= 0}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Agregar Pago
              </button>
            )}

            {/* Added Payments List */}
            {payments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Pagos agregados:</p>
                {payments.map((payment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium">
                      {paymentMethods.find(m => m.method === payment.paymentMethod && m.cardType === (payment.cardType || undefined))?.name
                        || paymentMethods.find(m => m.method === payment.paymentMethod)?.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{fmt(payment.amount)}</span>
                      <button
                        onClick={() => handleRemovePayment(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Complete Payment Button */}
            <button
              onClick={handleCompletePayment}
              disabled={remainingAmount > 0.01 && payments.length === 0 && receivedNum < remainingAmount}
              className="w-full py-4 bg-[#3E667D] text-white text-xl font-bold rounded-xl hover:bg-[#6aa526] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Procesando...
                </span>
              ) : (
                'Completar Pago'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
