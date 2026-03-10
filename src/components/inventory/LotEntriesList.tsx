'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { inventoryService } from '@/services/inventory.service';
import type { LotEntry, ProductLotDto } from '@/types/inventory';
import { LotStatus } from '@/types/inventory';

// ================================================================
// TYPES
// ================================================================

export type { LotEntry };

interface LotEntriesListProps {
  productId: string;
  branchId: string;
  lots: LotEntry[];
  maxQuantity?: number; // solo exit/transfer: stock total disponible del producto
  initialQuantity?: number; // cantidad del stepper al momento de agregar el primer lote
  onChange: (lots: LotEntry[]) => void;
  mode: 'entry' | 'exit' | 'transfer';
  disabled?: boolean;
}

// ================================================================
// HELPERS
// ================================================================

const STATUS_LABELS: Record<LotStatus, string> = {
  [LotStatus.AVAILABLE]: 'Disponible',
  [LotStatus.DEPLETED]: 'Agotado',
  [LotStatus.EXPIRED]: 'Caducado',
  [LotStatus.BLOCKED]: 'Bloqueado',
};

const STATUS_COLORS: Record<LotStatus, string> = {
  [LotStatus.AVAILABLE]: 'bg-green-100 text-green-700',
  [LotStatus.DEPLETED]: 'bg-gray-100 text-gray-500',
  [LotStatus.EXPIRED]: 'bg-red-100 text-red-600',
  [LotStatus.BLOCKED]: 'bg-amber-100 text-amber-700',
};

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function emptyLot(): LotEntry {
  return { lotNumber: '', expirationDate: '', quantity: 1 };
}

// ================================================================
// COMPONENT
// ================================================================

export function LotEntriesList({
  productId,
  branchId,
  lots,
  maxQuantity,
  initialQuantity,
  onChange,
  mode,
  disabled = false,
}: LotEntriesListProps) {
  const [availableLots, setAvailableLots] = useState<ProductLotDto[]>([]);
  const [loading, setLoading] = useState(false);
  // Track which rows are in "new lot" mode (text inputs) vs "select" mode
  const [newLotRows, setNewLotRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!productId || !branchId) return;
    setLoading(true);
    const statusFilter = mode !== 'entry' ? LotStatus.AVAILABLE : undefined;
    inventoryService
      .getLots(productId, branchId, statusFilter)
      .then(setAvailableLots)
      .catch(() => setAvailableLots([]))
      .finally(() => setLoading(false));
  }, [productId, branchId, mode]);

  // ── Helpers ──────────────────────────────────────────────────

  const updateLot = (index: number, patch: Partial<LotEntry>) => {
    const next = lots.map((l, i) => (i === index ? { ...l, ...patch } : l));
    onChange(next);
  };

  const removeLot = (index: number) => {
    onChange(lots.filter((_, i) => i !== index));
    setNewLotRows((prev) => {
      const s = new Set(prev);
      s.delete(index);
      // Re-index entries above the removed one
      const fixed = new Set<number>();
      s.forEach((n) => fixed.add(n > index ? n - 1 : n));
      return fixed;
    });
  };

  const addLot = () => {
    const isFirst = lots.length === 0;
    const qty = isFirst && initialQuantity !== undefined ? initialQuantity : 1;
    onChange([...lots, { lotNumber: '', expirationDate: '', quantity: qty }]);
  };

  const selectExistingLot = (index: number, lotId: string) => {
    const found = availableLots.find((l) => l.id === lotId);
    if (!found) return;
    updateLot(index, {
      lotId: found.id,
      lotNumber: found.lotNumber,
      expirationDate: found.expirationDate,
      availableQuantity: mode !== 'entry' ? found.quantity : undefined,
      quantity: 1,
    });
    setNewLotRows((prev) => {
      const s = new Set(prev);
      s.delete(index);
      return s;
    });
  };

  const toggleNewLotMode = (index: number, isNew: boolean) => {
    setNewLotRows((prev) => {
      const s = new Set(prev);
      if (isNew) s.add(index);
      else s.delete(index);
      return s;
    });
    if (isNew) {
      updateLot(index, { lotId: undefined, lotNumber: '', expirationDate: '', availableQuantity: undefined });
    }
  };

  const total = lots.reduce((sum, l) => sum + (l.quantity || 0), 0);

  // ── Render ───────────────────────────────────────────────────

  if (lots.length === 0 && !disabled) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={addLot}
          className="flex items-center gap-1.5 text-xs text-[#3E667D] hover:text-[#2f5165] font-medium transition-colors"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Agregar lote / caducidad
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lotes</p>

      {/* Table header */}
      {lots.length > 0 && (
        <div className="grid grid-cols-[1fr_140px_90px_32px] gap-2 items-center px-1">
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Lote</span>
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">CAD</span>
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide text-center">Cant.</span>
          <span />
        </div>
      )}

      {lots.map((lot, index) => {
        const isNewMode = newLotRows.has(index);
        const maxQty = mode !== 'entry' && lot.availableQuantity !== undefined
          ? lot.availableQuantity
          : undefined;

        return (
          <div
            key={index}
            className="grid grid-cols-[1fr_140px_90px_32px] gap-2 items-center"
          >
            {/* Lote column */}
            {isNewMode ? (
              <input
                type="text"
                placeholder="Núm. lote"
                value={lot.lotNumber}
                onChange={(e) => updateLot(index, { lotNumber: e.target.value, lotId: undefined })}
                disabled={disabled}
                className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3E667D]/50 focus:border-[#3E667D] disabled:bg-gray-50"
              />
            ) : (
              <div className="flex items-center gap-1">
                <select
                  value={lot.lotId || ''}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      toggleNewLotMode(index, true);
                    } else {
                      selectExistingLot(index, e.target.value);
                    }
                  }}
                  disabled={disabled || loading}
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3E667D]/50 focus:border-[#3E667D] bg-white disabled:bg-gray-50"
                >
                  <option value="">
                    {loading ? 'Cargando...' : '— Seleccionar —'}
                  </option>
                  {availableLots.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.lotNumber}
                      {l.expirationDate ? ` · ${formatDate(l.expirationDate)}` : ''}
                      {` · ${l.quantity} uds`}
                    </option>
                  ))}
                  <option value="__new__">+ Lote nuevo</option>
                </select>
                {lot.lotId && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLORS[LotStatus.AVAILABLE]}`}>
                    {STATUS_LABELS[LotStatus.AVAILABLE]}
                  </span>
                )}
              </div>
            )}

            {/* CAD column */}
            {isNewMode ? (
              <input
                type="date"
                value={lot.expirationDate}
                onChange={(e) => updateLot(index, { expirationDate: e.target.value })}
                disabled={disabled}
                className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3E667D]/50 focus:border-[#3E667D] disabled:bg-gray-50"
              />
            ) : (
              <span className="text-xs text-gray-600 px-2 truncate">
                {lot.expirationDate ? formatDate(lot.expirationDate) : (
                  <span className="text-gray-300">—</span>
                )}
              </span>
            )}

            {/* Cantidad column */}
            <input
              type="number"
              min={1}
              max={maxQty}
              value={lot.quantity}
              onChange={(e) => {
                let val = parseInt(e.target.value) || 1;
                if (maxQty !== undefined) val = Math.min(val, maxQty);
                updateLot(index, { quantity: Math.max(1, val) });
              }}
              disabled={disabled}
              className="w-full px-2 py-1.5 text-xs text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3E667D]/50 focus:border-[#3E667D] disabled:bg-gray-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />

            {/* Delete button */}
            <button
              type="button"
              onClick={() => removeLot(index)}
              disabled={disabled}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-30"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        {!disabled && (
          <button
            type="button"
            onClick={addLot}
            className="flex items-center gap-1.5 text-xs text-[#3E667D] hover:text-[#2f5165] font-medium transition-colors"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Agregar lote
          </button>
        )}
        {lots.length > 0 && (
          <span className="text-xs text-gray-400 ml-auto">
            Total: <span className="font-semibold text-gray-600">{total}</span> uds
          </span>
        )}
      </div>
    </div>
  );
}
