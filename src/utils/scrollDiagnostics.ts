/**
 * Diagnostics temporaires pour identifier la cause des saccades de scroll
 * À SUPPRIMER après debug
 */

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
      console.log('%c[ScrollDiag] 🔵 Scroll START', 'color: blue; font-weight: bold');
    }

    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isScrolling = false;
      console.log(
        `%c[ScrollDiag] 🔴 Scroll END - Repaints détectés: ${repaintsDuringScroll}`,
        repaintsDuringScroll > 5 ? 'color: red; font-weight: bold' : 'color: green'
      );
    }, 200);
  }, { passive: true });

  // Observer mutations DOM
  const observer = new MutationObserver((mutations) => {
    if (isScrolling) {
      repaintsDuringScroll += mutations.length;
      
      // Log les mutations coûteuses
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          console.warn(
            `%c[ScrollDiag] ⚠️ Style mutation pendant scroll:`,
            'color: orange',
            mutation.target
          );
        }
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          console.warn(
            `%c[ScrollDiag] ⚠️ DOM insertion pendant scroll:`,
            'color: orange',
            mutation.target
          );
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

  console.log('%c[ScrollDiag] 🔍 Diagnostics activés', 'color: cyan; font-weight: bold');
}

// Performance observer pour detecter long tasks
export function enablePerformanceDiagnostics() {
  if (!DIAGNOSTICS_ENABLED || !('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Long task > 50ms pendant scroll = saccade garantie
        if ((entry as any).duration > 50) {
          console.error(
            `%c[ScrollDiag] 🐌 LONG TASK détectée: ${(entry as any).duration.toFixed(0)}ms`,
            'color: red; font-weight: bold; font-size: 14px',
            entry
          );
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
    console.log('%c[ScrollDiag] 📊 Performance monitoring activé', 'color: cyan');
  } catch (e) {
    console.warn('[ScrollDiag] Performance monitoring non supporté');
  }
}

