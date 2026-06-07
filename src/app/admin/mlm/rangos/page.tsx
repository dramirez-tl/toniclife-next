'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import {
  TrophyIcon,
  PlusIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useRanks, useCreateRank, useUpdateRank, useCalculateRanks } from '@/hooks/useMlmRanks';
import type { MlmRank, CreateRankDto, UpdateRankDto } from '@/types/mlm-ranks';

export default function RangosPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingRank, setEditingRank] = useState<MlmRank | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState<CreateRankDto>({
    code: '',
    name: '',
    rankNumber: 0,
    pointsPersonalRequired: 0,
    pointsGroupRequired: 0,
    qualifiersFirstLevel: 0,
  });
  const [formIsActive, setFormIsActive] = useState(true);

  // Hooks
  const { data: ranks, isLoading } = useRanks();
  const createMutation = useCreateRank();
  const updateMutation = useUpdateRank();
  const calculateMutation = useCalculateRanks();

  // Filter ranks by search
  const filteredRanks = (ranks || []).filter(
    (rank) =>
      rank.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rank.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      rankNumber: 0,
      pointsPersonalRequired: 0,
      pointsGroupRequired: 0,
      qualifiersFirstLevel: 0,
    });
    setFormIsActive(true);
    setEditingRank(null);
    setShowForm(false);
  };

  const handleEdit = (rank: MlmRank) => {
    setEditingRank(rank);
    setFormData({
      code: rank.code,
      name: rank.name,
      rankNumber: rank.rankNumber,
      pointsPersonalRequired: rank.pointsPersonalRequired,
      pointsGroupRequired: rank.pointsGroupRequired,
      qualifiersFirstLevel: rank.qualifiersFirstLevel,
      levelMax: rank.levelMax,
      generationMax: rank.generationMax,
      autoBonusMxn: rank.autoBonusMxn,
      autoBonusUsd: rank.autoBonusUsd,
    });
    setFormIsActive(rank.isActive);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRank) {
        const updateDto: UpdateRankDto = {
          name: formData.name,
          pointsPersonalRequired: formData.pointsPersonalRequired,
          pointsGroupRequired: formData.pointsGroupRequired,
          qualifiersFirstLevel: formData.qualifiersFirstLevel,
          levelMax: formData.levelMax,
          generationMax: formData.generationMax,
          autoBonusMxn: formData.autoBonusMxn,
          autoBonusUsd: formData.autoBonusUsd,
          isActive: formIsActive,
        };
        await updateMutation.mutateAsync({ id: editingRank.id, dto: updateDto });
        toast.success('Rango actualizado correctamente');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Rango creado correctamente');
      }
      resetForm();
    } catch {
      toast.error(editingRank ? 'Error al actualizar el rango' : 'Error al crear el rango');
    }
  };

  const handleCalculate = async () => {
    try {
      await calculateMutation.mutateAsync();
      toast.success('Calculo de rangos iniciado');
    } catch {
      toast.error('Error al calcular rangos');
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-MX').format(num);
  };

  // Stats
  const totalRanks = ranks?.length || 0;
  const activeRanks = ranks?.filter((r) => r.isActive).length || 0;
  const inactiveRanks = totalRanks - activeRanks;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <TrophyIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Rangos MLM</h1>
              </div>
              <p className="text-white/80 text-lg">
                Administra los rangos y niveles del sistema multinivel
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin">
                <Button variant="secondary">Volver al Panel Principal</Button>
              </Link>
              <Button
                variant="default"
                onClick={handleCalculate}
                disabled={calculateMutation.isPending}
              >
                {calculateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                <ArrowPathIcon className="h-5 w-5" />
                Calcular Rangos
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
              >
                <PlusIcon className="h-5 w-5" />
                Nuevo Rango
              </Button>
            </div>
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
                  <p className="text-sm text-gray-600 mb-1">Total Rangos</p>
                  <p className="text-3xl font-bold text-[#3E667D]">{totalRanks}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrophyIcon className="h-6 w-6 text-[#3E667D]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Rangos Activos</p>
                  <p className="text-3xl font-bold text-green-600">{activeRanks}</p>
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
                  <p className="text-sm text-gray-600 mb-1">Rangos Inactivos</p>
                  <p className="text-3xl font-bold text-gray-500">{inactiveRanks}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <XCircleIcon className="h-6 w-6 text-gray-500" />
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
                {editingRank ? 'Editar Rango' : 'Nuevo Rango'}
              </h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Codigo</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numero de Rango</label>
                  <input
                    type="number"
                    value={formData.rankNumber}
                    onChange={(e) => setFormData({ ...formData, rankNumber: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    required
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pts. Personales Req.</label>
                  <input
                    type="number"
                    value={formData.pointsPersonalRequired}
                    onChange={(e) => setFormData({ ...formData, pointsPersonalRequired: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    required
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pts. Grupo Req.</label>
                  <input
                    type="number"
                    value={formData.pointsGroupRequired}
                    onChange={(e) => setFormData({ ...formData, pointsGroupRequired: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    required
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Calificados 1er Nivel</label>
                  <input
                    type="number"
                    value={formData.qualifiersFirstLevel}
                    onChange={(e) => setFormData({ ...formData, qualifiersFirstLevel: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    min={0}
                  />
                </div>
                <div className="flex items-end gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#3E667D] focus:ring-[#a7c1e2]"
                    />
                    <span className="text-sm font-medium text-gray-700">Activo</span>
                  </label>
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
                    {editingRank ? 'Actualizar' : 'Crear Rango'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o codigo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
              />
            </div>
          </CardContent>
        </Card>

        {/* Ranks Table */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <div className="inline-block w-12 h-12 border-4 border-[#3E667D] border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600">Cargando rangos...</p>
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
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Rango</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Codigo</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Nombre</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Pts. Personales</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Pts. Grupo</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Calif. 1er Nivel</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">Estado</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRanks.length > 0 ? (
                      filteredRanks
                        .sort((a, b) => a.rankNumber - b.rankNumber)
                        .map((rank) => (
                          <tr key={rank.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#3E667D] text-white text-sm font-bold">
                                {rank.rankNumber}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {rank.code}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">{rank.name}</td>
                            <td className="py-3 px-4 text-sm text-right text-gray-700">{formatNumber(rank.pointsPersonalRequired)}</td>
                            <td className="py-3 px-4 text-sm text-right text-gray-700">{formatNumber(rank.pointsGroupRequired)}</td>
                            <td className="py-3 px-4 text-sm text-right text-gray-700">{rank.qualifiersFirstLevel}</td>
                            <td className="py-3 px-4 text-center">
                              {rank.isActive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                  <CheckCircleIcon className="h-3 w-3" />
                                  Activo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                  <XCircleIcon className="h-3 w-3" />
                                  Inactivo
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(rank)}
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                                Editar
                              </Button>
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-12 text-center">
                          <TrophyIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            No se encontraron rangos
                          </h3>
                          <p className="text-gray-600">
                            {searchQuery ? 'Intenta ajustar tu busqueda' : 'Crea el primer rango para comenzar'}
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
