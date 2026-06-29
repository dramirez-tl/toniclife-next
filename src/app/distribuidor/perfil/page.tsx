'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CameraIcon,
  KeyIcon,
  BellIcon,
  ShareIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export default function PerfilPage() {
  const t = useTranslations('distributor.profile');
  const [formData, setFormData] = useState({
    firstName: 'María',
    lastName: 'González',
    email: 'maria.gonzalez@email.com',
    phone: '+52 123 456 7890',
    street: 'Av. Insurgentes Sur 1234',
    city: 'Ciudad de México',
    state: 'CDMX',
    zipCode: '03100',
    bio: 'Distribuidora apasionada por el bienestar y ayudar a otros a alcanzar sus metas de salud.',
  });

  const [notifications, setNotifications] = useState({
    emailSales: true,
    emailCommissions: true,
    emailTeam: true,
    emailMarketing: false,
    smsImportant: true,
    smsSales: false,
  });

  const handleSave = () => {
    toast.success(t('toast.updated'));
  };

  const handlePasswordChange = () => {
    toast.info(t('toast.openChangePassword'));
  };

  const handleUploadPhoto = () => {
    toast.info(t('toast.openImagePicker'));
  };

  const handleDownloadQR = () => {
    toast.success(t('toast.downloadingQR'));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://toniclife.com/maria-gonzalez');
    toast.success(t('toast.linkCopied'));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <UserCircleIcon className="h-10 w-10" />
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6">
          {/* Profile Photo */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('photo.title')}</h3>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-gradient-to-br from-[#3E667D] to-[#C8DDF2] rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  {formData.firstName[0]}{formData.lastName[0]}
                </div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUploadPhoto}
                  >
                    <CameraIcon className="h-4 w-4" />
                    {t('photo.change')}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    {t('photo.hint')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('personalInfo.title')}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('personalInfo.firstName')}</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4"><UserCircleIcon className="h-5 w-5" /></span>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('personalInfo.lastName')}</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('personalInfo.email')}</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4"><EnvelopeIcon className="h-5 w-5" /></span>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('personalInfo.phone')}</Label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(v) => setFormData({ ...formData, phone: v })}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('personalInfo.bio')}
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
                  placeholder={t('personalInfo.bioPlaceholder')}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('personalInfo.bioHint')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPinIcon className="h-5 w-5" />
                {t('address.title')}
              </h3>
              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label>{t('address.street')}</Label>
                  <Input
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>{t('address.city')}</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('address.state')}</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('address.zipCode')}</Label>
                    <Input
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Link */}
          <Card className="bg-gradient-to-r from-[#C8DDF2] to-[#C8DDF2]/90 text-white">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <ShareIcon className="h-5 w-5" />
                {t('referral.title')}
              </h3>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
                <p className="text-sm text-white/80 mb-2">{t('referral.personalLink')}</p>
                <p className="font-mono text-sm break-all">
                  https://toniclife.com/maria-gonzalez
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyLink}
                >
                  <ShareIcon className="h-4 w-4" />
                  {t('referral.copyLink')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadQR}
                >
                  <QrCodeIcon className="h-4 w-4" />
                  {t('referral.downloadQR')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BellIcon className="h-5 w-5" />
                {t('notifications.title')}
              </h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">{t('notifications.emailHeading')}</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'emailSales', label: t('notifications.email.sales') },
                      { key: 'emailCommissions', label: t('notifications.email.commissions') },
                      { key: 'emailTeam', label: t('notifications.email.team') },
                      { key: 'emailMarketing', label: t('notifications.email.marketing') },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications[item.key as keyof typeof notifications]}
                          onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                          className="h-4 w-4 text-[#3E667D] rounded focus:ring-[#a7c1e2]"
                        />
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">{t('notifications.smsHeading')}</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'smsImportant', label: t('notifications.sms.important') },
                      { key: 'smsSales', label: t('notifications.sms.sales') },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications[item.key as keyof typeof notifications]}
                          onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                          className="h-4 w-4 text-[#3E667D] rounded focus:ring-[#a7c1e2]"
                        />
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <KeyIcon className="h-5 w-5" />
                {t('security.title')}
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{t('security.password')}</p>
                  <p className="text-sm text-gray-600">{t('security.lastUpdated')}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePasswordChange}
                >
                  {t('security.changePassword')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="default"
              size="lg"
              className="flex-1"
              onClick={handleSave}
            >
              {t('save')}
            </Button>
            <Link href="/distribuidor" className="flex-1">
              <Button variant="outline" size="lg" className="w-full">
                {t('cancel')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
