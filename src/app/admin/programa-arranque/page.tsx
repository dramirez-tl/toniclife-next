'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PermissionGuard } from '@/components/auth';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import {
  useStartupPrograms,
  useCreateProgram,
  useUpdateProgram,
  useChangeStatus,
  useDeleteProgram,
} from '@/hooks/useStartupProgram';
import type {
  ProgramConfig,
  ProgramStatus,
  CreateProgramDto,
  UpdateProgramDto,
  MultilevelBonusRule,
} from '@/types/startup-program';
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  RocketLaunchIcon,
  GlobeAmericasIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ProgramStatus, string> = {
  draft: 'Borrador',
  active: 'Activo',
  paused: 'Pausado',
  ended: 'Terminado',
};

const STATUS_BADGE_VARIANT: Record<ProgramStatus, 'default' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  active: 'success',
  paused: 'warning',
  ended: 'error',
};

const COUNTRY_OPTIONS = [
  { value: 'MX', label: 'Mexico', currency: 'MXN' },
  { value: 'US', label: 'Estados Unidos', currency: 'USD' },
];

const DEFAULT_MULTILEVEL_RULES: MultilevelBonusRule[] = [
  { level: 1, amount: 350 },
  { level: 2, amount: 300 },
  { level: 3, amount: 200 },
];

const inputClassName =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003B7A] focus:border-transparent';

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ProgramaArranquePage() {
  return (
    <PermissionGuard permissions={['startup-program:read', 'startup-program:*']}>
      <ProgramaArranqueContent />
    </PermissionGuard>
  );
}

function ProgramaArranqueContent() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ProgramStatus | ''>('');
  const [countryFilter, setCountryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramConfig | null>(null);

  const { data: programsData, isLoading } = useStartupPrograms({
    page,
    limit: 20,
    status: statusFilter || undefined,
    countryCode: countryFilter || undefined,
  });

  const createMutation = useCreateProgram();
  const updateMutation = useUpdateProgram();
  const changeStatusMutation = useChangeStatus();
  const deleteMutation = useDeleteProgram();

  const programs = programsData?.data ?? [];
  const totalPages = programsData?.totalPages ?? 0;

  const handleCreate = () => {
    setEditingProgram(null);
    setShowModal(true);
  };

  const handleEdit = (program: ProgramConfig) => {
    setEditingProgram(program);
    setShowModal(true);
  };

  const handleSave = async (formData: CreateProgramDto | UpdateProgramDto) => {
    try {
      if (editingProgram) {
        await updateMutation.mutateAsync({ id: editingProgram.id, dto: formData as UpdateProgramDto });
        toast.success('Programa actualizado correctamente');
      } else {
        await createMutation.mutateAsync(formData as CreateProgramDto);
        toast.success('Programa creado correctamente');
      }
      setShowModal(false);
      setEditingProgram(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      toast.error(msg);
    }
  };

  const handleChangeStatus = async (id: string, status: ProgramStatus) => {
    try {
      await changeStatusMutation.mutateAsync({ id, status });
      toast.success(`Estado cambiado a "${STATUS_LABELS[status]}"`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar estado';
      toast.error(msg);
    }
  };

  const handleDelete = async (program: ProgramConfig) => {
    if (!confirm(`¿Eliminar el programa "${program.name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(program.id);
      toast.success('Programa eliminado');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar';
      toast.error(msg);
    }
  };

  const formatCurrency = (amount: string | number, currency: string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    const symbol = currency === 'USD' ? 'US$' : '$';
    return `${symbol}${num.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <RocketLaunchIcon className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">Programas de Arranque</h1>
                <p className="text-blue-200 text-sm">
                  Configura programas de bonos por reclutamiento con Kit Prosperity
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <ArrowLeftIcon className="h-4 w-4 mr-1" />
                  Volver
                </Button>
              </Link>
              <Button variant="primary" size="sm" onClick={handleCreate}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Nuevo Programa
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Programas"
            value={programsData?.total ?? 0}
            icon={<RocketLaunchIcon className="h-5 w-5 text-[#003B7A]" />}
          />
          <StatCard
            label="Activos"
            value={programs.filter((p) => p.status === 'active').length}
            icon={<PlayIcon className="h-5 w-5 text-[#7AB82E]" />}
          />
          <StatCard
            label="Paises"
            value={[...new Set(programs.map((p) => p.countryCode))].length}
            icon={<GlobeAmericasIcon className="h-5 w-5 text-[#003B7A]" />}
          />
          <StatCard
            label="En Borrador"
            value={programs.filter((p) => p.status === 'draft').length}
            icon={<PencilSquareIcon className="h-5 w-5 text-amber-500" />}
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as ProgramStatus | ''); setPage(1); }}
                className={`${inputClassName} max-w-[180px]`}
              >
                <option value="">Todos los estados</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              <select
                value={countryFilter}
                onChange={(e) => { setCountryFilter(e.target.value); setPage(1); }}
                className={`${inputClassName} max-w-[180px]`}
              >
                <option value="">Todos los paises</option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Programs Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Cargando programas...</div>
            ) : programs.length === 0 ? (
              <div className="p-12 text-center">
                <RocketLaunchIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No hay programas configurados</p>
                <Button variant="primary" size="sm" onClick={handleCreate}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Crear Primer Programa
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Programa</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Pais</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Bono Directo</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Quinto</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha Inicio</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {programs.map((program) => (
                        <tr key={program.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <Link href={`/admin/programa-arranque/${program.id}`} className="hover:underline">
                              <div className="font-medium text-gray-900">{program.name}</div>
                              <div className="text-xs text-gray-500">{program.code}</div>
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-gray-700">
                              <GlobeAmericasIcon className="h-4 w-4" />
                              {program.countryCode} / {program.currencyCode}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={STATUS_BADGE_VARIANT[program.status as ProgramStatus]} size="sm">
                              {STATUS_LABELS[program.status as ProgramStatus]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-700">
                            {formatCurrency(program.directBonusAmount, program.currencyCode)}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-700">
                            {formatCurrency(program.fifthBonusAmount, program.currencyCode)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDaysIcon className="h-4 w-4" />
                              {program.startDate}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(program)}
                                title="Editar"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </Button>

                              {program.status === 'draft' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleChangeStatus(program.id, 'active')}
                                  title="Activar"
                                  className="text-[#7AB82E]"
                                >
                                  <PlayIcon className="h-4 w-4" />
                                </Button>
                              )}

                              {program.status === 'active' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleChangeStatus(program.id, 'paused')}
                                    title="Pausar"
                                    className="text-amber-500"
                                  >
                                    <PauseIcon className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleChangeStatus(program.id, 'ended')}
                                    title="Terminar"
                                    className="text-red-500"
                                  >
                                    <StopIcon className="h-4 w-4" />
                                  </Button>
                                </>
                              )}

                              {program.status === 'paused' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleChangeStatus(program.id, 'active')}
                                    title="Reactivar"
                                    className="text-[#7AB82E]"
                                  >
                                    <PlayIcon className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleChangeStatus(program.id, 'ended')}
                                    title="Terminar"
                                    className="text-red-500"
                                  >
                                    <StopIcon className="h-4 w-4" />
                                  </Button>
                                </>
                              )}

                              {program.status !== 'active' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(program)}
                                  title="Eliminar"
                                  className="text-red-500"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                    <span className="text-sm text-gray-500">
                      Pagina {page} de {totalPages} ({programsData?.total} programas)
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <ProgramFormModal
          program={editingProgram}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingProgram(null); }}
          isSaving={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gray-50">{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Form Modal ─────────────────────────────────────────────────────────────

function ProgramFormModal({
  program,
  onSave,
  onClose,
  isSaving,
}: {
  program: ProgramConfig | null;
  onSave: (data: CreateProgramDto | UpdateProgramDto) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const isEditing = !!program;

  const [code, setCode] = useState(program?.code ?? '');
  const [name, setName] = useState(program?.name ?? '');
  const [description, setDescription] = useState(program?.description ?? '');
  const [countryCode, setCountryCode] = useState(program?.countryCode ?? 'MX');
  const [currencyCode, setCurrencyCode] = useState(program?.currencyCode ?? 'MXN');
  const [startDate, setStartDate] = useState(program?.startDate ?? '');
  const [endDate, setEndDate] = useState(program?.endDate ?? '');
  const [qualifyingKitMinPrice, setQualifyingKitMinPrice] = useState(
    program?.qualifyingKitMinPrice ?? '5000',
  );
  const [directBonusAmount, setDirectBonusAmount] = useState(
    program?.directBonusAmount ?? '1000',
  );
  const [fifthBonusEveryN, setFifthBonusEveryN] = useState(program?.fifthBonusEveryN ?? 5);
  const [fifthBonusAmount, setFifthBonusAmount] = useState(
    program?.fifthBonusAmount ?? '5000',
  );
  const [multilevelRules, setMultilevelRules] = useState<MultilevelBonusRule[]>(
    program?.multilevelBonusRules?.length ? program.multilevelBonusRules : DEFAULT_MULTILEVEL_RULES,
  );
  const [multilevelMinPoints, setMultilevelMinPoints] = useState(
    program?.multilevelMinPersonalPoints ?? '3300',
  );
  const [multilevelMinDirects, setMultilevelMinDirects] = useState(
    program?.multilevelMinQualifiedDirects ?? 5,
  );
  const [retentionMonths, setRetentionMonths] = useState(program?.retentionEvaluationMonths ?? 1);
  const [alertRecruits, setAlertRecruits] = useState(
    program?.alertAtRecruits?.join(', ') ?? '3, 5',
  );

  const handleCountryChange = (value: string) => {
    setCountryCode(value);
    const country = COUNTRY_OPTIONS.find((c) => c.value === value);
    if (country) setCurrencyCode(country.currency);
  };

  const handleMultilevelRuleChange = (index: number, field: 'level' | 'amount', value: number) => {
    const updated = [...multilevelRules];
    updated[index] = { ...updated[index], [field]: value };
    setMultilevelRules(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const alertArray = alertRecruits
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    if (isEditing) {
      const dto: UpdateProgramDto = {
        name,
        description: description || undefined,
        startDate,
        endDate: endDate || null,
        qualifyingKitMinPrice: parseFloat(qualifyingKitMinPrice),
        directBonusAmount: parseFloat(directBonusAmount),
        fifthBonusEveryN,
        fifthBonusAmount: parseFloat(fifthBonusAmount),
        multilevelBonusRules: multilevelRules,
        multilevelMinPersonalPoints: parseFloat(multilevelMinPoints),
        multilevelMinQualifiedDirects: multilevelMinDirects,
        retentionEvaluationMonths: retentionMonths,
        alertAtRecruits: alertArray,
      };
      onSave(dto);
    } else {
      const dto: CreateProgramDto = {
        code,
        name,
        description: description || undefined,
        countryCode,
        currencyCode,
        startDate,
        qualifyingKitMinPrice: parseFloat(qualifyingKitMinPrice),
        directBonusAmount: parseFloat(directBonusAmount),
        fifthBonusEveryN,
        fifthBonusAmount: parseFloat(fifthBonusAmount),
        multilevelBonusRules: multilevelRules,
        multilevelMinPersonalPoints: parseFloat(multilevelMinPoints),
        multilevelMinQualifiedDirects: multilevelMinDirects,
        retentionEvaluationMonths: retentionMonths,
        alertAtRecruits: alertArray,
        ...(endDate ? { endDate } : {}),
      };
      onSave(dto);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 mb-10">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {isEditing ? 'Editar Programa' : 'Nuevo Programa de Arranque'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Basic Info */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-gray-700 mb-2">Informacion General</legend>
            <div className="grid grid-cols-2 gap-3">
              {!isEditing && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Codigo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ARRANQUE_MX_2026"
                    required
                    className={inputClassName}
                  />
                </div>
              )}
              <div className={isEditing ? 'col-span-2' : ''}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Programa de Arranque Rapido - Mexico 2026"
                  required
                  className={inputClassName}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripcion</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className={inputClassName}
              />
            </div>
          </fieldset>

          {/* Country & Dates */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-gray-700 mb-2">Ambito y Fechas</legend>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pais</label>
                <select
                  value={countryCode}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  disabled={isEditing}
                  className={inputClassName}
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Inicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fin (opcional)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputClassName}
                />
              </div>
            </div>
          </fieldset>

          {/* Bonus Configuration */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-gray-700 mb-2">
              <CurrencyDollarIcon className="h-4 w-4 inline mr-1" />
              Bonos de Reclutamiento
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Precio minimo Kit ({currencyCode})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={qualifyingKitMinPrice}
                  onChange={(e) => setQualifyingKitMinPrice(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Bono directo ({currencyCode})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={directBonusAmount}
                  onChange={(e) => setDirectBonusAmount(e.target.value)}
                  className={inputClassName}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Quinto cada N inscritos
                </label>
                <input
                  type="number"
                  min="1"
                  value={fifthBonusEveryN}
                  onChange={(e) => setFifthBonusEveryN(parseInt(e.target.value, 10) || 5)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Bono quinto estudio ({currencyCode})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fifthBonusAmount}
                  onChange={(e) => setFifthBonusAmount(e.target.value)}
                  className={inputClassName}
                />
              </div>
            </div>
          </fieldset>

          {/* Multilevel Rules */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-gray-700 mb-2">Bonos Multinivel</legend>
            <div className="space-y-2">
              {multilevelRules.map((rule, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-16">Nivel {rule.level}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rule.amount}
                    onChange={(e) => handleMultilevelRuleChange(i, 'amount', parseFloat(e.target.value) || 0)}
                    className={`${inputClassName} max-w-[140px]`}
                  />
                  <span className="text-xs text-gray-400">{currencyCode}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Puntos personales minimos
                </label>
                <input
                  type="number"
                  min="0"
                  value={multilevelMinPoints}
                  onChange={(e) => setMultilevelMinPoints(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Directos calificados minimos
                </label>
                <input
                  type="number"
                  min="0"
                  value={multilevelMinDirects}
                  onChange={(e) => setMultilevelMinDirects(parseInt(e.target.value, 10) || 0)}
                  className={inputClassName}
                />
              </div>
            </div>
          </fieldset>

          {/* Retention & Alerts */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-gray-700 mb-2">Retencion y Alertas</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Meses evaluacion retencion
                </label>
                <input
                  type="number"
                  min="1"
                  value={retentionMonths}
                  onChange={(e) => setRetentionMonths(parseInt(e.target.value, 10) || 1)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Alertas en inscritos (separar con coma)
                </label>
                <input
                  type="text"
                  value={alertRecruits}
                  onChange={(e) => setAlertRecruits(e.target.value)}
                  placeholder="3, 5, 10"
                  className={inputClassName}
                />
              </div>
            </div>
          </fieldset>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Programa'}
          </Button>
        </div>
      </div>
    </div>
  );
}
