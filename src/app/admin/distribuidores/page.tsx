import { redirect } from 'next/navigation';

// La lista de clientes/distribuidores se consolidó dentro de la pantalla de
// Usuarios como una pestaña. Esta ruta redirige a ese tab.
// Las páginas profundas (nuevo, [id], [id]/editar) siguen vivas y se usan
// desde la tabla del tab.
export default function DistribuidoresPage() {
  redirect('/admin/usuarios?tab=distribuidores');
}
