import React from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import '@/styles/main.css';

export default function TrashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="page-wrapper">
        <aside className="page-sidebar-fixed">
          <Sidebar />
        </aside>
        <main className="page-content-area">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
} 