import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { LOCALES } from './i18n/config';

// next-intl middleware para las rutas públicas localizadas.
const intlMiddleware = createMiddleware(routing);

// ¿La ruta ya viene con prefijo de locale? (/es-mx, /en-us/productos, …)
const LOCALE_PREFIX_RE = new RegExp(`^/(${LOCALES.join('|')})(/|$)`);
// Bases públicas que SÍ se localizan (home, productos, quiz, carrito, checkout).
// El resto (faq, admin, distribuidor, etc.) NO pasa por i18n.
const LOCALIZABLE_BASE_RE = /^\/(productos|quiz|carrito|checkout)(\/|$)/;

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

// ── Portal de la sesión ────────────────────────────────────────────────────
// El ruteo se decide por el PORTAL ('admin' | 'distributor'), que el cliente
// escribe en la cookie authPortal derivándolo de la CATEGORÍA del rol
// (roles.category en el JWT: colaborador→admin, cliente→distributor). Las
// listas legacy de auth-roles.ts solo cubren sesiones con token viejo.
// Un portal 'unknown' NUNCA se queda ciclando: se le limpian las cookies y se
// le deja ver /login (antes, un rol fuera de las listas quemadas quedaba
// atrapado en /login→/distribuidor→/ durante 7 días y el usuario tenía que
// borrar caché — bug de roles corporativos, ago-2026).
import { resolvePortal, type Portal } from './lib/auth-roles';

const AUTH_COOKIES = ['accessToken', 'authRole', 'authPortal'];

/** Redirige limpiando las cookies de sesión (el escape de la trampa). */
function redirectClearingSession(request: NextRequest, to: string): NextResponse {
  const res = NextResponse.redirect(new URL(to, request.url));
  for (const c of AUTH_COOKIES) res.cookies.delete(c);
  return res;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Subdominio del formulario público de marketing ────────────────────
  // formulario.<dominio> sirve SOLO el formulario "Oportunidad de Negocio"
  // (app/formulario), sin gate de mantenimiento ni auth: cualquier ruta del
  // subdominio se reescribe a /formulario. En el dominio principal,
  // /formulario también es público (útil para probar sin DNS).
  const host = (request.headers.get('host') ?? '').toLowerCase();
  if (host.startsWith('formulario.')) {
    if (pathname === '/formulario') return NextResponse.next();
    return NextResponse.rewrite(new URL('/formulario', request.url));
  }
  if (pathname === '/formulario' || pathname.startsWith('/formulario/')) {
    return NextResponse.next();
  }

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

  // ── Localización (tienda pública: home, productos, quiz) ──────────────
  // Rutas ya prefijadas (/es-mx/…) o bases localizables (/, /productos, /quiz)
  // las maneja next-intl: redirige al locale (cookie NEXT_LOCALE) y sirve
  // app/[locale]/…. Lo demás sigue con la lógica de auth/roles de abajo.
  if (
    LOCALE_PREFIX_RE.test(pathname) ||
    pathname === '/' ||
    LOCALIZABLE_BASE_RE.test(pathname)
  ) {
    return intlMiddleware(request);
  }

  // The client stores three small cookies for the middleware:
  //   accessToken = "1"                    → the user is logged-in
  //   authPortal  = "admin"|"distributor"  → portal por CATEGORÍA del rol
  //   authRole    = "administrador" (…)    → solo fallback de sesiones viejas
  // The full JWT lives only in web storage (it can exceed the 4 KB cookie
  // limit when it embeds many permissions).
  const isLoggedIn = !!request.cookies.get('accessToken')?.value;
  const role = request.cookies.get('authRole')?.value || null;
  const portalCookie = request.cookies.get('authPortal')?.value || null;
  const portal: Portal =
    portalCookie === 'admin' || portalCookie === 'distributor'
      ? portalCookie
      : resolvePortal(null, role);

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
    if (portal === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (portal === 'distributor') {
      return NextResponse.redirect(new URL('/distribuidor', request.url));
    }
    // Sesión inclasificable: DEJAR VER el login y soltar las cookies para que
    // pueda re-loguearse (con el token nuevo llegará roleCategory y el portal
    // quedará bien clasificado). Jamás redirigir: eso era la trampa.
    const res = NextResponse.next();
    for (const c of AUTH_COOKIES) res.cookies.delete(c);
    return res;
  }

  // ── Portal-based access control ────────────────────────────────────────
  if (isLoggedIn && (pathname.startsWith('/admin') || pathname.startsWith('/distribuidor'))) {
    // /admin/* — colaboradores (portal admin)
    if (pathname.startsWith('/admin')) {
      if (portal === 'distributor') {
        return NextResponse.redirect(new URL('/distribuidor', request.url));
      }
      if (portal !== 'admin') {
        // Sesión inclasificable → a re-loguear con cookies limpias.
        return redirectClearingSession(request, '/login');
      }
    }

    // /distribuidor/* — clientes, y colaboradores para impersonación/soporte
    if (pathname.startsWith('/distribuidor')) {
      if (portal !== 'distributor' && portal !== 'admin') {
        return redirectClearingSession(request, '/login');
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
