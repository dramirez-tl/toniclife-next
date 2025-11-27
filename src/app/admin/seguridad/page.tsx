'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  ServerIcon,
  KeyIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
  CloudArrowUpIcon,
  ArrowPathIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface BackupItem {
  id: string;
  name: string;
  type: 'automatic' | 'manual';
  size: string;
  date: string;
  status: 'completed' | 'in_progress' | 'failed';
  duration?: string;
}

const mockBackups: BackupItem[] = [
  {
    id: '1',
    name: 'Backup Completo - 25 Enero 2025',
    type: 'automatic',
    size: '2.3 GB',
    date: '2025-01-25T18:10:00',
    status: 'completed',
    duration: '15 minutos',
  },
  {
    id: '2',
    name: 'Backup Completo - 24 Enero 2025',
    type: 'automatic',
    size: '2.2 GB',
    date: '2025-01-24T18:10:00',
    status: 'completed',
    duration: '14 minutos',
  },
  {
    id: '3',
    name: 'Backup Manual - Base de Datos',
    type: 'manual',
    size: '1.8 GB',
    date: '2025-01-24T14:30:00',
    status: 'completed',
    duration: '8 minutos',
  },
  {
    id: '4',
    name: 'Backup Completo - 23 Enero 2025',
    type: 'automatic',
    size: '2.1 GB',
    date: '2025-01-23T18:10:00',
    status: 'completed',
    duration: '13 minutos',
  },
  {
    id: '5',
    name: 'Backup Completo - 22 Enero 2025',
    type: 'automatic',
    size: '2.0 GB',
    date: '2025-01-22T18:10:00',
    status: 'completed',
    duration: '12 minutos',
  },
];

const mockSecurityEvents = [
  {
    id: '1',
    type: 'warning',
    event: 'Múltiples intentos de login fallidos',
    user: 'miguel.torres@email.com',
    ip: '187.188.100.99',
    timestamp: '2025-01-25T18:20:15',
    action: 'Cuenta bloqueada temporalmente',
  },
  {
    id: '2',
    type: 'success',
    event: 'Login exitoso con 2FA',
    user: 'Roberto Sánchez',
    ip: '192.168.1.100',
    timestamp: '2025-01-25T17:45:00',
  },
  {
    id: '3',
    type: 'warning',
    event: 'Acceso desde nueva ubicación',
    user: 'Laura Mendoza',
    ip: '201.123.45.67',
    timestamp: '2025-01-25T16:30:00',
    action: 'Verificación por email enviada',
  },
  {
    id: '4',
    type: 'error',
    event: 'Intento de acceso no autorizado',
    user: 'unknown@example.com',
    ip: '45.123.67.89',
    timestamp: '2025-01-25T15:20:00',
    action: 'IP bloqueada',
  },
  {
    id: '5',
    type: 'success',
    event: 'Cambio de contraseña',
    user: 'Diana Flores',
    ip: '192.168.1.105',
    timestamp: '2025-01-25T14:10:00',
  },
];

export default function SeguridadPage() {
  const [backups, setBackups] = useState(mockBackups);
  const [backupSettings, setBackupSettings] = useState({
    autoBackupEnabled: true,
    backupFrequency: 'daily',
    backupTime: '18:00',
    retentionDays: 30,
    includeDatabase: true,
    includeFiles: true,
    includeImages: true,
    cloudBackupEnabled: true,
    encryptBackups: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorRequired: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordExpiry: 90,
    ipWhitelisting: false,
    auditLogging: true,
  });

  const stats = {
    totalBackups: backups.length,
    totalSize: '10.4 GB',
    lastBackup: backups[0].date,
    nextBackup: 'Hoy a las 18:00',
  };

  const handleCreateBackup = () => {
    toast.success('Iniciando backup manual del sistema...');
  };

  const handleRestoreBackup = (backupId: string) => {
    toast.info(`Preparando restauración del backup ${backupId}...`);
  };

  const handleDownloadBackup = (backupId: string) => {
    toast.success(`Descargando backup ${backupId}...`);
  };

  const handleDeleteBackup = (backupId: string) => {
    setBackups(backups.filter(b => b.id !== backupId));
    toast.success('Backup eliminado correctamente');
  };

  const handleSaveSettings = () => {
    toast.success('Configuración guardada correctamente');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Completado
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <ArrowPathIcon className="h-3 w-3 animate-spin" />
            En Proceso
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <ExclamationTriangleIcon className="h-3 w-3" />
            Fallido
          </span>
        );
      default:
        return null;
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Success
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <ExclamationTriangleIcon className="h-3 w-3" />
            Warning
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <LockClosedIcon className="h-3 w-3" />
            Blocked
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
                <ShieldCheckIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Backup y Seguridad</h1>
              </div>
              <p className="text-white/80 text-lg">
                Gestión de backups y configuración de seguridad
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
                leftIcon={<CloudArrowUpIcon className="h-5 w-5" />}
                onClick={handleCreateBackup}
              >
                Crear Backup
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Backup Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Backups</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalBackups}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <DocumentDuplicateIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tamaño Total</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalSize}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <ServerIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Último Backup</p>
                  <p className="text-lg font-bold text-green-600">
                    {new Date(stats.lastBackup).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Próximo Backup</p>
                  <p className="text-lg font-bold text-blue-600">{stats.nextBackup}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Backup Settings */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Configuración de Backups</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={backupSettings.autoBackupEnabled}
                    onChange={(e) => setBackupSettings({ ...backupSettings, autoBackupEnabled: e.target.checked })}
                    className="w-5 h-5 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Habilitar backups automáticos
                  </span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frecuencia de Backup
                  </label>
                  <select
                    value={backupSettings.backupFrequency}
                    onChange={(e) => setBackupSettings({ ...backupSettings, backupFrequency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                  >
                    <option value="hourly">Cada hora</option>
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora del Backup
                  </label>
                  <input
                    type="time"
                    value={backupSettings.backupTime}
                    onChange={(e) => setBackupSettings({ ...backupSettings, backupTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Retención (días)
                  </label>
                  <input
                    type="number"
                    value={backupSettings.retentionDays}
                    onChange={(e) => setBackupSettings({ ...backupSettings, retentionDays: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                  />
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Incluir en Backup:</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={backupSettings.includeDatabase}
                        onChange={(e) => setBackupSettings({ ...backupSettings, includeDatabase: e.target.checked })}
                        className="w-4 h-4 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                      />
                      <span className="text-sm text-gray-700">Base de datos</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={backupSettings.includeFiles}
                        onChange={(e) => setBackupSettings({ ...backupSettings, includeFiles: e.target.checked })}
                        className="w-4 h-4 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                      />
                      <span className="text-sm text-gray-700">Archivos del sistema</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={backupSettings.includeImages}
                        onChange={(e) => setBackupSettings({ ...backupSettings, includeImages: e.target.checked })}
                        className="w-4 h-4 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                      />
                      <span className="text-sm text-gray-700">Imágenes y media</span>
                    </label>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={backupSettings.cloudBackupEnabled}
                      onChange={(e) => setBackupSettings({ ...backupSettings, cloudBackupEnabled: e.target.checked })}
                      className="w-4 h-4 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                    />
                    <span className="text-sm text-gray-700">Subir a la nube automáticamente</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={backupSettings.encryptBackups}
                      onChange={(e) => setBackupSettings({ ...backupSettings, encryptBackups: e.target.checked })}
                      className="w-4 h-4 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                    />
                    <span className="text-sm text-gray-700">Encriptar backups</span>
                  </label>
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleSaveSettings}
                >
                  Guardar Configuración
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Configuración de Seguridad</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={securitySettings.twoFactorRequired}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, twoFactorRequired: e.target.checked })}
                    className="w-5 h-5 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700 block">
                      Requerir autenticación de dos factores
                    </span>
                    <span className="text-xs text-gray-500">
                      Obligatorio para todos los administradores
                    </span>
                  </div>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiempo de Sesión (minutos)
                  </label>
                  <input
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Intentos Máx. de Login
                  </label>
                  <input
                    type="number"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiración de Contraseña (días)
                  </label>
                  <input
                    type="number"
                    value={securitySettings.passwordExpiry}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, passwordExpiry: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                  />
                </div>

                <div className="border-t pt-4 space-y-2">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={securitySettings.ipWhitelisting}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, ipWhitelisting: e.target.checked })}
                      className="w-4 h-4 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-gray-700 block">Whitelist de IPs</span>
                      <span className="text-xs text-gray-500">
                        Solo permitir acceso desde IPs autorizadas
                      </span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={securitySettings.auditLogging}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, auditLogging: e.target.checked })}
                      className="w-4 h-4 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-gray-700 block">Registro de auditoría</span>
                      <span className="text-xs text-gray-500">
                        Registrar todas las acciones de administradores
                      </span>
                    </div>
                  </label>
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleSaveSettings}
                >
                  Guardar Configuración
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Backups List */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Historial de Backups</h2>
            <div className="space-y-3">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{backup.name}</h3>
                      {getStatusBadge(backup.status)}
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        backup.type === 'automatic' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {backup.type === 'automatic' ? 'Automático' : 'Manual'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{formatDate(backup.date)}</span>
                      </div>
                      <span>•</span>
                      <span>Tamaño: {backup.size}</span>
                      {backup.duration && (
                        <>
                          <span>•</span>
                          <span>Duración: {backup.duration}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                      onClick={() => handleDownloadBackup(backup.id)}
                    >
                      Descargar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<ArrowUpTrayIcon className="h-4 w-4" />}
                      onClick={() => handleRestoreBackup(backup.id)}
                    >
                      Restaurar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security Events */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Eventos de Seguridad Recientes</h2>
            <div className="space-y-3">
              {mockSecurityEvents.map((event) => (
                <div
                  key={event.id}
                  className="border-l-4 p-4 rounded-r-lg bg-gray-50"
                  style={{
                    borderColor: event.type === 'error' ? '#ef4444' :
                                event.type === 'warning' ? '#f59e0b' : '#10b981'
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getEventBadge(event.type)}
                      <span className="text-sm text-gray-600">
                        {formatDate(event.timestamp)}
                      </span>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 mb-2">{event.event}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Usuario: {event.user}</span>
                    <span>•</span>
                    <span>IP: {event.ip}</span>
                  </div>
                  {event.action && (
                    <p className="text-sm text-gray-700 mt-2 font-medium">
                      Acción: {event.action}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
