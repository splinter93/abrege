/**
 * Service d'export PDF pour les notes Scrivia
 * 
 * @description Export PDF propre avec formatage professionnel
 * - Utilise l'API Playwright pour une meilleure qualité
 * - Fallback sur html2canvas + jsPDF si l'API n'est pas disponible
 * - Marges optimisées A4
 * - Page breaks intelligents
 * - Support images, tables, embeds
 * - Gestion des cas spéciaux (YouTube, note embeds)
 * 
 * ⚠️ IMPORTANT: Ce service doit être utilisé uniquement côté client
 * Les imports html2canvas et jsPDF ne fonctionnent pas en SSR
 */

// ✅ Import dynamique pour éviter les problèmes SSR
// html2canvas et jsPDF sont des bibliothèques client-only
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { simpleLogger as logger } from '@/utils/logger';

export interface PdfExportOptions {
  title: string;
  htmlContent: string;
  filename?: string;
  headerImage?: string | null;
}

export interface PdfExportResult {
  success: boolean;
  error?: string;
}

/**
 * Prépare un élément DOM pour l'export PDF
 * - Nettoie les éléments non exportables
 * - Formate pour le PDF
 * - Inclut le header image si présent
 * - Retourne un élément DOM prêt pour html2canvas
 */
function prepareElementForPdf(html: string, title: string, headerImage?: string | null): HTMLElement {
  // Créer un conteneur pour le contenu avec styles inline
  const container = document.createElement('div');
  container.style.width = '210mm'; // Largeur A4 exactement
  container.style.padding = '0';
  container.style.margin = '0';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", sans-serif';
  container.style.fontSize = '11pt';
  container.style.lineHeight = '1.6';
  container.style.boxSizing = 'border-box';
  container.style.border = 'none';
  container.style.outline = 'none';
  
  // ✅ Ajouter le header image si présent
  if (headerImage) {
    const headerImageContainer = document.createElement('div');
    headerImageContainer.style.width = '100%';
    headerImageContainer.style.height = '200px';
    headerImageContainer.style.overflow = 'hidden';
    headerImageContainer.style.marginBottom = '0';
    headerImageContainer.style.marginLeft = '0';
    headerImageContainer.style.marginRight = '0';
    headerImageContainer.style.padding = '0';
    headerImageContainer.style.position = 'relative';
    headerImageContainer.style.boxSizing = 'border-box';
    
    const headerImg = document.createElement('img');
    headerImg.src = headerImage;
    headerImg.style.width = '100%';
    headerImg.style.height = '100%';
    headerImg.style.objectFit = 'cover';
    headerImg.style.objectPosition = 'center';
    headerImg.style.display = 'block';
    headerImg.style.margin = '0';
    headerImg.style.padding = '0';
    
    headerImageContainer.appendChild(headerImg);
    container.appendChild(headerImageContainer);
  }
  
  // Conteneur pour le contenu avec padding
  const contentWrapper = document.createElement('div');
  contentWrapper.style.padding = '20mm';
  contentWrapper.style.paddingTop = headerImage ? '24px' : '20mm';
  contentWrapper.style.paddingBottom = '30mm'; // ✅ Marge en bas pour éviter les coupures
  
  // Ajouter le titre
  const titleElement = document.createElement('h1');
  titleElement.textContent = title || 'Note';
  titleElement.style.fontSize = '28pt';
  titleElement.style.marginTop = '0';
  titleElement.style.marginBottom = '16px';
  titleElement.style.pageBreakAfter = 'avoid';
  titleElement.style.color = '#000000';
  titleElement.style.fontWeight = '700';
  titleElement.style.lineHeight = '1.2';
  contentWrapper.appendChild(titleElement);

  // Créer un conteneur pour le contenu HTML
  const contentDiv = document.createElement('div');
  contentDiv.className = 'markdown-body';
  
  // ✅ IMPORTANT: Vérifier que le HTML n'est pas vide
  if (!html || html.trim().length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.textContent = '(Note vide)';
    emptyMsg.style.color = '#666';
    contentDiv.appendChild(emptyMsg);
  } else {
    contentDiv.innerHTML = html;
  }
  
  contentWrapper.appendChild(contentDiv);
  container.appendChild(contentWrapper);

  // Masquer/transformer les éléments non exportables
  const elementsToHide = contentDiv.querySelectorAll(
    '.notion-drag-handle, .slash-menu, .context-menu, .floating-menu, button, .editor-toolbar, .editor-header, .editor-sidebar, .tiptap-editor-container, .u-block__toolbar, .toolbar-left, .toolbar-right'
  );
  elementsToHide.forEach((el) => {
    (el as HTMLElement).style.display = 'none';
  });
  
  // ✅ S'assurer que les tableaux sont bien formatés
  // Supprimer les wrappers qui pourraient cacher les tableaux
  const tableWrappers = contentDiv.querySelectorAll('.table-wrapper-chat, .table-wrapper');
  tableWrappers.forEach((wrapper) => {
    const table = wrapper.querySelector('table');
    if (table && wrapper.parentNode) {
      wrapper.parentNode.insertBefore(table, wrapper);
      wrapper.remove();
    }
  });
  
  // ✅ S'assurer que les blocs de code sont bien formatés
  // Supprimer les toolbars des blocs de code
  const codeToolbars = contentDiv.querySelectorAll('.u-block__toolbar, .code-block-toolbar');
  codeToolbars.forEach((toolbar) => {
    toolbar.remove();
  });
  
  // ✅ Nettoyer les wrappers de blocs de code
  const codeBlockWrappers = contentDiv.querySelectorAll('.u-block--code');
  codeBlockWrappers.forEach((wrapper) => {
    const pre = wrapper.querySelector('pre');
    if (pre && wrapper.parentNode) {
      wrapper.parentNode.insertBefore(pre, wrapper);
      wrapper.remove();
    }
  });

  // Transformer les iframes YouTube en liens
  const youtubeEmbeds = contentDiv.querySelectorAll('.youtube-embed iframe, iframe[src*="youtube"], iframe[src*="youtu.be"]');
  youtubeEmbeds.forEach((iframe) => {
    const src = (iframe as HTMLIFrameElement).src;
    const link = document.createElement('div');
    link.style.padding = '1em';
    link.style.backgroundColor = '#f5f5f5';
    link.style.border = '1px solid #ddd';
    link.style.margin = '1em 0';
    link.style.color = '#000000';
    link.textContent = `🎥 Vidéo YouTube: ${src}`;
    if (iframe.parentNode) {
      iframe.parentNode.replaceChild(link, iframe);
    }
  });

  // Transformer les note embeds en liens
  const noteEmbeds = contentDiv.querySelectorAll('.note-embed');
  noteEmbeds.forEach((embed) => {
    const link = embed.querySelector('a');
    if (link) {
      const linkText = link.textContent || 'Note liée';
      const linkDiv = document.createElement('div');
      linkDiv.style.padding = '0.5em';
      linkDiv.style.backgroundColor = '#f9f9f9';
      linkDiv.style.borderLeft = '3px solid #007bff';
      linkDiv.style.margin = '0.5em 0';
      linkDiv.style.color = '#000000';
      linkDiv.textContent = `📄 ${linkText}`;
      if (embed.parentNode) {
        embed.parentNode.replaceChild(linkDiv, embed);
      }
    }
  });

  // Appliquer les styles CSS aux éléments markdown via une balise style
  // ✅ Styles améliorés avec meilleurs espacements
  const styles = `
    .markdown-body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", sans-serif;
      font-size: 11pt;
      line-height: 1.75;
      color: #1a1a1a;
    }
    .markdown-body h1 { 
      font-size: 24pt; 
      margin-top: 24px; 
      margin-bottom: 16px; 
      page-break-after: avoid; 
      color: #000000; 
      font-weight: 700; 
      line-height: 1.2;
    }
    .markdown-body h2 { 
      font-size: 20pt; 
      margin-top: 32px; 
      margin-bottom: 12px; 
      page-break-after: avoid; 
      color: #000000; 
      font-weight: 600; 
      line-height: 1.3;
    }
    .markdown-body h3 { 
      font-size: 16pt; 
      margin-top: 24px; 
      margin-bottom: 10px; 
      page-break-after: avoid; 
      color: #000000; 
      font-weight: 600; 
      line-height: 1.4;
    }
    .markdown-body h4 { 
      font-size: 14pt; 
      margin-top: 20px; 
      margin-bottom: 8px; 
      page-break-after: avoid; 
      color: #000000; 
      font-weight: 600; 
    }
    .markdown-body p { 
      margin: 12px 0; 
      orphans: 3; 
      widows: 3; 
      color: #1a1a1a; 
    }
    .markdown-body code {
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace; 
      font-size: 9.5pt; 
      background: #f0f0f0; 
      padding: 0.2em 0.4em; 
      border-radius: 3px; 
      color: #d63384;
      border: 1px solid #e0e0e0;
    }
    .markdown-body pre { 
      padding: 16px 20px; 
      overflow-x: auto; 
      overflow-y: visible;
      page-break-inside: avoid; 
      background: #f8f8f8;
      border: 1px solid #d0d0d0;
      border-left: 4px solid #007bff;
      border-radius: 4px;
      margin: 20px 0;
      display: block;
      white-space: pre;
      word-wrap: normal;
    }
    .markdown-body pre code {
      background: transparent;
      padding: 0;
      border-radius: 0;
      border: none;
      color: #1a1a1a;
      font-size: 9pt;
      display: block;
      white-space: pre;
      overflow-x: auto;
    }
    .markdown-body blockquote { 
      border-left: 4px solid #007bff; 
      padding-left: 20px; 
      margin: 20px 0; 
      page-break-inside: avoid; 
      color: #333333; 
      font-style: italic;
      background: #f9f9f9;
      padding: 16px 20px;
      border-radius: 4px;
    }
    .markdown-body table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 20px 0; 
      page-break-inside: avoid; 
      border: 1px solid #d0d0d0;
      display: table;
      table-layout: auto;
      background-color: #ffffff;
    }
    .markdown-body table thead {
      display: table-header-group;
    }
    .markdown-body table tbody {
      display: table-row-group;
    }
    .markdown-body table tr {
      display: table-row;
      border-bottom: 1px solid #e0e0e0;
    }
    .markdown-body table th, .markdown-body table td { 
      border: 1px solid #d0d0d0; 
      padding: 12px 14px; 
      text-align: left; 
      color: #1a1a1a;
      display: table-cell;
      vertical-align: top;
    }
    .markdown-body table th { 
      background-color: #f5f5f5; 
      font-weight: 600;
      border-bottom: 2px solid #d0d0d0;
    }
    .markdown-body table tr:nth-child(even) {
      background-color: #fafafa;
    }
    .markdown-body table tr:hover {
      background-color: #f0f0f0;
    }
    .markdown-body img { 
      max-width: 100%; 
      height: auto; 
      page-break-inside: avoid; 
      margin: 20px 0;
      border-radius: 4px;
    }
    .markdown-body ul, .markdown-body ol { 
      margin: 16px 0; 
      padding-left: 2.5em; 
    }
    .markdown-body li { 
      margin: 8px 0; 
      color: #1a1a1a; 
      line-height: 1.6;
    }
    .markdown-body a { 
      color: #007bff; 
      text-decoration: none;
    }
    .markdown-body a:hover {
      text-decoration: underline;
    }
    .markdown-body hr {
      border: none;
      border-top: 2px solid #e0e0e0;
      margin: 32px 0;
      page-break-inside: avoid;
    }
    .markdown-body strong {
      font-weight: 600;
      color: #000000;
    }
    .markdown-body em {
      font-style: italic;
    }
    /* ✅ Forcer l'affichage des éléments de structure */
    .markdown-body * {
      box-sizing: border-box;
    }
    /* ✅ S'assurer que les tableaux sont visibles */
    .markdown-body table,
    .markdown-body table * {
      visibility: visible !important;
      display: revert !important;
    }
    /* ✅ S'assurer que les blocs de code sont visibles */
    .markdown-body pre,
    .markdown-body code {
      visibility: visible !important;
      display: revert !important;
    }
    /* ✅ Styles pour les listes */
    .markdown-body ul {
      list-style-type: disc;
    }
    .markdown-body ol {
      list-style-type: decimal;
    }
    /* ✅ Styles pour les liens */
    .markdown-body a {
      color: #007bff;
      text-decoration: underline;
    }
  `;
  
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  container.appendChild(styleElement);

  // ✅ Debug: Log le contenu
  logger.info('[pdfExportService] Élément préparé', {
    title,
    htmlLength: html.length,
    containerHTML: container.innerHTML.substring(0, 500),
    textContent: container.textContent?.substring(0, 200)
  });

  return container;
}

/**
 * Attend que toutes les images soient chargées
 */
function waitForImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll('img');
  if (images.length === 0) return Promise.resolve();

  return Promise.all(
    Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Continuer même si une image échoue
        // Timeout après 5 secondes
        setTimeout(() => resolve(), 5000);
      });
    })
  ).then(() => undefined);
}

/**
 * Exporte une note en PDF
 * 
 * @param options - Options d'export (titre, contenu HTML, nom de fichier)
 * @returns Résultat de l'export
 */
export async function exportNoteToPdf(
  options: PdfExportOptions
): Promise<PdfExportResult> {
  try {
    const { title, htmlContent, filename = `${title || 'note'}.pdf`, headerImage } = options;

    if (!htmlContent || htmlContent.trim().length === 0) {
      return {
        success: false,
        error: 'Contenu HTML vide'
      };
    }
    
    // ✅ Essayer d'abord avec l'API Playwright (meilleure qualité)
    try {
      // ✅ Récupérer le token d'authentification
      const { supabase } = await import('@/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // ✅ Ajouter le token d'authentification si disponible
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        logger.warn('[pdfExportService] Pas de token disponible, authentification échouera probablement');
      }
      
      const response = await fetch('/api/pdf/export', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          htmlContent,
          headerImage
        })
      });

      if (response.ok) {
        // ✅ Récupérer le PDF et le télécharger
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        logger.info('[pdfExportService] PDF généré via Playwright avec succès');
        return { success: true };
      } else {
        // Si l'API échoue, fallback sur html2canvas
        logger.warn('[pdfExportService] API Playwright indisponible, fallback sur html2canvas');
      }
    } catch (apiError) {
      // Si l'API n'est pas disponible, fallback sur html2canvas
      logger.warn('[pdfExportService] Erreur API Playwright, fallback sur html2canvas', { apiError });
    }
    
    // ✅ Fallback: Utiliser html2canvas + jsPDF (méthode originale)

    // Préparer l'élément DOM pour le PDF
    const tempElement = prepareElementForPdf(htmlContent, title, options.headerImage);

    // Positionner l'élément visible pour html2canvas
    // ✅ IMPORTANT: html2canvas a besoin que l'élément soit dans le viewport visible
    tempElement.style.position = 'fixed';
    tempElement.style.left = '0';
    tempElement.style.top = '0';
    tempElement.style.width = '210mm';
    tempElement.style.minHeight = '297mm'; // Hauteur A4
    tempElement.style.visibility = 'visible';
    tempElement.style.opacity = '1';
    tempElement.style.zIndex = '9999';
    tempElement.style.overflow = 'visible';
    tempElement.style.display = 'block';
    
    // Ajouter au DOM
    document.body.appendChild(tempElement);
    
    // ✅ Forcer le reflow pour s'assurer que le contenu est rendu
    void tempElement.offsetHeight;
    void tempElement.offsetWidth;

    try {
      // Attendre que les images soient chargées
      await waitForImages(tempElement);
      
      // ✅ Attendre plusieurs frames pour s'assurer que le rendu est complet
      // html2canvas a besoin que l'élément soit complètement rendu dans le viewport
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // Délai supplémentaire pour le rendu CSS
      await new Promise(resolve => setTimeout(resolve, 300));

      // Vérifier que l'élément a du contenu visible
      const hasContent = tempElement.textContent && tempElement.textContent.trim().length > 0;
      const elementHeight = tempElement.offsetHeight;
      const elementWidth = tempElement.offsetWidth;
      
      logger.info('[pdfExportService] État avant génération PDF', {
        hasContent,
        textContentLength: tempElement.textContent?.length || 0,
        elementHeight,
        elementWidth,
        htmlLength: htmlContent.length,
        elementHTMLPreview: tempElement.innerHTML.substring(0, 300)
      });

      if (!hasContent || elementHeight === 0) {
        const errorMsg = 'Aucun contenu visible dans l\'élément pour l\'export PDF';
        logger.error('[pdfExportService] ' + errorMsg, {
          htmlLength: htmlContent.length,
          elementHTML: tempElement.innerHTML.substring(0, 500),
          textContent: tempElement.textContent?.substring(0, 200)
        });
        return {
          success: false,
          error: errorMsg
        };
      }

      // ✅ NOUVELLE APPROCHE: html2canvas + jsPDF directement
      // Plus de contrôle et plus fiable que html2pdf.js
      logger.info('[pdfExportService] Début génération PDF', {
        elementVisible: tempElement.offsetHeight > 0,
        elementWidth: tempElement.offsetWidth,
        elementHeight: tempElement.offsetHeight,
        computedStyle: window.getComputedStyle(tempElement).display
      });
      
      // ✅ S'assurer que l'élément est visible et dans le viewport
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      window.scrollTo(0, 0);
      
      try {
        // ✅ Vérifier que l'élément a des dimensions valides avant capture
        const elementWidth = tempElement.offsetWidth || tempElement.scrollWidth;
        const elementHeight = tempElement.offsetHeight || tempElement.scrollHeight;
        
        if (elementWidth === 0 || elementHeight === 0) {
          throw new Error(`Élément avec dimensions invalides: ${elementWidth}x${elementHeight}`);
        }
        
        // ✅ Vérifier que toutes les images sont chargées et ont des dimensions
        const images = tempElement.querySelectorAll('img');
        for (const img of Array.from(images)) {
          const htmlImg = img as HTMLImageElement;
          if (!htmlImg.complete || htmlImg.naturalWidth === 0 || htmlImg.naturalHeight === 0) {
            logger.warn('[pdfExportService] Image non chargée détectée, attente...', {
              src: htmlImg.src.substring(0, 100),
              complete: htmlImg.complete,
              naturalWidth: htmlImg.naturalWidth,
              naturalHeight: htmlImg.naturalHeight
            });
            // Attendre que l'image se charge
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error(`Timeout chargement image: ${htmlImg.src.substring(0, 100)}`));
              }, 5000);
              htmlImg.onload = () => {
                clearTimeout(timeout);
                resolve(undefined);
              };
              htmlImg.onerror = () => {
                clearTimeout(timeout);
                // Ignorer les erreurs de chargement d'image
                resolve(undefined);
              };
              // Si l'image est déjà chargée
              if (htmlImg.complete && htmlImg.naturalWidth > 0) {
                clearTimeout(timeout);
                resolve(undefined);
              }
            });
          }
        }
        
        // 1. Capturer l'élément avec html2canvas
        const canvas = await html2canvas(tempElement, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: process.env.NODE_ENV === 'development',
          windowWidth: elementWidth || 794,
          windowHeight: elementHeight || 1123,
          ignoreElements: (element) => {
            // ✅ Ignorer les éléments avec dimensions 0
            if (element instanceof HTMLElement) {
              const width = element.offsetWidth || element.scrollWidth;
              const height = element.offsetHeight || element.scrollHeight;
              if (width === 0 || height === 0) {
                return true;
              }
            }
            return false;
          },
          onclone: (clonedDoc: Document) => {
            const clonedElement = clonedDoc.body.firstElementChild as HTMLElement;
            if (clonedElement) {
              clonedElement.style.visibility = 'visible';
              clonedElement.style.opacity = '1';
              clonedElement.style.display = 'block';
              
              // ✅ Supprimer les éléments avec dimensions 0 dans le clone
              const allElements = clonedElement.querySelectorAll('*');
              allElements.forEach((el) => {
                const htmlEl = el as HTMLElement;
                const width = htmlEl.offsetWidth || htmlEl.scrollWidth;
                const height = htmlEl.offsetHeight || htmlEl.scrollHeight;
                if (width === 0 || height === 0) {
                  // Supprimer les styles de fond qui pourraient causer des problèmes
                  htmlEl.style.backgroundImage = 'none';
                  htmlEl.style.background = 'none';
                }
              });
            }
          }
        });
        
        logger.info('[pdfExportService] Canvas généré', {
          canvasWidth: canvas.width,
          canvasHeight: canvas.height
        });
        
        // 2. Convertir le canvas en image
        const imgData = canvas.toDataURL('image/png', 1.0);
        
        if (!imgData || imgData === 'data:,') {
          throw new Error('Échec de la conversion canvas en image');
        }
        
        logger.info('[pdfExportService] Image générée', {
          imgDataLength: imgData.length,
          imgDataPreview: imgData.substring(0, 100)
        });
        
        // 3. Créer le PDF avec jsPDF
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        // Dimensions A4 en mm
        const pdfWidth = 210;
        const pdfHeight = 297;
        
        // ✅ Calculer les dimensions pour que le canvas prenne exactement toute la largeur
        // Le canvas a été créé avec width: 210mm
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Conversion : 1mm = 3.779527559 pixels à 96 DPI
        // À scale: 2, 1mm = 7.559 pixels
        const mmToPx = 3.779527559 * 2; // scale: 2
        
        // Largeur attendue en pixels pour 210mm exactement
        const expectedWidthPx = pdfWidth * mmToPx;
        
        // Ratio pour ajuster si le canvas a une largeur légèrement différente
        // Cela élimine les quelques pixels de vide à droite
        const widthRatio = expectedWidthPx / canvasWidth;
        
        // Dimensions finales : largeur = 210mm exactement, hauteur proportionnelle
        const finalWidth = pdfWidth; // Exactement 210mm, pas de marge
        const finalHeight = (canvasHeight / mmToPx) * widthRatio;
        
        logger.info('[pdfExportService] Dimensions PDF', {
          canvasWidth,
          canvasHeight,
          expectedWidthPx,
          widthRatio,
          finalWidth,
          finalHeight,
          pdfHeight,
          needsMultiplePages: finalHeight > pdfHeight
        });
        
        // ✅ Gérer la pagination si le contenu dépasse une page
        // Hauteur disponible par page (avec marge en bas)
        const availableHeight = pdfHeight; // 297mm par page
        
        if (finalHeight <= availableHeight) {
          // Une seule page suffit
          pdf.addImage(imgData, 'PNG', 0, 0, finalWidth, finalHeight, undefined, 'FAST');
        } else {
          // Plusieurs pages nécessaires
          // Calculer combien de pages sont nécessaires
          const totalPages = Math.ceil(finalHeight / availableHeight);
          
          logger.info('[pdfExportService] Pagination multi-pages', {
            totalPages,
            finalHeight,
            availableHeight
          });
          
          // Découper l'image en plusieurs pages
          for (let page = 0; page < totalPages; page++) {
            if (page > 0) {
              pdf.addPage();
            }
            
            // Position Y sur le canvas source (en pixels)
            const sourceY = (canvasHeight / totalPages) * page;
            // Hauteur de cette page (en pixels)
            const sourceHeight = Math.min(
              canvasHeight / totalPages, 
              canvasHeight - sourceY
            );
            
            // Créer un canvas temporaire pour cette page
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvasWidth;
            pageCanvas.height = sourceHeight;
            const pageCtx = pageCanvas.getContext('2d');
            
            if (pageCtx) {
              // Copier la portion du canvas original
              pageCtx.drawImage(
                canvas,
                0, sourceY, // Position source (x, y)
                canvasWidth, sourceHeight, // Dimensions source
                0, 0, // Position destination
                canvasWidth, sourceHeight // Dimensions destination
              );
              
              // Convertir en image
              const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
              
              // Dimensions de la page en mm
              const pageHeightMm = (sourceHeight / mmToPx) * widthRatio;
              
              // Ajouter la page au PDF (avec marge en bas automatique)
              pdf.addImage(pageImgData, 'PNG', 0, 0, finalWidth, pageHeightMm, undefined, 'FAST');
            }
          }
        }
        
        // 4. Sauvegarder le PDF
        pdf.save(filename.replace(/[^a-z0-9]/gi, '_').toLowerCase());
        
        logger.info('[pdfExportService] PDF généré et sauvegardé avec succès');
      } finally {
        // Restaurer la position de scroll
        window.scrollTo(scrollX, scrollY);
      }

      logger.info('[pdfExportService] PDF généré avec succès', {
        filename,
        titleLength: title.length,
        htmlLength: htmlContent.length
      });

      return { success: true };
    } finally {
      // ✅ IMPORTANT: Cacher l'élément au lieu de le supprimer immédiatement
      // jsPDF.save() est asynchrone et peut avoir besoin de l'élément pendant la génération
      // On cache d'abord pour qu'il ne soit plus visible
      if (tempElement) {
        tempElement.style.display = 'none';
        tempElement.style.visibility = 'hidden';
        tempElement.style.opacity = '0';
      }
      
      // ✅ Attendre que le PDF soit vraiment téléchargé avant de supprimer
      // Le délai permet à jsPDF de terminer la conversion et le téléchargement
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Nettoyer l'élément temporaire de manière sécurisée
      if (tempElement && tempElement.parentNode === document.body) {
        try {
          document.body.removeChild(tempElement);
          logger.info('[pdfExportService] Élément temporaire supprimé');
        } catch (error) {
          logger.warn('[pdfExportService] Erreur lors de la suppression de l\'élément', { error });
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.error('[pdfExportService] Erreur génération PDF', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });

    return {
      success: false,
      error: errorMessage
    };
  }
}

