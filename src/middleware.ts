import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/distribuidor',
  '/admin',
];

// Routes that are only accessible when NOT authenticated
const authRoutes = [
  '/login',
  '/forgot-password',
];

// Public registration routes that should be accessible even when authenticated
// (e.g., distributor registration via referral link)
const publicRegistrationRoutes = [
  '/registro/distribuidor',
];

// Auth-only registration routes (login/register selection page)
const authOnlyRoutes = [
  '/registro',
];

// Admin roles that can access /admin/* routes (Spanish database role codes)
const ADMIN_ROLES = [
  'administrador',
  'super_admin',
  'subadmin',
  'almacen',
  'ventas_mostrador',
  'rh',
  'contabilidad',
  'auditor',
  'viewer',
];

// Distributor role for /distribuidor/* routes
const DISTRIBUTOR_ROLE = 'distribuidor';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The client stores two small cookies for the middleware:
  //   accessToken = "1"          → indicates the user is logged-in
  //   authRole    = "administrador" (or other role code)
  // The full JWT lives only in localStorage (it can exceed the 4 KB cookie
  // limit when it embeds many permissions).
  const isLoggedIn = !!request.cookies.get('accessToken')?.value;
  const role = request.cookies.get('authRole')?.value || null;

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if the current path is an auth route (login, etc.)
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Check if this is a public registration route (accessible even when authenticated)
  const isPublicRegistrationRoute = publicRegistrationRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if this is an auth-only registration route (only when NOT authenticated)
  const isAuthOnlyRoute = authOnlyRoutes.some((route) =>
    pathname === route || pathname === route + '/'
  );

  // If trying to access protected route without being logged in, redirect to login
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already authenticated and trying to access auth routes, redirect to dashboard
  // But allow public registration routes (like /registro/distribuidor for referrals)
  if ((isAuthRoute || isAuthOnlyRoute) && isLoggedIn && !isPublicRegistrationRoute) {
    // Redirect admin roles to /admin, distributors to /distribuidor
    if (role && ADMIN_ROLES.includes(role)) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.redirect(new URL('/distribuidor', request.url));
  }

  // ── Role-based access control ──────────────────────────────────────────
  if (isLoggedIn && (pathname.startsWith('/admin') || pathname.startsWith('/distribuidor'))) {
    // /admin/* — only admin roles may enter
    if (pathname.startsWith('/admin')) {
      if (!role || !ADMIN_ROLES.includes(role)) {
        // If the user is a distribuidor, send them to their dashboard
        if (role === DISTRIBUTOR_ROLE) {
          return NextResponse.redirect(new URL('/distribuidor', request.url));
        }
        // Otherwise redirect to the homepage
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    // /distribuidor/* — only the distribuidor role (and admin roles for impersonation)
    if (pathname.startsWith('/distribuidor')) {
      const allowedForDistribuidor = [DISTRIBUTOR_ROLE, ...ADMIN_ROLES];
      if (!role || !allowedForDistribuidor.includes(role)) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
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
