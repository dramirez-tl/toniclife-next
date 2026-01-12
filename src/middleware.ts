import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/cuenta',
  '/distribuidor',
  '/admin',
];

// Routes that are only accessible when NOT authenticated
const authRoutes = [
  '/login',
  '/registro',
  '/forgot-password',
];

// Routes that require specific roles
const roleRoutes: Record<string, string[]> = {
  '/admin': ['admin', 'super_admin'],
  '/distribuidor': ['distributor', 'admin', 'super_admin'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get tokens from cookies or localStorage (cookies for middleware)
  const accessToken = request.cookies.get('accessToken')?.value;

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if the current path is an auth route (login, register, etc.)
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // If trying to access protected route without token, redirect to login
  if (isProtectedRoute && !accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already authenticated and trying to access auth routes, redirect to home
  if (isAuthRoute && accessToken) {
    return NextResponse.redirect(new URL('/cuenta', request.url));
  }

  // Role-based access control
  // Note: For full role checking, we'd need to decode the JWT or make an API call
  // This is a basic check - full role validation should happen on the client/server
  const matchedRoleRoute = Object.keys(roleRoutes).find((route) =>
    pathname.startsWith(route)
  );

  if (matchedRoleRoute && accessToken) {
    // For now, we'll allow access and let client-side handle role validation
    // A more robust solution would decode the JWT here or use a separate endpoint
    // to validate roles server-side
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except static files and API routes
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images)
     * - icons (public icons)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|icons).*)',
  ],
};
