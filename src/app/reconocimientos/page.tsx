'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  TrophyIcon,
  SparklesIcon,
  FireIcon,
  HeartIcon,
  ChartBarIcon,
  UserGroupIcon,
  CalendarIcon,
  ClockIcon,
  StarIcon as StarOutlineIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  CheckBadgeIcon,
  BoltIcon,
  CakeIcon,
} from '@heroicons/react/24/outline';
import {
  StarIcon as StarSolidIcon,
} from '@heroicons/react/24/solid';

interface Recognition {
  id: string;
  type: 'leader-of-month' | 'top-seller' | 'new-rank' | 'anniversary' | 'transformation' | 'team-builder';
  category: string;
  title: string;
  recipient: {
    name: string;
    avatar: string;
    country: string;
    rank: string;
    level?: string;
  };
  achievement: string;
  stats?: {
    label: string;
    value: string;
    icon: 'sales' | 'team' | 'growth' | 'time';
  }[];
  date: string;
  featured: boolean;
  description?: string;
  quote?: string;
}

interface WallOfFameEntry {
  id: string;
  name: string;
  avatar: string;
  country: string;
  rank: string;
  achievements: string[];
  totalSales: number;
  teamSize: number;
  yearsActive: number;
  specialties: string[];
  featured: boolean;
}

export default function ReconocimientosPage() {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('month');
  const [viewMode, setViewMode] = useState<'recognitions' | 'wall-of-fame'>('recognitions');

  const recognitions: Recognition[] = [
    {
      id: '1',
      type: 'leader-of-month',
      category: 'Líder del Mes',
      title: 'Líder del Mes - Enero 2024',
      recipient: {
        name: 'María González',
        avatar: '/placeholder-avatar-1.jpg',
        country: 'México',
        rank: 'Diamante',
        level: 'Elite'
      },
      achievement: 'Logró ventas récord de $45,000 USD y reclutó 12 nuevos distribuidores',
      stats: [
        { label: 'Ventas', value: '$45,000', icon: 'sales' },
        { label: 'Nuevos Distribuidores', value: '12', icon: 'team' },
        { label: 'Crecimiento', value: '+185%', icon: 'growth' }
      ],
      date: '2024-01-31',
      featured: true,
      quote: 'El éxito llega cuando combinas pasión, dedicación y el poder de un gran equipo.'
    },
    {
      id: '2',
      type: 'top-seller',
      category: 'Top Ventas',
      title: 'Top Seller - Enero 2024',
      recipient: {
        name: 'Carlos Ramírez',
        avatar: '/placeholder-avatar-2.jpg',
        country: 'Colombia',
        rank: 'Platino'
      },
      achievement: '$38,500 USD en ventas personales durante enero',
      stats: [
        { label: 'Ventas Totales', value: '$38,500', icon: 'sales' },
        { label: 'Clientes Nuevos', value: '47', icon: 'team' },
        { label: 'Tasa de Retención', value: '94%', icon: 'growth' }
      ],
      date: '2024-01-31',
      featured: true
    },
    {
      id: '3',
      type: 'new-rank',
      category: 'Nuevo Rango',
      title: 'Ascenso a Platino',
      recipient: {
        name: 'Ana Silva',
        avatar: '/placeholder-avatar-3.jpg',
        country: 'Argentina',
        rank: 'Platino'
      },
      achievement: 'Alcanzó el prestigioso rango de Platino en tiempo récord',
      stats: [
        { label: 'Tiempo', value: '6 meses', icon: 'time' },
        { label: 'Equipo', value: '45 personas', icon: 'team' },
        { label: 'Ventas', value: '$120,000', icon: 'sales' }
      ],
      date: '2024-01-28',
      featured: false,
      quote: 'Cada meta alcanzada es solo el comienzo de la siguiente. ¡A por más!'
    },
    {
      id: '4',
      type: 'anniversary',
      category: 'Aniversario',
      title: '5 Años con Tonic Life',
      recipient: {
        name: 'Luis Hernández',
        avatar: '/placeholder-avatar-4.jpg',
        country: 'España',
        rank: 'Diamante'
      },
      achievement: '5 años de excelencia construyendo un imperio de bienestar',
      stats: [
        { label: 'Años Activo', value: '5', icon: 'time' },
        { label: 'Ventas Totales', value: '$850,000', icon: 'sales' },
        { label: 'Equipo Total', value: '234', icon: 'team' }
      ],
      date: '2024-01-25',
      featured: false
    },
    {
      id: '5',
      type: 'transformation',
      category: 'Transformación',
      title: 'Historia de Transformación del Mes',
      recipient: {
        name: 'Patricia Moreno',
        avatar: '/placeholder-avatar-5.jpg',
        country: 'Perú',
        rank: 'Oro'
      },
      achievement: 'Perdió 25 kg en 4 meses y ayudó a 30 personas a transformar sus vidas',
      stats: [
        { label: 'Peso Perdido', value: '25 kg', icon: 'growth' },
        { label: 'Clientes Inspirados', value: '30', icon: 'team' },
        { label: 'Tiempo', value: '4 meses', icon: 'time' }
      ],
      date: '2024-01-22',
      featured: true,
      quote: 'Mi transformación no solo cambió mi cuerpo, cambió mi vida y mi negocio.'
    },
    {
      id: '6',
      type: 'team-builder',
      category: 'Constructor de Equipos',
      title: 'Team Builder del Mes',
      recipient: {
        name: 'Roberto Torres',
        avatar: '/placeholder-avatar-6.jpg',
        country: 'Chile',
        rank: 'Platino'
      },
      achievement: 'Desarrolló 8 nuevos líderes de equipo en enero',
      stats: [
        { label: 'Nuevos Líderes', value: '8', icon: 'team' },
        { label: 'Capacitaciones', value: '24', icon: 'growth' },
        { label: 'Tasa de Éxito', value: '88%', icon: 'sales' }
      ],
      date: '2024-01-20',
      featured: false
    },
    {
      id: '7',
      type: 'top-seller',
      category: 'Top Ventas',
      title: 'Récord de Ventas Semanal',
      recipient: {
        name: 'Isabella Castro',
        avatar: '/placeholder-avatar-7.jpg',
        country: 'Ecuador',
        rank: 'Oro'
      },
      achievement: '$12,000 USD en ventas en una sola semana',
      stats: [
        { label: 'Ventas Semanales', value: '$12,000', icon: 'sales' },
        { label: 'Órdenes', value: '34', icon: 'growth' },
        { label: 'Ticket Promedio', value: '$353', icon: 'sales' }
      ],
      date: '2024-01-18',
      featured: false
    },
    {
      id: '8',
      type: 'new-rank',
      category: 'Nuevo Rango',
      title: 'Ascenso a Oro',
      recipient: {
        name: 'Javier López',
        avatar: '/placeholder-avatar-8.jpg',
        country: 'México',
        rank: 'Oro'
      },
      achievement: 'Logró el rango Oro con dedicación y esfuerzo constante',
      stats: [
        { label: 'Tiempo', value: '8 meses', icon: 'time' },
        { label: 'Equipo', value: '28 personas', icon: 'team' },
        { label: 'Ventas', value: '$75,000', icon: 'sales' }
      ],
      date: '2024-01-15',
      featured: false
    }
  ];

  const wallOfFame: WallOfFameEntry[] = [
    {
      id: '1',
      name: 'María González',
      avatar: '/placeholder-avatar-1.jpg',
      country: 'México',
      rank: 'Diamante Elite',
      achievements: [
        'Líder del Mes (8 veces)',
        'Top Seller Nacional 2023',
        'Team Builder del Año 2022',
        'Círculo de Honor 2021-2024'
      ],
      totalSales: 1250000,
      teamSize: 342,
      yearsActive: 7,
      specialties: ['Liderazgo', 'Capacitación', 'Ventas'],
      featured: true
    },
    {
      id: '2',
      name: 'Carlos Ramírez',
      avatar: '/placeholder-avatar-2.jpg',
      country: 'Colombia',
      rank: 'Diamante',
      achievements: [
        'Top Seller Latinoamérica 2023',
        'Líder del Mes (5 veces)',
        'Mejor Transformación Personal 2022',
        'Círculo de Honor 2022-2024'
      ],
      totalSales: 980000,
      teamSize: 278,
      yearsActive: 6,
      specialties: ['Ventas', 'Marketing Digital', 'Mentoría'],
      featured: true
    },
    {
      id: '3',
      name: 'Ana Silva',
      avatar: '/placeholder-avatar-3.jpg',
      country: 'Argentina',
      rank: 'Platino',
      achievements: [
        'Ascenso más Rápido a Platino',
        'Líder del Mes (3 veces)',
        'Team Builder Destacada 2023',
        'Círculo de Honor 2023-2024'
      ],
      totalSales: 560000,
      teamSize: 156,
      yearsActive: 3,
      specialties: ['Reclutamiento', 'Redes Sociales', 'Eventos'],
      featured: true
    },
    {
      id: '4',
      name: 'Luis Hernández',
      avatar: '/placeholder-avatar-4.jpg',
      country: 'España',
      rank: 'Diamante',
      achievements: [
        '5 Años de Excelencia',
        'Líder Regional Europa',
        'Mejor Mentor 2023',
        'Círculo de Honor 2019-2024'
      ],
      totalSales: 850000,
      teamSize: 234,
      yearsActive: 5,
      specialties: ['Mentoría', 'Estrategia', 'Expansión Internacional'],
      featured: false
    },
    {
      id: '5',
      name: 'Patricia Moreno',
      avatar: '/placeholder-avatar-5.jpg',
      country: 'Perú',
      rank: 'Oro',
      achievements: [
        'Transformación del Año 2023',
        'Historia Inspiradora',
        'Coach de Bienestar Certificada',
        'Embajadora de Marca'
      ],
      totalSales: 420000,
      teamSize: 98,
      yearsActive: 4,
      specialties: ['Coaching', 'Transformación', 'Testimonios'],
      featured: false
    },
    {
      id: '6',
      name: 'Roberto Torres',
      avatar: '/placeholder-avatar-6.jpg',
      country: 'Chile',
      rank: 'Platino',
      achievements: [
        'Team Builder del Año 2023',
        'Líder del Mes (4 veces)',
        'Mejor Capacitador',
        'Círculo de Honor 2023-2024'
      ],
      totalSales: 510000,
      teamSize: 187,
      yearsActive: 4,
      specialties: ['Capacitación', 'Desarrollo de Líderes', 'Motivación'],
      featured: false
    }
  ];

  const recognitionTypes = [
    { value: 'all', label: 'Todos', icon: SparklesIcon, color: 'bg-purple-100 text-purple-800' },
    { value: 'leader-of-month', label: 'Líder del Mes', icon: TrophyIcon, color: 'bg-yellow-100 text-yellow-800' },
    { value: 'top-seller', label: 'Top Ventas', icon: ChartBarIcon, color: 'bg-blue-100 text-blue-800' },
    { value: 'new-rank', label: 'Nuevos Rangos', icon: ArrowTrendingUpIcon, color: 'bg-green-100 text-green-800' },
    { value: 'anniversary', label: 'Aniversarios', icon: CakeIcon, color: 'bg-pink-100 text-pink-800' },
    { value: 'transformation', label: 'Transformaciones', icon: HeartIcon, color: 'bg-red-100 text-red-800' },
    { value: 'team-builder', label: 'Team Builders', icon: UserGroupIcon, color: 'bg-indigo-100 text-indigo-800' }
  ];

  const periods = [
    { value: 'week', label: 'Esta Semana' },
    { value: 'month', label: 'Este Mes' },
    { value: 'quarter', label: 'Este Trimestre' },
    { value: 'year', label: 'Este Año' },
    { value: 'all', label: 'Todos' }
  ];

  const filteredRecognitions = recognitions.filter(recognition => {
    if (selectedType !== 'all' && recognition.type !== selectedType) return false;
    return true;
  });

  const featuredRecognitions = filteredRecognitions.filter(r => r.featured);
  const regularRecognitions = filteredRecognitions.filter(r => !r.featured);

  const getStatIcon = (icon: string) => {
    switch (icon) {
      case 'sales':
        return <CurrencyDollarIcon className="h-5 w-5" />;
      case 'team':
        return <UserGroupIcon className="h-5 w-5" />;
      case 'growth':
        return <ArrowTrendingUpIcon className="h-5 w-5" />;
      case 'time':
        return <ClockIcon className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    const typeObj = recognitionTypes.find(t => t.value === type);
    return typeObj?.color || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    const typeObj = recognitionTypes.find(t => t.value === type);
    return typeObj?.icon || SparklesIcon;
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
            <h1 className="text-4xl font-bold mb-4">Reconocimientos</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Celebramos el éxito, dedicación y logros excepcionales de nuestra comunidad
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* View Mode Toggle */}
        <div className="mb-6 flex justify-center">
          <div className="bg-white rounded-lg shadow p-1 inline-flex">
            <button
              onClick={() => setViewMode('recognitions')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                viewMode === 'recognitions'
                  ? 'bg-[#003B7A] text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5" />
                <span>Reconocimientos</span>
              </div>
            </button>
            <button
              onClick={() => setViewMode('wall-of-fame')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                viewMode === 'wall-of-fame'
                  ? 'bg-[#003B7A] text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <StarSolidIcon className="h-5 w-5" />
                <span>Muro de la Fama</span>
              </div>
            </button>
          </div>
        </div>

        {viewMode === 'recognitions' ? (
          <>
            {/* Filters */}
            <div className="mb-8 bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tipo de Reconocimiento
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {recognitionTypes.map((type) => {
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
                          <span className="text-sm">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Period Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Período
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {periods.map((period) => (
                      <button
                        key={period.value}
                        onClick={() => setSelectedPeriod(period.value)}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          selectedPeriod === period.value
                            ? 'bg-[#7AB82E] text-white border-[#7AB82E]'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-[#7AB82E]'
                        }`}
                      >
                        <span className="text-sm">{period.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Featured Recognitions */}
            {featuredRecognitions.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <StarSolidIcon className="h-7 w-7 text-yellow-500" />
                  Reconocimientos Destacados
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {featuredRecognitions.map((recognition) => {
                    const TypeIcon = getTypeIcon(recognition.type);
                    return (
                      <div key={recognition.id} className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-yellow-400">
                        <div className="p-6">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-yellow-400">
                                <Image
                                  src={recognition.recipient.avatar}
                                  alt={recognition.recipient.name}
                                  width={64}
                                  height={64}
                                  className="object-cover"
                                />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">{recognition.recipient.name}</h3>
                                <p className="text-sm text-gray-600">
                                  {recognition.recipient.rank} • {recognition.recipient.country}
                                </p>
                                {recognition.recipient.level && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded mt-1">
                                    <BoltIcon className="h-3 w-3" />
                                    {recognition.recipient.level}
                                  </span>
                                )}
                              </div>
                            </div>
                            <TypeIcon className="h-8 w-8 text-yellow-500" />
                          </div>

                          {/* Recognition Type */}
                          <div className="mb-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(recognition.type)}`}>
                              {recognition.category}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="text-lg font-bold text-gray-900 mb-2">{recognition.title}</h4>

                          {/* Achievement */}
                          <p className="text-gray-700 mb-4">{recognition.achievement}</p>

                          {/* Stats */}
                          {recognition.stats && (
                            <div className="grid grid-cols-3 gap-3 mb-4">
                              {recognition.stats.map((stat, idx) => (
                                <div key={idx} className="bg-gray-50 rounded-lg p-3 text-center">
                                  <div className="flex justify-center mb-1 text-[#003B7A]">
                                    {getStatIcon(stat.icon)}
                                  </div>
                                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                                  <p className="text-xs text-gray-600">{stat.label}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Quote */}
                          {recognition.quote && (
                            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border-l-4 border-[#7AB82E]">
                              <p className="italic text-gray-700">&ldquo;{recognition.quote}&rdquo;</p>
                            </div>
                          )}

                          {/* Date */}
                          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                            <CalendarIcon className="h-4 w-4" />
                            <span>{new Date(recognition.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Regular Recognitions */}
            {regularRecognitions.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Más Reconocimientos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularRecognitions.map((recognition) => {
                    const TypeIcon = getTypeIcon(recognition.type);
                    return (
                      <div key={recognition.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
                        <div className="p-6">
                          {/* Header */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200">
                              <Image
                                src={recognition.recipient.avatar}
                                alt={recognition.recipient.name}
                                width={48}
                                height={48}
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 truncate">{recognition.recipient.name}</h3>
                              <p className="text-xs text-gray-600 truncate">
                                {recognition.recipient.rank} • {recognition.recipient.country}
                              </p>
                            </div>
                            <TypeIcon className="h-6 w-6 text-gray-400 flex-shrink-0" />
                          </div>

                          {/* Type Badge */}
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-3 ${getTypeColor(recognition.type)}`}>
                            {recognition.category}
                          </span>

                          {/* Title */}
                          <h4 className="font-bold text-gray-900 mb-2 text-sm">{recognition.title}</h4>

                          {/* Achievement */}
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{recognition.achievement}</p>

                          {/* Stats Grid */}
                          {recognition.stats && (
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              {recognition.stats.slice(0, 2).map((stat, idx) => (
                                <div key={idx} className="bg-gray-50 rounded p-2">
                                  <p className="text-sm font-bold text-gray-900">{stat.value}</p>
                                  <p className="text-xs text-gray-600">{stat.label}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Date */}
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <CalendarIcon className="h-3 w-3" />
                            <span>{new Date(recognition.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredRecognitions.length === 0 && (
              <div className="text-center py-12">
                <TrophyIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No hay reconocimientos disponibles con estos filtros</p>
              </div>
            )}
          </>
        ) : (
          /* Wall of Fame View */
          <div>
            <div className="mb-8 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 border-2 border-yellow-400">
              <div className="flex items-center gap-4">
                <StarSolidIcon className="h-12 w-12 text-yellow-500" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Muro de la Fama</h2>
                  <p className="text-gray-700">
                    Nuestros distribuidores más destacados que han alcanzado la excelencia y dejado un legado en Tonic Life
                  </p>
                </div>
              </div>
            </div>

            {/* Featured Wall of Fame */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Íconos de la Comunidad</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wallOfFame.filter(entry => entry.featured).map((entry) => (
                  <div key={entry.id} className="bg-white rounded-lg shadow-xl overflow-hidden border-2 border-yellow-400">
                    <div className="bg-gradient-to-r from-[#003B7A] to-[#7AB82E] p-6 text-white">
                      <div className="flex justify-center mb-4">
                        <div className="relative">
                          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white">
                            <Image
                              src={entry.avatar}
                              alt={entry.name}
                              width={96}
                              height={96}
                              className="object-cover"
                            />
                          </div>
                          <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-2">
                            <StarSolidIcon className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-center mb-1">{entry.name}</h3>
                      <p className="text-center text-blue-100 text-sm mb-2">{entry.country}</p>
                      <div className="flex justify-center">
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                          {entry.rank}
                        </span>
                      </div>
                    </div>

                    <div className="p-6">
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-[#003B7A]">{entry.yearsActive}</p>
                          <p className="text-xs text-gray-600">Años</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-[#7AB82E]">{entry.teamSize}</p>
                          <p className="text-xs text-gray-600">Equipo</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-yellow-600">${(entry.totalSales / 1000).toFixed(0)}K</p>
                          <p className="text-xs text-gray-600">Ventas</p>
                        </div>
                      </div>

                      {/* Specialties */}
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-700 mb-2">Especialidades</p>
                        <div className="flex flex-wrap gap-1">
                          {entry.specialties.map((specialty, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Achievements */}
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-2">Logros Destacados</p>
                        <div className="space-y-1">
                          {entry.achievements.map((achievement, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <CheckBadgeIcon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <span className="text-xs text-gray-700">{achievement}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Other Hall of Fame Members */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Miembros del Salón de la Fama</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {wallOfFame.filter(entry => !entry.featured).map((entry) => (
                  <div key={entry.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                          <Image
                            src={entry.avatar}
                            alt={entry.name}
                            width={64}
                            height={64}
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900">{entry.name}</h3>
                          <p className="text-sm text-gray-600">{entry.country}</p>
                          <span className="inline-block mt-1 px-2 py-1 bg-gradient-to-r from-[#003B7A] to-[#7AB82E] text-white text-xs font-medium rounded">
                            {entry.rank}
                          </span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-gray-50 rounded p-2 text-center">
                          <p className="text-lg font-bold text-gray-900">{entry.yearsActive}</p>
                          <p className="text-xs text-gray-600">Años</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2 text-center">
                          <p className="text-lg font-bold text-gray-900">{entry.teamSize}</p>
                          <p className="text-xs text-gray-600">Equipo</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2 text-center">
                          <p className="text-lg font-bold text-gray-900">${(entry.totalSales / 1000).toFixed(0)}K</p>
                          <p className="text-xs text-gray-600">Ventas</p>
                        </div>
                      </div>

                      {/* Specialties */}
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1">
                          {entry.specialties.map((specialty, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Achievements */}
                      <div className="space-y-1">
                        {entry.achievements.slice(0, 3).map((achievement, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <CheckBadgeIcon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-xs text-gray-700">{achievement}</span>
                          </div>
                        ))}
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
