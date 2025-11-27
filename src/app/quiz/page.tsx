'use client';

import { useState } from 'react';
import { Header, Footer } from '@/components/layout';
import { QuizWelcome } from '@/components/quiz/QuizWelcome';
import { QuizQuestion } from '@/components/quiz/QuizQuestion';
import { QuizResults } from '@/components/quiz/QuizResults';
import { QuizProgress } from '@/components/quiz/QuizProgress';
import { quizQuestions, getRecommendedBundle, productBundles } from '@/lib/mock-data';
import type { QuizAnswer, WellnessGoal } from '@/types';

type QuizStage = 'welcome' | 'questions' | 'results';

interface UserInfo {
  name: string;
  email: string;
  age: number;
  gender: 'female' | 'male';
}

export default function QuizPage() {
  const [stage, setStage] = useState<QuizStage>('welcome');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);

  // Filter questions based on gender
  const getFilteredQuestions = () => {
    if (!userInfo) return quizQuestions.filter(q => q.id !== 1); // Exclude info question

    return quizQuestions.filter(q => {
      // Always skip question 1 (info form)
      if (q.id === 1) return false;

      // Filter gender-specific questions
      if (q.conditionalDisplay) {
        if (q.conditionalDisplay.requiredAnswer === 'female' && userInfo.gender !== 'female') {
          return false;
        }
        if (q.conditionalDisplay.requiredAnswer === 'male' && userInfo.gender !== 'male') {
          return false;
        }
      }

      return true;
    });
  };

  const filteredQuestions = getFilteredQuestions();
  const totalQuestions = filteredQuestions.length;
  const currentQuestion = filteredQuestions[currentQuestionIndex];

  const handleStartQuiz = (info: UserInfo) => {
    setUserInfo(info);
    setStage('questions');
    setCurrentQuestionIndex(0);
  };

  const handleAnswer = (questionId: number, optionId: string, value: number) => {
    const newAnswer: QuizAnswer = { questionId, optionId, value };

    setAnswers(prev => {
      const existing = prev.findIndex(a => a.questionId === questionId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newAnswer;
        return updated;
      }
      return [...prev, newAnswer];
    });

    // Move to next question or results
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setStage('results');
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleRestart = () => {
    setStage('welcome');
    setCurrentQuestionIndex(0);
    setUserInfo(null);
    setAnswers([]);
  };

  // Calculate results
  const getResults = () => {
    const recommendedBundle = getRecommendedBundle(
      answers.map(a => ({ questionId: a.questionId, optionId: a.optionId }))
    );

    // Calculate health profile based on answers
    const healthProfile = {
      energy: calculateScore(answers, [2]),
      digestion: calculateScore(answers, [3]),
      stress: calculateScore(answers, [4]),
      skin: calculateScore(answers, [6]),
      immune: calculateScore(answers, [7]),
      circulation: calculateScore(answers, [10]),
      hormonal: calculateScore(answers, [8, 9])
    };

    return {
      userInfo: userInfo!,
      answers,
      primaryGoal: recommendedBundle.goal,
      recommendedProducts: recommendedBundle.products,
      recommendedBundle,
      healthProfile
    };
  };

  const calculateScore = (answers: QuizAnswer[], questionIds: number[]) => {
    const relevantAnswers = answers.filter(a => questionIds.includes(a.questionId));
    if (relevantAnswers.length === 0) return 100;

    const totalValue = relevantAnswers.reduce((sum, a) => sum + a.value, 0);
    const maxValue = relevantAnswers.length * 2;
    return Math.round(100 - (totalValue / maxValue) * 100);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-32 pb-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {stage === 'welcome' && (
            <QuizWelcome onStart={handleStartQuiz} />
          )}

          {stage === 'questions' && currentQuestion && (
            <>
              <QuizProgress
                current={currentQuestionIndex + 1}
                total={totalQuestions}
              />
              <QuizQuestion
                question={currentQuestion}
                onAnswer={handleAnswer}
                onPrevious={handlePrevious}
                canGoPrevious={currentQuestionIndex > 0}
                selectedAnswer={answers.find(a => a.questionId === currentQuestion.id)?.optionId}
              />
            </>
          )}

          {stage === 'results' && userInfo && (
            <QuizResults
              result={getResults()}
              onRestart={handleRestart}
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
