'use client';

import { useState, Suspense } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/Card';
import { FileUpload } from '@/components/ui/FileUpload';
import { useCourses, useCreateCourse, useUpdateCourse, useUploadCourseImage, useDeleteCourse } from '@/hooks/useCourses';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import type { Course, CreateCourseDto, UpdateCourseDto } from '@/types/course';
import {
  AcademicCapIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  ArchiveBoxIcon,
  PhotoIcon,
  ArrowPathIcon,
  VideoCameraIcon,
  LockClosedIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { CourseContentModal } from './CourseContentModal';

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

const categoryColors: Record<string, string> = {
  liderazgo: 'bg-purple-50 text-purple-700 border-purple-200',
  ventas: 'bg-blue-50 text-blue-700 border-blue-200',
  marketing: 'bg-pink-50 text-pink-700 border-pink-200',
  productos: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  fundamentos: 'bg-amber-50 text-amber-700 border-amber-200',
};

const difficultyLabels: Record<string, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

const statusConfig: Record<string, { label: string; icon: typeof CheckCircleIcon; color: string }> = {
  published: { label: 'Publicado', icon: CheckCircleIcon, color: 'text-emerald-600' },
  draft: { label: 'Borrador', icon: ClockIcon, color: 'text-amber-600' },
  archived: { label: 'Archivado', icon: ArchiveBoxIcon, color: 'text-gray-500' },
};

// ===== MODAL =====

function CourseModal({
  isOpen,
  course,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  course: Course | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const createMutation = useCreateCourse();
  const updateMutation = useUpdateCourse();
  const uploadImageMutation = useUploadCourseImage();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('liderazgo');
  const [difficulty, setDifficulty] = useState('intermedio');
  const [instructorName, setInstructorName] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [lessonCount, setLessonCount] = useState('');
  const [status, setStatus] = useState('draft');
  const [sortOrder, setSortOrder] = useState('0');
  const [accessType, setAccessType] = useState<'public' | 'restricted'>('public');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [initialized, setInitialized] = useState(false);

  if (isOpen && course && !initialized) {
    setTitle(course.title);
    setDescription(course.description || '');
    setCategory(course.category);
    setDifficulty(course.difficulty);
    setInstructorName(course.instructorName || '');
    setDurationHours(String(course.durationHours || ''));
    setLessonCount(String(course.lessonCount || ''));
    setStatus(course.status);
    setSortOrder(String(course.sortOrder || 0));
    setAccessType(course.accessType || 'public');
    setInitialized(true);
  }
  if (isOpen && !course && !initialized) {
    setTitle(''); setDescription(''); setCategory('liderazgo'); setDifficulty('intermedio');
    setInstructorName(''); setDurationHours(''); setLessonCount(''); setStatus('draft'); setSortOrder('0');
    setAccessType('public');
    setInitialized(true);
  }

  const handleClose = () => {
    setInitialized(false);
    setImageFile(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('El título es requerido'); return; }

    const dto: CreateCourseDto = {
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      difficulty,
      instructorName: instructorName.trim() || undefined,
      durationHours: durationHours ? parseFloat(durationHours) : undefined,
      lessonCount: lessonCount ? parseInt(lessonCount) : undefined,
      status,
      sortOrder: sortOrder ? parseInt(sortOrder) : undefined,
      accessType,
    };

    try {
      let savedCourse: Course;
      if (course) {
        savedCourse = await updateMutation.mutateAsync({ id: course.id, dto });
        toast.success('Curso actualizado');
      } else {
        savedCourse = await createMutation.mutateAsync(dto);
        toast.success('Curso creado');
      }

      // Upload image if selected
      if (imageFile) {
        await uploadImageMutation.mutateAsync({ id: savedCourse.id, file: imageFile });
        toast.success('Imagen subida');
      }

      handleClose();
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al guardar');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || uploadImageMutation.isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-[90vw] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {course ? 'Editar Curso' : 'Nuevo Curso'}
          </h2>
          <button type="button" onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3E667D] focus:ring-1 focus:ring-[#3E667D] outline-none"
              placeholder="Ej: Liderazgo, abundancia y prosperidad"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3E667D] focus:ring-1 focus:ring-[#3E667D] outline-none resize-none"
              placeholder="Descripción del curso..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-[#3E667D] outline-none">
                <option value="liderazgo">Liderazgo</option>
                <option value="ventas">Ventas</option>
                <option value="marketing">Marketing</option>
                <option value="productos">Productos</option>
                <option value="fundamentos">Fundamentos</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nivel</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-[#3E667D] outline-none">
                <option value="principiante">Principiante</option>
                <option value="intermedio">Intermedio</option>
                <option value="avanzado">Avanzado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
              <input type="text" value={instructorName} onChange={(e) => setInstructorName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3E667D] focus:ring-1 focus:ring-[#3E667D] outline-none" placeholder="Nombre del instructor" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-[#3E667D] outline-none">
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
                <option value="archived">Archivado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duración (horas)</label>
              <input type="number" step="0.5" min="0" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3E667D] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lecciones</label>
              <input type="number" min="0" value={lessonCount} onChange={(e) => setLessonCount(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3E667D] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
              <input type="number" min="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3E667D] outline-none" />
            </div>
          </div>

          {/* Access type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Acceso al curso</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccessType('public')}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${accessType === 'public' ? 'border-[#3E667D] bg-[#3E667D]/5 ring-1 ring-[#3E667D]/20' : 'border-gray-300 bg-white hover:border-gray-400'}`}
              >
                <div className="flex items-center gap-2">
                  <GlobeAltIcon className="h-4 w-4 text-[#3E667D]" />
                  <span className="text-xs font-semibold text-gray-900">Público</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">Todos los distribuidores</p>
              </button>
              <button
                type="button"
                onClick={() => setAccessType('restricted')}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${accessType === 'restricted' ? 'border-[#3E667D] bg-[#3E667D]/5 ring-1 ring-[#3E667D]/20' : 'border-gray-300 bg-white hover:border-gray-400'}`}
              >
                <div className="flex items-center gap-2">
                  <LockClosedIcon className="h-4 w-4 text-[#3E667D]" />
                  <span className="text-xs font-semibold text-gray-900">Restringido</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">Solo customers inscritos</p>
              </button>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <FileUpload
              label="Imagen de portada"
              name="courseImage"
              accept="image/jpeg,image/png,image/webp"
              maxSizeMB={10}
              existingUrl={resolveUrl(course?.imageUrl || null)}
              onChange={(f) => setImageFile(f)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleClose} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="flex-1 rounded-lg bg-[#3E667D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2f5165] disabled:opacity-50 transition-colors">
              {isPending ? 'Guardando...' : course ? 'Guardar Cambios' : 'Crear Curso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====

export default function CapacitacionAdminPage() {
  return <Suspense><CapacitacionContent /></Suspense>;
}

function CapacitacionContent() {
  const { get, getNumber, setParams } = useQueryFilters({ page: '1', limit: '20' });
  const searchQuery = get('search');
  const statusFilter = get('status');
  const categoryFilter = get('category');
  const currentPage = getNumber('page') || 1;
  const pageSize = getNumber('limit') || 20;

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [detailCourse, setDetailCourse] = useState<Course | null>(null);
  const [contentCourse, setContentCourse] = useState<Course | null>(null);

  const { data, isLoading, refetch } = useCourses({
    search: searchQuery || undefined,
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
    page: currentPage,
    limit: pageSize,
  });

  const deleteMutation = useDeleteCourse();

  const courses = data?.data || [];
  const stats = data?.stats || { total: 0, published: 0, draft: 0, archived: 0 };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({ search: searchInput || null, page: '1' });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success('Curso eliminado');
      setDeleteTarget(null);
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#3E667D] to-[#2f5165] px-6 py-6 shadow-lg">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <AcademicCapIcon className="h-7 w-7 text-white/80" />
              <h1 className="text-2xl font-bold text-white">Gestión de Capacitación</h1>
            </div>
            <p className="text-sm text-white/70 mt-1">
              Administra los cursos de la academia para distribuidores
            </p>
          </div>
          <button
            onClick={() => { setEditingCourse(null); setIsModalOpen(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/25 transition-all"
          >
            <PlusIcon className="h-4 w-4" />
            Nuevo Curso
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button type="button" onClick={() => setParams({ status: null, page: '1' })} className={`rounded-xl border p-4 text-left transition-colors ${!statusFilter ? 'border-[#3E667D]/40 bg-[#3E667D]/5 ring-1 ring-[#3E667D]/20' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
          <p className="text-xs text-gray-500">Total Cursos</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </button>
        <button type="button" onClick={() => setParams({ status: 'published', page: '1' })} className={`rounded-xl border p-4 text-left transition-colors ${statusFilter === 'published' ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200' : 'border-gray-200 bg-white hover:border-emerald-200'}`}>
          <p className="text-xs text-emerald-600 font-medium">Publicados</p>
          <p className="text-2xl font-bold text-emerald-700">{stats.published}</p>
        </button>
        <button type="button" onClick={() => setParams({ status: 'draft', page: '1' })} className={`rounded-xl border p-4 text-left transition-colors ${statusFilter === 'draft' ? 'border-amber-300 bg-amber-50 ring-1 ring-amber-200' : 'border-gray-200 bg-white hover:border-amber-200'}`}>
          <p className="text-xs text-amber-600 font-medium">Borrador</p>
          <p className="text-2xl font-bold text-amber-700">{stats.draft}</p>
        </button>
        <button type="button" onClick={() => setParams({ status: 'archived', page: '1' })} className={`rounded-xl border p-4 text-left transition-colors ${statusFilter === 'archived' ? 'border-gray-400 bg-gray-50 ring-1 ring-gray-300' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
          <p className="text-xs text-gray-500 font-medium">Archivados</p>
          <p className="text-2xl font-bold text-gray-600">{stats.archived}</p>
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar por título o instructor..."
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-[#3E667D] focus:ring-1 focus:ring-[#3E667D] outline-none"
                />
              </div>
              <button type="submit" className="rounded-lg bg-[#3E667D] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f5165] transition-colors">
                Buscar
              </button>
            </form>
            <div className="flex gap-2">
              <select
                value={categoryFilter || ''}
                onChange={(e) => setParams({ category: e.target.value || null, page: '1' })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-[#3E667D] outline-none"
              >
                <option value="">Todas las categorías</option>
                {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button type="button" onClick={() => refetch()} className="rounded-lg border border-gray-300 px-3 py-2 text-gray-600 hover:bg-gray-50">
                <ArrowPathIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="h-44 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16">
          <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No hay cursos</h3>
          <p className="text-sm text-gray-500 mb-4">Crea tu primer curso para la academia de distribuidores.</p>
          <button
            onClick={() => { setEditingCourse(null); setIsModalOpen(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#3E667D] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f5165]"
          >
            <PlusIcon className="h-4 w-4" />
            Nuevo Curso
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const st = statusConfig[course.status] || statusConfig.draft;
            const StIcon = st.icon;
            return (
              <div key={course.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setDetailCourse(course)}>
                {/* Image */}
                <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-200">
                  {course.imageUrl ? (
                    <img
                      src={resolveUrl(course.imageUrl)!}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <PhotoIcon className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                  {/* Status badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 text-xs font-medium ${st.color}`}>
                      <StIcon className="h-3.5 w-3.5" />
                      {st.label}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${categoryColors[course.category] || 'bg-gray-50 text-gray-600'}`}>
                      {categoryLabels[course.category] || course.category}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {difficultyLabels[course.difficulty] || course.difficulty}
                    </span>
                    {course.accessType === 'restricted' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        <LockClosedIcon className="h-2.5 w-2.5" />
                        Restringido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        <GlobeAltIcon className="h-2.5 w-2.5" />
                        Público
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">{course.title}</h3>
                  {course.instructorName && (
                    <p className="text-xs text-gray-500 mb-2">Por {course.instructorName}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {course.durationHours > 0 && <span>{course.durationHours}h</span>}
                    {course.lessonCount > 0 && <span>{course.lessonCount} lecciones</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setContentCourse(course); }}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#3E667D] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#2f5165] transition-colors"
                    >
                      <VideoCameraIcon className="h-3 w-3" />
                      Editar Contenido
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingCourse(course); setIsModalOpen(true); }}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <PencilIcon className="h-3 w-3" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(course); }}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <TrashIcon className="h-3 w-3" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Course Modal */}
      <CourseModal
        isOpen={isModalOpen}
        course={editingCourse}
        onClose={() => { setIsModalOpen(false); setEditingCourse(null); }}
        onSaved={() => refetch()}
      />

      {/* Content Modal (lessons + access) */}
      {contentCourse && (
        <CourseContentModal
          course={contentCourse}
          isOpen={!!contentCourse}
          onClose={() => setContentCourse(null)}
          onChanged={() => refetch()}
        />
      )}

      {/* Detail Modal */}
      {detailCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDetailCourse(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-[90vw] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Image */}
            {detailCourse.imageUrl && (
              <div className="relative">
                <img
                  src={resolveUrl(detailCourse.imageUrl)!}
                  alt={detailCourse.title}
                  className="w-full max-h-[400px] object-contain bg-gray-100 rounded-t-2xl"
                />
                <button
                  type="button"
                  onClick={() => setDetailCourse(null)}
                  className="absolute top-3 right-3 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
                {/* Status badge overlay */}
                <div className="absolute top-3 left-3">
                  {(() => {
                    const st = statusConfig[detailCourse.status] || statusConfig.draft;
                    const StIcon = st.icon;
                    return (
                      <span className={`inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-medium ${st.color}`}>
                        <StIcon className="h-3.5 w-3.5" />
                        {st.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
            {!detailCourse.imageUrl && (
              <div className="flex items-center justify-between px-6 pt-5">
                <div />
                <button type="button" onClick={() => setDetailCourse(null)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${categoryColors[detailCourse.category] || 'bg-gray-50 text-gray-600'}`}>
                  {categoryLabels[detailCourse.category] || detailCourse.category}
                </span>
                <span className="text-xs text-gray-400">
                  {difficultyLabels[detailCourse.difficulty] || detailCourse.difficulty}
                </span>
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-1">{detailCourse.title}</h2>

              {detailCourse.instructorName && (
                <p className="text-sm text-gray-600 mb-3">
                  Por <strong>{detailCourse.instructorName}</strong>
                </p>
              )}

              {detailCourse.description && (
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">{detailCourse.description}</p>
              )}

              {/* Meta */}
              <div className="grid grid-cols-3 gap-4 mb-5 p-4 bg-gray-50 rounded-xl">
                <div className="text-center">
                  <p className="text-lg font-bold text-[#3E667D]">{detailCourse.durationHours}h</p>
                  <p className="text-[10px] text-gray-500">Duración</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-[#3E667D]">{detailCourse.lessonCount}</p>
                  <p className="text-[10px] text-gray-500">Lecciones</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-[#3E667D]">#{detailCourse.sortOrder}</p>
                  <p className="text-[10px] text-gray-500">Orden</p>
                </div>
              </div>

              {/* Info row */}
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-5">
                <span>Creado: {new Date(detailCourse.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                <span>Actualizado: {new Date(detailCourse.updatedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setDetailCourse(null); setEditingCourse(detailCourse); setIsModalOpen(true); }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#3E667D] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2f5165] transition-colors"
                >
                  <PencilIcon className="h-4 w-4" />
                  Editar Curso
                </button>
                <button
                  type="button"
                  onClick={() => { setDetailCourse(null); setDeleteTarget(detailCourse); }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar curso</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Estás seguro de eliminar <strong>{deleteTarget.title}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleteMutation.isPending} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
