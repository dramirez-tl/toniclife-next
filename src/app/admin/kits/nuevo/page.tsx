// /admin/kits/nuevo → el alta única de producto con el tipo kit preseleccionado
// (contrato de kits §5.2): el kit nace como borrador (inactivo, "Se arma al
// vender", fuera del POS y de la inscripción en línea).

import { redirect } from 'next/navigation';

export default function NewKitRedirect() {
  redirect('/admin/productos/nuevo?tipo=kit');
}
