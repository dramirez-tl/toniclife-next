'use client';

import { FormEvent, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSimulationRanks } from '@/hooks/useSimulaciones';
import type { RankCode } from '@/types/simulacion';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SimulationFormProps {
  isLoading: boolean;
  onSubmit: (legacyId: number, targetRankCode: RankCode) => void;
}

export function SimulationForm({ isLoading, onSubmit }: SimulationFormProps) {
  const { data: ranks, isLoading: ranksLoading } = useSimulationRanks();
  const [legacyIdRaw, setLegacyIdRaw] = useState('');
  const [targetRank, setTargetRank] = useState<RankCode>('plata');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const legacyId = Number(legacyIdRaw);
    if (!Number.isFinite(legacyId) || legacyId < 1) return;
    onSubmit(legacyId, targetRank);
  };

  // Solo permitimos rangos a partir de Bronce como objetivo (Distribuidor no
  // tiene sentido como meta; Bronce y arriba sí).
  const targetableRanks =
    ranks?.filter((r) => r.rankNumber >= 2) ?? [];

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto]">
        <div>
          <label
            htmlFor="legacyId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Número de distribuidor
          </label>
          <input
            id="legacyId"
            type="number"
            inputMode="numeric"
            min={1}
            value={legacyIdRaw}
            onChange={(e) => setLegacyIdRaw(e.target.value)}
            placeholder="Ej: 1871"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-base focus:border-[#3E667D] focus:ring-2 focus:ring-[#3E667D] focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="targetRank"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Rango objetivo
          </label>
          <select
            id="targetRank"
            value={targetRank}
            onChange={(e) => setTargetRank(e.target.value as RankCode)}
            disabled={ranksLoading}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-base focus:border-[#3E667D] focus:ring-2 focus:ring-[#3E667D] focus:outline-none"
          >
            {targetableRanks.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <Button
            type="submit"
            disabled={isLoading || (isLoading || !legacyIdRaw)}
            className="w-full"
          >
            {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            <MagnifyingGlassIcon className="h-5 w-5" />
            Generar simulación
          </Button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        La simulación toma los datos del periodo cerrado más reciente y aplica
        las reglas oficiales del plan de compensaciones.
      </p>
    </form>
  );
}
