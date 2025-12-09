import React, { useEffect, useRef } from 'react';
import '@/styles/editor-markdown.css';
import TableOfContents from './TableOfContents';
import { extractTOCWithSlugs } from '../utils/markdownTOC';
import { initializeMermaid } from '@/services/mermaid/mermaidConfig';
import { normalizeMermaidContent } from '@/components/chat/mermaidService';

interface EditorPreviewProps {
  title: string;
  htmlContent: string;
  headerImage?: string | null;
  titleAlign?: 'left' | 'center' | 'right';
  markdownContent?: string;
}

const EditorPreview: React.FC<EditorPreviewProps> = ({ title, htmlContent, headerImage, titleAlign = 'left', markdownContent = '' }) => {
  const markdownBodyRef = useRef<HTMLDivElement>(null);
  
  // Génère la TOC à partir du markdown
  const tocHeadings = React.useMemo(() => {
    return extractTOCWithSlugs(markdownContent).map(h => ({
      id: h.slug,
      text: h.title,
      level: h.level
    }));
  }, [markdownContent]);

  // Calculer la hauteur du header image pour placer la TOC juste en dessous
  const headerHeight = headerImage ? 300 : 0;

  // ✅ Rendre les diagrammes Mermaid dans le preview
  useEffect(() => {
    if (!markdownBodyRef.current || !htmlContent) return;
    
    const container = markdownBodyRef.current;
    
    const renderMermaidBlocks = async (retryCount = 0): Promise<void> => {
      // Attendre que le DOM soit mis à jour
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      
      if (!container) return;
      
      const mermaidBlocks = container.querySelectorAll('.u-block--mermaid[data-mermaid="true"]');
      
      // Si aucun bloc trouvé, réessayer
      if (mermaidBlocks.length === 0 && retryCount < 3) {
        setTimeout(() => {
          renderMermaidBlocks(retryCount + 1);
        }, 150 * (retryCount + 1));
        return;
      }
      
      for (const block of mermaidBlocks) {
        const body = block.querySelector('.u-block__body') as HTMLElement;
        if (!body) continue;
        
        // Vérifier si déjà rendu
        const existingSvg = body.querySelector('.mermaid-svg-container');
        if (existingSvg && existingSvg.innerHTML.trim() !== '') {
          continue;
        }
        
        // Récupérer le contenu Mermaid
        const mermaidContent = body?.dataset?.mermaidContent || body?.querySelector('pre code')?.textContent || '';
        
        if (mermaidContent) {
          // Vider le body si nécessaire
          if (body.innerHTML.trim() && !existingSvg) {
            body.innerHTML = '';
          }
          
          try {
            await initializeMermaid({ 
              flowchart: { 
                htmlLabels: false
              } as any 
            });
            const mermaid = await import('mermaid');
            
            const normalizedContent = normalizeMermaidContent(mermaidContent);
            const id = `mermaid-preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      }
    };
    
    // Utiliser MutationObserver pour détecter l'injection du HTML
    const observer = new MutationObserver(() => {
      const mermaidBlocks = container.querySelectorAll('.u-block--mermaid[data-mermaid="true"]');
      if (mermaidBlocks.length > 0) {
        observer.disconnect();
        renderMermaidBlocks();
      }
    });
    
    observer.observe(container, {
      childList: true,
      subtree: true
    });
    
    // Fallback
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      renderMermaidBlocks();
    }, 200);
    
    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [htmlContent]);

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: 64, overflowY: 'auto', height: '100vh' }}>
      {headerImage && (
        <div style={{ width: '100%', maxHeight: 300, overflow: 'hidden', marginBottom: 32 }}>
          <img
            src={headerImage}
            alt="Header"
            style={{ width: '100%', objectFit: 'cover', maxHeight: 300, borderRadius: 0 }}
            draggable={false}
          />
        </div>
      )}
      {/* TOC collée à droite */}
      <div style={{ position: 'fixed', top: headerHeight + 32, right: 0, zIndex: 100, minWidth: 32, maxWidth: 300, padding: '24px 18px 24px 0', boxSizing: 'border-box' }}>
        <TableOfContents headings={tocHeadings} />
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', margin: '0 auto', marginBottom: 32, gap: 32 }}>
        <div style={{ maxWidth: 'var(--editor-content-width)', width: 'var(--editor-content-width)' }}>
          <h1 style={{
            fontSize: 'var(--editor-title-size)',
            fontWeight: 700,
            color: 'var(--editor-text-color)',
            margin: 0,
            padding: 0,
            textAlign: titleAlign,
            maxWidth: 'var(--editor-content-width)',
            width: 'var(--editor-content-width)',
            lineHeight: 1.1,
            fontFamily: 'var(--editor-font-family)',
          }}>{title}</h1>
          <div style={{ height: 18 }} />
          <div
            ref={markdownBodyRef}
            className="markdown-body"
            style={{
              maxWidth: 'var(--editor-content-width)',
              width: 'var(--editor-content-width)',
              margin: '0 auto',
              background: 'none',
              padding: '0 0 64px 0',
              fontSize: 'var(--editor-body-size)',
              color: 'var(--editor-text-color)',
              minHeight: '60vh',
              pointerEvents: 'none',
              userSelect: 'text',
            }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>
    </div>
  );
};

export default EditorPreview; 