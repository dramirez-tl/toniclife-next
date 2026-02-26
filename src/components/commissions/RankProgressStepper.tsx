// components/commissions/RankProgressStepper.tsx
'use client';

import { MlmRank } from '@/types/commissions';
import { Card, CardContent } from '@/components/ui/Card';
import { CheckIcon, LockClosedIcon, StarIcon } from '@heroicons/react/24/solid';
import { TrophyIcon } from '@heroicons/react/24/outline';

interface RankProgressStepperProps {
  ranks: MlmRank[];
  currentRankNumber: number;
  currencyCode?: string;
}

const rankColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  distribuidor: { bg: 'bg-gray-500', text: 'text-gray-600', border: 'border-gray-400', glow: '' },
  bronce: { bg: 'bg-amber-700', text: 'text-amber-700', border: 'border-amber-600', glow: '' },
  plata: { bg: 'bg-gray-400', text: 'text-gray-500', border: 'border-gray-400', glow: '' },
  oro: { bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-500', glow: 'shadow-yellow-300/40' },
  platino: { bg: 'bg-cyan-500', text: 'text-cyan-600', border: 'border-cyan-500', glow: 'shadow-cyan-300/40' },
  diamante: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-500', glow: 'shadow-blue-300/40' },
  doble_diamante: { bg: 'bg-violet-500', text: 'text-violet-600', border: 'border-violet-500', glow: 'shadow-violet-300/40' },
  triple_diamante: { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-500', glow: 'shadow-purple-300/40' },
  sirius: { bg: 'bg-rose-500', text: 'text-rose-600', border: 'border-rose-500', glow: 'shadow-rose-300/40' },
  azul: { bg: 'bg-sky-500', text: 'text-sky-600', border: 'border-sky-500', glow: 'shadow-sky-300/40' },
};

const defaultColor = { bg: 'bg-gray-400', text: 'text-gray-500', border: 'border-gray-300', glow: '' };

function formatPoints(pts: number): string {
  if (pts >= 1_000_000) return `${(pts / 1_000_000).toFixed(pts % 1_000_000 === 0 ? 0 : 1)}M`;
  if (pts >= 1_000) return `${(pts / 1_000).toFixed(pts % 1_000 === 0 ? 0 : 1)}K`;
  return pts.toString();
}

export function RankProgressStepper({
  ranks,
  currentRankNumber,
  currencyCode = 'MXN',
}: RankProgressStepperProps) {
  const nextRank = ranks.find((r) => r.rankNumber === currentRankNumber + 1);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Progresion de Rango
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Tu camino desde Distribuidor hasta Diamante Azul
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrophyIcon className="h-5 w-5 text-yellow-500" />
            <span className="font-medium text-gray-700">
              Rango actual: <span className="text-[#003B7A] font-bold">{ranks.find((r) => r.rankNumber === currentRankNumber)?.name || 'Distribuidor'}</span>
            </span>
          </div>
        </div>

        {/* Stepper horizontal scrollable */}
        <div className="overflow-x-auto pb-4 -mx-2 px-2">
          <div className="flex items-start min-w-max">
            {ranks.map((rank, index) => {
              const isCompleted = rank.rankNumber < currentRankNumber;
              const isCurrent = rank.rankNumber === currentRankNumber;
              const isLocked = rank.rankNumber > currentRankNumber;
              const colors = rankColors[rank.code] || defaultColor;
              const isLast = index === ranks.length - 1;

              return (
                <div key={rank.id} className="flex items-start">
                  {/* Step */}
                  <div className="flex flex-col items-center" style={{ width: '96px' }}>
                    {/* Circle */}
                    <div className="relative">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center border-3 transition-all ${
                          isCompleted
                            ? `${colors.bg} border-transparent text-white shadow-lg ${colors.glow}`
                            : isCurrent
                              ? `${colors.bg} border-transparent text-white shadow-lg shadow-md ${colors.glow} ring-4 ring-offset-2 ring-current ${colors.text}`
                              : 'bg-gray-100 border-gray-200 text-gray-400'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckIcon className="h-5 w-5" />
                        ) : isCurrent ? (
                          <StarIcon className="h-5 w-5" />
                        ) : (
                          <LockClosedIcon className="h-4 w-4" />
                        )}
                      </div>
                      {/* Rank number badge */}
                      <div
                        className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isCompleted || isCurrent
                            ? 'bg-white text-gray-700 shadow-sm border border-gray-200'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {rank.rankNumber}
                      </div>
                    </div>

                    {/* Label */}
                    <p
                      className={`mt-2 text-xs font-semibold text-center leading-tight ${
                        isCurrent ? colors.text : isCompleted ? 'text-gray-700' : 'text-gray-400'
                      }`}
                    >
                      {rank.name}
                    </p>

                    {/* Requirement hint */}
                    {rank.pointsGroupRequired > 0 && (
                      <p className={`mt-0.5 text-[10px] text-center ${isLocked ? 'text-gray-300' : 'text-gray-400'}`}>
                        {formatPoints(rank.pointsGroupRequired)} pts
                      </p>
                    )}
                  </div>

                  {/* Connector line */}
                  {!isLast && (
                    <div className="flex items-center mt-6 -mx-1">
                      <div
                        className={`w-8 h-0.5 ${
                          rank.rankNumber < currentRankNumber
                            ? 'bg-[#7AB82E]'
                            : rank.rankNumber === currentRankNumber
                              ? 'bg-gradient-to-r from-[#7AB82E] to-gray-200'
                              : 'bg-gray-200'
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Next rank requirements card */}
        {nextRank && (
          <div className="mt-6 p-4 bg-gradient-to-r from-[#003B7A]/5 to-[#7AB82E]/5 rounded-xl border border-[#003B7A]/10">
            <p className="text-sm font-semibold text-[#003B7A] mb-3">
              Siguiente rango: {nextRank.name}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Pts. Personales</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  {formatPoints(nextRank.pointsPersonalRequired)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Pts. Grupo</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  {formatPoints(nextRank.pointsGroupRequired)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Calificados 1er Niv.</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  {nextRank.qualifiersFirstLevel}
                </p>
              </div>
              {nextRank.autoBonusMxn && parseFloat(nextRank.autoBonusMxn) > 0 && (
                <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                    Bono Auto {currencyCode}
                  </p>
                  <p className="text-lg font-bold text-[#7AB82E] mt-0.5">
                    ${currencyCode === 'USD'
                      ? parseFloat(nextRank.autoBonusUsd || '0').toLocaleString('en-US')
                      : parseFloat(nextRank.autoBonusMxn).toLocaleString('es-MX')
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
