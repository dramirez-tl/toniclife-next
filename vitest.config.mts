import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Pruebas unitarias de libs PURAS del front (sin DOM ni React): `npm test`.
// Alcance inicial: src/lib/storefront (SEO, JSON-LD, precio, slug, URL del catálogo).
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
