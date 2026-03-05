// components/pos/SessionManager.tsx - Open/Close session component
'use client';

import { useState } from 'react';
import {
  PlayIcon,
  StopIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { useActiveSession, useAvailableRegisters, useOpenSession, useCloseSession } from '@/hooks/usePos';
import type { CashRegister } from '@/types/pos';
import { toast } from 'sonner';

interface SessionManagerProps {
  branchId?: string;
  currencyId?: string;
  currencySymbol?: string;
  currencyCode?: string;
  readOnly?: boolean;
  onSessionChange?: () => void;
}

export function SessionManager({
  branchId,
  currencyId,
  currencySymbol = '$',
  currencyCode = 'MXN',
  readOnly = false,
  onSessionChange,
}: SessionManagerProps) {
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showAmounts, setShowAmounts] = useState(true);
  const [selectedRegister, setSelectedRegister] = useState<CashRegister | null>(null);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const { data: activeSession, isLoading: loadingSession, refetch } = useActiveSession(branchId);
  const { data: availableRegisters, isLoading: loadingRegisters } = useAvailableRegisters(branchId);
  const openSession = useOpenSession();
  const closeSession = useCloseSession();

  const hidden = '••••••';
  const fmt = (amount: number) =>
    showAmounts
      ? `${currencySymbol}${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : hidden;

  const handleOpenSession = async () => {
    if (!selectedRegister || !openingAmount) return;

    try {
      await openSession.mutateAsync({
        cashRegisterId: selectedRegister.id,
        openingAmount: parseFloat(openingAmount),
        currencyId: currencyId || undefined,
      });
      toast.success('Sesión abierta exitosamente');
      setShowOpenModal(false);
      setOpeningAmount('');
      setSelectedRegister(null);
      refetch();
      onSessionChange?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al abrir sesión');
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession?.session || !closingAmount) return;

    try {
      await closeSession.mutateAsync({
        sessionId: activeSession.session.id,
        data: {
          actualClosingAmount: parseFloat(closingAmount),
          closingNotes: closingNotes || undefined,
        },
      });
      toast.success('Sesión cerrada exitosamente');
      setShowCloseModal(false);
      setClosingAmount('');
      setClosingNotes('');
      refetch();
      onSessionChange?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al cerrar sesión');
    }
  };

  if (loadingSession) {
    return (
      <div className="p-4 bg-gray-100 rounded-xl animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  // Active Session View
  if (activeSession?.session) {
    const session = activeSession.session;
    const expectedBalance =
      session.openingAmount +
      session.summary.totalSales -
      session.summary.totalRefunds +
      session.summary.totalDeposits -
      session.summary.totalWithdrawals;

    return (
      <>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-bold text-green-800">Sesión Activa</span>
                {session.currencyCode && (
                  <span className="px-2 py-0.5 bg-green-200 text-green-800 text-xs font-semibold rounded-full">
                    {session.currencyCode}
                  </span>
                )}
              </div>
              <p className="text-sm text-green-700 mt-1">
                {activeSession.cashRegister.name} • {activeSession.cashRegister.branchName}
              </p>
              {session.openedByName && (
                <p className="text-xs text-green-600 mt-0.5">
                  Abierta por: {session.openedByName}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAmounts(!showAmounts)}
                className="p-2 text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                title={showAmounts ? 'Ocultar montos' : 'Mostrar montos'}
              >
                {showAmounts ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            {!readOnly && (
            <button
              onClick={() => setShowCloseModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <StopIcon className="h-5 w-5" />
              Cerrar Caja
            </button>
            )}
            </div>
          </div>

          {/* Session Summary */}
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-green-200">
            <div>
              <p className="text-xs text-green-600">Apertura</p>
              <p className="font-bold text-green-800">{fmt(session.openingAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-green-600">Ventas</p>
              <p className="font-bold text-green-800">{fmt(session.summary.totalSales)}</p>
            </div>
            <div>
              <p className="text-xs text-green-600">Esperado</p>
              <p className="font-bold text-green-800">{fmt(expectedBalance)}</p>
            </div>
            <div>
              <p className="text-xs text-green-600"># Ventas</p>
              <p className="font-bold text-green-800">{session.summary.salesCount}</p>
            </div>
          </div>
        </div>

        {/* Close Session Modal */}
        {showCloseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Cerrar Sesión de Caja</h3>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-yellow-800">Balance esperado</p>
                    <p className="text-2xl font-bold text-yellow-900">{fmt(expectedBalance)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto contado en caja *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      value={closingAmount}
                      onChange={(e) => setClosingAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2]"
                    />
                  </div>
                  {closingAmount && parseFloat(closingAmount) !== expectedBalance && (
                    <p
                      className={`text-sm mt-1 ${
                        parseFloat(closingAmount) > expectedBalance
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      Diferencia: {fmt(parseFloat(closingAmount) - expectedBalance)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas de cierre (opcional)
                  </label>
                  <textarea
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="Observaciones del cierre..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2]"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCloseSession}
                  disabled={!closingAmount || closeSession.isPending}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  {closeSession.isPending ? 'Cerrando...' : 'Cerrar Caja'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // No Active Session View
  return (
    <>
      <div className="bg-gray-100 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-700">Sin sesión activa</p>
            <p className="text-sm text-gray-500">Abre una caja para comenzar a vender</p>
          </div>
          {!readOnly && (
          <button
            onClick={() => setShowOpenModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#3E667D] text-white rounded-lg hover:bg-[#6aa526] transition-colors"
          >
            <PlayIcon className="h-5 w-5" />
            Abrir Caja
          </button>
          )}
        </div>
      </div>

      {/* Open Session Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Abrir Sesión de Caja</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Caja *
                </label>
                {loadingRegisters ? (
                  <div className="animate-pulse h-12 bg-gray-100 rounded-lg"></div>
                ) : availableRegisters && availableRegisters.length > 0 ? (
                  <div className="space-y-2">
                    {availableRegisters.map((register) => {
                      const isOpen = register.status === 'open';
                      return (
                        <button
                          key={register.id}
                          onClick={() => !isOpen && setSelectedRegister(register)}
                          disabled={isOpen}
                          className={`w-full flex items-center gap-3 p-3 border-2 rounded-lg transition-all ${
                            isOpen
                              ? 'border-yellow-300 bg-yellow-50 cursor-not-allowed'
                              : selectedRegister?.id === register.id
                                ? 'border-[#a7c1e2] bg-[#C8DDF2]/10'
                                : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <BanknotesIcon
                            className={`h-6 w-6 ${
                              isOpen
                                ? 'text-yellow-500'
                                : selectedRegister?.id === register.id
                                  ? 'text-[#3E667D]'
                                  : 'text-gray-400'
                            }`}
                          />
                          <div className="text-left flex-1">
                            <p className="font-medium">{register.name}</p>
                            <p className="text-xs text-gray-500">{register.branchName}</p>
                          </div>
                          {isOpen && (
                            <span className="text-xs font-medium text-yellow-700 bg-yellow-200 px-2 py-0.5 rounded-full">
                              En uso
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm">
                    <p className="text-gray-500">No hay cajas disponibles en esta sucursal</p>
                    <p className="text-yellow-600 mt-1">Si ya hay una caja abierta, cierra este modal y espera a que se detecte la sesión activa.</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto inicial en caja *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2]"
                  />
                </div>
              </div>

              {/* Currency info */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="px-2 py-0.5 bg-gray-100 border rounded text-xs font-semibold">
                  {currencyCode} {currencySymbol}
                </span>
                <span>Moneda de la sucursal</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowOpenModal(false);
                  setSelectedRegister(null);
                  setOpeningAmount('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleOpenSession}
                disabled={!selectedRegister || !openingAmount || openSession.isPending}
                className="flex-1 px-4 py-2 bg-[#3E667D] text-white rounded-lg hover:bg-[#2d4f63] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                {openSession.isPending ? 'Abriendo...' : 'Abrir Caja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
