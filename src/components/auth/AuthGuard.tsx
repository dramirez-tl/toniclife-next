'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  initializeAuth,
  logoutAsync,
  selectIsAuthenticated,
  selectIsInitialized,
  selectUser,
  selectUserRoles,
} from '@/store/slices/authSlice';
import { authService } from '@/services/auth.service';
import { resolvePortal } from '@/lib/auth-roles';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  /** Categoría de rol aceptada ('colaborador' | 'cliente'). Pasa si la
   *  categoría del usuario coincide O si su código está en requiredRoles
   *  (fallback para sesiones sin roleCategory). */
  requiredCategory?: 'colaborador' | 'cliente';
  /** Además de requiredCategory='cliente', admite colaboradores
   *  (impersonación/soporte del panel admin sobre el portal distribuidor). */
  allowColaborador?: boolean;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requiredRoles,
  requiredCategory,
  allowColaborador = false,
  redirectTo = '/login',
}: AuthGuardProps) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const hasInitialized = useRef(false);
  const hasRedirected = useRef(false);

  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isInitialized = useAppSelector(selectIsInitialized);
  const userRoles = useAppSelector(selectUserRoles);
  const user = useAppSelector(selectUser);

  // Acceso: categoría primero (la fuente de verdad), listas solo como
  // fallback de sesiones viejas sin roleCategory. Sin requisitos = pasa.
  const hasAccess = (() => {
    if (!requiredCategory && (!requiredRoles || requiredRoles.length === 0)) {
      return true;
    }
    const category = user?.roleCategory;
    if (requiredCategory && category) {
      if (category === requiredCategory) return true;
      if (allowColaborador && category === 'colaborador') return true;
      // Con categoría presente y distinta, las listas legacy NO rescatan:
      // la categoría es autoritativa.
      return false;
    }
    // Token viejo sin categoría → fallback por código de rol.
    if (requiredRoles && requiredRoles.length > 0) {
      return requiredRoles.some((role) => userRoles.includes(role));
    }
    // Exigía categoría y el token no la trae ni hay lista: forzar re-login
    // (el token nuevo la incluirá).
    return false;
  })();

  // Initialize auth once on mount
  useEffect(() => {
    if (!hasInitialized.current && !isInitialized) {
      hasInitialized.current = true;
      dispatch(initializeAuth());
    }
  }, [dispatch, isInitialized]);

  // Handle redirects after initialization
  useEffect(() => {
    if (!isInitialized || hasRedirected.current) return;

    // Not authenticated, redirect to login
    if (!isAuthenticated) {
      hasRedirected.current = true;
      // Clear any stale cookies
      authService.clearTokens();
      const loginUrl = `${redirectTo}?redirect=${encodeURIComponent(pathname)}`;
      // Use window.location for hard redirect to ensure middleware runs
      window.location.href = loginUrl;
      return;
    }

    // Sin acceso: NO se redirige (los rebotes ciegos eran parte del ciclo que
    // atrapaba a los roles corporativos). Se muestra la pantalla de "sin
    // acceso" con salidas reales — ver el render de abajo.
  }, [isInitialized, isAuthenticated, pathname, redirectTo]);

  // Show loading only while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E667D] mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show loading while redirecting
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E667D] mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  // Sin acceso a ESTA sección: pantalla clara con salidas reales (su portal,
  // o cerrar sesión). Nunca un redirect ciego ni un spinner infinito.
  if (!hasAccess) {
    // resolvePortal (no solo la categoría): una sesión con token viejo sin
    // roleCategory también merece su botón de escape hacia su portal.
    const portal = resolvePortal(user?.roleCategory, userRoles[0]);
    const homeHref = portal === 'distributor' ? '/distribuidor' : '/admin';
    const homeLabel =
      portal === 'distributor' ? 'Ir a mi panel de distribuidor' : 'Ir al panel de administración';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            No tienes acceso a esta sección
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Tu cuenta ({user?.email}) no corresponde a esta parte del sistema.
            Si crees que es un error, pide a un administrador que revise tu rol
            en Seguridad → Roles y Permisos.
          </p>
          <div className="flex flex-col gap-2 items-center">
            {portal !== 'unknown' && (
              <a
                href={homeHref}
                className="w-full max-w-xs rounded-lg bg-[#3E667D] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2f5165]"
              >
                {homeLabel}
              </a>
            )}
            <button
              onClick={async () => {
                try {
                  await dispatch(logoutAsync()).unwrap();
                } finally {
                  authService.clearTokens();
                  window.location.href = '/login';
                }
              }}
              className="w-full max-w-xs rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// HOC version for easier use
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options?: { requiredRoles?: string[]; redirectTo?: string }
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard
        requiredRoles={options?.requiredRoles}
        redirectTo={options?.redirectTo}
      >
        <Component {...props} />
      </AuthGuard>
    );
  };
}
