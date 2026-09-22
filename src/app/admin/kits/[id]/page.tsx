// /admin/kits/[id] → la ficha única del producto, sección Kit (contrato de
// kits §5.2). El editor viejo se retiró: todo lo que editaba vive en
// /admin/productos/[id]/editar (Kit, Componentes, Precios, Inventario, Bono,
// Ventas, Historial).

import { redirect } from 'next/navigation';

export default async function KitEditorRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/productos/${encodeURIComponent(id)}/editar?seccion=kit`);
}
