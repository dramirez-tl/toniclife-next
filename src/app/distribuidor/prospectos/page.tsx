'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  UserPlusIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  FunnelIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const mockProspects = [
  {
    id: '1',
    name: 'Ana Martínez',
    phone: '+52 111 222 3333',
    email: 'ana@email.com',
    source: 'Facebook',
    status: 'hot',
    lastContact: '2025-01-24',
    notes: 'Interesada en productos de inmunidad',
    nextAction: 'Llamar para seguimiento',
    interest: 'Cliente',
  },
  {
    id: '2',
    name: 'Carlos López',
    phone: '+52 444 555 6666',
    email: 'carlos@email.com',
    source: 'Referido',
    status: 'warm',
    lastContact: '2025-01-20',
    notes: 'Preguntó sobre oportunidad de negocio',
    nextAction: 'Enviar presentación de plan',
    interest: 'Distribuidor',
  },
  {
    id: '3',
    name: 'Diana Hernández',
    phone: '+52 777 888 9999',
    email: 'diana@email.com',
    source: 'Instagram',
    status: 'cold',
    lastContact: '2025-01-15',
    notes: 'Pidió información general',
    nextAction: 'WhatsApp de seguimiento',
    interest: 'Cliente',
  },
  {
    id: '4',
    name: 'Roberto García',
    phone: '+52 333 444 5555',
    email: 'roberto@email.com',
    source: 'Evento',
    status: 'hot',
    lastContact: '2025-01-25',
    notes: 'Asistió a webinar, muy interesado',
    nextAction: 'Agendar reunión 1-a-1',
    interest: 'Distribuidor',
  },
  {
    id: '5',
    name: 'Lucía Torres',
    phone: '+52 666 777 8888',
    email: 'lucia@email.com',
    source: 'WhatsApp',
    status: 'converted',
    lastContact: '2025-01-22',
    notes: 'Compró paquete inicial',
    nextAction: 'Hacer seguimiento post-venta',
    interest: 'Cliente',
  },
];

const scripts = [
  {
    id: '1',
    title: 'Llamada de Prospección Inicial',
    type: 'Llamada',
    description: 'Script para primera llamada a prospecto frío',
    content: '¡Hola [Nombre]! Soy [Tu Nombre] de Tonic Life. Vi que estabas interesado/a en mejorar tu salud y bienestar...',
  },
  {
    id: '2',
    title: 'Mensaje WhatsApp Seguimiento',
    type: 'WhatsApp',
    description: 'Mensaje de seguimiento después de primer contacto',
    content: 'Hola [Nombre] 👋 ¿Ya tuviste oportunidad de revisar la información que te compartí sobre [Producto/Oportunidad]?',
  },
  {
    id: '3',
    title: 'Email Presentación Negocio',
    type: 'Email',
    description: 'Email formal presentando oportunidad de negocio',
    content: 'Estimado/a [Nombre], Me gustaría compartir contigo una oportunidad que está transformando vidas...',
  },
  {
    id: '4',
    title: 'Manejo de Objeciones - Precio',
    type: 'Script',
    description: 'Respuestas a objeciones sobre precio',
    content: 'Entiendo tu preocupación sobre el precio. Déjame preguntarte, ¿cuánto valoras tu salud?...',
  },
];

const statusConfig = {
  hot: { label: 'Caliente', color: 'bg-red-100 text-red-800', icon: '🔥' },
  warm: { label: 'Tibio', color: 'bg-orange-100 text-orange-800', icon: '⚡' },
  cold: { label: 'Frío', color: 'bg-blue-100 text-blue-800', icon: '❄️' },
  converted: { label: 'Convertido', color: 'bg-green-100 text-green-800', icon: '✅' },
  lost: { label: 'Perdido', color: 'bg-gray-100 text-gray-800', icon: '❌' },
};

export default function ProspectosPage() {
  const [prospects, setProspects] = useState(mockProspects);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScriptsModal, setShowScriptsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredProspects = prospects.filter(p => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterStatus !== 'all' && p.status !== filterStatus) {
      return false;
    }
    return true;
  });

  const handleContact = (prospect: typeof mockProspects[0], method: string) => {
    toast.success(`Iniciando ${method} con ${prospect.name}`);
  };

  const handleCopyScript = (script: typeof scripts[0]) => {
    navigator.clipboard.writeText(script.content);
    toast.success('Script copiado al portapapeles');
  };

  const stats = {
    total: prospects.length,
    hot: prospects.filter(p => p.status === 'hot').length,
    warm: prospects.filter(p => p.status === 'warm').length,
    converted: prospects.filter(p => p.status === 'converted').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <UserPlusIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Gestión de Prospectos</h1>
              </div>
              <p className="text-white/80 text-lg">
                Administra tu pipeline de ventas
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
                onClick={() => setShowAddModal(true)}
              >
                Nuevo Prospecto
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
                  <p className="text-sm text-gray-600 mb-1">Total Prospectos</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <UserPlusIcon className="h-12 w-12 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Calientes 🔥</p>
                  <p className="text-3xl font-bold text-red-600">{stats.hot}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tibios ⚡</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.warm}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Convertidos ✅</p>
                  <p className="text-3xl font-bold text-green-600">{stats.converted}</p>
                </div>
                <CheckCircleIcon className="h-12 w-12 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scripts Quick Access */}
        <Card className="mb-6 bg-gradient-to-r from-[#7AB82E] to-[#7AB82E]/90 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                  <ClipboardDocumentListIcon className="h-5 w-5" />
                  Scripts de Venta
                </h3>
                <p className="text-white/90 text-sm">
                  {scripts.length} plantillas disponibles para tus conversaciones
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowScriptsModal(true)}
              >
                Ver Scripts
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar prospectos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
              >
                <option value="all">Todos los estados</option>
                <option value="hot">Calientes</option>
                <option value="warm">Tibios</option>
                <option value="cold">Fríos</option>
                <option value="converted">Convertidos</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Prospects List */}
        <div className="space-y-4">
          {filteredProspects.map((prospect) => {
            const status = statusConfig[prospect.status as keyof typeof statusConfig];
            return (
              <Card key={prospect.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-[#003B7A] to-[#7AB82E] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {prospect.name.split(' ').map(n => n[0]).join('')}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-gray-900">{prospect.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                              {status.icon} {status.label}
                            </span>
                            <span className="text-xs text-gray-500">Interés: {prospect.interest}</span>
                            <span className="text-xs text-gray-500">• Fuente: {prospect.source}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">📝 Notas:</p>
                          <p className="text-sm text-gray-900">{prospect.notes}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">🎯 Próxima acción:</p>
                          <p className="text-sm font-medium text-[#003B7A]">{prospect.nextAction}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          Último contacto: {new Date(prospect.lastContact).toLocaleDateString('es-MX')}
                        </span>
                        <span>📧 {prospect.email}</span>
                        <span>📱 {prospect.phone}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<PhoneIcon className="h-4 w-4" />}
                          onClick={() => handleContact(prospect, 'llamada')}
                        >
                          Llamar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<ChatBubbleLeftIcon className="h-4 w-4" />}
                          onClick={() => handleContact(prospect, 'WhatsApp')}
                        >
                          WhatsApp
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<EnvelopeIcon className="h-4 w-4" />}
                          onClick={() => handleContact(prospect, 'email')}
                        >
                          Email
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.info('Abriendo edición')}
                        >
                          Editar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Scripts Modal */}
        {showScriptsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[80vh] overflow-auto">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Scripts de Venta</h2>
                  <button
                    onClick={() => setShowScriptsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {scripts.map((script) => (
                    <div key={script.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-gray-900">{script.title}</h3>
                          <p className="text-sm text-gray-600">{script.description}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                            {script.type}
                          </span>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded p-3 mb-3 mt-3">
                        <p className="text-sm text-gray-700">{script.content}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<ClipboardDocumentListIcon className="h-4 w-4" />}
                        onClick={() => handleCopyScript(script)}
                      >
                        Copiar Script
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
