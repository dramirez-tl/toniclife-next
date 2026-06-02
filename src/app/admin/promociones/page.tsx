import { redirect } from 'next/navigation';

export default function PromocionesRedirect() {
  redirect('/admin/productos?tab=promociones');
}
