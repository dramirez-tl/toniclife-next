'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTable, type DataTableColumn } from '@/components/ui';
import { Loader2 } from 'lucide-react';
import {
  CalendarDaysIcon,
  PlusIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  LockClosedIcon,
  LockOpenIcon,
  BoltIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  usePeriods,
  useCurrentPeriod,
  usePeriodPreview,
  useCreatePeriod,
  useUpdatePeriod,
  useGeneratePeriods,
  useClosePeriod,
  useReopenPeriod,
} from '@/hooks/useMlmPeriods';
import type {
  MlmPeriod,
  CreatePeriodDto,
  UpdatePeriodDto,
  PeriodPreview,
} from '@/types/mlm-periods';

export default function PeriodosPage() {
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<MlmPeriod | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreatePeriodDto>({
    code: '',
    name: '',
    startDate: '',
    endDate: '',
  });

  // Hooks
  const { data: periods, isLoading } = usePeriods();
  const { data: currentPeriod } = useCurrentPeriod();
  const createMutation = useCreatePeriod();
  const updateMutation = useUpdatePeriod();
  const generateMutation = useGeneratePeriods();
  const closeMutation = useClosePeriod();
  const reopenMutation = useReopenPeriod();

  const resetForm = () => {
    setFormData({ code: '', name: '', startDate: '', endDate: '' });
    setEditingPeriod(null);
    setShowForm(false);
  };

  const handleEdit = (period: MlmPeriod) => {
    setEditingPeriod(period);
    setFormData({
      code: period.code,
      name: period.name,
      startDate: period.startDate.split('T')[0],
      endDate: period.endDate.split('T')[0],
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPeriod) {
        await updateMutation.mutateAsync({ id: editingPeriod.id, dto: formData as UpdatePeriodDto });
        toast.success('Periodo actualizado correctamente');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Periodo creado correctamente');
      }
      resetForm();
    } catch {
      toast.error(editingPeriod ? 'Error al actualizar el periodo' : 'Error al crear el periodo');
    }
  };

  const handleGenerate = async () => {
    try {
      await generateMutation.mutateAsync();
      toast.success('Periodos generados correctamente');
    } catch {
      toast.error('Error al generar periodos');
    }
  };

  const handleClose = async (id: string) => {
    try {
      await closeMutation.mutateAsync(id);
      toast.success('Periodo cerrado correctamente');
    } catch {
      toast.error('Error al cerrar el periodo');
    }
  };

  const handleReopen = async (id: string) => {
    try {
      await reopenMutation.mutateAsync(id);
      toast.success('Periodo reabierto correctamente');
    } catch {
      toast.error('Error al reabrir el periodo');
    }
  };

  const formatDate = (dateString: string) => {
    const [y, m, d] = dateString.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (period: MlmPeriod) => {
    const status = period.status || (period.isClosed ? 'closed' : 'open');
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Abierto
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <ArrowPathIcon className="h-3 w-3 animate-spin" />
            Procesando
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Pagado
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
            <LockClosedIcon className="h-3 w-3" />
            Cerrado
          </span>
        );
      default:
        return null;
    }
  };

  // Stats
  const totalPeriods = periods?.length || 0;
  const openPeriods = periods?.filter((p) => !p.isClosed).length || 0;
  const closedPeriods = periods?.filter((p) => p.isClosed).length || 0;

  const columns = useMemo<DataTableColumn<MlmPeriod>[]>(
    () => [
      {
        key: 'code',
        header: 'Codigo',
        render: (period) => (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {period.code}
          </span>
        ),
      },
      {
        key: 'name',
        header: 'Nombre',
        cellClassName: 'text-sm font-medium text-gray-900',
        render: (period) => period.name,
      },
      {
        key: 'startDate',
        header: 'Fecha Inicio',
        cellClassName: 'text-sm text-gray-700',
        render: (period) => formatDate(period.startDate),
      },
      {
        key: 'endDate',
        header: 'Fecha Fin',
        cellClassName: 'text-sm text-gray-700',
        render: (period) => formatDate(period.endDate),
      },
      {
        key: 'status',
        header: 'Estado',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        render: (period) => getStatusBadge(period),
      },
      {
        key: 'actions',
        header: 'Acciones',
        headerClassName: 'text-center',
        render: (period) => (
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleEdit(period)}>
              <PencilSquareIcon className="h-4 w-4" />
              Editar
            </Button>
            {!period.isClosed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleClose(period.id)}
                disabled={closeMutation.isPending}
              >
                {closeMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                <LockClosedIcon className="h-4 w-4" />
                Cerrar
              </Button>
            )}
            {period.isClosed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReopen(period.id)}
                disabled={reopenMutation.isPending}
              >
                {reopenMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                <LockOpenIcon className="h-4 w-4" />
                Reabrir
              </Button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [closeMutation.isPending, reopenMutation.isPending],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CalendarDaysIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Periodos MLM</h1>
              </div>
              <p className="text-white/80 text-lg">
                Administra los periodos de comisiones y calificacion
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin">
                <Button variant="secondary">Volver al Panel Principal</Button>
              </Link>
              <Button
                variant="secondary"
                onClick={() => setShowPreview((v) => !v)}
                aria-expanded={showPreview}
              >
                <EyeIcon className="h-5 w-5" />
                {showPreview ? 'Ocultar previsualización' : 'Previsualizar cierres'}
              </Button>
              <Button
                variant="default"
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                <BoltIcon className="h-5 w-5" />
                Generar Periodos
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
              >
                <PlusIcon className="h-5 w-5" />
                Nuevo Periodo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Periodos</p>
                  <p className="text-3xl font-bold text-[#3E667D]">{totalPeriods}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <CalendarDaysIcon className="h-6 w-6 text-[#3E667D]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Abiertos</p>
                  <p className="text-3xl font-bold text-green-600">{openPeriods}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Cerrados</p>
                  <p className="text-3xl font-bold text-gray-500">{closedPeriods}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <LockClosedIcon className="h-6 w-6 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Periodo Actual</p>
                  <p className="text-lg font-bold text-[#3E667D] truncate">
                    {currentPeriod?.name || 'N/A'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-6 w-6 text-[#3E667D]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Previsualización de cierres (regla día hábil) */}
        {showPreview && <PeriodPreviewSection />}

        {/* Create/Edit Form */}
        {showForm && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {editingPeriod ? 'Editar Periodo' : 'Nuevo Periodo'}
              </h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Codigo</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="02-2026"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Febrero 2026"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    required
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-3 mt-2">
                  <Button variant="ghost" type="button" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button
                    variant="default"
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {editingPeriod ? 'Actualizar' : 'Crear Periodo'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Periods Table */}
        <Card>
          <CardContent className="p-0">
            <DataTable<MlmPeriod>
              columns={columns}
              data={periods || []}
              getRowKey={(period) => period.id}
              isLoading={isLoading}
              loadingRows={6}
              emptyState={
                <>
                  <CalendarDaysIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No se encontraron periodos
                  </h3>
                  <p className="text-gray-600">
                    Crea un periodo manualmente o genera periodos automaticamente
                  </p>
                </>
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Sección sutil de previsualización: proyecta los 12 periodos de un año con la
 * regla de cierre en día hábil (si el 25 cae domingo/festivo, el corte se
 * recorre). No persiste nada — solo lee el endpoint /mlm/periods/preview.
 */
function PeriodPreviewSection() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const { data, isLoading } = usePeriodPreview(year);

  const monthLabel = (name: string) => name.replace(/\s*\d{4}$/, '');
  const fmtShort = (dateString: string) => {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    });
  };

  const shiftedCount = data?.filter((p) => p.shifted).length ?? 0;

  const renderDbState = (p: PeriodPreview) => {
    if (!p.existsInDb) {
      return <span className="text-xs text-gray-400">Sin generar</span>;
    }
    if (p.matchesRule) {
      return <Badge variant="success">OK</Badge>;
    }
    if (p.isClosed) {
      return (
        <Badge variant="secondary" title="Periodo cerrado: histórico, no se recalcula">
          Histórico
        </Badge>
      );
    }
    return (
      <Badge variant="warning" title="Las fechas guardadas no coinciden con la regla">
        No coincide
      </Badge>
    );
  };

  return (
    <Card className="mb-6 border-dashed">
      <CardContent className="p-6">
        <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Previsualización de cierres</h3>
            <p className="max-w-2xl text-sm text-gray-600">
              Proyección de los 12 periodos del año con la regla de día hábil. Si el día 25
              cae en domingo o festivo, el cierre se recorre al siguiente día hábil y el
              periodo siguiente arranca contiguo. No modifica nada.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setYear((y) => y - 1)}
              aria-label="Año anterior"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <span className="min-w-[3.5rem] text-center text-lg font-semibold text-[#3E667D]">
              {year}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setYear((y) => y + 1)}
              aria-label="Año siguiente"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="mb-4 text-xs text-gray-500">
          {isLoading
            ? 'Calculando…'
            : shiftedCount === 0
              ? 'Ningún cierre se recorre este año.'
              : `${shiftedCount} cierre${shiftedCount === 1 ? '' : 's'} se ${
                  shiftedCount === 1 ? 'recorre' : 'recorren'
                } este año.`}
        </p>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periodo</TableHead>
                <TableHead>Cierre nominal</TableHead>
                <TableHead>Inicio → Fin efectivo</TableHead>
                <TableHead>Recorrido</TableHead>
                <TableHead className="text-right">En BD</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                    <Loader2 className="mr-2 inline size-4 animate-spin" />
                    Cargando…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                data?.map((p) => (
                  <TableRow key={p.code} className={p.shifted ? 'bg-amber-50/60' : undefined}>
                    <TableCell className="font-medium text-gray-900">
                      {monthLabel(p.name)}
                    </TableCell>
                    <TableCell className="text-gray-600">{fmtShort(p.nominalEndDate)}</TableCell>
                    <TableCell className="text-gray-700">
                      {fmtShort(p.startDate)} →{' '}
                      <span className="font-medium">{fmtShort(p.endDate)}</span>
                    </TableCell>
                    <TableCell>
                      {p.shifted ? (
                        <Badge variant="warning">
                          +{p.shiftDays}d · {p.reason}
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{renderDbState(p)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
