'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  BellIcon,
  UserIcon,
  CalendarIcon,
  ServerIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  category: string;
  message: string;
  user?: string;
  ipAddress?: string;
  details?: string;
}

const mockLogs: LogEntry[] = [
  {
    id: '1',
    timestamp: '2025-01-25T18:45:23',
    level: 'error',
    category: 'Payment',
    message: 'Error procesando pago con Stripe',
    user: 'Patricia González',
    ipAddress: '187.188.100.23',
    details: 'Card declined: insufficient_funds',
  },
  {
    id: '2',
    timestamp: '2025-01-25T18:40:12',
    level: 'success',
    category: 'Order',
    message: 'Pedido completado exitosamente',
    user: 'Laura Mendoza',
    ipAddress: '201.123.45.67',
    details: 'Order ID: ORD-12456, Total: $13,977 MXN',
  },
  {
    id: '3',
    timestamp: '2025-01-25T18:35:45',
    level: 'warning',
    category: 'Inventory',
    message: 'Stock bajo detectado',
    details: 'Producto: Omega 3 Premium, Stock actual: 8 unidades',
  },
  {
    id: '4',
    timestamp: '2025-01-25T18:30:00',
    level: 'info',
    category: 'User',
    message: 'Nuevo usuario registrado',
    user: 'Fernando García',
    ipAddress: '192.168.1.100',
    details: 'Role: Distributor, Email: fernando.garcia@email.com',
  },
  {
    id: '5',
    timestamp: '2025-01-25T18:25:33',
    level: 'error',
    category: 'Email',
    message: 'Error enviando email de confirmación',
    user: 'Sistema',
    details: 'SMTP timeout after 30 seconds',
  },
  {
    id: '6',
    timestamp: '2025-01-25T18:20:15',
    level: 'warning',
    category: 'Security',
    message: 'Múltiples intentos de login fallidos',
    user: 'miguel.torres@email.com',
    ipAddress: '187.188.100.99',
    details: '5 intentos fallidos en los últimos 10 minutos',
  },
  {
    id: '7',
    timestamp: '2025-01-25T18:15:00',
    level: 'success',
    category: 'Commission',
    message: 'Comisiones procesadas correctamente',
    details: 'Período: Enero 2025, Total distribuido: $79,175 MXN',
  },
  {
    id: '8',
    timestamp: '2025-01-25T18:10:42',
    level: 'info',
    category: 'System',
    message: 'Backup automático completado',
    details: 'Tamaño: 2.3 GB, Duración: 15 minutos',
  },
  {
    id: '9',
    timestamp: '2025-01-25T18:05:20',
    level: 'error',
    category: 'API',
    message: 'Error en endpoint de productos',
    details: 'GET /api/products - Status: 500 Internal Server Error',
  },
  {
    id: '10',
    timestamp: '2025-01-25T18:00:00',
    level: 'info',
    category: 'Shipping',
    message: 'Envío generado',
    user: 'Diana Flores',
    details: 'Guía: 1234567890, Paquetería: FedEx',
  },
  {
    id: '11',
    timestamp: '2025-01-25T17:55:30',
    level: 'warning',
    category: 'Payment',
    message: 'Pago OXXO pendiente de confirmación',
    user: 'Carlos Ramírez',
    details: 'Referencia: 98765432, Expira: 2025-01-27',
  },
  {
    id: '12',
    timestamp: '2025-01-25T17:50:15',
    level: 'success',
    category: 'Product',
    message: 'Producto actualizado',
    user: 'Admin',
    details: 'SKU: VIT-D3K2-001, Campo: stock, Nuevo valor: 156',
  },
];

const mockSystemMetrics = {
  uptime: '15 días, 8 horas',
  cpuUsage: 42,
  memoryUsage: 68,
  diskUsage: 55,
  activeUsers: 127,
  requestsPerMinute: 234,
  avgResponseTime: 145,
  errorRate: 0.8,
};

export default function LogsPage() {
  const [logs, setLogs] = useState(mockLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.user?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchesCategory = filterCategory === 'all' || log.category === filterCategory;
    return matchesSearch && matchesLevel && matchesCategory;
  });

  const stats = {
    total: logs.length,
    errors: logs.filter(l => l.level === 'error').length,
    warnings: logs.filter(l => l.level === 'warning').length,
    info: logs.filter(l => l.level === 'info' || l.level === 'success').length,
  };

  const categories = Array.from(new Set(logs.map(l => l.category)));

  const handleExport = () => {
    toast.success('Exportando logs del sistema...');
  };

  const handleClearLogs = () => {
    setLogs([]);
    toast.success('Logs eliminados correctamente');
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <XCircleIcon className="h-3 w-3" />
            Error
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <ExclamationTriangleIcon className="h-3 w-3" />
            Warning
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Success
          </span>
        );
      case 'info':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <InformationCircleIcon className="h-3 w-3" />
            Info
          </span>
        );
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ClipboardDocumentListIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Logs y Monitoreo</h1>
              </div>
              <p className="text-white/80 text-lg">
                Registros del sistema y métricas de rendimiento
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin">
                <Button variant="secondary">
                  Volver al Dashboard
                </Button>
              </Link>
              <Button
                variant="primary"
                leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
                onClick={handleExport}
              >
                Exportar Logs
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <ServerIcon className="h-6 w-6 text-green-600" />
                </div>
                <span className="text-sm font-medium text-green-600">Operacional</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">Uptime</p>
              <p className="text-2xl font-bold text-gray-900">{mockSystemMetrics.uptime}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-blue-600">{mockSystemMetrics.requestsPerMinute}/min</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">Usuarios Activos</p>
              <p className="text-2xl font-bold text-gray-900">{mockSystemMetrics.activeUsers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  mockSystemMetrics.cpuUsage > 80 ? 'bg-red-100' :
                  mockSystemMetrics.cpuUsage > 60 ? 'bg-yellow-100' : 'bg-green-100'
                }`}>
                  <ArrowPathIcon className={`h-6 w-6 ${
                    mockSystemMetrics.cpuUsage > 80 ? 'text-red-600' :
                    mockSystemMetrics.cpuUsage > 60 ? 'text-yellow-600' : 'text-green-600'
                  }`} />
                </div>
                <span className="text-sm font-medium text-gray-600">Mem: {mockSystemMetrics.memoryUsage}%</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">CPU Usage</p>
              <p className="text-2xl font-bold text-gray-900">{mockSystemMetrics.cpuUsage}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  mockSystemMetrics.errorRate > 5 ? 'bg-red-100' :
                  mockSystemMetrics.errorRate > 2 ? 'bg-yellow-100' : 'bg-green-100'
                }`}>
                  <ExclamationTriangleIcon className={`h-6 w-6 ${
                    mockSystemMetrics.errorRate > 5 ? 'text-red-600' :
                    mockSystemMetrics.errorRate > 2 ? 'text-yellow-600' : 'text-green-600'
                  }`} />
                </div>
                <span className="text-sm font-medium text-gray-600">{mockSystemMetrics.avgResponseTime}ms</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">Error Rate</p>
              <p className="text-2xl font-bold text-gray-900">{mockSystemMetrics.errorRate}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Log Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Logs</span>
                <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Errores</span>
                <span className="text-2xl font-bold text-red-600">{stats.errors}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Warnings</span>
                <span className="text-2xl font-bold text-yellow-600">{stats.warnings}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Info</span>
                <span className="text-2xl font-bold text-blue-600">{stats.info}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar en logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Level Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  <option value="all">Todos los Niveles</option>
                  <option value="error">Errores</option>
                  <option value="warning">Warnings</option>
                  <option value="success">Success</option>
                  <option value="info">Info</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  <option value="all">Todas las Categorías</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Auto Refresh */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => {
                    setAutoRefresh(e.target.checked);
                    toast.info(e.target.checked ? 'Auto-refresh activado' : 'Auto-refresh desactivado');
                  }}
                  className="w-5 h-5 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                />
                <span className="text-sm font-medium text-gray-700">Auto-refresh</span>
              </label>

              {/* Clear Logs */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearLogs}
              >
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`border-l-4 p-4 rounded-r-lg ${
                    log.level === 'error' ? 'border-red-500 bg-red-50' :
                    log.level === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                    log.level === 'success' ? 'border-green-500 bg-green-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getLevelBadge(log.level)}
                      <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {log.category}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{formatTimestamp(log.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 mb-2">{log.message}</p>
                  {log.details && (
                    <p className="text-sm text-gray-700 mb-2 font-mono bg-white/50 p-2 rounded">
                      {log.details}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    {log.user && (
                      <div className="flex items-center gap-1">
                        <UserIcon className="h-3 w-3" />
                        <span>{log.user}</span>
                      </div>
                    )}
                    {log.ipAddress && (
                      <span>IP: {log.ipAddress}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredLogs.length === 0 && (
              <div className="text-center py-12">
                <ClipboardDocumentListIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No se encontraron logs
                </h3>
                <p className="text-gray-600">
                  Intenta ajustar los filtros de búsqueda
                </p>
              </div>
            )}

            {/* Pagination */}
            {filteredLogs.length > 0 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Mostrando {filteredLogs.length} de {logs.length} logs
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
