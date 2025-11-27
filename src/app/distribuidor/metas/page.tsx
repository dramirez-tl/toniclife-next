'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ChartBarIcon,
  TrophyIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FlagIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

const mockGoals = [
  {
    id: '1',
    title: 'Alcanzar $50,000 en Ventas',
    category: 'Ventas',
    target: 50000,
    current: 45000,
    unit: 'MXN',
    deadline: '2025-01-31',
    priority: 'high',
    status: 'in_progress',
    progress: 90,
    isMonthly: true,
  },
  {
    id: '2',
    title: 'Reclutar 5 Nuevos Distribuidores',
    category: 'Equipo',
    target: 5,
    current: 3,
    unit: 'personas',
    deadline: '2025-01-31',
    priority: 'high',
    status: 'in_progress',
    progress: 60,
    isMonthly: true,
  },
  {
    id: '3',
    title: 'Ascender a Rango Diamond',
    category: 'Rango',
    target: 75000,
    current: 45000,
    unit: 'MXN',
    deadline: '2025-03-31',
    priority: 'medium',
    status: 'in_progress',
    progress: 60,
    isMonthly: false,
  },
  {
    id: '4',
    title: 'Completar Curso de Liderazgo',
    category: 'Capacitación',
    target: 10,
    current: 10,
    unit: 'lecciones',
    deadline: '2025-01-20',
    priority: 'low',
    status: 'completed',
    progress: 100,
    isMonthly: false,
    completedDate: '2025-01-18',
  },
  {
    id: '5',
    title: 'Cerrar 45 Pedidos',
    category: 'Ventas',
    target: 45,
    current: 38,
    unit: 'pedidos',
    deadline: '2025-01-31',
    priority: 'medium',
    status: 'in_progress',
    progress: 84,
    isMonthly: true,
  },
  {
    id: '6',
    title: 'Generar 100 Prospectos',
    category: 'Prospección',
    target: 100,
    current: 67,
    unit: 'prospectos',
    deadline: '2025-01-31',
    priority: 'medium',
    status: 'in_progress',
    progress: 67,
    isMonthly: true,
  },
];

const goalCategories = ['Todas', 'Ventas', 'Equipo', 'Rango', 'Capacitación', 'Prospección'];
const priorityConfig = {
  high: { label: 'Alta', color: 'bg-red-100 text-red-800' },
  medium: { label: 'Media', color: 'bg-yellow-100 text-yellow-800' },
  low: { label: 'Baja', color: 'bg-blue-100 text-blue-800' },
};

export default function MetasPage() {
  const [goals, setGoals] = useState(mockGoals);
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);

  const filteredGoals = goals.filter(goal => {
    if (filterCategory !== 'Todas' && goal.category !== filterCategory) return false;
    if (filterStatus === 'active' && goal.status !== 'in_progress') return false;
    if (filterStatus === 'completed' && goal.status !== 'completed') return false;
    return true;
  });

  const stats = {
    total: goals.length,
    completed: goals.filter(g => g.status === 'completed').length,
    inProgress: goals.filter(g => g.status === 'in_progress').length,
    avgProgress: Math.round(
      goals.filter(g => g.status === 'in_progress').reduce((sum, g) => sum + g.progress, 0) /
      goals.filter(g => g.status === 'in_progress').length
    ),
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoals(goals.filter(g => g.id !== goalId));
    toast.success('Meta eliminada');
  };

  const handleCompleteGoal = (goalId: string) => {
    setGoals(goals.map(g =>
      g.id === goalId
        ? { ...g, status: 'completed' as const, progress: 100, current: g.target, completedDate: new Date().toISOString() }
        : g
    ));
    toast.success('¡Meta completada! 🎉', {
      description: 'Sigue así, vas por buen camino',
    });
  };

  const getDaysRemaining = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FlagIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Seguimiento de Metas</h1>
              </div>
              <p className="text-white/80 text-lg">
                Planifica y alcanza tus objetivos
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/distribuidor">
                <Button variant="secondary">
                  Volver al Dashboard
                </Button>
              </Link>
              <Button
                variant="primary"
                leftIcon={<PlusIcon className="h-5 w-5" />}
                onClick={() => setShowAddGoalModal(true)}
              >
                Nueva Meta
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
                  <p className="text-sm text-gray-600 mb-1">Metas Totales</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <FlagIcon className="h-12 w-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#7AB82E] to-[#7AB82E]/90 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 mb-1">Completadas</p>
                  <p className="text-3xl font-bold">{stats.completed}</p>
                </div>
                <CheckCircleSolidIcon className="h-12 w-12 text-white/80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">En Progreso</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.inProgress}</p>
                </div>
                <ClockIcon className="h-12 w-12 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Progreso Promedio</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.avgProgress}%</p>
                </div>
                <ChartBarIcon className="h-12 w-12 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría
                </label>
                <div className="flex flex-wrap gap-2">
                  {goalCategories.map(category => (
                    <button
                      key={category}
                      onClick={() => setFilterCategory(category)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        filterCategory === category
                          ? 'bg-[#003B7A] text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                >
                  <option value="all">Todas</option>
                  <option value="active">Activas</option>
                  <option value="completed">Completadas</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {filteredGoals.map((goal) => {
            const priority = priorityConfig[goal.priority as keyof typeof priorityConfig];
            const daysRemaining = getDaysRemaining(goal.deadline);
            const isOverdue = daysRemaining < 0 && goal.status !== 'completed';
            const isNearDeadline = daysRemaining <= 7 && daysRemaining >= 0 && goal.status !== 'completed';

            return (
              <Card key={goal.id} className={`hover:shadow-lg transition-shadow ${
                goal.status === 'completed' ? 'border-2 border-green-200' : ''
              }`}>
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-gray-900 text-lg">{goal.title}</h3>
                        {goal.status === 'completed' && (
                          <CheckCircleSolidIcon className="h-6 w-6 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {goal.category}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${priority.color}`}>
                          {priority.label}
                        </span>
                        {goal.isMonthly && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            📅 Mensual
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {goal.current.toLocaleString('es-MX')} / {goal.target.toLocaleString('es-MX')} {goal.unit}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {goal.progress}%
                      </span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          goal.status === 'completed'
                            ? 'bg-green-500'
                            : goal.progress >= 75
                            ? 'bg-[#7AB82E]'
                            : goal.progress >= 50
                            ? 'bg-yellow-500'
                            : 'bg-orange-500'
                        }`}
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Deadline Info */}
                  <div className={`flex items-center gap-2 text-sm mb-4 p-3 rounded-lg ${
                    goal.status === 'completed'
                      ? 'bg-green-50 text-green-800'
                      : isOverdue
                      ? 'bg-red-50 text-red-800'
                      : isNearDeadline
                      ? 'bg-yellow-50 text-yellow-800'
                      : 'bg-gray-50 text-gray-700'
                  }`}>
                    <CalendarIcon className="h-4 w-4" />
                    {goal.status === 'completed' ? (
                      <span>
                        Completada el {goal.completedDate && new Date(goal.completedDate).toLocaleDateString('es-MX')}
                      </span>
                    ) : isOverdue ? (
                      <span className="font-medium">Vencida hace {Math.abs(daysRemaining)} días</span>
                    ) : (
                      <span>
                        Fecha límite: {new Date(goal.deadline).toLocaleDateString('es-MX')}
                        <span className="font-medium ml-1">
                          ({daysRemaining} {daysRemaining === 1 ? 'día' : 'días'} restantes)
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {goal.status === 'in_progress' && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          leftIcon={<CheckCircleIcon className="h-4 w-4" />}
                          onClick={() => handleCompleteGoal(goal.id)}
                        >
                          Marcar Completada
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<PencilIcon className="h-4 w-4" />}
                          onClick={() => toast.info('Función próximamente disponible')}
                        >
                          Editar
                        </Button>
                      </>
                    )}
                    {goal.status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        leftIcon={<TrophyIcon className="h-4 w-4" />}
                        disabled
                      >
                        ¡Completada!
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<TrashIcon className="h-4 w-4" />}
                      onClick={() => handleDeleteGoal(goal.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Add Goal Modal */}
        {showAddGoalModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Nueva Meta</h2>
                  <button
                    onClick={() => setShowAddGoalModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Título de la Meta
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Alcanzar $100,000 en ventas"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Categoría
                      </label>
                      <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent">
                        <option value="Ventas">Ventas</option>
                        <option value="Equipo">Equipo</option>
                        <option value="Rango">Rango</option>
                        <option value="Capacitación">Capacitación</option>
                        <option value="Prospección">Prospección</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prioridad
                      </label>
                      <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent">
                        <option value="high">Alta</option>
                        <option value="medium">Media</option>
                        <option value="low">Baja</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Meta (Objetivo)
                      </label>
                      <input
                        type="number"
                        placeholder="50000"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unidad
                      </label>
                      <input
                        type="text"
                        placeholder="MXN / personas / pedidos"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Progreso Actual
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        defaultValue="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha Límite
                      </label>
                      <input
                        type="date"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isMonthly"
                      className="w-4 h-4 text-[#7AB82E] border-gray-300 rounded focus:ring-[#7AB82E]"
                    />
                    <label htmlFor="isMonthly" className="text-sm text-gray-700">
                      Meta mensual recurrente
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowAddGoalModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => {
                      toast.success('Meta creada exitosamente');
                      setShowAddGoalModal(false);
                    }}
                  >
                    Crear Meta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
