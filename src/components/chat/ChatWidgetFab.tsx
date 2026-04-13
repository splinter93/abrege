'use client';

/**
 * Bouton flottant pour ouvrir le chat widget.
 * Position fixe en bas à droite, z-index sous le widget.
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { useChatWidgetStore } from '@/store/useChatWidgetStore';
import './ChatWidgetFab.css';

export default function ChatWidgetFab() {
  const toggle = useChatWidgetStore((s) => s.toggle);
  const isOpen = useChatWidgetStore((s) => s.isOpen);

  if (isOpen) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className="chat-widget-fab"
      aria-label="Ouvrir le chat"
      title="Ouvrir le chat"
    >
      <Sparkles className="chat-widget-fab__icon" size={22} aria-hidden />
    </button>
  );
}
