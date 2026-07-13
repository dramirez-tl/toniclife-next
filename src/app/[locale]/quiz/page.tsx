// app/quiz/page.tsx - Health Quiz with API integration
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 7 Health Quiz
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Header, Footer } from '@/components/layout';
import { QuizWelcome, QuizQuestion, QuizResults, QuizProgress, QuizAnalyzing } from '@/components/quiz';
import { Card } from '@/components/ui';
import { useStoreCountry } from '@/hooks/useStoreCountry';
import { QuizLanguage } from '@/types/quiz';
import {
  useStartQuiz,
  useResumeQuiz,
  useSubmitAnswer,
  useSubmitMultipleAnswer,
  useSetGender,
  useSetGuestInfo,
  useQuizResults,
  useQuizFlow,
} from '@/hooks/useQuiz';
import { quizService } from '@/services/quiz.service';
import type {
  QuizGender,
  StartQuizInput,
  QuizQuestion as QuizQuestionType,
  QuizResult,
} from '@/types/quiz';
import { toast } from 'sonner';

type QuizStage = 'welcome' | 'questions' | 'results' | 'loading';

function QuizPageContent() {
  const t = useTranslations('quiz.page');
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('ref') || searchParams.get('referral');

  // País + idioma de la tienda (del locale): el quiz recomienda respetando el
  // almacén/stock/precio del país y la IA redacta en este idioma.
  const { countryId, lang } = useStoreCountry();

  const [stage, setStage] = useState<QuizStage>('welcome');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestionType | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(10);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const { storedToken, clearSession } = useQuizFlow();
  const startQuiz = useStartQuiz();
  const resumeQuiz = useResumeQuiz();
  const submitAnswer = useSubmitAnswer();
  const submitMultipleAnswer = useSubmitMultipleAnswer();
  const setGender = useSetGender();
  const setGuestInfo = useSetGuestInfo();

  const { data: quizResults, isLoading: isLoadingResults } = useQuizResults(
    stage === 'results' ? sessionToken : null
  );

  // Check for existing session on mount
  useEffect(() => {
    const existingToken = quizService.getStoredSession();
    if (existingToken) {
      // Could auto-resume or show option to continue
    }
  }, []);

  const handleStartQuiz = useCallback(
    async (data: StartQuizInput, gender: QuizGender) => {
      setStage('loading');

      try {
        // Include referral code + país/idioma del locale
        const startData: StartQuizInput = {
          ...data,
          referralCode: referralCode || data.referralCode,
          countryId: countryId || data.countryId,
          language: (lang === 'en' ? QuizLanguage.EN : QuizLanguage.ES),
        };

        const result = await startQuiz.mutateAsync(startData);

        setSessionToken(result.sessionToken);
        setTotalSteps(result.totalSteps);
        setCurrentStep(result.currentStep);

        // Set gender for the session
        await setGender.mutateAsync({
          sessionToken: result.sessionToken,
          gender,
        });

        setCurrentQuestion(result.firstQuestion);
        setStage('questions');
      } catch (error: any) {
        toast.error(error.response?.data?.message || t('startError'));
        setStage('welcome');
      }
    },
    [startQuiz, setGender, referralCode, countryId, lang, t]
  );

  const handleResumeQuiz = useCallback(async () => {
    const existingToken = quizService.getStoredSession();
    if (!existingToken) return;

    setStage('loading');

    try {
      const result = await resumeQuiz.mutateAsync(existingToken);

      setSessionToken(result.sessionToken);
      setTotalSteps(result.totalSteps);
      setCurrentStep(result.currentStep);
      setCurrentQuestion(result.firstQuestion);
      setStage('questions');

      toast.success(t('resumed'));
    } catch (error: any) {
      toast.error(t('resumeError'));
      clearSession();
      setStage('welcome');
    }
  }, [resumeQuiz, clearSession, t]);

  const handleAnswer = useCallback(
    async (questionKey: string, answerValue: string, answerLabel?: string) => {
      if (!sessionToken) return;

      // Save locally for UI feedback
      setAnswers((prev) => ({ ...prev, [questionKey]: answerValue }));

      try {
        const result = await submitAnswer.mutateAsync({
          sessionToken,
          questionKey,
          answerValue,
          answerLabel,
        });

        setCurrentStep(result.currentStep);

        if (result.isComplete) {
          setStage('results');
        } else if (result.nextQuestion) {
          setCurrentQuestion(result.nextQuestion);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || t('answerError'));
      }
    },
    [sessionToken, submitAnswer, t]
  );

  const handleMultipleAnswer = useCallback(
    async (questionKey: string, answerValues: string[], answerLabels?: string[]) => {
      if (!sessionToken) return;

      setAnswers((prev) => ({ ...prev, [questionKey]: answerValues }));

      try {
        const result = await submitMultipleAnswer.mutateAsync({
          sessionToken,
          questionKey,
          answerValues,
          answerLabels,
        });

        setCurrentStep(result.currentStep);

        if (result.isComplete) {
          setStage('results');
        } else if (result.nextQuestion) {
          setCurrentQuestion(result.nextQuestion);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || t('answerError'));
      }
    },
    [sessionToken, submitMultipleAnswer, t]
  );

  const handleSaveEmail = useCallback(
    async (email: string, name?: string, phone?: string) => {
      if (!sessionToken) return;

      try {
        await setGuestInfo.mutateAsync({
          sessionToken,
          email,
          name,
          phone,
        });
        toast.success(t('infoSaved'));
      } catch (error: any) {
        toast.error(t('infoError'));
      }
    },
    [sessionToken, setGuestInfo, t]
  );

  const handleRestart = useCallback(() => {
    clearSession();
    setSessionToken(null);
    setCurrentQuestion(null);
    setCurrentStep(1);
    setAnswers({});
    setStage('welcome');
  }, [clearSession]);

  const isLoading =
    startQuiz.isPending ||
    resumeQuiz.isPending ||
    submitAnswer.isPending ||
    submitMultipleAnswer.isPending;

  // Enviando la ÚLTIMA respuesta: el backend completa la sesión y genera las
  // recomendaciones con IA (tarda varios segundos) → pantalla "analizando"
  // en lugar de dejar la pregunta congelada en "Guardando…".
  const isSubmittingFinal =
    (submitAnswer.isPending || submitMultipleAnswer.isPending) &&
    currentStep >= totalSteps;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-40 sm:pt-44 pb-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl lg:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome Stage */}
          {stage === 'welcome' && (
            <QuizWelcome
              onStart={handleStartQuiz}
              onResume={handleResumeQuiz}
              hasStoredSession={!!storedToken}
              isLoading={isLoading}
              referralCode={referralCode || undefined}
            />
          )}

          {/* Loading Stage */}
          {stage === 'loading' && (
            <div className="text-center py-20">
              <div className="inline-block w-12 h-12 border-4 border-[#a7c1e2] border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-gray-600">{t('preparing')}</p>
            </div>
          )}

          {/* Questions Stage */}
          {stage === 'questions' && currentQuestion && (
            isSubmittingFinal ? (
              <QuizAnalyzing />
            ) : (
              <>
                <QuizProgress current={currentStep} total={totalSteps} />
                <QuizQuestion
                  question={currentQuestion}
                  onAnswer={handleAnswer}
                  onMultipleAnswer={handleMultipleAnswer}
                  selectedAnswer={answers[currentQuestion.questionKey]}
                  isLoading={isLoading}
                />
              </>
            )
          )}

          {/* Results Stage */}
          {stage === 'results' && (
            <>
              {isLoadingResults ? (
                <QuizAnalyzing />
              ) : quizResults ? (
                <QuizResults
                  result={quizResults}
                  onRestart={handleRestart}
                  onSaveEmail={handleSaveEmail}
                />
              ) : (
                <Card className="text-center py-12">
                  <p className="text-gray-600">{t('resultsError')}</p>
                  <button
                    onClick={handleRestart}
                    className="mt-4 text-[#3E667D] hover:underline"
                  >
                    {t('retry')}
                  </button>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function QuizLoadingFallback() {
  const t = useTranslations('quiz.page');
  return (
    <>
      <Header />
      <main className="min-h-screen pt-40 sm:pt-44 pb-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-[#a7c1e2] border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-gray-600">{t('loading')}</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<QuizLoadingFallback />}>
      <QuizPageContent />
    </Suspense>
  );
}
