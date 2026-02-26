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
} from '@heroicons/react/24/outline';
import { PosPaymentMethod, type CreatePaymentInput } from '@/types/pos';
import { posService } from '@/services/pos.service';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onPaymentComplete: (payments: CreatePaymentInput[], change: number) => void;
}

const paymentMethods = [
  { id: PosPaymentMethod.CASH, name: 'Efectivo', icon: BanknotesIcon },
  { id: PosPaymentMethod.CARD, name: 'Tarjeta', icon: CreditCardIcon },
  { id: PosPaymentMethod.TRANSFER, name: 'Transferencia', icon: BuildingLibraryIcon },
];

const quickAmounts = [50, 100, 200, 500, 1000];

export function PaymentModal({ isOpen, onClose, total, onPaymentComplete }: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PosPaymentMethod>(PosPaymentMethod.CASH);
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [payments, setPayments] = useState<CreatePaymentInput[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [change, setChange] = useState(0);

  // Card payment fields
  const [cardLast4, setCardLast4] = useState('');
  const [authCode, setAuthCode] = useState('');

  // Transfer fields
  const [referenceNumber, setReferenceNumber] = useState('');

  const remainingAmount = total - payments.reduce((sum, p) => sum + p.amount, 0);
  const receivedNum = parseFloat(amountReceived) || 0;
  const currentChange = selectedMethod === PosPaymentMethod.CASH
    ? Math.max(0, receivedNum - remainingAmount)
    : 0;

  useEffect(() => {
    if (isOpen) {
      setSelectedMethod(PosPaymentMethod.CASH);
      setAmountReceived('');
      setPayments([]);
      setIsProcessing(false);
      setIsComplete(false);
      setChange(0);
      setCardLast4('');
      setAuthCode('');
      setReferenceNumber('');
    }
  }, [isOpen]);

  const handleAddPayment = () => {
    if (receivedNum <= 0) return;

    const payment: CreatePaymentInput = {
      paymentMethod: selectedMethod,
      amount: Math.min(receivedNum, remainingAmount),
    };

    if (selectedMethod === PosPaymentMethod.CASH) {
      payment.amountReceived = receivedNum;
    } else if (selectedMethod === PosPaymentMethod.CARD) {
      payment.cardLast4 = cardLast4;
      payment.authorizationCode = authCode;
    } else if (selectedMethod === PosPaymentMethod.TRANSFER) {
      payment.referenceNumber = referenceNumber;
    }

    setPayments([...payments, payment]);
    setAmountReceived('');
    setCardLast4('');
    setAuthCode('');
    setReferenceNumber('');
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleCompletePayment = () => {
    if (remainingAmount > 0.01) return;

    setIsProcessing(true);

    // Calculate change for cash payments
    const cashPayment = payments.find(p => p.paymentMethod === PosPaymentMethod.CASH);
    const totalChange = cashPayment?.amountReceived
      ? Math.max(0, cashPayment.amountReceived - total)
      : 0;

    // Simulate processing delay
    setTimeout(() => {
      setIsProcessing(false);
      setIsComplete(true);
      setChange(totalChange);
      onPaymentComplete(payments, totalChange);
    }, 1000);
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
          // Success View
          <div className="p-8 text-center">
            <CheckCircleIcon className="h-24 w-24 text-green-500 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Venta Completada!</h3>
            <p className="text-gray-600 mb-6">
              Total: <span className="font-bold">{posService.formatCurrency(total)}</span>
            </p>
            {change > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <p className="text-lg font-bold text-yellow-800">
                  Cambio: {posService.formatCurrency(change)}
                </p>
              </div>
            )}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {/* TODO: Print ticket */}}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium"
              >
                <PrinterIcon className="h-5 w-5" />
                Imprimir Ticket
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-[#3E667D] text-white rounded-xl hover:bg-[#6aa526] font-medium"
              >
                Nueva Venta
              </button>
            </div>
          </div>
        ) : (
          // Payment Form
          <div className="p-6 space-y-6">
            {/* Total Display */}
            <div className="text-center p-6 bg-[#3E667D] rounded-xl text-white">
              <p className="text-sm opacity-80">Total a pagar</p>
              <p className="text-4xl font-bold">{posService.formatCurrency(total)}</p>
              {payments.length > 0 && remainingAmount > 0 && (
                <p className="text-sm mt-2 opacity-80">
                  Restante: {posService.formatCurrency(remainingAmount)}
                </p>
              )}
            </div>

            {/* Payment Methods */}
            <div className="flex gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      selectedMethod === method.id
                        ? 'border-[#a7c1e2] bg-[#C8DDF2]/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`h-8 w-8 ${
                      selectedMethod === method.id ? 'text-[#3E667D]' : 'text-gray-400'
                    }`} />
                    <span className={`font-medium ${
                      selectedMethod === method.id ? 'text-[#3E667D]' : 'text-gray-600'
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
                {selectedMethod === PosPaymentMethod.CASH ? 'Monto recibido' : 'Monto'}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">$</span>
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
              {selectedMethod === PosPaymentMethod.CASH && (
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
                      ${amount}
                    </button>
                  ))}
                </div>
              )}

              {/* Card Fields */}
              {selectedMethod === PosPaymentMethod.CARD && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Últimos 4 dígitos
                    </label>
                    <input
                      type="text"
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value.slice(0, 4))}
                      placeholder="1234"
                      maxLength={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código autorización
                    </label>
                    <input
                      type="text"
                      value={authCode}
                      onChange={(e) => setAuthCode(e.target.value)}
                      placeholder="ABC123"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2]"
                    />
                  </div>
                </div>
              )}

              {/* Transfer Fields */}
              {selectedMethod === PosPaymentMethod.TRANSFER && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de referencia
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Referencia de transferencia"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2]"
                  />
                </div>
              )}

              {/* Change Display (Cash) */}
              {selectedMethod === PosPaymentMethod.CASH && currentChange > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-lg font-bold text-yellow-800">
                    Cambio: {posService.formatCurrency(currentChange)}
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
                      {paymentMethods.find(m => m.id === payment.paymentMethod)?.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{posService.formatCurrency(payment.amount)}</span>
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
