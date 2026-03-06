'use client';

import React from 'react';
import { MainSidebarProvider, useMainSidebar } from '@/contexts/MainSidebarContext';
import Sidebar from '@/components/Sidebar';
import MainSidebarToggleButton from '@/components/MainSidebarToggleButton';

function PageWithSidebarLayoutInner({ children }: { children: React.ReactNode }) {
  const { isOpen, isMobile, closeSidebar } = useMainSidebar();

  return (
    <div className={`page-wrapper ${isMobile ? 'page-is-mobile' : ''}`}>
      {/* Overlay mobile : clic ferme la sidebar */}
      {isMobile && isOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="dashboard-sidebar-overlay"
          onClick={closeSidebar}
        />
      )}
      <aside
        className={`page-sidebar-fixed ${isMobile ? 'page-sidebar-drawer' : ''} ${isOpen && isMobile ? 'page-sidebar-drawer-open' : ''}`}
        aria-hidden={isMobile && !isOpen}
      >
        <Sidebar />
      </aside>
      <main className="page-content-area">
        <div className="page-mobile-sidebar-header">
          <MainSidebarToggleButton />
        </div>
        {children}
      </main>
    </div>
  );
}

/**
 * Layout avec sidebar principale : sur mobile, sidebar complètement masquée,
 * bouton en haut à gauche (même style que le chat) pour l’ouvrir en push.
 */
export default function PageWithSidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <MainSidebarProvider>
      <PageWithSidebarLayoutInner>{children}</PageWithSidebarLayoutInner>
    </MainSidebarProvider>
  );
}
