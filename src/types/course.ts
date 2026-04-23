export type CourseAccessType = 'public' | 'restricted';

export interface Course {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  category: string;
  difficulty: string;
  instructorName: string | null;
  instructorPhotoUrl: string | null;
  durationHours: number;
  lessonCount: number;
  status: 'draft' | 'published' | 'archived';
  sortOrder: number;
  accessType: CourseAccessType;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseDto {
  title: string;
  description?: string;
  category?: string;
  difficulty?: string;
  instructorName?: string;
  durationHours?: number;
  lessonCount?: number;
  status?: string;
  sortOrder?: number;
  accessType?: CourseAccessType;
}

export interface UpdateCourseDto extends Partial<CreateCourseDto> {}

export interface CourseLesson {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  videoPath: string | null;
  videoSize: number | null;
  videoMimeType: string | null;
  hasVideo: boolean;
  durationMinutes: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonDto {
  title: string;
  description?: string;
  durationMinutes?: number;
  sortOrder?: number;
}

export interface UpdateLessonDto extends Partial<CreateLessonDto> {}

export interface CourseEnrollment {
  id: string;
  courseId: string;
  customerId: string;
  customerNumber: string | null;
  customerName: string | null;
  customerEmail: string | null;
  grantedBy: string | null;
  notes: string | null;
  enrolledAt: string;
}

export interface CreateEnrollmentsDto {
  customerIds: string[];
  notes?: string;
}

export interface CourseAccessResult {
  canAccess: boolean;
  reason: 'admin' | 'public' | 'enrolled' | 'not_enrolled' | 'not_found';
}

export interface LessonProgress {
  lessonId: string;
  secondsWatched: number;
  percent: number;
  completed: boolean;
  completedAt: string | null;
  lastWatchedAt: string;
}

export interface CourseQueryParams {
  status?: string;
  category?: string;
  difficulty?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CoursesListResponse {
  data: Course[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    total: number;
    published: number;
    draft: number;
    archived: number;
  };
}
