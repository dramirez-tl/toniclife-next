'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  CalendarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  MapPinIcon,
  UsersIcon,
  PhotoIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface Event {
  id: string;
  title: string;
  type: 'convention' | 'training' | 'recognition' | 'team-meeting' | 'international';
  location: string;
  country: string;
  date: string;
  attendees: number;
  photos: {
    url: string;
    caption?: string;
  }[];
  videos?: number;
  description: string;
  highlights: string[];
}

const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Convención Internacional 2024',
    type: 'convention',
    location: 'Cancún, Quintana Roo',
    country: 'México',
    date: '2024-03-15',
    attendees: 2500,
    photos: [
      { url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop', caption: 'Ceremonia de apertura' },
      { url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop', caption: 'Reconocimientos Diamond Elite' },
      { url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=600&fit=crop', caption: 'Sesión plenaria' },
      { url: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop', caption: 'Networking' },
    ],
    videos: 15,
    description: 'La convención más grande de Tonic Life México reunió a más de 2,500 distribuidores de todo el país.',
    highlights: [
      'Reconocimiento a 45 nuevos Diamond Elite',
      'Lanzamiento de 3 nuevos productos',
      'Capacitación con expertos internacionales',
      'Gala de premios',
    ],
  },
  {
    id: '2',
    title: 'Summit de Líderes 2024',
    type: 'training',
    location: 'Ciudad de México',
    country: 'México',
    date: '2024-06-20',
    attendees: 500,
    photos: [
      { url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=600&fit=crop', caption: 'Sesión de liderazgo' },
      { url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=600&fit=crop', caption: 'Workshops interactivos' },
      { url: 'https://images.unsplash.com/photo-1560439514-4e9645039924?w=800&h=600&fit=crop', caption: 'Ponentes internacionales' },
    ],
    videos: 8,
    description: 'Capacitación intensiva exclusiva para líderes Gold y superiores.',
    highlights: [
      'Estrategias de duplicación',
      'Liderazgo transformacional',
      'Herramientas digitales avanzadas',
      'Networking de alto nivel',
    ],
  },
  {
    id: '3',
    title: 'Gala de Reconocimientos 2024',
    type: 'recognition',
    location: 'Guadalajara, Jalisco',
    country: 'México',
    date: '2024-09-10',
    attendees: 800,
    photos: [
      { url: 'https://images.unsplash.com/photo-1519167758481-83f29da1a169?w=800&h=600&fit=crop', caption: 'Alfombra roja' },
      { url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&h=600&fit=crop', caption: 'Ceremonia de premiación' },
      { url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=600&fit=crop', caption: 'Ganadores 2024' },
      { url: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800&h=600&fit=crop', caption: 'Celebración' },
    ],
    videos: 12,
    description: 'Noche de gala para reconocer a los distribuidores más destacados del año.',
    highlights: [
      'Distribuidor del Año',
      'Equipo con Mayor Crecimiento',
      'Nuevos Rangos Alcanzados',
      'Premios en efectivo',
    ],
  },
  {
    id: '4',
    title: 'International Leadership Conference',
    type: 'international',
    location: 'Las Vegas, Nevada',
    country: 'USA',
    date: '2024-11-05',
    attendees: 5000,
    photos: [
      { url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop', caption: 'Main stage' },
      { url: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&h=600&fit=crop', caption: 'International speakers' },
      { url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=600&fit=crop', caption: 'Breakout sessions' },
    ],
    videos: 20,
    description: 'Evento internacional con distribuidores de 15 países.',
    highlights: [
      'Líderes de 15 países',
      'Visión 2025 de Tonic Life',
      'Innovaciones tecnológicas',
      'Networking global',
    ],
  },
  {
    id: '5',
    title: 'Reunión Regional Norte',
    type: 'team-meeting',
    location: 'Monterrey, Nuevo León',
    country: 'México',
    date: '2024-07-15',
    attendees: 250,
    photos: [
      { url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop', caption: 'Equipos del norte' },
      { url: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&h=600&fit=crop', caption: 'Capacitación de productos' },
    ],
    videos: 5,
    description: 'Reunión trimestral de equipos de la región norte de México.',
    highlights: [
      'Presentación de productos',
      'Estrategias regionales',
      'Reconocimientos locales',
      'Team building',
    ],
  },
  {
    id: '6',
    title: 'Wellness Retreat 2024',
    type: 'training',
    location: 'Tulum, Quintana Roo',
    country: 'México',
    date: '2024-08-22',
    attendees: 150,
    photos: [
      { url: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&h=600&fit=crop', caption: 'Sesión de yoga' },
      { url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop', caption: 'Alimentación saludable' },
      { url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&h=600&fit=crop', caption: 'Meditación grupal' },
    ],
    videos: 6,
    description: 'Retiro de bienestar enfocado en salud integral y balance vida-trabajo.',
    highlights: [
      'Yoga y meditación',
      'Nutrición holística',
      'Bienestar mental',
      'Conexión con la naturaleza',
    ],
  },
];

const eventTypes = [
  { id: 'all', name: 'Todos los Eventos' },
  { id: 'convention', name: 'Convenciones' },
  { id: 'training', name: 'Capacitaciones' },
  { id: 'recognition', name: 'Reconocimientos' },
  { id: 'team-meeting', name: 'Reuniones de Equipo' },
  { id: 'international', name: 'Eventos Internacionales' },
];

const years = ['2024', '2023', '2022', '2021'];
const countries = ['Todos los Países', 'México', 'USA', 'Colombia', 'Perú'];

export default function GaleriaEventosPage() {
  const [events, setEvents] = useState(mockEvents);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterYear, setFilterYear] = useState('2024');
  const [filterCountry, setFilterCountry] = useState('Todos los Países');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || event.type === filterType;
    const matchesYear = new Date(event.date).getFullYear().toString() === filterYear;
    const matchesCountry = filterCountry === 'Todos los Países' || event.country === filterCountry;
    return matchesSearch && matchesType && matchesYear && matchesCountry;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'convention':
        return 'Convención';
      case 'training':
        return 'Capacitación';
      case 'recognition':
        return 'Reconocimiento';
      case 'team-meeting':
        return 'Reunión de Equipo';
      case 'international':
        return 'Internacional';
      default:
        return type;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'convention':
        return 'bg-purple-100 text-purple-700';
      case 'training':
        return 'bg-blue-100 text-blue-700';
      case 'recognition':
        return 'bg-yellow-100 text-yellow-700';
      case 'team-meeting':
        return 'bg-green-100 text-green-700';
      case 'international':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <PhotoIcon className="h-16 w-16" />
            </div>
            <h1 className="text-5xl font-bold mb-4">Galería de Eventos</h1>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
              Revive los momentos más importantes de nuestra comunidad Tonic Life
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full">
                <p className="text-sm font-medium">📅 {mockEvents.length} Eventos Documentados</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full">
                <p className="text-sm font-medium">📸 500+ Fotos</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full">
                <p className="text-sm font-medium">🎥 60+ Videos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar eventos..."
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
                  onChange={(e) => setFilterType(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  {eventTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Country Filter */}
              <div>
                <select
                  value={filterCountry}
                  onChange={(e) => setFilterCountry(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  {countries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events Grid */}
        <div className="space-y-8">
          {filteredEvents.map((event) => (
            <Card key={event.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-3 gap-6 p-6">
                  {/* Event Info */}
                  <div className="md:col-span-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTypeBadgeColor(event.type)}`}>
                        {getTypeLabel(event.type)}
                      </span>
                      {event.videos && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          <PlayIcon className="h-3 w-3" />
                          {event.videos}
                        </span>
                      )}
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 mb-3">{event.title}</h3>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPinIcon className="h-4 w-4" />
                        <span>{event.location}, {event.country}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{new Date(event.date).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <UsersIcon className="h-4 w-4" />
                        <span>{event.attendees.toLocaleString()} asistentes</span>
                      </div>
                    </div>

                    <p className="text-gray-700 mb-4">{event.description}</p>

                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Highlights:</h4>
                      <ul className="space-y-1">
                        {event.highlights.map((highlight, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-[#7AB82E] mt-1">✓</span>
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <PhotoIcon className="h-4 w-4 mr-2" />
                      Ver Galería Completa ({event.photos.length})
                    </Button>
                  </div>

                  {/* Photo Grid */}
                  <div className="md:col-span-2">
                    <div className="grid grid-cols-2 gap-3">
                      {event.photos.slice(0, 4).map((photo, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
                          onClick={() => setSelectedEvent(event)}
                        >
                          <Image
                            src={photo.url}
                            alt={photo.caption || event.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {photo.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                              <p className="text-white text-xs">{photo.caption}</p>
                            </div>
                          )}
                          {idx === 3 && event.photos.length > 4 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="text-white text-2xl font-bold">
                                +{event.photos.length - 4}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <PhotoIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No se encontraron eventos
                </h3>
                <p className="text-gray-600">
                  Intenta ajustar los filtros de búsqueda
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <Card className="mt-12 bg-gradient-to-br from-[#003B7A] to-[#003B7A]/90 text-white">
          <CardContent className="p-12">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">¿Listo para ser parte del próximo evento?</h2>
              <p className="text-white/90 text-lg mb-8">
                Únete a nuestra comunidad y vive experiencias increíbles junto a miles de distribuidores de todo el mundo.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/distribuidor/eventos">
                  <Button variant="secondary" size="lg">
                    Ver Próximos Eventos
                  </Button>
                </Link>
                <Link href="/registro">
                  <Button variant="primary" size="lg">
                    Comenzar Ahora
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Simple Lightbox Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div className="max-w-6xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-white">{selectedEvent.title}</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-white hover:text-gray-300 text-3xl"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[80vh] overflow-y-auto">
              {selectedEvent.photos.map((photo, idx) => (
                <div key={idx} className="relative aspect-video">
                  <Image
                    src={photo.url}
                    alt={photo.caption || selectedEvent.title}
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
