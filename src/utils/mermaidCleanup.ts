/**
 * Nettoie les SVG Mermaid orphelins du DOM
 */
import { logger, LogCategory } from '@/utils/logger';

export function cleanupMermaidSVGs(): void {
  try {
    const orphanedSVGs = document.querySelectorAll('body > svg[id^="mermaid-"]');
    orphanedSVGs.forEach(svg => svg.remove());
    const orphanedDivs = document.querySelectorAll('body > div[id^="dmermaid-"]');
    orphanedDivs.forEach(div => div.remove());
  } catch (error) {
    logger.error(LogCategory.EDITOR, '[mermaidCleanup] Erreur cleanup Mermaid:', error);
  }
}

