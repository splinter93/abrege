import React from 'react';
import UnifiedSidebar from '@/components/UnifiedSidebar';
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
          <UnifiedSidebar />
        </aside>
        <main className="page-content-area">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
} 