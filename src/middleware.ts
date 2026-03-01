import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── Maintenance / Countdown gate ───────────────────────────────────────────
// Set LAUNCH_DATE in .env to enable the maintenance gate.
// Users can bypass it via /config_sistemas (sets a cookie).
// After the launch date passes, the gate disables itself automatically.
const LAUNCH_DATE = process.env.LAUNCH_DATE || '';

function isBeforeLaunch(): boolean {
  if (!LAUNCH_DATE) return false;
  return new Date().getTime() < new Date(LAUNCH_DATE).getTime();
}

// Routes that require authentication
const protectedRoutes = [
  '/distribuidor',
  '/admin',
];

// Routes that are only accessible when NOT authenticated
const authRoutes = [
  '/login',
  '/forgot-password',
  '/vincular-correo',
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

// Admin roles that can access /admin/* routes
// Includes both canonical codes and legacy-migration codes (e.g. 'ventas' = Administrador)
const ADMIN_ROLES = [
  // Canonical codes
  'administrador', 'super_admin', 'subadmin', 'almacen', 'ventas_mostrador',
  'rh', 'contabilidad', 'auditor', 'viewer',
  // Legacy-migration codes (role.code came from legacy module names)
  'ventas',                   // Administrador (54 users)
  'asistencia',               // Sucursales (88)
  'clientes',                 // Operaciones (23)
  'solicitud-viaticos',       // Supervisor (20)
  'productos',                // Soporte (13)
  'ventas-totales-sucursal',  // Comercial Two (12)
  'documentos',               // Contabilidad (9)
  'aprobacion-viaticos',      // Viaticos (4)
  'corte-caja-sucursal',      // Help (3)
  'inventario',               // Almacen (2)
  'rrhh-trabajadores',        // RH (2)
  'puntos-periodo',           // Comercial USA (2)
  'factura-libre',            // Aux Contabilidad (1)
];

// Distributor roles for /distribuidor/* routes
const DISTRIBUTOR_ROLES = ['distribuidor', 'customer', 'dashboard', 'cliente-dashboard'];

// Legacy migration created generic role codes "role1" through "role46" for distributors.
// ~170k users have these codes, so we match the pattern instead of listing all 46.
const LEGACY_ROLE_PATTERN = /^role\d+$/;

function isDistributorRole(role: string | null): boolean {
  if (!role) return false;
  return DISTRIBUTOR_ROLES.includes(role) || LEGACY_ROLE_PATTERN.test(role);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Maintenance gate ──────────────────────────────────────────────────
  // Redirect all visitors to /mantenimiento UNLESS:
  //   1. They're on /mantenimiento or /config_sistemas (always allowed)
  //   2. They have the bypass cookie (set via /config_sistemas toggle)
  //   3. The launch date has passed (or is not configured)
  const bypassCountdown = request.cookies.get('bypass_countdown')?.value === '1';
  if (
    pathname !== '/mantenimiento' &&
    pathname !== '/config_sistemas' &&
    isBeforeLaunch() &&
    !bypassCountdown
  ) {
    return NextResponse.redirect(new URL('/mantenimiento', request.url));
  }
  // If launch date has passed but user is still on /mantenimiento, send them home
  if (pathname === '/mantenimiento' && !isBeforeLaunch()) {
    return NextResponse.redirect(new URL('/', request.url));
  }

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
        // If the user is a distribuidor/customer, send them to their dashboard
        if (isDistributorRole(role)) {
          return NextResponse.redirect(new URL('/distribuidor', request.url));
        }
        // Otherwise redirect to the homepage
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    // /distribuidor/* — only distributor roles (and admin roles for impersonation)
    if (pathname.startsWith('/distribuidor')) {
      if (!role || (!isDistributorRole(role) && !ADMIN_ROLES.includes(role))) {
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
