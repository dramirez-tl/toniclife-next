'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  useShippingSettings,
  useUpdateShippingSettings,
  useCountries,
  usePlatformSettings,
  useUpdatePlatformSettings,
} from '@/hooks/useConfig';
import {
  Cog6ToothIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  TruckIcon,
  EnvelopeIcon,
  BellIcon,
  ShieldCheckIcon,
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

  // ── Ajustes de plataforma reales (system_settings category='platform') ──
  // Persisten de verdad las pestañas: General, Negocio, Notificaciones, Pagos,
  // Seguridad. (MLM y Correo se gestionan en sus propios módulos / env.)
  const PLATFORM_KEYS = [
    'siteName', 'siteUrl', 'supportEmail', 'supportPhone', 'timezone', 'language',
    'enableInventoryTracking', 'lowStockThreshold', 'autoReorderEnabled',
    'emailNotificationsEnabled', 'orderNotifications', 'lowStockNotifications', 'newUserNotifications',
    'stripeEnabled', 'paypalEnabled', 'oxxoEnabled', 'transferEnabled',
    'enableTwoFactor', 'sessionTimeout', 'maxLoginAttempts', 'passwordMinLength', 'requireStrongPassword',
  ] as const;
  const PLATFORM_TABS = ['general', 'business', 'notifications', 'payments', 'security'];

  const { data: platformData } = usePlatformSettings();
  const updatePlatform = useUpdatePlatformSettings();

  useEffect(() => {
    if (!platformData) return;
    setSettings((prev) => {
      const next = { ...prev } as Record<string, unknown>;
      for (const k of PLATFORM_KEYS) {
        if (platformData[k] !== undefined) next[k] = platformData[k];
      }
      return next as typeof prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformData]);

  const pickPlatform = (): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    const s = settings as Record<string, unknown>;
    for (const k of PLATFORM_KEYS) out[k] = s[k];
    return out;
  };

  const handleSavePlatform = () => {
    updatePlatform.mutate(pickPlatform(), {
      onSuccess: () => toast.success('Configuración guardada'),
      onError: () => toast.error('No se pudo guardar la configuración'),
    });
  };

  // ── Costos de envío reales (system_settings), POR PAÍS ──
  const [shippingCountry, setShippingCountry] = useState('MX');
  const { data: shippingData } = useShippingSettings(shippingCountry);
  const updateShipping = useUpdateShippingSettings(shippingCountry);

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

  // Países: solo para la moneda de los costos de envío. El almacén que surte
  // cada país ya NO se edita aquí (countries.default_shipping_branch_id es un
  // espejo de solo lectura): vive en /admin/configuracion/rutas-envio.
  const { data: countries } = useCountries();

  // Moneda del país de envío seleccionado (para etiquetas de costos).
  const shippingCurrency =
    (countries ?? []).find((c) => c.code === shippingCountry)?.currencyCode ||
    'MXN';

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

  const canSaveActiveTab =
    activeTab === 'shipping' || PLATFORM_TABS.includes(activeTab);
  const savingActiveTab =
    (activeTab === 'shipping' && updateShipping.isPending) ||
    (PLATFORM_TABS.includes(activeTab) && updatePlatform.isPending);

  const handleSave = () => {
    if (activeTab === 'shipping') {
      handleSaveShipping();
      return;
    }
    if (PLATFORM_TABS.includes(activeTab)) {
      handleSavePlatform();
      return;
    }
    // store-countries / mlm / email se administran en su propia sección.
    toast.info('Esta sección se administra desde sus propios controles.');
  };

  const handleReset = () => {
    // Descarta cambios locales y recarga lo último guardado del servidor.
    if (platformData) {
      setSettings((prev) => {
        const next = { ...prev } as Record<string, unknown>;
        for (const k of PLATFORM_KEYS) {
          if (platformData[k] !== undefined) next[k] = platformData[k];
        }
        return next as typeof prev;
      });
    }
    if (shippingData) {
      setSettings((prev) => ({
        ...prev,
        freeShippingThreshold: shippingData.freeThreshold,
        standardShippingCost: shippingData.standardCost,
        expressShippingCost: shippingData.expressCost,
        kitShippingCost: shippingData.kitCost,
      }));
    }
    toast.info('Cambios descartados (se recargó lo guardado).');
  };

  const tabs = [
    { id: 'general', name: 'General', icon: Cog6ToothIcon },
    { id: 'business', name: 'Negocio', icon: BuildingStorefrontIcon },
    { id: 'store-countries', name: 'Almacenes y envíos', icon: GlobeAltIcon },
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
              {canSaveActiveTab && (
                <Button
                  variant="default"
                  onClick={handleSave}
                  disabled={savingActiveTab}
                >
                  <CheckCircleIcon className="h-5 w-5" />
                  {savingActiveTab ? 'Guardando…' : 'Guardar Cambios'}
                </Button>
              )}
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
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                      Los impuestos (IVA México, sales tax US) se administran en{' '}
                      <Link href="/admin/configuracion/catalogos" className="font-semibold underline">
                        Catálogos → Reglas fiscales
                      </Link>{' '}
                      (por país y estado), no aquí.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            {/* Almacenes y envíos: sustituye a la pestaña "Tienda por país" (rutas de surtido, mig 144) */}
            {activeTab === 'store-countries' && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Almacenes y envíos
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Ahora decides en una pantalla propia qué almacén envía los
                    pedidos de la tienda a cada país: puedes poner varios
                    almacenes por país, en orden de preferencia, y un mismo
                    almacén puede enviar a varios países.
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    El almacén por país que se elegía aquí ya no se edita en
                    esta pestaña. Recoger en sucursal no se ve afectado.
                  </p>
                  <Button asChild variant="default">
                    <Link href="/admin/configuracion/rutas-envio">
                      <TruckIcon className="h-5 w-5" />
                      Abrir Almacenes y envíos
                    </Link>
                  </Button>
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
                    Los costos se configuran <strong>por país</strong>, en su moneda.
                  </p>

                  {/* Selector de país: los costos son por país, en su moneda */}
                  <div className="mb-6 max-w-xs">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      País
                    </label>
                    <SearchableSelect
                      options={(countries ?? [])
                        .filter((c) => c.isActive)
                        .map((c) => ({
                          value: c.code,
                          label: `${c.name} (${c.currencyCode ?? '—'})`,
                        }))}
                      value={shippingCountry}
                      onChange={(val) => setShippingCountry(val)}
                      showAllOption={false}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Costo de Envío Estándar ({shippingCurrency})
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
                          Costo de Envío Express ({shippingCurrency})
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
                          Umbral de Envío Gratis ({shippingCurrency})
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
                          Costo de Envío del Kit de Inscripción ({shippingCurrency})
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
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Configuración de Correo Electrónico</h2>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                    El envío de correos transaccionales usa <strong>Resend</strong> y
                    se configura con variables de entorno del servidor
                    (<code className="font-mono">RESEND_API_KEY</code>,{' '}
                    <code className="font-mono">RESEND_FROM_EMAIL</code>) — no por
                    SMTP ni desde esta pantalla. Cambiarlas requiere actualizar el
                    entorno (Railway) y reiniciar el servicio.
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
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Configuración MLM</h2>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    El plan de compensación (comisiones, bonos, rangos, periodos y
                    rollover) se calcula con el motor MLM y <strong>no</strong> se
                    edita aquí — son cálculos que pagan dinero real. Adminístralo en
                    los módulos dedicados:
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Link href="/admin/comisiones">
                        <Button variant="outline" size="sm">
                          <CurrencyDollarIcon className="h-4 w-4" />
                          Comisiones
                        </Button>
                      </Link>
                      <Link href="/admin/mlm">
                        <Button variant="outline" size="sm">
                          Red / MLM
                        </Button>
                      </Link>
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

            {/* Action Buttons — solo en pestañas con guardado global */}
            {canSaveActiveTab && (
              <div className="flex gap-3 mt-6">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={handleSave}
                  disabled={savingActiveTab}
                >
                  <CheckCircleIcon className="h-5 w-5" />
                  {savingActiveTab ? 'Guardando…' : 'Guardar Cambios'}
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Restablecer
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </PermissionGuard>
  );
}
