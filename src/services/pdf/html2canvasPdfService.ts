/**
 * Service PDF via html2canvas + jsPDF
 * 
 * @description Génère un PDF via html2canvas (fallback si Playwright indisponible)
 * - Capture DOM en canvas
 * - Conversion canvas → PDF
 * - Pagination multi-pages
 * - Gestion images et rendu
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { simpleLogger as logger } from '@/utils/logger';
import { prepareElementForPdf } from '@/utils/pdf/prepareElementForPdf';
import { waitForImages } from '@/utils/pdf/waitForImages';
import { addPaginationToPdf } from './pdfPaginationService';

export interface Html2CanvasPdfOptions {
  htmlContent: string;
  title: string;
  filename: string;
  headerImage?: string | null;
}

export interface Html2CanvasPdfResult {
  success: boolean;
  error?: string;
}

/**
 * Attend que le rendu soit complet avant capture
 */
async function waitForRenderComplete(element: HTMLElement): Promise<void> {
  // Attendre plusieurs frames pour s'assurer que le rendu est complet
  await new Promise(resolve => requestAnimationFrame(resolve));
  await new Promise(resolve => requestAnimationFrame(resolve));
  await new Promise(resolve => requestAnimationFrame(resolve));
  
  // Délai supplémentaire pour le rendu CSS
  await new Promise(resolve => setTimeout(resolve, 300));
}

/**
 * Vérifie que toutes les images sont chargées avec dimensions valides
 */
async function ensureAllImagesLoaded(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll('img');
  
  for (const img of Array.from(images)) {
    const htmlImg = img as HTMLImageElement;
    if (!htmlImg.complete || htmlImg.naturalWidth === 0 || htmlImg.naturalHeight === 0) {
      logger.warn('[html2canvasPdfService] Image non chargée détectée, attente...', {
        src: htmlImg.src.substring(0, 100),
        complete: htmlImg.complete,
        naturalWidth: htmlImg.naturalWidth,
        naturalHeight: htmlImg.naturalHeight
      });
      
      // Attendre que l'image se charge
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          resolve(); // Timeout : continuer même si l'image ne charge pas
        }, 5000);
        
        htmlImg.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
        
        htmlImg.onerror = () => {
          clearTimeout(timeout);
          resolve(); // Ignorer les erreurs de chargement
        };
        
        // Si l'image est déjà chargée
        if (htmlImg.complete && htmlImg.naturalWidth > 0) {
          clearTimeout(timeout);
          resolve();
        }
      });
    }
  }
}

/**
 * Positionne l'élément pour html2canvas
 */
function positionElementForCapture(element: HTMLElement): void {
  element.style.position = 'fixed';
  element.style.left = '0';
  element.style.top = '0';
  element.style.width = '210mm';
  element.style.minHeight = '297mm';
  element.style.visibility = 'visible';
  element.style.opacity = '1';
  element.style.zIndex = '9999';
  element.style.overflow = 'visible';
  element.style.display = 'block';
}

/**
 * Nettoie l'élément temporaire après génération
 */
async function cleanupTempElement(element: HTMLElement): Promise<void> {
  // Cacher l'élément
  element.style.display = 'none';
  element.style.visibility = 'hidden';
  element.style.opacity = '0';
  
  // Attendre que le PDF soit téléchargé
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Supprimer l'élément
  if (element.parentNode === document.body) {
    try {
      document.body.removeChild(element);
      logger.info('[html2canvasPdfService] Élément temporaire supprimé');
    } catch (error) {
      logger.warn('[html2canvasPdfService] Erreur lors de la suppression de l\'élément', { error });
    }
  }
}

/**
 * Génère un PDF via html2canvas + jsPDF
 * 
 * @param options - Options d'export PDF
 * @returns Résultat de l'export
 */
export async function generatePdfWithHtml2Canvas(
  options: Html2CanvasPdfOptions
): Promise<Html2CanvasPdfResult> {
  const { htmlContent, title, filename, headerImage } = options;
  
  // Préparer l'élément DOM
  const tempElement = prepareElementForPdf(htmlContent, title, headerImage);
  
  // Positionner l'élément pour html2canvas
  positionElementForCapture(tempElement);
  
  // Ajouter au DOM
  document.body.appendChild(tempElement);
  
  // Forcer le reflow
  void tempElement.offsetHeight;
  void tempElement.offsetWidth;
  
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;
  window.scrollTo(0, 0);
  
  try {
    // Attendre que les images soient chargées
    await waitForImages(tempElement);
    await ensureAllImagesLoaded(tempElement);
    await waitForRenderComplete(tempElement);
    
    // Vérifier que l'élément a du contenu visible
    const hasContent = tempElement.textContent && tempElement.textContent.trim().length > 0;
    const elementHeight = tempElement.offsetHeight;
    const elementWidth = tempElement.offsetWidth;
    
    if (!hasContent || elementHeight === 0) {
      const errorMsg = 'Aucun contenu visible dans l\'élément pour l\'export PDF';
      logger.error('[html2canvasPdfService] ' + errorMsg, {
        htmlLength: htmlContent.length,
        elementHTML: tempElement.innerHTML.substring(0, 500),
        textContent: tempElement.textContent?.substring(0, 200)
      });
      return {
        success: false,
        error: errorMsg
      };
    }
    
    // Vérifier dimensions valides
    const finalElementWidth = elementWidth || tempElement.scrollWidth;
    const finalElementHeight = elementHeight || tempElement.scrollHeight;
    
    if (finalElementWidth === 0 || finalElementHeight === 0) {
      throw new Error(`Élément avec dimensions invalides: ${finalElementWidth}x${finalElementHeight}`);
    }
    
    // Capturer l'élément avec html2canvas
    const canvas = await html2canvas(tempElement, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: process.env.NODE_ENV === 'development',
      windowWidth: finalElementWidth || 794,
      windowHeight: finalElementHeight || 1123,
      ignoreElements: (element) => {
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
          
          // Supprimer les styles de fond des éléments avec dimensions 0
          const allElements = clonedElement.querySelectorAll('*');
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const width = htmlEl.offsetWidth || htmlEl.scrollWidth;
            const height = htmlEl.offsetHeight || htmlEl.scrollHeight;
            if (width === 0 || height === 0) {
              htmlEl.style.backgroundImage = 'none';
              htmlEl.style.background = 'none';
            }
          });
        }
      }
    });
    
    logger.info('[html2canvasPdfService] Canvas généré', {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height
    });
    
    // Convertir le canvas en image
    const imgData = canvas.toDataURL('image/png', 1.0);
    
    if (!imgData || imgData === 'data:,') {
      throw new Error('Échec de la conversion canvas en image');
    }
    
    // Créer le PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Dimensions A4
    const pdfWidth = 210;
    const pdfHeight = 297;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Conversion mm → pixels (scale: 2)
    const mmToPx = 3.779527559 * 2;
    const expectedWidthPx = pdfWidth * mmToPx;
    const widthRatio = expectedWidthPx / canvasWidth;
    const finalHeight = (canvasHeight / mmToPx) * widthRatio;
    
    logger.info('[html2canvasPdfService] Dimensions PDF', {
      canvasWidth,
      canvasHeight,
      finalHeight,
      pdfHeight,
      needsMultiplePages: finalHeight > pdfHeight
    });
    
    // Ajouter pagination si nécessaire
    if (finalHeight <= pdfHeight) {
      // Une seule page
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, finalHeight, undefined, 'FAST');
    } else {
      // Multi-pages
      addPaginationToPdf({
        pdf,
        canvas,
        pdfWidth,
        pdfHeight,
        mmToPx,
        widthRatio
      });
    }
    
    // Sauvegarder le PDF
    pdf.save(filename.replace(/[^a-z0-9]/gi, '_').toLowerCase());
    
    logger.info('[html2canvasPdfService] PDF généré avec succès', {
      filename,
      titleLength: title.length,
      htmlLength: htmlContent.length
    });
    
    return { success: true };
  } finally {
    // Restaurer scroll
    window.scrollTo(scrollX, scrollY);
    // Nettoyer l'élément
    await cleanupTempElement(tempElement);
  }
}

