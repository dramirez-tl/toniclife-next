// components/pos/PaymentModal.tsx - Payment processing modal for POS
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  XMarkIcon,
  BanknotesIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  PrinterIcon,
  ArrowPathIcon,
  GiftIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { PosPaymentMethod, type CreatePaymentInput, type Sale } from '@/types/pos';
import { generatePosTicketPdf, type PosTicketBranchConfig } from '@/lib/generate-pos-ticket';
import type { FiscalData } from '@/types/billing';
import { FISCAL_REGIMES, CFDI_USES, PAYMENT_FORMS } from '@/types/billing';
import { billingService } from '@/services/billing.service';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { toast } from 'sonner';

const fiscalRegimeOptions = FISCAL_REGIMES.map((r) => ({ value: r.Value, label: `${r.Value} - ${r.Name}` }));
const cfdiUseOptions = CFDI_USES.map((u) => ({ value: u.Value, label: `${u.Value} - ${u.Name}` }));
const paymentFormOptions = PAYMENT_FORMS.map((f) => ({ value: f.Value, label: `${f.Value} - ${f.Name}` }));

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  customerId?: string;
  onPaymentComplete: (payments: CreatePaymentInput[], change: number, requiresInvoice: boolean, invoicePaymentMethod?: string) => Promise<Sale | undefined> | Sale | void;
  currencySymbol?: string;
  branchConfig?: PosTicketBranchConfig;
  branchName?: string;
  branchCountryName?: string;
  branchCountryId?: string;
}

type MethodKey = 'cash' | 'card_credit' | 'card_debit' | 'transfer' | 'cashback' | 'promotion' | 'mercado_pago' | 'usd_cash' | 'undefined';

const paymentMethods: { key: MethodKey; method: PosPaymentMethod; name: string; icon: typeof BanknotesIcon; cardType?: string }[] = [
  { key: 'cash', method: PosPaymentMethod.CASH, name: 'Efectivo', icon: BanknotesIcon },
  { key: 'card_credit', method: PosPaymentMethod.CARD, name: 'T. Crédito', icon: CreditCardIcon, cardType: 'credit' },
  { key: 'card_debit', method: PosPaymentMethod.CARD, name: 'T. Débito', icon: CreditCardIcon, cardType: 'debit' },
  { key: 'transfer', method: PosPaymentMethod.TRANSFER, name: 'Transferencia', icon: BuildingLibraryIcon },
  { key: 'cashback', method: PosPaymentMethod.CASHBACK, name: 'Cashback', icon: ArrowPathIcon },
  { key: 'promotion', method: PosPaymentMethod.PROMOTION, name: 'Promoción', icon: GiftIcon },
  { key: 'mercado_pago', method: PosPaymentMethod.MERCADO_PAGO, name: 'Mercado Pago', icon: ShoppingCartIcon },
  { key: 'usd_cash', method: PosPaymentMethod.USD_CASH, name: 'Pago en Dólares', icon: CurrencyDollarIcon },
  { key: 'undefined', method: PosPaymentMethod.UNDEFINED, name: 'Sin Definir', icon: QuestionMarkCircleIcon },
];

const quickAmounts = [50, 100, 200, 500, 1000];

// Country IDs where invoicing (CFDI) is available — Mexico + Frontera MX-USA
const INVOICE_COUNTRY_IDS = new Set([
  'b47b4f94-011d-4071-adf9-5c5285606af7', // Mexico (remote DB)
  'ed380c6f-5a3e-4a0f-bfe5-bf8fdcb9b42f', // Frontera MX-USA (remote DB)
]);

export function PaymentModal({ isOpen, onClose, total, customerId, onPaymentComplete, currencySymbol = '$', branchConfig, branchName, branchCountryName, branchCountryId }: PaymentModalProps) {
  const canInvoice = (branchCountryId && INVOICE_COUNTRY_IDS.has(branchCountryId)) || branchCountryName === 'México' || branchCountryName === 'Frontera MX-USA';

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

  // Invoice / Fiscal data
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [fiscalData, setFiscalData] = useState<FiscalData | null>(null);
  const [loadingFiscal, setLoadingFiscal] = useState(false);
  const [noFiscalData, setNoFiscalData] = useState(false);

  // Fiscal form for registering/editing
  const [showFiscalForm, setShowFiscalForm] = useState(false);
  const [savingFiscal, setSavingFiscal] = useState(false);
  const [validatingFiscal, setValidatingFiscal] = useState(false);
  const [fiscalForm, setFiscalForm] = useState({ rfc: '', legalName: '', fiscalRegime: '', postalCode: '', cfdiUse: 'G03', email: '', paymentFormCode: '01', invoicePaymentMethod: 'PUE' });
  const [fiscalErrors, setFiscalErrors] = useState<Record<string, string>>({});

  // Per-sale invoice payment method (PUE / PPD) — separate from fiscal data stored on customer
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState<'PUE' | 'PPD'>('PUE');

  const handleFiscalFormChange = (field: string, value: string) => {
    setFiscalForm((prev) => ({ ...prev, [field]: value }));
    if (fiscalErrors[field]) {
      setFiscalErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const handleSaveFiscalData = async () => {
    if (!customerId) return;
    const { rfc, legalName, fiscalRegime, postalCode, cfdiUse, email, paymentFormCode } = fiscalForm;
    if (!rfc || !legalName || !fiscalRegime || !postalCode) {
      const errs: Record<string, string> = {};
      if (!rfc) errs.rfc = 'RFC es obligatorio';
      if (!legalName) errs.legalName = 'Razón Social es obligatoria';
      if (!fiscalRegime) errs.fiscalRegime = 'Régimen Fiscal es obligatorio';
      if (!postalCode) errs.postalCode = 'Código Postal es obligatorio';
      setFiscalErrors(errs);
      return;
    }

    // Validate with SAT via backend
    setValidatingFiscal(true);
    setFiscalErrors({});
    try {
      const validation = await billingService.validateFiscalData({ rfc, legalName, fiscalRegime, postalCode, cfdiUse, email });
      if (!validation.valid) {
        setFiscalErrors(validation.errors);
        setValidatingFiscal(false);
        const firstError = Object.values(validation.errors)[0];
        toast.error(firstError || 'Los datos fiscales no son válidos según el SAT');
        return;
      }
    } catch {
      // If validation endpoint fails, continue with save (don't block)
    }
    setValidatingFiscal(false);

    // Save
    setSavingFiscal(true);
    try {
      if (fiscalData?.id) {
        const updated = await billingService.updateFiscalData(fiscalData.id, { rfc, legalName, fiscalRegime, postalCode, cfdiUse, paymentFormCode, email });
        setFiscalData(updated);
      } else {
        const created = await billingService.createFiscalData({ customerId, rfc, legalName, fiscalRegime, postalCode, cfdiUse, paymentFormCode, email });
        setFiscalData(created);
      }
      setNoFiscalData(false);
      setShowFiscalForm(false);
      setFiscalErrors({});
      toast.success('Datos fiscales validados y guardados');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar datos fiscales');
    } finally {
      setSavingFiscal(false);
    }
  };

  // Fetch fiscal data when invoice is toggled on
  const fetchFiscalData = useCallback(async (custId: string) => {
    setLoadingFiscal(true);
    setNoFiscalData(false);
    try {
      const data = await billingService.getFiscalDataByCustomer(custId);
      const defaultRecord = data.find((d) => d.isDefault) || data[0];
      if (defaultRecord) {
        setFiscalData(defaultRecord);
      } else {
        setNoFiscalData(true);
        setFiscalData(null);
      }
    } catch {
      setNoFiscalData(true);
      setFiscalData(null);
    } finally {
      setLoadingFiscal(false);
    }
  }, []);

  useEffect(() => {
    if (wantsInvoice && customerId) {
      fetchFiscalData(customerId);
    } else if (!wantsInvoice) {
      setFiscalData(null);
      setNoFiscalData(false);
    }
  }, [wantsInvoice, customerId, fetchFiscalData]);

  useEffect(() => {
    if (fiscalData) {
      setFiscalForm(prev => ({
        ...prev,
        paymentFormCode: fiscalData.paymentFormCode || '01',
      }));
    }
  }, [fiscalData]);

  const fiscalComplete = !wantsInvoice || (fiscalData && fiscalData.rfc && fiscalData.legalName && fiscalData.taxRegime && fiscalData.postalCode && fiscalData.defaultCfdiUse);

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
      setWantsInvoice(false);
      setFiscalData(null);
      setNoFiscalData(false);
      setShowFiscalForm(false);
      setFiscalErrors({});
      setValidatingFiscal(false);
      setFiscalForm({ rfc: '', legalName: '', fiscalRegime: '', postalCode: '', cfdiUse: 'G03', email: '', paymentFormCode: '01', invoicePaymentMethod: 'PUE' });
      setInvoicePaymentMethod('PUE');
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
      const result = await onPaymentComplete(finalPayments, totalChange, wantsInvoice, invoicePaymentMethod);
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isComplete ? 'Pago Completado' : 'Procesar Pago'}
            </h2>
            {branchName && (
              <p className="text-sm text-gray-500">{branchName}</p>
            )}
          </div>
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
            <div className="flex flex-col flex-1 min-h-0">
              <iframe
                src={ticketUrl}
                className="flex-1 min-h-0 w-full border-0"
                title="Ticket de venta"
              />
              <div className="flex gap-4 justify-center p-4 border-t bg-gray-50 flex-shrink-0">
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
          <div className="p-6 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
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

            {/* Invoice Toggle — only for Mexico branches (CFDI) */}
            {customerId && canInvoice && (
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                    <span className="font-medium text-gray-700">¿Facturar esta venta?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWantsInvoice(!wantsInvoice)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      wantsInvoice ? 'bg-[#3E667D]' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      wantsInvoice ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {wantsInvoice && (
                  loadingFiscal ? (
                    <div className="flex items-center justify-center py-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#3E667D]" />
                      <span className="ml-2 text-sm text-gray-500">Cargando datos fiscales...</span>
                    </div>
                  ) : showFiscalForm ? (
                    /* Inline fiscal data form */
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2.5">
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        {fiscalData ? 'Editar datos fiscales' : 'Registrar datos fiscales'}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={`text-xs ${fiscalErrors.rfc ? 'text-red-600 font-medium' : 'text-gray-500'}`}>RFC *</label>
                          <input
                            type="text"
                            value={fiscalForm.rfc}
                            onChange={(e) => handleFiscalFormChange('rfc', e.target.value.toUpperCase())}
                            placeholder="XAXX010101000"
                            maxLength={13}
                            className={`w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-1 outline-none ${fiscalErrors.rfc ? 'border-red-400 bg-red-50 focus:ring-red-300 focus:border-red-400' : 'border-gray-300 focus:ring-[#3E667D] focus:border-[#3E667D]'}`}
                          />
                          {fiscalErrors.rfc && <p className="text-[11px] text-red-600 mt-0.5">{fiscalErrors.rfc}</p>}
                        </div>
                        <div>
                          <label className={`text-xs ${fiscalErrors.legalName ? 'text-red-600 font-medium' : 'text-gray-500'}`}>Razón Social *</label>
                          <input
                            type="text"
                            value={fiscalForm.legalName}
                            onChange={(e) => handleFiscalFormChange('legalName', e.target.value.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))}
                            placeholder="Nombre o Razón Social"
                            className={`w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-1 outline-none ${fiscalErrors.legalName ? 'border-red-400 bg-red-50 focus:ring-red-300 focus:border-red-400' : 'border-gray-300 focus:ring-[#3E667D] focus:border-[#3E667D]'}`}
                          />
                          {fiscalErrors.legalName && <p className="text-[11px] text-red-600 mt-0.5">{fiscalErrors.legalName}</p>}
                        </div>
                        <div>
                          <label className={`text-xs ${fiscalErrors.fiscalRegime ? 'text-red-600 font-medium' : 'text-gray-500'}`}>Régimen Fiscal *</label>
                          <SearchableSelect
                            options={fiscalRegimeOptions}
                            value={fiscalForm.fiscalRegime}
                            onChange={(v) => handleFiscalFormChange('fiscalRegime', v)}
                            placeholder="Buscar régimen..."
                            showAllOption={false}
                          />
                          {fiscalErrors.fiscalRegime && <p className="text-[11px] text-red-600 mt-0.5">{fiscalErrors.fiscalRegime}</p>}
                        </div>
                        <div>
                          <label className={`text-xs ${fiscalErrors.postalCode ? 'text-red-600 font-medium' : 'text-gray-500'}`}>C.P. *</label>
                          <input
                            type="text"
                            value={fiscalForm.postalCode}
                            onChange={(e) => handleFiscalFormChange('postalCode', e.target.value.replace(/\D/g, ''))}
                            placeholder="37000"
                            maxLength={5}
                            className={`w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-1 outline-none ${fiscalErrors.postalCode ? 'border-red-400 bg-red-50 focus:ring-red-300 focus:border-red-400' : 'border-gray-300 focus:ring-[#3E667D] focus:border-[#3E667D]'}`}
                          />
                          {fiscalErrors.postalCode && <p className="text-[11px] text-red-600 mt-0.5">{fiscalErrors.postalCode}</p>}
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Uso CFDI</label>
                          <SearchableSelect
                            options={cfdiUseOptions}
                            value={fiscalForm.cfdiUse}
                            onChange={(v) => handleFiscalFormChange('cfdiUse', v)}
                            placeholder="Buscar uso CFDI..."
                            showAllOption={false}
                          />
                        </div>
                        <div>
                          <label className={`text-xs ${fiscalErrors.email ? 'text-red-600 font-medium' : 'text-gray-500'}`}>Email</label>
                          <input
                            type="email"
                            value={fiscalForm.email}
                            onChange={(e) => handleFiscalFormChange('email', e.target.value)}
                            placeholder="correo@ejemplo.com"
                            className={`w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-1 outline-none ${fiscalErrors.email ? 'border-red-400 bg-red-50 focus:ring-red-300 focus:border-red-400' : 'border-gray-300 focus:ring-[#3E667D] focus:border-[#3E667D]'}`}
                          />
                          {fiscalErrors.email && <p className="text-[11px] text-red-600 mt-0.5">{fiscalErrors.email}</p>}
                        </div>
                        {/* Forma de Pago + Método de Pago */}
                        <div>
                          <label className="text-xs text-gray-500">Forma de Pago</label>
                          <SearchableSelect
                            options={paymentFormOptions}
                            value={fiscalForm.paymentFormCode}
                            onChange={(v) => handleFiscalFormChange('paymentFormCode', v)}
                            placeholder="Seleccionar..."
                            showAllOption={false}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500">Método de Pago</label>
                          <div className="flex gap-2 mt-1">
                            {([
                              { value: 'PUE', label: 'PUE', sub: 'Una sola exhibición' },
                              { value: 'PPD', label: 'PPD', sub: 'Parcialidades o diferido' },
                            ] as const).map(({ value, label, sub }) => {
                              const selected = invoicePaymentMethod === value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => setInvoicePaymentMethod(value)}
                                  className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left ${
                                    selected
                                      ? 'border-[#3E667D] bg-[#3E667D]/5'
                                      : 'border-gray-200 hover:border-gray-300 bg-white'
                                  }`}
                                >
                                  <span className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                    selected ? 'border-[#3E667D]' : 'border-gray-300'
                                  }`}>
                                    {selected && <span className="w-2 h-2 rounded-full bg-[#3E667D]" />}
                                  </span>
                                  <span>
                                    <span className={`block text-sm font-semibold ${selected ? 'text-[#3E667D]' : 'text-gray-700'}`}>{label}</span>
                                    <span className="block text-[10px] text-gray-400 leading-tight">{sub}</span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => { setShowFiscalForm(false); setFiscalErrors({}); }}
                          className="flex-1 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        {process.env.NODE_ENV === 'development' && (
                          <button
                            type="button"
                            disabled={validatingFiscal || !fiscalForm.rfc}
                            onClick={async () => {
                              setValidatingFiscal(true);
                              setFiscalErrors({});
                              try {
                                const result = await billingService.validateFiscalData({
                                  rfc: fiscalForm.rfc,
                                  legalName: fiscalForm.legalName,
                                  fiscalRegime: fiscalForm.fiscalRegime,
                                  postalCode: fiscalForm.postalCode,
                                  cfdiUse: fiscalForm.cfdiUse,
                                  email: fiscalForm.email,
                                });
                                if (result.valid) {
                                  toast.success('RFC, C.P. y régimen válidos en SAT. La correspondencia RFC↔Razón Social se valida al timbrar.');
                                } else {
                                  setFiscalErrors(result.errors);
                                  toast.error(`Validacion fallida: ${Object.values(result.errors).join(', ')}`);
                                }
                              } catch (err: any) {
                                toast.error(`Error de validacion: ${err.message || 'Error desconocido'}`);
                              } finally {
                                setValidatingFiscal(false);
                              }
                            }}
                            className="px-3 py-1.5 text-sm text-amber-700 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 disabled:opacity-50"
                          >
                            {validatingFiscal ? 'Validando...' : 'Test'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleSaveFiscalData}
                          disabled={savingFiscal || validatingFiscal || !fiscalForm.rfc || !fiscalForm.legalName || !fiscalForm.fiscalRegime || !fiscalForm.postalCode}
                          className="flex-1 px-3 py-1.5 text-sm text-white bg-[#3E667D] rounded-lg hover:bg-[#2d4f63] disabled:opacity-50"
                        >
                          {validatingFiscal ? 'Validando...' : savingFiscal ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    </div>
                  ) : noFiscalData ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                      <p className="text-sm text-amber-800 font-medium">Este cliente no tiene datos fiscales registrados.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setFiscalForm({ rfc: '', legalName: '', fiscalRegime: '', postalCode: '', cfdiUse: 'G03', email: '', paymentFormCode: '01', invoicePaymentMethod: 'PUE' });
                          setShowFiscalForm(true);
                        }}
                        className="w-full px-3 py-2 text-sm font-medium text-[#3E667D] bg-white border border-[#3E667D]/30 rounded-lg hover:bg-[#3E667D]/5 transition-colors"
                      >
                        + Registrar datos fiscales
                      </button>
                    </div>
                  ) : fiscalData ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Datos de facturación</p>
                        <button
                          type="button"
                          onClick={() => {
                            setFiscalForm({
                              rfc: fiscalData.rfc || '',
                              legalName: fiscalData.legalName || '',
                              fiscalRegime: fiscalData.taxRegime || '',
                              postalCode: fiscalData.postalCode || '',
                              cfdiUse: fiscalData.defaultCfdiUse || 'G03',
                              email: fiscalData.email || '',
                              paymentFormCode: fiscalData.paymentFormCode || '01',
                              invoicePaymentMethod: 'PUE',
                            });
                            setShowFiscalForm(true);
                          }}
                          className="text-xs text-blue-700 hover:text-blue-900 font-medium underline"
                        >
                          Editar
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <div>
                          <span className="text-blue-600 text-xs">RFC:</span>
                          <p className="font-medium text-gray-900">{fiscalData.rfc}</p>
                        </div>
                        <div>
                          <span className="text-blue-600 text-xs">Razón Social:</span>
                          <p className="font-medium text-gray-900 truncate">{fiscalData.legalName}</p>
                        </div>
                        <div>
                          <span className="text-blue-600 text-xs">Régimen Fiscal:</span>
                          <p className="font-medium text-gray-900">{fiscalData.taxRegime}</p>
                        </div>
                        <div>
                          <span className="text-blue-600 text-xs">C.P.:</span>
                          <p className="font-medium text-gray-900">{fiscalData.postalCode}</p>
                        </div>
                        <div>
                          <span className="text-blue-600 text-xs">Uso CFDI:</span>
                          <p className="font-medium text-gray-900">{fiscalData.defaultCfdiUse}</p>
                        </div>
                        <div>
                          <span className="text-blue-600 text-xs">Email:</span>
                          <p className="font-medium text-gray-900 truncate">{fiscalData.email}</p>
                        </div>
                        <div>
                          <span className="text-blue-600 text-xs">Forma de Pago:</span>
                          <p className="font-medium text-gray-900">{fiscalData.paymentFormCode || '01'}</p>
                        </div>
                      </div>
                      {/* PUE / PPD toggle — always visible in summary */}
                      <div className="mt-3">
                        <span className="text-blue-600 text-xs">Método de Pago</span>
                        <div className="flex gap-2 mt-1">
                          {(['PUE', 'PPD'] as const).map((method) => (
                            <button
                              key={method}
                              type="button"
                              onClick={() => setInvoicePaymentMethod(method)}
                              className={`flex-1 px-3 py-1.5 text-sm rounded-lg border-2 font-medium transition-all ${
                                invoicePaymentMethod === method
                                  ? 'border-[#3E667D] bg-[#3E667D] text-white'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              {method === 'PUE' ? 'PUE · Una exhibición' : 'PPD · Diferido'}
                            </button>
                          ))}
                        </div>
                      </div>
                      {!fiscalComplete && (
                        <p className="text-xs text-red-600 mt-2 font-medium">Faltan datos fiscales requeridos. Presione &quot;Editar&quot; para completarlos.</p>
                      )}
                    </div>
                  ) : null
                )}
              </div>
            )}

            {/* Complete Payment Button */}
            <button
              onClick={handleCompletePayment}
              disabled={(remainingAmount > 0.01 && payments.length === 0 && receivedNum < remainingAmount) || (wantsInvoice && !fiscalComplete)}
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
