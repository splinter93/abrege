'use client';

import React from 'react';
import { MainSidebarProvider, useMainSidebar } from '@/contexts/MainSidebarContext';
import UnifiedSidebar from '@/components/UnifiedSidebar';
import MainSidebarToggleButton from '@/components/MainSidebarToggleButton';

function PageWithSidebarLayoutInner({ children }: { children: React.ReactNode }) {
  const { isOpen, isMobile, closeSidebar } = useMainSidebar();

  return (
    <div className={`page-wrapper ${isMobile ? 'page-is-mobile' : ''} ${isOpen && isMobile ? 'main-sidebar-open' : ''}`}>
      <aside className={`page-sidebar-fixed ${isOpen && isMobile ? 'mobile-visible' : ''}`}>
        <UnifiedSidebar
          isOpen={isOpen}
          isDesktop={!isMobile}
          onClose={closeSidebar}
        />
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
