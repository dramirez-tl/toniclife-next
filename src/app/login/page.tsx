'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  UserIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  SparklesIcon,
  LifebuoyIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { isEmailLinkRequired } from '@/services/auth.service';
import {
  loginAsync,
  selectIsLoading,
  selectAuthError,
  selectEmailLinkRequired,
  clearError,
} from '@/store/slices/authSlice';

export default function LoginPage() {
  const dispatch = useAppDispatch();

  const isLoading = useAppSelector(selectIsLoading);
  const authError = useAppSelector(selectAuthError);
  const emailLinkRequired = useAppSelector(selectEmailLinkRequired);

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    remember: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Show auth error as toast
  useEffect(() => {
    if (authError) {
      toast.error(authError);
      dispatch(clearError());
    }
  }, [authError, dispatch]);

  // Redirect to email linking page when required
  useEffect(() => {
    if (emailLinkRequired) {
      window.location.href = '/vincular-correo';
    }
  }, [emailLinkRequired]);

  const navigateAfterLogin = (roleCode?: string) => {
    // Read redirect param directly from the URL (avoids useSearchParams/Suspense)
    const params = new URLSearchParams(window.location.search);
    const redirectPath = params.get('redirect');
    if (redirectPath && redirectPath.startsWith('/')) {
      window.location.href = redirectPath;
      return;
    }

    // Admin roles that should access the admin panel (database role codes)
    const adminRoles = ['super_admin', 'administrador', 'subadmin', 'almacen', 'ventas_mostrador', 'rh', 'contabilidad', 'auditor', 'viewer'];

    if (roleCode && adminRoles.includes(roleCode)) {
      window.location.href = '/admin';
    } else {
      window.location.href = '/distribuidor';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: acepta email O número de distribuidor
    const newErrors: Record<string, string> = {};
    const trimmedId = formData.identifier.trim();
    if (!trimmedId) {
      newErrors.identifier = 'El correo o número de distribuidor es requerido';
    } else {
      const isNumeric = /^\d+$/.test(trimmedId);
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedId);
      if (!isNumeric && !isEmail) {
        newErrors.identifier = 'Ingresa un correo válido o tu número de distribuidor';
      }
    }
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      const result = await dispatch(loginAsync({
        identifier: trimmedId,
        password: formData.password,
      })).unwrap();

      // Si requiere vincular email, el useEffect se encarga del redirect
      if (isEmailLinkRequired(result)) {
        return;
      }

      toast.success('¡Bienvenido de nuevo!');
      navigateAfterLogin(result.user.roles?.[0]);
    } catch {
      // Error is handled via authError state
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#003B7A]/10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <Link href="/">
              <Image
                src="/images/logo.png"
                alt="Tonic Life"
                width={180}
                height={64}
                className="mx-auto mb-4 h-10 w-auto"
              />
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#003B7A]/8 px-3 py-1 text-xs font-medium text-[#003B7A]">
              <ShieldCheckIcon className="h-3.5 w-3.5" />
              Acceso seguro
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-[2rem] lg:text-[2.2rem]">
              Iniciar sesión
            </h2>
            <p className="mt-2 max-w-md text-sm text-gray-600 lg:max-w-none">
              Ingresa con tus credenciales autorizadas para acceder a la plataforma.
            </p>
          </div>

          <Card className="rounded-3xl border border-gray-100 bg-white/95 shadow-2xl shadow-gray-200/70 backdrop-blur">
            <CardContent className="p-7 sm:p-8 lg:p-9">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Identifier (email o usuario) */}
                <Input
                  label="Correo electrónico o usuario"
                  type="text"
                  placeholder="tu@email.com o tu usuario"
                  value={formData.identifier}
                  onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                  error={errors.identifier}
                  leftIcon={<UserIcon className="h-5 w-5" />}
                  autoComplete="username"
                  disabled={isLoading}
                />

                {/* Password */}
                <div className="relative">
                  <Input
                    label="Contraseña"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    error={errors.password}
                    leftIcon={<LockClosedIcon className="h-5 w-5" />}
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    disabled={isLoading}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.remember}
                      onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-[#003B7A] focus:ring-[#7AB82E]"
                      disabled={isLoading}
                    />
                    <span className="ml-2 text-sm text-gray-600">Recordarme</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-[#003B7A] transition-colors hover:text-[#7AB82E]"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full h-12 text-base font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <SparklesIcon className="h-4 w-4 text-[#7AB82E]" />
                  Tu destino se asigna automáticamente según tu rol
                </div>
              </form>

              <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                <Link
                  href="/ayuda"
                  className="group block transition-colors"
                >
                  <div className="mb-1 flex items-center gap-2 text-[#003B7A]">
                    <LifebuoyIcon className="h-4 w-4" />
                    <span className="text-sm font-semibold">Soporte de acceso</span>
                  </div>
                  <p className="text-xs text-gray-500 group-hover:text-gray-600">
                    Si no puedes ingresar, contacta a mesa de ayuda interna.
                  </p>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
