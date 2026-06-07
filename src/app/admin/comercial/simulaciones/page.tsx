'use client';

import { Suspense, useState } from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useRunRankProjection } from '@/hooks/useSimulaciones';
import type {
  RankCode,
  RankProjectionResponse,
} from '@/types/simulacion';
import { SimulationForm } from './components/SimulationForm';
import { SimulationReport } from './components/SimulationReport';

export default function SimulacionesPage() {
  return (
    <Suspense fallback={<SimulacionesSkeleton />}>
      <SimulacionesContent />
    </Suspense>
  );
}

function SimulacionesContent() {
  const [report, setReport] = useState<RankProjectionResponse | null>(null);
  const runProjection = useRunRankProjection();

  const handleSubmit = async (legacyId: number, targetRankCode: RankCode) => {
    try {
      const data = await runProjection.mutateAsync({ legacyId, targetRankCode });
      setReport(data);
      toast.success(
        `Simulación generada para ${data.distributor.fullName} (#${data.distributor.legacyId})`,
      );
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(
        error?.response?.data?.message ?? 'No se pudo generar la simulación',
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white print:hidden">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <ChartBarIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">
              Simulaciones de Rango
            </h1>
          </div>
          <p className="text-base text-white/80 sm:text-lg">
            Genera reportes de proyección de comisiones para distribuidores
            con datos reales de la red.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 print:hidden">
        <Card>
          <CardContent className="p-0">
            <SimulationForm
              isLoading={runProjection.isPending}
              onSubmit={handleSubmit}
            />
          </CardContent>
        </Card>
      </div>

      {/* Report */}
      {report && (
        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <SimulationReport report={report} />
        </div>
      )}
    </div>
  );
}

function SimulacionesSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] h-40" />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-32 bg-white rounded-2xl shadow-lg animate-pulse" />
      </div>
    </div>
  );
}
