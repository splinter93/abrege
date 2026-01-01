/**
 * useMermaidRenderer - Hook pour le rendu des diagrammes Mermaid
 * 
 * Responsabilités:
 * - Rendu des blocs Mermaid
 * - Gestion des retries
 * - Détection des blocs vides
 */

import { useCallback } from 'react';
import { initializeMermaid } from '@/services/mermaid/mermaidConfig';
import { normalizeMermaidContent } from '@/components/chat/mermaidService';
import { logger, LogCategory } from '@/utils/logger';

interface UseMermaidRendererOptions {
  container: HTMLElement | null;
  noteId?: string;
}

/**
 * Hook pour rendre les diagrammes Mermaid dans un conteneur
 */
export function useMermaidRenderer({ container, noteId }: UseMermaidRendererOptions) {
  const renderMermaidBlocks = useCallback(async (retryCount = 0): Promise<void> => {
    // FIX: Attendre que le DOM soit mis à jour après l'injection du HTML
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    
    if (!container) return;
    
    const mermaidBlocks = container.querySelectorAll('.u-block--mermaid[data-mermaid="true"]');
    
    // Si aucun bloc trouvé et qu'on n'a pas encore réessayé, réessayer plusieurs fois
    if (mermaidBlocks.length === 0 && retryCount < 3) {
      setTimeout(() => {
        renderMermaidBlocks(retryCount + 1);
      }, 150 * (retryCount + 1)); // Délai progressif : 150ms, 300ms, 450ms
      return;
    }
    
    // Si toujours aucun bloc après retries, retourner silencieusement
    if (mermaidBlocks.length === 0) {
      return;
    }
    
    for (const block of mermaidBlocks) {
      const body = block.querySelector('.u-block__body') as HTMLElement;
      if (!body) continue;
      
      // Récupérer le contenu Mermaid depuis data-mermaid-content ou le code caché
      const mermaidContent = body?.dataset?.mermaidContent || body?.querySelector('pre code')?.textContent || '';
      
      if (!mermaidContent) continue;
      
      // Vérifier si le bloc a déjà été rendu (éviter double rendu)
      const existingSvg = body.querySelector('.mermaid-svg-container');
      const hasValidSvg = existingSvg && existingSvg.innerHTML.trim() !== '' && existingSvg.querySelector('svg');
      
      // Si le SVG existe ET contient du contenu valide, skip
      if (hasValidSvg) {
        continue; // Déjà rendu et valide
      }
      
      // IMPORTANT : Si le body est vide ou ne contient que le <pre style="display:none">, 
      // c'est qu'il a été vidé par dangerouslySetInnerHTML → il faut re-rendre
      const bodyContent = body.innerHTML.trim();
      const hasOnlyHiddenPre = bodyContent.includes('<pre style="display:none">') && !hasValidSvg;
      
      // Si le body est vide ou ne contient que le pre caché, le vider complètement avant de re-rendre
      if (bodyContent === '' || hasOnlyHiddenPre || (!hasValidSvg && bodyContent)) {
        body.innerHTML = '';
      }
      
      try {
        // Forcer réinitialisation avec htmlLabels: false
        await initializeMermaid({ 
          flowchart: { 
            htmlLabels: false,
            useMaxWidth: true,
            curve: 'basis',
            padding: 8,
            nodeSpacing: 50,
            rankSpacing: 50,
            diagramPadding: 8
          }
        });
        const mermaid = await import('mermaid');
        
        const normalizedContent = normalizeMermaidContent(mermaidContent);
        const id = `mermaid-readonly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const result = await mermaid.default.render(id, normalizedContent);
        
        if (result?.svg) {
          const svgContainer = document.createElement('div');
          svgContainer.className = 'mermaid-svg-container';
          svgContainer.innerHTML = result.svg;
          body.innerHTML = '';
          body.appendChild(svgContainer);
        }
      } catch (error) {
        // En cas d'erreur, afficher le code brut
        body.innerHTML = `<pre><code>${mermaidContent}</code></pre>`;
      }
    }
  }, [container, noteId]);

  const checkAndRenderMermaid = useCallback(async (retryCount = 0): Promise<void> => {
    // Attendre un peu pour que le HTML soit injecté
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    
    if (!container) return;
    
    // Vérifier si des blocs existent déjà
    const existingBlocks = container.querySelectorAll('.u-block--mermaid[data-mermaid="true"]');
    
    // DEBUG: Logger pour diagnostiquer les pages publiques
    if (process.env.NODE_ENV === 'development' && retryCount === 0) {
      logger.debug(LogCategory.EDITOR, '[useMermaidRenderer] checkAndRenderMermaid', {
        retryCount,
        blocksFound: existingBlocks.length,
        containerExists: !!container,
        context: { noteId, operation: 'mermaidRender' }
      });
    }
    
    // Si aucun bloc trouvé et qu'on n'a pas encore réessayé plusieurs fois, réessayer
    if (existingBlocks.length === 0 && retryCount < 10) {
      setTimeout(() => {
        checkAndRenderMermaid(retryCount + 1);
      }, 300 * (retryCount + 1)); // Délai progressif plus long
      return;
    }
    
    if (existingBlocks.length > 0) {
      // Toujours vérifier si les blocs ont besoin d'être rendus
      const needsRendering = Array.from(existingBlocks).some(block => {
        const body = block.querySelector('.u-block__body') as HTMLElement;
        if (!body) return true;
        
        const svgContainer = body.querySelector('.mermaid-svg-container');
        const hasValidSvg = svgContainer && svgContainer.innerHTML.trim() !== '' && svgContainer.querySelector('svg');
        
        // Vérifier si le bloc est vide, n'a pas de SVG valide, ou ne contient que le <pre style="display:none">
        const bodyContent = body.innerHTML.trim();
        const hasOnlyHiddenPre = bodyContent.includes('<pre style="display:none">') && !hasValidSvg;
        const mermaidContent = body?.dataset?.mermaidContent || body?.querySelector('pre code')?.textContent || '';
        
        // DEBUG: Logger si bloc vide détecté
        if (process.env.NODE_ENV === 'development' && !hasValidSvg) {
          logger.debug(LogCategory.EDITOR, '[useMermaidRenderer] Bloc Mermaid vide détecté', {
            hasBody: !!body,
            bodyContent: bodyContent.substring(0, 100),
            hasMermaidContent: !!mermaidContent,
            mermaidContentLength: mermaidContent.length,
            hasOnlyHiddenPre,
            context: { noteId, operation: 'mermaidEmptyBlock' }
          });
        }
        
        return !hasValidSvg || bodyContent === '' || hasOnlyHiddenPre;
      });
      
      if (needsRendering) {
        // Forcer le re-rendu même si certains blocs semblent déjà rendus
        await renderMermaidBlocks();
      }
    }
  }, [container, noteId, renderMermaidBlocks]);

  return {
    renderMermaidBlocks,
    checkAndRenderMermaid
  };
}

