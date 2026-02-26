// components/commissions/CommissionChart.tsx
'use client';

import { useMemo } from 'react';
import { MonthlyCommissionTrend } from '@/types/commissions';

interface CommissionChartProps {
  data: MonthlyCommissionTrend[];
  height?: number;
  showLegend?: boolean;
}

const COLORS = {
  mlm: '#3E667D',
  cedea: '#C8DDF2',
  autoBonus: '#F59E0B',
  adjustment: '#8B5CF6',
};

export function CommissionChart({
  data,
  height = 300,
  showLegend = true,
}: CommissionChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const maxTotal = Math.max(...data.map(d => d.total));
    const barWidth = 100 / data.length;

    return {
      maxTotal,
      barWidth,
      items: data.map((item, index) => ({
        ...item,
        x: index * barWidth + barWidth / 2,
        mlmHeight: (item.mlm / maxTotal) * 100,
        cedeaHeight: (item.cedea / maxTotal) * 100,
        autoBonusHeight: (item.autoBonus / maxTotal) * 100,
        adjustmentHeight: (item.adjustment / maxTotal) * 100,
      })),
    };
  }, [data]);

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No hay datos disponibles
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Chart */}
      <div className="relative" style={{ height }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={100 - y}
              x2="100"
              y2={100 - y}
              stroke="#E5E7EB"
              strokeWidth="0.2"
              strokeDasharray="1,1"
            />
          ))}

          {/* Stacked bars */}
          {chartData.items.map((item, index) => {
            const barWidthPx = chartData.barWidth * 0.6;
            const x = item.x - barWidthPx / 2;
            let currentY = 100;

            const segments = [
              { height: item.adjustmentHeight, color: COLORS.adjustment, key: 'adjustment' },
              { height: item.autoBonusHeight, color: COLORS.autoBonus, key: 'autoBonus' },
              { height: item.cedeaHeight, color: COLORS.cedea, key: 'cedea' },
              { height: item.mlmHeight, color: COLORS.mlm, key: 'mlm' },
            ];

            return (
              <g key={index}>
                {segments.map((segment) => {
                  if (segment.height === 0) return null;
                  const segmentY = currentY - segment.height;
                  currentY = segmentY;
                  return (
                    <rect
                      key={segment.key}
                      x={x}
                      y={segmentY}
                      width={barWidthPx}
                      height={segment.height}
                      fill={segment.color}
                      rx="0.5"
                      className="transition-all duration-300 hover:opacity-80"
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 -translate-x-8">
          <span>${(chartData.maxTotal / 1000).toFixed(0)}k</span>
          <span>${((chartData.maxTotal * 0.75) / 1000).toFixed(0)}k</span>
          <span>${((chartData.maxTotal * 0.5) / 1000).toFixed(0)}k</span>
          <span>${((chartData.maxTotal * 0.25) / 1000).toFixed(0)}k</span>
          <span>$0</span>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-around mt-2 text-xs text-gray-600">
        {chartData.items.map((item, index) => (
          <span key={index} className="text-center">
            {item.month}
          </span>
        ))}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: COLORS.mlm }}
            />
            <span className="text-xs text-gray-600">MLM</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: COLORS.cedea }}
            />
            <span className="text-xs text-gray-600">CEDEA</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: COLORS.autoBonus }}
            />
            <span className="text-xs text-gray-600">Auto Bono</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: COLORS.adjustment }}
            />
            <span className="text-xs text-gray-600">Ajustes</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Mini chart for dashboard cards
export function CommissionMiniChart({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - (value / max) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-full h-12">
      <polyline
        points={points}
        fill="none"
        stroke="#C8DDF2"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={`0,100 ${points} 100,100`}
        fill="url(#gradient)"
        opacity="0.2"
      />
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#C8DDF2" />
          <stop offset="100%" stopColor="#C8DDF2" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
