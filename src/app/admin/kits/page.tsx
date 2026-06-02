import { redirect } from 'next/navigation';

export default function KitsRedirect() {
  redirect('/admin/productos?tab=kits');
}
