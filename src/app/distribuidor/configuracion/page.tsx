'use client';

// Configuración del panel del distribuidor.
// Persisten de verdad: el idioma (users.language) y "Avisos por WhatsApp"
// (customers.whatsapp_*, GET/PATCH /distributor/preferences). El resto
// (correo/push, privacidad, zona horaria, moneda, formato de fecha, seguridad)
// aún no tiene respaldo en el API: se muestra deshabilitado y marcado
// "Próximamente" en lugar de fingir que guarda (antes eran toggles locales).

import { useState, type ComponentType } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  BellIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  EyeIcon,
  GlobeAltIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  useDistributorPreferences,
  useUpdateDistributorPreferences,
} from '@/hooks/useDistributor';
import { readyAccountCountry } from '@/hooks/useStoreCountry';
import { DEFAULT_LOCALE, buildLocale, localeCountry } from '@/i18n/config';
import { getStoredLocale, setStoredLocale } from '@/lib/store-locale';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import { WhatsAppNoticesCard } from './WhatsAppNoticesCard';

type IconType = ComponentType<{ className?: string }>;

const NAV: ReadonlyArray<{ key: string; href: string; Icon: IconType }> = [
  { key: 'whatsapp', href: '#whatsapp', Icon: ChatBubbleLeftRightIcon },
  { key: 'notifications', href: '#notifications', Icon: BellIcon },
  { key: 'privacy', href: '#privacy', Icon: ShieldCheckIcon },
  { key: 'language', href: '#language', Icon: GlobeAltIcon },
  { key: 'security', href: '#security', Icon: LockClosedIcon },
];

const ALERT_KEYS = [
  'salesAlerts',
  'commissionAlerts',
  'teamAlerts',
  'weeklyReport',
  'monthlyReport',
] as const;

function ComingSoonBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
      {label}
    </span>
  );
}

/** Interruptor ilustrativo (sin respaldo en el API): siempre deshabilitado. */
function ComingSoonToggle({ on, size = 'md' }: { on: boolean; size?: 'md' | 'sm' }) {
  const track = size === 'md' ? 'h-6 w-11' : 'h-5 w-9';
  const knob = size === 'md' ? 'h-4 w-4' : 'h-3 w-3';
  const onShift = size === 'md' ? 'translate-x-6' : 'translate-x-5';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled
      className={`relative inline-flex ${track} shrink-0 cursor-not-allowed items-center rounded-full opacity-60 ${
        on ? 'bg-[#C8DDF2]' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block ${knob} transform rounded-full bg-white ${
          on ? onShift : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function SectionTitle({
  Icon,
  title,
  badge,
}: {
  Icon: IconType;
  title: string;
  badge?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <Icon className="h-6 w-6 text-[#3E667D]" />
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      {badge && <ComingSoonBadge label={badge} />}
    </div>
  );
}

function ComingSoonRow({
  Icon,
  label,
  desc,
  on,
}: {
  Icon: IconType;
  label: string;
  desc: string;
  on: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-gray-600 mt-1" />
        <div>
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">{desc}</p>
        </div>
      </div>
      <ComingSoonToggle on={on} />
    </div>
  );
}

function ComingSoonSelect({
  label,
  badge,
  value,
  options,
}: {
  label: string;
  badge: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
        {label}
        <ComingSoonBadge label={badge} />
      </label>
      <SearchableSelect
        options={options}
        value={value}
        onChange={() => undefined}
        showAllOption={false}
        disabled
        className="w-full"
      />
    </div>
  );
}

export default function ConfiguracionPage() {
  const t = useTranslations('distributor.settings');
  const { data: prefs, isLoading: prefsLoading } = useDistributorPreferences();
  const updatePrefs = useUpdateDistributorPreferences();
  const currentUser = useAppSelector(selectUser);
  // Idioma: preferencia REAL de la cuenta (users.language); la elección en
  // curso se muestra de inmediato mientras el PATCH y la recarga terminan.
  const [chosenLanguage, setChosenLanguage] = useState<'es' | 'en' | null>(null);
  const language: 'es' | 'en' = chosenLanguage ?? prefs?.language ?? 'es';

  // Cambia el idioma del panel: persiste en la cuenta, ajusta la cookie de
  // locale y recarga para que todo el panel se muestre en el nuevo idioma.
  const handleLanguageChange = (lang: string) => {
    const next: 'es' | 'en' = lang === 'en' ? 'en' : 'es';
    setChosenLanguage(next);
    updatePrefs.mutate(next, {
      onSuccess: () => {
        const stored = getStoredLocale() || DEFAULT_LOCALE;
        // El país lo fija la cuenta (si tiene tienda lista); solo cambia el idioma.
        const country =
          readyAccountCountry(currentUser?.countryCode) ?? localeCountry(stored);
        setStoredLocale(buildLocale(next, country));
        window.location.reload();
      },
      onError: () => toast.error(t('toast.languageError')),
    });
  };

  const comingSoon = t('comingSoon');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Encabezado */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Cog6ToothIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">{t('title')}</h1>
              </div>
              <p className="text-white/80 text-lg">{t('subtitle')}</p>
            </div>
            <Link href="/distribuidor">
              <Button variant="secondary">{t('backToPanel')}</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Navegación */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4">{t('categories')}</h3>
                <nav className="space-y-1">
                  {NAV.map(({ key, href, Icon }) => (
                    <a
                      key={key}
                      href={href}
                      className="block px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span className="text-sm font-medium">{t(`nav.${key}`)}</span>
                      </div>
                    </a>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Secciones */}
          <div className="lg:col-span-2 space-y-6">
            {/* Avisos por WhatsApp: persiste (GET/PATCH /distributor/preferences) */}
            <WhatsAppNoticesCard prefs={prefs} loading={prefsLoading} />

            {/* Notificaciones (sin respaldo en el API todavía) */}
            <Card id="notifications">
              <CardContent className="p-6">
                <SectionTitle
                  Icon={BellIcon}
                  title={t('notifications.title')}
                  badge={comingSoon}
                />
                <div className="space-y-4">
                  <ComingSoonRow
                    Icon={EnvelopeIcon}
                    label={t('notifications.email.label')}
                    desc={t('notifications.email.desc')}
                    on
                  />
                  <ComingSoonRow
                    Icon={BellIcon}
                    label={t('notifications.push.label')}
                    desc={t('notifications.push.desc')}
                    on
                  />

                  <hr className="my-4" />

                  <h3 className="font-semibold text-gray-900 mb-3">
                    {t('notifications.specificAlerts')}
                  </h3>
                  <div className="space-y-3">
                    {ALERT_KEYS.map((key) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {t(`notifications.${key}.label`)}
                          </p>
                          <p className="text-xs text-gray-600">
                            {t(`notifications.${key}.desc`)}
                          </p>
                        </div>
                        <ComingSoonToggle on size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Privacidad (sin respaldo en el API todavía) */}
            <Card id="privacy">
              <CardContent className="p-6">
                <SectionTitle
                  Icon={ShieldCheckIcon}
                  title={t('privacy.title')}
                  badge={comingSoon}
                />
                <div className="space-y-4">
                  <ComingSoonSelect
                    label={t('privacy.profileVisibility')}
                    badge={comingSoon}
                    value="team"
                    options={[
                      { value: 'public', label: t('privacy.visibility.public') },
                      { value: 'team', label: t('privacy.visibility.team') },
                      { value: 'private', label: t('privacy.visibility.private') },
                    ]}
                  />
                  <ComingSoonRow
                    Icon={EyeIcon}
                    label={t('privacy.showEmail.label')}
                    desc={t('privacy.showEmail.desc')}
                    on={false}
                  />
                  <ComingSoonRow
                    Icon={EyeIcon}
                    label={t('privacy.showPhone.label')}
                    desc={t('privacy.showPhone.desc')}
                    on={false}
                  />
                  <ComingSoonRow
                    Icon={EnvelopeIcon}
                    label={t('privacy.allowMessages.label')}
                    desc={t('privacy.allowMessages.desc')}
                    on
                  />
                </div>
              </CardContent>
            </Card>

            {/* Idioma y región: solo el idioma persiste */}
            <Card id="language">
              <CardContent className="p-6">
                <SectionTitle Icon={GlobeAltIcon} title={t('language.title')} />
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
                      value={language}
                      onChange={handleLanguageChange}
                      showAllOption={false}
                      disabled={updatePrefs.isPending}
                      className="w-full"
                    />
                  </div>
                  <ComingSoonSelect
                    label={t('language.timezoneLabel')}
                    badge={comingSoon}
                    value="America/Mexico_City"
                    options={[
                      { value: 'America/Mexico_City', label: t('language.timezone.mexicoCity') },
                      { value: 'America/Monterrey', label: t('language.timezone.monterrey') },
                      { value: 'America/Cancun', label: t('language.timezone.cancun') },
                    ]}
                  />
                  <ComingSoonSelect
                    label={t('language.currencyLabel')}
                    badge={comingSoon}
                    value="MXN"
                    options={[
                      { value: 'MXN', label: t('language.currency.mxn') },
                      { value: 'USD', label: t('language.currency.usd') },
                    ]}
                  />
                  <ComingSoonSelect
                    label={t('language.dateFormatLabel')}
                    badge={comingSoon}
                    value="DD/MM/YYYY"
                    options={[
                      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                    ]}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Seguridad (sin respaldo en el API todavía; la contraseña se cambia en Mi perfil) */}
            <Card id="security">
              <CardContent className="p-6">
                <SectionTitle
                  Icon={LockClosedIcon}
                  title={t('security.title')}
                  badge={comingSoon}
                />
                <div className="space-y-4">
                  <ComingSoonRow
                    Icon={ShieldCheckIcon}
                    label={t('security.twoFactor.label')}
                    desc={t('security.twoFactor.desc')}
                    on={false}
                  />
                  <ComingSoonSelect
                    label={t('security.sessionTimeoutLabel')}
                    badge={comingSoon}
                    value="30"
                    options={[
                      { value: '15', label: t('security.sessionTimeout.min15') },
                      { value: '30', label: t('security.sessionTimeout.min30') },
                      { value: '60', label: t('security.sessionTimeout.hour1') },
                      { value: '120', label: t('security.sessionTimeout.hour2') },
                    ]}
                  />
                  <ComingSoonRow
                    Icon={BellIcon}
                    label={t('security.loginAlerts.label')}
                    desc={t('security.loginAlerts.desc')}
                    on
                  />
                  <div className="border-t pt-4">
                    <Link href="/distribuidor/perfil" className="block">
                      <Button variant="outline" className="w-full">
                        {t('security.changePassword')}
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
