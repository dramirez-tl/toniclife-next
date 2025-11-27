'use client';

import { Card, Button } from '@/components/ui';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import type { QuizQuestion as QuizQuestionType } from '@/types';

interface QuizQuestionProps {
  question: QuizQuestionType;
  onAnswer: (questionId: number, optionId: string, value: number) => void;
  onPrevious: () => void;
  canGoPrevious: boolean;
  selectedAnswer?: string;
}

// Category to emoji mapping
const categoryEmojis: Record<string, string> = {
  energia: '⚡',
  digestion: '🍃',
  estres: '😌',
  peso: '⚖️',
  piel: '✨',
  inmune: '🛡️',
  'hormonal-female': '💗',
  'hormonal-male': '💪',
  circulacion: '🩸',
  metabolico: '🔄',
  'meta-principal': '🎯'
};

// Category to title mapping
const categoryTitles: Record<string, string> = {
  energia: 'Bienestar General',
  digestion: 'Digestión',
  estres: 'Estrés, Sueño y Estado Emocional',
  peso: 'Peso y Metabolismo',
  piel: 'Piel y Apariencia',
  inmune: 'Sistema Inmune',
  'hormonal-female': 'Hormonas y Estado Femenino',
  'hormonal-male': 'Salud Masculina',
  circulacion: 'Circulación y Articulaciones',
  metabolico: 'Hígado, Colesterol o Azúcar',
  'meta-principal': 'Meta Principal'
};

export function QuizQuestion({
  question,
  onAnswer,
  onPrevious,
  canGoPrevious,
  selectedAnswer
}: QuizQuestionProps) {
  const emoji = categoryEmojis[question.category] || '❓';
  const categoryTitle = categoryTitles[question.category] || question.category;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <Card className="max-w-2xl mx-auto overflow-hidden" padding="none">
        {/* Question Header */}
        <div className="bg-[#003B7A] text-white p-6 sm:p-8">
          {/* Category Badge */}
          <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-sm mb-4">
            <span>{emoji}</span>
            <span>{categoryTitle}</span>
          </div>

          {/* Question */}
          <h2 className="text-xl sm:text-2xl font-bold leading-relaxed">
            {question.question}
          </h2>
        </div>

        {/* Options */}
        <div className="p-6 sm:p-8 space-y-3">
          {question.options.map((option, index) => (
            <button
              key={option.id}
              onClick={() => onAnswer(question.id, option.id, option.value)}
              className={`
                w-full text-left p-4 sm:p-5 rounded-xl border-2 transition-all duration-200
                hover:border-[#7AB82E] hover:bg-[#7AB82E]/5
                ${selectedAnswer === option.id
                  ? 'border-[#7AB82E] bg-[#7AB82E]/10 ring-2 ring-[#7AB82E]/30'
                  : 'border-gray-200 bg-gray-50'
                }
              `}
            >
              <div className="flex items-start gap-4">
                {/* Option indicator */}
                <div className={`
                  w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold
                  ${selectedAnswer === option.id
                    ? 'bg-[#7AB82E] text-white'
                    : 'bg-[#003B7A]/10 text-[#003B7A]'
                  }
                `}>
                  {String.fromCharCode(65 + index)}
                </div>

                {/* Option text */}
                <span className={`
                  text-base sm:text-lg
                  ${selectedAnswer === option.id
                    ? 'text-[#003B7A] font-medium'
                    : 'text-gray-700'
                  }
                `}>
                  {option.text}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
          {canGoPrevious && (
            <button
              onClick={onPrevious}
              className="flex items-center gap-2 text-gray-500 hover:text-[#003B7A] transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5" />
              <span>Pregunta anterior</span>
            </button>
          )}
        </div>

        {/* Footer note */}
        <div className="bg-gray-50 px-6 sm:px-8 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Tu información no será compartida
          </p>
        </div>
      </Card>
    </div>
  );
}
