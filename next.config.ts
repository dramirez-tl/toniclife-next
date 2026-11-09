import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Build ID expuesto al cliente para detección de nueva versión
  env: {
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
      new Date().getTime().toString(),
  },

  // Image optimization settings
  images: {
    // AVIF primero (menor peso en las fotos de producto), WebP de respaldo (contrato §9).
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      // Archivos públicos servidos por el API (S3 vía /api/v1/storage/file/*,
      // S3_PUBLIC_BASE_URL): fotos de producto nuevas, flyers de eventos.
      {
        protocol: 'https',
        hostname: '*.up.railway.app',
      },
      // Por si el bucket o un CDN quedan públicos más adelante.
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
    ],
  },

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // ── Staging retirado (decisión de Diego, 8-nov-2026) ──────────────────────
  // Desde el 2-nov-2026 el equipo usa 100 % producción (www.toniclife.com).
  // Quien todavía entre por el proyecto de staging en Vercel
  // (toniclife-next-staging.vercel.app y sus alias de despliegue
  // toniclife-next-staging-*.vercel.app) se va a producción conservando ruta y
  // query. Se decide por el HOST, no por rama: staging y main comparten este
  // archivo, y en www.toniclife.com, previews de otros nombres y localhost la
  // regla no aplica. 307 (temporal) para que el navegador no lo cachee para
  // siempre si algún día hay que volver a usar staging.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'toniclife-next-staging(?:-[a-z0-9-]+)?[.]vercel[.]app',
          },
        ],
        destination: 'https://www.toniclife.com/:path*',
        permanent: false,
      },
    ];
  },

  // Cabeceras de seguridad (dictamen SIWEB 3.2.3). La CSP arranca en
  // Report-Only para no romper Stripe/Analytics en producción: se endurece a
  // enforcing cuando los reportes salgan limpios.
  async headers() {
    const apiOrigin = (
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
    ).replace(/\/api\/v1\/?$/, '');
    const csp = [
      "default-src 'self'",
      // Next inyecta scripts inline (hydration) y Stripe carga su JS.
      // Google Identity Services (botón de Google Sign-In en /login y /vincular-correo).
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://va.vercel-scripts.com https://accounts.google.com",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https:`,
      "font-src 'self' data:",
      `connect-src 'self' ${apiOrigin} https://api.stripe.com https://vitals.vercel-insights.com https://accounts.google.com wss:`,
      'frame-src https://js.stripe.com https://hooks.stripe.com https://accounts.google.com',
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join('; ');
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          { key: 'Content-Security-Policy-Report-Only', value: csp },
        ],
      },
      // Áreas privadas y API interna: nunca indexables, aunque alguien las enlace
      // (contrato §8). robots.txt solo pide no rastrear; esta cabecera impide indexar.
      // `:path*` admite cero segmentos: cubre `/admin` y todo lo que cuelga de él.
      ...['/admin', '/distribuidor', '/pos', '/api'].map((prefix) => ({
        source: `${prefix}/:path*`,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
    ];
  },
};

export default withNextIntl(nextConfig);
