'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  useDistributorPreferences,
  useUpdateDistributorPreferences,
} from '@/hooks/useDistributor';
import { readyAccountCountry } from '@/hooks/useStoreCountry';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
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
import { useTranslations } from 'next-intl';

export default function ConfiguracionPage() {
  const t = useTranslations('distributor.settings');
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
  const currentUser = useAppSelector(selectUser);

  useEffect(() => {
    if (prefs?.language) {
      setSettings((s) => ({ ...s, language: prefs.language }));
    }
  }, [prefs?.language]);

  const handleToggle = (key: string) => {
    setSettings({ ...settings, [key]: !settings[key as keyof typeof settings] });
    toast.success(t('toast.updated'));
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
        // El país lo fija la cuenta (si tiene tienda lista); solo cambia el idioma.
        const country =
          readyAccountCountry(currentUser?.countryCode) ?? localeCountry(stored);
        setStoredLocale(buildLocale(language, country));
        window.location.reload();
      },
      onError: () => toast.error(t('toast.languageError')),
    });
  };

  const handleSave = () => {
    toast.success(t('toast.saved'));
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
                <h1 className="text-4xl font-bold">{t('title')}</h1>
              </div>
              <p className="text-white/80 text-lg">
                {t('subtitle')}
              </p>
            </div>
            <Link href="/distribuidor">
              <Button variant="secondary">
                {t('backToPanel')}
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
                <h3 className="font-bold text-gray-900 mb-4">{t('categories')}</h3>
                <nav className="space-y-1">
                  <a href="#notifications" className="block px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <BellIcon className="h-5 w-5" />
                      <span className="text-sm font-medium">{t('nav.notifications')}</span>
                    </div>
                  </a>
                  <a href="#privacy" className="block px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <ShieldCheckIcon className="h-5 w-5" />
                      <span className="text-sm font-medium">{t('nav.privacy')}</span>
                    </div>
                  </a>
                  <a href="#language" className="block px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <GlobeAltIcon className="h-5 w-5" />
                      <span className="text-sm font-medium">{t('nav.language')}</span>
                    </div>
                  </a>
                  <a href="#security" className="block px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <LockClosedIcon className="h-5 w-5" />
                      <span className="text-sm font-medium">{t('nav.security')}</span>
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
                  <h2 className="text-2xl font-bold text-gray-900">{t('notifications.title')}</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <EnvelopeIcon className="h-5 w-5 text-gray-600 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">{t('notifications.email.label')}</p>
                        <p className="text-sm text-gray-600">{t('notifications.email.desc')}</p>
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
                        <p className="font-medium text-gray-900">{t('notifications.sms.label')}</p>
                        <p className="text-sm text-gray-600">{t('notifications.sms.desc')}</p>
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
                        <p className="font-medium text-gray-900">{t('notifications.push.label')}</p>
                        <p className="text-sm text-gray-600">{t('notifications.push.desc')}</p>
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

                  <h3 className="font-semibold text-gray-900 mb-3">{t('notifications.specificAlerts')}</h3>

                  <div className="space-y-3">
                    {[
                      { key: 'salesAlerts', label: t('notifications.salesAlerts.label'), desc: t('notifications.salesAlerts.desc') },
                      { key: 'commissionAlerts', label: t('notifications.commissionAlerts.label'), desc: t('notifications.commissionAlerts.desc') },
                      { key: 'teamAlerts', label: t('notifications.teamAlerts.label'), desc: t('notifications.teamAlerts.desc') },
                      { key: 'weeklyReport', label: t('notifications.weeklyReport.label'), desc: t('notifications.weeklyReport.desc') },
                      { key: 'monthlyReport', label: t('notifications.monthlyReport.label'), desc: t('notifications.monthlyReport.desc') },
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
                  <h2 className="text-2xl font-bold text-gray-900">{t('privacy.title')}</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('privacy.profileVisibility')}
                    </label>
                    <SearchableSelect
                      options={[
                        { value: 'public', label: t('privacy.visibility.public') },
                        { value: 'team', label: t('privacy.visibility.team') },
                        { value: 'private', label: t('privacy.visibility.private') },
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
                        <p className="font-medium text-gray-900">{t('privacy.showEmail.label')}</p>
                        <p className="text-sm text-gray-600">{t('privacy.showEmail.desc')}</p>
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
                        <p className="font-medium text-gray-900">{t('privacy.showPhone.label')}</p>
                        <p className="text-sm text-gray-600">{t('privacy.showPhone.desc')}</p>
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
                        <p className="font-medium text-gray-900">{t('privacy.allowMessages.label')}</p>
                        <p className="text-sm text-gray-600">{t('privacy.allowMessages.desc')}</p>
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
                  <h2 className="text-2xl font-bold text-gray-900">{t('language.title')}</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('language.languageLabel')}
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
                      {t('language.timezoneLabel')}
                    </label>
                    <SearchableSelect
                      options={[
                        { value: 'America/Mexico_City', label: t('language.timezone.mexicoCity') },
                        { value: 'America/Monterrey', label: t('language.timezone.monterrey') },
                        { value: 'America/Cancun', label: t('language.timezone.cancun') },
                      ]}
                      value={settings.timezone}
                      onChange={(val) => handleChange('timezone', val)}
                      showAllOption={false}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('language.currencyLabel')}
                    </label>
                    <SearchableSelect
                      options={[
                        { value: 'MXN', label: t('language.currency.mxn') },
                        { value: 'USD', label: t('language.currency.usd') },
                      ]}
                      value={settings.currency}
                      onChange={(val) => handleChange('currency', val)}
                      showAllOption={false}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('language.dateFormatLabel')}
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
                  <h2 className="text-2xl font-bold text-gray-900">{t('security.title')}</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <ShieldCheckIcon className="h-5 w-5 text-gray-600 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">{t('security.twoFactor.label')}</p>
                        <p className="text-sm text-gray-600">{t('security.twoFactor.desc')}</p>
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
                      {t('security.sessionTimeoutLabel')}
                    </label>
                    <SearchableSelect
                      options={[
                        { value: '15', label: t('security.sessionTimeout.min15') },
                        { value: '30', label: t('security.sessionTimeout.min30') },
                        { value: '60', label: t('security.sessionTimeout.hour1') },
                        { value: '120', label: t('security.sessionTimeout.hour2') },
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
                        <p className="font-medium text-gray-900">{t('security.loginAlerts.label')}</p>
                        <p className="text-sm text-gray-600">{t('security.loginAlerts.desc')}</p>
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
                      onClick={() => toast.info(t('toast.openChangePassword'))}
                    >
                      {t('security.changePassword')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex gap-3">
              <Button variant="default" className="flex-1" onClick={handleSave}>
                {t('save')}
              </Button>
              <Button variant="outline" onClick={() => toast.info(t('toast.discarded'))}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
