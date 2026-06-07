'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import {
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  registerAsync,
  selectIsAuthenticated,
  selectIsLoading,
  selectAuthError,
  clearError,
} from '@/store/slices/authSlice';

export default function RegistroPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectIsLoading);
  const authError = useAppSelector(selectAuthError);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    acceptTerms: false,
    acceptMarketing: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/distribuidor');
    }
  }, [isAuthenticated, router]);

  // Show auth error as toast
  useEffect(() => {
    if (authError) {
      toast.error(authError);
      dispatch(clearError());
    }
  }, [authError, dispatch]);

  const passwordRequirements = [
    { text: 'Al menos 8 caracteres', met: formData.password.length >= 8 },
    { text: 'Una letra mayúscula', met: /[A-Z]/.test(formData.password) },
    { text: 'Una letra minúscula', met: /[a-z]/.test(formData.password) },
    { text: 'Un número', met: /[0-9]/.test(formData.password) },
    { text: 'Un carácter especial (!@#$%^&*)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'El nombre es requerido';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Los apellidos son requeridos';
    }
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (!passwordRequirements.every(req => req.met)) {
      newErrors.password = 'La contraseña no cumple los requisitos';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'Debes aceptar los términos y condiciones';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      await dispatch(registerAsync({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
      })).unwrap();

      toast.success('¡Cuenta creada exitosamente! Revisa tu email para verificar tu cuenta.');
      router.push('/login');
    } catch {
      // Error is handled via authError state
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
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
            Crea tu cuenta
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-medium text-[#3E667D] hover:text-[#3E667D] transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>

        <Card>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nombre</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4"><UserIcon className="h-5 w-5" /></span>
                    <Input
                      type="text"
                      placeholder="Juan"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      autoComplete="given-name"
                      disabled={isLoading}
                      className="pl-9"
                      aria-invalid={errors.firstName ? true : undefined}
                    />
                  </div>
                  {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Apellidos</Label>
                  <Input
                    type="text"
                    placeholder="Pérez"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    autoComplete="family-name"
                    disabled={isLoading}
                    aria-invalid={errors.lastName ? true : undefined}
                  />
                  {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label>Correo electrónico</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4"><EnvelopeIcon className="h-5 w-5" /></span>
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    autoComplete="email"
                    disabled={isLoading}
                    className="pl-9"
                    aria-invalid={errors.email ? true : undefined}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              {/* Phone (Optional) */}
              <div className="space-y-1.5">
                <Label>Teléfono (opcional)</Label>
                <Input
                  type="tel"
                  placeholder="+52 123 456 7890"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  autoComplete="tel"
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">Te contactaremos sobre tu pedido</p>
              </div>

              {/* Password */}
              <div className="relative">
                <div className="space-y-1.5">
                  <Label>Contraseña</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4"><LockClosedIcon className="h-5 w-5" /></span>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      autoComplete="new-password"
                      disabled={isLoading}
                      className="pl-9"
                      aria-invalid={errors.password ? true : undefined}
                    />
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
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

              {/* Password Requirements */}
              {formData.password && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Requisitos de contraseña:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircleIcon
                          className={`h-4 w-4 ${
                            req.met ? 'text-[#3E667D]' : 'text-gray-300'
                          }`}
                        />
                        <span className={`text-xs ${
                          req.met ? 'text-gray-700' : 'text-gray-400'
                        }`}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirm Password */}
              <div className="relative">
                <div className="space-y-1.5">
                  <Label>Confirmar contraseña</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4"><LockClosedIcon className="h-5 w-5" /></span>
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      autoComplete="new-password"
                      disabled={isLoading}
                      className="pl-9"
                      aria-invalid={errors.confirmPassword ? true : undefined}
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Terms */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                    className="mt-1 h-4 w-4 text-[#3E667D] border-gray-300 rounded focus:ring-[#a7c1e2]"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-600">
                    Acepto los{' '}
                    <Link href="/terminos" className="text-[#3E667D] hover:text-[#3E667D] underline">
                      términos y condiciones
                    </Link>
                    {' '}y la{' '}
                    <Link href="/privacidad" className="text-[#3E667D] hover:text-[#3E667D] underline">
                      política de privacidad
                    </Link>
                  </span>
                </label>
                {errors.acceptTerms && (
                  <p className="text-sm text-red-500">{errors.acceptTerms}</p>
                )}

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.acceptMarketing}
                    onChange={(e) => setFormData({ ...formData, acceptMarketing: e.target.checked })}
                    className="mt-1 h-4 w-4 text-[#3E667D] border-gray-300 rounded focus:ring-[#a7c1e2]"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-600">
                    Quiero recibir ofertas exclusivas, tips de bienestar y novedades por email
                  </span>
                </label>
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
                {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Distributor CTA */}
        <Card className="mt-6 bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg mb-1">¿Quieres ser distribuidor?</h3>
                <p className="text-sm text-white/80">
                  Gana dinero compartiendo bienestar
                </p>
              </div>
              <Link href="/registro/distribuidor">
                <Button variant="secondary" size="sm">
                  Conocer más
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
