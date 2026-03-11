/**
 * Service d'export PDF pour les notes Scrivia
 * 
 * @description Orchestrateur principal pour l'export PDF
 * - Utilise l'API Playwright en priorité (meilleure qualité)
 * - Fallback sur html2canvas + jsPDF si l'API n'est pas disponible
 * - Gestion centralisée des erreurs
 * 
 * ⚠️ IMPORTANT: Ce service doit être utilisé uniquement côté client
 * Les imports html2canvas et jsPDF ne fonctionnent pas en SSR
 */

import { simpleLogger as logger } from '@/utils/logger';
import { generatePdfWithPlaywright } from './pdf/playwrightPdfService';
import { generatePdfWithHtml2Canvas } from './pdf/html2canvasPdfService';

export interface PdfExportOptions {
  title: string;
  htmlContent: string;
  filename?: string;
  fontFamily?: string | null;
  headerImage?: string | null;
  headerImageOffset?: number | null;
  headerImageBlur?: number | null;
  headerImageOverlay?: number | null;
  headerTitleInImage?: boolean;
}

export interface PdfExportResult {
  success: boolean;
  error?: string;
  degraded?: boolean;
  warning?: string;
}

/**
 * Exporte une note en PDF
 * 
 * @description Orchestrateur principal qui essaie Playwright en premier,
 * puis fallback sur html2canvas si échec
 * 
 * @param options - Options d'export (titre, contenu HTML, nom de fichier)
 * @returns Résultat de l'export
 */
export async function exportNoteToPdf(
  options: PdfExportOptions
): Promise<PdfExportResult> {
  try {
    const {
      title,
      htmlContent,
      filename = `${title || 'note'}.pdf`,
      fontFamily,
      headerImage,
      headerImageOffset,
      headerImageBlur,
      headerImageOverlay,
      headerTitleInImage,
    } = options;

    // Validation du contenu
    if (!htmlContent || htmlContent.trim().length === 0) {
      return {
        success: false,
        error: 'Contenu HTML vide'
      };
    }
    
    // Essayer d'abord avec l'API Playwright (meilleure qualité)
    logger.info('[pdfExportService] Tentative export via Playwright...');
    const playwrightResult = await generatePdfWithPlaywright({
      title,
      htmlContent,
      filename,
      fontFamily,
      headerImage,
      headerImageOffset,
      headerImageBlur,
      headerImageOverlay,
      headerTitleInImage,
    });

    if (playwrightResult.success) {
      logger.info('[pdfExportService] ✅ PDF généré via Playwright avec succès');
      return playwrightResult;
    }

    // Fallback sur html2canvas si Playwright échoue
    logger.warn('[pdfExportService] ⚠️ API Playwright indisponible, fallback sur html2canvas', {
      playwrightError: playwrightResult.error,
      note: 'Vérifier les logs ci-dessus pour comprendre pourquoi Playwright a échoué'
    });

    const html2canvasResult = await generatePdfWithHtml2Canvas({
      htmlContent,
      title,
      filename,
      fontFamily,
      headerImage,
      headerImageOffset,
      headerImageBlur,
      headerImageOverlay,
      headerTitleInImage,
    });

    if (html2canvasResult.success) {
      logger.warn('[pdfExportService] PDF généré via fallback html2canvas (rendu dégradé)', {
        note: 'Le texte est rasterisé et le rendu peut différer du mode A4 Playwright.'
      });
      return {
        success: true,
        degraded: true,
        warning: 'Export réalisé via le fallback rasterisé. Le rendu peut être moins fidèle.',
      };
    }

    // Les deux méthodes ont échoué
    logger.error('[pdfExportService] Toutes les méthodes d\'export ont échoué', {
      playwrightError: playwrightResult.error,
      html2canvasError: html2canvasResult.error
    });

    return {
      success: false,
      error: html2canvasResult.error || 'Erreur lors de l\'export PDF'
    };

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
