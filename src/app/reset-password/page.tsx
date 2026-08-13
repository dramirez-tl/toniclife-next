'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import {
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  resetPasswordAsync,
  selectIsLoading,
  selectAuthError,
  clearError,
} from '@/store/slices/authSlice';

// Password validation rules
const passwordRules = [
  { label: 'Al menos 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Una letra mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Una letra minúscula', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Un número', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Un carácter especial (ej. !@#$%.)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  const isLoading = useAppSelector(selectIsLoading);
  const authError = useAppSelector(selectAuthError);

  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Show auth error as toast
  useEffect(() => {
    if (authError) {
      toast.error(authError);
      dispatch(clearError());
    }
  }, [authError, dispatch]);

  const validatePassword = (password: string): boolean => {
    return passwordRules.every((rule) => rule.test(password));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return;

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.newPassword) {
      newErrors.newPassword = 'La contraseña es requerida';
    } else if (!validatePassword(formData.newPassword)) {
      newErrors.newPassword = 'La contraseña no cumple los requisitos';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      await dispatch(
        resetPasswordAsync({
          token,
          newPassword: formData.newPassword,
        })
      ).unwrap();

      toast.success('¡Contraseña restablecida exitosamente! Inicia sesión con tu nueva contraseña.');
      router.push('/login');
    } catch {
      // Error is handled via authError state
    }
  };

  // No token in URL
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Link href="/">
              <Image
                src="/images/logo/svg/logo-text-blue-r.svg"
                alt="Tonic Life"
                width={200}
                height={80}
                className="h-12 w-auto mx-auto mb-6"
              />
            </Link>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ExclamationTriangleIcon className="h-10 w-10 text-red-500" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Enlace inválido
              </h2>

              <p className="text-gray-600 mb-6">
                El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.
              </p>

              <div className="space-y-3">
                <Link href="/forgot-password">
                  <Button variant="default" className="w-full">
                    Solicitar nuevo enlace
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    Volver al login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/">
            <Image
              src="/images/logo/svg/logo-text-blue-r.svg"
              alt="Tonic Life"
              width={200}
              height={80}
              className="h-12 w-auto mx-auto mb-6"
            />
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">
            Restablecer contraseña
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Ingresa tu nueva contraseña
          </p>
        </div>

        <Card>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div className="space-y-1.5">
                <Label>Nueva contraseña</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4"><LockClosedIcon className="h-5 w-5" /></span>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="pl-9 pr-10"
                    aria-invalid={errors.newPassword ? true : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword}</p>}
              </div>

              {/* Password requirements */}
              {formData.newPassword && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Requisitos de contraseña:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {passwordRules.map((rule, index) => {
                      const passes = rule.test(formData.newPassword);
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircleIcon
                            className={`h-4 w-4 ${
                              passes ? 'text-[#3E667D]' : 'text-gray-300'
                            }`}
                          />
                          <span className={`text-xs ${
                            passes ? 'text-gray-700' : 'text-gray-400'
                          }`}>
                            {rule.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label>Confirmar nueva contraseña</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4"><LockClosedIcon className="h-5 w-5" /></span>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="pl-9 pr-10"
                    aria-invalid={errors.confirmPassword ? true : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="default"
                size="lg"
                className="w-full"
                disabled={isLoading || (isLoading)}
              >
                {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {isLoading ? 'Restableciendo...' : 'Restablecer contraseña'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            ¿Recordaste tu contraseña?{' '}
            <Link href="/login" className="font-medium text-[#3E667D] hover:text-[#3E667D] transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a7c1e2] mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
