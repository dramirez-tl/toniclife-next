// app/admin/facturacion/complemento-pago/page.tsx - Complemento de Pago CFDI
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.5 Facturación
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DocumentDuplicateIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useCreatePaymentComplement, useStampPaymentComplement } from '@/hooks/useBilling';
import { PermissionGuard } from '@/components/auth';

export default function ComplementoPagoPage() {
  const createComplement = useCreatePaymentComplement();
  const stampComplement = useStampPaymentComplement();

  const [invoiceUuid, setInvoiceUuid] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [amount, setAmount] = useState('');
  const [partialityNumber, setPartialityNumber] = useState('1');
  const [paymentForm, setPaymentForm] = useState('03'); // Transferencia
  const [createdComplement, setCreatedComplement] = useState<{
    id: string;
    complementInvoiceId?: string;
  } | null>(null);

  const handleCreate = async () => {
    if (!invoiceUuid.trim()) {
      toast.error('Ingresa el UUID de la factura relacionada');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    const parsedAmount = parseFloat(amount);

    try {
      const result = await createComplement.mutateAsync({
        paymentDate,
        paymentForm,
        amount: parsedAmount,
        invoices: [
          {
            invoiceUuid: invoiceUuid.trim(),
            amountPaid: parsedAmount,
            partialityNumber: parseInt(partialityNumber, 10) || 1,
          },
        ],
      });
      setCreatedComplement({ id: result.id, complementInvoiceId: result.complementInvoiceId });
      toast.success('Complemento de pago creado exitosamente');
    } catch {
      // Error toast is handled by the hook
    }
  };

  const handleStamp = async () => {
    if (!createdComplement) return;

    try {
      await stampComplement.mutateAsync(createdComplement.id);
      toast.success('Complemento de pago timbrado exitosamente');
    } catch {
      // Error toast is handled by the hook
    }
  };

  const handleReset = () => {
    setInvoiceUuid('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setAmount('');
    setPartialityNumber('1');
    setPaymentForm('03');
    setCreatedComplement(null);
  };

  return (
    <PermissionGuard permissions={['billing:create', 'billing:*']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <DocumentDuplicateIcon className="h-10 w-10" />
                  <h1 className="text-4xl font-bold">Complemento de Pago</h1>
                </div>
                <p className="text-white/80 text-lg">
                  Crear CFDI de complemento de pago para facturas con pago en
                  parcialidades
                </p>
              </div>
              <Link href="/admin/facturacion">
                <Button
                  variant="outline"
                  className="border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  Volver a Facturas
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!createdComplement ? (
            <Card>
              <CardContent className="p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Datos del Complemento de Pago
                </h2>

                <div className="space-y-6">
                  {/* Invoice UUID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      UUID de la Factura Relacionada *
                    </label>
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={invoiceUuid}
                        onChange={(e) => setInvoiceUuid(e.target.value)}
                        placeholder="Ej: 6F8E2D3A-B1C4-4E5F-9A0D-1234567890AB"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent font-mono text-sm"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      UUID de la factura original a la que aplica el pago
                    </p>
                  </div>

                  {/* Payment Date, Amount, and Partiality */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha de Pago *
                      </label>
                      <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monto del Pago *
                      </label>
                      <div className="relative">
                        <CurrencyDollarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          min="0.01"
                          step="0.01"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        No. de Parcialidad
                      </label>
                      <input
                        type="number"
                        value={partialityNumber}
                        onChange={(e) => setPartialityNumber(e.target.value)}
                        placeholder="1"
                        min="1"
                        step="1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Payment Form */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Forma de Pago
                    </label>
                    <SearchableSelect
                      options={[
                        { value: '01', label: '01 - Efectivo' },
                        { value: '02', label: '02 - Cheque nominativo' },
                        { value: '03', label: '03 - Transferencia electrónica de fondos' },
                        { value: '04', label: '04 - Tarjeta de crédito' },
                        { value: '28', label: '28 - Tarjeta de débito' },
                        { value: '99', label: '99 - Por definir' },
                      ]}
                      value={paymentForm}
                      onChange={setPaymentForm}
                      showAllOption={false}
                    />
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          Importante
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          El complemento de pago se emite cuando se recibe el
                          pago de una factura emitida con método de pago PPD
                          (Pago en Parcialidades o Diferido). Asegúrate de que
                          el UUID corresponda a una factura vigente.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Link href="/admin/facturacion">
                      <Button variant="outline">Cancelar</Button>
                    </Link>
                    <Button
                      variant="default"
                      onClick={handleCreate}
                      disabled={createComplement.isPending}
                    >
                      <PlusIcon className="h-5 w-5" />
                      {createComplement.isPending
                        ? 'Creando...'
                        : 'Crear Complemento'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Success state */
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircleIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Complemento Creado
                  </h2>
                  <p className="text-gray-600 mb-6">
                    El complemento de pago ha sido creado exitosamente.
                  </p>

                  <div className="bg-gray-50 rounded-lg p-4 mb-6 inline-block">
                    <p className="text-xs text-gray-500 mb-1">ID del Complemento</p>
                    <p className="font-mono text-sm text-[#3E667D] font-medium">
                      {createdComplement.complementInvoiceId || createdComplement.id}
                    </p>
                  </div>

                  <div className="flex justify-center gap-3">
                    <Button
                      variant="default"
                      onClick={handleStamp}
                      disabled={stampComplement.isPending}
                    >
                      {stampComplement.isPending
                        ? 'Timbrando...'
                        : 'Timbrar Complemento'}
                    </Button>
                    <Button variant="outline" onClick={handleReset}>
                      Crear Otro
                    </Button>
                    <Link href="/admin/facturacion">
                      <Button variant="ghost">Volver a Facturas</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}
