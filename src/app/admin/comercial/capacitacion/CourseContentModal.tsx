'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  VideoCameraIcon,
  ArrowUpTrayIcon,
  PlayIcon,
  UserGroupIcon,
  LockClosedIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  useCourseLessons,
  useCreateLesson,
  useDeleteLesson,
  useUploadLessonVideo,
  useCourseEnrollments,
  useAddEnrollments,
  useRemoveEnrollment,
  useUpdateCourse,
} from '@/hooks/useCourses';
import { coursesService } from '@/services/courses.service';
import type { Course, CourseLesson, CourseEnrollment } from '@/types/course';

interface EnrollmentCandidate {
  id: string;
  customerNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

type Tab = 'lessons' | 'access';

interface Props {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

const VIDEO_MAX_GB = 25;
const VIDEO_MAX_BYTES = VIDEO_MAX_GB * 1024 * 1024 * 1024;
const ACCEPTED_VIDEO_MIMES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
  'video/x-m4v',
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function CourseContentModal({ course, isOpen, onClose, onChanged }: Props) {
  const [tab, setTab] = useState<Tab>('lessons');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) setTab('lessons');
  }, [isOpen, course?.id]);

  const requestClose = () => {
    if (isUploading) {
      toast.error('Espera a que termine la subida del video antes de cerrar');
      return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={requestClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Gestión de contenido</p>
            <h2 className="text-lg font-semibold text-gray-900">{course.title}</h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={isUploading}
            title={isUploading ? 'Hay una subida en curso' : 'Cerrar'}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-3 border-b border-gray-200">
          <TabButton active={tab === 'lessons'} onClick={() => setTab('lessons')}>
            <VideoCameraIcon className="h-4 w-4" />
            Lecciones
          </TabButton>
          <TabButton
            active={tab === 'access'}
            onClick={() => {
              if (isUploading) {
                toast.error('Espera a que termine la subida para cambiar de pestaña');
                return;
              }
              setTab('access');
            }}
          >
            <UserGroupIcon className="h-4 w-4" />
            Acceso
          </TabButton>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'lessons' ? (
            <LessonsTab
              course={course}
              onChanged={onChanged}
              onUploadingChange={setIsUploading}
            />
          ) : (
            <AccessTab course={course} onChanged={onChanged} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-[#3E667D] text-[#3E667D]'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

// ============ LESSONS TAB ============

function LessonsTab({
  course,
  onChanged,
  onUploadingChange,
}: {
  course: Course;
  onChanged?: () => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const { data: lessons = [], isLoading, refetch } = useCourseLessons(course.id);
  const createLesson = useCreateLesson(course.id);
  const deleteLesson = useDeleteLesson(course.id);

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);

  const uploadMutation = useUploadLessonVideo(course.id);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isAnyUploading =
    uploadingId !== null || createLesson.isPending || uploadMutation.isPending;

  useEffect(() => {
    onUploadingChange?.(isAnyUploading);
  }, [isAnyUploading, onUploadingChange]);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error('El título es requerido');
      return;
    }
    if (newVideoFile) {
      if (!ACCEPTED_VIDEO_MIMES.includes(newVideoFile.type)) {
        toast.error('Formato de video no soportado (usa MP4, MOV, WEBM o MKV)');
        return;
      }
      if (newVideoFile.size > VIDEO_MAX_BYTES) {
        toast.error(`El video excede el máximo de ${VIDEO_MAX_GB} GB`);
        return;
      }
    }

    try {
      const lesson = await createLesson.mutateAsync({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        durationMinutes: newDuration ? parseFloat(newDuration) : undefined,
      });
      toast.success('Lección creada');

      if (newVideoFile) {
        setUploadingId(lesson.id);
        setUploadProgress(0);
        await uploadMutation.mutateAsync({
          lessonId: lesson.id,
          file: newVideoFile,
          onProgress: (p) => setUploadProgress(p),
        });
        toast.success('Video subido correctamente');
        setUploadingId(null);
      }

      setNewTitle('');
      setNewDescription('');
      setNewDuration('');
      setNewVideoFile(null);
      setIsAdding(false);
      refetch();
      onChanged?.();
    } catch (err: any) {
      setUploadingId(null);
      toast.error(err?.response?.data?.message || 'Error al crear la lección');
    }
  };

  const handleUploadExisting = async (lesson: CourseLesson, file: File) => {
    if (!ACCEPTED_VIDEO_MIMES.includes(file.type)) {
      toast.error('Formato de video no soportado');
      return;
    }
    if (file.size > VIDEO_MAX_BYTES) {
      toast.error(`El video excede el máximo de ${VIDEO_MAX_GB} GB`);
      return;
    }

    try {
      setUploadingId(lesson.id);
      setUploadProgress(0);
      await uploadMutation.mutateAsync({
        lessonId: lesson.id,
        file,
        onProgress: (p) => setUploadProgress(p),
      });
      toast.success('Video actualizado');
      setUploadingId(null);
      refetch();
      onChanged?.();
    } catch (err: any) {
      setUploadingId(null);
      toast.error(err?.response?.data?.message || err?.message || 'Error al subir el video');
    }
  };

  const handleDelete = async (lesson: CourseLesson) => {
    if (!confirm(`¿Eliminar la lección "${lesson.title}" y su video?`)) return;
    try {
      await deleteLesson.mutateAsync(lesson.id);
      toast.success('Lección eliminada');
      refetch();
      onChanged?.();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handlePlay = async (lesson: CourseLesson) => {
    if (!lesson.hasVideo) {
      toast.error('Esta lección aún no tiene video');
      return;
    }
    try {
      const { url } = await coursesService.getLessonStreamUrl(course.id, lesson.id);
      window.open(url, '_blank', 'noopener');
    } catch {
      toast.error('No se pudo generar la URL del video');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {lessons.length} lección{lessons.length === 1 ? '' : 'es'} · videos almacenados en GCS (privados)
        </p>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            disabled={isAnyUploading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3E667D] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2f5165] disabled:opacity-50 disabled:cursor-not-allowed"
            title={isAnyUploading ? 'Espera a que termine la subida' : undefined}
          >
            <PlusIcon className="h-4 w-4" />
            Nueva lección
          </button>
        )}
      </div>

      {isAdding && (
        <div className="rounded-xl border border-[#3E667D]/30 bg-[#3E667D]/5 p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Título *</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#3E667D] focus:ring-1 focus:ring-[#3E667D] outline-none"
              placeholder="Ej: Liderazgo con Santiago Jaimez"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#3E667D] outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Duración (minutos)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#3E667D] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Video (opcional, máx {VIDEO_MAX_GB} GB)
              </label>
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
                onChange={(e) => setNewVideoFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[#3E667D] file:text-white file:text-xs file:font-medium hover:file:bg-[#2f5165]"
              />
              {newVideoFile && (
                <p className="text-[10px] text-gray-500 mt-1">
                  {newVideoFile.name} · {formatBytes(newVideoFile.size)}
                </p>
              )}
            </div>
          </div>

          {(createLesson.isPending || uploadMutation.isPending) && newVideoFile && (
            <ProgressBar
              value={uploadProgress}
              label={
                uploadMutation.isPending
                  ? `Subiendo a GCS · ${formatBytes(newVideoFile.size)}`
                  : 'Creando lección...'
              }
            />
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewTitle('');
                setNewDescription('');
                setNewDuration('');
                setNewVideoFile(null);
              }}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={createLesson.isPending || uploadMutation.isPending}
              className="flex-1 rounded-lg bg-[#3E667D] px-3 py-2 text-sm font-medium text-white hover:bg-[#2f5165] disabled:opacity-50"
            >
              {createLesson.isPending || uploadMutation.isPending
                ? 'Guardando...'
                : 'Crear lección'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-sm text-gray-500">Cargando lecciones...</div>
      ) : lessons.length === 0 ? (
        <div className="text-center py-10 rounded-xl border border-dashed border-gray-300 bg-gray-50">
          <VideoCameraIcon className="mx-auto h-10 w-10 text-gray-300 mb-2" />
          <p className="text-sm text-gray-600">Este curso aún no tiene lecciones.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lessons.map((lesson, idx) => (
            <LessonRow
              key={lesson.id}
              index={idx + 1}
              lesson={lesson}
              isUploading={uploadingId === lesson.id}
              uploadProgress={uploadingId === lesson.id ? uploadProgress : 0}
              disabled={isAnyUploading && uploadingId !== lesson.id}
              onUploadVideo={(file) => handleUploadExisting(lesson, file)}
              onDelete={() => handleDelete(lesson)}
              onPlay={() => handlePlay(lesson)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LessonRow({
  index,
  lesson,
  isUploading,
  uploadProgress,
  disabled = false,
  onUploadVideo,
  onDelete,
  onPlay,
}: {
  index: number;
  lesson: CourseLesson;
  isUploading: boolean;
  uploadProgress: number;
  disabled?: boolean;
  onUploadVideo: (file: File) => void;
  onDelete: () => void;
  onPlay: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#3E667D]/10 text-sm font-semibold text-[#3E667D]">
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-900 truncate">{lesson.title}</h4>
            {lesson.hasVideo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                <CheckCircleIcon className="h-3 w-3" />
                Video
              </span>
            )}
          </div>
          {lesson.description && (
            <p className="text-xs text-gray-500 mb-2 line-clamp-2">{lesson.description}</p>
          )}
          <div className="flex items-center gap-3 text-[10px] text-gray-400">
            {lesson.durationMinutes > 0 && <span>{lesson.durationMinutes} min</span>}
            {lesson.videoSize && (
              <span>{(lesson.videoSize / (1024 * 1024)).toFixed(1)} MB</span>
            )}
          </div>

          {isUploading && (
            <div className="mt-2">
              <ProgressBar value={uploadProgress} />
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          {lesson.hasVideo && (
            <button
              type="button"
              onClick={onPlay}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title={disabled ? 'Hay una subida en curso' : 'Ver video'}
            >
              <PlayIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <label
            className={`inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 ${
              disabled || isUploading
                ? 'opacity-40 cursor-not-allowed hover:bg-transparent'
                : 'cursor-pointer'
            }`}
            title={disabled ? 'Hay una subida en curso' : undefined}
          >
            <ArrowUpTrayIcon className="h-3.5 w-3.5" />
            {lesson.hasVideo ? 'Reemplazar' : 'Subir video'}
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
              className="hidden"
              disabled={isUploading || disabled}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadVideo(f);
                e.currentTarget.value = '';
              }}
            />
          </label>
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled || isUploading}
            className="inline-flex items-center rounded-lg border border-red-200 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            title={disabled || isUploading ? 'Hay una subida en curso' : 'Eliminar lección'}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <span>{label || 'Subiendo...'}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full bg-[#3E667D] transition-all duration-200"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ============ ACCESS TAB ============

function AccessTab({ course, onChanged }: { course: Course; onChanged?: () => void }) {
  const updateCourse = useUpdateCourse();
  const [accessType, setAccessType] = useState<'public' | 'restricted'>(course.accessType || 'public');

  useEffect(() => {
    setAccessType(course.accessType || 'public');
  }, [course.id, course.accessType]);

  const { data: enrollments = [], refetch } = useCourseEnrollments(
    course.id,
    accessType === 'restricted',
  );
  const addEnrollments = useAddEnrollments(course.id);
  const removeEnrollment = useRemoveEnrollment(course.id);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<EnrollmentCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const enrolledIds = new Set(enrollments.map((e) => e.customerId));

  const handleToggleAccess = async (newType: 'public' | 'restricted') => {
    if (newType === accessType) return;
    const previous = accessType;
    setAccessType(newType);
    try {
      await updateCourse.mutateAsync({
        id: course.id,
        dto: { accessType: newType },
      });
      toast.success(
        newType === 'public'
          ? 'Curso disponible para todos los distribuidores'
          : 'Curso restringido a customers inscritos',
      );
      onChanged?.();
    } catch {
      setAccessType(previous);
      toast.error('Error al cambiar el tipo de acceso');
    }
  };

  const handleSearch = async () => {
    if (!search.trim() || search.trim().length < 2) {
      toast.error('Escribe al menos 2 caracteres');
      return;
    }
    try {
      setIsSearching(true);
      const res = await coursesService.searchCustomersForEnrollment(search.trim(), 20);
      setResults(res);
    } catch {
      toast.error('Error al buscar customers');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = async (customer: EnrollmentCandidate) => {
    try {
      await addEnrollments.mutateAsync({ customerIds: [customer.id] });
      toast.success(`${customer.firstName || 'Customer'} inscrito al curso`);
      refetch();
      onChanged?.();
    } catch {
      toast.error('Error al inscribir al customer');
    }
  };

  const handleRemove = async (enrollment: CourseEnrollment) => {
    if (!confirm(`¿Quitar acceso a ${enrollment.customerName || 'este customer'}?`)) return;
    try {
      await removeEnrollment.mutateAsync(enrollment.customerId);
      toast.success('Acceso retirado');
      refetch();
      onChanged?.();
    } catch {
      toast.error('Error al retirar acceso');
    }
  };

  return (
    <div className="space-y-5">
      {/* Access type toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de acceso
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleToggleAccess('public')}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              accessType === 'public'
                ? 'border-[#3E667D] bg-[#3E667D]/5 ring-1 ring-[#3E667D]/20'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <GlobeAltIcon className="h-5 w-5 text-[#3E667D] mb-2" />
            <p className="text-sm font-semibold text-gray-900">Público</p>
            <p className="text-xs text-gray-500 mt-1">
              Disponible para todos los distribuidores autenticados.
            </p>
          </button>
          <button
            type="button"
            onClick={() => handleToggleAccess('restricted')}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              accessType === 'restricted'
                ? 'border-[#3E667D] bg-[#3E667D]/5 ring-1 ring-[#3E667D]/20'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <LockClosedIcon className="h-5 w-5 text-[#3E667D] mb-2" />
            <p className="text-sm font-semibold text-gray-900">Restringido</p>
            <p className="text-xs text-gray-500 mt-1">
              Sólo los customers inscritos pueden acceder (para cursos de pago).
            </p>
          </button>
        </div>
      </div>

      {accessType === 'restricted' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agregar customers con acceso
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder="Buscar por nombre, email o número..."
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-[#3E667D] focus:ring-1 focus:ring-[#3E667D] outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleSearch}
                disabled={isSearching}
                className="rounded-lg bg-[#3E667D] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f5165] disabled:opacity-50"
              >
                {isSearching ? 'Buscando...' : 'Buscar'}
              </button>
            </div>

            {results.length > 0 && (
              <div className="mt-3 rounded-xl border border-gray-200 bg-white max-h-64 overflow-y-auto divide-y divide-gray-100">
                {results.map((c) => {
                  const isEnrolled = enrolledIds.has(c.id);
                  const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || '—';
                  return (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {fullName}
                          {c.customerNumber && (
                            <span className="ml-2 text-[10px] text-gray-400">
                              #{c.customerNumber}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{c.email}</p>
                      </div>
                      <button
                        type="button"
                        disabled={isEnrolled || addEnrollments.isPending}
                        onClick={() => handleAdd(c)}
                        className={`ml-3 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          isEnrolled
                            ? 'bg-emerald-50 text-emerald-700 cursor-default'
                            : 'bg-[#3E667D] text-white hover:bg-[#2f5165] disabled:opacity-50'
                        }`}
                      >
                        {isEnrolled ? 'Ya inscrito' : 'Dar acceso'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">
                Customers con acceso ({enrollments.length})
              </h3>
            </div>
            {enrollments.length === 0 ? (
              <div className="text-center py-8 rounded-xl border border-dashed border-gray-300 bg-gray-50">
                <UserGroupIcon className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-600">Aún no hay customers inscritos.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                {enrollments.map((e) => (
                  <div key={e.id} className="flex items-center justify-between px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {e.customerName || '—'}
                        {e.customerNumber && (
                          <span className="ml-2 text-[10px] text-gray-400">
                            #{e.customerNumber}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {e.customerEmail || '—'} · Inscrito{' '}
                        {new Date(e.enrolledAt).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(e)}
                      className="ml-3 inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
