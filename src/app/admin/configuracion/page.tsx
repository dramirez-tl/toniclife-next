'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Cog6ToothIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  TruckIcon,
  EnvelopeIcon,
  BellIcon,
  ShieldCheckIcon,
  KeyIcon,
  CreditCardIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState({
    // General Settings
    siteName: 'My Wellness Hub',
    siteUrl: 'https://mywellnesshub.com',
    supportEmail: 'soporte@mywellnesshub.com',
    supportPhone: '+52 33 1234 5678',
    timezone: 'America/Mexico_City',
    language: 'es',
    currency: 'MXN',

    // Business Settings
    taxRate: 16,
    enableInventoryTracking: true,
    lowStockThreshold: 10,
    autoReorderEnabled: false,

    // Shipping Settings
    freeShippingThreshold: 1000,
    standardShippingCost: 150,
    expressShippingCost: 300,
    shippingProcessingDays: 2,

    // Email Settings
    smtpHost: 'smtp.sendgrid.net',
    smtpPort: 587,
    smtpUser: 'apikey',
    smtpSecure: true,
    emailFrom: 'noreply@mywellnesshub.com',
    emailFromName: 'My Wellness Hub',

    // Notification Settings
    emailNotificationsEnabled: true,
    orderNotifications: true,
    lowStockNotifications: true,
    newUserNotifications: true,

    // Payment Settings
    stripeEnabled: true,
    paypalEnabled: false,
    oxxoEnabled: true,
    transferEnabled: true,

    // MLM Settings
    commissionRate: 12.5,
    teamCommissionRate: 10,
    bonusThreshold: 100000,
    bonusAmount: 5000,
    maxLevels: 5,

    // Security Settings
    enableTwoFactor: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireStrongPassword: true,
  });

  const [activeTab, setActiveTab] = useState('general');

  const handleSave = () => {
    toast.success('Configuración guardada correctamente');
  };

  const handleReset = () => {
    toast.info('Configuración restablecida a valores predeterminados');
  };

  const tabs = [
    { id: 'general', name: 'General', icon: Cog6ToothIcon },
    { id: 'business', name: 'Negocio', icon: BuildingStorefrontIcon },
    { id: 'shipping', name: 'Envíos', icon: TruckIcon },
    { id: 'email', name: 'Email', icon: EnvelopeIcon },
    { id: 'notifications', name: 'Notificaciones', icon: BellIcon },
    { id: 'payments', name: 'Pagos', icon: CreditCardIcon },
    { id: 'mlm', name: 'MLM', icon: CurrencyDollarIcon },
    { id: 'security', name: 'Seguridad', icon: ShieldCheckIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Cog6ToothIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Configuración del Sistema</h1>
              </div>
              <p className="text-white/80 text-lg">
                Administra la configuración global de la plataforma
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
                leftIcon={<CheckCircleIcon className="h-5 w-5" />}
                onClick={handleSave}
              >
                Guardar Cambios
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-1">
                  {tabs.map((tab) => {
                    const IconComponent = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          activeTab === tab.id
                            ? 'bg-[#003B7A] text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <IconComponent className="h-5 w-5" />
                        {tab.name}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            {/* General Settings */}
            {activeTab === 'general' && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Configuración General</h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre del Sitio
                        </label>
                        <input
                          type="text"
                          value={settings.siteName}
                          onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          URL del Sitio
                        </label>
                        <input
                          type="url"
                          value={settings.siteUrl}
                          onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email de Soporte
                        </label>
                        <input
                          type="email"
                          value={settings.supportEmail}
                          onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Teléfono de Soporte
                        </label>
                        <input
                          type="tel"
                          value={settings.supportPhone}
                          onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Zona Horaria
                        </label>
                        <select
                          value={settings.timezone}
                          onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        >
                          <option value="America/Mexico_City">México (CDMX)</option>
                          <option value="America/Monterrey">México (Monterrey)</option>
                          <option value="America/Cancun">México (Cancún)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Idioma
                        </label>
                        <select
                          value={settings.language}
                          onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        >
                          <option value="es">Español</option>
                          <option value="en">English</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Moneda
                        </label>
                        <select
                          value={settings.currency}
                          onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        >
                          <option value="MXN">MXN - Peso Mexicano</option>
                          <option value="USD">USD - Dólar Americano</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Business Settings */}
            {activeTab === 'business' && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Configuración de Negocio</h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tasa de IVA (%)
                        </label>
                        <input
                          type="number"
                          value={settings.taxRate}
                          onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Umbral de Stock Bajo
                        </label>
                        <input
                          type="number"
                          value={settings.lowStockThreshold}
                          onChange={(e) => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.enableInventoryTracking}
                          onChange={(e) => setSettings({ ...settings, enableInventoryTracking: e.target.checked })}
                          className="w-5 h-5 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Habilitar seguimiento de inventario
                        </span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.autoReorderEnabled}
                          onChange={(e) => setSettings({ ...settings, autoReorderEnabled: e.target.checked })}
                          className="w-5 h-5 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Habilitar reorden automático de productos
                        </span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Shipping Settings */}
            {activeTab === 'shipping' && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Configuración de Envíos</h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Umbral de Envío Gratis (MXN)
                        </label>
                        <input
                          type="number"
                          value={settings.freeShippingThreshold}
                          onChange={(e) => setSettings({ ...settings, freeShippingThreshold: parseFloat(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Costo de Envío Estándar (MXN)
                        </label>
                        <input
                          type="number"
                          value={settings.standardShippingCost}
                          onChange={(e) => setSettings({ ...settings, standardShippingCost: parseFloat(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Costo de Envío Express (MXN)
                        </label>
                        <input
                          type="number"
                          value={settings.expressShippingCost}
                          onChange={(e) => setSettings({ ...settings, expressShippingCost: parseFloat(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Días de Procesamiento
                        </label>
                        <input
                          type="number"
                          value={settings.shippingProcessingDays}
                          onChange={(e) => setSettings({ ...settings, shippingProcessingDays: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Email Settings */}
            {activeTab === 'email' && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Configuración de Email</h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          SMTP Host
                        </label>
                        <input
                          type="text"
                          value={settings.smtpHost}
                          onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          SMTP Port
                        </label>
                        <input
                          type="number"
                          value={settings.smtpPort}
                          onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email From
                        </label>
                        <input
                          type="email"
                          value={settings.emailFrom}
                          onChange={(e) => setSettings({ ...settings, emailFrom: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          From Name
                        </label>
                        <input
                          type="text"
                          value={settings.emailFromName}
                          onChange={(e) => setSettings({ ...settings, emailFromName: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.smtpSecure}
                          onChange={(e) => setSettings({ ...settings, smtpSecure: e.target.checked })}
                          className="w-5 h-5 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Usar conexión segura (TLS)
                        </span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Configuración de Notificaciones</h2>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.emailNotificationsEnabled}
                        onChange={(e) => setSettings({ ...settings, emailNotificationsEnabled: e.target.checked })}
                        className="w-5 h-5 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Habilitar notificaciones por email
                      </span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.orderNotifications}
                        onChange={(e) => setSettings({ ...settings, orderNotifications: e.target.checked })}
                        className="w-5 h-5 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Notificar nuevos pedidos
                      </span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.lowStockNotifications}
                        onChange={(e) => setSettings({ ...settings, lowStockNotifications: e.target.checked })}
                        className="w-5 h-5 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Notificar stock bajo
                      </span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.newUserNotifications}
                        onChange={(e) => setSettings({ ...settings, newUserNotifications: e.target.checked })}
                        className="w-5 h-5 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Notificar nuevos usuarios
                      </span>
                    </label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Settings */}
            {activeTab === 'payments' && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Métodos de Pago</h2>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.stripeEnabled}
                        onChange={(e) => setSettings({ ...settings, stripeEnabled: e.target.checked })}
                        className="w-5 h-5 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Stripe (Tarjetas de Crédito/Débito)
                      </span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.paypalEnabled}
                        onChange={(e) => setSettings({ ...settings, paypalEnabled: e.target.checked })}
                        className="w-5 h-5 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        PayPal
                      </span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.oxxoEnabled}
                        onChange={(e) => setSettings({ ...settings, oxxoEnabled: e.target.checked })}
                        className="w-5 h-5 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        OXXO
                      </span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.transferEnabled}
                        onChange={(e) => setSettings({ ...settings, transferEnabled: e.target.checked })}
                        className="w-5 h-5 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Transferencia Bancaria
                      </span>
                    </label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* MLM Settings */}
            {activeTab === 'mlm' && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Configuración MLM</h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Comisión Personal (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={settings.commissionRate}
                          onChange={(e) => setSettings({ ...settings, commissionRate: parseFloat(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Comisión de Equipo (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={settings.teamCommissionRate}
                          onChange={(e) => setSettings({ ...settings, teamCommissionRate: parseFloat(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Umbral de Bono (MXN)
                        </label>
                        <input
                          type="number"
                          value={settings.bonusThreshold}
                          onChange={(e) => setSettings({ ...settings, bonusThreshold: parseFloat(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cantidad de Bono (MXN)
                        </label>
                        <input
                          type="number"
                          value={settings.bonusAmount}
                          onChange={(e) => setSettings({ ...settings, bonusAmount: parseFloat(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Niveles Máximos de Red
                        </label>
                        <input
                          type="number"
                          value={settings.maxLevels}
                          onChange={(e) => setSettings({ ...settings, maxLevels: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Configuración de Seguridad</h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tiempo de Sesión (minutos)
                        </label>
                        <input
                          type="number"
                          value={settings.sessionTimeout}
                          onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Intentos Máx. de Login
                        </label>
                        <input
                          type="number"
                          value={settings.maxLoginAttempts}
                          onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Longitud Mínima de Contraseña
                        </label>
                        <input
                          type="number"
                          value={settings.passwordMinLength}
                          onChange={(e) => setSettings({ ...settings, passwordMinLength: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.enableTwoFactor}
                          onChange={(e) => setSettings({ ...settings, enableTwoFactor: e.target.checked })}
                          className="w-5 h-5 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Habilitar autenticación de dos factores
                        </span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.requireStrongPassword}
                          onChange={(e) => setSettings({ ...settings, requireStrongPassword: e.target.checked })}
                          className="w-5 h-5 text-[#003B7A] border-gray-300 rounded focus:ring-[#003B7A]"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Requerir contraseñas fuertes (mayúsculas, números, símbolos)
                        </span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                className="flex-1"
                leftIcon={<CheckCircleIcon className="h-5 w-5" />}
                onClick={handleSave}
              >
                Guardar Cambios
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
              >
                Restablecer
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
