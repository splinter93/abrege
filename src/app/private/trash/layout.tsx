import React from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';

export default function TrashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="dossiers-page-wrapper">
        <aside className="dossiers-sidebar-fixed">
          <Sidebar />
        </aside>
        <main className="dossiers-content-area">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
} 