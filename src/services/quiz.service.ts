// quiz.service.ts - Service for Health Quiz API
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 7 Health Quiz

import api from '@/lib/api';
import type {
  StartQuizInput,
  StartQuizResponse,
  QuizQuestion,
  SubmitAnswerInput,
  SubmitMultipleAnswerInput,
  AnswerResponse,
  SetGenderInput,
  GenderResponse,
  SetGuestInfoInput,
  GuestInfoResponse,
  QuizResult,
  QuizStatusResponse,
  TrackCartAddInput,
  TrackPurchaseInput,
  TrackResponse,
} from '@/types/quiz';

// Session token persistence
const SESSION_KEY = 'quiz_session_token';

const getStoredSessionToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY);
};

const storeSessionToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, token);
};

const clearSessionToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
};

class QuizService {
  // ================================
  // SESSION MANAGEMENT
  // ================================

  async startQuiz(data: StartQuizInput = {}): Promise<StartQuizResponse> {
    const response = await api.post<StartQuizResponse>('/quiz/start', data);
    storeSessionToken(response.data.sessionToken);
    return response.data;
  }

  async resumeQuiz(sessionToken: string): Promise<StartQuizResponse> {
    const response = await api.post<StartQuizResponse>(`/quiz/resume/${sessionToken}`);
    storeSessionToken(response.data.sessionToken);
    return response.data;
  }

  async getSessionStatus(sessionToken: string): Promise<QuizStatusResponse> {
    const response = await api.get<QuizStatusResponse>(`/quiz/status/${sessionToken}`);
    return response.data;
  }

  getStoredSession(): string | null {
    return getStoredSessionToken();
  }

  clearSession(): void {
    clearSessionToken();
  }

  // ================================
  // QUESTIONS
  // ================================

  async getQuestion(sessionToken: string): Promise<QuizQuestion> {
    const response = await api.get<QuizQuestion>(`/quiz/question/${sessionToken}`);
    return response.data;
  }

  async getAllQuestions(): Promise<QuizQuestion[]> {
    const response = await api.get<QuizQuestion[]>('/quiz/questions');
    return response.data;
  }

  // ================================
  // ANSWERS
  // ================================

  async submitAnswer(data: SubmitAnswerInput): Promise<AnswerResponse> {
    const response = await api.post<AnswerResponse>('/quiz/answer', data);
    return response.data;
  }

  async submitMultipleAnswer(data: SubmitMultipleAnswerInput): Promise<AnswerResponse> {
    const response = await api.post<AnswerResponse>('/quiz/answer/multiple', data);
    return response.data;
  }

  // ================================
  // USER INFO
  // ================================

  async setGender(data: SetGenderInput): Promise<GenderResponse> {
    const response = await api.post<GenderResponse>('/quiz/gender', data);
    return response.data;
  }

  async setGuestInfo(data: SetGuestInfoInput): Promise<GuestInfoResponse> {
    const response = await api.post<GuestInfoResponse>('/quiz/guest-info', data);
    return response.data;
  }

  // ================================
  // RESULTS
  // ================================

  async getResults(sessionToken: string): Promise<QuizResult> {
    const response = await api.get<QuizResult>(`/quiz/results/${sessionToken}`);
    return response.data;
  }

  // ================================
  // TRACKING
  // ================================

  async trackCartAdd(data: TrackCartAddInput): Promise<TrackResponse> {
    const response = await api.post<TrackResponse>('/quiz/track/cart-add', data);
    return response.data;
  }

  async trackPurchase(data: TrackPurchaseInput): Promise<TrackResponse> {
    const response = await api.post<TrackResponse>('/quiz/track/purchase', data);
    return response.data;
  }

  // ================================
  // ADMIN
  // ================================

  async getAdminSessions(params?: { page?: number; limit?: number; status?: string }): Promise<any> {
    const response = await api.get('/quiz/admin/sessions', { params });
    return response.data;
  }

  async getAdminStats(): Promise<any> {
    const response = await api.get('/quiz/admin/stats');
    return response.data;
  }

  // ================================
  // UTILITIES
  // ================================

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      health: 'Salud',
      lifestyle: 'Estilo de vida',
      goals: 'Objetivos',
      energy: 'Energía',
      digestion: 'Digestión',
      stress: 'Estrés',
      beauty: 'Belleza',
      immune: 'Sistema Inmune',
      hormonal: 'Balance Hormonal',
    };
    return labels[category] || category;
  }

  getGenderLabel(gender: string): string {
    const labels: Record<string, string> = {
      male: 'Masculino',
      female: 'Femenino',
      other: 'Otro',
    };
    return labels[gender] || gender;
  }

  getGoalLabel(goal: string): string {
    const labels: Record<string, string> = {
      energy: 'Aumentar energía',
      weight_loss: 'Pérdida de peso',
      detox: 'Desintoxicación',
      beauty: 'Belleza y piel',
      stress: 'Reducir estrés',
      immune: 'Fortalecer sistema inmune',
      digestion: 'Mejorar digestión',
      hormonal: 'Balance hormonal',
      muscle: 'Desarrollo muscular',
      vitality: 'Vitalidad general',
    };
    return labels[goal] || goal;
  }
}

export const quizService = new QuizService();
export default quizService;
