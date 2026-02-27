'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  initializeAuth,
  selectIsAuthenticated,
  selectIsInitialized,
  selectUserRoles,
} from '@/store/slices/authSlice';
import { authService } from '@/services/auth.service';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requiredRoles,
  redirectTo = '/login',
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const hasInitialized = useRef(false);
  const hasRedirected = useRef(false);

  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isInitialized = useAppSelector(selectIsInitialized);
  const userRoles = useAppSelector(selectUserRoles);

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

    // Check role-based access
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some((role) =>
        userRoles.includes(role)
      );

      if (!hasRequiredRole) {
        hasRedirected.current = true;
        // Avoid infinite loop: don't redirect to the current section
        const fallback = pathname.startsWith('/distribuidor') ? '/' : '/distribuidor';
        window.location.href = fallback;
      }
    }
  }, [isInitialized, isAuthenticated, userRoles, requiredRoles, pathname, redirectTo]);

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

  // Check roles
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));
    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E667D] mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Acceso denegado, redirigiendo...</p>
          </div>
        </div>
      );
    }
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
