'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  SparklesIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  TrophyIcon,
  HeartIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface Story {
  id: string;
  type: 'health' | 'business' | 'combined';
  name: string;
  age: number;
  location: string;
  avatar: string;
  coverImage: string;
  title: string;
  summary: string;
  timeframe: string;
  stats: {
    label: string;
    value: string;
    icon: 'health' | 'money' | 'team';
  }[];
  tags: string[];
  date: string;
  featured: boolean;
}

const mockStories: Story[] = [
  {
    id: '1',
    type: 'combined',
    name: 'Laura Mendoza',
    age: 38,
    location: 'Guadalajara, JAL',
    avatar: 'https://ui-avatars.com/api/?name=Laura+Mendoza&background=7AB82E&color=fff',
    coverImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&h=600&fit=crop',
    title: 'De ama de casa a Diamond Elite: Mi transformación completa',
    summary: 'Hace 3 años era ama de casa con sobrepeso, depresión y sin ingresos propios. Hoy lidero un equipo de 45 distribuidores, bajé 18 kilos, recuperé mi confianza y genero $85,000 MXN mensuales. Tonic Life no solo cambió mi salud, cambió toda mi vida.',
    timeframe: '3 años',
    stats: [
      { label: 'Peso perdido', value: '18 kg', icon: 'health' },
      { label: 'Ingresos mensuales', value: '$85,000', icon: 'money' },
      { label: 'Equipo', value: '45 personas', icon: 'team' },
    ],
    tags: ['Transformación', 'Diamond Elite', 'Liderazgo', 'Pérdida de peso'],
    date: '2025-01-20',
    featured: true,
  },
  {
    id: '2',
    type: 'health',
    name: 'Carlos Ramírez',
    age: 45,
    location: 'Ciudad de México',
    avatar: 'https://ui-avatars.com/api/?name=Carlos+Ramirez&background=003B7A&color=fff',
    coverImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=600&fit=crop',
    title: 'Vencí la diabetes tipo 2 naturalmente',
    summary: 'Mi doctor me dijo que necesitaría insulina de por vida. Decidí intentar un camino diferente. Con la combinación correcta de suplementos de Tonic Life, ejercicio y alimentación, logré normalizar mi glucosa. Llevo 18 meses sin medicamentos y mi doctor está asombrado.',
    timeframe: '2 años',
    stats: [
      { label: 'Glucosa normalizada', value: 'De 280 a 95', icon: 'health' },
      { label: 'Peso perdido', value: '25 kg', icon: 'health' },
      { label: 'Medicamentos', value: '0', icon: 'health' },
    ],
    tags: ['Diabetes', 'Salud', 'Transformación', 'Bienestar'],
    date: '2025-01-15',
    featured: true,
  },
  {
    id: '3',
    type: 'business',
    name: 'Diana Flores',
    age: 32,
    location: 'Monterrey, NL',
    avatar: 'https://ui-avatars.com/api/?name=Diana+Flores&background=7AB82E&color=fff',
    coverImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&h=600&fit=crop',
    title: 'De empleada a empresaria en 18 meses',
    summary: 'Trabajaba 60 horas a la semana ganando $12,000 MXN. Decidí apostar por Tonic Life trabajando medio tiempo. En 18 meses alcancé Gold, dejé mi empleo y ahora tengo libertad financiera y de tiempo para estar con mi familia.',
    timeframe: '18 meses',
    stats: [
      { label: 'Ingreso mensual', value: '$58,000', icon: 'money' },
      { label: 'Equipo activo', value: '18 personas', icon: 'team' },
      { label: 'Rango', value: 'Gold', icon: 'money' },
    ],
    tags: ['Negocio', 'Libertad financiera', 'Gold', 'Éxito'],
    date: '2025-01-10',
    featured: false,
  },
  {
    id: '4',
    type: 'health',
    name: 'Roberto Sánchez',
    age: 52,
    location: 'Querétaro, QRO',
    avatar: 'https://ui-avatars.com/api/?name=Roberto+Sanchez&background=003B7A&color=fff',
    coverImage: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&h=600&fit=crop',
    title: 'Recuperé mi vitalidad a los 50',
    summary: 'A los 50 me sentía como de 70. Cansado, sin energía, con dolores constantes. Los suplementos de Tonic Life, especialmente el Omega 3 y la Vitamina D3, me devolvieron la vida. Ahora corro maratones y me siento mejor que a los 30.',
    timeframe: '2 años',
    stats: [
      { label: 'Maratones corridos', value: '5', icon: 'health' },
      { label: 'Energía', value: '+200%', icon: 'health' },
      { label: 'Dolores', value: '90% menos', icon: 'health' },
    ],
    tags: ['Energía', 'Deporte', 'Vitalidad', 'Anti-edad'],
    date: '2025-01-05',
    featured: false,
  },
  {
    id: '5',
    type: 'combined',
    name: 'Ana Martínez',
    age: 29,
    location: 'Puebla, PUE',
    avatar: 'https://ui-avatars.com/api/?name=Ana+Martinez&background=7AB82E&color=fff',
    coverImage: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=1200&h=600&fit=crop',
    title: 'Superé la depresión posparto y construí mi negocio',
    summary: 'Después de mi segundo hijo caí en depresión severa. Los suplementos me ayudaron a recuperar mi equilibrio emocional y energía. Empecé a compartir mi experiencia y ahora lidero un equipo que ayuda a otras mamás. He encontrado mi propósito.',
    timeframe: '14 meses',
    stats: [
      { label: 'Bienestar mental', value: 'Recuperado', icon: 'health' },
      { label: 'Ingreso extra', value: '$35,000', icon: 'money' },
      { label: 'Mamás ayudadas', value: '120+', icon: 'team' },
    ],
    tags: ['Depresión', 'Maternidad', 'Bienestar mental', 'Negocio'],
    date: '2024-12-28',
    featured: true,
  },
  {
    id: '6',
    type: 'business',
    name: 'Patricia González',
    age: 41,
    location: 'León, GTO',
    avatar: 'https://ui-avatars.com/api/?name=Patricia+Gonzalez&background=003B7A&color=fff',
    coverImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&h=600&fit=crop',
    title: 'Silver a los 40: Nunca es tarde para empezar',
    summary: 'Pensé que a los 40 era tarde para emprender. Tonic Life me demostró lo contrario. En solo 10 meses alcancé Silver y ahora ayudo a mujeres de mi edad a creer en sí mismas. La edad es solo un número cuando tienes determinación.',
    timeframe: '10 meses',
    stats: [
      { label: 'Rango alcanzado', value: 'Silver', icon: 'money' },
      { label: 'Equipo', value: '12 mujeres', icon: 'team' },
      { label: 'Confianza', value: '∞', icon: 'health' },
    ],
    tags: ['40+', 'Silver', 'Empoderamiento', 'Mujeres'],
    date: '2024-12-20',
    featured: false,
  },
];

export default function HistoriasPage() {
  const [stories, setStories] = useState(mockStories);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'health' | 'business' | 'combined'>('all');

  const filteredStories = stories.filter(story => {
    const matchesSearch = story.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         story.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || story.type === filterType;
    return matchesSearch && matchesType;
  });

  const featuredStories = filteredStories.filter(s => s.featured);
  const regularStories = filteredStories.filter(s => !s.featured);

  const getStatIcon = (icon: string) => {
    switch (icon) {
      case 'health':
        return <HeartIcon className="h-5 w-5" />;
      case 'money':
        return <CurrencyDollarIcon className="h-5 w-5" />;
      case 'team':
        return <UserGroupIcon className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'health':
        return 'Salud';
      case 'business':
        return 'Negocio';
      case 'combined':
        return 'Salud + Negocio';
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <TrophyIcon className="h-16 w-16" />
            </div>
            <h1 className="text-5xl font-bold mb-4">Historias de Éxito</h1>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
              Transformaciones reales de personas que decidieron cambiar su vida con Tonic Life
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/testimonios">
                <Button variant="secondary" size="lg">
                  Ver Testimonios
                </Button>
              </Link>
              <Link href="/comunidad">
                <Button variant="primary" size="lg">
                  Unirme a la Comunidad
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar historias..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  <option value="all">Todas las Historias</option>
                  <option value="health">Solo Salud</option>
                  <option value="business">Solo Negocio</option>
                  <option value="combined">Salud + Negocio</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Featured Stories */}
        {featuredStories.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <SparklesIcon className="h-8 w-8 text-[#7AB82E]" />
              Historias Destacadas
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {featuredStories.map((story) => (
                <Card key={story.id} className="overflow-hidden hover:shadow-xl transition-shadow">
                  {/* Cover Image */}
                  <div className="relative h-64">
                    <Image
                      src={story.coverImage}
                      alt={story.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-2 ${
                        story.type === 'health' ? 'bg-green-100 text-green-700' :
                        story.type === 'business' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {getTypeLabel(story.type)}
                      </span>
                      <h3 className="text-xl font-bold text-white mb-1">{story.title}</h3>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    {/* Author */}
                    <div className="flex items-center gap-3 mb-4">
                      <Image
                        src={story.avatar}
                        alt={story.name}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                      <div>
                        <h4 className="font-bold text-gray-900">{story.name}, {story.age}</h4>
                        <p className="text-sm text-gray-600">{story.location} • {story.timeframe}</p>
                      </div>
                    </div>

                    {/* Summary */}
                    <p className="text-gray-700 leading-relaxed mb-4">{story.summary}</p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {story.stats.map((stat, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="flex justify-center mb-1">
                            {getStatIcon(stat.icon)}
                          </div>
                          <p className="text-lg font-bold text-[#003B7A]">{stat.value}</p>
                          <p className="text-xs text-gray-600">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {story.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* CTA */}
                    <Button
                      variant="outline"
                      className="w-full"
                      rightIcon={<ArrowRightIcon className="h-4 w-4" />}
                      onClick={() => toast.info('Historia completa próximamente disponible')}
                    >
                      Leer Historia Completa
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Regular Stories */}
        {regularStories.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Más Historias</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularStories.map((story) => (
                <Card key={story.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Cover Image */}
                  <div className="relative h-48">
                    <Image
                      src={story.coverImage}
                      alt={story.title}
                      fill
                      className="object-cover"
                    />
                    <span className={`absolute top-3 left-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      story.type === 'health' ? 'bg-green-100 text-green-700' :
                      story.type === 'business' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {getTypeLabel(story.type)}
                    </span>
                  </div>

                  <CardContent className="p-6">
                    {/* Author */}
                    <div className="flex items-center gap-2 mb-3">
                      <Image
                        src={story.avatar}
                        alt={story.name}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{story.name}</p>
                        <p className="text-xs text-gray-600">{story.location}</p>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{story.title}</h3>

                    {/* Summary */}
                    <p className="text-sm text-gray-700 mb-3 line-clamp-3">{story.summary}</p>

                    {/* CTA */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      rightIcon={<ArrowRightIcon className="h-4 w-4" />}
                      onClick={() => toast.info('Historia completa próximamente disponible')}
                    >
                      Leer Más
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {filteredStories.length === 0 && (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <TrophyIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No se encontraron historias
                </h3>
                <p className="text-gray-600">
                  Intenta ajustar los filtros de búsqueda
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA Section */}
        <Card className="mt-12 bg-gradient-to-br from-[#7AB82E] to-[#7AB82E]/90 text-white">
          <CardContent className="p-12">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">¿Listo para escribir tu propia historia de éxito?</h2>
              <p className="text-white/90 text-lg mb-8">
                Miles de personas ya transformaron su vida con Tonic Life. Tú puedes ser el siguiente.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/quiz">
                  <Button variant="secondary" size="lg">
                    Hacer el Quiz Gratuito
                  </Button>
                </Link>
                <Link href="/productos">
                  <Button variant="primary" size="lg">
                    Ver Productos
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Load More */}
        {filteredStories.length > 0 && (
          <div className="text-center mt-8">
            <Button variant="outline" onClick={() => toast.info('Cargando más historias...')}>
              Cargar Más Historias
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
