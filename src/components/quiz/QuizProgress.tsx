'use client';

interface QuizProgressProps {
  current: number;
  total: number;
}

export function QuizProgress({ current, total }: QuizProgressProps) {
  const percentage = (current / total) * 100;

  return (
    <div className="mb-8">
      {/* Progress text */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">
          Pregunta {current} de {total}
        </span>
        <span className="text-sm font-medium text-[#3E667D]">
          {Math.round(percentage)}% completado
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#C8DDF2] to-[#3E667D] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between mt-2">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`
              w-2 h-2 rounded-full transition-all
              ${i < current
                ? 'bg-[#C8DDF2]'
                : i === current - 1
                ? 'bg-[#3E667D] scale-150'
                : 'bg-gray-300'
              }
            `}
          />
        ))}
      </div>
    </div>
  );
}
