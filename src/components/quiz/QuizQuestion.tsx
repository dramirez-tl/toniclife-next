'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, Button } from '@/components/ui';
import { ChevronLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import type { QuizQuestion as QuizQuestionType, QuestionType } from '@/types/quiz';

interface QuizQuestionProps {
  question: QuizQuestionType;
  onAnswer: (questionKey: string, answerValue: string, answerLabel?: string) => void;
  onMultipleAnswer?: (questionKey: string, answerValues: string[], answerLabels?: string[]) => void;
  onPrevious?: () => void;
  canGoPrevious?: boolean;
  selectedAnswer?: string | string[];
  isLoading?: boolean;
}

// Category to emoji mapping
const categoryEmojis: Record<string, string> = {
  health: '❤️',
  lifestyle: '🌿',
  goals: '🎯',
  energy: '⚡',
  energia: '⚡',
  digestion: '🍃',
  stress: '😌',
  estres: '😌',
  beauty: '✨',
  piel: '✨',
  immune: '🛡️',
  inmune: '🛡️',
  hormonal: '💗',
  'hormonal-female': '💗',
  'hormonal-male': '💪',
  circulacion: '🩸',
  peso: '⚖️',
  metabolico: '🔄',
  'meta-principal': '🎯',
};

// Category to title mapping
const categoryTitles: Record<string, string> = {
  health: 'Salud',
  lifestyle: 'Estilo de Vida',
  goals: 'Objetivos',
  energy: 'Energía',
  energia: 'Bienestar General',
  digestion: 'Digestión',
  stress: 'Estrés y Sueño',
  estres: 'Estrés, Sueño y Estado Emocional',
  beauty: 'Belleza',
  piel: 'Piel y Apariencia',
  immune: 'Sistema Inmune',
  inmune: 'Sistema Inmune',
  hormonal: 'Balance Hormonal',
  'hormonal-female': 'Hormonas y Estado Femenino',
  'hormonal-male': 'Salud Masculina',
  circulacion: 'Circulación y Articulaciones',
  peso: 'Peso y Metabolismo',
  metabolico: 'Hígado, Colesterol o Azúcar',
  'meta-principal': 'Meta Principal',
};

export function QuizQuestion({
  question,
  onAnswer,
  onMultipleAnswer,
  onPrevious,
  canGoPrevious = false,
  selectedAnswer,
  isLoading = false,
}: QuizQuestionProps) {
  const t = useTranslations('quiz.question');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const isMultiple = question.questionType === 'multiple';

  const emoji = categoryEmojis[question.category || ''] || '❓';
  const categoryTitle = categoryTitles[question.category || ''] || question.category || 'Pregunta';

  // Sync selected options with prop
  useEffect(() => {
    if (selectedAnswer) {
      setSelectedOptions(Array.isArray(selectedAnswer) ? selectedAnswer : [selectedAnswer]);
    } else {
      setSelectedOptions([]);
    }
  }, [selectedAnswer]);

  const handleOptionClick = (optionValue: string, optionLabel: string) => {
    if (isLoading) return;

    if (isMultiple) {
      // Toggle selection for multiple choice
      setSelectedOptions((prev) => {
        if (prev.includes(optionValue)) {
          return prev.filter((v) => v !== optionValue);
        }
        return [...prev, optionValue];
      });
    } else {
      // Single choice - submit immediately
      onAnswer(question.questionKey, optionValue, optionLabel);
    }
  };

  const handleSubmitMultiple = () => {
    if (selectedOptions.length === 0 || !onMultipleAnswer) return;

    const selectedLabels = question.options
      .filter((opt) => selectedOptions.includes(opt.value))
      .map((opt) => opt.label);

    onMultipleAnswer(question.questionKey, selectedOptions, selectedLabels);
  };

  const isOptionSelected = (optionValue: string) => {
    return selectedOptions.includes(optionValue);
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <Card className="max-w-2xl mx-auto overflow-hidden p-0 rounded-2xl border-gray-100 shadow-sm">
        {/* Question Header */}
        <div className="bg-gradient-to-br from-[#3E667D] to-[#2f5165] text-white p-6 sm:p-8">
          {/* Category Badge */}
          <div className="inline-flex items-center gap-2 bg-white/15 ring-1 ring-white/20 px-3 py-1 rounded-full text-sm mb-4">
            <span>{emoji}</span>
            <span>{categoryTitle}</span>
          </div>

          {/* Question */}
          <h2 className="text-xl sm:text-2xl font-bold leading-relaxed">
            {question.questionText}
          </h2>

          {/* Description */}
          {question.description && (
            <p className="mt-3 text-white/80 text-sm">{question.description}</p>
          )}

          {/* Multiple choice hint */}
          {isMultiple && (
            <p className="mt-3 text-white/60 text-sm italic">
              {t('multiSelectHint')}
            </p>
          )}
        </div>

        {/* Options */}
        <div className="p-6 sm:p-8 space-y-3">
          {question.options.map((option, index) => (
            <button
              key={option.id}
              onClick={() => handleOptionClick(option.value, option.label)}
              disabled={isLoading}
              className={`
                w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200
                hover:border-[#a7c1e2] hover:bg-[#C8DDF2]/5 hover:-translate-y-0.5 hover:shadow-sm
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isOptionSelected(option.value)
                  ? 'border-[#3E667D] bg-[#C8DDF2]/15 ring-2 ring-[#a7c1e2]/40 shadow-sm'
                  : 'border-gray-200 bg-white'
                }
              `}
            >
              <div className="flex items-start gap-4">
                {/* Option indicator */}
                <div
                  className={`
                    w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold
                    ${isOptionSelected(option.value)
                      ? 'bg-[#3E667D] text-white'
                      : 'bg-[#3E667D]/10 text-[#3E667D]'
                    }
                  `}
                >
                  {isMultiple && isOptionSelected(option.value) ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </div>

                {/* Option content */}
                <div className="flex-1">
                  <span
                    className={`
                      text-base sm:text-lg block
                      ${isOptionSelected(option.value)
                        ? 'text-[#3E667D] font-medium'
                        : 'text-gray-700'
                      }
                    `}
                  >
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="text-sm text-gray-500 mt-1 block">
                      {option.description}
                    </span>
                  )}
                </div>

                {/* Color indicator if present */}
                {option.colorHex && (
                  <div
                    className="w-6 h-6 rounded-full flex-shrink-0"
                    style={{ backgroundColor: option.colorHex }}
                  />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Submit button for multiple choice */}
        {isMultiple && (
          <div className="px-6 sm:px-8 pb-4">
            <Button
              onClick={handleSubmitMultiple}
              className="w-full"
              disabled={isLoading || selectedOptions.length === 0}
            >
              {isLoading
                ? t('saving')
                : t('continueCount', { count: selectedOptions.length })}
            </Button>
          </div>
        )}

        {/* Navigation */}
        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
          {canGoPrevious && onPrevious && (
            <button
              onClick={onPrevious}
              disabled={isLoading}
              className="flex items-center gap-2 text-gray-500 hover:text-[#3E667D] transition-colors disabled:opacity-50"
            >
              <ChevronLeftIcon className="h-5 w-5" />
              <span>{t('previousQuestion')}</span>
            </button>
          )}
        </div>

        {/* Footer note */}
        <div className="bg-gray-50 px-6 sm:px-8 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            {t('privacyNote')}
          </p>
        </div>
      </Card>
    </div>
  );
}
