'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  PuzzlePieceIcon,
  CheckCircleIcon,
  XCircleIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

const mockIntegrations = [
  {
    id: '1',
    name: 'WhatsApp Business',
    description: 'Conecta tu cuenta de WhatsApp Business para enviar mensajes automatizados',
    category: 'Comunicación',
    icon: '💬',
    color: 'green',
    isConnected: true,
    lastSync: '2025-01-25T14:30:00',
    features: ['Mensajes automáticos', 'Respuestas rápidas', 'Catálogo de productos'],
    status: 'active',
  },
  {
    id: '2',
    name: 'Google Calendar',
    description: 'Sincroniza tus eventos y reuniones con Google Calendar',
    category: 'Productividad',
    icon: '📅',
    color: 'blue',
    isConnected: true,
    lastSync: '2025-01-25T12:00:00',
    features: ['Sincronización bidireccional', 'Recordatorios', 'Eventos de equipo'],
    status: 'active',
  },
  {
    id: '3',
    name: 'Mailchimp',
    description: 'Gestiona campañas de email marketing y automatizaciones',
    category: 'Marketing',
    icon: '📧',
    color: 'yellow',
    isConnected: false,
    features: ['Campañas automáticas', 'Segmentación', 'Reportes'],
    status: 'available',
  },
  {
    id: '4',
    name: 'Stripe',
    description: 'Procesa pagos en línea de manera segura',
    category: 'Pagos',
    icon: '💳',
    color: 'purple',
    isConnected: false,
    features: ['Pagos con tarjeta', 'Checkout seguro', 'Reportes financieros'],
    status: 'available',
  },
  {
    id: '5',
    name: 'Zapier',
    description: 'Automatiza tareas conectando múltiples aplicaciones',
    category: 'Automatización',
    icon: '⚡',
    color: 'orange',
    isConnected: false,
    features: ['1000+ integraciones', 'Flujos personalizados', 'Triggers automáticos'],
    status: 'available',
  },
  {
    id: '6',
    name: 'Facebook Business',
    description: 'Gestiona tus publicaciones y anuncios de Facebook',
    category: 'Redes Sociales',
    icon: '👥',
    color: 'blue',
    isConnected: true,
    lastSync: '2025-01-25T10:00:00',
    features: ['Publicación automática', 'Estadísticas', 'Gestión de anuncios'],
    status: 'active',
  },
  {
    id: '7',
    name: 'Instagram Business',
    description: 'Programa y publica contenido en Instagram',
    category: 'Redes Sociales',
    icon: '📸',
    color: 'pink',
    isConnected: false,
    features: ['Stories automáticas', 'Calendario de contenido', 'Analytics'],
    status: 'available',
  },
  {
    id: '8',
    name: 'Zoom',
    description: 'Integra reuniones y webinars de Zoom',
    category: 'Comunicación',
    icon: '🎥',
    color: 'blue',
    isConnected: false,
    features: ['Webinars automáticos', 'Grabaciones', 'Reportes de asistencia'],
    status: 'available',
  },
  {
    id: '9',
    name: 'Google Drive',
    description: 'Almacena y comparte archivos en la nube',
    category: 'Almacenamiento',
    icon: '📁',
    color: 'blue',
    isConnected: true,
    lastSync: '2025-01-25T08:00:00',
    features: ['Almacenamiento ilimitado', 'Compartir archivos', 'Colaboración'],
    status: 'active',
  },
  {
    id: '10',
    name: 'Slack',
    description: 'Comunicación en equipo en tiempo real',
    category: 'Comunicación',
    icon: '💼',
    color: 'purple',
    isConnected: false,
    features: ['Canales de equipo', 'Mensajería directa', 'Notificaciones'],
    status: 'available',
  },
];

const categories = ['Todas', 'Comunicación', 'Productividad', 'Marketing', 'Pagos', 'Automatización', 'Redes Sociales', 'Almacenamiento'];

export default function IntegracionesPage() {
  const [integrations, setIntegrations] = useState(mockIntegrations);
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredIntegrations = integrations.filter(integration => {
    if (filterCategory !== 'Todas' && integration.category !== filterCategory) return false;
    if (filterStatus === 'connected' && !integration.isConnected) return false;
    if (filterStatus === 'available' && integration.isConnected) return false;
    return true;
  });

  const stats = {
    total: integrations.length,
    connected: integrations.filter(i => i.isConnected).length,
    available: integrations.filter(i => !i.isConnected).length,
  };

  const handleConnect = (integrationId: string) => {
    setIntegrations(integrations.map(integration =>
      integration.id === integrationId
        ? { ...integration, isConnected: true, lastSync: new Date().toISOString(), status: 'active' as const }
        : integration
    ));
    toast.success('Integración conectada exitosamente');
  };

  const handleDisconnect = (integrationId: string) => {
    setIntegrations(integrations.map(integration =>
      integration.id === integrationId
        ? { ...integration, isConnected: false, lastSync: undefined, status: 'available' as const }
        : integration
    ));
    toast.info('Integración desconectada');
  };

  const handleSync = (integrationName: string) => {
    toast.success(`Sincronizando ${integrationName}...`);
  };

  const formatLastSync = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <PuzzlePieceIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Integraciones</h1>
              </div>
              <p className="text-white/80 text-lg">
                Conecta tus herramientas favoritas
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
                  <p className="text-sm text-gray-600 mb-1">Total Integraciones</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <PuzzlePieceIcon className="h-12 w-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#7AB82E] to-[#7AB82E]/90 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 mb-1">Conectadas</p>
                  <p className="text-3xl font-bold">{stats.connected}</p>
                </div>
                <CheckCircleSolidIcon className="h-12 w-12 text-white/80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Disponibles</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.available}</p>
                </div>
                <Cog6ToothIcon className="h-12 w-12 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                >
                  <option value="all">Todas</option>
                  <option value="connected">Conectadas</option>
                  <option value="available">Disponibles</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFilterCategory('Todas');
                    setFilterStatus('all');
                  }}
                >
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integrations Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {filteredIntegrations.map((integration) => (
            <Card key={integration.id} className={`hover:shadow-lg transition-shadow ${
              integration.isConnected ? 'border-2 border-green-200' : ''
            }`}>
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-4xl ${
                    integration.color === 'green' ? 'bg-green-100' :
                    integration.color === 'blue' ? 'bg-blue-100' :
                    integration.color === 'yellow' ? 'bg-yellow-100' :
                    integration.color === 'purple' ? 'bg-purple-100' :
                    integration.color === 'orange' ? 'bg-orange-100' :
                    integration.color === 'pink' ? 'bg-pink-100' :
                    'bg-gray-100'
                  }`}>
                    {integration.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-bold text-gray-900 text-lg">{integration.name}</h3>
                      {integration.isConnected && (
                        <CheckCircleSolidIcon className="h-6 w-6 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      integration.category === 'Comunicación' ? 'bg-blue-100 text-blue-800' :
                      integration.category === 'Productividad' ? 'bg-green-100 text-green-800' :
                      integration.category === 'Marketing' ? 'bg-purple-100 text-purple-800' :
                      integration.category === 'Pagos' ? 'bg-yellow-100 text-yellow-800' :
                      integration.category === 'Automatización' ? 'bg-orange-100 text-orange-800' :
                      integration.category === 'Redes Sociales' ? 'bg-pink-100 text-pink-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {integration.category}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4">
                  {integration.description}
                </p>

                {/* Features */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Características:</p>
                  <ul className="space-y-1">
                    {integration.features.map((feature, idx) => (
                      <li key={idx} className="text-xs text-gray-600 flex items-center gap-2">
                        <CheckCircleIcon className="h-3 w-3 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Status */}
                {integration.isConnected && integration.lastSync && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-800 font-medium flex items-center gap-2">
                        <ShieldCheckIcon className="h-4 w-4" />
                        Conectado
                      </span>
                      <span className="text-green-600 text-xs">
                        Última sync: {formatLastSync(integration.lastSync)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {integration.isConnected ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                        onClick={() => handleSync(integration.name)}
                      >
                        Sincronizar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Cog6ToothIcon className="h-4 w-4" />}
                        onClick={() => toast.info('Abriendo configuración')}
                      >
                        Configurar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<XCircleIcon className="h-4 w-4" />}
                        onClick={() => handleDisconnect(integration.id)}
                      >
                        Desconectar
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      leftIcon={<CheckCircleIcon className="h-4 w-4" />}
                      onClick={() => handleConnect(integration.id)}
                    >
                      Conectar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Help Section */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-2">¿Necesitas ayuda con las integraciones?</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Todas las integraciones están protegidas con encriptación de nivel empresarial.
                  Puedes conectar y desconectar tus cuentas en cualquier momento de forma segura.
                </p>
                <Link href="/distribuidor/soporte">
                  <Button variant="outline" size="sm">
                    Contactar Soporte
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
