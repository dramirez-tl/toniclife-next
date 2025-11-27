'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  TrophyIcon,
  FireIcon,
  HeartIcon,
  SparklesIcon,
  ChartBarIcon,
  UserGroupIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  GiftIcon,
  StarIcon as StarOutlineIcon,
} from '@heroicons/react/24/outline';
import {
  StarIcon as StarSolidIcon,
} from '@heroicons/react/24/solid';
import { toast } from 'sonner';

interface Challenge {
  id: string;
  title: string;
  type: 'health' | 'sales' | 'team' | 'personal';
  category: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  startDate: string;
  endDate: string;
  participants: number;
  image: string;
  goal: string;
  progress: number;
  reward: {
    points: number;
    badge?: string;
    prize?: string;
  };
  milestones: {
    percentage: number;
    description: string;
    completed: boolean;
  }[];
  status: 'active' | 'upcoming' | 'completed';
  isJoined: boolean;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  level: string;
  country: string;
  points: number;
  challengesCompleted: number;
  streak: number;
}

export default function ComunidadDesafiosPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed'>('active');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'challenges' | 'leaderboard'>('challenges');

  const challenges: Challenge[] = [
    {
      id: '1',
      title: '30 Días de Bienestar',
      type: 'health',
      category: 'Transformación Personal',
      description: 'Completa 30 días consecutivos registrando tu rutina de wellness con productos Tonic Life',
      difficulty: 'beginner',
      duration: '30 días',
      startDate: '2024-01-01',
      endDate: '2024-01-30',
      participants: 1248,
      image: '/placeholder-challenge-wellness.jpg',
      goal: 'Registrar actividad diaria durante 30 días',
      progress: 65,
      reward: {
        points: 500,
        badge: 'Wellness Warrior',
        prize: '15% descuento en próxima compra'
      },
      milestones: [
        { percentage: 25, description: '7 días consecutivos', completed: true },
        { percentage: 50, description: '15 días consecutivos', completed: true },
        { percentage: 75, description: '22 días consecutivos', completed: false },
        { percentage: 100, description: '30 días consecutivos', completed: false }
      ],
      status: 'active',
      isJoined: true
    },
    {
      id: '2',
      title: 'Mega Ventas Enero',
      type: 'sales',
      category: 'Crecimiento Comercial',
      description: 'Alcanza $10,000 USD en ventas durante el mes de enero',
      difficulty: 'intermediate',
      duration: '31 días',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      participants: 892,
      image: '/placeholder-challenge-sales.jpg',
      goal: '$10,000 USD en ventas',
      progress: 45,
      reward: {
        points: 1000,
        badge: 'Sales Champion',
        prize: 'Bono de $500 USD'
      },
      milestones: [
        { percentage: 25, description: '$2,500 USD', completed: true },
        { percentage: 50, description: '$5,000 USD', completed: false },
        { percentage: 75, description: '$7,500 USD', completed: false },
        { percentage: 100, description: '$10,000 USD', completed: false }
      ],
      status: 'active',
      isJoined: true
    },
    {
      id: '3',
      title: 'Constructor de Equipos',
      type: 'team',
      category: 'Liderazgo',
      description: 'Recluta y activa 5 nuevos distribuidores en tu red',
      difficulty: 'advanced',
      duration: '60 días',
      startDate: '2024-01-01',
      endDate: '2024-03-01',
      participants: 567,
      image: '/placeholder-challenge-team.jpg',
      goal: '5 nuevos distribuidores activos',
      progress: 20,
      reward: {
        points: 1500,
        badge: 'Team Builder',
        prize: 'Viaje a Convención Anual'
      },
      milestones: [
        { percentage: 20, description: '1 distribuidor', completed: true },
        { percentage: 40, description: '2 distribuidores', completed: false },
        { percentage: 60, description: '3 distribuidores', completed: false },
        { percentage: 80, description: '4 distribuidores', completed: false },
        { percentage: 100, description: '5 distribuidores', completed: false }
      ],
      status: 'active',
      isJoined: false
    },
    {
      id: '4',
      title: 'Maestro del Producto',
      type: 'personal',
      category: 'Capacitación',
      description: 'Completa todos los cursos de certificación de productos',
      difficulty: 'intermediate',
      duration: '45 días',
      startDate: '2024-02-01',
      endDate: '2024-03-15',
      participants: 423,
      image: '/placeholder-challenge-training.jpg',
      goal: '10 certificaciones completadas',
      progress: 0,
      reward: {
        points: 750,
        badge: 'Product Master',
        prize: 'Kit de productos premium'
      },
      milestones: [
        { percentage: 30, description: '3 certificaciones', completed: false },
        { percentage: 60, description: '6 certificaciones', completed: false },
        { percentage: 100, description: '10 certificaciones', completed: false }
      ],
      status: 'upcoming',
      isJoined: false
    },
    {
      id: '5',
      title: 'Transformación Diciembre',
      type: 'health',
      category: 'Resultados',
      description: 'Documenta tu transformación completa con fotos antes/después',
      difficulty: 'beginner',
      duration: '90 días',
      startDate: '2023-10-01',
      endDate: '2023-12-31',
      participants: 2156,
      image: '/placeholder-challenge-transformation.jpg',
      goal: 'Transformación documentada',
      progress: 100,
      reward: {
        points: 800,
        badge: 'Transformation Hero',
        prize: '$200 USD en productos'
      },
      milestones: [
        { percentage: 33, description: 'Foto inicial + plan', completed: true },
        { percentage: 66, description: 'Foto intermedia + progreso', completed: true },
        { percentage: 100, description: 'Foto final + testimonial', completed: true }
      ],
      status: 'completed',
      isJoined: true
    },
    {
      id: '6',
      title: 'Racha de Campeón',
      type: 'sales',
      category: 'Consistencia',
      description: 'Realiza al menos una venta cada día durante 21 días',
      difficulty: 'advanced',
      duration: '21 días',
      startDate: '2024-01-10',
      endDate: '2024-01-30',
      participants: 334,
      image: '/placeholder-challenge-streak.jpg',
      goal: '21 días con ventas',
      progress: 38,
      reward: {
        points: 1200,
        badge: 'Champion Streak',
        prize: 'Reconocimiento en newsletter'
      },
      milestones: [
        { percentage: 33, description: '7 días consecutivos', completed: true },
        { percentage: 66, description: '14 días consecutivos', completed: false },
        { percentage: 100, description: '21 días consecutivos', completed: false }
      ],
      status: 'active',
      isJoined: true
    }
  ];

  const leaderboard: LeaderboardEntry[] = [
    {
      rank: 1,
      name: 'María González',
      avatar: '/placeholder-avatar-1.jpg',
      level: 'Diamante',
      country: 'México',
      points: 15840,
      challengesCompleted: 24,
      streak: 45
    },
    {
      rank: 2,
      name: 'Carlos Ramírez',
      avatar: '/placeholder-avatar-2.jpg',
      level: 'Platino',
      country: 'Colombia',
      points: 14230,
      challengesCompleted: 22,
      streak: 38
    },
    {
      rank: 3,
      name: 'Ana Silva',
      avatar: '/placeholder-avatar-3.jpg',
      level: 'Oro',
      country: 'Argentina',
      points: 13560,
      challengesCompleted: 21,
      streak: 42
    },
    {
      rank: 4,
      name: 'Luis Hernández',
      avatar: '/placeholder-avatar-4.jpg',
      level: 'Platino',
      country: 'España',
      points: 12890,
      challengesCompleted: 19,
      streak: 31
    },
    {
      rank: 5,
      name: 'Patricia Moreno',
      avatar: '/placeholder-avatar-5.jpg',
      level: 'Oro',
      country: 'Perú',
      points: 11420,
      challengesCompleted: 18,
      streak: 29
    },
    {
      rank: 6,
      name: 'Roberto Torres',
      avatar: '/placeholder-avatar-6.jpg',
      level: 'Plata',
      country: 'Chile',
      points: 10750,
      challengesCompleted: 17,
      streak: 25
    },
    {
      rank: 7,
      name: 'Isabella Castro',
      avatar: '/placeholder-avatar-7.jpg',
      level: 'Oro',
      country: 'Ecuador',
      points: 10120,
      challengesCompleted: 16,
      streak: 33
    },
    {
      rank: 8,
      name: 'Javier López',
      avatar: '/placeholder-avatar-8.jpg',
      level: 'Plata',
      country: 'México',
      points: 9860,
      challengesCompleted: 15,
      streak: 22
    }
  ];

  const stats = [
    {
      icon: TrophyIcon,
      label: 'Desafíos Activos',
      value: challenges.filter(c => c.status === 'active').length.toString(),
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      icon: FireIcon,
      label: 'Tu Racha',
      value: '12 días',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      icon: StarSolidIcon,
      label: 'Puntos Totales',
      value: '8,540',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: CheckCircleIcon,
      label: 'Completados',
      value: challenges.filter(c => c.status === 'completed' && c.isJoined).length.toString(),
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  const challengeTypes = [
    { value: 'all', label: 'Todos', icon: SparklesIcon },
    { value: 'health', label: 'Salud', icon: HeartIcon },
    { value: 'sales', label: 'Ventas', icon: ChartBarIcon },
    { value: 'team', label: 'Equipo', icon: UserGroupIcon },
    { value: 'personal', label: 'Personal', icon: StarOutlineIcon }
  ];

  const difficulties = [
    { value: 'all', label: 'Todas' },
    { value: 'beginner', label: 'Principiante' },
    { value: 'intermediate', label: 'Intermedio' },
    { value: 'advanced', label: 'Avanzado' }
  ];

  const filteredChallenges = challenges.filter(challenge => {
    if (challenge.status !== activeTab) return false;
    if (selectedType !== 'all' && challenge.type !== selectedType) return false;
    if (selectedDifficulty !== 'all' && challenge.difficulty !== selectedDifficulty) return false;
    return true;
  });

  const handleJoinChallenge = (challengeId: string) => {
    toast.success('¡Te has unido al desafío! Comienza ahora a sumar puntos.');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'health':
        return 'bg-pink-100 text-pink-800';
      case 'sales':
        return 'bg-blue-100 text-blue-800';
      case 'team':
        return 'bg-purple-100 text-purple-800';
      case 'personal':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-amber-700';
    return 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#7AB82E] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <TrophyIcon className="h-16 w-16" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Desafíos de la Comunidad</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Únete a desafíos, supera tus metas y gana recompensas increíbles
            </p>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <Icon className="h-8 w-8 text-white/80" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* View Mode Toggle */}
        <div className="mb-6 flex justify-center">
          <div className="bg-white rounded-lg shadow p-1 inline-flex">
            <button
              onClick={() => setViewMode('challenges')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                viewMode === 'challenges'
                  ? 'bg-[#003B7A] text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrophyIcon className="h-5 w-5" />
                <span>Desafíos</span>
              </div>
            </button>
            <button
              onClick={() => setViewMode('leaderboard')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                viewMode === 'leaderboard'
                  ? 'bg-[#003B7A] text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5" />
                <span>Clasificación</span>
              </div>
            </button>
          </div>
        </div>

        {viewMode === 'challenges' ? (
          <>
            {/* Tabs */}
            <div className="mb-6 flex justify-center">
              <div className="bg-white rounded-lg shadow p-1 inline-flex">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    activeTab === 'active'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Activos
                </button>
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    activeTab === 'upcoming'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Próximamente
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    activeTab === 'completed'
                      ? 'bg-gray-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Completados
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-8 bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Desafío
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {challengeTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          onClick={() => setSelectedType(type.value)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                            selectedType === type.value
                              ? 'bg-[#003B7A] text-white border-[#003B7A]'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-[#003B7A]'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span>{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Difficulty Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dificultad
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {difficulties.map((diff) => (
                      <button
                        key={diff.value}
                        onClick={() => setSelectedDifficulty(diff.value)}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          selectedDifficulty === diff.value
                            ? 'bg-[#7AB82E] text-white border-[#7AB82E]'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-[#7AB82E]'
                        }`}
                      >
                        {diff.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Challenges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredChallenges.map((challenge) => (
                <div key={challenge.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  {/* Challenge Image */}
                  <div className="relative h-48">
                    <Image
                      src={challenge.image}
                      alt={challenge.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(challenge.type)}`}>
                        {challenge.category}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(challenge.difficulty)}`}>
                        {challenge.difficulty === 'beginner' ? 'Principiante' : challenge.difficulty === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                      </span>
                    </div>
                  </div>

                  {/* Challenge Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{challenge.title}</h3>
                    <p className="text-gray-600 mb-4">{challenge.description}</p>

                    {/* Challenge Info */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <ClockIcon className="h-5 w-5" />
                        <span>{challenge.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <UserGroupIcon className="h-5 w-5" />
                        <span>{challenge.participants.toLocaleString()} participantes</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CalendarIcon className="h-5 w-5" />
                        <span>{new Date(challenge.startDate).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <GiftIcon className="h-5 w-5" />
                        <span>{challenge.reward.points} puntos</span>
                      </div>
                    </div>

                    {/* Progress Bar (for joined challenges) */}
                    {challenge.isJoined && (
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Tu Progreso</span>
                          <span className="text-sm font-bold text-[#003B7A]">{challenge.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-[#7AB82E] h-2 rounded-full transition-all"
                            style={{ width: `${challenge.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Milestones */}
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Hitos</p>
                      <div className="space-y-1">
                        {challenge.milestones.map((milestone, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <CheckCircleIcon
                              className={`h-5 w-5 ${
                                milestone.completed ? 'text-green-600' : 'text-gray-300'
                              }`}
                            />
                            <span className={milestone.completed ? 'text-gray-900' : 'text-gray-500'}>
                              {milestone.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reward */}
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <GiftIcon className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
                        <div>
                          <p className="font-medium text-gray-900 mb-1">Recompensas</p>
                          <div className="space-y-1 text-sm text-gray-700">
                            <p>• {challenge.reward.points} puntos</p>
                            {challenge.reward.badge && <p>• Insignia: {challenge.reward.badge}</p>}
                            {challenge.reward.prize && <p>• {challenge.reward.prize}</p>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    {challenge.isJoined ? (
                      <div className="flex items-center justify-center gap-2 py-3 bg-green-50 text-green-700 rounded-lg font-medium">
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>Participando</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleJoinChallenge(challenge.id)}
                        className="w-full bg-[#003B7A] text-white py-3 rounded-lg font-medium hover:bg-[#002855] transition-colors"
                      >
                        Unirse al Desafío
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredChallenges.length === 0 && (
              <div className="text-center py-12">
                <TrophyIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No hay desafíos disponibles con estos filtros</p>
              </div>
            )}
          </>
        ) : (
          /* Leaderboard View */
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-[#003B7A] to-[#7AB82E] text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Tabla de Clasificación</h2>
                  <p className="text-blue-100">Top distribuidores por puntos acumulados</p>
                </div>
                <ChartBarIcon className="h-12 w-12" />
              </div>
            </div>

            <div className="p-6">
              {/* Top 3 Podium */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {/* 2nd Place */}
                <div className="text-center pt-8">
                  <div className="relative inline-block mb-3">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-gray-400">
                      <Image
                        src={leaderboard[1].avatar}
                        alt={leaderboard[1].name}
                        width={80}
                        height={80}
                        className="object-cover"
                      />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-400 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                      2
                    </div>
                  </div>
                  <p className="font-bold text-gray-900">{leaderboard[1].name}</p>
                  <p className="text-sm text-gray-600">{leaderboard[1].level}</p>
                  <p className="text-lg font-bold text-gray-700 mt-2">{leaderboard[1].points.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">puntos</p>
                </div>

                {/* 1st Place */}
                <div className="text-center">
                  <div className="relative inline-block mb-3">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-yellow-500">
                      <Image
                        src={leaderboard[0].avatar}
                        alt={leaderboard[0].name}
                        width={96}
                        height={96}
                        className="object-cover"
                      />
                    </div>
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                      <TrophyIcon className="h-8 w-8 text-yellow-500" />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                      1
                    </div>
                  </div>
                  <p className="font-bold text-gray-900 text-lg">{leaderboard[0].name}</p>
                  <p className="text-sm text-gray-600">{leaderboard[0].level}</p>
                  <p className="text-xl font-bold text-yellow-600 mt-2">{leaderboard[0].points.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">puntos</p>
                </div>

                {/* 3rd Place */}
                <div className="text-center pt-8">
                  <div className="relative inline-block mb-3">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-amber-700">
                      <Image
                        src={leaderboard[2].avatar}
                        alt={leaderboard[2].name}
                        width={80}
                        height={80}
                        className="object-cover"
                      />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-700 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                      3
                    </div>
                  </div>
                  <p className="font-bold text-gray-900">{leaderboard[2].name}</p>
                  <p className="text-sm text-gray-600">{leaderboard[2].level}</p>
                  <p className="text-lg font-bold text-amber-700 mt-2">{leaderboard[2].points.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">puntos</p>
                </div>
              </div>

              {/* Rest of Leaderboard */}
              <div className="space-y-2">
                {leaderboard.slice(3).map((entry) => (
                  <div
                    key={entry.rank}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`text-2xl font-bold w-8 ${getRankColor(entry.rank)}`}>
                        {entry.rank}
                      </span>
                      <div className="w-12 h-12 rounded-full overflow-hidden">
                        <Image
                          src={entry.avatar}
                          alt={entry.name}
                          width={48}
                          height={48}
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{entry.name}</p>
                        <p className="text-sm text-gray-600">{entry.level} • {entry.country}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Puntos</p>
                        <p className="font-bold text-gray-900">{entry.points.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Completados</p>
                        <p className="font-bold text-[#003B7A]">{entry.challengesCompleted}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Racha</p>
                        <p className="font-bold text-orange-600 flex items-center gap-1">
                          <FireIcon className="h-5 w-5" />
                          {entry.streak}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
