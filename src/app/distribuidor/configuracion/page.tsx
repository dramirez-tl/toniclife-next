'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Cog6ToothIcon,
  BellIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  EyeIcon,
  EyeSlashIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  LockClosedIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState({
    // Notifications
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    salesAlerts: true,
    commissionAlerts: true,
    teamAlerts: true,
    weeklyReport: true,
    monthlyReport: true,

    // Privacy
    profileVisibility: 'team',
    showEmail: false,
    showPhone: false,
    allowMessages: true,

    // Language & Region
    language: 'es',
    timezone: 'America/Mexico_City',
    currency: 'MXN',
    dateFormat: 'DD/MM/YYYY',

    // Security
    twoFactorEnabled: false,
    sessionTimeout: '30',
    loginAlerts: true,
  });

  const handleToggle = (key: string) => {
    setSettings({ ...settings, [key]: !settings[key as keyof typeof settings] });
    toast.success('Configuración actualizada');
  };

  const handleChange = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = () => {
    toast.success('Configuración guardada exitosamente');
  };

  const handleResetSettings = () => {
    toast.info('Configuración restablecida a valores predeterminados');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Cog6ToothIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Configuración Avanzada</h1>
              </div>
              <p className="text-white/80 text-lg">
                Personaliza tu experiencia en el portal
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
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Navigation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4">Categorías</h3>
                <nav className="space-y-1">
                  <a href="#notifications" className="block px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <BellIcon className="h-5 w-5" />
                      <span className="text-sm font-medium">Notificaciones</span>
                    </div>
                  </a>
                  <a href="#privacy" className="block px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <ShieldCheckIcon className="h-5 w-5" />
                      <span className="text-sm font-medium">Privacidad</span>
                    </div>
                  </a>
                  <a href="#language" className="block px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <GlobeAltIcon className="h-5 w-5" />
                      <span className="text-sm font-medium">Idioma y Región</span>
                    </div>
                  </a>
                  <a href="#security" className="block px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <LockClosedIcon className="h-5 w-5" />
                      <span className="text-sm font-medium">Seguridad</span>
                    </div>
                  </a>
                  <a href="#account" className="block px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <UserCircleIcon className="h-5 w-5" />
                      <span className="text-sm font-medium">Cuenta</span>
                    </div>
                  </a>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Right Content - Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Notifications Section */}
            <Card id="notifications">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <BellIcon className="h-6 w-6 text-[#003B7A]" />
                  <h2 className="text-2xl font-bold text-gray-900">Notificaciones</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <EnvelopeIcon className="h-5 w-5 text-gray-600 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">Notificaciones por Email</p>
                        <p className="text-sm text-gray-600">Recibe actualizaciones en tu correo</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle('emailNotifications')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.emailNotifications ? 'bg-[#7AB82E]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <DevicePhoneMobileIcon className="h-5 w-5 text-gray-600 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">Notificaciones SMS</p>
                        <p className="text-sm text-gray-600">Recibe alertas por mensaje de texto</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle('smsNotifications')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.smsNotifications ? 'bg-[#7AB82E]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.smsNotifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <BellIcon className="h-5 w-5 text-gray-600 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">Notificaciones Push</p>
                        <p className="text-sm text-gray-600">Notificaciones en tiempo real en el navegador</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle('pushNotifications')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.pushNotifications ? 'bg-[#7AB82E]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.pushNotifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <hr className="my-4" />

                  <h3 className="font-semibold text-gray-900 mb-3">Alertas Específicas</h3>

                  <div className="space-y-3">
                    {[
                      { key: 'salesAlerts', label: 'Alertas de Ventas', desc: 'Notificar cuando se realicen ventas' },
                      { key: 'commissionAlerts', label: 'Alertas de Comisiones', desc: 'Notificar cuando generes comisiones' },
                      { key: 'teamAlerts', label: 'Actividad del Equipo', desc: 'Notificar sobre actividad de tu red' },
                      { key: 'weeklyReport', label: 'Reporte Semanal', desc: 'Resumen de actividad cada semana' },
                      { key: 'monthlyReport', label: 'Reporte Mensual', desc: 'Resumen completo cada mes' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.label}</p>
                          <p className="text-xs text-gray-600">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => handleToggle(item.key)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            settings[item.key as keyof typeof settings] ? 'bg-[#7AB82E]' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              settings[item.key as keyof typeof settings] ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Privacy Section */}
            <Card id="privacy">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <ShieldCheckIcon className="h-6 w-6 text-[#003B7A]" />
                  <h2 className="text-2xl font-bold text-gray-900">Privacidad</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Visibilidad del Perfil
                    </label>
                    <select
                      value={settings.profileVisibility}
                      onChange={(e) => handleChange('profileVisibility', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                    >
                      <option value="public">Público - Visible para todos</option>
                      <option value="team">Equipo - Solo mi red puede verlo</option>
                      <option value="private">Privado - Solo yo puedo verlo</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <EyeIcon className="h-5 w-5 text-gray-600 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">Mostrar Email</p>
                        <p className="text-sm text-gray-600">Otros pueden ver tu correo electrónico</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle('showEmail')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.showEmail ? 'bg-[#7AB82E]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.showEmail ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <EyeIcon className="h-5 w-5 text-gray-600 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">Mostrar Teléfono</p>
                        <p className="text-sm text-gray-600">Otros pueden ver tu número de teléfono</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle('showPhone')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.showPhone ? 'bg-[#7AB82E]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.showPhone ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <EnvelopeIcon className="h-5 w-5 text-gray-600 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">Permitir Mensajes</p>
                        <p className="text-sm text-gray-600">Otros distribuidores pueden enviarte mensajes</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle('allowMessages')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.allowMessages ? 'bg-[#7AB82E]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.allowMessages ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Language & Region Section */}
            <Card id="language">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <GlobeAltIcon className="h-6 w-6 text-[#003B7A]" />
                  <h2 className="text-2xl font-bold text-gray-900">Idioma y Región</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Idioma
                    </label>
                    <select
                      value={settings.language}
                      onChange={(e) => handleChange('language', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                    >
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zona Horaria
                    </label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => handleChange('timezone', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                    >
                      <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                      <option value="America/Monterrey">Monterrey (GMT-6)</option>
                      <option value="America/Cancun">Cancún (GMT-5)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Moneda
                    </label>
                    <select
                      value={settings.currency}
                      onChange={(e) => handleChange('currency', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                    >
                      <option value="MXN">MXN - Peso Mexicano</option>
                      <option value="USD">USD - Dólar Americano</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Formato de Fecha
                    </label>
                    <select
                      value={settings.dateFormat}
                      onChange={(e) => handleChange('dateFormat', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Section */}
            <Card id="security">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <LockClosedIcon className="h-6 w-6 text-[#003B7A]" />
                  <h2 className="text-2xl font-bold text-gray-900">Seguridad</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <ShieldCheckIcon className="h-5 w-5 text-gray-600 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">Autenticación de Dos Factores</p>
                        <p className="text-sm text-gray-600">Agrega una capa extra de seguridad</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle('twoFactorEnabled')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.twoFactorEnabled ? 'bg-[#7AB82E]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tiempo de Sesión (minutos)
                    </label>
                    <select
                      value={settings.sessionTimeout}
                      onChange={(e) => handleChange('sessionTimeout', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                    >
                      <option value="15">15 minutos</option>
                      <option value="30">30 minutos</option>
                      <option value="60">1 hora</option>
                      <option value="120">2 horas</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <BellIcon className="h-5 w-5 text-gray-600 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">Alertas de Inicio de Sesión</p>
                        <p className="text-sm text-gray-600">Notificar sobre inicios de sesión nuevos</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle('loginAlerts')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.loginAlerts ? 'bg-[#7AB82E]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.loginAlerts ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="border-t pt-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => toast.info('Abriendo cambio de contraseña')}
                    >
                      Cambiar Contraseña
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Management Section */}
            <Card id="account">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <UserCircleIcon className="h-6 w-6 text-[#003B7A]" />
                  <h2 className="text-2xl font-bold text-gray-900">Gestión de Cuenta</h2>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-3">
                      ⚠️ Las siguientes acciones son permanentes y no se pueden deshacer.
                    </p>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleResetSettings}
                      >
                        Restablecer Configuración
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => toast.error('Esta acción requiere confirmación adicional')}
                      >
                        Desactivar Cuenta
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex gap-3">
              <Button variant="primary" className="flex-1" onClick={handleSave}>
                Guardar Cambios
              </Button>
              <Button variant="outline" onClick={() => toast.info('Cambios descartados')}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
