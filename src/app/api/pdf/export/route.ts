/**
 * Route API pour l'export PDF via Playwright
 * POST /api/pdf/export
 * 
 * Génère un PDF depuis du HTML en utilisant le service Playwright externe
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';
import { createFullHtmlPage } from '@/utils/pdf/htmlPageBuilder';

// URL du service Playwright
const PLAYWRIGHT_API_URL = process.env.PLAYWRIGHT_API_URL || 'https://factoria-playwright.up.railway.app';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PdfExportRequest {
  title: string;
  htmlContent: string;
  fontFamily?: string | null;
  headerImage?: string | null;
  headerImageOffset?: number | null;
  headerImageBlur?: number | null;
  headerImageOverlay?: number | null;
  headerTitleInImage?: boolean;
}

/**
 * POST /api/pdf/export
 * Génère un PDF depuis du HTML via Playwright
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const context = {
    operation: 'pdf_export',
    component: 'API_PDF'
  };

  logApi.info('🚀 Début export PDF via Playwright', context);

  try {
    // 🔐 Authentification
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    // 📥 Récupérer le body
    const body: PdfExportRequest = await request.json();
    const {
      title,
      htmlContent,
      fontFamily,
      headerImage,
      headerImageOffset,
      headerImageBlur,
      headerImageOverlay,
      headerTitleInImage,
    } = body;

    if (!htmlContent || htmlContent.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Contenu HTML vide' },
        { status: 400 }
      );
    }

    // ✅ Créer la page HTML complète
    const fullHtml = createFullHtmlPage({
      title,
      htmlContent,
      fontFamily,
      headerImage,
      headerImageOffset,
      headerImageBlur,
      headerImageOverlay,
      headerTitleInImage,
    });
    
    // ✅ Debug: Log du HTML généré (premiers 500 caractères)
    logApi.info('📄 HTML généré pour Playwright', {
      ...context,
      htmlLength: fullHtml.length,
      htmlPreview: fullHtml.substring(0, 500),
      hasHeaderImage: !!headerImage,
      fontFamily,
      headerTitleInImage,
    });
    
    // ✅ Encoder en base64 pour créer un data URI
    const base64Html = Buffer.from(fullHtml, 'utf-8').toString('base64');
    const dataUri = `data:text/html;base64,${base64Html}`;
    
    // ✅ Debug: Vérifier le data URI
    logApi.info('🔗 Data URI créé', {
      ...context,
      dataUriLength: dataUri.length,
      dataUriPreview: dataUri.substring(0, 100) + '...',
      startsWithDataUri: dataUri.startsWith('data:text/html;base64,')
    });
    
    // ✅ Appeler l'API Playwright
    logApi.info('📞 Appel API Playwright', context);
    
    const playwrightResponse = await fetch(`${PLAYWRIGHT_API_URL}/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: dataUri,
        options: {
          format: 'A4',
          landscape: false,
          printBackground: true,
          margin: {
            top: '0mm',
            right: '0mm',
            bottom: '0mm',
            left: '0mm'
          },
          waitFor: 'body[data-ready="true"]',
          preferCSSPageSize: true,
          displayHeaderFooter: false
        }
      })
    });

    if (!playwrightResponse.ok) {
      const errorText = await playwrightResponse.text();
      logApi.error(`❌ Erreur API Playwright: ${playwrightResponse.status} - ${errorText}`, context);
      return NextResponse.json(
        { success: false, error: `Erreur Playwright: ${playwrightResponse.status}` },
        { status: 500 }
      );
    }

    // ✅ Récupérer le PDF
    const pdfBuffer = await playwrightResponse.arrayBuffer();
    
    const duration = Date.now() - startTime;
    logApi.info(`✅ PDF généré avec succès (${duration}ms)`, context);

    // ✅ Retourner le PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${(title || 'note').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logApi.error(`❌ Erreur export PDF: ${error}`, {
      ...context,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue lors de l\'export PDF',
        duration
      },
      { status: 500 }
    );
  }
}
