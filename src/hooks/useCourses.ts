import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesService } from '@/services/courses.service';
import type {
  CourseQueryParams,
  CreateCourseDto,
  UpdateCourseDto,
  CreateLessonDto,
  UpdateLessonDto,
  CreateEnrollmentsDto,
} from '@/types/course';

const keys = {
  all: ['courses'] as const,
  list: (params?: CourseQueryParams) => ['courses', 'list', params] as const,
  detail: (id: string) => ['courses', id] as const,
  published: ['courses', 'published'] as const,
  lessons: (courseId: string) => ['courses', courseId, 'lessons'] as const,
  enrollments: (courseId: string) => ['courses', courseId, 'enrollments'] as const,
};

export function useCourses(params?: CourseQueryParams) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => coursesService.getAll(params),
  });
}

export function useCourse(id: string, enabled = true) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => coursesService.getById(id),
    enabled: !!id && enabled,
  });
}

export function usePublishedCourses() {
  return useQuery({
    queryKey: keys.published,
    queryFn: () => coursesService.getPublished(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useMyCourses() {
  return useQuery({
    queryKey: ['courses', 'my-courses'],
    queryFn: () => coursesService.getMyCourses(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCourseDto) => coursesService.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCourseDto }) => coursesService.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUploadCourseImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => coursesService.uploadImage(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => coursesService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

// ===== Lessons =====

export function useCourseLessons(courseId: string, enabled = true) {
  return useQuery({
    queryKey: keys.lessons(courseId),
    queryFn: () => coursesService.listLessons(courseId),
    enabled: !!courseId && enabled,
    staleTime: 1000 * 30,
  });
}

export function useCreateLesson(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateLessonDto) => coursesService.createLesson(courseId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.lessons(courseId) });
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useUpdateLesson(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, dto }: { lessonId: string; dto: UpdateLessonDto }) =>
      coursesService.updateLesson(courseId, lessonId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.lessons(courseId) });
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useDeleteLesson(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) => coursesService.deleteLesson(courseId, lessonId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.lessons(courseId) });
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useUploadLessonVideo(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      lessonId,
      file,
      onProgress,
    }: {
      lessonId: string;
      file: File;
      onProgress?: (percent: number) => void;
    }) => coursesService.uploadLessonVideo(courseId, lessonId, file, onProgress),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.lessons(courseId) }),
  });
}

// ===== Enrollments =====

export function useCourseEnrollments(courseId: string, enabled = true) {
  return useQuery({
    queryKey: keys.enrollments(courseId),
    queryFn: () => coursesService.listEnrollments(courseId),
    enabled: !!courseId && enabled,
  });
}

export function useAddEnrollments(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateEnrollmentsDto) => coursesService.addEnrollments(courseId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.enrollments(courseId) }),
  });
}

export function useRemoveEnrollment(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => coursesService.removeEnrollment(courseId, customerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.enrollments(courseId) }),
  });
}

// ===== Access & progress =====

export function useCourseAccess(courseId: string, enabled = true) {
  return useQuery({
    queryKey: ['courses', courseId, 'can-access'],
    queryFn: () => coursesService.canAccess(courseId),
    enabled: !!courseId && enabled,
    staleTime: 1000 * 60,
  });
}

export function useCourseProgress(courseId: string, enabled = true) {
  return useQuery({
    queryKey: ['courses', courseId, 'progress'],
    queryFn: () => coursesService.getCourseProgress(courseId),
    enabled: !!courseId && enabled,
    staleTime: 1000 * 30,
  });
}

export function useUpdateLessonProgress(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      lessonId,
      secondsWatched,
      percent,
    }: {
      lessonId: string;
      secondsWatched: number;
      percent: number;
    }) => coursesService.updateLessonProgress(courseId, lessonId, { secondsWatched, percent }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses', courseId, 'progress'] }),
  });
}
