/**
 * Diagnostics temporaires pour identifier la cause des saccades de scroll
 * À SUPPRIMER après debug
 */

import { logger, LogCategory } from './logger';

// Active/désactive les diagnostics
const DIAGNOSTICS_ENABLED = process.env.NODE_ENV === 'development';

// Compteur de repaints pendant scroll
let repaintsDuringScroll = 0;
let isScrolling = false;

// Observer les mutations DOM pendant scroll
export function enableScrollDiagnostics() {
  if (!DIAGNOSTICS_ENABLED) return;

  // Détecter scroll
  let scrollTimeout: NodeJS.Timeout;
  window.addEventListener('scroll', () => {
    if (!isScrolling) {
      isScrolling = true;
      repaintsDuringScroll = 0;
      logger.debug(LogCategory.PERFORMANCE, '[ScrollDiag] 🔵 Scroll START');
    }

    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isScrolling = false;
      logger.debug(LogCategory.PERFORMANCE, '[ScrollDiag] 🔴 Scroll END - Repaints détectés', {
        repaintsCount: repaintsDuringScroll,
        isHigh: repaintsDuringScroll > 5
      });
    }, 200);
  }, { passive: true });

  // Observer mutations DOM
  const observer = new MutationObserver((mutations) => {
    if (isScrolling) {
      repaintsDuringScroll += mutations.length;
      
      // Log les mutations coûteuses
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          logger.warn(LogCategory.PERFORMANCE, '[ScrollDiag] ⚠️ Style mutation pendant scroll', {
            target: mutation.target instanceof Element ? mutation.target.tagName : 'Unknown'
          });
        }
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          logger.warn(LogCategory.PERFORMANCE, '[ScrollDiag] ⚠️ DOM insertion pendant scroll', {
            target: mutation.target instanceof Element ? mutation.target.tagName : 'Unknown',
            addedNodesCount: mutation.addedNodes.length
          });
        }
      });
    }
  });

  // Observer tout le body
  observer.observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
  });

  logger.debug(LogCategory.PERFORMANCE, '[ScrollDiag] 🔍 Diagnostics activés');
}

// Performance observer pour detecter long tasks
export function enablePerformanceDiagnostics() {
  if (!DIAGNOSTICS_ENABLED || !('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Long task > 50ms pendant scroll = saccade garantie
        const duration = (entry as { duration?: number }).duration || 0;
        if (duration > 50) {
          logger.error(LogCategory.PERFORMANCE, `[ScrollDiag] 🐌 LONG TASK détectée: ${duration.toFixed(0)}ms`, {
            duration,
            entryType: entry.entryType,
            name: entry.name
          });
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
    logger.debug(LogCategory.PERFORMANCE, '[ScrollDiag] 📊 Performance monitoring activé');
  } catch (e) {
    logger.warn(LogCategory.PERFORMANCE, '[ScrollDiag] Performance monitoring non supporté', {
      error: e instanceof Error ? e.message : 'Unknown error'
    });
  }
}

