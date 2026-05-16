# toniclife-next — Contexto del Frontend

> Este archivo complementa `../CLAUDE.md` (raíz del workspace) con reglas y
> detalles técnicos específicos del frontend. En caso de contradicción,
> el más específico (este) gana sobre temas de stack; las advertencias
> críticas del raíz son inmutables.

---

## 🧱 Stack técnico

- **Framework:** Next.js 16.1.6 (App Router, Turbopack en dev)
- **Lenguaje:** TypeScript
- **React:** 19.2.0
- **Estilos:** Tailwind CSS 4.1.17 (sintaxis v4 — usa `@tailwindcss/postcss`,
  NO hay `tailwind.config.ts` tradicional)
- **Componentes base:** Radix UI (primitivos) + DS propio en `src/components/ui/`
- **Utilidades de UI:** `clsx`, `tailwind-merge` (combinados en helper `cn`),
  `lucide-react` + `@heroicons/react` (iconos), `sonner` (toasts)
- **Fetching/server state:** `@tanstack/react-query` 5.90.16 + devtools
- **Cliente HTTP:** `axios` 1.13.x con interceptores (ver sección abajo)
- **Estado global UI:** Zustand 5 + Redux Toolkit (coexisten, ver deuda técnica)
- **Forms:** `react-hook-form` + `zod` (vía `@hookform/resolvers`)
- **Deploy:** Vercel (output `standalone`, `@vercel/analytics` activos)
- **Pagos:** `@stripe/stripe-js` + `@stripe/react-stripe-js`
- **Extras notables:** `@xyflow/react` (visualización de red MLM), `jspdf`
  (exportes), `canvas-confetti`, `date-fns`.

> ⚠️ `class-variance-authority` está en `package.json` pero **NO se usa**
> actualmente en los componentes del DS. Ver sección DS propio abajo.

---

## 🚨 Regla innegociable de UI

### ❌ NO uses `npx shadcn add <componente>`

El proyecto usa un **DS propio** en `src/components/ui/`, NO shadcn/ui CLI.
- No existe `components.json` en la raíz.
- Los componentes están en **PascalCase** (`Button.tsx`, `Card.tsx`,
  `Input.tsx`, `Badge.tsx`, `DataTable.tsx`, `SearchableSelect.tsx`,
  `FileUpload.tsx`).
- Si ejecutas `npx shadcn add button`, te genera un `button.tsx` en
  lowercase que convive con `Button.tsx` y rompe imports existentes.

**Patrón para agregar un componente nuevo al DS:**
1. Ubica un componente similar existente (ej. `Button.tsx`).
2. Copia su estructura: `forwardRef` + tipos literales (`'primary' | 'secondary' | ...`)
   + `Record<Variant, string>` para estilos + `cn(...)` para combinar clases.
3. Mantén PascalCase en el nombre de archivo y `export const ComponentName`.
4. Reexporta desde `src/components/ui/index.ts`.

---

## 🎨 Brand

- **Primary (Dark Teal):** `#3E667D`
- **Secondary (Sky Blue):** `#C8DDF2`
- Paleta derivada usada en variantes de Button: `#2f5165` (teal oscuro),
  `#a7c1e2` y `#8fb3d9` (azules secundarios), `#abc9ba`/`#96b8a6` (success).
- Logo: SVG en `public/`, variantes (full color, solid green icon, white,
  circle-white).

**Patrón de headers de admin pages (real, tomado de `admin/productos/page.tsx`):**

```tsx
<div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
  <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <div className="flex items-center gap-3 mb-2">
      <ShoppingBagIcon className="h-9 w-9" />
      <h1 className="text-3xl font-bold sm:text-4xl">Gestión de Productos</h1>
    </div>
    <p className="text-base text-white/80 sm:text-lg">Subtítulo</p>
  </div>
</div>
```

---

## 🌐 Cliente HTTP y autenticación

### `src/lib/axios.ts` — configuración real

```ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});
```

**Import correcto:** `import api from '@/lib/axios';` (default export).

**Request interceptor:** inyecta `Authorization: Bearer <accessToken>` leyendo
el token desde `localStorage` o `sessionStorage` (lo que exista primero).

**Response interceptor — flujo de refresh:**

1. Si la URL matchea un endpoint de auth (`/auth/login`, `/auth/register`,
   `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`,
   `/auth/refresh`, `/auth/link-email`, `/auth/verify-link-email`) → NO
   intenta refresh, propaga el error.
2. Si la URL matchea un endpoint público (`/cart`, `/checkout`, `/products`,
   `/categories`, `/quiz`) → propaga el error sin redirigir a login.
3. Si recibe 401 en cualquier otro endpoint y no está marcado `_retry`:
   - Si ya hay un refresh en vuelo, encola el request.
   - Si no: llama `POST /auth/refresh` con el `refreshToken`, actualiza
     tokens y cookies, reintenta el request original.
4. Si el refresh falla: limpia `localStorage` + `sessionStorage` +
   cookies (`accessToken`, `authRole`) y redirige a `/login` (salvo que ya
   esté ahí).

**API base:** `http://localhost:3001/api/v1` (dev) / variable
`NEXT_PUBLIC_API_URL` apunta a Railway en producción y staging.

### Autenticación — cómo se guarda y lee el JWT

**Almacenamiento dual según `rememberMe`:**
- Si `localStorage.getItem('rememberMe') === '1'` → tokens van a `localStorage`
  (persisten entre cierres de navegador).
- Si no → tokens van a `sessionStorage` (se limpian al cerrar la pestaña).
- La lectura (`getToken`) probará primero `localStorage`, luego `sessionStorage`.

**Claves usadas:**
- `accessToken` — JWT de acceso.
- `refreshToken` — JWT de refresh.
- `rememberMe` — flag `'1'` / ausente.
- `user` — payload del usuario serializado.

**Cookies paralelas:** para que el middleware de Next pueda hacer routing
según rol sin leer storage, el axios también setea:
- `accessToken=1; path=/; max-age=30d; SameSite=Lax` (solo presencia, no el token).
- `authRole=<role>; path=/; max-age=30d; SameSite=Lax` (para guards de rutas).

Al fallar el refresh, ambas cookies se limpian (`max-age=0`).

**Estado de auth en React:** el `authSlice` de Redux mantiene
`{ user, isAuthenticated, isLoading, isInitialized, error, emailLinkRequired }`
y usa `createAsyncThunk` para login/register/refresh. Hay overlap con React
Query aquí — documentado como deuda técnica.

---

## 📡 Patrón de servicios (clase-singleton)

Ubicación: `src/services/`. Patrón confirmado en `products.service.ts:28`:

```ts
import api from '@/lib/axios';
import type { Product, ProductQueryParams, ProductListResponse } from '@/types/product';

class ProductsService {
  async getProducts(params?: ProductQueryParams): Promise<ProductListResponse> {
    const response = await api.get<ProductListResponse>('/products', { params });
    return response.data;
  }

  async getProductById(id: string): Promise<Product> {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data;
  }

  // ... create, update, delete, byCode, bySlug, etc.
}

export const productsService = new ProductsService();
```

**Reglas:**
- Un servicio por recurso del API.
- Clase con métodos públicos, exportada como **instancia singleton**
  (`export const xxxService = new XxxService();`).
- Tipos fuertes en todos los métodos (`Promise<Product[]>`, nunca `any`).
- NO incluyas lógica de caché aquí — eso va en los hooks de React Query.

**⚠️ Inconsistencia de naming heredada:** la mayoría de los 30 archivos de
servicios siguen el patrón `<recurso>.service.ts`
(`products.service.ts`, `users.service.ts`, `orders.service.ts`, etc.),
pero **5 archivos legados** usan `<recurso>Api.ts`:
- `auditApi.ts`
- `commissionsApi.ts`
- `distributorApi.ts`
- `networkApi.ts`
- `securityApi.ts`

Para servicios nuevos usa siempre `.service.ts`. Renombrar los 5 legados
es deuda técnica de refactor menor.

---

## 🔄 React Query — patrón de hooks

Todos los hooks de data-fetching siguen el patrón **key factory + hook**.
Ejemplo canónico real tomado de `src/hooks/useProducts.ts`:

```ts
// 1. Key factory
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: ProductQueryParams) => [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  bySlug: (slug: string) => [...productKeys.all, 'slug', slug] as const,
  byCode: (code: string) => [...productKeys.all, 'code', code] as const,
};

// 2. Query hook
export const useProducts = (params: ProductQueryParams = {}) => {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productsService.getProducts(params),
    staleTime: 2 * 60 * 1000, // 2 min
    gcTime: 5 * 60 * 1000,    // 5 min
  });
};

// 3. Mutation hook con invalidación (real, de useProducts.ts:298)
export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateProductDto) => productsService.createProduct(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
};

// 4. Mutation que invalida lista + detalle (real, de useProducts.ts:312)
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProductDto }) =>
      productsService.updateProduct(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
};
```

**Reglas:**
- Cada entidad tiene su propio hook (`useProducts`, `useUsers`, `useOrders`,
  `usePos`, `useInventory`, `useCommissions`, `useTaxRules`, `useQuiz`,
  `useStates`, etc.). Hay 15+ hooks con este patrón.
- Key factory siempre en el mismo archivo del hook, exportado.
- `staleTime` y `gcTime` explícitos por hook (no dependas del default).
- Mutations invalidan queries relevantes en `onSuccess`.
- **Feedback al usuario (toasts):** la convención dominante es llamar
  `toast.success(...)` / `toast.error(...)` **desde el componente** tras
  `mutate()` o `mutateAsync()`, no dentro del hook. Algunos hooks viejos
  sí ponen toasts en `onSuccess` — no homogeneizar sin plan explícito.
- Para paginación infinita existe `useInfiniteQuery` (ver `useInfiniteProducts`
  en `useProducts.ts:68`).

---

## 🎯 Patrón de páginas de admin

Estructura confirmada en `src/app/admin/productos/page.tsx`:

```tsx
'use client';
import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui';
import { toast } from 'sonner';
import { useProducts, useDeleteProduct } from '@/hooks/useProducts';
import { PermissionGuard } from '@/components/auth';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';

export default function ProductosPage() {
  return (
    <Suspense fallback={<ProductosSkeleton />}>
      <ProductosContent />
    </Suspense>
  );
}

function ProductosContent() {
  const { data, isLoading } = useProducts();
  // ...
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      {/* Header con gradient teal → azul */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBagIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">Gestión de Productos</h1>
          </div>
          <p className="text-base text-white/80 sm:text-lg">Subtítulo</p>
        </div>
      </div>

      {/* Contenido en Cards */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="p-6">
            <DataTable columns={cols} data={rows} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**Checklist para una página admin nueva:**
- [ ] `'use client'` al inicio.
- [ ] `Suspense` con un skeleton dedicado.
- [ ] Header con `bg-gradient-to-r from-[#3E667D] to-[#0A4B94]` + icono heroicon + título `text-3xl font-bold`.
- [ ] Contenido envuelto en `Card` / `CardContent`.
- [ ] Data con hooks de React Query (no fetch manual).
- [ ] Toasts con `import { toast } from 'sonner';`.
- [ ] `PermissionGuard` en acciones que requieran rol específico.

---

## 🗃️ Estado global — situación actual

### React Query
- **Responsabilidad:** todo el server state (listas, detalles, caches de API).
- **Es la fuente de verdad** para cualquier dato que venga del backend.
- **Ubicación:** `src/hooks/*.ts`.

### Zustand
- **Ubicación:** `src/stores/` (carpeta plural — distinta de `src/store/` de Redux).
- **Stores actuales (1):**
  - `pos-cart.store.ts` — estado del carrito del POS con `persist` middleware.
    Maneja items, totales, descuentos, flags `requiresInvoice`, `setCustomer`,
    `setPublicPrice`, `refreshItemPrices`.
- **Uso recomendado:** UI state puro y carritos/wizards que no viven en el
  servidor. Persistencia opcional con middleware `persist`.

### Redux Toolkit
- **Ubicación:** `src/store/` (singular) — `store.ts`, `hooks.ts`,
  `index.ts`, y 3 slices en `src/store/slices/`.
- **Slices actuales (3):**
  - `authSlice.ts` — `{ user, isAuthenticated, isLoading, isInitialized,
    error, emailLinkRequired }`. Usa `createAsyncThunk` para `initializeAuth`,
    login/register/refresh. **Overlap con React Query** (manejo de server-state
    de auth).
  - `uiSlice.ts` — sidebar (open/collapsed), theme, notifications, modalOpen,
    isLoading global. **UI state puro, sin overlap.**
  - `customersSlice.ts` — lista de clientes, paginación, filtros, selected
    customer. **Overlap directo con React Query** — duplica caché de datos
    del backend.
- **⚠️ Deuda técnica:** Redux es previo a la adopción de React Query +
  Zustand. Hay overlap significativo en `authSlice` y `customersSlice`.
  **Sesión dedicada pendiente** para migrar esos a RQ y dejar Redux solo
  para `uiSlice` (o migrar a Zustand completo).

**Regla mientras no se resuelva:**
- Para **datos nuevos del backend** → React Query.
- Para **UI state nuevo** → Zustand (en `src/stores/`).
- **NO agregar slices nuevos a Redux.** Si modificas uno existente, explica
  en el commit por qué no migra a Zustand/RQ.

---

## 🧩 DS propio — inventario real

Ubicación: `src/components/ui/`. Archivos en PascalCase.

| Archivo | Tipo | Notas |
|---------|------|-------|
| `Badge.tsx` | Tag de estado | variantes de color |
| `Button.tsx` | Botón | 7 variants (`primary/secondary/outline/ghost/danger/link/success`), 5 sizes (`sm/md/lg/xl/icon`), `isLoading`, `leftIcon`, `rightIcon`, `fullWidth` |
| `Card.tsx` | Contenedor | Card + CardHeader/Content/Footer |
| `DataTable.tsx` | Tabla genérica | con sort/filter/pagination; reexporta `DataTablePagination`, `DataTableColumn` |
| `FileUpload.tsx` | Upload | drag & drop + preview |
| `Input.tsx` | Input | con label/error/helper |
| `SearchableSelect.tsx` | Select con búsqueda | sobre Radix Popover |
| `index.ts` | Barrel | reexporta los anteriores |

**Patrón real (NO usa `cva`):**
```ts
// Button.tsx usa tipos literales + Record + cn
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link' | 'success';
const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[#3E667D] hover:bg-[#2f5165] text-white shadow-md hover:shadow-lg',
  secondary: '...',
  // ...
};
// Luego:
className={cn('base-classes', variantStyles[variant], sizeStyles[size], className)}
```

**NO usar `cva`** en el DS por ahora (aunque esté en `package.json`) —
mantén la consistencia con el resto de los componentes. Si quieres introducir
`cva`, hazlo como refactor explícito y coordinado, no en un componente nuevo.

**Componentes Radix usados directamente** (sin wrapper propio en `ui/`):
Dialog, Dropdown, Popover, Tabs, Tooltip, Scroll-area, Checkbox, Switch,
Toast, Accordion, Avatar, Label, Separator, Select. Si los necesitas,
consúmelos desde `@radix-ui/react-*` directamente — NO hay envoltorio en `ui/`.

---

## 📢 Toasts y feedback de UI

- Librería: `sonner`.
- Importación: `import { toast } from 'sonner';`
- Uso:
  - `toast.success('Mensaje')` — operación exitosa
  - `toast.error('Mensaje')` — error
  - `toast.loading(...)` + `toast.dismiss(...)` — para operaciones largas
- El `<Toaster />` se monta una sola vez en el layout raíz.
- Convención actual: los toasts se disparan desde el **componente**, tras
  llamar `mutate()` en un hook de React Query (no dentro del `onSuccess`
  del hook, salvo en hooks legados).

---

## 📂 Estructura de carpetas

```
src/
├── app/                    # App Router (131 rutas page.tsx)
│   ├── admin/              # ~55 páginas: auditoría, comisiones, distribuidores,
│   │                       #            facturación, inventario, logs, mlm,
│   │                       #            notificaciones, pedidos, productos,
│   │                       #            RRHH, seguridad, sucursales, usuarios
│   ├── distribuidor/       # ~24 páginas: portal de distribuidor
│   ├── (public rutas)/     # landing, blog, buscar, carrito, checkout,
│   │                       # contacto, FAQ, productos públicos, etc.
│   ├── layout.tsx
│   └── page.tsx            # ⚠️ En main = landing "coming soon" productiva
├── components/
│   ├── ui/                 # DS propio (PascalCase) — 7 componentes
│   ├── auth/               # PermissionGuard, AuthProvider, etc.
│   ├── layout/             # Header, Footer, Sidebar
│   ├── network/            # UserDetailPanel, NetworkVisualization (xyflow)
│   ├── pos/                # PaymentModal, etc.
│   └── (muchos más por dominio)
├── hooks/                  # React Query hooks + key factories (15+ hooks)
├── lib/
│   ├── axios.ts            # Cliente HTTP con interceptores
│   ├── stripe.ts           # Init Stripe
│   └── utils.ts            # cn() helper, formatters
├── services/               # Clases singleton que hablan con el API (30 archivos)
├── store/                  # 🟥 Redux Toolkit (legacy) — 3 slices
├── stores/                 # 🟩 Zustand — 1 store (pos-cart)
├── providers/              # QueryProvider (React Query), etc.
├── types/                  # Types y DTOs (Product, User, Order, POS, etc.)
├── middleware.ts           # Next middleware: gate de countdown + routing por rol
└── public/                 # Assets: logos SVG, imágenes
```

---

## ⚙️ Comandos frecuentes

```bash
npm install
npm run dev              # Next 16 con Turbopack, puerto 3000
npm run build            # build standalone
npm run start            # correr el build local
npm run lint             # ESLint
```

---

## 🚢 Deploy (Vercel)

- Producción: rama `main` → `toniclife.com` (actualmente sirve la landing
  "coming soon" — ver advertencia en `../CLAUDE.md`).
- Staging: rama `staging` → preview URL de Vercel.
- **Variables requeridas en Vercel:**
  - `NEXT_PUBLIC_API_URL` — URL del backend (Railway prod/staging).
  - `NODE_ENV`.
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
  - `NEXT_PUBLIC_BASE_URL` — para `metadataBase` en `app/layout.tsx`.
    **Pendiente documentar en `.env.example`.**
  - `LAUNCH_DATE` / `NEXT_PUBLIC_LAUNCH_DATE` — countdown gate opcional.
- `vercel.json` NO está en git — config vive en la UI de Vercel.
- Se usa `@vercel/analytics` — el `<Analytics />` está en el layout raíz.
- `next.config.ts` fija `output: 'standalone'` (también listo para Docker
  si alguna vez se mueve).

---

## 📉 Deuda técnica específica del frontend

Ver lista global en `../CLAUDE.md`. Puntos específicos del frontend:

1. **Triple state management** — Redux Toolkit + Zustand + React Query
   coexisten con overlap conocido en `authSlice` y `customersSlice`. Sesión
   dedicada pendiente para mapear responsabilidades y retirar Redux o dejarlo
   solo para UI state global (`uiSlice`).
2. **Conteo de rutas actualizado:** 131 `page.tsx` (el CLAUDE.md viejo
   decía 72).
3. **Landing "coming soon" en `main`** — 5 commits exclusivos que NO deben
   propagarse a staging. Ver advertencia en `../CLAUDE.md`.
4. **Naming inconsistente en `src/services/`**: 5 archivos legados usan
   sufijo `Api.ts` (`auditApi`, `commissionsApi`, `distributorApi`,
   `networkApi`, `securityApi`) en vez de `.service.ts`. Refactor pendiente.
5. **`class-variance-authority` en deps pero sin uso real** — el DS usa
   `Record<Variant, string>` + `cn()`. Decidir: migrar todos a `cva` o
   eliminar la dep.
6. **`NEXT_PUBLIC_BASE_URL`** se usa en `app/layout.tsx` pero no está en
   `.env.example`.
7. **~9 PRs de Dependabot acumulados** en este repo (axios, eslint,
   hook-form, lucide-react, next, react, tailwindcss, tailwindcss/postcss,
   types/node). Revisar en sesión dedicada.
8. **`UserDetailPanel.tsx`** tiene 3 desactivaciones (link sponsor, botón
   "Ver Perfil Completo", sección ventas) heredadas en ambas ramas —
   decisión de mantenerlas por ahora.

---

## 🔒 POS — apertura/cierre de caja REMOVIDOS

**Decisión vigente (mayo 2026):** el POS ya NO tiene UI manual de apertura
ni cierre de sesión de caja. Las sesiones se crean automáticamente al
primer cobro con `opening_amount = 0` y nunca se cierran.

### Estado en Next

- ❌ `SessionManager.tsx` eliminado por completo.
- ❌ Hook `useOpenSession` y `useCloseSession` removidos de `usePos.ts`.
- ❌ Hook `useAvailableRegisters` removido (sólo lo usaba el SessionManager).
- ❌ Tipo `CloseSessionInput` removido.
- ✅ `posService.openSession()` y `posService.getAvailableRegisters()` **se
  mantienen** — uso **interno** únicamente por la función `ensureSession()`
  en [admin/pos/page.tsx](src/app/admin/pos/page.tsx) que auto-abre al
  primer cobro. NO usar para construir UI nueva de apertura manual.
- ✅ Tipo `OpenSessionInput` se mantiene con un comentario explícito sobre
  su uso interno.
- ✅ `CorteDiaModal` (corte del día / reporte de ventas) se mantiene — es
  visualización, NO transacción de cierre.

### Reglas para futuros cambios

Si recibes peticiones tipo:
- "Agregar botón abrir/cerrar caja"
- "Restaurar SessionManager"
- "Mostrar widget de caja abierta con apertura"
- "Permitir cambiar monto de apertura"

→ **confirma explícitamente con el usuario antes de restaurar.** La
decisión es intencional. Si necesitas rotación diaria o reconciliación
automática, implementa cron en el backend (`toniclife-api/src/modules/pos`),
NO UI manual.

Detalle del trade-off de schema y trazabilidad en
`../toniclife-api/CLAUDE.md` sección "Apertura/Cierre de caja — UI REMOVIDA".

---

## 🛑 Zonas de máximo cuidado

Cambios en estas áreas requieren confirmación explícita del usuario:

- **Cualquier página bajo `/admin/facturacion/*`** — emite facturas fiscales
  reales vía Facturama.
- **Cualquier página bajo `/admin/comisiones/*` y `/admin/mlm/*`** —
  afectan cálculos que pagan dinero real a distribuidores.
- **Checkout y carrito** (`app/checkout/*`, `app/carrito/*`) — cobros a
  tarjeta real vía Stripe.
- **Autenticación** (login, logout, refresh, middleware de routing,
  `axios.ts`, `authSlice`) — errores aquí bloquean a todos los usuarios.
- **`app/page.tsx`** en `main` — es la landing "coming soon" productiva.
  NO modificar sin coordinar.
- **`NetworkVisualization` y `UserDetailPanel`** — tocan datos MLM
  sensibles y tienen 3 desactivaciones intencionales vigentes.
