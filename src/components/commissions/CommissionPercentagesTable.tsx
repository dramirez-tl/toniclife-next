// components/commissions/CommissionPercentagesTable.tsx
'use client';

import { CommissionPercentage } from '@/types/commissions';
import { Card, CardContent } from '@/components/ui/Card';
import {
  InformationCircleIcon,
  CheckIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

interface CommissionPercentagesTableProps {
  percentages: CommissionPercentage[];
  currentQualified?: number; // Numero de calificados actuales del usuario
  currentLevel?: number; // Nivel maximo actual del usuario
}

export function CommissionPercentagesTable({
  percentages,
  currentQualified = 3,
  currentLevel = 5,
}: CommissionPercentagesTableProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Estructura de Comisiones por Nivel
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Los porcentajes aumentan al tener mas distribuidores calificados en tu primer nivel
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <InformationCircleIcon className="h-5 w-5" />
            <span>Basado en tu rango actual</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Nivel
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                  % Base
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                  % Aumentado
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                  Calificados Requeridos
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                  Tu Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {percentages.map((row) => {
                const isUnlocked = row.levelNumber <= currentLevel;
                const basePercent = parseFloat(row.basePercentage);
                const upgradedPercent = parseFloat(row.upgradedPercentage || '0');
                const qualRequired = row.qualifiersRequired || 0;
                const hasIncreasedRate = currentQualified >= qualRequired;
                const currentRate = hasIncreasedRate ? upgradedPercent : basePercent;

                return (
                  <tr
                    key={row.levelNumber}
                    className={`border-b border-gray-100 ${
                      !isUnlocked ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            isUnlocked
                              ? 'bg-[#003B7A] text-white'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {row.levelNumber}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {row.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {row.levelNumber === 1 ? 'Directos' : `${row.levelNumber} niveles de profundidad`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`text-lg font-medium ${
                          !hasIncreasedRate && isUnlocked
                            ? 'text-[#003B7A] font-bold'
                            : 'text-gray-400'
                        }`}
                      >
                        {basePercent}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`text-lg font-medium ${
                          hasIncreasedRate && isUnlocked
                            ? 'text-[#7AB82E] font-bold'
                            : 'text-gray-400'
                        }`}
                      >
                        {upgradedPercent}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-gray-700">
                          {qualRequired === 0 ? '-' : `${qualRequired}+`}
                        </span>
                        {qualRequired > 0 && currentQualified >= qualRequired && (
                          <CheckIcon className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {isUnlocked ? (
                        <div className="inline-flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              hasIncreasedRate
                                ? 'bg-[#7AB82E]/10 text-[#7AB82E]'
                                : 'bg-[#003B7A]/10 text-[#003B7A]'
                            }`}
                          >
                            {currentRate}%
                          </span>
                          {hasIncreasedRate && (
                            <span className="text-xs text-[#7AB82E]">Aumentado</span>
                          )}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 text-gray-400">
                          <LockClosedIcon className="h-4 w-4" />
                          <span className="text-sm">Bloqueado</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Info cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">1</span>
              </div>
              <h4 className="font-medium text-blue-900">Tu Nivel Actual</h4>
            </div>
            <p className="text-sm text-blue-700">
              Cobras hasta el nivel {currentLevel} basado en tu rango
            </p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckIcon className="h-4 w-4 text-green-600" />
              </div>
              <h4 className="font-medium text-green-900">Calificados</h4>
            </div>
            <p className="text-sm text-green-700">
              Tienes {currentQualified} distribuidores calificados
            </p>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <InformationCircleIcon className="h-5 w-5 text-purple-600" />
              <h4 className="font-medium text-purple-900">Como Aumentar</h4>
            </div>
            <p className="text-sm text-purple-700">
              Ayuda a mas distribuidores a calificar (3,300+ pts)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
