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
      <div className="trash-page-wrapper">
        <aside className="trash-sidebar-fixed">
          <Sidebar />
        </aside>
        <main className="trash-content-area">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
} 