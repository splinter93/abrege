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
      // Récupérer le PDF et le télécharger
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      logger.info('[playwrightPdfService] PDF généré via Playwright avec succès');
      return { success: true };
    } else {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.warn('[playwrightPdfService] API Playwright retourne une erreur', {
        status: response.status,
        error: errorText
      });
      return {
        success: false,
        error: `Erreur API Playwright: ${response.status}`
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('[playwrightPdfService] Erreur API Playwright', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    return {
      success: false,
      error: errorMessage
    };
  }
}

