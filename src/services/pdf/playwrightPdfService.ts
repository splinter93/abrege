/**
 * Service PDF via Playwright API
 * 
 * @description Génère un PDF via l'API Playwright externe
 * - Meilleure qualité de rendu
 * - Support multi-pages automatique
 * - Gestion authentification
 */

import { simpleLogger as logger } from '@/utils/logger';

export interface PlaywrightPdfOptions {
  title: string;
  htmlContent: string;
  filename?: string;
  headerImage?: string | null;
}

export interface PlaywrightPdfResult {
  success: boolean;
  error?: string;
}

/**
 * Génère un PDF via l'API Playwright
 * 
 * @param options - Options d'export PDF
 * @returns Résultat de l'export
 */
export async function generatePdfWithPlaywright(
  options: PlaywrightPdfOptions
): Promise<PlaywrightPdfResult> {
  try {
    const { title, htmlContent, filename = `${options.title || 'note'}.pdf`, headerImage } = options;

    // Récupérer le token d'authentification
    const { supabase } = await import('@/supabaseClient');
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Ajouter le token d'authentification si disponible
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    } else {
      logger.warn('[playwrightPdfService] Pas de token disponible, authentification échouera probablement');
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
      // Vérifier que c'est bien un PDF
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        const errorText = await response.text().catch(() => 'Unknown error');
        logger.error('[playwrightPdfService] Réponse non-PDF reçue', {
          contentType,
          preview: errorText.substring(0, 200)
        });
        return {
          success: false,
          error: `Réponse non-PDF: ${contentType}`
        };
      }
      
      // Récupérer le PDF et le télécharger
      const blob = await response.blob();
      
      // Vérifier que c'est bien un PDF (magic bytes: %PDF)
      const arrayBuffer = await blob.slice(0, 4).arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const isPdf = uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && uint8Array[2] === 0x44 && uint8Array[3] === 0x46; // %PDF
      
      if (!isPdf) {
        logger.error('[playwrightPdfService] Le blob reçu n\'est pas un PDF valide', {
          blobSize: blob.size,
          firstBytes: Array.from(uint8Array).map(b => '0x' + b.toString(16)).join(' ')
        });
        return {
          success: false,
          error: 'Le blob reçu n\'est pas un PDF valide'
        };
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Ajouter un préfixe pour identifier que c'est Playwright
      a.download = `[PLAYWRIGHT]_${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      logger.info('[playwrightPdfService] ✅ PDF généré via Playwright avec succès et téléchargé', {
        blobSize: blob.size,
        filename: a.download,
        isPdfValid: true
      });
      return { success: true };
    } else {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.error('[playwrightPdfService] API Playwright retourne une erreur', {
        status: response.status,
        statusText: response.statusText,
        error: errorText.substring(0, 500)
      });
      return {
        success: false,
        error: `Erreur API Playwright: ${response.status} - ${errorText.substring(0, 100)}`
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[playwrightPdfService] Exception lors de l\'appel API Playwright', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      note: 'Cette erreur déclenchera le fallback sur html2canvas'
    });
    return {
      success: false,
      error: errorMessage
    };
  }
}

