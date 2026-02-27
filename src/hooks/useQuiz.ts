// useQuiz.ts - React Query hooks for Health Quiz
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 7 Health Quiz

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quizService } from '@/services/quiz.service';
import type {
  StartQuizInput,
  SubmitAnswerInput,
  SubmitMultipleAnswerInput,
  SetGenderInput,
  SetGuestInfoInput,
  TrackCartAddInput,
  TrackPurchaseInput,
} from '@/types/quiz';

// ================================
// QUERY KEYS
// ================================

export const quizKeys = {
  all: ['quiz'] as const,
  session: (token: string) => [...quizKeys.all, 'session', token] as const,
  status: (token: string) => [...quizKeys.all, 'status', token] as const,
  question: (token: string) => [...quizKeys.all, 'question', token] as const,
  questions: () => [...quizKeys.all, 'questions'] as const,
  results: (token: string) => [...quizKeys.all, 'results', token] as const,
  // Admin keys
  adminSessions: (params?: { page?: number; limit?: number; status?: string }) =>
    [...quizKeys.all, 'admin', 'sessions', params] as const,
  adminStats: () => [...quizKeys.all, 'admin', 'stats'] as const,
};

// ================================
// QUERIES
// ================================

export function useQuizStatus(sessionToken: string | null) {
  return useQuery({
    queryKey: quizKeys.status(sessionToken || ''),
    queryFn: () => quizService.getSessionStatus(sessionToken!),
    enabled: !!sessionToken,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useQuizQuestion(sessionToken: string | null) {
  return useQuery({
    queryKey: quizKeys.question(sessionToken || ''),
    queryFn: () => quizService.getQuestion(sessionToken!),
    enabled: !!sessionToken,
    staleTime: 0, // Always fresh
  });
}

export function useAllQuestions() {
  return useQuery({
    queryKey: quizKeys.questions(),
    queryFn: () => quizService.getAllQuestions(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useQuizResults(sessionToken: string | null) {
  return useQuery({
    queryKey: quizKeys.results(sessionToken || ''),
    queryFn: () => quizService.getResults(sessionToken!),
    enabled: !!sessionToken,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ================================
// MUTATIONS
// ================================

export function useStartQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StartQuizInput = {}) => quizService.startQuiz(data),
    onSuccess: (data) => {
      queryClient.setQueryData(quizKeys.status(data.sessionToken), {
        sessionToken: data.sessionToken,
        status: 'in_progress',
        currentStep: data.currentStep,
        totalSteps: data.totalSteps,
        answeredQuestions: 0,
      });
      queryClient.setQueryData(quizKeys.question(data.sessionToken), data.firstQuestion);
    },
  });
}

export function useResumeQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionToken: string) => quizService.resumeQuiz(sessionToken),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: quizKeys.status(data.sessionToken) });
      queryClient.setQueryData(quizKeys.question(data.sessionToken), data.firstQuestion);
    },
  });
}

export function useSubmitAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SubmitAnswerInput) => quizService.submitAnswer(data),
    onSuccess: (data, variables) => {
      // Update question if there's a next one
      if (data.nextQuestion) {
        queryClient.setQueryData(
          quizKeys.question(variables.sessionToken),
          data.nextQuestion
        );
      }
      // Invalidate status to reflect new progress
      queryClient.invalidateQueries({
        queryKey: quizKeys.status(variables.sessionToken),
      });
    },
  });
}

export function useSubmitMultipleAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SubmitMultipleAnswerInput) => quizService.submitMultipleAnswer(data),
    onSuccess: (data, variables) => {
      if (data.nextQuestion) {
        queryClient.setQueryData(
          quizKeys.question(variables.sessionToken),
          data.nextQuestion
        );
      }
      queryClient.invalidateQueries({
        queryKey: quizKeys.status(variables.sessionToken),
      });
    },
  });
}

export function useSetGender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SetGenderInput) => quizService.setGender(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: quizKeys.status(variables.sessionToken),
      });
      queryClient.invalidateQueries({
        queryKey: quizKeys.question(variables.sessionToken),
      });
    },
  });
}

export function useSetGuestInfo() {
  return useMutation({
    mutationFn: (data: SetGuestInfoInput) => quizService.setGuestInfo(data),
  });
}

export function useTrackCartAdd() {
  return useMutation({
    mutationFn: (data: TrackCartAddInput) => quizService.trackCartAdd(data),
  });
}

export function useTrackPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TrackPurchaseInput) => quizService.trackPurchase(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: quizKeys.results(variables.sessionToken),
      });
    },
  });
}

// ================================
// ADMIN HOOKS
// ================================

export function useAdminQuizSessions(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: quizKeys.adminSessions(params),
    queryFn: () => quizService.getAdminSessions(params),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useAdminQuizStats() {
  return useQuery({
    queryKey: quizKeys.adminStats(),
    queryFn: () => quizService.getAdminStats(),
    staleTime: 60 * 1000, // 1 minute
  });
}

// ================================
// CUSTOM HOOK - QUIZ FLOW
// ================================

export function useQuizFlow() {
  const startQuiz = useStartQuiz();
  const resumeQuiz = useResumeQuiz();
  const submitAnswer = useSubmitAnswer();
  const submitMultipleAnswer = useSubmitMultipleAnswer();
  const setGender = useSetGender();
  const setGuestInfo = useSetGuestInfo();

  // Defer localStorage read to avoid hydration mismatch
  const [storedToken, setStoredToken] = useState<string | null>(null);
  useEffect(() => {
    setStoredToken(quizService.getStoredSession());
  }, []);

  return {
    storedToken,
    startQuiz,
    resumeQuiz,
    submitAnswer,
    submitMultipleAnswer,
    setGender,
    setGuestInfo,
    clearSession: quizService.clearSession,
  };
}
