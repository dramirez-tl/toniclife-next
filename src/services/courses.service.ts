import api from '@/lib/axios';
import type { Course, CreateCourseDto, UpdateCourseDto, CourseQueryParams, CoursesListResponse } from '@/types/course';

class CoursesService {
  private basePath = '/courses';

  async getAll(params?: CourseQueryParams): Promise<CoursesListResponse> {
    const { data } = await api.get(this.basePath, { params });
    return data;
  }

  async getById(id: string): Promise<Course> {
    const { data } = await api.get(`${this.basePath}/${id}`);
    return data;
  }

  async getPublished(): Promise<Course[]> {
    const { data } = await api.get(`${this.basePath}/published`);
    return data;
  }

  async create(dto: CreateCourseDto): Promise<Course> {
    const { data } = await api.post(this.basePath, dto);
    return data;
  }

  async update(id: string, dto: UpdateCourseDto): Promise<Course> {
    const { data } = await api.patch(`${this.basePath}/${id}`, dto);
    return data;
  }

  async uploadImage(id: string, file: File): Promise<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post(`${this.basePath}/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const { data } = await api.delete(`${this.basePath}/${id}`);
    return data;
  }
}

export const coursesService = new CoursesService();
