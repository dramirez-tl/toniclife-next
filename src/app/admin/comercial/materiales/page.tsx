'use client';

import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/Card';
import {
  useMaterials,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  useUploadMaterialFile,
  useUploadMaterialThumbnail,
  useMaterialEnrollments,
  useAddMaterialEnrollments,
  useRemoveMaterialEnrollment,
} from '@/hooks/useMaterials';
import { useActiveCountries } from '@/hooks/useConfig';
import { customersService } from '@/services/customers.service';
import type { Customer } from '@/types/customer';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import type {
  MarketingMaterial,
  CreateMaterialDto,
  MaterialCategory,
  MaterialType,
  MaterialAccessType,
} from '@/types/material';
import {
  FolderOpenIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  ArchiveBoxIcon,
  ArrowUpTrayIcon,
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  PresentationChartBarIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  LockClosedIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';
function resolveUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

const categoryLabels: Record<MaterialCategory, string> = {
  catalogos: 'Catálogos',
  redes_sociales: 'Redes Sociales',
  testimonios: 'Testimonios',
  presentaciones: 'Presentaciones',
  guias: 'Guías',
  branding: 'Branding',
  capacitacion: 'Capacitación',
  otros: 'Otros',
};

const typeLabels: Record<MaterialType, string> = {
  pdf: 'PDF',
  image: 'Imagen',
  video: 'Video',
  document: 'Documento',
  presentation: 'Presentación',
};

const typeIcons: Record<MaterialType, typeof DocumentIcon> = {
  pdf: DocumentIcon,
  image: PhotoIcon,
  video: VideoCameraIcon,
  document: DocumentIcon,
  presentation: PresentationChartBarIcon,
};

const statusConfig: Record<string, { label: string; icon: typeof CheckCircleIcon; color: string }> = {
  published: { label: 'Publicado', icon: CheckCircleIcon, color: 'text-emerald-600' },
  draft: { label: 'Borrador', icon: ClockIcon, color: 'text-amber-600' },
  archived: { label: 'Archivado', icon: ArchiveBoxIcon, color: 'text-gray-500' },
};

const FILE_MAX_GB = 10;
const FILE_MAX_BYTES = FILE_MAX_GB * 1024 * 1024 * 1024;

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ============ MODAL ============

function MaterialModal({
  isOpen,
  material,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  material: MarketingMaterial | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const createMutation = useCreateMaterial();
  const updateMutation = useUpdateMaterial();
  const uploadFileMutation = useUploadMaterialFile();
  const uploadThumbMutation = useUploadMaterialThumbnail();

  const { data: countries = [] } = useActiveCountries();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<MaterialType>('pdf');
  const [category, setCategory] = useState<MaterialCategory>('otros');
  const [status, setStatus] = useState('draft');
  const [sortOrder, setSortOrder] = useState('0');
  const [accessType, setAccessType] = useState<MaterialAccessType>('public');
  const [selectedCountryIds, setSelectedCountryIds] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setInitialized(false);
      setFile(null);
      setThumbFile(null);
      setUploadProgress(0);
      return;
    }
    if (!initialized) {
      if (material) {
        setTitle(material.title);
        setDescription(material.description || '');
        setType(material.type);
        setCategory(material.category);
        setStatus(material.status);
        setSortOrder(String(material.sortOrder || 0));
        setAccessType(material.accessType || 'public');
        setSelectedCountryIds(material.countryIds || []);
      } else {
        setTitle('');
        setDescription('');
        setType('pdf');
        setCategory('otros');
        setStatus('draft');
        setSortOrder('0');
        setAccessType('public');
        setSelectedCountryIds([]);
      }
      setInitialized(true);
    }
  }, [isOpen, material, initialized]);

  const toggleCountry = (id: string) => {
    setSelectedCountryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    uploadFileMutation.isPending ||
    uploadThumbMutation.isPending;

  const handleClose = () => {
    if (uploadFileMutation.isPending) {
      toast.error('Espera a que termine la subida antes de cerrar');
      return;
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('El título es requerido');
      return;
    }

    const dto: CreateMaterialDto = {
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      category,
      status: status as 'draft' | 'published' | 'archived',
      sortOrder: sortOrder ? parseInt(sortOrder) : 0,
      accessType,
      countryIds: selectedCountryIds,
    };

    try {
      let saved: MarketingMaterial;
      if (material) {
        saved = await updateMutation.mutateAsync({ id: material.id, dto });
        toast.success('Material actualizado');
      } else {
        saved = await createMutation.mutateAsync(dto);
        toast.success('Material creado');
      }

      if (file) {
        if (file.size > FILE_MAX_BYTES) {
          toast.error(`El archivo excede ${FILE_MAX_GB} GB`);
          return;
        }
        await uploadFileMutation.mutateAsync({
          id: saved.id,
          file,
          onProgress: (p) => setUploadProgress(p),
        });
        toast.success('Archivo subido');
      }

      if (thumbFile) {
        await uploadThumbMutation.mutateAsync({ id: saved.id, file: thumbFile });
        toast.success('Thumbnail subido');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Error al guardar');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {material ? 'Editar Material' : 'Nuevo Material'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={uploadFileMutation.isPending}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-40"
          >
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
              placeholder="Ej: Catálogo Digital 2025"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3E667D] outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MaterialType)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-[#3E667D] outline-none"
              >
                {Object.entries(typeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MaterialCategory)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-[#3E667D] outline-none"
              >
                {Object.entries(categoryLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-[#3E667D] outline-none"
              >
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
                <option value="archived">Archivado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
              <input
                type="number"
                min="0"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3E667D] outline-none"
              />
            </div>
          </div>

          {/* Países */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Países donde se mostrará
            </label>
            <p className="text-[11px] text-gray-500 mb-2">
              Deja vacío para mostrar en todos los países. Marca uno o varios para limitar.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200 p-2 bg-gray-50">
              {countries.length === 0 ? (
                <p className="col-span-full text-xs text-gray-400 text-center py-2">
                  Cargando países...
                </p>
              ) : (
                countries.map((c) => {
                  const checked = selectedCountryIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`inline-flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                        checked
                          ? 'border-[#3E667D] bg-[#3E667D]/10 text-[#2f5165] font-medium'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCountry(c.id)}
                        className="accent-[#3E667D]"
                      />
                      <span className="truncate">
                        {c.code ? `${c.code} · ` : ''}{c.name}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Tipo de acceso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Acceso al material
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccessType('public')}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  accessType === 'public'
                    ? 'border-[#3E667D] bg-[#3E667D]/5 ring-1 ring-[#3E667D]/20'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <GlobeAltIcon className="h-4 w-4 text-[#3E667D]" />
                  <span className="text-xs font-semibold text-gray-900">Público</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">Todos los distribuidores (según país)</p>
              </button>
              <button
                type="button"
                onClick={() => setAccessType('restricted')}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  accessType === 'restricted'
                    ? 'border-[#3E667D] bg-[#3E667D]/5 ring-1 ring-[#3E667D]/20'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <LockClosedIcon className="h-4 w-4 text-[#3E667D]" />
                  <span className="text-xs font-semibold text-gray-900">Restringido</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">Solo customers inscritos</p>
              </button>
            </div>
          </div>

          {/* Enrollments (solo cuando el material ya existe y es restringido) */}
          {material && accessType === 'restricted' && (
            <MaterialEnrollmentsSection materialId={material.id} />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Archivo {material?.hasFile ? '(reemplazar)' : ''}
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[#3E667D] file:text-white file:text-xs file:font-medium hover:file:bg-[#2f5165]"
            />
            {file && (
              <p className="text-[11px] text-gray-500 mt-1">
                {file.name} · {formatBytes(file.size)}
              </p>
            )}
            {material?.hasFile && !file && (
              <p className="text-[11px] text-emerald-600 mt-1">
                ✓ Ya tiene archivo ({formatBytes(material.fileSize)})
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thumbnail (opcional, imagen de preview)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setThumbFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-gray-200 file:text-gray-700 file:text-xs hover:file:bg-gray-300"
            />
            {material?.thumbnailUrl && !thumbFile && (
              <p className="text-[11px] text-emerald-600 mt-1">✓ Ya tiene thumbnail</p>
            )}
          </div>

          {uploadFileMutation.isPending && file && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>Subiendo {file.name} a GCS · {formatBytes(file.size)}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full bg-[#3E667D] transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploadFileMutation.isPending}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-[#3E667D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2f5165] disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : material ? 'Guardar Cambios' : 'Crear Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ ENROLLMENTS SECTION (embedded in edit modal) ============

function MaterialEnrollmentsSection({ materialId }: { materialId: string }) {
  const { data: enrollments = [], refetch } = useMaterialEnrollments(materialId);
  const addMutation = useAddMaterialEnrollments(materialId);
  const removeMutation = useRemoveMaterialEnrollment(materialId);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const enrolledIds = new Set(enrollments.map((e) => e.customerId));

  const handleSearch = async () => {
    if (!search.trim() || search.trim().length < 2) {
      toast.error('Escribe al menos 2 caracteres');
      return;
    }
    try {
      setIsSearching(true);
      const res = await customersService.getAll({ search: search.trim(), limit: 20 });
      setResults(res.data || []);
    } catch {
      toast.error('Error al buscar customers');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = async (customer: Customer) => {
    try {
      await addMutation.mutateAsync({ customerIds: [customer.id] });
      toast.success(`${customer.firstName} inscrito`);
      refetch();
    } catch {
      toast.error('Error al inscribir');
    }
  };

  const handleRemove = async (enrollmentCustomerId: string, name: string) => {
    if (!confirm(`¿Quitar acceso a ${name || 'este customer'}?`)) return;
    try {
      await removeMutation.mutateAsync(enrollmentCustomerId);
      toast.success('Acceso retirado');
      refetch();
    } catch {
      toast.error('Error al quitar acceso');
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <UserGroupIcon className="h-4 w-4 text-[#3E667D]" />
        <span className="text-xs font-semibold text-gray-800">
          Customers con acceso ({enrollments.length})
        </span>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
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
            className="w-full rounded-md border border-gray-300 pl-7 pr-2 py-1.5 text-xs bg-white focus:border-[#3E667D] outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="rounded-md bg-[#3E667D] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2f5165] disabled:opacity-50"
        >
          {isSearching ? '...' : 'Buscar'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="rounded-md border border-gray-200 bg-white max-h-40 overflow-y-auto divide-y divide-gray-100">
          {results.map((c) => {
            const isEnrolled = enrolledIds.has(c.id);
            return (
              <div key={c.id} className="flex items-center justify-between px-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">{c.email}</p>
                </div>
                <button
                  type="button"
                  disabled={isEnrolled || addMutation.isPending}
                  onClick={() => handleAdd(c)}
                  className={`ml-2 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                    isEnrolled
                      ? 'bg-emerald-50 text-emerald-700'
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

      {enrollments.length === 0 ? (
        <p className="text-[11px] text-gray-500 text-center py-2">
          Aún no hay customers con acceso.
        </p>
      ) : (
        <div className="rounded-md border border-gray-200 bg-white divide-y divide-gray-100 max-h-40 overflow-y-auto">
          {enrollments.map((e) => (
            <div key={e.id} className="flex items-center justify-between px-2 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-900 truncate">
                  {e.customerName || '—'}
                </p>
                <p className="text-[10px] text-gray-500 truncate">
                  {e.customerEmail || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(e.customerId, e.customerName || '')}
                className="ml-2 inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[10px] text-red-600 hover:bg-red-50"
              >
                <TrashIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ MAIN PAGE ============

export default function MaterialesAdminPage() {
  return (
    <Suspense>
      <MaterialesContent />
    </Suspense>
  );
}

function MaterialesContent() {
  const { get, getNumber, setParams } = useQueryFilters({ page: '1', limit: '20' });
  const searchQuery = get('search');
  const statusFilter = get('status');
  const categoryFilter = get('category');
  const typeFilter = get('type');
  const currentPage = getNumber('page') || 1;
  const pageSize = getNumber('limit') || 20;

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingMaterial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MarketingMaterial | null>(null);

  const { data, isLoading, refetch } = useMaterials({
    search: searchQuery || undefined,
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
    type: typeFilter || undefined,
    page: currentPage,
    limit: pageSize,
  });
  const deleteMutation = useDeleteMaterial();

  const materials = data?.data || [];
  const stats = data?.stats || {
    total: 0,
    published: 0,
    draft: 0,
    archived: 0,
    totalDownloads: 0,
    categories: 0,
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({ search: searchInput || null, page: '1' });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success('Material eliminado');
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
              <FolderOpenIcon className="h-7 w-7 text-white/80" />
              <h1 className="text-2xl font-bold text-white">Gestión de Materiales</h1>
            </div>
            <p className="text-sm text-white/70 mt-1">
              Administra los recursos descargables para los distribuidores
            </p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/25 transition-all"
          >
            <PlusIcon className="h-4 w-4" />
            Nuevo Material
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <button
          type="button"
          onClick={() => setParams({ status: null, page: '1' })}
          className={`rounded-xl border p-4 text-left transition-colors ${
            !statusFilter
              ? 'border-[#3E667D]/40 bg-[#3E667D]/5 ring-1 ring-[#3E667D]/20'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </button>
        <button
          type="button"
          onClick={() => setParams({ status: 'published', page: '1' })}
          className={`rounded-xl border p-4 text-left transition-colors ${
            statusFilter === 'published'
              ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200'
              : 'border-gray-200 bg-white hover:border-emerald-200'
          }`}
        >
          <p className="text-xs text-emerald-600 font-medium">Publicados</p>
          <p className="text-2xl font-bold text-emerald-700">{stats.published}</p>
        </button>
        <button
          type="button"
          onClick={() => setParams({ status: 'draft', page: '1' })}
          className={`rounded-xl border p-4 text-left transition-colors ${
            statusFilter === 'draft'
              ? 'border-amber-300 bg-amber-50 ring-1 ring-amber-200'
              : 'border-gray-200 bg-white hover:border-amber-200'
          }`}
        >
          <p className="text-xs text-amber-600 font-medium">Borrador</p>
          <p className="text-2xl font-bold text-amber-700">{stats.draft}</p>
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Categorías</p>
          <p className="text-2xl font-bold text-gray-900">{stats.categories}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Descargas</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalDownloads}</p>
        </div>
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
                  placeholder="Buscar por título o descripción..."
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-[#3E667D] outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-[#3E667D] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f5165]"
              >
                Buscar
              </button>
            </form>
            <div className="flex gap-2">
              <select
                value={categoryFilter || ''}
                onChange={(e) => setParams({ category: e.target.value || null, page: '1' })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Todas las categorías</option>
                {Object.entries(categoryLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <select
                value={typeFilter || ''}
                onChange={(e) => setParams({ type: e.target.value || null, page: '1' })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Todos los tipos</option>
                {Object.entries(typeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-lg border border-gray-300 px-3 py-2 text-gray-600 hover:bg-gray-50"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white h-48" />
          ))}
        </div>
      ) : materials.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpenIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No hay materiales</h3>
          <p className="text-sm text-gray-500 mb-4">Crea el primer material para los distribuidores.</p>
          <button
            onClick={() => {
              setEditing(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#3E667D] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f5165]"
          >
            <PlusIcon className="h-4 w-4" />
            Nuevo Material
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((material) => {
            const st = statusConfig[material.status] || statusConfig.draft;
            const StIcon = st.icon;
            const TypeIcon = typeIcons[material.type] || DocumentIcon;
            return (
              <div
                key={material.id}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative h-36 bg-gradient-to-br from-gray-100 to-gray-200">
                  {material.thumbnailUrl ? (
                    <img
                      src={resolveUrl(material.thumbnailUrl)!}
                      alt={material.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <TypeIcon className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium ${st.color}`}>
                      <StIcon className="h-3 w-3" />
                      {st.label}
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-black/50 text-white px-2 py-0.5 text-[10px]">
                    <TypeIcon className="h-3 w-3" />
                    {typeLabels[material.type]}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                      {categoryLabels[material.category]}
                    </span>
                    {material.accessType === 'restricted' ? (
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
                    {material.countries.length > 0 && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-700"
                        title={material.countries.map((c) => c.name).join(', ')}
                      >
                        {material.countries.length === 1
                          ? material.countries[0].code || material.countries[0].name
                          : `${material.countries.length} países`}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                    {material.title}
                  </h3>
                  {material.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                      {material.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-3">
                    {material.hasFile && <span>{formatBytes(material.fileSize)}</span>}
                    <span className="inline-flex items-center gap-1">
                      <ArrowDownTrayIcon className="h-3 w-3" />
                      {material.downloadCount}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(material);
                        setIsModalOpen(true);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      <PencilIcon className="h-3 w-3" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(material)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MaterialModal
        isOpen={isModalOpen}
        material={editing}
        onClose={() => {
          setIsModalOpen(false);
          setEditing(null);
        }}
        onSaved={() => refetch()}
      />

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar material</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Eliminar <strong>{deleteTarget.title}</strong>? Se borrará también el archivo en GCS.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
