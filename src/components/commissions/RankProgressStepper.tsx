// components/commissions/RankProgressStepper.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { MlmRank } from '@/types/commissions';
import { getRankImage } from '@/constants/ranks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckIcon, LockClosedIcon, StarIcon } from '@heroicons/react/24/solid';
import {
  TrophyIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BoltIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

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

// Las medallas de cada rango viven en src/constants/ranks.ts (RANK_IMAGES + getRankImage),
// que ya resuelve los alias de migración (sirius/diamante_sirius, azul/diamante_azul).

// Beneficios cualitativos por rango (qué ganas al alcanzarlo).
// NOTA: los números de niveles/generaciones de comisión NO se hardcodean aquí
// porque varían por rango y ya se muestran, con datos reales de la API, en la
// sección "Requisitos" (Hasta nivel {levelMax} / {generationMax} generaciones).
// Aquí solo van los beneficios cualitativos (claves i18n bajo
// distributor.commissions.rankStepper.benefits).
const rankBenefitKeys: Record<string, string[]> = {
  distribuidor: ['distribuidor1', 'distribuidor2'],
  bronce: ['bronce1', 'bronce2'],
  plata: ['plata1', 'plata2'],
  oro: ['oro1', 'oro2'],
  platino: ['platino1', 'platino2'],
  diamante: ['diamante1', 'diamante2'],
  doble_diamante: ['doble_diamante1', 'doble_diamante2'],
  triple_diamante: ['triple_diamante1', 'triple_diamante2'],
  sirius: ['sirius1', 'sirius2'],
  azul: ['azul1', 'azul2', 'azul3'],
};

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
  const t = useTranslations('distributor.commissions.rankStepper');
  const [selectedRank, setSelectedRank] = useState<MlmRank | null>(null);

  const handleRankClick = (rank: MlmRank) => {
    setSelectedRank((prev) => (prev?.id === rank.id ? null : rank));
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {t('title')}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrophyIcon className="h-5 w-5 text-yellow-500" />
            <span className="font-medium text-gray-700">
              <span className="text-[#3E667D] font-bold">{ranks.find((r) => r.rankNumber === currentRankNumber)?.name || 'Distribuidor'}</span>
            </span>
          </div>
        </div>

        {/* Stepper horizontal scrollable */}
        <div className="overflow-x-auto pt-4 pb-4 -mx-2 px-2">
          <div className="flex items-start min-w-max">
            {ranks.map((rank, index) => {
              const isCompleted = rank.rankNumber < currentRankNumber;
              const isCurrent = rank.rankNumber === currentRankNumber;
              const isLocked = rank.rankNumber > currentRankNumber;
              const isSelected = selectedRank?.id === rank.id;
              const colors = rankColors[rank.code] || defaultColor;
              const isLast = index === ranks.length - 1;
              const rankImg = getRankImage(rank.code);

              return (
                <div key={rank.id} className="flex items-start">
                  {/* Step */}
                  <Button
                    variant="ghost"
                    onClick={() => handleRankClick(rank)}
                    className="flex flex-col items-center group cursor-pointer h-auto gap-0 p-0 whitespace-normal hover:bg-transparent"
                    style={{ width: '96px' }}
                  >
                    {/* Circle / Rank image */}
                    <div className="relative">
                      {rankImg ? (
                        <div
                          className={`w-14 h-14 rounded-full overflow-hidden bg-white flex items-center justify-center transition-all group-hover:scale-110 ${
                            isCurrent
                              ? `shadow-lg ${colors.glow} ring-4 ring-offset-2 ring-current ${colors.text}`
                              : isCompleted
                                ? `shadow-md ${colors.glow}`
                                : ''
                          } ${isSelected ? 'ring-4 ring-offset-2 ring-[#3E667D]' : ''}`}
                        >
                          <Image
                            src={rankImg}
                            alt={rank.name}
                            width={56}
                            height={56}
                            className={`w-full h-full object-contain transition-all ${
                              isLocked ? 'grayscale opacity-40' : ''
                            }`}
                          />
                          {isLocked && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-gray-700/70 flex items-center justify-center">
                                <LockClosedIcon className="h-3 w-3 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center border-3 transition-all group-hover:scale-110 ${
                            isCompleted
                              ? `${colors.bg} border-transparent text-white shadow-lg ${colors.glow}`
                              : isCurrent
                                ? `${colors.bg} border-transparent text-white shadow-lg shadow-md ${colors.glow} ring-4 ring-offset-2 ring-current ${colors.text}`
                                : 'bg-gray-100 border-gray-200 text-gray-400 group-hover:bg-gray-200'
                          } ${isSelected ? 'ring-4 ring-offset-2 ring-[#3E667D]' : ''}`}
                        >
                          {isCompleted ? (
                            <CheckIcon className="h-5 w-5" />
                          ) : isCurrent ? (
                            <StarIcon className="h-5 w-5" />
                          ) : (
                            <LockClosedIcon className="h-4 w-4" />
                          )}
                        </div>
                      )}
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
                        isSelected ? 'text-[#3E667D]' : isCurrent ? colors.text : isCompleted ? 'text-gray-700' : 'text-gray-400'
                      }`}
                    >
                      {rank.name}
                    </p>

                    {/* Requirement hint */}
                    {rank.pointsGroupRequired > 0 && (
                      <p className={`mt-0.5 text-[10px] text-center ${isLocked ? 'text-gray-300' : 'text-gray-400'}`}>
                        {t('points', { points: formatPoints(rank.pointsGroupRequired) })}
                      </p>
                    )}
                  </Button>

                  {/* Connector line */}
                  {!isLast && (
                    <div className="flex items-center mt-6 -mx-1">
                      <div
                        className={`w-8 h-0.5 ${
                          rank.rankNumber < currentRankNumber
                            ? 'bg-[#C8DDF2]'
                            : rank.rankNumber === currentRankNumber
                              ? 'bg-gradient-to-r from-[#C8DDF2] to-gray-200'
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

        {/* Expand/collapse hint */}
        {!selectedRank && (
          <div className="text-center mt-2">
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
              <ChevronDownIcon className="h-3 w-3" />
              {t('selectHint')}
            </p>
          </div>
        )}

        {/* ── Selected rank detail panel ── */}
        {selectedRank && (() => {
          const isCompleted = selectedRank.rankNumber < currentRankNumber;
          const isCurrent = selectedRank.rankNumber === currentRankNumber;
          const isLocked = selectedRank.rankNumber > currentRankNumber;
          const colors = rankColors[selectedRank.code] || defaultColor;
          const benefitKeys = rankBenefitKeys[selectedRank.code] || [];
          const selRankImg = getRankImage(selectedRank.code);
          const autoBonus = currencyCode === 'USD'
            ? parseFloat(selectedRank.autoBonusUsd || '0')
            : parseFloat(selectedRank.autoBonusMxn || '0');

          return (
            <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
              {/* Header */}
              <div className={`px-5 py-3 flex items-center justify-between ${
                isCompleted ? 'bg-emerald-50' : isCurrent ? 'bg-[#C8DDF2]/30' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  {selRankImg ? (
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center">
                      <Image
                        src={selRankImg}
                        alt={selectedRank.name}
                        width={40}
                        height={40}
                        className={`w-full h-full object-contain ${isLocked ? 'grayscale opacity-50' : ''}`}
                      />
                    </div>
                  ) : (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${colors.bg}`}>
                      {isCompleted ? <CheckIcon className="h-4 w-4" /> : isCurrent ? <StarIcon className="h-4 w-4" /> : <LockClosedIcon className="h-3.5 w-3.5" />}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-gray-900">{selectedRank.name}</p>
                    <p className="text-xs text-gray-500">
                      {isCompleted ? t('rankAchieved') : isCurrent ? t('currentRank') : t('rankLocked')}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setSelectedRank(null)} className="hover:bg-gray-200 rounded-full">
                  <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                </Button>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Requisitos */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                      <BoltIcon className="h-4 w-4 text-amber-500" />
                      {isLocked ? t('requirementsToUnlock') : t('requirements')}
                    </h4>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-sm text-gray-600">{t('personalPoints')}</span>
                        <span className="font-bold text-gray-900">{formatPoints(selectedRank.pointsPersonalRequired)}</span>
                      </div>
                      {selectedRank.pointsGroupRequired > 0 && (
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-sm text-gray-600">{t('groupPoints')}</span>
                          <span className="font-bold text-gray-900">{formatPoints(selectedRank.pointsGroupRequired)}</span>
                        </div>
                      )}
                      {selectedRank.qualifiersFirstLevel > 0 && (
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <UserGroupIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{t('qualifiersFirstLevel')}</span>
                          </div>
                          <span className="font-bold text-gray-900">{selectedRank.qualifiersFirstLevel}</span>
                        </div>
                      )}
                      {selectedRank.levelMax && (
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-sm text-gray-600">{t('commissionLevels')}</span>
                          <span className="font-bold text-gray-900">{t('upToLevel', { level: selectedRank.levelMax })}</span>
                        </div>
                      )}
                      {selectedRank.generationMax && selectedRank.generationMax > 0 && (
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-sm text-gray-600">{t('generations')}</span>
                          <span className="font-bold text-gray-900">{t('generationsValue', { count: selectedRank.generationMax })}</span>
                        </div>
                      )}
                      {autoBonus > 0 && (
                        <div className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
                          <div className="flex items-center gap-1.5">
                            <CurrencyDollarIcon className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm font-medium text-emerald-700">{t('autoBonus')}</span>
                          </div>
                          <span className="font-bold text-emerald-700">
                            ${autoBonus.toLocaleString(currencyCode === 'USD' ? 'en-US' : 'es-MX')} {currencyCode}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Beneficios */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                      <SparklesIcon className="h-4 w-4 text-[#3E667D]" />
                      {t('benefitsTitle')}
                    </h4>
                    {benefitKeys.length > 0 ? (
                      <ul className="space-y-2">
                        {benefitKeys.map((benefitKey) => (
                          <li key={benefitKey} className="flex items-start gap-2">
                            <CheckIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                              isLocked ? 'text-gray-300' : 'text-emerald-500'
                            }`} />
                            <span className={`text-sm ${isLocked ? 'text-gray-400' : 'text-gray-700'}`}>
                              {t(`benefits.${benefitKey}`)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-400">{t('noInfo')}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
