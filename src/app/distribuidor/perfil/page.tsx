'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
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

export default function PerfilPage() {
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
    toast.success('Perfil actualizado exitosamente');
  };

  const handlePasswordChange = () => {
    toast.info('Abriendo formulario de cambio de contraseña');
  };

  const handleUploadPhoto = () => {
    toast.info('Abriendo selector de imagen');
  };

  const handleDownloadQR = () => {
    toast.success('Descargando código QR...');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://toniclife.com/maria-gonzalez');
    toast.success('Enlace copiado al portapapeles');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <UserCircleIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Mi Perfil</h1>
              </div>
              <p className="text-white/80 text-lg">
                Administra tu información personal
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6">
          {/* Profile Photo */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Foto de Perfil</h3>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-gradient-to-br from-[#003B7A] to-[#7AB82E] rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  {formData.firstName[0]}{formData.lastName[0]}
                </div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<CameraIcon className="h-4 w-4" />}
                    onClick={handleUploadPhoto}
                  >
                    Cambiar Foto
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    JPG, PNG o GIF. Máximo 2MB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Información Personal</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Nombre"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  leftIcon={<UserCircleIcon className="h-5 w-5" />}
                />
                <Input
                  label="Apellido"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  leftIcon={<EnvelopeIcon className="h-5 w-5" />}
                />
                <Input
                  label="Teléfono"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  leftIcon={<PhoneIcon className="h-5 w-5" />}
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Biografía
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                  placeholder="Cuéntanos sobre ti..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Esta información aparecerá en tu perfil público
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPinIcon className="h-5 w-5" />
                Dirección
              </h3>
              <div className="grid gap-4">
                <Input
                  label="Calle y Número"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                />
                <div className="grid md:grid-cols-3 gap-4">
                  <Input
                    label="Ciudad"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                  <Input
                    label="Estado"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                  <Input
                    label="Código Postal"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Link */}
          <Card className="bg-gradient-to-r from-[#7AB82E] to-[#7AB82E]/90 text-white">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <ShareIcon className="h-5 w-5" />
                Tu Enlace de Referidos
              </h3>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
                <p className="text-sm text-white/80 mb-2">Enlace personal</p>
                <p className="font-mono text-sm break-all">
                  https://toniclife.com/maria-gonzalez
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<ShareIcon className="h-4 w-4" />}
                  onClick={handleCopyLink}
                >
                  Copiar Enlace
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<QrCodeIcon className="h-4 w-4" />}
                  onClick={handleDownloadQR}
                >
                  Descargar QR
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BellIcon className="h-5 w-5" />
                Notificaciones
              </h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Email</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'emailSales', label: 'Nuevas ventas' },
                      { key: 'emailCommissions', label: 'Comisiones acreditadas' },
                      { key: 'emailTeam', label: 'Actividad del equipo' },
                      { key: 'emailMarketing', label: 'Promociones y novedades' },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications[item.key as keyof typeof notifications]}
                          onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                          className="h-4 w-4 text-[#003B7A] rounded focus:ring-[#7AB82E]"
                        />
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">SMS</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'smsImportant', label: 'Alertas importantes' },
                      { key: 'smsSales', label: 'Notificación de ventas' },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications[item.key as keyof typeof notifications]}
                          onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                          className="h-4 w-4 text-[#003B7A] rounded focus:ring-[#7AB82E]"
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
                Seguridad
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Contraseña</p>
                  <p className="text-sm text-gray-600">Última actualización: hace 3 meses</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePasswordChange}
                >
                  Cambiar Contraseña
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={handleSave}
            >
              Guardar Cambios
            </Button>
            <Link href="/distribuidor" className="flex-1">
              <Button variant="outline" size="lg" className="w-full">
                Cancelar
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
