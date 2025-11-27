# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**My Wellness Hub by Tonic Life** - A comprehensive MLM (Multi-Level Marketing) e-commerce platform for natural wellness supplements with personalized Health Quiz recommendations, distributor network management, and community features.

**Philosophy**: "Made Simple" - Everything must be easy to understand, start, and live with.

## Critical Documentation

**MUST READ BEFORE ANY DEVELOPMENT**:
- [CONSIDERACIONES.md](CONSIDERACIONES.md) - 20 fundamental considerations including MLM business model, multi-role permissions, Health Quiz logic, gamification, compliance (FDA, COFEPRIS, DSA, FTC), and scalability requirements
- [PLAN_DE_DESARROLLO_MOCKUPS.md](PLAN_DE_DESARROLLO_MOCKUPS.md) - Complete development roadmap with 8 phases, current status (72 routes, 54% complete), and future implementation priorities

## Build & Development Commands

```bash
# Development server with Turbopack
npm run dev

# Production build (generates 72 routes)
npm run build

# Production server
npm start

# Linting
npm run lint
```

## Tech Stack

- **Framework**: Next.js 16.0.4 (App Router with Turbopack)
- **React**: 19.2.0
- **TypeScript**: 5.9.3
- **Styling**: Tailwind CSS 4.1.17
- **Icons**: Heroicons 2.2.0
- **Notifications**: Sonner 2.0.7
- **HTTP Client**: Axios 1.13.2

## Architecture & Code Organization

### Multi-Role System Architecture

The system supports 7 user roles with distinct dashboards and permissions:
- `customer` - Regular buyers
- `distributor` - MLM network members (Bronze → Silver → Gold → Diamond ranks)
- `admin` - Full system management
- `support` - Customer service access
- `hr` - Distributor management
- Additional roles defined in types but not fully implemented

**Critical**: All user-facing features must respect role-based permissions defined in `/src/types/index.ts`.

### App Router Structure

```
/src/app/
├── (public)/              # Landing, Quiz, Products, Checkout
├── /cuenta/               # Customer account pages
├── /distribuidor/         # Distributor portal (24 pages)
├── /admin/                # Admin panel
├── /productos/[slug]/     # Dynamic product pages
│   └── /reviews/          # Product reviews system
└── /blog/, /recetas/, etc.# Content pages
```

**Route Count**: 72 routes total (see build output for complete list)

### Component Organization

```
/src/components/
├── ui/                    # Reusable UI primitives (Button, Card, Badge, Input)
├── layout/                # Header, Footer (with nested navigation)
├── landing/               # Homepage sections (Hero, Featured, Testimonials, Quiz CTA)
├── quiz/                  # Health Quiz flow components
├── products/              # Product grids, filters, cards
└── cart/                  # Shopping cart components
```

**Pattern**: All interactive components use `'use client'` directive. Server components by default.

### Type System

Central type definitions in `/src/types/index.ts`:
- `Product` - Full product schema with benefits, usage, ingredients, combinations
- `QuizQuestion`, `QuizAnswer`, `QuizResult` - Health Quiz flow types
- `User`, `Distributor` - Multi-role user types with MLM hierarchy
- `Cart`, `Order`, `OrderStatus` - E-commerce flow
- `DailyHabit`, `SupplementLog` - Gamification tracker types

**Important**: `ProductCategory` and `WellnessGoal` types drive the Health Quiz recommendation engine.

### Health Quiz Logic

The quiz is a 10-question flow with conditional branching:
1. Question 1 determines gender
2. Gender determines Question 7 path:
   - Female → Question 7A (hormonal health)
   - Male → Question 7B (masculine health)
3. Final question determines `WellnessGoal`
4. Goal maps to specific product bundles (see CONSIDERACIONES.md §5)

**Data Flow**: QuizAnswer[] → HealthProfile → WellnessGoal → ProductBundle recommendation

### MLM/Distributor System

Key distributor features (all in `/distribuidor/`):
- Genealogy tree visualization (`/red`)
- Commission tracking and calculations (`/comisiones`)
- Personal link/QR code generation (`/enlaces`)
- CRM for client management (`/clientes`)
- Marketing materials library (`/materiales`)
- Training center (`/capacitacion`)

**Critical**: Distributor rank (`bronze|silver|gold|diamond`) affects commission calculations and available features.

### Mock Data Strategy

Currently **all data is mocked** - no backend integration yet:
- Products: ~20 mock products in various files
- Quiz: Mock questions in quiz components
- Users/Distributors: Mock data in distributor pages
- Orders: Mock order history

**When integrating backend**: Replace mock data imports with API calls using axios. All endpoints should follow patterns in CONSIDERACIONES.md §17.

## Styling & Design System

### Brand Colors
- Primary Blue: `#003B7A` (corporate, headers)
- Accent Green: `#7AB82E` (CTAs, highlights)
- Tailwind config: Uses these as custom colors

### Typography
- Primary: Geist Sans (`--font-geist-sans`)
- Monospace: Geist Mono (`--font-geist-mono`)

### Design Principles
- Mobile-first responsive design
- Clean, minimal aesthetic (inspiration: AG1, Seed, Athletic Greens)
- Generous white space
- Subtle animations on hover/interactions

### Toast Notifications
Use `sonner` for all user feedback:
```typescript
import { toast } from 'sonner';
toast.success('Message here');
toast.error('Error message');
```

## Development Patterns

### Client Components
Mark components as client-side when they use:
- `useState`, `useEffect`, or other React hooks
- Browser APIs (window, localStorage)
- Event handlers (onClick, onChange)

```typescript
'use client';
import { useState } from 'react';
```

### Path Aliases
Use `@/*` for all imports from src:
```typescript
import { Button } from '@/components/ui';
import { Product } from '@/types';
```

### Dynamic Routes
Product detail pages use slug-based routing:
```
/productos/[slug]/page.tsx
/productos/[slug]/reviews/page.tsx
```

Reviews are a separate route, not a tab within product detail.

## Current Phase Status

**Phase 0-2, 4-6, 8**: ✅ Fully completed
**Phase 3**: ⏸️ Not implemented (Daily Habit Tracker)
**Phase 7**: ⚠️ 60% complete (Admin panel partially done)

Next priorities:
1. Complete Phase 7 admin features (categories, distributor detail, commission admin)
2. Implement Phase 3 habit tracker with gamification
3. Backend integration preparation

## Known Constraints

- **No tests**: Test infrastructure not set up
- **No backend**: All API calls currently mocked
- **No authentication**: Login/register are UI mockups only
- **No payment processing**: Stripe integration is mocked
- **No i18n**: Spanish only (English planned for Phase 2+)
- **SEO warnings**: metadataBase not configured (development only)

## Compliance & Regulations

Any health claims or product descriptions must comply with:
- FDA regulations (USA)
- COFEPRIS (Mexico)
- DSA Code of Ethics (MLM industry)
- FTC Guidelines (testimonials and advertising)

**Disclaimers required**:
- "Results may vary"
- "Consult physician before use"
- "Does not diagnose, treat, or cure diseases"
- "Distributors are independent contractors"

## Multi-Language Support (Future)

System is prepared for English/Spanish:
- All user-facing strings should be extractable
- Current default: Spanish (`lang="es"` in layout)
- Future: i18n library integration needed

## Important File Locations

- Type definitions: `/src/types/index.ts`
- Global styles: `/src/app/globals.css`
- UI components: `/src/components/ui/`
- Layout components: `/src/components/layout/`
- Public assets: `/public/images/` (logos: logo.png, logo-white.png, logo-icon.png, favicon.ico)

## Notes on This Codebase

- **All pages are mockups**: Functional UI without real data persistence
- **72 routes implemented**: See build output for complete list
- **Distributor portal is most complex**: 24 pages with CRM, genealogy, commissions
- **Quiz is the conversion funnel**: Drives product recommendations and distributor attribution
- **Mobile-first**: Responsive design is critical (majority of traffic expected from mobile)
