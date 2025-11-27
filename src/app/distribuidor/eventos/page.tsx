'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  VideoCameraIcon,
  TrophyIcon,
  AcademicCapIcon,
  ShoppingBagIcon,
  BellIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const mockEvents = [
  {
    id: '1',
    title: 'Webinar: Estrategias de Venta Digital',
    type: 'webinar',
    date: '2025-01-28',
    time: '19:00',
    duration: '2 horas',
    location: 'Online - Zoom',
    host: 'Laura Mendoza',
    attendees: 245,
    maxAttendees: 500,
    description: 'Aprende las mejores técnicas para vender productos por redes sociales',
    isRegistered: true,
    link: 'https://zoom.us/j/123456789',
    status: 'upcoming',
  },
  {
    id: '2',
    title: 'Reunión Regional - CDMX',
    type: 'meeting',
    date: '2025-02-05',
    time: '10:00',
    duration: '4 horas',
    location: 'Hotel Sheraton, Reforma 325, CDMX',
    host: 'Roberto Sánchez',
    attendees: 89,
    maxAttendees: 150,
    description: 'Reunión trimestral de distribuidores de la zona centro',
    isRegistered: false,
    status: 'upcoming',
  },
  {
    id: '3',
    title: 'Promoción Especial Febrero',
    type: 'promotion',
    date: '2025-02-01',
    endDate: '2025-02-14',
    time: '00:00',
    duration: '14 días',
    location: 'Online',
    description: '20% descuento en productos seleccionados + bonos especiales',
    status: 'upcoming',
  },
  {
    id: '4',
    title: 'Capacitación: Manejo de Objeciones',
    type: 'training',
    date: '2025-02-10',
    time: '18:00',
    duration: '1.5 horas',
    location: 'Online - Google Meet',
    host: 'Diana Flores',
    attendees: 156,
    maxAttendees: 300,
    description: 'Técnicas profesionales para superar objeciones de clientes',
    isRegistered: true,
    status: 'upcoming',
  },
  {
    id: '5',
    title: 'Convención Anual Tonic Life 2025',
    type: 'convention',
    date: '2025-03-15',
    endDate: '2025-03-17',
    time: '09:00',
    duration: '3 días',
    location: 'Centro Banamex, CDMX',
    host: 'Tonic Life',
    attendees: 1245,
    maxAttendees: 2000,
    description: 'El evento más importante del año con lanzamientos, premios y networking',
    isRegistered: false,
    status: 'upcoming',
    featured: true,
  },
  {
    id: '6',
    title: 'Webinar: Nutrición y Bienestar',
    type: 'webinar',
    date: '2025-01-20',
    time: '19:00',
    duration: '1.5 horas',
    location: 'Online - Zoom',
    host: 'Dr. Carlos Ruiz',
    attendees: 312,
    maxAttendees: 500,
    description: 'Fundamentos de nutrición para compartir con tus clientes',
    isRegistered: true,
    status: 'past',
    recordingUrl: 'https://example.com/recording',
  },
];

const eventTypeConfig = {
  webinar: { label: 'Webinar', color: 'bg-blue-100 text-blue-800', icon: VideoCameraIcon },
  meeting: { label: 'Reunión', color: 'bg-purple-100 text-purple-800', icon: UserGroupIcon },
  promotion: { label: 'Promoción', color: 'bg-orange-100 text-orange-800', icon: ShoppingBagIcon },
  training: { label: 'Capacitación', color: 'bg-green-100 text-green-800', icon: AcademicCapIcon },
  convention: { label: 'Convención', color: 'bg-red-100 text-red-800', icon: TrophyIcon },
};

export default function EventosPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 0)); // January 2025
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('upcoming');

  const filteredEvents = mockEvents.filter(event => {
    if (filterType !== 'all' && event.type !== filterType) return false;
    if (filterStatus !== 'all' && event.status !== filterStatus) return false;
    return true;
  });

  const upcomingEvents = mockEvents.filter(e => e.status === 'upcoming');
  const registeredEvents = mockEvents.filter(e => e.isRegistered);

  const handleRegister = (eventId: string, eventTitle: string) => {
    toast.success(`¡Registrado exitosamente en: ${eventTitle}!`);
  };

  const handleUnregister = (eventId: string, eventTitle: string) => {
    toast.info(`Registro cancelado: ${eventTitle}`);
  };

  const handleAddToCalendar = (eventTitle: string) => {
    toast.success(`Evento agregado a tu calendario: ${eventTitle}`);
  };

  // Calendar generation
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return mockEvents.filter(e => e.date === dateStr || (e.endDate && e.date <= dateStr && e.endDate >= dateStr));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CalendarIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Calendario de Eventos</h1>
              </div>
              <p className="text-white/80 text-lg">
                Webinars, reuniones, promociones y más
              </p>
            </div>
            <Link href="/distribuidor">
              <Button variant="secondary">
                Volver al Dashboard
              </Button>
            </Link>
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
                  <p className="text-sm text-gray-600 mb-1">Próximos Eventos</p>
                  <p className="text-3xl font-bold text-gray-900">{upcomingEvents.length}</p>
                </div>
                <CalendarIcon className="h-12 w-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Eventos Registrados</p>
                  <p className="text-3xl font-bold text-gray-900">{registeredEvents.length}</p>
                </div>
                <BellIcon className="h-12 w-12 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#7AB82E] to-[#7AB82E]/90 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 mb-1">Recordatorios Activos</p>
                  <p className="text-3xl font-bold">3</p>
                </div>
                <BellIcon className="h-12 w-12 text-white/80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Featured Event Banner */}
        {mockEvents.find(e => e.featured) && (
          <Card className="mb-8 bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrophyIcon className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900">
                      ⭐ Evento Destacado
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">
                    {mockEvents.find(e => e.featured)?.title}
                  </h3>
                  <p className="text-white/90 mb-4">
                    {mockEvents.find(e => e.featured)?.description}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm mb-4">
                    <span className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {mockEvents.find(e => e.featured)?.date && new Date(mockEvents.find(e => e.featured)!.date).toLocaleDateString('es-MX')}
                      {mockEvents.find(e => e.featured)?.endDate && ` - ${new Date(mockEvents.find(e => e.featured)!.endDate!).toLocaleDateString('es-MX')}`}
                    </span>
                    <span className="flex items-center gap-2">
                      <MapPinIcon className="h-4 w-4" />
                      {mockEvents.find(e => e.featured)?.location}
                    </span>
                    <span className="flex items-center gap-2">
                      <UserGroupIcon className="h-4 w-4" />
                      {mockEvents.find(e => e.featured)?.attendees} registrados
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => handleRegister(mockEvents.find(e => e.featured)!.id, mockEvents.find(e => e.featured)!.title)}
                  >
                    Registrarse Ahora
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Calendar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">
                    {currentMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={prevMonth}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                    </button>
                    <button
                      onClick={nextMonth}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: startingDayOfWeek }, (_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dayEvents = getEventsForDay(day);
                    const hasEvents = dayEvents.length > 0;
                    const isToday = new Date().getDate() === day &&
                                    new Date().getMonth() === currentMonth.getMonth() &&
                                    new Date().getFullYear() === currentMonth.getFullYear();

                    return (
                      <div
                        key={day}
                        className={`aspect-square flex flex-col items-center justify-center text-sm rounded-lg cursor-pointer transition-colors ${
                          isToday
                            ? 'bg-[#003B7A] text-white font-bold'
                            : hasEvents
                            ? 'bg-[#7AB82E]/10 text-gray-900 font-semibold hover:bg-[#7AB82E]/20'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span>{day}</span>
                        {hasEvents && (
                          <div className="flex gap-0.5 mt-1">
                            {dayEvents.slice(0, 3).map((_, idx) => (
                              <div key={idx} className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-[#7AB82E]'}`} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Quick Actions */}
                <div className="mt-6 pt-6 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mb-2"
                    leftIcon={<PlusIcon className="h-4 w-4" />}
                    onClick={() => toast.info('Función próximamente disponible')}
                  >
                    Crear Evento Personal
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => toast.info('Sincronizando con Google Calendar')}
                  >
                    Sincronizar con Google Calendar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Events List */}
          <div className="lg:col-span-2">
            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                  >
                    <option value="all">Todos los tipos</option>
                    <option value="webinar">Webinars</option>
                    <option value="meeting">Reuniones</option>
                    <option value="training">Capacitaciones</option>
                    <option value="promotion">Promociones</option>
                    <option value="convention">Convenciones</option>
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="upcoming">Próximos</option>
                    <option value="past">Pasados</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Events List */}
            <div className="space-y-4">
              {filteredEvents.length === 0 ? (
                <Card>
                  <CardContent className="p-16 text-center">
                    <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No hay eventos
                    </h3>
                    <p className="text-gray-600">
                      Intenta ajustar los filtros de búsqueda
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredEvents.map((event) => {
                  const typeConfig = eventTypeConfig[event.type as keyof typeof eventTypeConfig];
                  const TypeIcon = typeConfig.icon;

                  return (
                    <Card key={event.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            event.type === 'webinar' ? 'bg-blue-100' :
                            event.type === 'meeting' ? 'bg-purple-100' :
                            event.type === 'promotion' ? 'bg-orange-100' :
                            event.type === 'training' ? 'bg-green-100' :
                            'bg-red-100'
                          }`}>
                            <TypeIcon className={`h-6 w-6 ${
                              event.type === 'webinar' ? 'text-blue-600' :
                              event.type === 'meeting' ? 'text-purple-600' :
                              event.type === 'promotion' ? 'text-orange-600' :
                              event.type === 'training' ? 'text-green-600' :
                              'text-red-600'
                            }`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-bold text-gray-900 text-lg mb-1">
                                  {event.title}
                                </h3>
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${typeConfig.color}`}>
                                  {typeConfig.label}
                                </span>
                              </div>
                              {event.isRegistered && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                  ✓ Registrado
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-gray-600 mb-3">
                              {event.description}
                            </p>

                            <div className="grid md:grid-cols-2 gap-3 mb-4">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <CalendarIcon className="h-4 w-4" />
                                {new Date(event.date).toLocaleDateString('es-MX')}
                                {event.endDate && ` - ${new Date(event.endDate).toLocaleDateString('es-MX')}`}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <ClockIcon className="h-4 w-4" />
                                {event.time} • {event.duration}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MapPinIcon className="h-4 w-4" />
                                {event.location}
                              </div>
                              {event.attendees !== undefined && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <UserGroupIcon className="h-4 w-4" />
                                  {event.attendees}{event.maxAttendees && `/${event.maxAttendees}`} asistentes
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2">
                              {event.status === 'upcoming' && (
                                <>
                                  {event.isRegistered ? (
                                    <>
                                      {event.link && (
                                        <Button
                                          variant="primary"
                                          size="sm"
                                          leftIcon={<VideoCameraIcon className="h-4 w-4" />}
                                          onClick={() => window.open(event.link, '_blank')}
                                        >
                                          Unirse al Evento
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleUnregister(event.id, event.title)}
                                      >
                                        Cancelar Registro
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => handleRegister(event.id, event.title)}
                                    >
                                      Registrarse
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    leftIcon={<CalendarIcon className="h-4 w-4" />}
                                    onClick={() => handleAddToCalendar(event.title)}
                                  >
                                    Agregar a Calendario
                                  </Button>
                                </>
                              )}
                              {event.status === 'past' && event.recordingUrl && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  leftIcon={<VideoCameraIcon className="h-4 w-4" />}
                                  onClick={() => window.open(event.recordingUrl, '_blank')}
                                >
                                  Ver Grabación
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
