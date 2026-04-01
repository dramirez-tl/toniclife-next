import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesService } from '@/services/courses.service';
import type { CourseQueryParams, CreateCourseDto, UpdateCourseDto } from '@/types/course';

const keys = {
  all: ['courses'] as const,
  list: (params?: CourseQueryParams) => ['courses', 'list', params] as const,
  detail: (id: string) => ['courses', id] as const,
  published: ['courses', 'published'] as const,
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
