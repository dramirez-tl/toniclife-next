'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  logoutAsync,
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
    // Admin roles that should access the admin panel (canonical + legacy-migration codes)
    const adminRoles = [
      'super_admin', 'administrador', 'subadmin', 'almacen', 'ventas_mostrador',
      'rh', 'contabilidad', 'auditor', 'viewer', 'call_center',
      'operaciones', 'sucursales', 'supervisor', 'auxiliar_sucursal', 'auxiliar',
      'soporte', 'cedea', 'cedea_two', 'cedeas', 'cedeas2', 'comisiones',
      'comercial', 'produccion', 'laboratorio', 'compras',
      'ventas', 'asistencia', 'clientes', 'solicitud-viaticos', 'productos',
      'ventas-totales-sucursal', 'documentos', 'aprobacion-viaticos',
      'corte-caja-sucursal', 'inventario', 'rrhh-trabajadores', 'puntos-periodo', 'factura-libre',
    ];
    const isAdmin = roleCode && adminRoles.includes(roleCode);

    // Read redirect param directly from the URL (avoids useSearchParams/Suspense)
    const params = new URLSearchParams(window.location.search);
    const redirectPath = params.get('redirect');

    // Honor the redirect only if it matches the user's section
    // (don't send admins to /distribuidor or vice versa from a stale redirect)
    if (redirectPath && redirectPath.startsWith('/')) {
      const isAdminRedirect = redirectPath.startsWith('/admin');
      const isDistribuidorRedirect = redirectPath.startsWith('/distribuidor');

      if (isAdmin && isAdminRedirect) {
        window.location.href = redirectPath;
        return;
      }
      if (!isAdmin && isDistribuidorRedirect) {
        window.location.href = redirectPath;
        return;
      }
      // For neutral redirects (not /admin or /distribuidor), honor them
      if (!isAdminRedirect && !isDistribuidorRedirect) {
        window.location.href = redirectPath;
        return;
      }
    }

    // Default: route based on role
    if (isAdmin) {
      window.location.href = '/admin';
    } else {
      window.location.href = '/distribuidor';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: acepta email, número de distribuidor o nombre de usuario
    const newErrors: Record<string, string> = {};
    const trimmedId = formData.identifier.trim();
    if (!trimmedId) {
      newErrors.identifier = 'El correo, usuario o número de distribuidor es requerido';
    }
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
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
        remember: formData.remember,
      })).unwrap();

      // Si requiere vincular email, el useEffect se encarga del redirect
      if (isEmailLinkRequired(result)) {
        return;
      }

      // Si inició sesión con usuario/legacy ID pero ya tiene correo verificado,
      // bloquear el login y obligar a usar el correo vinculado
      const usedEmail = trimmedId.includes('@');
      if (!usedEmail && result.user.emailVerifiedAt && result.user.email) {
        // Cerrar la sesión recién creada
        dispatch(logoutAsync());
        toast.error(
          'Tu cuenta ya tiene un correo vinculado. Por favor inicia sesión con tu correo electrónico.',
          { duration: 8000 },
        );
        setFormData({ identifier: '', password: '', remember: false });
        return;
      }

      toast.success('¡Bienvenid@ de nuevo!');
      navigateAfterLogin(result.user.roles?.[0]);
    } catch {
      // Error is handled via authError state
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#3E667D]/10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <Link href="/">
              <Image
                src="/images/logo/svg/logo-text-blue-r.svg"
                alt="Tonic Life"
                width={400}
                height={130}
                className="mx-auto mb-4 h-32 w-auto sm:h-36"
              />
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#3E667D]/8 px-3 py-1 text-xs font-medium text-[#3E667D]">
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
                <div className="space-y-1.5">
                  <Label>Correo electrónico o usuario</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4"><UserIcon className="h-5 w-5" /></span>
                    <Input
                      type="text"
                      placeholder="tu@email.com o tu usuario"
                      value={formData.identifier}
                      onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                      autoComplete="username"
                      disabled={isLoading}
                      className="pl-9"
                      aria-invalid={errors.identifier ? true : undefined}
                    />
                  </div>
                  {errors.identifier && <p className="text-sm text-destructive">{errors.identifier}</p>}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label>Contraseña</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4"><LockClosedIcon className="h-5 w-5" /></span>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      autoComplete="current-password"
                      disabled={isLoading}
                      className="pl-9 pr-10"
                      aria-invalid={errors.password ? true : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:pointer-events-none"
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
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.remember}
                      onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-[#3E667D] focus:ring-[#a7c1e2]"
                      disabled={isLoading}
                    />
                    <span className="ml-2 text-sm text-gray-600">Recordarme</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-[#3E667D] transition-colors hover:text-[#3E667D]"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  className="w-full h-12 text-base font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <SparklesIcon className="h-4 w-4 text-[#3E667D]" />
                  Tu destino se asigna automáticamente según tu rol
                </div>
              </form>

              <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                <Link
                  href="/contacto"
                  className="group block transition-colors"
                >
                  <div className="mb-1 flex items-center gap-2 text-[#3E667D]">
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
