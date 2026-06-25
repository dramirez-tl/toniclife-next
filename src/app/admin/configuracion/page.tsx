'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useShippingSettings, useUpdateShippingSettings } from '@/hooks/useConfig';
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
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { PermissionGuard } from '@/components/auth';

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState({
    // General Settings
    siteName: 'Tonic Life',
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

    // Shipping Settings (conectados a system_settings vía API)
    freeShippingThreshold: 1500,
    standardShippingCost: 150,
    expressShippingCost: 250,
    kitShippingCost: 150,

    // Email Settings
    smtpHost: 'smtp.sendgrid.net',
    smtpPort: 587,
    smtpUser: 'apikey',
    smtpSecure: true,
    emailFrom: 'noreply@mywellnesshub.com',
    emailFromName: 'Tonic Life',

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

  // Costos de envío reales (system_settings). Solo esta pestaña persiste al backend.
  const { data: shippingData } = useShippingSettings();
  const updateShipping = useUpdateShippingSettings();

  useEffect(() => {
    if (!shippingData) return;
    setSettings((prev) => ({
      ...prev,
      freeShippingThreshold: shippingData.freeThreshold,
      standardShippingCost: shippingData.standardCost,
      expressShippingCost: shippingData.expressCost,
      kitShippingCost: shippingData.kitCost,
    }));
  }, [shippingData]);

  const handleSaveShipping = () => {
    updateShipping.mutate(
      {
        standardCost: settings.standardShippingCost,
        expressCost: settings.expressShippingCost,
        freeThreshold: settings.freeShippingThreshold,
        kitCost: settings.kitShippingCost,
      },
      {
        onSuccess: () => toast.success('Costos de envío actualizados'),
        onError: () =>
          toast.error('No se pudieron guardar los costos de envío'),
      },
    );
  };

  const handleSave = () => {
    if (activeTab === 'shipping') {
      handleSaveShipping();
      return;
    }
    toast.success('Configuración guardada correctamente');
  };

  const handleReset = () => {
    toast.info('Configuración restablecida a valores predeterminados');
  };

  const tabs = [
    { id: 'general', name: 'General', icon: Cog6ToothIcon },
    { id: 'business', name: 'Negocio', icon: BuildingStorefrontIcon },
    { id: 'shipping', name: 'Envíos', icon: TruckIcon },
    { id: 'email', name: 'Correo', icon: EnvelopeIcon },
    { id: 'notifications', name: 'Notificaciones', icon: BellIcon },
    { id: 'payments', name: 'Pagos', icon: CreditCardIcon },
    { id: 'mlm', name: 'MLM', icon: CurrencyDollarIcon },
    { id: 'security', name: 'Seguridad', icon: ShieldCheckIcon },
  ];

  return (
    <PermissionGuard permissions={['settings:read', 'settings:*']}>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
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
                  Volver al Panel Principal
                </Button>
              </Link>
              <Button
                variant="default"
                onClick={handleSave}
                disabled={activeTab === 'shipping' && updateShipping.isPending}
              >
                <CheckCircleIcon className="h-5 w-5" />
                {activeTab === 'shipping' && updateShipping.isPending
                  ? 'Guardando…'
                  : 'Guardar Cambios'}
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
                            ? 'bg-[#3E667D] text-white'
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Correo de Soporte
                        </label>
                        <input
                          type="email"
                          value={settings.supportEmail}
                          onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Zona Horaria
                        </label>
                        <SearchableSelect
                          options={[
                            { value: 'America/Mexico_City', label: 'México (CDMX)' },
                            { value: 'America/Monterrey', label: 'México (Monterrey)' },
                            { value: 'America/Cancun', label: 'México (Cancún)' },
                          ]}
                          value={settings.timezone}
                          onChange={(val) => setSettings({ ...settings, timezone: val })}
                          showAllOption={false}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Idioma
                        </label>
                        <SearchableSelect
                          options={[
                            { value: 'es', label: 'Español' },
                            { value: 'en', label: 'English' },
                          ]}
                          value={settings.language}
                          onChange={(val) => setSettings({ ...settings, language: val })}
                          showAllOption={false}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Moneda
                        </label>
                        <SearchableSelect
                          options={[
                            { value: 'MXN', label: 'MXN - Peso Mexicano' },
                            { value: 'USD', label: 'USD - Dólar Americano' },
                          ]}
                          value={settings.currency}
                          onChange={(val) => setSettings({ ...settings, currency: val })}
                          showAllOption={false}
                          className="w-full"
                        />
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Umbral de Existencias Bajas
                        </label>
                        <input
                          type="number"
                          value={settings.lowStockThreshold}
                          onChange={(e) => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.enableInventoryTracking}
                          onChange={(e) => setSettings({ ...settings, enableInventoryTracking: e.target.checked })}
                          className="w-5 h-5 text-[#3E667D] border-gray-300 rounded focus:ring-[#3E667D]"
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
                          className="w-5 h-5 text-[#3E667D] border-gray-300 rounded focus:ring-[#3E667D]"
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
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Configuración de Envíos</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Estos costos aplican a la tienda en línea, al carrito compartido
                    y al kit de inscripción. Recoger en sucursal siempre es gratis.
                    Los distribuidores siempre pagan envío estándar (sin umbral gratis).
                  </p>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Costo de Envío Estándar (MXN)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={settings.standardShippingCost}
                          onChange={(e) => setSettings({ ...settings, standardShippingCost: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Costo de Envío Express (MXN)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={settings.expressShippingCost}
                          onChange={(e) => setSettings({ ...settings, expressShippingCost: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Umbral de Envío Gratis (MXN)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={settings.freeShippingThreshold}
                          onChange={(e) => setSettings({ ...settings, freeShippingThreshold: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                          Compras de clientes no distribuidores por encima de este monto no pagan envío estándar.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Costo de Envío del Kit de Inscripción (MXN)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={settings.kitShippingCost}
                          onChange={(e) => setSettings({ ...settings, kitShippingCost: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                          Se cobra cuando el miembro elige envío a domicilio para su kit.
                        </p>
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
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Configuración de Correo Electrónico</h2>
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Remitente del Correo
                        </label>
                        <input
                          type="email"
                          value={settings.emailFrom}
                          onChange={(e) => setSettings({ ...settings, emailFrom: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.smtpSecure}
                          onChange={(e) => setSettings({ ...settings, smtpSecure: e.target.checked })}
                          className="w-5 h-5 text-[#3E667D] border-gray-300 rounded focus:ring-[#3E667D]"
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
                        className="w-5 h-5 text-[#3E667D] border-gray-300 rounded focus:ring-[#3E667D]"
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
                        className="w-5 h-5 text-[#3E667D] border-gray-300 rounded focus:ring-[#3E667D]"
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
                        className="w-5 h-5 text-[#3E667D] border-gray-300 rounded focus:ring-[#3E667D]"
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
                        className="w-5 h-5 text-[#3E667D] border-gray-300 rounded focus:ring-[#3E667D]"
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
                        className="w-5 h-5 text-[#3E667D] border-gray-300 rounded focus:ring-[#3E667D]"
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
                        className="w-5 h-5 text-[#3E667D] border-gray-300 rounded focus:ring-[#3E667D]"
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
                        className="w-5 h-5 text-[#3E667D] border-gray-300 rounded focus:ring-[#3E667D]"
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
                        className="w-5 h-5 text-[#3E667D] border-gray-300 rounded focus:ring-[#3E667D]"
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.enableTwoFactor}
                          onChange={(e) => setSettings({ ...settings, enableTwoFactor: e.target.checked })}
                          className="w-5 h-5 text-[#3E667D] border-gray-300 rounded focus:ring-[#3E667D]"
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
                          className="w-5 h-5 text-[#3E667D] border-gray-300 rounded focus:ring-[#3E667D]"
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
                variant="default"
                className="flex-1"
                onClick={handleSave}
              >
                <CheckCircleIcon className="h-5 w-5" />
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
    </PermissionGuard>
  );
}
