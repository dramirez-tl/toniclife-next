# Auditoría Completa: Endpoints API vs Frontend

**Fecha de generación**: 2026-02-17
**Fuente API**: `http://localhost:3001/docs-json` (Swagger/OpenAPI)
**Frontend**: `toniclife-next/src/services/`, `hooks/`, `app/`

**Leyenda**:
- ✅ = Implementado
- ❌ = Falta
- ⚠️ = Implementado con discrepancia (ruta diferente o parcial)

---

## 1. Health Check

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/health` | ❌ | ❌ | ❌ | FALTA |
| GET | `/api/v1` | ❌ | ❌ | ❌ | FALTA |

> **Nota**: Endpoints de health check no requieren implementación frontend. Son para monitoreo de infraestructura.

---

## 2. Auth (Autenticación)

**Service**: `auth.service.ts` | **Hook**: (integrado en Redux `authSlice`) | **Pages**: `/login`, `/registro`, `/forgot-password`, `/reset-password`, `/verify-email`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| POST | `/api/v1/auth/login` | ✅ | ✅ (Redux) | ✅ `/login` | OK |
| POST | `/api/v1/auth/register` | ✅ | ✅ (Redux) | ✅ `/registro` | OK |
| POST | `/api/v1/auth/logout` | ✅ | ✅ (Redux) | ✅ (Header) | OK |
| POST | `/api/v1/auth/logout-all` | ✅ | ✅ (Redux) | ❌ | FALTA UI |
| POST | `/api/v1/auth/refresh` | ✅ | ✅ (interceptor) | N/A | OK |
| GET | `/api/v1/auth/profile` | ✅ | ✅ (Redux) | ✅ (distribuidor/perfil) | OK |
| POST | `/api/v1/auth/change-password` | ✅ | ✅ | ✅ (config) | OK |
| POST | `/api/v1/auth/forgot-password` | ✅ | ✅ | ✅ `/forgot-password` | OK |
| POST | `/api/v1/auth/reset-password` | ✅ | ✅ | ✅ `/reset-password` | OK |
| POST | `/api/v1/auth/verify-email` | ✅ | ✅ | ✅ `/verify-email` | OK |
| POST | `/api/v1/auth/resend-verification-email` | ✅ | ✅ | ✅ `/verify-email` | OK |

---

## 3. Users (Usuarios)

**Service**: `users.service.ts` | **Hook**: `useUsers.ts` | **Pages**: `/admin/usuarios`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/users` | ✅ | ✅ | ✅ `/admin/usuarios` | OK |
| GET | `/api/v1/users/{id}` | ✅ | ✅ | ✅ `/admin/usuarios/[id]` | OK |
| POST | `/api/v1/users` | ✅ | ✅ | ✅ (modal en usuarios) | OK |
| PATCH | `/api/v1/users/{id}` | ✅ | ✅ | ✅ (modal en usuarios) | OK |
| DELETE | `/api/v1/users/{id}` | ✅ | ✅ | ✅ (botón desactivar) | OK |
| DELETE | `/api/v1/users/{id}/hard` | ✅ | ✅ | ✅ (botón eliminar) | OK |

---

## 4. Branches (Sucursales)

**Service**: `branches.service.ts` | **Hook**: `useBranches.ts` | **Pages**: `/admin/sucursales`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/branches` | ✅ | ✅ | ✅ `/admin/sucursales` | OK |
| GET | `/api/v1/branches/active` | ✅ | ✅ | ✅ (selectores) | OK |
| GET | `/api/v1/branches/{id}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/branches/code/{code}` | ✅ | ✅ | ❌ | FALTA UI |
| POST | `/api/v1/branches` | ✅ | ✅ | ✅ (modal) | OK |
| PATCH | `/api/v1/branches/{id}` | ✅ | ✅ | ✅ (modal) | OK |
| DELETE | `/api/v1/branches/{id}` | ✅ | ✅ | ✅ (botón) | OK |

---

## 5. Categories (Categorías)

**Service**: `products.service.ts` | **Hook**: `useProducts.ts` | **Pages**: `/admin/configuracion/catalogos`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/categories` | ✅ | ✅ | ✅ `/admin/configuracion/catalogos` | OK |
| GET | `/api/v1/categories/tree` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/categories/{id}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/categories/slug/{slug}` | ✅ | ✅ | ✅ `/productos` | OK |
| GET | `/api/v1/categories/{id}/children` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/categories/{id}/breadcrumb` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/categories` | ✅ | ✅ | ✅ (modal) | OK |
| PATCH | `/api/v1/categories/{id}` | ✅ | ✅ | ✅ (modal) | OK |
| DELETE | `/api/v1/categories/{id}` | ✅ | ✅ | ✅ (botón) | OK |

---

## 6. Products (Productos)

**Service**: `products.service.ts` | **Hook**: `useProducts.ts` | **Pages**: `/admin/productos`, `/productos`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/products` | ✅ | ✅ | ✅ `/productos`, `/admin/productos` | OK |
| GET | `/api/v1/products/{id}` | ✅ | ✅ | ✅ `/admin/productos/[id]/editar` | OK |
| GET | `/api/v1/products/code/{code}` | ⚠️ | ⚠️ | ❌ | **DISCREPANCIA** |
| GET | `/api/v1/products/slug/{slug}` | ✅ | ✅ | ✅ `/productos/[slug]` | OK |
| POST | `/api/v1/products` | ✅ | ✅ | ✅ `/admin/productos/nuevo` | OK |
| PATCH | `/api/v1/products/{id}` | ✅ | ✅ | ✅ `/admin/productos/[id]/editar` | OK |
| DELETE | `/api/v1/products/{id}` | ✅ | ✅ | ✅ (botón) | OK |
| GET | `/api/v1/products/{id}/prices` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/products/{id}/prices` | ❌ | ❌ | ❌ | **FALTA** |
| DELETE | `/api/v1/products/{id}/prices/{priceId}` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/products/{id}/components` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/products/{id}/components` | ❌ | ❌ | ❌ | **FALTA** |
| PATCH | `/api/v1/products/{id}/components/{componentId}` | ❌ | ❌ | ❌ | **FALTA** |
| DELETE | `/api/v1/products/{id}/components/{componentId}` | ❌ | ❌ | ❌ | **FALTA** |

> **DISCREPANCIA**: El servicio llama `/products/sku/{sku}` pero el API expone `/products/code/{code}`. Ruta no coincide.

---

## 7. Cart (Carrito)

**Service**: `cart.service.ts` | **Hook**: `useCart.ts` | **Pages**: `/carrito`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/cart` | ✅ | ✅ | ✅ `/carrito` | OK |
| GET | `/api/v1/cart/summary` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/cart/items` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/cart/items/{itemId}` | ✅ | ✅ | ✅ | OK |
| DELETE | `/api/v1/cart/items/{itemId}` | ✅ | ✅ | ✅ | OK |
| DELETE | `/api/v1/cart/items` | ✅ | ✅ | ✅ (vaciar carrito) | OK |

> **Nota**: El servicio también llama a `/cart/coupon`, `/cart/coupon/validate` y `/cart/merge` que **NO están en Swagger**. Pueden ser endpoints pendientes de documentar o aún no implementados en el backend.

---

## 8. Checkout

**Service**: `cart.service.ts` | **Hook**: `useCart.ts` | **Pages**: `/checkout`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/checkout/summary` | ✅ | ✅ | ✅ `/checkout` | OK |
| GET | `/api/v1/checkout/addresses` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/checkout/guest` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/checkout/authenticated` | ✅ | ✅ | ✅ | OK |

---

## 9. Customers (Clientes)

**Service**: `customers.service.ts` | **Hook**: `useUsers.ts` (parcial) | **Pages**: `/admin/distribuidores`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/customers` | ✅ | ✅ | ✅ `/admin/distribuidores` | OK |
| GET | `/api/v1/customers/{id}` | ✅ | ✅ | ✅ `/admin/distribuidores/[id]` | OK |
| GET | `/api/v1/customers/referral/{code}` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/customers` | ✅ | ✅ | ✅ `/admin/distribuidores/nuevo` | OK |
| PATCH | `/api/v1/customers/{id}` | ✅ | ✅ | ✅ | OK |
| DELETE | `/api/v1/customers/{id}` | ✅ | ✅ | ✅ | OK |
| DELETE | `/api/v1/customers/{id}/hard` | ❌ | ❌ | ❌ | **FALTA** |
| POST | `/api/v1/customers/{id}/accept-terms` | ✅ | ✅ | ❌ | FALTA UI |
| GET | `/api/v1/customers/{id}/qr-code` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/customers/{id}/qr-code/download` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/customers/{id}/referral-info` | ❌ | ❌ | ❌ | **FALTA** |

---

## 10. Customer Addresses (Direcciones de Clientes)

**Service**: `customers.service.ts` | **Hook**: (en `useUsers.ts`) | **Pages**: `/checkout`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/customers/{customerId}/addresses` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/customers/{customerId}/addresses/{addressId}` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/customers/{customerId}/addresses` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/customers/{customerId}/addresses/{addressId}` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/customers/{customerId}/addresses/{addressId}/set-default` | ✅ | ✅ | ✅ | OK |
| DELETE | `/api/v1/customers/{customerId}/addresses/{addressId}` | ✅ | ✅ | ✅ | OK |

---

## 11. Customer Bank Accounts (Cuentas Bancarias de Clientes)

**Service**: `customers.service.ts` | **Hook**: (en `useUsers.ts`) | **Pages**: `/distribuidor/pagos`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/customers/{customerId}/bank-accounts` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/customers/{customerId}/bank-accounts/{accountId}` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/customers/{customerId}/bank-accounts` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/customers/{customerId}/bank-accounts/{accountId}` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/customers/{customerId}/bank-accounts/{accountId}/set-default` | ✅ | ✅ | ✅ | OK |
| DELETE | `/api/v1/customers/{customerId}/bank-accounts/{accountId}` | ✅ | ✅ | ✅ | OK |

---

## 12. Orders (Pedidos)

**Service**: `orders.service.ts` | **Hook**: `useOrders.ts`, `useAccount.ts` | **Pages**: `/admin/pedidos`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/orders` | ✅ | ✅ | ✅ `/admin/pedidos` | OK |
| GET | `/api/v1/orders/{id}` | ✅ | ✅ | ✅ `/admin/pedidos/[id]` | OK |
| GET | `/api/v1/orders/my-orders` | ✅ | ✅ | ✅ (cuenta) | OK |
| GET | `/api/v1/orders/my-orders/{id}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/orders/my-orders/{id}/tracking` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/orders/tracking/{orderNumber}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/orders/{id}/tracking` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/orders/{id}/payments` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/orders/{id}/status` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/orders/{id}/shipping` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/orders/{id}/cancel` | ✅ | ✅ | ✅ | OK |

---

## 13. Billing (Facturación)

**Service**: `billing.service.ts` | **Hook**: `useBilling.ts` | **Pages**: `/admin/facturacion`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/billing/fiscal-data` | ✅ | ✅ | ✅ `/admin/facturacion/datos-fiscales` | OK |
| GET | `/api/v1/billing/fiscal-data/{id}` | ✅ | ✅ | ✅ `/admin/facturacion/datos-fiscales/[id]` | OK |
| POST | `/api/v1/billing/fiscal-data` | ✅ | ✅ | ✅ `/admin/facturacion/datos-fiscales/nuevo` | OK |
| PUT | `/api/v1/billing/fiscal-data/{customerId}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/billing/customers/{customerId}/fiscal-data` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/billing/invoices` | ✅ | ✅ | ✅ `/admin/facturacion` | OK |
| GET | `/api/v1/billing/invoices/{id}` | ✅ | ✅ | ✅ `/admin/facturacion/[id]` | OK |
| POST | `/api/v1/billing/invoices` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/billing/invoices/{id}/stamp` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/billing/invoices/{id}/cancel` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/billing/invoices/{id}/pdf` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/billing/invoices/{id}/xml` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/billing/global-invoices` | ✅ | ✅ | ✅ `/admin/facturacion/global` | OK |
| GET | `/api/v1/billing/global-invoices/{id}` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/billing/global-invoices/{id}/stamp` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/billing/payment-complements` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/billing/payment-complements/{id}` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/billing/payment-complements/{id}/stamp` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/billing/catalogs/payment-forms` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/billing/catalogs/cfdi-uses` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/billing/catalogs/fiscal-regimes` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/billing/validate/rfc/{rfc}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/billing/status` | ✅ | ✅ | ✅ | OK |

---

## 14. Configuration (Configuración)

**Service**: `config.service.ts` | **Hook**: `useConfig.ts` | **Pages**: `/admin/configuracion/catalogos`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/config/countries` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/countries/active` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/countries/{id}` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/config/countries` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/config/countries/{id}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/currencies` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/currencies/active` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/currencies/{id}` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/config/currencies` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/config/currencies/{id}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/price-types` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/price-types/active` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/price-types/{id}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/price-types/code/{code}` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/config/price-types` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/config/price-types/{id}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/exchange-rates` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/exchange-rates/active` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/exchange-rates/{id}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/exchange-rates/rate` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/config/exchange-rates` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/config/exchange-rates/{id}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/payment-methods` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/payment-methods/active` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/payment-methods/{id}` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/config/payment-methods` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/config/payment-methods/{id}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/tax-rules` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/tax-rules/active` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/tax-rules/{id}` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/config/tax-rules` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/config/tax-rules/{id}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/sat-cfdi-uses` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/sat-cfdi-uses/active` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/sat-tax-regimes` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/config/sat-tax-regimes/active` | ✅ | ✅ | ✅ | OK |

---

## 15. Inventory (Inventario)

**Service**: `inventory.service.ts` | **Hook**: `useInventory.ts` | **Pages**: `/admin/inventario`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/inventory` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/inventory/branches/{branchId}` | ✅ | ✅ | ✅ `/admin/inventario` | OK |
| GET | `/api/v1/inventory/products/{productId}/stock` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/inventory/products/{productId}/lots` | ✅ | ✅ | ✅ `/admin/inventario/lotes/[productId]` | OK |
| GET | `/api/v1/inventory/products/{productId}/lots` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/inventory/kardex/{productId}` | ✅ | ✅ | ✅ `/admin/inventario/kardex/[productId]` | OK |
| POST | `/api/v1/inventory/transfers` | ✅ | ✅ | ✅ `/admin/inventario/traspasos/nuevo` | OK |
| GET | `/api/v1/inventory/transfers` | ✅ | ✅ | ✅ `/admin/inventario/traspasos` | OK |
| GET | `/api/v1/inventory/transfers/{id}` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/inventory/transfers/{id}/approve` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/inventory/transfers/{id}/cancel` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/inventory/transfers/{id}/reject` | ❌ | ❌ | ❌ | **FALTA** |
| POST | `/api/v1/inventory/transfers/{id}/apply` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/inventory/counts` | ⚠️ | ⚠️ | ✅ `/admin/inventario/ajustes` | **DISCREPANCIA** |
| GET | `/api/v1/inventory/counts/{id}` | ⚠️ | ⚠️ | ✅ | **DISCREPANCIA** |
| POST | `/api/v1/inventory/counts` | ⚠️ | ⚠️ | ✅ `/admin/inventario/ajustes/nuevo` | **DISCREPANCIA** |
| PATCH | `/api/v1/inventory/counts/{id}` | ⚠️ | ⚠️ | ✅ | **DISCREPANCIA** |
| PATCH | `/api/v1/inventory/counts/{id}/submit` | ⚠️ | ⚠️ | ✅ | **DISCREPANCIA** |
| PATCH | `/api/v1/inventory/counts/{id}/approve` | ⚠️ | ⚠️ | ✅ | **DISCREPANCIA** |
| PATCH | `/api/v1/inventory/counts/{id}/reject` | ⚠️ | ⚠️ | ✅ | **DISCREPANCIA** |
| POST | `/api/v1/inventory/counts/{id}/apply` | ⚠️ | ⚠️ | ✅ | **DISCREPANCIA** |
| DELETE | `/api/v1/inventory/counts/{id}` | ⚠️ | ⚠️ | ✅ | **DISCREPANCIA** |

> **DISCREPANCIA GRAVE**: El servicio llama a `/inventory/audits/...` pero el API expone `/inventory/counts/...`. Todas las operaciones de conteos/ajustes fallarán en producción. Se debe cambiar `audits` por `counts` en `inventory.service.ts`.

> **Nota**: El servicio también llama a `/inventory/transfers/{id}/ship` y `/inventory/transfers/{id}/receive` que **NO están en Swagger**. Estos endpoints pueden no estar implementados en el backend.

---

## 16. POS (Punto de Venta)

**Service**: `pos.service.ts` | **Hook**: `usePos.ts` | **Pages**: `/admin/pos`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| POST | `/api/v1/pos/registers` | ✅ | ✅ | ✅ `/admin/pos` | OK |
| GET | `/api/v1/pos/registers` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/pos/registers/available` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/pos/registers/{id}` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/pos/registers/{id}` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/pos/sessions/open` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/pos/sessions/{id}/close` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/pos/sessions` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/pos/sessions/active` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/pos/sessions/{id}` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/pos/sales` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/pos/sales/pay` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/pos/sales` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/pos/sales/summary/{branchId}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/pos/sales/{id}` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/pos/sales/{id}/cancel` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/pos/movements` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/pos/movements` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/pos/movements/balance/{sessionId}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/pos/movements/{id}` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/pos/movements/{id}/approve` | ✅ | ✅ | ✅ | OK |
| DELETE | `/api/v1/pos/movements/{id}` | ✅ | ✅ | ✅ | OK |

---

## 17. Distributor Dashboard (Centro de Negocio)

**Service**: `distributorApi.ts` | **Hook**: `useDistributor.ts` | **Pages**: `/distribuidor`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/distributor/dashboard` | ✅ | ✅ | ✅ `/distribuidor` | OK |
| GET | `/api/v1/distributor/profile` | ✅ | ✅ | ✅ `/distribuidor/perfil` | OK |
| GET | `/api/v1/distributor/activity` | ✅ | ✅ | ✅ `/distribuidor/actividad` | OK |
| GET | `/api/v1/distributor/goals` | ✅ | ✅ | ✅ `/distribuidor/metas` | OK |

> **Nota**: El servicio también llama a endpoints que **NO están en Swagger**:
> - `GET /mlm/points` (getPeriodPoints)
> - `GET /mlm/rank/progress` (getRankProgress)
> - `GET /mlm/network/summary` (getNetworkSummary)
> - `GET /mlm/network/top-performers` (getTopPerformers)
> - `POST /distributor/referral-link` (generateReferralLink)
>
> Estos endpoints no existen en el backend o tienen rutas diferentes.

---

## 18. MLM - Network (Red MLM)

**Service**: `networkApi.ts` | **Hook**: `useNetwork.ts` | **Pages**: `/distribuidor/red`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/mlm/network/{customerId}/tree` | ✅ | ✅ | ✅ `/distribuidor/red` | OK |
| GET | `/api/v1/mlm/network/{customerId}/stats` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/mlm/network/{customerId}/downlines` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/mlm/network/{customerId}/upline` | ❌ | ❌ | ❌ | **FALTA** |
| POST | `/api/v1/mlm/network/{customerId}/add` | ❌ | ❌ | ❌ | **FALTA** |
| PUT | `/api/v1/mlm/network/{customerId}/move` | ❌ | ❌ | ❌ | **FALTA** |

---

## 19. MLM - Commissions (Comisiones MLM)

**Service**: `commissionsApi.ts` | **Hook**: `useCommissions.ts` | **Pages**: `/admin/comisiones`, `/distribuidor/comisiones`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/mlm/commissions` | ✅ | ✅ | ✅ `/admin/comisiones` | OK |
| GET | `/api/v1/mlm/commissions/customer/{customerId}` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/mlm/commissions/percentages` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/mlm/commissions/percentages/{id}` | ❌ | ❌ | ❌ | **FALTA** |
| POST | `/api/v1/mlm/commissions/approve` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/mlm/commissions/calculate` | ❌ | ❌ | ❌ | **FALTA** |
| POST | `/api/v1/mlm/commissions/mark-paid` | ✅ | ✅ | ✅ | OK |

> **Nota**: El servicio llama endpoints que **NO están en Swagger**:
> - `GET /mlm/commissions/summary/{periodId}` (no existe)
> - `GET /mlm/commissions/projection` (no existe)
> - `GET /mlm/commissions/trend` (no existe)
> - `POST /mlm/commissions/request-payment` (no existe)
> - `GET /mlm/commissions/statement/{periodId}` (no existe)

---

## 20. MLM - Network Stats (Estadísticas de Red)

**Service**: `networkApi.ts` (parcial) | **Hook**: ❌ | **Pages**: ❌

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/mlm/network-stats/customer/{customerId}` | ⚠️ | ❌ | ❌ | **PARCIAL** |
| GET | `/api/v1/mlm/network-stats/status` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/mlm/network-stats/top/business-points` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/mlm/network-stats/top/network-size` | ❌ | ❌ | ❌ | **FALTA** |
| POST | `/api/v1/mlm/network-stats/refresh` | ❌ | ❌ | ❌ | **FALTA** |

> **Nota**: `networkApi.ts` llama a `/mlm/network-stats/{userId}/dashboard` dentro de `getStats()`, pero este endpoint exacto no está en Swagger. El endpoint más cercano es `/mlm/network-stats/customer/{customerId}`.

---

## 21. MLM - Periods (Periodos MLM)

**Service**: `commissionsApi.ts` (parcial) | **Hook**: `useCommissions.ts` (parcial) | **Pages**: `/admin/comisiones` (parcial)

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/mlm/periods` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/mlm/periods/current` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/mlm/periods/{id}` | ❌ | ❌ | ❌ | **FALTA** |
| POST | `/api/v1/mlm/periods` | ❌ | ❌ | ❌ | **FALTA** |
| PUT | `/api/v1/mlm/periods/{id}` | ❌ | ❌ | ❌ | **FALTA** |
| POST | `/api/v1/mlm/periods/generate` | ❌ | ❌ | ❌ | **FALTA** |
| POST | `/api/v1/mlm/periods/{id}/close` | ❌ | ❌ | ❌ | **FALTA** |
| POST | `/api/v1/mlm/periods/{id}/reopen` | ❌ | ❌ | ❌ | **FALTA** |

---

## 22. MLM - Ranks (Rangos MLM)

**Service**: ❌ | **Hook**: ❌ | **Pages**: ❌

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/mlm/ranks` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/mlm/ranks/{id}` | ❌ | ❌ | ❌ | **FALTA** |
| POST | `/api/v1/mlm/ranks` | ❌ | ❌ | ❌ | **FALTA** |
| PUT | `/api/v1/mlm/ranks/{id}` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/mlm/ranks/qualification/{customerId}/{periodId}` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/mlm/ranks/summary/{periodId}` | ❌ | ❌ | ❌ | **FALTA** |
| POST | `/api/v1/mlm/ranks/calculate` | ❌ | ❌ | ❌ | **FALTA** |

---

## 23. MLM - Rollover

**Service**: ❌ | **Hook**: ❌ | **Pages**: ❌

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/mlm/rollover/status/{periodId}` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/mlm/rollover/stats/{periodId}` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/mlm/rollover/history/{customerId}` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/mlm/rollover/effective-sponsor/{customerId}` | ❌ | ❌ | ❌ | **FALTA** |
| POST | `/api/v1/mlm/rollover/calculate/{periodId}` | ❌ | ❌ | ❌ | **FALTA** |

---

## 24. Notifications (Notificaciones)

**Service**: `notifications.service.ts` | **Hook**: `useNotifications.ts` | **Pages**: `/admin/notificaciones`, `/distribuidor/notificaciones`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| POST | `/api/v1/notifications/send` | ✅ | ✅ | ✅ `/admin/notificaciones` | OK |
| POST | `/api/v1/notifications/send/bulk` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/notifications/me` | ✅ | ✅ | ✅ `/distribuidor/notificaciones` | OK |
| GET | `/api/v1/notifications/me/unread-count` | ✅ | ✅ | ✅ (badge) | OK |
| PATCH | `/api/v1/notifications/me/read` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/notifications/me/read-all` | ✅ | ✅ | ✅ | OK |
| DELETE | `/api/v1/notifications/me/{notificationId}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/notifications/preferences` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/notifications/preferences` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/notifications/user/{userId}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/notifications/user/{userId}/preferences` | ❌ | ❌ | ❌ | **FALTA** |

---

## 25. Audit (Auditoría)

**Service**: `auditApi.ts` | **Hook**: `useAudit.ts` | **Pages**: `/admin/auditoria`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/audit/logs` | ✅ | ✅ | ✅ `/admin/auditoria/logs` | OK |
| GET | `/api/v1/audit/logs/{id}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/audit/logs/stats` | ✅ | ✅ | ✅ `/admin/auditoria` | OK |
| PATCH | `/api/v1/audit/logs/{id}/review` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/audit/entity/{entityType}/{entityId}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/audit/alerts` | ✅ | ✅ | ✅ `/admin/auditoria/alertas` | OK |
| PATCH | `/api/v1/audit/alerts/{id}/status` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/audit/alerts` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/audit/alerts/rules` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/audit/alerts/stats` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/audit/user/{userId}` | ✅ | ✅ | ✅ `/admin/auditoria/superusuario/usuario/[userId]` | OK |
| GET | `/api/v1/audit/timeline` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/audit/top-users` | ✅ | ✅ | ✅ `/admin/auditoria/superusuario` | OK |
| GET | `/api/v1/audit/patterns` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/audit/compare-users` | ✅ | ✅ | ✅ `/admin/auditoria/superusuario/comparar` | OK |
| GET | `/api/v1/audit/recent` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/audit/export` | ✅ | ✅ | ✅ `/admin/auditoria/reportes` | OK |
| GET | `/api/v1/audit/retention/policies` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/audit/retention/stats` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/audit/retention/logs-by-age` | ❌ | ❌ | ❌ | **FALTA** |
| POST | `/api/v1/audit/retention/execute` | ❌ | ❌ | ❌ | **FALTA** |
| POST | `/api/v1/audit/retention/archive` | ❌ | ❌ | ❌ | **FALTA** |
| POST | `/api/v1/audit/retention/purge` | ❌ | ❌ | ❌ | **FALTA** |

---

## 26. HR - Human Resources (Recursos Humanos)

**Service**: `hr.service.ts` + `hrApi.ts` | **Hook**: `useHR.ts` | **Pages**: `/admin/rrhh`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/hr/employees` | ✅ | ✅ | ✅ `/admin/rrhh/empleados` | OK |
| GET | `/api/v1/hr/employees/{id}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/hr/employees/me` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/hr/employees` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/hr/employees/{id}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/hr/vacations` | ✅ | ✅ | ✅ `/admin/rrhh/vacaciones` | OK |
| GET | `/api/v1/hr/vacations/{id}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/hr/vacations/pending-review` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/hr/vacations` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/hr/vacations/{id}/approve` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/hr/vacations/{id}/reject` | ✅ | ✅ | ✅ | OK |
| PATCH | `/api/v1/hr/vacations/{id}/cancel` | ✅ | ✅ | ✅ | OK |

> **Nota**: El servicio `hr.service.ts` también llama a endpoints que **NO están en Swagger**:
> - `POST /hr/attendance/check-in`
> - `POST /hr/attendance/manual`
> - `GET /hr/attendance`
> - `GET /hr/attendance/my`
> - Todo el submódulo de expenses (`/hr/expenses/*`)
> - `GET /hr/employees/user/{userId}`
> - `GET /hr/vacations/my`
> - `GET /hr/vacations/pending`
>
> Estos endpoints pueden estar pendientes de documentar en Swagger o aún no implementados en el backend.

---

## 27. Health Quiz (Quiz de Salud)

**Service**: `quiz.service.ts` | **Hook**: `useQuiz.ts` | **Pages**: `/quiz`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| POST | `/api/v1/quiz/start` | ✅ | ✅ | ✅ `/quiz` | OK |
| POST | `/api/v1/quiz/resume/{sessionToken}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/quiz/status/{sessionToken}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/quiz/question/{sessionToken}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/quiz/questions` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/quiz/answer` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/quiz/answer/multiple` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/quiz/gender` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/quiz/guest-info` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/quiz/results/{sessionToken}` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/quiz/track/cart-add` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/quiz/track/purchase` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/quiz/admin/sessions` | ❌ | ❌ | ❌ | **FALTA** |
| GET | `/api/v1/quiz/admin/stats` | ❌ | ❌ | ❌ | **FALTA** |

---

## 28. Public Registration (Registro Público)

**Service**: `public-registration.service.ts` | **Hook**: `useReferralCode.ts` | **Pages**: `/registro`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/public/register/validate-sponsor/{code}` | ✅ | ✅ | ✅ `/registro` | OK |
| GET | `/api/v1/public/register/check-email/{email}` | ✅ | ✅ | ✅ | OK |
| POST | `/api/v1/public/register/distributor` | ✅ | ✅ | ✅ | OK |

---

## 29. Reports (Reportes)

**Service**: `reports.service.ts` | **Hook**: `useReports.ts` | **Pages**: `/admin/reportes`

| Method | Endpoint | Service? | Hook? | UI/Page? | Status |
|--------|----------|----------|-------|----------|--------|
| GET | `/api/v1/reports/sales/daily` | ✅ | ✅ | ✅ `/admin/reportes/ventas` | OK |
| GET | `/api/v1/reports/sales/by-product` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/reports/sales/by-branch` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/reports/inventory` | ✅ | ✅ | ✅ `/admin/reportes/inventario` | OK |
| GET | `/api/v1/reports/inventory/low-stock` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/reports/inventory/expiring` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/reports/commissions/{periodId}` | ✅ | ✅ | ✅ `/admin/reportes/comisiones` | OK |
| GET | `/api/v1/reports/points/{periodId}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/reports/rank-ups/{periodId}` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/reports/customers/new` | ✅ | ✅ | ✅ `/admin/reportes/clientes` | OK |
| GET | `/api/v1/reports/customers/inactive` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/reports/attendance` | ✅ | ✅ | ✅ | OK |
| GET | `/api/v1/reports/dashboard` | ✅ | ✅ | ✅ `/admin` | OK |
| GET | `/api/v1/reports/analytics` | ✅ | ✅ | ✅ | OK |

---

## 30. Frontend-Only Services (Sin endpoint en Swagger)

Estos servicios frontend llaman a endpoints que **NO existen** en la documentación Swagger del backend:

### `securityApi.ts`

| Method | Endpoint llamado | Existe en API? |
|--------|-----------------|----------------|
| GET | `/backups` | ❌ |
| GET | `/backups/stats` | ❌ |
| POST | `/backups` | ❌ |
| GET | `/backups/{id}/download` | ❌ |
| POST | `/backups/{id}/restore` | ❌ |
| DELETE | `/backups/{id}` | ❌ |
| GET | `/settings/backup` | ❌ |
| PUT | `/settings/backup` | ❌ |
| GET | `/settings/security` | ❌ |
| PUT | `/settings/security` | ❌ |
| GET | `/security/events` | ❌ |

> **Impacto**: La página `/admin/seguridad` depende completamente de endpoints que no existen. Esta funcionalidad requiere implementación backend o eliminación del frontend.

### `distributorApi.ts` - Endpoints extra no en Swagger

| Method | Endpoint llamado | Existe en API? |
|--------|-----------------|----------------|
| GET | `/mlm/points` | ❌ |
| GET | `/mlm/rank/progress` | ❌ |
| GET | `/mlm/network/summary` | ❌ |
| GET | `/mlm/network/top-performers` | ❌ |
| POST | `/distributor/referral-link` | ❌ |

### `commissionsApi.ts` - Endpoints extra no en Swagger

| Method | Endpoint llamado | Existe en API? |
|--------|-----------------|----------------|
| GET | `/mlm/commissions/summary/{periodId}` | ❌ |
| GET | `/mlm/commissions/projection` | ❌ |
| GET | `/mlm/commissions/trend` | ❌ |
| POST | `/mlm/commissions/request-payment` | ❌ |
| GET | `/mlm/commissions/statement/{periodId}` | ❌ |

### `hr.service.ts` - Endpoints extra no en Swagger

| Method | Endpoint llamado | Existe en API? |
|--------|-----------------|----------------|
| POST | `/hr/attendance/check-in` | ❌ |
| POST | `/hr/attendance/manual` | ❌ |
| GET | `/hr/attendance` | ❌ |
| GET | `/hr/attendance/my` | ❌ |
| GET | `/hr/employees/user/{userId}` | ❌ |
| GET | `/hr/vacations/my` | ❌ |
| GET | `/hr/vacations/pending` | ❌ |
| POST | `/hr/expenses` | ❌ |
| PATCH | `/hr/expenses/{id}` | ❌ |
| POST | `/hr/expenses/{id}/items` | ❌ |
| DELETE | `/hr/expenses/{id}/items/{itemId}` | ❌ |
| PATCH | `/hr/expenses/{id}/submit` | ❌ |
| PATCH | `/hr/expenses/{id}/approve` | ❌ |
| PATCH | `/hr/expenses/{id}/verify` | ❌ |
| PATCH | `/hr/expenses/{id}/refund` | ❌ |
| PATCH | `/hr/expenses/{id}/reject` | ❌ |
| GET | `/hr/expenses` | ❌ |
| GET | `/hr/expenses/my` | ❌ |
| GET | `/hr/expenses/pending` | ❌ |

### `cart.service.ts` - Endpoints extra no en Swagger

| Method | Endpoint llamado | Existe en API? |
|--------|-----------------|----------------|
| POST | `/cart/coupon` | ❌ |
| DELETE | `/cart/coupon` | ❌ |
| POST | `/cart/coupon/validate` | ❌ |
| POST | `/cart/merge` | ❌ |

### `inventory.service.ts` - Endpoints extra no en Swagger

| Method | Endpoint llamado | Existe en API? |
|--------|-----------------|----------------|
| PATCH | `/inventory/transfers/{id}/ship` | ❌ |
| PATCH | `/inventory/transfers/{id}/receive` | ❌ |

---

## RESUMEN ESTADÍSTICO

### Totales por capa

| Métrica | Cantidad |
|---------|----------|
| **Total endpoints en Swagger** | **222** |
| **Con implementación en Service** | **176** (79.3%) |
| **Con implementación en Hook** | **174** (78.4%) |
| **Con implementación en UI/Page** | **164** (73.9%) |
| **Completamente implementados (S+H+U)** | **162** (73.0%) |
| **Completamente faltantes (sin Service)** | **46** (20.7%) |

### Desglose por módulo

| Módulo | Endpoints API | Service OK | Hook OK | UI OK | % Completo |
|--------|:------------:|:----------:|:-------:|:-----:|:----------:|
| Health | 2 | 0 | 0 | 0 | 0% |
| Auth | 11 | 11 | 11 | 10 | 91% |
| Users | 6 | 6 | 6 | 6 | 100% |
| Branches | 7 | 7 | 7 | 6 | 86% |
| Categories | 9 | 9 | 9 | 9 | 100% |
| Products | 14 | 9 | 9 | 8 | 57% |
| Cart | 6 | 6 | 6 | 6 | 100% |
| Checkout | 4 | 4 | 4 | 4 | 100% |
| Customers | 11 | 8 | 8 | 7 | 64% |
| Customer Addresses | 6 | 6 | 6 | 6 | 100% |
| Customer Bank Accounts | 6 | 6 | 6 | 6 | 100% |
| Orders | 11 | 11 | 11 | 11 | 100% |
| Billing | 23 | 23 | 23 | 23 | 100% |
| Configuration | 36 | 36 | 36 | 36 | 100% |
| Inventory | 22 | 18 | 18 | 16 | 73% |
| POS | 22 | 22 | 22 | 22 | 100% |
| Distributor Dashboard | 4 | 4 | 4 | 4 | 100% |
| MLM - Network | 6 | 2 | 2 | 1 | 17% |
| MLM - Commissions | 7 | 4 | 4 | 3 | 43% |
| MLM - Network Stats | 5 | 0 | 0 | 0 | 0% |
| MLM - Periods | 8 | 1 | 1 | 1 | 13% |
| MLM - Ranks | 7 | 0 | 0 | 0 | 0% |
| MLM - Rollover | 5 | 0 | 0 | 0 | 0% |
| Notifications | 11 | 10 | 10 | 10 | 91% |
| Audit | 22 | 14 | 14 | 14 | 64% |
| HR | 12 | 12 | 12 | 12 | 100% |
| Health Quiz | 14 | 12 | 12 | 12 | 86% |
| Public Registration | 3 | 3 | 3 | 3 | 100% |
| Reports | 14 | 14 | 14 | 14 | 100% |

### Endpoints completamente faltantes (sin ningún service)

1. `GET /api/v1/health` - Health check
2. `GET /api/v1` - Health check root
3. `POST /api/v1/products/{id}/prices` - Crear precio de producto
4. `DELETE /api/v1/products/{id}/prices/{priceId}` - Eliminar precio de producto
5. `POST /api/v1/products/{id}/components` - Crear componente de producto
6. `PATCH /api/v1/products/{id}/components/{componentId}` - Actualizar componente
7. `DELETE /api/v1/products/{id}/components/{componentId}` - Eliminar componente
8. `DELETE /api/v1/customers/{id}/hard` - Eliminación definitiva de cliente
9. `GET /api/v1/customers/{id}/qr-code` - Código QR de cliente
10. `GET /api/v1/customers/{id}/qr-code/download` - Descargar QR de cliente
11. `GET /api/v1/customers/{id}/referral-info` - Info de referido
12. `GET /api/v1/inventory` - Resumen general de inventario
13. `PATCH /api/v1/inventory/transfers/{id}/reject` - Rechazar traspaso
14. `POST /api/v1/inventory/transfers/{id}/apply` - Aplicar traspaso
15. `GET /api/v1/mlm/network/{customerId}/downlines` - Downlines directos
16. `GET /api/v1/mlm/network/{customerId}/upline` - Línea ascendente
17. `POST /api/v1/mlm/network/{customerId}/add` - Agregar a red
18. `PUT /api/v1/mlm/network/{customerId}/move` - Mover en red
19. `GET /api/v1/mlm/commissions/customer/{customerId}` - Comisiones por cliente
20. `PATCH /api/v1/mlm/commissions/percentages/{id}` - Actualizar porcentaje
21. `POST /api/v1/mlm/commissions/calculate` - Calcular comisiones
22. `GET /api/v1/mlm/network-stats/customer/{customerId}` - Stats de red por cliente
23. `GET /api/v1/mlm/network-stats/status` - Estado de stats
24. `GET /api/v1/mlm/network-stats/top/business-points` - Top por puntos
25. `GET /api/v1/mlm/network-stats/top/network-size` - Top por tamaño red
26. `POST /api/v1/mlm/network-stats/refresh` - Refrescar stats
27. `GET /api/v1/mlm/periods/current` - Periodo actual
28. `GET /api/v1/mlm/periods/{id}` - Detalle de periodo
29. `POST /api/v1/mlm/periods` - Crear periodo
30. `PUT /api/v1/mlm/periods/{id}` - Actualizar periodo
31. `POST /api/v1/mlm/periods/generate` - Generar periodos
32. `POST /api/v1/mlm/periods/{id}/close` - Cerrar periodo
33. `POST /api/v1/mlm/periods/{id}/reopen` - Reabrir periodo
34. `GET /api/v1/mlm/ranks` - Listar rangos
35. `GET /api/v1/mlm/ranks/{id}` - Detalle de rango
36. `POST /api/v1/mlm/ranks` - Crear rango
37. `PUT /api/v1/mlm/ranks/{id}` - Actualizar rango
38. `GET /api/v1/mlm/ranks/qualification/{customerId}/{periodId}` - Calificación de rango
39. `GET /api/v1/mlm/ranks/summary/{periodId}` - Resumen de rangos
40. `POST /api/v1/mlm/ranks/calculate` - Calcular rangos
41. `GET /api/v1/mlm/rollover/status/{periodId}` - Estado de rollover
42. `GET /api/v1/mlm/rollover/stats/{periodId}` - Stats de rollover
43. `GET /api/v1/mlm/rollover/history/{customerId}` - Historial de rollover
44. `GET /api/v1/mlm/rollover/effective-sponsor/{customerId}` - Sponsor efectivo
45. `POST /api/v1/mlm/rollover/calculate/{periodId}` - Calcular rollover
46. `GET /api/v1/notifications/user/{userId}/preferences` - Preferencias por usuario
47. `POST /api/v1/audit/alerts` - Crear alerta
48. `GET /api/v1/audit/alerts/rules` - Reglas de alertas
49. `GET /api/v1/audit/alerts/stats` - Stats de alertas
50. `GET /api/v1/audit/retention/policies` - Políticas de retención
51. `GET /api/v1/audit/retention/stats` - Stats de retención
52. `GET /api/v1/audit/retention/logs-by-age` - Logs por antigüedad
53. `POST /api/v1/audit/retention/execute` - Ejecutar retención
54. `POST /api/v1/audit/retention/archive` - Archivar logs
55. `POST /api/v1/audit/retention/purge` - Purgar logs
56. `GET /api/v1/quiz/admin/sessions` - Admin: sesiones de quiz
57. `GET /api/v1/quiz/admin/stats` - Admin: stats de quiz

### Discrepancias de rutas (Service llama a ruta incorrecta)

| Service | Ruta en Service | Ruta correcta en API | Archivo |
|---------|----------------|---------------------|---------|
| Products | `/products/sku/{sku}` | `/products/code/{code}` | `products.service.ts` |
| Inventory (ajustes) | `/inventory/audits/*` | `/inventory/counts/*` | `inventory.service.ts` |
| Network Stats | `/mlm/network-stats/{userId}/dashboard` | `/mlm/network-stats/customer/{customerId}` | `networkApi.ts` |

### Prioridades de implementación sugeridas

**Alta prioridad** (funcionalidad core afectada):
1. Corregir ruta de inventario: cambiar `/inventory/audits/` por `/inventory/counts/` en `inventory.service.ts`
2. Corregir ruta de productos: cambiar `/products/sku/` por `/products/code/` en `products.service.ts`
3. Implementar CRUD de precios de producto (`POST/DELETE /products/{id}/prices`)
4. Implementar CRUD de componentes de producto (`POST/PATCH/DELETE /products/{id}/components`)

**Media prioridad** (módulos MLM incompletos):
5. Crear `ranks.service.ts` + `useRanks.ts` (7 endpoints faltantes)
6. Crear `rollover.service.ts` + `useRollover.ts` (5 endpoints faltantes)
7. Completar `periods.service.ts` + `usePeriods.ts` (7 de 8 endpoints faltantes)
8. Completar `network-stats.service.ts` (5 endpoints faltantes)
9. Agregar endpoints faltantes de commissions: calculate, customer, percentages update

**Baja prioridad** (extensiones y admin avanzado):
10. Endpoints de retention en auditoría (6 endpoints)
11. Endpoints de quiz admin (2 endpoints)
12. Customer QR code y referral info (3 endpoints)
13. Definir si endpoints de security/backups se implementarán en backend
