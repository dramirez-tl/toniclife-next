'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  BanknotesIcon,
  CreditCardIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { toast } from 'sonner';

const mockPaymentMethods = [
  {
    id: '1',
    type: 'bank',
    bank: 'BBVA Bancomer',
    accountNumber: '****7890',
    accountHolder: 'María García López',
    clabe: '012180015123456789',
    isDefault: true,
    verified: true,
  },
  {
    id: '2',
    type: 'paypal',
    email: 'maria.garcia@email.com',
    verified: true,
    isDefault: false,
  },
];

const mockWithdrawals = [
  {
    id: '1',
    date: '2025-01-20',
    amount: 8500,
    method: 'BBVA Bancomer ****7890',
    status: 'completed',
    reference: 'WD-2025-001',
    processedDate: '2025-01-21',
  },
  {
    id: '2',
    date: '2025-01-05',
    amount: 6200,
    method: 'BBVA Bancomer ****7890',
    status: 'completed',
    reference: 'WD-2025-002',
    processedDate: '2025-01-06',
  },
  {
    id: '3',
    date: '2024-12-20',
    amount: 7800,
    method: 'BBVA Bancomer ****7890',
    status: 'completed',
    reference: 'WD-2024-125',
    processedDate: '2024-12-21',
  },
  {
    id: '4',
    date: '2024-12-05',
    amount: 5500,
    method: 'PayPal',
    status: 'completed',
    reference: 'WD-2024-098',
    processedDate: '2024-12-06',
  },
];

const mockPendingPayments = [
  {
    id: '1',
    period: 'Enero 2025',
    amount: 12500,
    paymentDate: '2025-02-05',
    type: 'commission',
    description: 'Comisiones personales + equipo',
  },
  {
    id: '2',
    period: 'Enero 2025',
    amount: 2500,
    paymentDate: '2025-02-05',
    type: 'bonus',
    description: 'Bono de rango Diamante',
  },
];

const statusConfig = {
  completed: { label: 'Completado', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
  processing: { label: 'Procesando', color: 'bg-blue-100 text-blue-800', icon: ClockIcon },
  failed: { label: 'Fallido', color: 'bg-red-100 text-red-800', icon: XCircleIcon },
};

export default function PagosPage() {
  const [paymentMethods, setPaymentMethods] = useState(mockPaymentMethods);
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const availableBalance = 15000;
  const totalWithdrawn = mockWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  const pendingAmount = mockPendingPayments.reduce((sum, p) => sum + p.amount, 0);

  const handleSetDefault = (methodId: string) => {
    setPaymentMethods(methods =>
      methods.map(m => ({
        ...m,
        isDefault: m.id === methodId,
      }))
    );
    toast.success('Método de pago predeterminado actualizado');
  };

  const handleDeleteMethod = (methodId: string) => {
    const shouldDelete = window.confirm('¿Seguro que deseas eliminar este método de pago?');
    if (!shouldDelete) return;
    setPaymentMethods(methods => methods.filter(m => m.id !== methodId));
    toast.success('Método de pago eliminado');
  };

  const handleRequestWithdrawal = () => {
    toast.success('Solicitud de retiro enviada');
    setShowWithdrawModal(false);
  };

  const filteredWithdrawals = mockWithdrawals.filter(w => {
    if (filterStatus === 'all') return true;
    return w.status === filterStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BanknotesIcon className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10" />
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Gestión de Pagos</h1>
              </div>
              <p className="text-white/80 text-sm sm:text-base lg:text-lg">
                Administra tus métodos de pago y retiros
              </p>
            </div>
            <Link href="/distribuidor" className="w-full lg:w-auto">
              <Button variant="secondary" className="w-full lg:w-auto">
                Volver al Panel Principal
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-[#C8DDF2] to-[#C8DDF2]/90 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <BanknotesIcon className="h-8 w-8 text-white/80" />
              </div>
              <p className="text-sm text-white/80 mb-1">Saldo Disponible</p>
              <p className="text-3xl font-bold">${availableBalance.toLocaleString('es-MX')}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4 w-full"
                onClick={() => setShowWithdrawModal(true)}
              >
                Solicitar Retiro
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <ClockIcon className="h-8 w-8 text-yellow-500" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Pagos Pendientes</p>
              <p className="text-3xl font-bold text-gray-900">${pendingAmount.toLocaleString('es-MX')}</p>
              <p className="text-xs text-gray-500 mt-2">
                Fecha estimada: {mockPendingPayments[0]?.paymentDate ? new Date(mockPendingPayments[0].paymentDate).toLocaleDateString('es-MX') : 'N/A'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Retirado</p>
              <p className="text-3xl font-bold text-gray-900">${totalWithdrawn.toLocaleString('es-MX')}</p>
              <p className="text-xs text-gray-500 mt-2">
                {mockWithdrawals.length} retiros completados
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Payment Methods */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Métodos de Pago</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<PlusIcon className="h-4 w-4" />}
                    onClick={() => setShowAddMethodModal(true)}
                  >
                    Agregar
                  </Button>
                </div>

                <div className="space-y-4">
                  {paymentMethods.length > 0 ? (
                    paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`border rounded-lg p-4 ${
                          method.isDefault ? 'border-[#a7c1e2] bg-green-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {method.type === 'bank' ? (
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <CreditCardIcon className="h-5 w-5 text-blue-600" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <span className="text-purple-600 font-bold text-xs">PP</span>
                              </div>
                            )}
                            <div>
                              {method.type === 'bank' ? (
                                <>
                                  <p className="font-semibold text-gray-900">{method.bank}</p>
                                  <p className="text-sm text-gray-600">{method.accountNumber}</p>
                                </>
                              ) : (
                                <>
                                  <p className="font-semibold text-gray-900">PayPal</p>
                                  <p className="text-sm text-gray-600">{method.email}</p>
                                </>
                              )}
                            </div>
                          </div>
                          {method.verified && (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          )}
                        </div>

                        {method.isDefault && (
                          <div className="mb-3">
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[#3E667D] text-white">
                              Predeterminado
                            </span>
                          </div>
                        )}

                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          {!method.isDefault && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full sm:flex-1"
                              onClick={() => handleSetDefault(method.id)}
                            >
                              Hacer Predeterminado
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full sm:w-auto"
                            leftIcon={<PencilIcon className="h-4 w-4" />}
                            onClick={() => toast.info('Abriendo edición')}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full sm:w-auto text-red-600 hover:bg-red-50 hover:text-red-700"
                            leftIcon={<TrashIcon className="h-4 w-4" />}
                            onClick={() => handleDeleteMethod(method.id)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
                      <p className="text-sm text-gray-600">Aún no tienes métodos de pago configurados.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        leftIcon={<PlusIcon className="h-4 w-4" />}
                        onClick={() => setShowAddMethodModal(true)}
                      >
                        Agregar método
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pending Payments */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Pagos Programados</h3>
                <div className="space-y-3">
                  {mockPendingPayments.map((payment) => (
                    <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            ${payment.amount.toLocaleString('es-MX')}
                          </p>
                          <p className="text-sm text-gray-600">{payment.description}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          payment.type === 'commission' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {payment.type === 'commission' ? 'Comisión' : 'Bono'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <CalendarIcon className="h-3 w-3" />
                        Pago: {new Date(payment.paymentDate).toLocaleDateString('es-MX')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Withdrawal History */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Historial de Retiros</h2>
                  <SearchableSelect
                    options={[
                      { value: 'completed', label: 'Completados' },
                      { value: 'pending', label: 'Pendientes' },
                      { value: 'processing', label: 'Procesando' },
                      { value: 'failed', label: 'Fallidos' },
                    ]}
                    value={filterStatus}
                    onChange={setFilterStatus}
                    allLabel="Todos los estados"
                    allValue="all"
                    className="w-full sm:w-auto"
                  />
                </div>

                <div className="space-y-4">
                  {filteredWithdrawals.length > 0 ? filteredWithdrawals.map((withdrawal) => {
                    const status = statusConfig[withdrawal.status as keyof typeof statusConfig];
                    const StatusIcon = status.icon;

                    return (
                      <div key={withdrawal.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              withdrawal.status === 'completed' ? 'bg-green-100' :
                              withdrawal.status === 'pending' ? 'bg-yellow-100' :
                              withdrawal.status === 'processing' ? 'bg-blue-100' :
                              'bg-red-100'
                            }`}>
                              <StatusIcon className={`h-5 w-5 ${
                                withdrawal.status === 'completed' ? 'text-green-600' :
                                withdrawal.status === 'pending' ? 'text-yellow-600' :
                                withdrawal.status === 'processing' ? 'text-blue-600' :
                                'text-red-600'
                              }`} />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-lg">
                                ${withdrawal.amount.toLocaleString('es-MX')}
                              </p>
                              <p className="text-sm text-gray-600">{withdrawal.method}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Ref: {withdrawal.reference}
                              </p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t">
                          <div>
                            <p className="text-xs text-gray-500">Fecha de Solicitud</p>
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(withdrawal.date).toLocaleDateString('es-MX')}
                            </p>
                          </div>
                          {withdrawal.processedDate && (
                            <div>
                              <p className="text-xs text-gray-500">Fecha de Proceso</p>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(withdrawal.processedDate).toLocaleDateString('es-MX')}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto"
                            leftIcon={<DocumentTextIcon className="h-4 w-4" />}
                            onClick={() => toast.info('Descargando comprobante')}
                          >
                            Comprobante
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full sm:w-auto"
                            leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                            onClick={() => toast.success('Exportando detalles')}
                          >
                            Exportar
                          </Button>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                      <p className="text-sm text-gray-600">
                        No hay retiros para el filtro seleccionado.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tax Information */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Información Fiscal</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">RFC</p>
                    <p className="font-semibold text-gray-900">GAML850615XX0</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Régimen Fiscal</p>
                    <p className="font-semibold text-gray-900">Persona Física con Actividad Empresarial</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Retención ISR</p>
                    <p className="font-semibold text-gray-900">10%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Retención IVA</p>
                    <p className="font-semibold text-gray-900">16%</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => toast.info('Abriendo edición de información fiscal')}
                >
                  Actualizar Información Fiscal
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Withdrawal Request Modal */}
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <Card className="max-w-lg w-full rounded-t-2xl sm:rounded-xl max-h-[92vh] overflow-y-auto">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Solicitar Retiro</h2>
                  <button
                    onClick={() => setShowWithdrawModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-1">Saldo Disponible</p>
                  <p className="text-3xl font-bold text-[#3E667D]">
                    ${availableBalance.toLocaleString('es-MX')}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monto a Retirar
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Monto mínimo: $1,000 MXN
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Método de Pago
                    </label>
                    <SearchableSelect
                      options={paymentMethods.map((method) => ({
                        value: method.id,
                        label: method.type === 'bank' ? `${method.bank} ${method.accountNumber}` : `PayPal - ${method.email}`,
                      }))}
                      value={paymentMethods[0]?.id || ''}
                      onChange={() => {}}
                      showAllOption={false}
                      className="w-full"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      ℹ️ Los retiros se procesan en 2-3 días hábiles. Se aplicarán las retenciones fiscales correspondientes.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowWithdrawModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleRequestWithdrawal}
                  >
                    Solicitar Retiro
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Payment Method Modal */}
        {showAddMethodModal && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <Card className="max-w-lg w-full rounded-t-2xl sm:rounded-xl max-h-[92vh] overflow-y-auto">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Agregar Método de Pago</h2>
                  <button
                    onClick={() => setShowAddMethodModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Método
                    </label>
                    <SearchableSelect
                      options={[
                        { value: 'bank', label: 'Cuenta Bancaria' },
                        { value: 'paypal', label: 'PayPal' },
                      ]}
                      value="bank"
                      onChange={() => {}}
                      showAllOption={false}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Banco
                    </label>
                    <SearchableSelect
                      options={[
                        { value: 'BBVA Bancomer', label: 'BBVA Bancomer' },
                        { value: 'Santander', label: 'Santander' },
                        { value: 'Banorte', label: 'Banorte' },
                        { value: 'HSBC', label: 'HSBC' },
                        { value: 'Citibanamex', label: 'Citibanamex' },
                      ]}
                      value="BBVA Bancomer"
                      onChange={() => {}}
                      showAllOption={false}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CLABE Interbancaria
                    </label>
                    <input
                      type="text"
                      placeholder="18 dígitos"
                      maxLength={18}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titular de la Cuenta
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowAddMethodModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => {
                      toast.success('Método de pago agregado');
                      setShowAddMethodModal(false);
                    }}
                  >
                    Agregar Método
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
