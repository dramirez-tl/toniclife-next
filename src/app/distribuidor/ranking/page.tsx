'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FireIcon,
  StarIcon,
  ChartBarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { TrophyIcon as TrophySolidIcon } from '@heroicons/react/24/solid';

const mockLeaderboard = [
  {
    id: '1',
    rank: 1,
    previousRank: 1,
    name: 'Laura Mendoza',
    level: 'Diamante Élite',
    avatar: 'LM',
    sales: 125000,
    growth: 32,
    team: 45,
    recruits: 8,
    region: 'CDMX',
    achievement: '🏆 Mejor Vendedor',
  },
  {
    id: '2',
    rank: 2,
    previousRank: 3,
    name: 'Roberto Sánchez',
    level: 'Diamante',
    avatar: 'RS',
    sales: 98500,
    growth: 28,
    team: 38,
    recruits: 6,
    region: 'Guadalajara',
    achievement: '🔥 Racha Imparable',
  },
  {
    id: '3',
    rank: 3,
    previousRank: 2,
    name: 'Diana Flores',
    level: 'Diamante',
    avatar: 'DF',
    sales: 87300,
    growth: 15,
    team: 42,
    recruits: 7,
    region: 'Monterrey',
    achievement: '⭐ Líder de Equipo',
  },
  {
    id: '4',
    rank: 4,
    previousRank: 5,
    name: 'Carlos Ruiz',
    level: 'Platino',
    avatar: 'CR',
    sales: 76200,
    growth: 45,
    team: 32,
    recruits: 5,
    region: 'CDMX',
    achievement: '🚀 Estrella en Ascenso',
  },
  {
    id: '5',
    rank: 5,
    previousRank: 4,
    name: 'Ana Martínez',
    level: 'Platino',
    avatar: 'AM',
    sales: 68900,
    growth: 12,
    team: 29,
    recruits: 4,
    region: 'Puebla',
    achievement: '💎 Constante',
  },
  {
    id: '6',
    rank: 6,
    previousRank: 7,
    name: 'José García',
    level: 'Oro',
    avatar: 'JG',
    sales: 55400,
    growth: 38,
    team: 24,
    recruits: 3,
    region: 'Querétaro',
    achievement: '📈 Crecimiento Rápido',
  },
  {
    id: '7',
    rank: 7,
    previousRank: 6,
    name: 'María López',
    level: 'Oro',
    avatar: 'ML',
    sales: 51200,
    growth: 8,
    team: 22,
    recruits: 3,
    region: 'Guadalajara',
    achievement: '🎯 Enfocado',
  },
  {
    id: '8',
    rank: 8,
    previousRank: 9,
    name: 'Pedro Torres',
    level: 'Oro',
    avatar: 'PT',
    sales: 47800,
    growth: 25,
    team: 19,
    recruits: 2,
    region: 'CDMX',
    achievement: '✨ Nuevo Talento',
  },
  {
    id: '9',
    rank: 9,
    previousRank: 8,
    name: 'Sofía Hernández',
    level: 'Plata',
    avatar: 'SH',
    sales: 42300,
    growth: 5,
    team: 16,
    recruits: 2,
    region: 'Monterrey',
    achievement: '💪 Persistente',
  },
  {
    id: '10',
    rank: 10,
    previousRank: 11,
    name: 'Luis Ramírez',
    level: 'Plata',
    avatar: 'LR',
    sales: 38700,
    growth: 22,
    team: 14,
    recruits: 1,
    region: 'León',
    achievement: '🎪 Animador',
  },
];

const myStats = {
  rank: 15,
  previousRank: 18,
  name: 'María García',
  sales: 28500,
  growth: 18,
  team: 12,
  recruits: 2,
  level: 'Bronce',
  pointsToNextLevel: 11500,
};

const categories = [
  { id: 'sales', name: 'Ventas', icon: CurrencyDollarIcon },
  { id: 'growth', name: 'Crecimiento', icon: ArrowTrendingUpIcon },
  { id: 'team', name: 'Tamaño de Equipo', icon: UserGroupIcon },
  { id: 'recruits', name: 'Nuevos Reclutados', icon: StarIcon },
];

const periods = ['Esta Semana', 'Este Mes', 'Este Trimestre', 'Este Año', 'Histórico'];
const regions = ['Todas las Regiones', 'CDMX', 'Guadalajara', 'Monterrey', 'Puebla', 'Querétaro', 'León'];

export default function RankingPage() {
  const [selectedCategory, setSelectedCategory] = useState('sales');
  const [selectedPeriod, setSelectedPeriod] = useState('Este Mes');
  const [selectedRegion, setSelectedRegion] = useState('Todas las Regiones');

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-400 to-yellow-600';
    if (rank === 2) return 'from-gray-300 to-gray-500';
    if (rank === 3) return 'from-orange-400 to-orange-600';
    return 'from-blue-400 to-blue-600';
  };

  const getRankChange = (current: number, previous: number) => {
    const change = previous - current;
    if (change > 0) return { direction: 'up', value: change };
    if (change < 0) return { direction: 'down', value: Math.abs(change) };
    return { direction: 'same', value: 0 };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <TrophyIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Tabla de Clasificación</h1>
              </div>
              <p className="text-white/80 text-lg">
                Compite con los mejores distribuidores
              </p>
            </div>
            <Link href="/distribuidor">
              <Button variant="secondary">
                Volver al Panel Principal
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* My Ranking Card */}
        <Card className="mb-8 bg-gradient-to-br from-[#C8DDF2] to-[#C8DDF2]/90 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-3xl font-bold">
                #{myStats.rank}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold">{myStats.name}</h3>
                  {getRankChange(myStats.rank, myStats.previousRank).direction === 'up' && (
                    <span className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded">
                      <ArrowTrendingUpIcon className="h-4 w-4" />
                      +{getRankChange(myStats.rank, myStats.previousRank).value}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-white/70">Ventas</p>
                    <p className="font-bold text-lg">${myStats.sales.toLocaleString('es-MX')}</p>
                  </div>
                  <div>
                    <p className="text-white/70">Crecimiento</p>
                    <p className="font-bold text-lg">+{myStats.growth}%</p>
                  </div>
                  <div>
                    <p className="text-white/70">Equipo</p>
                    <p className="font-bold text-lg">{myStats.team} personas</p>
                  </div>
                  <div>
                    <p className="text-white/70">Reclutados</p>
                    <p className="font-bold text-lg">{myStats.recruits} nuevos</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Progreso a {myStats.level === 'Bronce' ? 'Plata' : 'Oro'}</span>
                    <span className="font-semibold">${myStats.pointsToNextLevel.toLocaleString('es-MX')} restantes</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: '65%' }} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Category Tabs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Clasificar por:
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {categories.map((category) => {
                    const IconComponent = category.icon;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                          selectedCategory === category.id
                            ? 'bg-[#3E667D] text-white shadow-md'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                      >
                        <IconComponent className="h-5 w-5" />
                        {category.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Period and Region */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Periodo
                  </label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
                  >
                    {periods.map(period => (
                      <option key={period} value={period}>{period}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Región
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
                  >
                    {regions.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top 3 Podium */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* 2nd Place */}
          <Card className="md:mt-8">
            <CardContent className="p-6 text-center">
              <div className="relative inline-block mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto">
                  {mockLeaderboard[1].avatar}
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
              </div>
              <h3 className="font-bold text-lg text-gray-900">{mockLeaderboard[1].name}</h3>
              <p className="text-sm text-gray-600 mb-2">{mockLeaderboard[1].level}</p>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                ${mockLeaderboard[1].sales.toLocaleString('es-MX')}
              </p>
              <div className="flex items-center justify-center gap-1 text-sm text-green-600">
                <ArrowTrendingUpIcon className="h-4 w-4" />
                +{mockLeaderboard[1].growth}%
              </div>
            </CardContent>
          </Card>

          {/* 1st Place */}
          <Card className="border-2 border-yellow-400 shadow-xl">
            <CardContent className="p-6 text-center">
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto">
                  {mockLeaderboard[0].avatar}
                </div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <TrophySolidIcon className="h-12 w-12 text-yellow-400" />
                </div>
              </div>
              <h3 className="font-bold text-xl text-gray-900">{mockLeaderboard[0].name}</h3>
              <p className="text-sm text-gray-600 mb-3">{mockLeaderboard[0].level}</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                ${mockLeaderboard[0].sales.toLocaleString('es-MX')}
              </p>
              <div className="flex items-center justify-center gap-1 text-sm text-green-600 mb-3">
                <ArrowTrendingUpIcon className="h-4 w-4" />
                +{mockLeaderboard[0].growth}%
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {mockLeaderboard[0].achievement}
              </span>
            </CardContent>
          </Card>

          {/* 3rd Place */}
          <Card className="md:mt-8">
            <CardContent className="p-6 text-center">
              <div className="relative inline-block mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto">
                  {mockLeaderboard[2].avatar}
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                  3
                </div>
              </div>
              <h3 className="font-bold text-lg text-gray-900">{mockLeaderboard[2].name}</h3>
              <p className="text-sm text-gray-600 mb-2">{mockLeaderboard[2].level}</p>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                ${mockLeaderboard[2].sales.toLocaleString('es-MX')}
              </p>
              <div className="flex items-center justify-center gap-1 text-sm text-green-600">
                <ArrowTrendingUpIcon className="h-4 w-4" />
                +{mockLeaderboard[2].growth}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Full Leaderboard */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Clasificación Completa</h2>
            <div className="space-y-3">
              {mockLeaderboard.map((distributor) => {
                const rankChange = getRankChange(distributor.rank, distributor.previousRank);

                return (
                  <div
                    key={distributor.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                      distributor.rank <= 3
                        ? 'bg-gradient-to-r from-yellow-50 to-white border-yellow-200'
                        : 'bg-white border-gray-200 hover:shadow-md'
                    }`}
                  >
                    {/* Rank Badge */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${
                      distributor.rank <= 3
                        ? `bg-gradient-to-br ${getRankBadgeColor(distributor.rank)}`
                        : 'bg-gray-400'
                    }`}>
                      {distributor.rank}
                    </div>

                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-[#3E667D] to-[#C8DDF2] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {distributor.avatar}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">{distributor.name}</h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {distributor.level}
                        </span>
                        <span className="text-xs text-gray-500">📍 {distributor.region}</span>
                      </div>
                      <p className="text-xs text-gray-600">{distributor.achievement}</p>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:grid grid-cols-3 gap-6 text-center">
                      <div>
                        <p className="text-xs text-gray-600">Ventas</p>
                        <p className="font-bold text-gray-900">${(distributor.sales / 1000).toFixed(0)}k</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Equipo</p>
                        <p className="font-bold text-gray-900">{distributor.team}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Nuevos</p>
                        <p className="font-bold text-gray-900">{distributor.recruits}</p>
                      </div>
                    </div>

                    {/* Growth & Change */}
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                        <ArrowTrendingUpIcon className="h-4 w-4" />
                        +{distributor.growth}%
                      </div>
                      {rankChange.direction === 'up' && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <ArrowTrendingUpIcon className="h-3 w-3" />
                          +{rankChange.value}
                        </span>
                      )}
                      {rankChange.direction === 'down' && (
                        <span className="flex items-center gap-1 text-xs text-red-600">
                          <ArrowTrendingDownIcon className="h-3 w-3" />
                          -{rankChange.value}
                        </span>
                      )}
                      {rankChange.direction === 'same' && (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
