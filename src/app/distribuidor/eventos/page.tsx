'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  SparklesIcon,
  PlayCircleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  FireIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid, StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
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
    hostAvatar: 'https://ui-avatars.com/api/?name=Laura+Mendoza&background=7AB82E&color=fff',
    attendees: 245,
    maxAttendees: 500,
    description: 'Aprende las mejores técnicas para vender productos por redes sociales',
    isRegistered: true,
    link: 'https://zoom.us/j/123456789',
    status: 'upcoming',
    image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=200&fit=crop',
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
    hostAvatar: 'https://ui-avatars.com/api/?name=Roberto+Sanchez&background=003B7A&color=fff',
    attendees: 89,
    maxAttendees: 150,
    description: 'Reunión trimestral de distribuidores de la zona centro',
    isRegistered: false,
    status: 'upcoming',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=200&fit=crop',
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
    image: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=400&h=200&fit=crop',
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
    hostAvatar: 'https://ui-avatars.com/api/?name=Diana+Flores&background=F59E0B&color=fff',
    attendees: 156,
    maxAttendees: 300,
    description: 'Técnicas profesionales para superar objeciones de clientes',
    isRegistered: true,
    status: 'upcoming',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop',
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
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop',
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
    hostAvatar: 'https://ui-avatars.com/api/?name=Carlos+Ruiz&background=8B5CF6&color=fff',
    attendees: 312,
    maxAttendees: 500,
    description: 'Fundamentos de nutrición para compartir con tus clientes',
    isRegistered: true,
    status: 'past',
    recordingUrl: 'https://example.com/recording',
    image: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&h=200&fit=crop',
  },
];

const eventTypeConfig = {
  webinar: {
    label: 'Webinar',
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: VideoCameraIcon,
    gradient: 'from-blue-500 to-blue-600'
  },
  meeting: {
    label: 'Reunión',
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: UserGroupIcon,
    gradient: 'from-purple-500 to-purple-600'
  },
  promotion: {
    label: 'Promoción',
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: ShoppingBagIcon,
    gradient: 'from-orange-500 to-orange-600'
  },
  training: {
    label: 'Capacitación',
    color: 'bg-emerald-500',
    lightColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: AcademicCapIcon,
    gradient: 'from-emerald-500 to-emerald-600'
  },
  convention: {
    label: 'Convención',
    color: 'bg-rose-500',
    lightColor: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: TrophyIcon,
    gradient: 'from-rose-500 to-rose-600'
  },
};

export default function EventosPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 0));
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('upcoming');
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const filteredEvents = mockEvents.filter(event => {
    if (filterType !== 'all' && event.type !== filterType) return false;
    if (filterStatus !== 'all' && event.status !== filterStatus) return false;
    return true;
  });

  const upcomingEvents = mockEvents.filter(e => e.status === 'upcoming');
  const registeredEvents = mockEvents.filter(e => e.isRegistered);
  const featuredEvent = mockEvents.find(e => e.featured);

  const handleRegister = (eventId: string, eventTitle: string) => {
    toast.success(`¡Registrado exitosamente en: ${eventTitle}!`);
  };

  const handleUnregister = (eventId: string, eventTitle: string) => {
    toast.info(`Registro cancelado: ${eventTitle}`);
  };

  const handleAddToCalendar = (eventTitle: string) => {
    toast.success(`Evento agregado a tu calendario: ${eventTitle}`);
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        {/* Background with gradient and pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#3E667D] via-[#0052a3] to-[#3E667D]">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#C8DDF2] rounded-full blur-[150px] transform translate-x-1/3 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-400 rounded-full blur-[120px] transform -translate-x-1/3 translate-y-1/2" />
          </div>
          {/* Animated grid pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-8">
            <Link href="/distribuidor" className="hover:text-white transition-colors">
              Panel Principal
            </Link>
            <ChevronRightIcon className="h-4 w-4" />
            <span className="text-white font-medium">Eventos</span>
          </nav>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl">
                  <CalendarIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
                    Eventos
                  </h1>
                  <p className="text-white/70 text-lg mt-1">
                    Webinars, reuniones, capacitaciones y más
                  </p>
                </div>
              </div>
            </div>

            <Link href="/distribuidor">
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
              >
                Volver al Panel Principal
              </Button>
            </Link>
          </div>

          {/* Stats Cards - Floating style */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10 -mb-20 relative z-10">
            <div className="bg-white rounded-2xl p-6 shadow-xl shadow-black/5 border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Próximos Eventos</p>
                  <p className="text-4xl font-bold text-gray-900">{upcomingEvents.length}</p>
                  <p className="text-xs text-gray-400 mt-1">Este mes</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <CalendarIcon className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-xl shadow-black/5 border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Registrado en</p>
                  <p className="text-4xl font-bold text-gray-900">{registeredEvents.length}</p>
                  <p className="text-xs text-[#3E667D] mt-1 flex items-center gap-1">
                    <CheckCircleSolid className="h-3 w-3" /> Confirmados
                  </p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircleIcon className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#C8DDF2] to-[#5d9020] rounded-2xl p-6 shadow-xl shadow-[#3E667D]/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/80 mb-1">Recordatorios</p>
                  <p className="text-4xl font-bold text-white">3</p>
                  <p className="text-xs text-white/70 mt-1">Activos</p>
                </div>
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <BellIcon className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        {/* Featured Event - Redesigned */}
        {featuredEvent && (
          <div className="mb-10">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#3E667D] via-[#4d7a8f] to-[#3E667D] shadow-2xl">
              {/* Background Image with overlay */}
              <div className="absolute inset-0">
                <Image
                  src={featuredEvent.image || ''}
                  alt={featuredEvent.title}
                  fill
                  className="object-cover opacity-20"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#3E667D] via-[#3E667D]/95 to-transparent" />
              </div>

              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#C8DDF2]/20 rounded-full blur-[100px]" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]" />

              <div className="relative p-8 lg:p-12">
                <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-900 shadow-lg">
                        <StarSolid className="h-4 w-4" />
                        Evento Destacado
                      </span>
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white/90 backdrop-blur-sm border border-white/20">
                        <FireIcon className="h-3.5 w-3.5 text-orange-400" />
                        ¡No te lo pierdas!
                      </span>
                    </div>

                    <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 tracking-tight">
                      {featuredEvent.title}
                    </h2>

                    <p className="text-white/80 text-lg mb-6 max-w-2xl">
                      {featuredEvent.description}
                    </p>

                    <div className="flex flex-wrap gap-4 mb-8">
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white/90">
                        <CalendarIcon className="h-5 w-5 text-[#3E667D]" />
                        <span className="font-medium">
                          {new Date(featuredEvent.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                          {featuredEvent.endDate && ` - ${new Date(featuredEvent.endDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white/90">
                        <MapPinIcon className="h-5 w-5 text-[#3E667D]" />
                        <span className="font-medium">{featuredEvent.location}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white/90">
                        <UserGroupIcon className="h-5 w-5 text-[#3E667D]" />
                        <span className="font-medium">{featuredEvent.attendees?.toLocaleString()} registrados</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <Button
                        variant="primary"
                        size="lg"
                        className="bg-[#3E667D] hover:bg-[#2f5165] shadow-xl shadow-[#3E667D]/30 text-base px-8"
                        onClick={() => handleRegister(featuredEvent.id, featuredEvent.title)}
                      >
                        Registrarse Ahora
                        <ArrowRightIcon className="h-5 w-5 ml-2" />
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm text-base"
                        onClick={() => handleAddToCalendar(featuredEvent.title)}
                      >
                        <CalendarIcon className="h-5 w-5 mr-2" />
                        Agregar al Calendario
                      </Button>
                    </div>
                  </div>

                  {/* Progress indicator */}
                  <div className="lg:w-72">
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                      <p className="text-white/70 text-sm font-medium mb-3">Cupos disponibles</p>
                      <div className="flex items-end gap-2 mb-4">
                        <span className="text-4xl font-bold text-white">
                          {((featuredEvent.maxAttendees || 2000) - (featuredEvent.attendees || 0)).toLocaleString()}
                        </span>
                        <span className="text-white/60 mb-1">/ {featuredEvent.maxAttendees?.toLocaleString()}</span>
                      </div>
                      <div className="h-3 bg-white/20 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-gradient-to-r from-[#C8DDF2] to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${((featuredEvent.attendees || 0) / (featuredEvent.maxAttendees || 2000)) * 100}%` }}
                        />
                      </div>
                      <p className="text-white/60 text-xs">
                        {Math.round(((featuredEvent.attendees || 0) / (featuredEvent.maxAttendees || 2000)) * 100)}% de cupos ocupados
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Calendar */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="overflow-hidden border-0 shadow-xl shadow-gray-200/50">
              <CardContent className="p-0">
                {/* Calendar Header */}
                <div className="bg-gradient-to-r from-[#3E667D] to-[#4d7a8f] p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white capitalize">
                      {currentMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="flex gap-1">
                      <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <ChevronLeftIcon className="h-5 w-5 text-white" />
                      </button>
                      <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <ChevronRightIcon className="h-5 w-5 text-white" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  {/* Week days */}
                  <div className="grid grid-cols-7 gap-1 mb-3">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, index) => (
                      <div key={index} className="text-center text-xs font-semibold text-gray-400 py-2">
                        {day.charAt(0)}
                      </div>
                    ))}
                  </div>

                  {/* Days grid */}
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
                      const isHovered = hoveredDay === day;

                      return (
                        <div
                          key={day}
                          onMouseEnter={() => setHoveredDay(day)}
                          onMouseLeave={() => setHoveredDay(null)}
                          className={`aspect-square flex flex-col items-center justify-center text-sm rounded-xl cursor-pointer transition-all duration-200 relative ${
                            isToday
                              ? 'bg-[#3E667D] text-white font-bold shadow-lg shadow-[#3E667D]/30 scale-105'
                              : hasEvents
                              ? 'bg-[#C8DDF2]/10 text-gray-900 font-semibold hover:bg-[#C8DDF2]/20 hover:scale-105'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <span>{day}</span>
                          {hasEvents && (
                            <div className="flex gap-0.5 mt-0.5">
                              {dayEvents.slice(0, 3).map((event, idx) => {
                                const config = eventTypeConfig[event.type as keyof typeof eventTypeConfig];
                                return (
                                  <div
                                    key={idx}
                                    className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : config?.color || 'bg-[#C8DDF2]'}`}
                                  />
                                );
                              })}
                            </div>
                          )}
                          {/* Tooltip */}
                          {isHovered && hasEvents && (
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-50 shadow-xl">
                              {dayEvents.length} evento{dayEvents.length > 1 ? 's' : ''}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-3">Tipos de evento</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(eventTypeConfig).slice(0, 4).map(([key, config]) => (
                        <div key={key} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${config.color}`} />
                          <span className="text-xs text-gray-600">{config.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="p-5 pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed border-2 hover:border-[#a7c1e2] hover:text-[#3E667D] hover:bg-[#C8DDF2]/5"
                    leftIcon={<PlusIcon className="h-4 w-4" />}
                    onClick={() => toast.info('Función próximamente disponible')}
                  >
                    Crear Evento Personal
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links Card */}
            <Card className="border-0 shadow-lg shadow-gray-200/50 overflow-hidden">
              <CardContent className="p-0">
                <div className="p-5 bg-gradient-to-br from-gray-50 to-white">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <SparklesIcon className="h-5 w-5 text-[#3E667D]" />
                    Acciones Rápidas
                  </h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => toast.info('Sincronizando con Google Calendar')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white hover:shadow-md transition-all text-left group"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CalendarIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Sincronizar Calendario</p>
                        <p className="text-xs text-gray-500">Google Calendar</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setFilterStatus('past')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white hover:shadow-md transition-all text-left group"
                    >
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <PlayCircleIcon className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Ver Grabaciones</p>
                        <p className="text-xs text-gray-500">Eventos pasados</p>
                      </div>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Events List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filters */}
            <Card className="border-0 shadow-lg shadow-gray-200/50">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                      Tipo de Evento
                    </label>
                    <SearchableSelect
                      options={[
                        { value: 'webinar', label: 'Webinars' },
                        { value: 'meeting', label: 'Reuniones' },
                        { value: 'training', label: 'Capacitaciones' },
                        { value: 'promotion', label: 'Promociones' },
                        { value: 'convention', label: 'Convenciones' },
                      ]}
                      value={filterType}
                      onChange={setFilterType}
                      allLabel="Todos los tipos"
                      allValue="all"
                      className="w-full"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                      Estado
                    </label>
                    <SearchableSelect
                      options={[
                        { value: 'upcoming', label: 'Próximos' },
                        { value: 'past', label: 'Pasados' },
                      ]}
                      value={filterStatus}
                      onChange={setFilterStatus}
                      allLabel="Todos"
                      allValue="all"
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Events List */}
            <div className="space-y-4">
              {filteredEvents.length === 0 ? (
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-16 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CalendarIcon className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No hay eventos
                    </h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                      Intenta ajustar los filtros de búsqueda o revisa más tarde
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredEvents.filter(e => !e.featured).map((event) => {
                  const typeConfig = eventTypeConfig[event.type as keyof typeof eventTypeConfig];
                  const TypeIcon = typeConfig?.icon || CalendarIcon;

                  return (
                    <Card
                      key={event.id}
                      className="border-0 shadow-lg shadow-gray-200/50 hover:shadow-xl transition-all duration-300 overflow-hidden group"
                    >
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row">
                          {/* Event Image */}
                          {event.image && (
                            <div className="md:w-48 h-40 md:h-auto relative overflow-hidden flex-shrink-0">
                              <Image
                                src={event.image}
                                alt={event.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent md:bg-gradient-to-r" />
                              <div className={`absolute top-3 left-3 w-10 h-10 ${typeConfig?.color || 'bg-gray-500'} rounded-xl flex items-center justify-center shadow-lg`}>
                                <TypeIcon className="h-5 w-5 text-white" />
                              </div>
                            </div>
                          )}

                          {/* Event Content */}
                          <div className="flex-1 p-5">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${typeConfig?.lightColor || 'bg-gray-100 text-gray-700'}`}>
                                    {typeConfig?.label || 'Evento'}
                                  </span>
                                  {event.status === 'past' && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                                      Finalizado
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg group-hover:text-[#3E667D] transition-colors">
                                  {event.title}
                                </h3>
                              </div>
                              {event.isRegistered && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                                  <CheckCircleSolid className="h-4 w-4" />
                                  Registrado
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                              {event.description}
                            </p>

                            <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-sm">
                              <div className="flex items-center gap-1.5 text-gray-500">
                                <CalendarIcon className="h-4 w-4" />
                                <span>
                                  {new Date(event.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                  {event.endDate && ` - ${new Date(event.endDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-500">
                                <ClockIcon className="h-4 w-4" />
                                <span>{event.time} • {event.duration}</span>
                              </div>
                              {event.attendees !== undefined && (
                                <div className="flex items-center gap-1.5 text-gray-500">
                                  <UserGroupIcon className="h-4 w-4" />
                                  <span>{event.attendees} asistentes</span>
                                </div>
                              )}
                            </div>

                            {/* Host info */}
                            {event.host && event.hostAvatar && (
                              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
                                <Image
                                  src={event.hostAvatar}
                                  alt={event.host}
                                  width={36}
                                  height={36}
                                  className="rounded-full"
                                />
                                <div>
                                  <p className="text-xs text-gray-500">Presentado por</p>
                                  <p className="text-sm font-semibold text-gray-900">{event.host}</p>
                                </div>
                              </div>
                            )}

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
                                          className="bg-[#3E667D] hover:bg-[#2f5165]"
                                          leftIcon={<VideoCameraIcon className="h-4 w-4" />}
                                          onClick={() => window.open(event.link, '_blank')}
                                        >
                                          Unirse
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleUnregister(event.id, event.title)}
                                      >
                                        Cancelar
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      className="bg-[#3E667D] hover:bg-[#2f5165]"
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
                                    Agendar
                                  </Button>
                                </>
                              )}
                              {event.status === 'past' && event.recordingUrl && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="bg-purple-600 hover:bg-purple-700"
                                  leftIcon={<PlayCircleIcon className="h-4 w-4" />}
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
