'use client';

import { useTranslations } from 'next-intl';

interface QuizProgressProps {
  current: number;
  total: number;
}

export function QuizProgress({ current, total }: QuizProgressProps) {
  const t = useTranslations('quiz.progress');
  const percentage = (current / total) * 100;

  return (
    <div className="mb-8 max-w-2xl mx-auto">
      {/* Progress text */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-[#3E667D]">
          {t('questionOf', { current, total })}
        </span>
        <span className="text-sm font-medium text-gray-500">
          {t('percentComplete', { percent: Math.round(percentage) })}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 bg-[#C8DDF2]/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#a7c1e2] to-[#3E667D] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.max(4, percentage)}%` }}
        />
      </div>

      {/* Step indicators — en móvil con muchas preguntas se ocultan (la barra ya
          comunica el avance); en sm+ dan el detalle paso a paso */}
      <div
        className={`${total > 8 ? 'hidden sm:flex' : 'flex'} justify-between mt-2.5`}
        aria-hidden="true"
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`
              h-2 w-2 rounded-full transition-all duration-300
              ${i < current - 1
                ? 'bg-[#a7c1e2]'
                : i === current - 1
                ? 'bg-[#3E667D] scale-150 ring-2 ring-[#a7c1e2]/40'
                : 'bg-gray-200'
              }
            `}
          />
        ))}
      </div>
    </div>
  );
}
