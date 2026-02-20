'use client';

import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useState } from 'react';
import { Bars3Icon, XMarkIcon, BellIcon } from '@heroicons/react/24/outline';

// Roles que tienen acceso al panel de administración
// Aligned with database role codes from roles table
const ADMIN_ROLES = [
  'super_admin',
  'administrador',
  'subadmin',
  'almacen',
  'ventas_mostrador',
  'rh',
  'contabilidad',
  'auditor',
  'viewer',
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard requiredRoles={ADMIN_ROLES}>
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <AdminSidebar />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <span className="font-semibold text-[#003B7A]">Tonic Life Admin</span>
          </div>
          <button className="p-2 text-gray-600 hover:text-gray-900 relative">
            <BellIcon className="h-6 w-6" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-3.5rem)] lg:min-h-screen">
          {children}
        </main>
      </div>
    </div>
    </AuthGuard>
  );
}
