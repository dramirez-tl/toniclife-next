'use client';

import { Header } from '@/components/layout/Header';
import { AccountSidebar } from '@/components/account';

export default function CuentaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main container with sidebar */}
      <div className="flex pt-[104px] lg:pt-[112px] min-h-screen">
        {/* Sidebar */}
        <AccountSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="min-h-[calc(100vh-104px)] lg:min-h-[calc(100vh-112px)]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
