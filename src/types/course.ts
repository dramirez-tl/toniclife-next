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
}

export interface UpdateCourseDto extends Partial<CreateCourseDto> {}

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
