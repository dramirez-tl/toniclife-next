'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  loginAsync,
  selectIsLoading,
  selectAuthError,
  clearError,
} from '@/store/slices/authSlice';

export default function LoginPage() {
  const dispatch = useAppDispatch();

  const isLoading = useAppSelector(selectIsLoading);
  const authError = useAppSelector(selectAuthError);

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
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

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
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
        email: formData.email,
        password: formData.password,
      })).unwrap();

      toast.success('¡Bienvenido de nuevo!');
      navigateAfterLogin(result.roles?.[0]);
    } catch {
      // Error is handled via authError state
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link href="/">
            <Image
              src="/images/logo.png"
              alt="Tonic Life"
              width={200}
              height={80}
              className="h-12 w-auto mx-auto mb-6"
            />
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">
            Bienvenido de nuevo
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            ¿No tienes cuenta?{' '}
            <Link href="/registro" className="font-medium text-[#003B7A] hover:text-[#7AB82E] transition-colors">
              Regístrate gratis
            </Link>
          </p>
        </div>

        <Card>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={errors.email}
                leftIcon={<EnvelopeIcon className="h-5 w-5" />}
                autoComplete="email"
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
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
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
                    className="h-4 w-4 text-[#003B7A] border-gray-300 rounded focus:ring-[#7AB82E]"
                    disabled={isLoading}
                  />
                  <span className="ml-2 text-sm text-gray-600">Recordarme</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-[#003B7A] hover:text-[#7AB82E] transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </Button>
            </form>

          </CardContent>
        </Card>

        {/* Help text */}
        <p className="text-center text-sm text-gray-600">
          ¿Problemas para iniciar sesión?{' '}
          <Link href="/ayuda" className="font-medium text-[#003B7A] hover:text-[#7AB82E] transition-colors">
            Contáctanos
          </Link>
        </p>
      </div>
    </div>
  );
}
