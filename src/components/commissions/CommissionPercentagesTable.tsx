// components/commissions/CommissionPercentagesTable.tsx
'use client';

import { useTranslations } from 'next-intl';
import { CommissionStructure } from '@/types/commissions';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/ui';
import {
  InformationCircleIcon,
  CheckIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

interface CommissionPercentagesTableProps {
  structure: CommissionStructure;
}

type LevelRow = CommissionStructure['levels'][number];
type GenerationRow = CommissionStructure['generations'][number];

export function CommissionPercentagesTable({
  structure,
}: CommissionPercentagesTableProps) {
  const t = useTranslations('distributor.commissions.percentages');
  const { levels, generations, userLevelMax = 2, userGenerationMax = 0, userQualifiedCount = 0, userRankName = 'Distribuidor' } = structure;

  const levelColumns: DataTableColumn<LevelRow>[] = [
    {
      key: 'nivel',
      header: t('levelHeader'),
      render: (row) => {
        const isUnlocked = row.levelNumber <= userLevelMax;
        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                isUnlocked
                  ? 'bg-[#3E667D] text-white'
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
                {row.levelNumber === 1 ? t('levelDirects') : t('levelDepth', { count: row.levelNumber })}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'basePercent',
      header: t('baseHeader'),
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (row) => {
        const isUnlocked = row.levelNumber <= userLevelMax;
        const basePercent = parseFloat(row.basePercentage) * 100;
        const upgradedPercent = parseFloat(row.upgradedPercentage || '0') * 100;
        const qualRequired = row.qualifiersRequired || 0;
        const hasIncreasedRate = qualRequired > 0 && userQualifiedCount >= qualRequired;
        return (
          <span
            className={`text-lg font-medium ${
              !hasIncreasedRate && isUnlocked
                ? 'text-[#3E667D] font-bold'
                : 'text-gray-400'
            }`}
          >
            {basePercent}%
          </span>
        );
      },
    },
    {
      key: 'upgradedPercent',
      header: t('upgradedHeader'),
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (row) => {
        const isUnlocked = row.levelNumber <= userLevelMax;
        const upgradedPercent = parseFloat(row.upgradedPercentage || '0') * 100;
        const qualRequired = row.qualifiersRequired || 0;
        const hasIncreasedRate = qualRequired > 0 && userQualifiedCount >= qualRequired;
        return upgradedPercent > 0 ? (
          <span
            className={`text-lg font-medium ${
              hasIncreasedRate && isUnlocked
                ? 'text-[#3E667D] font-bold'
                : 'text-gray-400'
            }`}
          >
            {upgradedPercent}%
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        );
      },
    },
    {
      key: 'qualRequired',
      header: t('qualRequiredHeader'),
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (row) => {
        const qualRequired = row.qualifiersRequired || 0;
        return (
          <div className="flex items-center justify-center gap-2">
            {qualRequired > 0 ? (
              <>
                <span className="text-gray-700">{qualRequired}+</span>
                {userQualifiedCount >= qualRequired && (
                  <CheckIcon className="h-4 w-4 text-green-500" />
                )}
              </>
            ) : (
              <span className="text-gray-300">—</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'estado',
      header: t('yourStatusHeader'),
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (row) => {
        const isUnlocked = row.levelNumber <= userLevelMax;
        const basePercent = parseFloat(row.basePercentage) * 100;
        const upgradedPercent = parseFloat(row.upgradedPercentage || '0') * 100;
        const qualRequired = row.qualifiersRequired || 0;
        const hasIncreasedRate = qualRequired > 0 && userQualifiedCount >= qualRequired;
        const currentRate = hasIncreasedRate && upgradedPercent > 0 ? upgradedPercent : basePercent;
        return isUnlocked ? (
          <div className="inline-flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                hasIncreasedRate
                  ? 'bg-[#C8DDF2]/10 text-[#3E667D]'
                  : 'bg-[#3E667D]/10 text-[#3E667D]'
              }`}
            >
              {currentRate}%
            </span>
            {hasIncreasedRate && (
              <span className="text-xs text-[#3E667D]">{t('upgraded')}</span>
            )}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 text-gray-400">
            <LockClosedIcon className="h-4 w-4" />
            <span className="text-sm">{t('locked')}</span>
          </div>
        );
      },
    },
  ];

  // Desbloqueo de generaciones INCLUSIVE (paridad legacy, jul-2026): el motor
  // paga los índices 0..generationMax inclusive (un Diamante con genMax=4 cobra
  // la fila gen=4 al 2%), así que la comparación es <=, no <.
  const generationColumns: DataTableColumn<GenerationRow>[] = [
    {
      key: 'generacion',
      header: t('generationHeader'),
      render: (gen) => {
        const isUnlocked = userGenerationMax > 0 && gen.generationNumber <= userGenerationMax;
        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                isUnlocked
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {gen.generationNumber + 1}
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {t('generationLabel', { n: gen.generationNumber + 1 })}
              </p>
              <p className="text-xs text-gray-500">
                {gen.generationNumber === 0
                  ? t('generationFirst')
                  : t('generationDepth', { n: gen.generationNumber + 1 })}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'porcentaje',
      header: t('percentageHeader'),
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (gen) => {
        const isUnlocked = userGenerationMax > 0 && gen.generationNumber <= userGenerationMax;
        const percent = parseFloat(gen.percentage) * 100;
        return (
          <span
            className={`text-lg font-bold ${
              isUnlocked ? 'text-yellow-600' : 'text-gray-400'
            }`}
          >
            {percent}%
          </span>
        );
      },
    },
    {
      key: 'estado',
      header: t('yourStatusHeader'),
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (gen) => {
        const isUnlocked = userGenerationMax > 0 && gen.generationNumber <= userGenerationMax;
        const percent = parseFloat(gen.percentage) * 100;
        return isUnlocked ? (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
            {percent}%
            <CheckIcon className="h-3.5 w-3.5" />
          </span>
        ) : (
          <div className="inline-flex items-center gap-2 text-gray-400">
            <LockClosedIcon className="h-4 w-4" />
            <span className="text-sm">{t('locked')}</span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Level Commissions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {t('levelCommissionsTitle')}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {t('levelCommissionsSubtitle')}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <InformationCircleIcon className="h-5 w-5" />
              <span>{t('rank', { rank: userRankName })}</span>
            </div>
          </div>

          <DataTable<LevelRow>
            columns={levelColumns}
            data={levels}
            getRowKey={(row) => String(row.levelNumber)}
            rowClassName={(row) =>
              `border-b border-gray-100 ${
                row.levelNumber <= userLevelMax ? '' : 'opacity-50'
              }`
            }
          />
        </CardContent>
      </Card>

      {/* Generation Commissions */}
      {generations.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {t('generationCommissionsTitle')}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {t('generationCommissionsSubtitle')}
                </p>
              </div>
              {userGenerationMax > 0 ? (
                <span className="text-xs font-medium bg-green-100 text-green-700 px-3 py-1 rounded-full">
                  {t('generationActive', { max: userGenerationMax })}
                </span>
              ) : (
                <span className="text-xs font-medium bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                  {t('generationRequiresSilver')}
                </span>
              )}
            </div>

            <DataTable<GenerationRow>
              columns={generationColumns}
              data={generations}
              getRowKey={(gen) => String(gen.generationNumber)}
              rowClassName={(gen) =>
                `border-b border-gray-100 ${
                  userGenerationMax > 0 && gen.generationNumber <= userGenerationMax
                    ? ''
                    : 'opacity-50'
                }`
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Info cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">{userLevelMax}</span>
            </div>
            <h4 className="font-medium text-blue-900">{t('yourMaxLevel')}</h4>
          </div>
          <p className="text-sm text-blue-700">
            {t('yourMaxLevelBody', { level: userLevelMax, rank: userRankName })}
          </p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckIcon className="h-4 w-4 text-green-600" />
            </div>
            <h4 className="font-medium text-green-900">{t('qualifiers')}</h4>
          </div>
          <p className="text-sm text-green-700">
            {t('qualifiersBody', { count: userQualifiedCount })}
          </p>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <InformationCircleIcon className="h-5 w-5 text-purple-600" />
            <h4 className="font-medium text-purple-900">{t('howToIncrease')}</h4>
          </div>
          <p className="text-sm text-purple-700">
            {t('howToIncreaseBody')}
          </p>
        </div>
      </div>
    </div>
  );
}
