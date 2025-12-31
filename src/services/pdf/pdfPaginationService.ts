/**
 * Service de pagination PDF
 * 
 * @description Gère la pagination multi-pages pour les PDFs générés avec html2canvas
 * - Découpe le canvas en plusieurs pages si nécessaire
 * - Calcul des dimensions A4
 * - Ajout des pages au PDF
 */

import { jsPDF } from 'jspdf';

export interface PaginationOptions {
  pdf: jsPDF;
  canvas: HTMLCanvasElement;
  pdfWidth: number; // 210mm pour A4
  pdfHeight: number; // 297mm pour A4
  mmToPx: number; // Conversion mm vers pixels
  widthRatio: number; // Ratio de largeur pour ajustement
}

/**
 * Ajoute la pagination au PDF si le contenu dépasse une page
 * 
 * @param options - Options de pagination
 */
export function addPaginationToPdf(options: PaginationOptions): void {
  const { pdf, canvas, pdfWidth, pdfHeight, mmToPx, widthRatio } = options;
  
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  // Calculer la hauteur finale en mm
  const finalHeight = (canvasHeight / mmToPx) * widthRatio;
  const availableHeight = pdfHeight; // 297mm par page
  
  if (finalHeight <= availableHeight) {
    // Une seule page suffit
    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, finalHeight, undefined, 'FAST');
    return;
  }
  
  // Plusieurs pages nécessaires
  const totalPages = Math.ceil(finalHeight / availableHeight);
  
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
      
      // Ajouter la page au PDF
      pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, pageHeightMm, undefined, 'FAST');
    }
  }
}

