'use client';

import React from 'react';
import { useMainSidebarOptional } from '@/contexts/MainSidebarContext';

/**
 * Bouton toggle de la sidebar principale (mobile).
 * Même style que le bouton du chat (chatgpt-sidebar-toggle-btn-header).
 * Visible uniquement sur mobile via CSS.
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
      className="chatgpt-sidebar-toggle-btn-header main-sidebar-toggle-btn"
      aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
      title={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
      </svg>
    </button>
  );
}
