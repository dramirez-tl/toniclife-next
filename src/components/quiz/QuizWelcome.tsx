'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button, Card, Input } from '@/components/ui';
import { SparklesIcon, ClockIcon, ShieldCheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
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
  const [step, setStep] = useState<'intro' | 'gender'>('intro');
  const [selectedGender, setSelectedGender] = useState<QuizGender | ''>('');
  const [error, setError] = useState('');

  const handleSelectGender = (gender: QuizGender) => {
    setSelectedGender(gender);
    setError('');
  };

  const handleStartQuiz = () => {
    if (!selectedGender) {
      setError('Por favor selecciona tu género');
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
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/images/logo.png"
            alt="Tonic Life - Tu Centro de Bienestar"
            width={200}
            height={80}
            priority
            className="h-16 w-auto"
          />
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#003B7A] leading-tight">
          <span className="font-serif italic">Encuentra tu fórmula ideal</span>
          <br />
          <span className="text-[#7AB82E]">de bienestar</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
          Tu bienestar empieza con <strong className="text-[#003B7A]">conocerte</strong>.
          <br />
          Responde unas simples preguntas y descubre qué fórmula natural es ideal para ti.
        </p>

        {/* Features */}
        <div className="mt-10 flex flex-wrap justify-center gap-6">
          <div className="flex items-center gap-2 text-gray-600">
            <ClockIcon className="h-5 w-5 text-[#7AB82E]" />
            <span>Solo 2 minutos</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <SparklesIcon className="h-5 w-5 text-[#7AB82E]" />
            <span>10 preguntas</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <ShieldCheckIcon className="h-5 w-5 text-[#7AB82E]" />
            <span>100% personalizado</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="mt-12 space-y-4">
          <Button
            size="xl"
            onClick={() => setStep('gender')}
            className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            COMENZAR AHORA
          </Button>

          {hasStoredSession && onResume && (
            <div>
              <button
                onClick={onResume}
                disabled={isLoading}
                className="inline-flex items-center gap-2 text-[#003B7A] hover:text-[#7AB82E] transition-colors"
              >
                <ArrowPathIcon className="h-5 w-5" />
                <span>Continuar evaluación anterior</span>
              </button>
            </div>
          )}
        </div>

        {/* Referral Badge */}
        {referralCode && (
          <div className="mt-6 inline-flex items-center gap-2 bg-[#7AB82E]/10 text-[#7AB82E] px-4 py-2 rounded-full text-sm">
            <SparklesIcon className="h-4 w-4" />
            <span>Referido por: {referralCode}</span>
          </div>
        )}

        {/* Trust Text */}
        <p className="mt-6 text-sm text-gray-500">
          Tu información es privada y nunca será compartida.
        </p>
      </div>
    );
  }

  // Gender Selection Step
  return (
    <Card className="max-w-xl mx-auto" padding="lg">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-[#7AB82E]/10 text-[#7AB82E] px-4 py-2 rounded-full text-sm font-medium mb-4">
          <SparklesIcon className="h-4 w-4" />
          Paso 1
        </div>
        <h2 className="text-2xl font-bold text-[#003B7A]">
          Selecciona tu género
        </h2>
        <p className="text-gray-500 mt-2">
          Esto nos ayuda a personalizar las preguntas para ti
        </p>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleSelectGender(QuizGender.FEMALE)}
            className={`
              p-6 rounded-xl border-2 transition-all
              ${selectedGender === QuizGender.FEMALE
                ? 'border-[#7AB82E] bg-[#7AB82E]/10 text-[#7AB82E]'
                : 'border-gray-200 hover:border-[#7AB82E]/50'
              }
            `}
          >
            <span className="text-4xl mb-3 block">👩</span>
            <span className="font-medium text-lg">Mujer</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectGender(QuizGender.MALE)}
            className={`
              p-6 rounded-xl border-2 transition-all
              ${selectedGender === QuizGender.MALE
                ? 'border-[#7AB82E] bg-[#7AB82E]/10 text-[#7AB82E]'
                : 'border-gray-200 hover:border-[#7AB82E]/50'
              }
            `}
          >
            <span className="text-4xl mb-3 block">👨</span>
            <span className="font-medium text-lg">Hombre</span>
          </button>
        </div>

        {error && (
          <p className="text-center text-sm text-red-500">{error}</p>
        )}

        <div className="pt-4">
          <Button
            onClick={handleStartQuiz}
            fullWidth
            size="lg"
            disabled={isLoading || !selectedGender}
          >
            {isLoading ? 'Iniciando...' : 'Continuar'}
          </Button>
        </div>

        <button
          onClick={() => setStep('intro')}
          className="w-full text-center text-sm text-gray-500 hover:text-[#003B7A] transition-colors"
        >
          ← Volver al inicio
        </button>
      </div>
    </Card>
  );
}
