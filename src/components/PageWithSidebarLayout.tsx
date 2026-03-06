'use client';

import React from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { MainSidebarProvider, useMainSidebar } from '@/contexts/MainSidebarContext';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/Sidebar';

function PageWithSidebarLayoutInner({ children }: { children: React.ReactNode }) {
  const { isOpen, isMobile, closeSidebar, openSidebar, toggleSidebar } = useMainSidebar();
  const { user } = useAuth();

  const displayName =
    (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.full_name ||
    (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.name ||
    user?.email?.split('@')[0] ||
    'N';
  const avatarUrl = (user?.user_metadata as { avatar_url?: string } | undefined)?.avatar_url;
  const initial = (displayName || 'N').slice(0, 1).toUpperCase();

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
      {/* Mobile Top Bar — même niveau que la sidebar, hors du main */}
      <div className="mobile-top-bar md:hidden flex items-center justify-between h-14 px-4 pt-[env(safe-area-inset-top,0px)] bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/[0.08] shrink-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-2 -ml-2 text-neutral-400 hover:text-white transition-colors"
          aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-neutral-200 tracking-tight">
          Scrivia App
        </span>
        <Link
          href="/private/account"
          className="w-7 h-7 rounded-full bg-neutral-800 border border-white/[0.1] flex items-center justify-center overflow-hidden shrink-0"
          aria-label="Compte"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-medium text-neutral-300">{initial}</span>
          )}
        </Link>
      </div>
      <aside
        className={`page-sidebar-fixed ${isMobile ? 'page-sidebar-drawer' : ''} ${isOpen && isMobile ? 'page-sidebar-drawer-open' : ''}`}
        aria-hidden={isMobile && !isOpen}
      >
        <Sidebar />
      </aside>
      <main className="page-content-area">
        <div className="flex-1 min-h-0 pt-0">
          {children}
        </div>
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
