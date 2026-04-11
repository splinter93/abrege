'use client';

/**
 * Rendu conditionnel du chat en mode widget via portal.
 * Lit useChatWidgetStore.isOpen ; quand ouvert, rend ChatFullscreenV2 variant="widget"
 * dans document.body pour éviter les problèmes de z-index/overflow.
 */

import React, { Suspense, lazy, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useChatWidgetStore } from '@/store/useChatWidgetStore';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';

const ChatFullscreenV2 = lazy(() => import('./ChatFullscreenV2'));

const WIDGET_DESKTOP_MIN = '(min-width: 769px)';

export default function ChatWidgetRoot() {
  const isOpen = useChatWidgetStore((s) => s.isOpen);
  const close = useChatWidgetStore((s) => s.close);

  useEffect(() => {
    const mq = window.matchMedia(WIDGET_DESKTOP_MIN);
    const sync = () => {
      if (!mq.matches) close();
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [close]);

  if (!isOpen || typeof document === 'undefined') return null;

  if (typeof window !== 'undefined' && !window.matchMedia(WIDGET_DESKTOP_MIN).matches) {
    return null;
  }

  const widgetContent = (
    <Suspense fallback={<SimpleLoadingState message="Chargement du chat..." />}>
      <ChatFullscreenV2 variant="widget" onClose={close} />
    </Suspense>
  );

  return createPortal(widgetContent, document.body);
}
