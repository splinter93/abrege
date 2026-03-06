'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { useMainSidebarOptional } from '@/contexts/MainSidebarContext';

/**
 * Bouton pour ouvrir/fermer la sidebar sur mobile.
 * Visible uniquement en dessous du breakpoint dashboard (768px).
 */
export default function MainSidebarToggleButton() {
  const ctx = useMainSidebarOptional();
  if (!ctx) return null;

  const { isOpen, isMobile, toggleSidebar } = ctx;
  if (!isMobile) return null;

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className="dashboard-sidebar-toggle-btn"
      aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
      title={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}
