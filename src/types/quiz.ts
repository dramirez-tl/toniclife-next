// quiz.ts - TypeScript types for Health Quiz API
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 7 Health Quiz

// ================================
// ENUMS
// ================================

export enum QuizLanguage {
  ES = 'es',
  EN = 'en',
}

export enum QuizGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum QuestionType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
}

export enum QuizStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export enum QuizSource {
  DIRECT = 'direct',
  REFERRAL_LINK = 'referral_link',
  QR_CODE = 'qr_code',
  SOCIAL_MEDIA = 'social_media',
}

// ================================
// QUESTION & OPTIONS
// ================================

export interface QuizOption {
  id: string;
  value: string;
  label: string;
  description?: string;
  iconName?: string;
  colorHex?: string;
}

export interface QuizQuestion {
  id: string;
  questionNumber: number;
  questionKey: string;
  questionText: string;
  description?: string;
  questionType: QuestionType;
  isRequired: boolean;
  iconName?: string;
  category?: string;
  options: QuizOption[];
}

// ================================
// SESSION & ANSWERS
// ================================

export interface QuizSession {
  sessionToken: string;
  status: QuizStatus;
  currentStep: number;
  totalSteps: number;
  startedAt: string;
  completedAt?: string;
  answeredQuestions: number;
  gender?: QuizGender;
  referralCode?: string;
}

export interface QuizAnswer {
  questionKey: string;
  answerValue: string;
  answerLabel?: string;
}

// ================================
// RECOMMENDATIONS
// ================================

export interface ProductRecommendation {
  productId: string;
  productName: string;
  productSlug: string;
  productImage?: string;
  price: number;
  originalPrice?: number;
  /** Moneda del precio (del país de la sesión). Default MXN. */
  currencyCode?: string;
  score: number;
  matchedRules: number;
  priority: number;
  reason: string;
  categoryName?: string;
}

export interface QuizResultSummary {
  totalQuestions: number;
  answeredQuestions: number;
  gender?: QuizGender;
  healthCategories: string[];
  mainGoals: string[];
}

export interface QuizResult {
  sessionToken: string;
  status: QuizStatus;
  completedAt?: string;
  recommendations: ProductRecommendation[];
  /** Resumen del perfil de salud redactado por la IA (idioma de la sesión). */
  aiSummary?: string;
  summary?: QuizResultSummary;
  referralCode?: string;
}

// ================================
// API INPUT DTOs
// ================================

export interface StartQuizInput {
  referralCode?: string;
  source?: QuizSource;
  language?: QuizLanguage;
  /** País de la tienda (locale) — filtra candidatos por almacén/stock/precio del país. */
  countryId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

export interface SubmitAnswerInput {
  sessionToken: string;
  questionKey: string;
  answerValue: string;
  answerLabel?: string;
}

export interface SubmitMultipleAnswerInput {
  sessionToken: string;
  questionKey: string;
  answerValues: string[];
  answerLabels?: string[];
}

export interface SetGenderInput {
  sessionToken: string;
  gender: QuizGender;
}

export interface SetGuestInfoInput {
  sessionToken: string;
  email: string;
  name?: string;
  phone?: string;
}

export interface TrackCartAddInput {
  sessionToken: string;
  productId: string;
}

export interface TrackPurchaseInput {
  sessionToken: string;
  productIds: string[];
}

// ================================
// API RESPONSE DTOs
// ================================

export interface StartQuizResponse {
  sessionToken: string;
  totalSteps: number;
  currentStep: number;
  firstQuestion: QuizQuestion;
}

export interface AnswerResponse {
  success: boolean;
  currentStep: number;
  totalSteps: number;
  isComplete: boolean;
  nextQuestion?: QuizQuestion;
}

export interface GenderResponse {
  success: boolean;
  gender: QuizGender;
  totalSteps: number;
}

export interface GuestInfoResponse {
  success: boolean;
  email: string;
  name?: string;
}

export interface QuizStatusResponse {
  sessionToken: string;
  status: QuizStatus;
  currentStep: number;
  totalSteps: number;
  startedAt: string;
  completedAt?: string;
  answeredQuestions: number;
  gender?: QuizGender;
  referralCode?: string;
}

export interface TrackResponse {
  success: boolean;
}

// ================================
// UI STATE TYPES
// ================================

export interface QuizState {
  sessionToken: string | null;
  currentStep: number;
  totalSteps: number;
  currentQuestion: QuizQuestion | null;
  answers: Record<string, string | string[]>;
  gender: QuizGender | null;
  isComplete: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface QuizProgress {
  current: number;
  total: number;
  percentage: number;
}
