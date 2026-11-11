'use client';

// /distribuidor/pedidos — "Mis pedidos" dentro del panel del distribuidor. La vista vive en
// components/orders/MyOrdersView: la comparte con /mis-pedidos (la cuenta del público).

import { MyOrdersView } from '@/components/orders/MyOrdersView';

export default function MisPedidosPage() {
  return <MyOrdersView variant="panel" />;
}
