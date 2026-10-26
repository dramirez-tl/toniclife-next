// /admin/reportes/bonos → /admin/tesoreria/bonos (26-oct-2026): el Bono de
// Inscripción lo paga Tesorería, así que vive en su módulo. Se conserva la
// ruta vieja solo para los marcadores y enlaces ya repartidos.

import { redirect } from 'next/navigation';

export default function BonosRedirectPage() {
  redirect('/admin/tesoreria/bonos');
}
