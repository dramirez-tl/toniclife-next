'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  useDistributorPreferences,
  useUpdateDistributorPreferences,
} from '@/hooks/useDistributor';
import {
  DEFAULT_LOCALE,
  buildLocale,
  localeCountry,
} from '@/i18n/config';
import { getStoredLocale, setStoredLocale } from '@/lib/store-locale';
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
} from '@heroicons/react/24/outline';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
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

  // Idioma: preferencia REAL de la cuenta (users.language). El resto de ajustes
  // de esta pantalla aún son demostrativos (no persisten).
  const { data: prefs } = useDistributorPreferences();
  const updatePrefs = useUpdateDistributorPreferences();

  useEffect(() => {
    if (prefs?.language) {
      setSettings((s) => ({ ...s, language: prefs.language }));
    }
  }, [prefs?.language]);

  const handleToggle = (key: string) => {
    setSettings({ ...settings, [key]: !settings[key as keyof typeof settings] });
    toast.success('Configuración actualizada');
  };

  const handleChange = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value });
  };

  // Cambia el idioma del panel: persiste en la cuenta, ajusta la cookie de
  // locale y recarga para que todo el panel se muestre en el nuevo idioma.
  const handleLanguageChange = (lang: string) => {
    const language: 'es' | 'en' = lang === 'en' ? 'en' : 'es';
    setSettings((s) => ({ ...s, language }));
    updatePrefs.mutate(language, {
      onSuccess: () => {
        const stored = getStoredLocale() || DEFAULT_LOCALE;
        setStoredLocale(buildLocale(language, localeCountry(stored)));
        window.location.reload();
      },
      onError: () => toast.error('No se pudo cambiar el idioma'),
    });
  };

  const handleSave = () => {
    toast.success('Configuración guardada exitosamente');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
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
                Volver al Panel Principal
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
                  <BellIcon className="h-6 w-6 text-[#3E667D]" />
                  <h2 className="text-2xl font-bold text-gray-900">Notificaciones</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <EnvelopeIcon className="h-5 w-5 text-gray-600 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">Notificaciones por Correo</p>
                        <p className="text-sm text-gray-600">Recibe actualizaciones en tu correo</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle('emailNotifications')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.emailNotifications ? 'bg-[#C8DDF2]' : 'bg-gray-300'
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
                        settings.smsNotifications ? 'bg-[#C8DDF2]' : 'bg-gray-300'
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
                        settings.pushNotifications ? 'bg-[#C8DDF2]' : 'bg-gray-300'
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
                            settings[item.key as keyof typeof settings] ? 'bg-[#C8DDF2]' : 'bg-gray-300'
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
                  <ShieldCheckIcon className="h-6 w-6 text-[#3E667D]" />
                  <h2 className="text-2xl font-bold text-gray-900">Privacidad</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Visibilidad del Perfil
                    </label>
                    <SearchableSelect
                      options={[
                        { value: 'public', label: 'Público - Visible para todos' },
                        { value: 'team', label: 'Equipo - Solo mi red puede verlo' },
                        { value: 'private', label: 'Privado - Solo yo puedo verlo' },
                      ]}
                      value={settings.profileVisibility}
                      onChange={(val) => handleChange('profileVisibility', val)}
                      showAllOption={false}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <EyeIcon className="h-5 w-5 text-gray-600 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">Mostrar Correo Electrónico</p>
                        <p className="text-sm text-gray-600">Otros pueden ver tu correo electrónico</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle('showEmail')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.showEmail ? 'bg-[#C8DDF2]' : 'bg-gray-300'
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
                        settings.showPhone ? 'bg-[#C8DDF2]' : 'bg-gray-300'
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
                        settings.allowMessages ? 'bg-[#C8DDF2]' : 'bg-gray-300'
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
                  <GlobeAltIcon className="h-6 w-6 text-[#3E667D]" />
                  <h2 className="text-2xl font-bold text-gray-900">Idioma y Región</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
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
                      onChange={handleLanguageChange}
                      showAllOption={false}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zona Horaria
                    </label>
                    <SearchableSelect
                      options={[
                        { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
                        { value: 'America/Monterrey', label: 'Monterrey (GMT-6)' },
                        { value: 'America/Cancun', label: 'Cancún (GMT-5)' },
                      ]}
                      value={settings.timezone}
                      onChange={(val) => handleChange('timezone', val)}
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
                      onChange={(val) => handleChange('currency', val)}
                      showAllOption={false}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Formato de Fecha
                    </label>
                    <SearchableSelect
                      options={[
                        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                      ]}
                      value={settings.dateFormat}
                      onChange={(val) => handleChange('dateFormat', val)}
                      showAllOption={false}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Section */}
            <Card id="security">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <LockClosedIcon className="h-6 w-6 text-[#3E667D]" />
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
                        settings.twoFactorEnabled ? 'bg-[#C8DDF2]' : 'bg-gray-300'
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
                    <SearchableSelect
                      options={[
                        { value: '15', label: '15 minutos' },
                        { value: '30', label: '30 minutos' },
                        { value: '60', label: '1 hora' },
                        { value: '120', label: '2 horas' },
                      ]}
                      value={settings.sessionTimeout}
                      onChange={(val) => handleChange('sessionTimeout', val)}
                      showAllOption={false}
                      className="w-full"
                    />
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
                        settings.loginAlerts ? 'bg-[#C8DDF2]' : 'bg-gray-300'
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

            {/* Save Button */}
            <div className="flex gap-3">
              <Button variant="default" className="flex-1" onClick={handleSave}>
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
