# My Wellness Hub by Tonic Life

> **Wellness Made Simple** - Plataforma MLM de e-commerce para suplementos naturales con recomendaciones personalizadas

[![Next.js](https://img.shields.io/badge/Next.js-16.0.4-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.17-38bdf8)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-ISC-green.svg)](LICENSE)

## 📅 Periodos de negocio (26 → 25) — regla clave

Los periodos (comisiones, ventas, MLM, reportes, dashboards) **inician el día 26 y
terminan el día 25** — NO son meses calendario. Se nombran por su mes de FIN:
**"Mayo"** = 26-abr → 25-may · **"Enero 2026"** = 26-dic-2025 → 25-ene-2026.

Cualquier UI de "mes/periodo" debe pedir datos por periodo al API (rango
`[start_date, end_date]` de `tonic.commission_periods`), nunca asumir mes
calendario ni construir el rango en el cliente. Detalle en `CLAUDE.md`.

## 📋 Descripción

**My Wellness Hub** es una plataforma integral de e-commerce para **Tonic Life**, empresa MLM especializada en suplementos naturales de alta calidad desde 1996. El sistema combina:

- 🧪 **Health Quiz personalizado** con recomendaciones basadas en perfil de bienestar
- 🌳 **Red de distribuidores multinivel** con genealogía, comisiones y CRM integrado
- 🛒 **E-commerce completo** con suscripciones, bundles y checkout simplificado
- 📊 **Panel administrativo** para gestión de productos, pedidos y distribuidores
- 🎯 **Gamificación** con Daily Habit Tracker y sistema de reconocimientos
- 👥 **Comunidad activa** con testimonios, historias de éxito y desafíos grupales

### Filosofía del Proyecto

**"Made Simple"** - Todo debe ser fácil de entender, iniciar y vivir. Inspirado en marcas como AG1, Seed y Athletic Greens, priorizamos una experiencia moderna, clean y accesible.

## 🚀 Quick Start

### Prerequisitos

- Node.js 18+
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd toniclife-next

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Comandos Disponibles

```bash
npm run dev      # Servidor de desarrollo con Turbopack
npm run build    # Build de producción (genera 72 rutas)
npm run start    # Servidor de producción
npm run lint     # Linting con ESLint
```

## 🏗️ Arquitectura

### Stack Tecnológico

| Categoría | Tecnología | Versión |
|-----------|-----------|---------|
| Framework | Next.js | 16.0.4 |
| UI Library | React | 19.2.0 |
| Lenguaje | TypeScript | 5.9.3 |
| Styling | Tailwind CSS | 4.1.17 |
| Icons | Heroicons | 2.2.0 |
| Notifications | Sonner | 2.0.7 |
| HTTP Client | Axios | 1.13.2 |
| Animations | Canvas Confetti | 1.9.4 |

### Estructura del Proyecto

```
toniclife-next/
├── src/
│   ├── app/                    # Next.js App Router (72 rutas)
│   │   ├── (public)/          # Landing, Quiz, Productos
│   │   ├── cuenta/            # Portal del cliente
│   │   ├── distribuidor/      # Portal distribuidor (24 páginas)
│   │   ├── admin/             # Panel administrativo
│   │   └── ...
│   ├── components/
│   │   ├── ui/                # Componentes base (Button, Card, Badge)
│   │   ├── layout/            # Header, Footer
│   │   ├── landing/           # Secciones del homepage
│   │   ├── quiz/              # Health Quiz flow
│   │   ├── products/          # Grids, filtros, cards
│   │   └── cart/              # Carrito de compras
│   └── types/
│       └── index.ts           # Definiciones TypeScript centrales
├── public/
│   └── images/                # Logos y assets
├── CONSIDERACIONES.md         # 📖 Consideraciones críticas (LECTURA OBLIGATORIA)
├── PLAN_DE_DESARROLLO_MOCKUPS.md  # 📋 Roadmap completo
└── CLAUDE.md                  # 🤖 Guía para Claude Code
```

## 🎯 Características Principales

### 1. Health Quiz Personalizado

Sistema de 10 preguntas que evalúa:
- Nivel de energía
- Salud digestiva
- Estado emocional y estrés
- Metas de bienestar (detox, energía, belleza, etc.)
- Necesidades hormonales (según género)

**Output**: Recomendación personalizada de productos + bundle optimizado

### 2. Sistema Multinivel (MLM)

#### Roles de Usuario
- `customer` - Cliente final
- `distributor` - Miembro de la red MLM (Bronze → Silver → Gold → Diamond)
- `admin` - Administrador del sistema
- `support` - Soporte al cliente
- `hr` - Recursos humanos

#### Portal del Distribuidor (24 páginas)
- Dashboard con métricas de ventas y comisiones
- Árbol genealógico visual (5 niveles de profundidad)
- CRM interno para gestión de clientes
- Generador de links personalizados + QR codes
- Biblioteca de materiales de marketing
- Centro de capacitación con cursos y certificaciones
- Calculadora de comisiones y proyecciones

### 3. E-commerce Completo

- Catálogo de 50+ productos con filtros avanzados
- Carrito con cupones de descuento
- Checkout en 3 pasos (Envío → Pago → Confirmación)
- Sistema de suscripciones mensuales
- Wishlist compartible (WhatsApp, Email, Link)
- Comparador de productos (hasta 4 simultáneos)
- Sistema de reviews con calificaciones

### 4. Gamificación y Comunidad

- Daily Habit Tracker (hidratación, suplementación, ejercicio, sueño)
- Sistema de badges y reconocimientos
- Desafíos grupales (Reto 90 Días, Detox Challenge, 10K Pasos)
- Testimonios verificados con antes/después
- Historias de éxito de distribuidores
- Galería de eventos internacionales

### 5. Panel Administrativo

- Dashboard con KPIs y métricas clave
- CRUD completo de productos con SEO
- Gestión de pedidos con estados y tracking
- Administración de usuarios y distribuidores
- Sistema de cupones y promociones
- Gestión de banners del sitio

## 📊 Estado del Proyecto

### Progreso General: 54% (65 de ~120 pantallas)

| Fase | Estado | Pantallas | Descripción |
|------|--------|-----------|-------------|
| Fase 0 | ✅ 100% | - | Fundación (componentes base, tipos, layout) |
| Fase 1 | ✅ 100% | 18 | E-commerce completo |
| Fase 2 | ✅ 100% | 24 | Portal distribuidores |
| Fase 3 | ⏸️ 0% | 0 | Daily Habit Tracker |
| Fase 4 | ✅ 85% | 5/6 | Comunidad y contenido |
| Fase 5 | ✅ 100% | 6 | Contenido educativo (blog, recetas, videos) |
| Fase 6 | ✅ 100% | 11 | Páginas institucionales |
| Fase 7 | ⚠️ 60% | 6/10 | Panel administrativo |
| Fase 8 | ✅ 100% | 5 | Funcionalidades interactivas avanzadas |

**Total de rutas implementadas**: 72 rutas

Ver [PLAN_DE_DESARROLLO_MOCKUPS.md](PLAN_DE_DESARROLLO_MOCKUPS.md) para detalles completos.

## 🎨 Guía de Diseño

### Colores de Marca

```css
--primary-blue: #003B7A;    /* Headers, elementos corporativos */
--accent-green: #7AB82E;    /* CTAs, highlights */
```

### Tipografía

- **Primary**: Geist Sans (títulos y texto general)
- **Monospace**: Geist Mono (código y datos técnicos)

### Principios de Diseño

1. **Mobile First** - Responsive en todos los dispositivos
2. **Simple y Clean** - Estética minimalista inspirada en AG1/Seed
3. **White Space Generoso** - Respiración visual
4. **Microinteracciones** - Animaciones sutiles en hover/click
5. **Feedback Inmediato** - Toast notifications para todas las acciones

## 📚 Documentación Adicional

### Documentos Críticos (LECTURA OBLIGATORIA)

1. **[CONSIDERACIONES.md](CONSIDERACIONES.md)** - 20 consideraciones fundamentales del sistema:
   - Modelo de negocio MLM
   - Lógica del Health Quiz
   - Sistema multi-rol
   - Compliance regulatorio (FDA, COFEPRIS, DSA, FTC)
   - Escalabilidad (10,000+ distribuidores, 100,000+ clientes)
   - Integraciones necesarias (Stripe, WhatsApp, Email, SMS)

2. **[PLAN_DE_DESARROLLO_MOCKUPS.md](PLAN_DE_DESARROLLO_MOCKUPS.md)** - Roadmap completo:
   - Estado de las 8 fases
   - Métricas de progreso
   - Priorización de features
   - Estimación de tiempos

3. **[CLAUDE.md](CLAUDE.md)** - Guía técnica para desarrollo:
   - Arquitectura del sistema
   - Patrones de código
   - Comandos de desarrollo
   - Restricciones actuales

## 🔒 Compliance y Regulaciones

El sistema cumple con:

- **FDA** (Food and Drug Administration) - USA
- **COFEPRIS** (Comisión Federal para la Protección contra Riesgos Sanitarios) - México
- **DSA** (Direct Selling Association) - Código de ética MLM
- **FTC** (Federal Trade Commission) - Publicidad y testimonios
- **BBB A+ Rating** - Better Business Bureau

### Disclaimers Requeridos

- "Los resultados individuales pueden variar"
- "Consultar con médico antes de usar"
- "No diagnostica, trata o cura enfermedades"
- "Distribuidores son contratistas independientes"

## 🚧 Estado Actual

### ✅ Funcional

- Todos los mockups de UI (72 rutas)
- Navegación completa
- Componentes reutilizables
- Sistema de tipos TypeScript
- Diseño responsive mobile-first

### ⚠️ Mock Data (Sin Backend)

- Productos (20+ mockups)
- Usuarios y distribuidores
- Pedidos y comisiones
- Quiz y recomendaciones
- Reviews y testimonios

### 🔜 Pendientes

- Integración con backend
- Autenticación real (JWT/OAuth)
- Procesamiento de pagos (Stripe)
- Daily Habit Tracker (Fase 3)
- Completar panel admin (Fase 7)
- Sistema de i18n (Inglés/Español)

## 🛠️ Para Desarrolladores

### Agregar una Nueva Página

```typescript
// src/app/nueva-pagina/page.tsx
'use client'; // Si usa hooks o interactividad

import { Button } from '@/components/ui';

export default function NuevaPagina() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900">Nueva Página</h1>
      {/* Tu contenido aquí */}
    </div>
  );
}
```

### Usar Tipos TypeScript

```typescript
import { Product, User, QuizResult } from '@/types';

const product: Product = {
  id: '1',
  name: 'Producto',
  slug: 'producto',
  // ... más propiedades
};
```

### Notificaciones Toast

```typescript
import { toast } from 'sonner';

toast.success('¡Operación exitosa!');
toast.error('Ocurrió un error');
toast.info('Información importante');
```

## 🤝 Contribuir

1. Leer [CONSIDERACIONES.md](CONSIDERACIONES.md) antes de cualquier cambio
2. Seguir la guía de estilo de [CLAUDE.md](CLAUDE.md)
3. Mantener filosofía "Made Simple"
4. Actualizar [PLAN_DE_DESARROLLO_MOCKUPS.md](PLAN_DE_DESARROLLO_MOCKUPS.md) con cambios

## 📞 Contacto y Soporte

- **Desarrollador**: Ing. Diego Eduardo Ramírez Martínez
- **Proyecto**: My Wellness Hub by Tonic Life
- **Versión**: 2.0.0
- **Última actualización**: Enero 2025

## 📄 Licencia

ISC License - Copyright (c) 2025 Tonic Life

---

**Made with 💚 for Wellness**
