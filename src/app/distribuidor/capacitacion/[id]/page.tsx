'use client';

import { Suspense, use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  LockClosedIcon,
  PlayCircleIcon,
  ClockIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import {
  useCourse,
  useCourseLessons,
  useCourseAccess,
  useCourseProgress,
  useUpdateLessonProgress,
} from '@/hooks/useCourses';
import { coursesService } from '@/services/courses.service';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import type { CourseLesson, LessonProgress } from '@/types/course';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<CourseDetailSkeleton />}>
      <CourseDetailContent courseId={id} />
    </Suspense>
  );
}

function CourseDetailContent({ courseId }: { courseId: string }) {
  const router = useRouter();

  const { data: course, isLoading: loadingCourse } = useCourse(courseId);
  const { data: access, isLoading: loadingAccess } = useCourseAccess(courseId);
  const canAccess = access?.canAccess === true;

  const { data: lessons = [], isLoading: loadingLessons } = useCourseLessons(
    courseId,
    canAccess,
  );
  const { data: progressList = [] } = useCourseProgress(courseId, canAccess);

  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loadingStream, setLoadingStream] = useState(false);

  // Mapa id → progreso para render rápido
  const progressMap = useMemo(() => {
    const m = new Map<string, LessonProgress>();
    for (const p of progressList) m.set(p.lessonId, p);
    return m;
  }, [progressList]);

  // Al cargar lecciones, seleccionar la primera no completada (o la primera)
  useEffect(() => {
    if (!currentLessonId && lessons.length > 0) {
      const firstIncomplete = lessons.find((l) => !progressMap.get(l.id)?.completed);
      setCurrentLessonId(firstIncomplete?.id || lessons[0].id);
    }
  }, [lessons, progressMap, currentLessonId]);

  const currentLesson = useMemo(
    () => lessons.find((l) => l.id === currentLessonId) || null,
    [lessons, currentLessonId],
  );
  const currentProgress = currentLesson ? progressMap.get(currentLesson.id) : null;

  // Pedir signed URL cuando cambia la lección
  useEffect(() => {
    let cancelled = false;
    async function fetchStream() {
      if (!currentLesson || !currentLesson.hasVideo) {
        setStreamUrl(null);
        return;
      }
      try {
        setLoadingStream(true);
        const { url } = await coursesService.getLessonStreamUrl(courseId, currentLesson.id);
        if (!cancelled) setStreamUrl(url);
      } catch {
        if (!cancelled) toast.error('No se pudo cargar el video');
      } finally {
        if (!cancelled) setLoadingStream(false);
      }
    }
    fetchStream();
    return () => {
      cancelled = true;
    };
  }, [courseId, currentLesson]);

  const updateProgress = useUpdateLessonProgress(courseId);

  const handleTimeUpdate = useCallback(
    (seconds: number, duration: number) => {
      if (!currentLesson || !duration) return;
      const percent = Math.min(100, (seconds / duration) * 100);
      updateProgress.mutate({
        lessonId: currentLesson.id,
        secondsWatched: seconds,
        percent,
      });
    },
    [currentLesson, updateProgress],
  );

  const handleEnded = useCallback(() => {
    if (!currentLesson) return;
    updateProgress.mutate({
      lessonId: currentLesson.id,
      secondsWatched: 0,
      percent: 100,
    });
    // Auto-avanzar a la siguiente si existe
    const idx = lessons.findIndex((l) => l.id === currentLesson.id);
    const next = lessons[idx + 1];
    if (next) setCurrentLessonId(next.id);
  }, [currentLesson, lessons, updateProgress]);

  if (loadingCourse || loadingAccess) return <CourseDetailSkeleton />;

  if (!course) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Curso no encontrado.</p>
        <button
          onClick={() => router.push('/distribuidor/capacitacion')}
          className="mt-4 text-[#3E667D] hover:underline"
        >
          Volver a la academia
        </button>
      </div>
    );
  }

  if (!canAccess) {
    return <AccessDenied courseTitle={course.title} reason={access?.reason} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#2f5165] text-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/distribuidor/capacitacion')}
            className="rounded-full p-2 hover:bg-white/10 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/60 truncate">
              Academia · {course.instructorName || 'Sin instructor'}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold truncate">{course.title}</h1>
          </div>
          <AcademicCapIcon className="h-8 w-8 text-white/50 hidden sm:block" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* Player + info lección */}
          <div className="space-y-4">
            {!currentLesson ? (
              <EmptyLessonsState />
            ) : !currentLesson.hasVideo ? (
              <div className="aspect-video rounded-xl bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <PlayCircleIcon className="mx-auto h-14 w-14 text-gray-600 mb-2" />
                  <p className="text-gray-400 text-sm">El video aún no está disponible.</p>
                </div>
              </div>
            ) : loadingStream || !streamUrl ? (
              <div className="aspect-video rounded-xl bg-gray-900 flex items-center justify-center">
                <div className="animate-pulse text-gray-500 text-sm">Cargando reproductor...</div>
              </div>
            ) : (
              <VideoPlayer
                key={currentLesson.id}
                src={streamUrl}
                mimeType={currentLesson.videoMimeType || 'video/mp4'}
                poster={resolveUrl(course.imageUrl) || undefined}
                startAt={
                  currentProgress && !currentProgress.completed
                    ? currentProgress.secondsWatched
                    : 0
                }
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
              />
            )}

            {currentLesson && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {currentLesson.title}
                    </h2>
                    {currentLesson.durationMinutes > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <ClockIcon className="h-3.5 w-3.5" />
                        <span>{currentLesson.durationMinutes} min</span>
                      </div>
                    )}
                  </div>
                  {currentProgress?.completed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      <CheckCircleIcon className="h-4 w-4" />
                      Completado
                    </span>
                  )}
                </div>
                {currentLesson.description && (
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {currentLesson.description}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Sidebar lecciones */}
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">Contenido del curso</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {lessons.length} lecciones ·{' '}
                  {progressList.filter((p) => p.completed).length} completadas
                </p>
              </div>
              {loadingLessons ? (
                <div className="p-4 text-sm text-gray-500">Cargando...</div>
              ) : lessons.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  Aún no hay lecciones disponibles.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
                  {lessons.map((lesson, idx) => {
                    const prog = progressMap.get(lesson.id);
                    const isCurrent = lesson.id === currentLessonId;
                    return (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          onClick={() => setCurrentLessonId(lesson.id)}
                          disabled={!lesson.hasVideo}
                          className={`w-full text-left px-4 py-3 transition-colors ${
                            isCurrent
                              ? 'bg-[#3E667D]/5 border-l-4 border-[#3E667D]'
                              : 'hover:bg-gray-50 border-l-4 border-transparent'
                          } ${!lesson.hasVideo ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {prog?.completed ? (
                                <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                              ) : !lesson.hasVideo ? (
                                <LockClosedIcon className="h-5 w-5 text-gray-300" />
                              ) : (
                                <div
                                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                                    isCurrent
                                      ? 'border-[#3E667D] text-[#3E667D]'
                                      : 'border-gray-300 text-gray-400'
                                  }`}
                                >
                                  {idx + 1}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-medium line-clamp-2 ${
                                  isCurrent ? 'text-[#3E667D]' : 'text-gray-900'
                                }`}
                              >
                                {lesson.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                                {lesson.durationMinutes > 0 && (
                                  <span>{lesson.durationMinutes} min</span>
                                )}
                                {prog && !prog.completed && prog.percent > 0 && (
                                  <span className="text-[#3E667D]">
                                    · {Math.round(prog.percent)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function AccessDenied({
  courseTitle,
  reason,
}: {
  courseTitle: string;
  reason?: string;
}) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center mb-4">
          <LockClosedIcon className="h-7 w-7 text-amber-600" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Curso restringido</h1>
        <p className="text-sm text-gray-600 mb-1">
          <strong>{courseTitle}</strong> requiere inscripción previa.
        </p>
        <p className="text-xs text-gray-500 mb-6">
          {reason === 'not_enrolled'
            ? 'Contacta a tu sponsor o a soporte para adquirir este contenido.'
            : 'Contacta a soporte si crees que esto es un error.'}
        </p>
        <button
          type="button"
          onClick={() => router.push('/distribuidor/capacitacion')}
          className="w-full rounded-lg bg-[#3E667D] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2f5165] transition-colors"
        >
          Volver a la academia
        </button>
      </div>
    </div>
  );
}

function EmptyLessonsState() {
  return (
    <div className="aspect-video rounded-xl bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <AcademicCapIcon className="mx-auto h-14 w-14 text-gray-600 mb-2" />
        <p className="text-gray-400 text-sm">Este curso aún no tiene lecciones publicadas.</p>
      </div>
    </div>
  );
}

function CourseDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50 animate-pulse">
      <div className="h-20 bg-gradient-to-r from-[#3E667D] to-[#2f5165]" />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 grid lg:grid-cols-[1fr_340px] gap-6">
        <div className="aspect-video rounded-xl bg-gray-200" />
        <div className="rounded-xl bg-gray-200 h-96" />
      </div>
    </div>
  );
}
