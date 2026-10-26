'use client';

// Guard del árbol /admin/comercial/* (mig 120): antes estas páginas no tenían
// PermissionGuard y cualquier colaborador entraba por URL directa.
import { usePathname } from 'next/navigation';
import { PermissionGuard } from '@/components/auth';

const COMERCIAL_PERMISSIONS = [
  'comercial',
  'courses:read',
  'courses:manage',
  'materials:read',
  'materials:manage',
  'config',
];

// Comercial › Distribuidores (mig 174) también se abre con reports:read
// (Operaciones) o reports:distributors (Call Center): el API ya lo acepta y el
// sidebar lo muestra, pero este guard los dejaba fuera. Solo en esa ruta: el
// resto de Comercial sigue cerrado para ellos.
const DISTRIBUIDORES_PATH = '/admin/comercial/distribuidores';
const DISTRIBUIDORES_PERMISSIONS = [...COMERCIAL_PERMISSIONS, 'reports:read', 'reports:distributors'];

export default function ComercialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDistribuidores =
    pathname === DISTRIBUIDORES_PATH || pathname.startsWith(`${DISTRIBUIDORES_PATH}/`);
  return (
    <PermissionGuard permissions={isDistribuidores ? DISTRIBUIDORES_PERMISSIONS : COMERCIAL_PERMISSIONS}>
      {children}
    </PermissionGuard>
  );
}
