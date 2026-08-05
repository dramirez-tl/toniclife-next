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
    ],
  },

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
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
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https:`,
      "font-src 'self' data:",
      `connect-src 'self' ${apiOrigin} https://api.stripe.com https://vitals.vercel-insights.com wss:`,
      'frame-src https://js.stripe.com https://hooks.stripe.com',
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
    ];
  },
};

export default withNextIntl(nextConfig);
