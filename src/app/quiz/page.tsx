// app/quiz/page.tsx - Health Quiz with API integration
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 7 Health Quiz
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header, Footer } from '@/components/layout';
import { QuizWelcome, QuizQuestion, QuizResults, QuizProgress } from '@/components/quiz';
import { Card } from '@/components/ui';
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
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('ref') || searchParams.get('referral');

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
        // Include referral code if present
        const startData: StartQuizInput = {
          ...data,
          referralCode: referralCode || data.referralCode,
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
        toast.error(error.response?.data?.message || 'Error al iniciar la evaluación');
        setStage('welcome');
      }
    },
    [startQuiz, setGender, referralCode]
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

      toast.success('Evaluación reanudada');
    } catch (error: any) {
      toast.error('No se pudo reanudar la evaluación');
      clearSession();
      setStage('welcome');
    }
  }, [resumeQuiz, clearSession]);

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
        toast.error(error.response?.data?.message || 'Error al guardar respuesta');
      }
    },
    [sessionToken, submitAnswer]
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
        toast.error(error.response?.data?.message || 'Error al guardar respuesta');
      }
    },
    [sessionToken, submitMultipleAnswer]
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
        toast.success('Información guardada correctamente');
      } catch (error: any) {
        toast.error('Error al guardar información');
      }
    },
    [sessionToken, setGuestInfo]
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

  return (
    <>
      <Header />
      <main className="min-h-screen pt-32 pb-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <p className="mt-4 text-gray-600">Preparando tu evaluación personalizada...</p>
            </div>
          )}

          {/* Questions Stage */}
          {stage === 'questions' && currentQuestion && (
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
          )}

          {/* Results Stage */}
          {stage === 'results' && (
            <>
              {isLoadingResults ? (
                <div className="text-center py-20">
                  <div className="inline-block w-12 h-12 border-4 border-[#a7c1e2] border-t-transparent rounded-full animate-spin" />
                  <p className="mt-4 text-gray-600">Generando tus recomendaciones...</p>
                </div>
              ) : quizResults ? (
                <QuizResults
                  result={quizResults}
                  onRestart={handleRestart}
                  onSaveEmail={handleSaveEmail}
                />
              ) : (
                <Card className="text-center py-12" padding="lg">
                  <p className="text-gray-600">No se pudieron cargar los resultados.</p>
                  <button
                    onClick={handleRestart}
                    className="mt-4 text-[#3E667D] hover:underline"
                  >
                    Intentar de nuevo
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
  return (
    <>
      <Header />
      <main className="min-h-screen pt-32 pb-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-[#a7c1e2] border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-gray-600">Cargando...</p>
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
