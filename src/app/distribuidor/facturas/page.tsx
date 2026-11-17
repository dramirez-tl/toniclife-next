'use client';

// /distribuidor/facturas — "Mis facturas": el distribuidor factura sus compras de la tienda
// en línea del mes en curso y guarda sus datos fiscales. La vista vive en
// components/invoicing/MyInvoicesView.

import { MyInvoicesView } from '@/components/invoicing/MyInvoicesView';

export default function MisFacturasPage() {
  return <MyInvoicesView />;
}
