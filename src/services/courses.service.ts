import api from '@/lib/axios';
import type {
  Course,
  CreateCourseDto,
  UpdateCourseDto,
  CourseQueryParams,
  CoursesListResponse,
  CourseLesson,
  CreateLessonDto,
  UpdateLessonDto,
  CourseEnrollment,
  CreateEnrollmentsDto,
  CourseAccessResult,
  LessonProgress,
} from '@/types/course';

/**
 * Sube un File a una URL PUT firmada (GCS) con progreso real vía XHR.
 * Usa XMLHttpRequest porque fetch no emite eventos de progreso de subida.
 */
function uploadToSignedUrl(
  uploadUrl: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    for (const [k, v] of Object.entries(headers || {})) {
      xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (evt) => {
      if (onProgress && evt.lengthComputable) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        console.error('[GCS upload] status', xhr.status, 'body', xhr.responseText);
        reject(
          new Error(
            `GCS rechazó la subida (HTTP ${xhr.status}). ` +
              (xhr.responseText ? xhr.responseText.slice(0, 200) : 'Revisa permisos del bucket.'),
          ),
        );
      }
    };
    xhr.onerror = () => {
      console.error('[GCS upload] network/CORS error. Verifica que el bucket tenga CORS configurado.');
      reject(
        new Error(
          'Error de red o CORS al subir a GCS. ' +
            'Aplica la configuración CORS al bucket (scripts/gcs-cors.json) y vuelve a intentar.',
        ),
      );
    };
    xhr.onabort = () => reject(new Error('Subida cancelada'));
    xhr.send(file);
  });
}

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

  async getMyCourses(): Promise<Course[]> {
    const { data } = await api.get(`${this.basePath}/my-courses`);
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

  // ===== Lessons =====

  async listLessons(courseId: string): Promise<CourseLesson[]> {
    const { data } = await api.get(`${this.basePath}/${courseId}/lessons`);
    return data;
  }

  async createLesson(courseId: string, dto: CreateLessonDto): Promise<CourseLesson> {
    const { data } = await api.post(`${this.basePath}/${courseId}/lessons`, dto);
    return data;
  }

  async updateLesson(
    courseId: string,
    lessonId: string,
    dto: UpdateLessonDto,
  ): Promise<CourseLesson> {
    const { data } = await api.patch(
      `${this.basePath}/${courseId}/lessons/${lessonId}`,
      dto,
    );
    return data;
  }

  async deleteLesson(courseId: string, lessonId: string): Promise<{ success: boolean }> {
    const { data } = await api.delete(`${this.basePath}/${courseId}/lessons/${lessonId}`);
    return data;
  }

  async uploadLessonVideo(
    courseId: string,
    lessonId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<CourseLesson> {
    // Paso 1: pedir URL firmada al backend
    const { data: signed } = await api.post<{
      uploadUrl: string;
      gcsPath: string;
      requiredHeaders: Record<string, string>;
    }>(`${this.basePath}/${courseId}/lessons/${lessonId}/video/upload-url`, {
      mimeType: file.type || 'video/mp4',
      originalName: file.name,
    });

    // Paso 2: subir directo a GCS con XHR (para tener progress events)
    await uploadToSignedUrl(signed.uploadUrl, file, signed.requiredHeaders, onProgress);

    // Paso 3: finalizar — guardar el path en la lección
    const { data } = await api.post<CourseLesson>(
      `${this.basePath}/${courseId}/lessons/${lessonId}/video/finalize`,
      {
        gcsPath: signed.gcsPath,
        size: file.size,
        mimeType: file.type || 'video/mp4',
      },
    );

    return data;
  }

  async getLessonStreamUrl(
    courseId: string,
    lessonId: string,
  ): Promise<{ url: string; expiresAt: string }> {
    const { data } = await api.get(
      `${this.basePath}/${courseId}/lessons/${lessonId}/stream`,
    );
    return data;
  }

  // ===== Enrollments =====

  async listEnrollments(courseId: string): Promise<CourseEnrollment[]> {
    const { data } = await api.get(`${this.basePath}/${courseId}/enrollments`);
    return data;
  }

  async addEnrollments(
    courseId: string,
    dto: CreateEnrollmentsDto,
  ): Promise<{ added: number }> {
    const { data } = await api.post(`${this.basePath}/${courseId}/enrollments`, dto);
    return data;
  }

  async searchCustomersForEnrollment(
    query: string,
    limit = 20,
  ): Promise<
    {
      id: string;
      customerNumber: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    }[]
  > {
    const { data } = await api.get(`${this.basePath}/enrollments/customer-search`, {
      params: { q: query, limit },
    });
    return data;
  }

  async removeEnrollment(
    courseId: string,
    customerId: string,
  ): Promise<{ success: boolean }> {
    const { data } = await api.delete(
      `${this.basePath}/${courseId}/enrollments/${customerId}`,
    );
    return data;
  }

  // ===== Access & progress (distributor) =====

  async canAccess(courseId: string): Promise<CourseAccessResult> {
    const { data } = await api.get(`${this.basePath}/${courseId}/can-access`);
    return data;
  }

  async getCourseProgress(courseId: string): Promise<LessonProgress[]> {
    const { data } = await api.get(`${this.basePath}/${courseId}/progress`);
    return data;
  }

  async updateLessonProgress(
    courseId: string,
    lessonId: string,
    body: { secondsWatched: number; percent: number },
  ): Promise<LessonProgress> {
    const { data } = await api.post(
      `${this.basePath}/${courseId}/lessons/${lessonId}/progress`,
      body,
    );
    return data;
  }
}

export const coursesService = new CoursesService();
