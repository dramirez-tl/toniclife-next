'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  usePeriods,
  useCurrentPeriod,
  useCreatePeriod,
  useUpdatePeriod,
  useGeneratePeriods,
  useClosePeriod,
  useReopenPeriod,
} from '@/hooks/useMlmPeriods';
import type { MlmPeriod, CreatePeriodDto, UpdatePeriodDto } from '@/types/mlm-periods';

export default function PeriodosPage() {
  const [showForm, setShowForm] = useState(false);
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
        {isLoading ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <div className="inline-block w-12 h-12 border-4 border-[#3E667D] border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600">Cargando periodos...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Codigo</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Nombre</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Fecha Inicio</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Fecha Fin</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">Estado</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(periods || []).length > 0 ? (
                      (periods || []).map((period) => (
                        <tr key={period.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {period.code}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">{period.name}</td>
                          <td className="py-3 px-4 text-sm text-gray-700">{formatDate(period.startDate)}</td>
                          <td className="py-3 px-4 text-sm text-gray-700">{formatDate(period.endDate)}</td>
                          <td className="py-3 px-4 text-center">{getStatusBadge(period)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(period)}
                              >
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
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <CalendarDaysIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            No se encontraron periodos
                          </h3>
                          <p className="text-gray-600">
                            Crea un periodo manualmente o genera periodos automaticamente
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
