'use client';

/**
 * Rendu conditionnel du chat en mode widget via portal.
 * Lit useChatWidgetStore.isOpen ; quand ouvert, rend ChatFullscreenV2 variant="widget"
 * dans document.body pour éviter les problèmes de z-index/overflow.
 * Supporte le resize vertical via un handle glissable sur la bordure supérieure.
 */

import React, { Suspense, lazy, useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useChatWidgetStore } from '@/store/useChatWidgetStore';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';

const ChatFullscreenV2 = lazy(() => import('./ChatFullscreenV2'));

const WIDGET_DESKTOP_MIN = '(min-width: 769px)';
const WIDGET_HEIGHT_DEFAULT = 640;
const WIDGET_HEIGHT_MIN = 700;
const WIDGET_BOTTOM = 28;

export default function ChatWidgetRoot() {
  const isOpen = useChatWidgetStore((s) => s.isOpen);
  const close = useChatWidgetStore((s) => s.close);
  const [height, setHeight] = useState(WIDGET_HEIGHT_DEFAULT);
  const isDragging = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia(WIDGET_DESKTOP_MIN);
    const sync = () => { if (!mq.matches) close(); };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [close]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startY = e.clientY;
    const startHeight = height;
    const maxHeight = Math.floor(window.innerHeight * 0.93) - WIDGET_BOTTOM; /* aligné sur max-height: 93vh du CSS */

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startY - ev.clientY; // drag vers le haut = delta positif = hauteur augmente
      const next = Math.max(WIDGET_HEIGHT_MIN, Math.min(maxHeight, startHeight + delta));
      setHeight(next);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [height]);

  if (!isOpen || typeof document === 'undefined') return null;
  if (typeof window !== 'undefined' && !window.matchMedia(WIDGET_DESKTOP_MIN).matches) return null;

  const widgetContent = (
    // Le wrapper pose --widget-height : la variable cascade jusqu'à .chatgpt-container--widget
    <div style={{ '--widget-height': `${height}px` } as React.CSSProperties}>
      {/* Handle de resize : barre fine sur le dessus du widget */}
      <div
        className="chat-widget-resize-handle"
        style={{ bottom: `${WIDGET_BOTTOM + height - 6}px` }}
        onMouseDown={startResize}
        aria-label="Redimensionner le chat"
        role="separator"
      />
      <Suspense fallback={<SimpleLoadingState message="Chargement du chat..." />}>
        <ChatFullscreenV2 variant="widget" onClose={close} />
      </Suspense>
    </div>
  );

  return createPortal(widgetContent, document.body);
}
