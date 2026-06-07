'use client';

import { useState, Fragment, Suspense } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersService } from '@/services/customers.service';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { DataTablePagination } from '@/components/ui';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import type { PaymentReadinessResponse, DocumentValidation } from '@/types/payment-data';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentArrowUpIcon,
  ChatBubbleLeftEllipsisIcon,
  FunnelIcon,
  ArrowPathIcon,
  BanknotesIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

// ===== HELPERS =====

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

/** Resolve document URL: prepend backend base for relative URLs */
function resolveDocUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  // /api/v1/storage/file/... or /uploads/... — prepend backend host
  return `${API_BASE}${url}`;
}

function isPreviewable(url: string): boolean {
  // Check extension (before any query params)
  const pathPart = url.split('?')[0];
  if (/\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(pathPart)) return true;
  // GCS URLs or URLs with mime info in path
  if (url.includes('/pdf') || url.includes('/image') || url.includes('content-type=image') || url.includes('content-type=application%2Fpdf')) return true;
  // Documents uploaded through our system are always JPG/PNG/PDF, so default to preview
  return true;
}

// ===== STATUS CONFIG =====

const statusConfig = {
  complete: { label: 'Validado', icon: ShieldCheckIcon, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  pending_validation: { label: 'Pendiente', icon: ClockIcon, color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  incomplete: { label: 'Incompleto', icon: ExclamationTriangleIcon, color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-400' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status as keyof typeof statusConfig] || statusConfig.incomplete;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

function DocStatusDot({ uploaded, status }: { uploaded: boolean; status: string | null }) {
  if (!uploaded) return <span className="w-2 h-2 rounded-full bg-gray-300" title="No subido" />;
  if (status === 'validated') return <span className="w-2 h-2 rounded-full bg-emerald-500" title="Validado" />;
  if (status === 'rejected') return <span className="w-2 h-2 rounded-full bg-red-500" title="Rechazado" />;
  return <span className="w-2 h-2 rounded-full bg-amber-500" title="Pendiente de revisión" />;
}

// ===== EXPANDED ROW (detail + validation) =====

function DistributorDetail({
  customerId,
  onValidated,
}: {
  customerId: string;
  onValidated: () => void;
}) {
  const [rejectField, setRejectField] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLabel, setPreviewLabel] = useState('');

  const { data: readiness, isLoading } = useQuery({
    queryKey: ['customer', customerId, 'payment-readiness'],
    queryFn: () => customersService.getPaymentReadiness(customerId),
  });

  const queryClient = useQueryClient();
  const validateMutation = useMutation({
    mutationFn: (validations: DocumentValidation[]) =>
      customersService.validateDocuments(customerId, validations),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId, 'payment-readiness'] });
      queryClient.invalidateQueries({ queryKey: ['payment-readiness-list'] });
      toast.success(result.documentsValidated ? 'Todos los documentos validados' : 'Validación actualizada');
      setRejectField(null);
      setRejectReason('');
      onValidated();
    },
  });

  const handleApprove = (field: string) => {
    validateMutation.mutate([{ field, approved: true }]);
  };

  const handleReject = () => {
    if (!rejectField || !rejectReason.trim()) {
      toast.error('Ingresa un motivo de rechazo');
      return;
    }
    validateMutation.mutate([{ field: rejectField, approved: false, rejectionReason: rejectReason }]);
  };

  const handleApproveAll = () => {
    if (!readiness) return;
    const docFields = ['ineDocument', 'taxIdDocument', 'bankStatement'];
    const fieldMap: Record<string, string> = { ineDocument: 'ine', taxIdDocument: 'taxId', bankStatement: 'bankStatement' };
    const pending = readiness.items.filter(
      (i) => docFields.includes(i.field) && i.url && (i.status === 'uploaded' || i.status === 'rejected'),
    );
    if (!pending.length) {
      toast.info('No hay documentos pendientes de validar');
      return;
    }
    validateMutation.mutate(pending.map((i) => ({ field: fieldMap[i.field] || i.field, approved: true })));
  };

  if (isLoading) {
    return (
      <div className="p-6 animate-pulse space-y-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-10 bg-gray-100 rounded" />)}
      </div>
    );
  }

  if (!readiness) return null;

  const docFields = ['ineDocument', 'taxIdDocument', 'bankStatement'];
  const dataFields = readiness.items.filter((i) => !docFields.includes(i.field));
  const docItems = readiness.items.filter((i) => docFields.includes(i.field));
  const fieldMap: Record<string, string> = { ineDocument: 'ine', taxIdDocument: 'taxId', bankStatement: 'bankStatement' };
  const pendingCount = docItems.filter((i) => i.url && i.status !== 'validated').length;

  return (
    <div className="bg-gray-50 border-t border-gray-200 p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Data fields */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Datos del Distribuidor</h4>
          <div className="space-y-2">
            {dataFields.map((item) => (
              <div key={item.field} className="flex items-center justify-between bg-white rounded-lg border border-gray-100 px-3 py-2">
                <div className="flex items-center gap-2">
                  {item.status === 'complete' ? (
                    <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircleIcon className="h-4 w-4 text-gray-300" />
                  )}
                  <span className="text-sm text-gray-700">{item.label}</span>
                </div>
                <span className={`text-xs font-mono ${item.value ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                  {item.value || 'Sin capturar'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Documents */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Documentos</h4>
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={handleApproveAll}
                disabled={validateMutation.isPending}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                Validar todos ({pendingCount})
              </button>
            )}
          </div>
          <div className="space-y-3">
            {docItems.map((item) => (
              <div key={item.field} className="bg-white rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {item.status === 'validated' ? (
                      <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                    ) : item.status === 'rejected' ? (
                      <XCircleIcon className="h-4 w-4 text-red-500" />
                    ) : item.url ? (
                      <ClockIcon className="h-4 w-4 text-amber-500" />
                    ) : (
                      <XCircleIcon className="h-4 w-4 text-gray-300" />
                    )}
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </div>
                  <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
                    item.status === 'validated' ? 'bg-emerald-50 text-emerald-600' :
                    item.status === 'rejected' ? 'bg-red-50 text-red-600' :
                    item.url ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400'
                  }`}>
                    {item.status === 'validated' ? 'Validado' : item.status === 'rejected' ? 'Rechazado' : item.url ? 'Por revisar' : 'No subido'}
                  </span>
                </div>

                {/* Rejection reason */}
                {item.status === 'rejected' && item.rejectionReason && (
                  <div className="flex items-start gap-1.5 mb-2 bg-red-50 rounded px-2 py-1.5">
                    <ChatBubbleLeftEllipsisIcon className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600">{item.rejectionReason}</p>
                  </div>
                )}

                {/* Actions */}
                {item.url && (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const resolved = resolveDocUrl(item.url)!;
                        if (isPreviewable(resolved)) {
                          setPreviewUrl(resolved);
                          setPreviewLabel(item.label);
                        } else {
                          window.open(resolved, '_blank');
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <EyeIcon className="h-3 w-3" />
                      Ver documento
                    </button>
                    {item.status !== 'validated' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(fieldMap[item.field] || item.field)}
                          disabled={validateMutation.isPending}
                          className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                        >
                          <CheckCircleIcon className="h-3 w-3" />
                          Validar
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRejectField(fieldMap[item.field] || item.field); setRejectReason(''); }}
                          disabled={validateMutation.isPending}
                          className="inline-flex items-center gap-1 rounded bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <XCircleIcon className="h-3 w-3" />
                          Rechazar
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Reject reason input */}
                {rejectField === (fieldMap[item.field] || item.field) && (
                  <div className="mt-3 space-y-2 bg-red-50 rounded-lg p-3 border border-red-100">
                    <label className="block text-xs font-medium text-red-700">
                      <ChatBubbleLeftEllipsisIcon className="h-3.5 w-3.5 inline mr-1" />
                      Motivo del rechazo
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Explica al distribuidor por qué se rechaza este documento..."
                      rows={2}
                      className="w-full rounded border border-red-200 px-3 py-2 text-xs focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => { setRejectField(null); setRejectReason(''); }}
                        className="rounded px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={validateMutation.isPending || !rejectReason.trim()}
                        className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        Confirmar rechazo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Link to full profile */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
        <Link
          href={`/admin/distribuidores/${customerId}`}
          className="text-xs text-[#3E667D] hover:underline flex items-center gap-1"
        >
          <UserIcon className="h-3.5 w-3.5" />
          Ver perfil completo del distribuidor
        </Link>
      </div>

      {/* Document Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] w-[90vw] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">{previewLabel}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Abrir en nueva pestaña
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewUrl(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            {/* Modal body */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50 min-h-[400px]">
              {/\.pdf/i.test(previewUrl.split('?')[0]) || previewUrl.includes('constancia') || previewUrl.includes('application%2Fpdf') ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[75vh] rounded border border-gray-200"
                  title={previewLabel}
                />
              ) : /\.(jpg|jpeg|png|gif|webp)/i.test(previewUrl.split('?')[0]) || previewUrl.includes('ine') ? (
                <img
                  src={previewUrl}
                  alt={previewLabel}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-sm"
                  onError={(e) => {
                    // If image fails, try as iframe (might be PDF without extension)
                    const parent = (e.target as HTMLElement).parentElement;
                    if (parent) {
                      parent.innerHTML = `<iframe src="${previewUrl}" class="w-full h-[75vh] rounded border border-gray-200" title="${previewLabel}"></iframe>`;
                    }
                  }}
                />
              ) : (
                <iframe
                  src={previewUrl}
                  className="w-full h-[75vh] rounded border border-gray-200"
                  title={previewLabel}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== MAIN PAGE =====

interface DistributorRow {
  id: string;
  customerNumber: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  overallStatus: string;
  documentsValidated: boolean;
  missingCount: number;
  completedCount: number;
  documents: {
    ine: { uploaded: boolean; status: string | null };
    taxId: { uploaded: boolean; status: string | null };
    bankStatement: { uploaded: boolean; status: string | null };
  };
  updatedAt: string;
}

export default function ValidacionDatosPage() {
  return <Suspense><ValidacionDatosContent /></Suspense>;
}

function ValidacionDatosContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    status: 'all',
    page: '1',
    limit: '20',
  });

  const statusFilter = get('status');
  const searchQuery = get('search');
  const currentPage = getNumber('page') || 1;
  const pageSize = getNumber('limit') || 20;

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['payment-readiness-list', statusFilter, searchQuery, currentPage, pageSize],
    queryFn: () => customersService.getPaymentReadinessList({
      status: statusFilter,
      search: searchQuery || undefined,
      page: currentPage,
      limit: pageSize,
    }),
  });

  const distributors: DistributorRow[] = data?.data || [];
  const totalItems = data?.total || 0;
  const globalStats = data?.stats || { totalWithData: 0, pendingValidation: 0, validated: 0, incomplete: 0 };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({ search: searchInput || null, page: '1' });
  };

  const handleStatusFilter = (s: string) => {
    setParams({ status: s, page: '1' });
  };

  const hasActiveFilters = statusFilter !== 'all' || !!searchQuery;

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#3E667D] to-[#2f5165] px-6 py-6 shadow-lg">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <DocumentArrowUpIcon className="h-7 w-7 text-white/80" />
            <h1 className="text-2xl font-bold text-white">Validación de Datos para Pago</h1>
          </div>
          <p className="text-sm text-white/70 mt-1">
            Revisa y valida los documentos fiscales y bancarios de los distribuidores para autorizar depósitos de comisiones
          </p>
        </div>
      </div>

      {/* Stats cards - global counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => handleStatusFilter('all')}
          className={`rounded-xl border p-4 text-left transition-colors ${statusFilter === 'all' ? 'border-[#3E667D]/40 bg-[#3E667D]/5 ring-1 ring-[#3E667D]/20' : 'border-gray-200 bg-white hover:border-gray-300'}`}
        >
          <p className="text-xs text-gray-500">Total con datos</p>
          <p className="text-2xl font-bold text-gray-900">{globalStats.totalWithData.toLocaleString()}</p>
        </button>
        <button
          type="button"
          onClick={() => handleStatusFilter('pending_validation')}
          className={`rounded-xl border p-4 text-left transition-colors ${statusFilter === 'pending_validation' ? 'border-amber-300 bg-amber-50 ring-1 ring-amber-200' : 'border-gray-200 bg-white hover:border-amber-200'}`}
        >
          <p className="text-xs text-amber-600 font-medium">Pendientes de revisión</p>
          <p className="text-2xl font-bold text-amber-700">{globalStats.pendingValidation.toLocaleString()}</p>
        </button>
        <button
          type="button"
          onClick={() => handleStatusFilter('complete')}
          className={`rounded-xl border p-4 text-left transition-colors ${statusFilter === 'complete' ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200' : 'border-gray-200 bg-white hover:border-emerald-200'}`}
        >
          <p className="text-xs text-emerald-600 font-medium">Validados</p>
          <p className="text-2xl font-bold text-emerald-700">{globalStats.validated.toLocaleString()}</p>
        </button>
        <button
          type="button"
          onClick={() => handleStatusFilter('incomplete')}
          className={`rounded-xl border p-4 text-left transition-colors ${statusFilter === 'incomplete' ? 'border-red-300 bg-red-50 ring-1 ring-red-200' : 'border-gray-200 bg-white hover:border-red-200'}`}
        >
          <p className="text-xs text-red-600 font-medium">Incompletos</p>
          <p className="text-2xl font-bold text-red-600">{globalStats.incomplete.toLocaleString()}</p>
        </button>
      </div>

      {/* Filters + Table */}
      <Card>
        <CardContent className="p-0">
          {/* Search bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Buscar por nombre o número de cliente..."
                    className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-[#3E667D] focus:ring-1 focus:ring-[#3E667D] outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-[#3E667D] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f5165] transition-colors"
                >
                  Buscar
                </button>
              </form>
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => { setParams({ status: 'all', search: null, page: '1' }); setSearchInput(''); }}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Limpiar filtros
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-gray-600 hover:bg-gray-50 transition-colors"
                  title="Actualizar"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoading && !data ? (
            <div className="p-6 space-y-3">
              {[0, 1, 2, 3, 4].map((i) => <div key={i} className="animate-pulse h-14 bg-gray-100 rounded" />)}
            </div>
          ) : distributors.length === 0 ? (
            <div className="py-12 text-center">
              <DocumentArrowUpIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No se encontraron distribuidores</h3>
              <p className="text-sm text-gray-500">Intenta ajustar los filtros de búsqueda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Distribuidor</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Progreso</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">INE</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">RFC</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Cuenta</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Estatus</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {distributors.map((d) => (
                    <Fragment key={d.id}>
                      <tr
                        className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${expandedId === d.id ? 'bg-[#3E667D]/5' : ''}`}
                        onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                      >
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">{d.name}</p>
                          <p className="text-xs text-gray-500">
                            #{d.customerNumber || '—'}
                            {d.email && <span className="ml-2 text-gray-400">{d.email}</span>}
                          </p>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${d.completedCount === 9 ? 'bg-emerald-500' : d.completedCount >= 6 ? 'bg-amber-500' : 'bg-red-400'}`}
                                style={{ width: `${(d.completedCount / 9) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-500">{d.completedCount}/9</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center"><div className="flex justify-center"><DocStatusDot uploaded={d.documents.ine.uploaded} status={d.documents.ine.status} /></div></td>
                        <td className="py-3 px-3 text-center"><div className="flex justify-center"><DocStatusDot uploaded={d.documents.taxId.uploaded} status={d.documents.taxId.status} /></div></td>
                        <td className="py-3 px-3 text-center"><div className="flex justify-center"><DocStatusDot uploaded={d.documents.bankStatement.uploaded} status={d.documents.bankStatement.status} /></div></td>
                        <td className="py-3 px-3 text-center"><StatusBadge status={d.overallStatus} /></td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === d.id ? null : d.id); }}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            {expandedId === d.id ? <><ChevronUpIcon className="h-3.5 w-3.5" /> Cerrar</> : <><ChevronDownIcon className="h-3.5 w-3.5" /> Revisar</>}
                          </button>
                        </td>
                      </tr>
                      {expandedId === d.id && (
                        <tr>
                          <td colSpan={7} className="p-0">
                            <DistributorDetail customerId={d.id} onValidated={() => refetch()} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {distributors.length > 0 && (
            <DataTablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={totalItems}
              isLoading={isLoading || isFetching}
              onPageChange={(p) => setParams({ page: String(p) })}
              onPageSizeChange={(size) => setParams({ limit: String(size), page: '1' })}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
