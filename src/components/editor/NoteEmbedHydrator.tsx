/**
 * Composant pour hydrater les note embeds en mode preview
 * 
 * Scanne le DOM après le rendu HTML et remplace les <div data-type="note-embed">
 * par des composants React NoteEmbedView
 */

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import NoteEmbedContent from './NoteEmbedContent';
import { type NoteEmbedDisplayStyle } from '@/types/noteEmbed';
import { EmbedDepthProvider } from '@/contexts/EmbedDepthContext';
import { simpleLogger as logger } from '@/utils/logger';

interface NoteEmbedHydratorProps {
  containerRef: React.RefObject<HTMLElement>;
  /** HTML content pour détecter les changements et re-trigger l'hydratation */
  htmlContent?: string;
}

export const NoteEmbedHydrator: React.FC<NoteEmbedHydratorProps> = ({ containerRef, htmlContent }) => {
  const rootsRef = useRef<Map<HTMLElement, ReturnType<typeof createRoot>>>(new Map());
  const observerRef = useRef<MutationObserver | null>(null);
  const hydrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hydrateEmbeds = useCallback(() => {
    if (!containerRef.current) {
      logger.dev('[NoteEmbedHydrator] ⏸️ Container not ready yet');
      return;
    }

    const embedPlaceholders = containerRef.current.querySelectorAll<HTMLElement>(
      'note-embed'
    );

    const newPlaceholders = Array.from(embedPlaceholders).filter((element) => {
      if (element.getAttribute('data-hydrated') === 'true') {
        return false;
      }
      return true;
    });

    if (newPlaceholders.length > 0) {
      logger.dev(`[NoteEmbedHydrator] 📦 Found ${newPlaceholders.length} new embeds to hydrate.`);
    }

    newPlaceholders.forEach((placeholder, index) => {
      const noteRef = placeholder.getAttribute('data-note-ref');
      if (!noteRef) {
        logger.warn('[NoteEmbedHydrator] Embed placeholder is missing data-note-ref', placeholder);
        return;
      }
      const noteTitle = placeholder.getAttribute('data-note-title');
      const displayAttr = placeholder.getAttribute('data-display') as NoteEmbedDisplayStyle | null;
      
      const parentElement = placeholder.parentElement;
      if (parentElement && parentElement.tagName === 'P') {
        const meaningfulNodes = Array.from(parentElement.childNodes).filter(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent?.trim().length;
          }
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            return el.dataset?.type === 'note-embed';
          }
          return false;
        });

        const onlyEmbeds = meaningfulNodes.every(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return false;
          const el = node as HTMLElement;
          return el.dataset?.type === 'note-embed';
        });

        if (onlyEmbeds) {
          parentElement.style.display = 'flex';
          parentElement.style.flexDirection = 'column';
          parentElement.style.alignItems = 'flex-start';
          parentElement.style.gap = '0.75rem';
          parentElement.style.margin = '0 0 1rem 0';
        }
      }

      logger.dev(`[NoteEmbedHydrator] ✨ Hydrating embed ${index + 1}/${newPlaceholders.length}:`, noteRef);
      
      // Mark as hydrated BEFORE creating root to prevent re-triggering
      placeholder.setAttribute('data-hydrated', 'true');

      const root = createRoot(placeholder);
      rootsRef.current.set(placeholder, root);

      const depth = parseInt(placeholder.getAttribute('data-depth') || '0', 10);

      root.render(
        <EmbedDepthProvider>
          <NoteEmbedContent
            noteRef={noteRef}
            embedDepth={depth}
            standalone={true}
            display={displayAttr ?? 'inline'}
            noteTitle={noteTitle}
          />
        </EmbedDepthProvider>
      );
    });
  }, [containerRef]);

  const cleanupStaleRoots = useCallback(() => {
    for (const [element, root] of rootsRef.current.entries()) {
      if (!document.body.contains(element)) {
        logger.dev('[NoteEmbedHydrator] 🗑️ Stale root found, unmounting:', element.getAttribute('data-note-ref'));
        queueMicrotask(() => root.unmount());
        rootsRef.current.delete(element);
      }
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) {
      logger.dev('[NoteEmbedHydrator] ⏸️ Container ref not ready');
      return;
    }

    // ✅ FIX: Attendre que le DOM soit stable après dangerouslySetInnerHTML
    // React batch les updates, donc on doit attendre un tick pour que le HTML soit dans le DOM
    if (hydrationTimeoutRef.current) {
      clearTimeout(hydrationTimeoutRef.current);
    }

    hydrationTimeoutRef.current = setTimeout(() => {
      logger.dev('[NoteEmbedHydrator] 🚀 Starting hydration cycle');
      
      // Disconnect any previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      
      // Initial hydration pass
      cleanupStaleRoots();
      hydrateEmbeds();

      // Setup MutationObserver pour détecter les changements DOM dynamiques
      const observer = new MutationObserver((mutationsList) => {
        let shouldRehydrate = false;
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList' && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
             shouldRehydrate = true;
             break;
          }
        }
        if (shouldRehydrate) {
          logger.dev('[NoteEmbedHydrator] DOM changed, triggering hydration cycle.');
          cleanupStaleRoots();
          hydrateEmbeds();
        }
      });

      if (containerRef.current) {
        observer.observe(containerRef.current, { childList: true, subtree: true });
        observerRef.current = observer;
      }
    }, 100); // ✅ Délai de 100ms pour laisser React terminer le batch update

    return () => {
      logger.dev('[NoteEmbedHydrator] Cleanup: Disconnecting observer and unmounting all roots.');
      
      if (hydrationTimeoutRef.current) {
        clearTimeout(hydrationTimeoutRef.current);
      }
      
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      
      const roots = Array.from(rootsRef.current.values());
      queueMicrotask(() => {
        roots.forEach(root => root.unmount());
      });
      rootsRef.current.clear();
    };
  }, [containerRef, htmlContent, hydrateEmbeds, cleanupStaleRoots]); // ✅ Dépendance sur htmlContent pour re-trigger quand le HTML change

  return null;
};

