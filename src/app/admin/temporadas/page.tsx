import { redirect } from 'next/navigation';

export default function TemporadasRedirect() {
  redirect('/admin/productos?tab=temporadas');
}
