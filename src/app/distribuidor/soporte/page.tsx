'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  QuestionMarkCircleIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  BookOpenIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  TruckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const faqCategories = [
  {
    id: 'productos',
    name: 'Productos',
    icon: ShieldCheckIcon,
    faqs: [
      {
        question: '¿Los productos están certificados?',
        answer: 'Sí, todos nuestros productos cuentan con certificación COFEPRIS y están fabricados bajo estándares internacionales de calidad.',
      },
      {
        question: '¿Cuál es la fecha de caducidad de los productos?',
        answer: 'Todos los productos tienen mínimo 12 meses de caducidad al momento de la entrega. La fecha exacta viene impresa en el empaque.',
      },
      {
        question: '¿Tienen efectos secundarios los suplementos?',
        answer: 'Nuestros productos son naturales y seguros. Sin embargo, recomendamos consultar con un médico antes de consumir si estás embarazada, lactando o bajo tratamiento médico.',
      },
    ],
  },
  {
    id: 'pedidos',
    name: 'Pedidos y Envíos',
    icon: TruckIcon,
    faqs: [
      {
        question: '¿Cuánto tarda el envío?',
        answer: 'Los envíos tardan de 3 a 5 días hábiles en llegar a tu domicilio después de confirmar el pedido.',
      },
      {
        question: '¿Puedo rastrear mi pedido?',
        answer: 'Sí, una vez que tu pedido sea enviado, recibirás un número de guía para rastrear tu paquete en tiempo real.',
      },
      {
        question: '¿Qué hago si mi pedido llega dañado?',
        answer: 'Contáctanos dentro de las 48 horas siguientes a la entrega con fotos del producto. Haremos el reemplazo sin costo adicional.',
      },
    ],
  },
  {
    id: 'comisiones',
    name: 'Comisiones y Pagos',
    icon: CreditCardIcon,
    faqs: [
      {
        question: '¿Cuándo recibo mis comisiones?',
        answer: 'Las comisiones se depositan entre el 5 y 10 de cada mes por las ventas del mes anterior.',
      },
      {
        question: '¿Cómo calculo mis comisiones?',
        answer: 'Las comisiones se calculan según tu rango: 25% nivel 1, 10% nivel 2, y 5% nivel 3. Puedes ver el desglose en tu panel de comisiones.',
      },
      {
        question: '¿Puedo cambiar mi método de pago?',
        answer: 'Sí, puedes actualizar tu método de pago en cualquier momento desde la sección de Pagos en tu cuenta.',
      },
    ],
  },
  {
    id: 'red',
    name: 'Red y Equipo',
    icon: UserGroupIcon,
    faqs: [
      {
        question: '¿Cómo recluto nuevos distribuidores?',
        answer: 'Comparte tu enlace de referido único. Cuando alguien se registre usando tu enlace, automáticamente se agregará a tu red.',
      },
      {
        question: '¿Cuántos niveles puedo tener en mi red?',
        answer: 'Nuestro plan de compensación incluye 3 niveles de comisiones sobre las ventas de tu equipo.',
      },
      {
        question: '¿Cómo asciendo de rango?',
        answer: 'Los rangos se basan en tu volumen de ventas personal y de equipo. Consulta los requisitos en la sección de Rangos.',
      },
    ],
  },
];

const mockTickets = [
  {
    id: '1',
    subject: 'Problema con pago de comisiones',
    status: 'open',
    priority: 'high',
    date: '2025-01-24',
    lastUpdate: '2025-01-25',
    category: 'Comisiones',
  },
  {
    id: '2',
    subject: 'Cambio de método de pago',
    status: 'in_progress',
    priority: 'medium',
    date: '2025-01-20',
    lastUpdate: '2025-01-23',
    category: 'Pagos',
  },
  {
    id: '3',
    subject: 'Consulta sobre nuevo producto',
    status: 'resolved',
    priority: 'low',
    date: '2025-01-15',
    lastUpdate: '2025-01-16',
    category: 'Productos',
  },
];

const contactMethods = [
  {
    id: 'chat',
    name: 'Chat en Vivo',
    description: 'Respuesta inmediata de 9am a 6pm',
    icon: ChatBubbleLeftRightIcon,
    availability: 'Disponible ahora',
    color: 'green',
  },
  {
    id: 'email',
    name: 'Email',
    description: 'soporte@toniclife.com',
    icon: EnvelopeIcon,
    availability: 'Respuesta en 24hrs',
    color: 'blue',
  },
  {
    id: 'phone',
    name: 'Teléfono',
    description: '+52 55 1234 5678',
    icon: PhoneIcon,
    availability: 'Lun-Vie 9am-6pm',
    color: 'purple',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: '+52 55 8765 4321',
    icon: ChatBubbleLeftRightIcon,
    availability: '24/7',
    color: 'green',
  },
];

const resources = [
  {
    id: '1',
    title: 'Guía de Inicio Rápido',
    description: 'Todo lo que necesitas saber para empezar',
    icon: BookOpenIcon,
    type: 'PDF',
    url: '#',
  },
  {
    id: '2',
    title: 'Video: Cómo usar el Portal',
    description: 'Tutorial completo del portal de distribuidores',
    icon: VideoCameraIcon,
    type: 'Video',
    url: '#',
  },
  {
    id: '3',
    title: 'Manual de Productos',
    description: 'Información detallada de cada producto',
    icon: DocumentTextIcon,
    type: 'PDF',
    url: '#',
  },
  {
    id: '4',
    title: 'Academia de Capacitación',
    description: 'Cursos completos de ventas y liderazgo',
    icon: AcademicCapIcon,
    type: 'Cursos',
    url: '/distribuidor/capacitacion',
  },
];

const statusConfig = {
  open: { label: 'Abierto', color: 'bg-blue-100 text-blue-800', icon: ExclamationCircleIcon },
  in_progress: { label: 'En Proceso', color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
  resolved: { label: 'Resuelto', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
  closed: { label: 'Cerrado', color: 'bg-gray-100 text-gray-800', icon: XCircleIcon },
};

const priorityConfig = {
  low: { label: 'Baja', color: 'text-gray-600' },
  medium: { label: 'Media', color: 'text-yellow-600' },
  high: { label: 'Alta', color: 'text-red-600' },
};

export default function SoportePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);

  const filteredFaqs = selectedCategory
    ? faqCategories.find(cat => cat.id === selectedCategory)?.faqs || []
    : faqCategories.flatMap(cat => cat.faqs);

  const searchedFaqs = searchQuery
    ? filteredFaqs.filter(faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredFaqs;

  const handleContactMethod = (method: string) => {
    toast.info(`Iniciando contacto por ${method}`);
  };

  const handleCreateTicket = () => {
    toast.success('Ticket creado exitosamente', {
      description: 'Te contactaremos pronto',
    });
    setShowNewTicketModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <QuestionMarkCircleIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Centro de Ayuda</h1>
              </div>
              <p className="text-white/80 text-lg">
                ¿En qué podemos ayudarte hoy?
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
        {/* Search Bar */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
              <input
                type="text"
                placeholder="Busca tu pregunta aquí..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {contactMethods.map((method) => {
            const IconComponent = method.icon;
            return (
              <Card key={method.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleContactMethod(method.name)}>
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                    method.color === 'green' ? 'bg-green-100' :
                    method.color === 'blue' ? 'bg-blue-100' :
                    method.color === 'purple' ? 'bg-purple-100' :
                    'bg-gray-100'
                  }`}>
                    <IconComponent className={`h-6 w-6 ${
                      method.color === 'green' ? 'text-green-600' :
                      method.color === 'blue' ? 'text-blue-600' :
                      method.color === 'purple' ? 'text-purple-600' :
                      'text-gray-600'
                    }`} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{method.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{method.description}</p>
                  <span className={`text-xs font-medium ${
                    method.availability.includes('Disponible') ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {method.availability}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - FAQs */}
          <div className="lg:col-span-2 space-y-6">
            {/* FAQ Categories */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas Frecuentes</h2>

                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedCategory === null
                        ? 'bg-[#003B7A] text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    Todas
                  </button>
                  {faqCategories.map((category) => {
                    const IconComponent = category.icon;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                          selectedCategory === category.id
                            ? 'bg-[#003B7A] text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                        {category.name}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-4">
                  {searchedFaqs.length === 0 ? (
                    <div className="text-center py-12">
                      <QuestionMarkCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        No se encontraron resultados
                      </h3>
                      <p className="text-gray-600">
                        Intenta con otra búsqueda o contacta a soporte
                      </p>
                    </div>
                  ) : (
                    searchedFaqs.map((faq, index) => (
                      <details key={index} className="group border border-gray-200 rounded-lg">
                        <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
                          <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                          <svg
                            className="w-5 h-5 text-gray-500 transition-transform group-open:rotate-180"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        <div className="px-4 pb-4 text-gray-600">
                          {faq.answer}
                        </div>
                      </details>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resources */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Recursos Útiles</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {resources.map((resource) => {
                    const IconComponent = resource.icon;
                    return (
                      <div key={resource.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <IconComponent className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-1">
                              <h4 className="font-semibold text-gray-900 text-sm">{resource.title}</h4>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {resource.type}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">{resource.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Support Tickets */}
          <div className="lg:col-span-1 space-y-6">
            {/* Create Ticket */}
            <Card className="bg-gradient-to-br from-[#7AB82E] to-[#7AB82E]/90 text-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-2">¿No encuentras lo que buscas?</h3>
                <p className="text-white/90 text-sm mb-4">
                  Crea un ticket y nuestro equipo te ayudará
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowNewTicketModal(true)}
                >
                  Crear Ticket de Soporte
                </Button>
              </CardContent>
            </Card>

            {/* My Tickets */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Mis Tickets</h3>
                <div className="space-y-3">
                  {mockTickets.map((ticket) => {
                    const status = statusConfig[ticket.status as keyof typeof statusConfig];
                    const StatusIcon = status.icon;
                    const priority = priorityConfig[ticket.priority as keyof typeof priorityConfig];

                    return (
                      <div key={ticket.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm text-gray-900 line-clamp-1">
                            {ticket.subject}
                          </h4>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                          <span className={`font-medium ${priority.color}`}>
                            {priority.label}
                          </span>
                          <span>•</span>
                          <span>{ticket.category}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Creado: {new Date(ticket.date).toLocaleDateString('es-MX')}</span>
                          <span>Actualizado: {new Date(ticket.lastUpdate).toLocaleDateString('es-MX')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => toast.info('Abriendo todos los tickets')}
                >
                  Ver Todos los Tickets
                </Button>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4">Enlaces Rápidos</h3>
                <div className="space-y-2">
                  <Link href="/distribuidor/capacitacion">
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      📚 Capacitación
                    </Button>
                  </Link>
                  <Link href="/distribuidor/materiales">
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      🎨 Material de Marketing
                    </Button>
                  </Link>
                  <Link href="/distribuidor/comisiones">
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      💰 Comisiones
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => toast.info('Abriendo términos y condiciones')}
                  >
                    📋 Términos y Condiciones
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* New Ticket Modal */}
        {showNewTicketModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Nuevo Ticket de Soporte</h2>
                  <button
                    onClick={() => setShowNewTicketModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría
                    </label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent">
                      <option value="">Selecciona una categoría</option>
                      <option value="productos">Productos</option>
                      <option value="pedidos">Pedidos y Envíos</option>
                      <option value="comisiones">Comisiones y Pagos</option>
                      <option value="red">Red y Equipo</option>
                      <option value="tecnico">Soporte Técnico</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prioridad
                    </label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent">
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Asunto
                    </label>
                    <input
                      type="text"
                      placeholder="Describe brevemente tu problema"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      rows={6}
                      placeholder="Proporciona todos los detalles posibles..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adjuntar Archivos (Opcional)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#7AB82E] transition-colors cursor-pointer">
                      <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Arrastra archivos aquí o haz clic para seleccionar
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG, PDF hasta 10MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowNewTicketModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleCreateTicket}
                  >
                    Crear Ticket
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
