// components/pos/SessionManager.tsx - Open/Close session component
'use client';

import { useState } from 'react';
import {
  PlayIcon,
  StopIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { useActiveSession, useAvailableRegisters, useOpenSession, useCloseSession } from '@/hooks/usePos';
import type { CashRegister } from '@/types/pos';
import { posService } from '@/services/pos.service';
import { toast } from 'sonner';

interface SessionManagerProps {
  branchId?: string;
  onSessionChange?: () => void;
}

export function SessionManager({ branchId, onSessionChange }: SessionManagerProps) {
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState<CashRegister | null>(null);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const { data: activeSession, isLoading: loadingSession, refetch } = useActiveSession();
  const { data: availableRegisters, isLoading: loadingRegisters } = useAvailableRegisters(branchId);
  const openSession = useOpenSession();
  const closeSession = useCloseSession();

  const handleOpenSession = async () => {
    if (!selectedRegister || !openingAmount) return;

    try {
      await openSession.mutateAsync({
        cashRegisterId: selectedRegister.id,
        openingAmount: parseFloat(openingAmount),
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
              </div>
              <p className="text-sm text-green-700 mt-1">
                {activeSession.cashRegister.name} • {activeSession.cashRegister.branchName}
              </p>
            </div>
            <button
              onClick={() => setShowCloseModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <StopIcon className="h-5 w-5" />
              Cerrar Caja
            </button>
          </div>

          {/* Session Summary */}
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-green-200">
            <div>
              <p className="text-xs text-green-600">Apertura</p>
              <p className="font-bold text-green-800">
                {posService.formatCurrency(session.openingAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-green-600">Ventas</p>
              <p className="font-bold text-green-800">
                {posService.formatCurrency(session.summary.totalSales)}
              </p>
            </div>
            <div>
              <p className="text-xs text-green-600">Esperado</p>
              <p className="font-bold text-green-800">
                {posService.formatCurrency(expectedBalance)}
              </p>
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
                    <p className="text-2xl font-bold text-yellow-900">
                      {posService.formatCurrency(expectedBalance)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto contado en caja *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={closingAmount}
                      onChange={(e) => setClosingAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E]"
                    />
                  </div>
                  {closingAmount && parseFloat(closingAmount) !== expectedBalance && (
                    <p className={`text-sm mt-1 ${
                      parseFloat(closingAmount) > expectedBalance ? 'text-green-600' : 'text-red-600'
                    }`}>
                      Diferencia: {posService.formatCurrency(parseFloat(closingAmount) - expectedBalance)}
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E]"
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
          <button
            onClick={() => setShowOpenModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#7AB82E] text-white rounded-lg hover:bg-[#6aa526] transition-colors"
          >
            <PlayIcon className="h-5 w-5" />
            Abrir Caja
          </button>
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
                    {availableRegisters.map((register) => (
                      <button
                        key={register.id}
                        onClick={() => setSelectedRegister(register)}
                        className={`w-full flex items-center gap-3 p-3 border-2 rounded-lg transition-all ${
                          selectedRegister?.id === register.id
                            ? 'border-[#7AB82E] bg-[#7AB82E]/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <BanknotesIcon className={`h-6 w-6 ${
                          selectedRegister?.id === register.id ? 'text-[#7AB82E]' : 'text-gray-400'
                        }`} />
                        <div className="text-left">
                          <p className="font-medium">{register.name}</p>
                          <p className="text-xs text-gray-500">{register.branchName}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No hay cajas disponibles</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto inicial en caja *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E]"
                  />
                </div>
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
                className="flex-1 px-4 py-2 bg-[#7AB82E] text-white rounded-lg hover:bg-[#6aa526] disabled:opacity-50"
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
