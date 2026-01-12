'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  initializeAuth,
  selectIsAuthenticated,
  selectIsInitialized,
  selectIsLoading,
  selectUserRoles,
} from '@/store/slices/authSlice';

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

  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isInitialized = useAppSelector(selectIsInitialized);
  const isLoading = useAppSelector(selectIsLoading);
  const userRoles = useAppSelector(selectUserRoles);

  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Initialize auth on mount
    if (!isInitialized) {
      dispatch(initializeAuth());
    }
  }, [dispatch, isInitialized]);

  useEffect(() => {
    if (!isInitialized || isLoading) return;

    // Not authenticated, redirect to login
    if (!isAuthenticated) {
      const loginUrl = `${redirectTo}?redirect=${encodeURIComponent(pathname)}`;
      router.replace(loginUrl);
      return;
    }

    // Check role-based access
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some((role) =>
        userRoles.includes(role)
      );

      if (!hasRequiredRole) {
        // User doesn't have required role, redirect to appropriate page
        router.replace('/cuenta');
        return;
      }
    }

    // All checks passed
    setIsAuthorized(true);
  }, [
    isInitialized,
    isLoading,
    isAuthenticated,
    userRoles,
    requiredRoles,
    pathname,
    redirectTo,
    router,
  ]);

  // Show loading while checking auth
  if (!isInitialized || isLoading || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003B7A]" />
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
