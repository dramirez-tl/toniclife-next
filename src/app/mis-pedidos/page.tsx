'use client';

// /mis-pedidos — "Mis pedidos" de la cuenta del público (cliente final), con el marco de
// la tienda. Esa cuenta no tiene panel de distribuidor (lib/auth-area.ts), pero sus pedidos
// sí existen: se listan con la misma vista del panel (components/orders/MyOrdersView), que
// los pide por cliente y no necesita red.
//
// Exige sesión: el middleware manda a iniciar sesión a quien no la tiene y regresa aquí;
// `AuthGuard` cubre lo que el middleware no ve (sesión solo en esta pestaña) y a un
// colaborador le dice que esta página no es para él. Los correos del pedido apuntan a
// /distribuidor/pedidos: a la cuenta del público se le trae de ahí hasta aquí.

import { AuthGuard } from '@/components/auth/AuthGuard';
import { Header, Footer } from '@/components/layout';
import { MyOrdersView } from '@/components/orders/MyOrdersView';

export default function MisPedidosTiendaPage() {
  return (
    <>
      <Header />
      {/* Espaciador para el header fijo (barra superior + nav) */}
      <div className="h-28 lg:h-32" />
      <main>
        <AuthGuard requiredCategory="cliente">
          <MyOrdersView variant="store" />
        </AuthGuard>
      </main>
      <Footer />
    </>
  );
}
