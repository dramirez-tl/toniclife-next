'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, Input } from '@/components/ui';
import { SparklesIcon, ClockIcon, ShieldCheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { Venus, Mars } from 'lucide-react';
import { QuizGender, QuizSource } from '@/types/quiz';
import type { StartQuizInput } from '@/types/quiz';

interface QuizWelcomeProps {
  onStart: (data: StartQuizInput, gender: QuizGender) => void;
  onResume?: () => void;
  hasStoredSession?: boolean;
  isLoading?: boolean;
  referralCode?: string;
}

export function QuizWelcome({
  onStart,
  onResume,
  hasStoredSession,
  isLoading,
  referralCode
}: QuizWelcomeProps) {
  const t = useTranslations('quiz.welcome');
  const [step, setStep] = useState<'intro' | 'gender'>('intro');
  const [selectedGender, setSelectedGender] = useState<QuizGender | ''>('');
  const [error, setError] = useState('');

  const handleSelectGender = (gender: QuizGender) => {
    setSelectedGender(gender);
    setError('');
  };

  const handleStartQuiz = () => {
    if (!selectedGender) {
      setError(t('genderError'));
      return;
    }

    const startData: StartQuizInput = {
      referralCode: referralCode || undefined,
      source: referralCode ? QuizSource.REFERRAL_LINK : QuizSource.DIRECT,
    };

    onStart(startData, selectedGender as QuizGender);
  };

  if (step === 'intro') {
    return (
      <div className="text-center">
        {/* Title (el logo ya lo muestra el Header; no se duplica aquí) */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#3E667D] leading-tight">
          <span className="font-serif italic">{t('titleLine1')}</span>
          <br />
          <span className="text-[#3E667D]">{t('titleLine2')}</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
          {t.rich('subtitle', {
            b: (chunks) => (
              <strong className="text-[#3E667D]">{chunks}</strong>
            ),
          })}
        </p>

        {/* Features (chips) */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-100">
            <ClockIcon className="h-4 w-4 text-[#3E667D]" />
            {t('feat2min')}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-100">
            <SparklesIcon className="h-4 w-4 text-[#3E667D]" />
            {t('feat10q')}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-100">
            <ShieldCheckIcon className="h-4 w-4 text-[#3E667D]" />
            {t('featPersonalized')}
          </span>
        </div>

        {/* CTA Buttons */}
        <div className="mt-12 space-y-4">
          <Button
            size="xl"
            onClick={() => setStep('gender')}
            className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            {t('startNow')}
          </Button>

          {hasStoredSession && onResume && (
            <div>
              <button
                onClick={onResume}
                disabled={isLoading}
                className="inline-flex items-center gap-2 text-[#3E667D] hover:text-[#3E667D] transition-colors"
              >
                <ArrowPathIcon className="h-5 w-5" />
                <span>{t('resumePrevious')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Referral Badge */}
        {referralCode && (
          <div className="mt-6 inline-flex items-center gap-2 bg-[#C8DDF2]/10 text-[#3E667D] px-4 py-2 rounded-full text-sm">
            <SparklesIcon className="h-4 w-4" />
            <span>{t('referredBy', { code: referralCode })}</span>
          </div>
        )}

        {/* Trust Text */}
        <p className="mt-6 text-sm text-gray-500">
          {t('privacy')}
        </p>
      </div>
    );
  }

  // Gender Selection Step
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="max-w-xl mx-auto overflow-hidden p-0 rounded-2xl border-gray-100 shadow-md">
        {/* Header con el mismo lenguaje visual que las preguntas del quiz */}
        <div className="bg-gradient-to-br from-[#3E667D] to-[#2f5165] p-6 sm:p-8 text-center text-white">
          <div className="inline-flex items-center gap-2 bg-white/15 ring-1 ring-white/20 px-3 py-1 rounded-full text-sm mb-4">
            <SparklesIcon className="h-4 w-4" />
            {t('step1')}
          </div>
          <h2 className="text-2xl font-bold">{t('selectGender')}</h2>
          <p className="mt-2 text-sm text-white/80">{t('genderHelp')}</p>
        </div>

        <div className="space-y-5 p-6 sm:p-8">
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: QuizGender.FEMALE, Icon: Venus, label: t('female') },
              { value: QuizGender.MALE, Icon: Mars, label: t('male') },
            ].map(({ value, Icon, label }) => {
              const active = selectedGender === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleSelectGender(value)}
                  aria-pressed={active}
                  className={`group relative flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${
                    active
                      ? 'border-[#3E667D] bg-[#C8DDF2]/20 ring-2 ring-[#a7c1e2]/40 shadow-sm'
                      : 'border-gray-200 hover:border-[#a7c1e2]'
                  }`}
                >
                  <CheckCircleIcon
                    className={`absolute right-3 top-3 h-6 w-6 text-[#3E667D] transition-all duration-200 ${
                      active ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                    }`}
                  />
                  <span
                    className={`flex h-16 w-16 items-center justify-center rounded-full transition-colors duration-200 ${
                      active
                        ? 'bg-[#3E667D] text-white shadow-md'
                        : 'bg-[#C8DDF2]/40 text-[#3E667D] group-hover:bg-[#C8DDF2]/60'
                    }`}
                  >
                    <Icon className="h-8 w-8" strokeWidth={2} />
                  </span>
                  <span
                    className={`text-lg font-semibold transition-colors ${
                      active ? 'text-[#3E667D]' : 'text-gray-600 group-hover:text-[#3E667D]'
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <p className="text-center text-sm text-red-500" role="alert">{error}</p>
          )}

          <div className="pt-2">
            <Button
              onClick={handleStartQuiz}
              className="w-full shadow-md transition-all duration-200 enabled:hover:shadow-lg"
              size="lg"
              disabled={isLoading || !selectedGender}
            >
              {isLoading ? t('starting') : t('continue')}
            </Button>
            {/* Guía: por qué el botón está deshabilitado */}
            <p
              aria-live="polite"
              className={`mt-2 text-center text-xs transition-opacity duration-200 ${
                !selectedGender && !isLoading ? 'text-gray-400 opacity-100' : 'opacity-0'
              }`}
            >
              {t('genderHelp')}
            </p>
          </div>

          <button
            onClick={() => setStep('intro')}
            className="w-full text-center text-sm text-gray-500 hover:text-[#3E667D] transition-colors"
          >
            {t('backToStart')}
          </button>
        </div>
      </Card>
    </div>
  );
}
