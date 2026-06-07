'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AcademicCapIcon,
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
  TrophyIcon,
  BookOpenIcon,
  VideoCameraIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useMyCourses } from '@/hooks/useCourses';
import { toast } from 'sonner';
import type { Course } from '@/types/course';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';
function resolveUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

const categoryLabels: Record<string, string> = {
  liderazgo: 'Liderazgo',
  ventas: 'Ventas',
  marketing: 'Marketing',
  productos: 'Productos',
  fundamentos: 'Fundamentos',
};

const difficultyLabels: Record<string, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

const difficultyColors: Record<string, string> = {
  principiante: 'bg-green-100 text-green-800',
  intermedio: 'bg-blue-100 text-blue-800',
  avanzado: 'bg-purple-100 text-purple-800',
};

export default function CapacitacionPage() {
  return <Suspense><CapacitacionContent /></Suspense>;
}

function CapacitacionContent() {
  const { get, setParams } = useQueryFilters({
    category: 'all',
    level: 'all',
  });

  const filterCategory = get('category');
  const filterLevel = get('level');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const { data: courses, isLoading } = useMyCourses();

  const allCourses = courses || [];
  const categories = [...new Set(allCourses.map(c => c.category))];
  const levels = [...new Set(allCourses.map(c => c.difficulty))];

  const filteredCourses = allCourses.filter(course => {
    if (filterCategory !== 'all' && course.category !== filterCategory) return false;
    if (filterLevel !== 'all' && course.difficulty !== filterLevel) return false;
    return true;
  });

  // Stats (mock progress for now — will connect when tracking exists)
  const stats = {
    totalCourses: allCourses.length,
    totalHours: allCourses.reduce((sum, c) => sum + c.durationHours, 0),
  };

  const router = useRouter();
  const handleStartCourse = (course: Course) => {
    router.push(`/distribuidor/capacitacion/${course.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-6 flex-1 min-w-0">
              {/* Logo grande a la izquierda */}
              <div className="flex-shrink-0 bg-white/10 backdrop-blur-sm rounded-2xl p-2 border border-white/15 shadow-lg">
                <Image
                  src="/images/rise_academy/RiseAcademyWhite.png"
                  alt="Rise Academy"
                  width={280}
                  height={280}
                  className="h-40 w-40 sm:h-48 sm:w-48 lg:h-56 lg:w-56 object-contain"
                  priority
                />
              </div>
              {/* Título y subtítulo */}
              <div className="min-w-0">
                <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-white/60 font-medium mb-1">
                  Rise Academy
                </p>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                  Sistema de Capacitación
                </h1>
                <p className="text-white/80 text-base sm:text-lg mt-2">
                  Cursos élite de grandes coaches en multinivel
                </p>
              </div>
            </div>
            <Link href="/distribuidor" className="flex-shrink-0">
              <Button variant="secondary">
                Volver al Panel Principal
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Cursos Disponibles</p>
                  <p className="text-3xl font-bold text-[#3E667D]">{stats.totalCourses}</p>
                </div>
                <AcademicCapIcon className="h-12 w-12 text-[#3E667D]/30" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Horas de Contenido</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.totalHours.toFixed(1)}</p>
                </div>
                <ClockIcon className="h-12 w-12 text-purple-400/30" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Valor Estimado</p>
                  <p className="text-3xl font-bold text-emerald-600">$30,000+</p>
                </div>
                <TrophyIcon className="h-12 w-12 text-emerald-400/30" />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Incluido con tu kit</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        {(categories.length > 1 || levels.length > 1) && (
          <div className="flex flex-wrap gap-3 mb-6">
            {categories.length > 1 && (
              <SearchableSelect
                options={categories.map(cat => ({ value: cat, label: categoryLabels[cat] || cat }))}
                value={filterCategory}
                onChange={(val) => setParams({ category: val })}
                allLabel="Todas"
                allValue="all"
              />
            )}
            {levels.length > 1 && (
              <SearchableSelect
                options={levels.map(l => ({ value: l, label: difficultyLabels[l] || l }))}
                value={filterLevel}
                onChange={(val) => setParams({ level: val })}
                allLabel="Todos"
                allValue="all"
              />
            )}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {[0, 1, 2].map(i => (
              <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-5 bg-gray-200 rounded w-2/3" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Courses Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {filteredCourses.map((course: Course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Course Image */}
                    <div
                      className={`w-32 sm:w-40 flex-shrink-0 ${course.imageUrl ? 'cursor-pointer' : ''}`}
                      onClick={() => course.imageUrl && setLightboxUrl(resolveUrl(course.imageUrl))}
                    >
                      {course.imageUrl ? (
                        <img
                          src={resolveUrl(course.imageUrl)!}
                          alt={course.title}
                          className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#3E667D] to-[#C8DDF2] flex items-center justify-center min-h-[140px]">
                          <AcademicCapIcon className="h-10 w-10 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Course Info */}
                    <div className="flex-1 p-4 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyColors[course.difficulty] || 'bg-gray-100 text-gray-800'}`}>
                          {difficultyLabels[course.difficulty] || course.difficulty}
                        </span>
                        <span className="text-xs text-gray-500">{categoryLabels[course.category] || course.category}</span>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1 line-clamp-2">{course.title}</h3>

                      {course.instructorName && (
                        <p className="text-sm text-gray-600 mb-2">Por <strong>{course.instructorName}</strong></p>
                      )}

                      {course.description && (
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{course.description}</p>
                      )}

                      {/* Meta Info */}
                      <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                        {course.durationHours > 0 && (
                          <span className="flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            {course.durationHours}h
                          </span>
                        )}
                        {course.lessonCount > 0 && (
                          <span className="flex items-center gap-1">
                            <VideoCameraIcon className="h-3 w-3" />
                            {course.lessonCount} {course.lessonCount === 1 ? 'video' : 'videos'}
                          </span>
                        )}
                      </div>

                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={() => handleStartCourse(course)}
                      >
                        <PlayIcon className="h-4 w-4" />
                        Ver Curso
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredCourses.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <AcademicCapIcon className="mx-auto h-12 w-12 mb-3" />
            <p className="text-lg font-medium text-gray-600">No hay cursos disponibles</p>
            <p className="text-sm">Pronto habrá más contenido para ti.</p>
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Vista ampliada"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
