/**
 * Route API pour l'export PDF via Playwright
 * POST /api/pdf/export
 * 
 * Génère un PDF depuis du HTML en utilisant le service Playwright externe
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

// URL du service Playwright
const PLAYWRIGHT_API_URL = process.env.PLAYWRIGHT_API_URL || 'https://factoria-playwright.up.railway.app';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PdfExportRequest {
  title: string;
  htmlContent: string;
  headerImage?: string | null;
}

/**
 * Crée une page HTML complète avec le contenu et les styles
 */
function createFullHtmlPage(options: PdfExportRequest): string {
  const { title, htmlContent, headerImage } = options;
  
  // Styles CSS pour le PDF
  const styles = `
    <style>
      @page {
        size: A4;
        margin: 0;
      }
      
      /* ✅ CRITIQUE: Permettre au contenu de s'étendre sur plusieurs pages */
      html, body {
        height: auto !important;
        min-height: auto !important;
        max-height: none !important;
        overflow: visible !important;
      }
      
      * {
        box-sizing: border-box;
      }
      
      html, body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", sans-serif;
        font-size: 11pt;
        line-height: 1.75;
        color: #1a1a1a;
        background: #ffffff;
        margin: 0;
        padding: 0;
      }
      
      .container {
        /* Pas de width fixe, laisser le navigateur gérer */
      }
      
      .header-image {
        width: 100%;
        height: 200px;
        object-fit: cover;
        display: block;
        margin: 0;
        padding: 0;
      }
      
      .content-wrapper {
        padding: 20mm;
        padding-top: ${headerImage ? '10mm' : '20mm'};
      }
      
      h1 {
        font-size: 28pt;
        margin-top: 0;
        margin-bottom: 16px;
        page-break-after: avoid;
        color: #000000;
        font-weight: 700;
        line-height: 1.2;
      }
      
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
        page-break-inside: avoid; 
        background: #f8f8f8;
        border: 1px solid #d0d0d0;
        border-left: 4px solid #007bff;
        border-radius: 4px;
        margin: 20px 0;
        display: block;
        white-space: pre;
      }
      
      .markdown-body pre code {
        background: transparent;
        padding: 0;
        border-radius: 0;
        border: none;
        color: #1a1a1a;
        font-size: 9pt;
      }
      
      .markdown-body table { 
        width: 100%; 
        border-collapse: collapse; 
        margin: 20px 0; 
        page-break-inside: avoid; 
        border: 1px solid #d0d0d0;
        display: table;
        table-layout: auto;
      }
      
      .markdown-body table th, .markdown-body table td { 
        border: 1px solid #d0d0d0; 
        padding: 12px 14px; 
        text-align: left; 
        color: #1a1a1a;
        display: table-cell;
      }
      
      .markdown-body table th { 
        background-color: #f5f5f5; 
        font-weight: 600;
        border-bottom: 2px solid #d0d0d0;
      }
      
      .markdown-body table tr:nth-child(even) {
        background-color: #fafafa;
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
      
      .markdown-body blockquote { 
        border-left: 4px solid #007bff; 
        padding: 16px 20px; 
        margin: 20px 0; 
        page-break-inside: avoid; 
        color: #333333; 
        font-style: italic;
        background: #f9f9f9;
        border-radius: 4px;
      }
    </style>
  `;
  
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Note'}</title>
  ${styles}
</head>
<body>
  <div class="container">
    ${headerImage ? `<img src="${headerImage}" alt="Header" class="header-image" />` : ''}
    <div class="content-wrapper">
      <h1>${title || 'Note'}</h1>
      <div class="markdown-body" id="pdf-content">
        ${htmlContent}
      </div>
    </div>
  </div>
  <script>
    // ✅ S'assurer que le contenu est complètement rendu
    window.addEventListener('load', function() {
      // Forcer le reflow pour s'assurer que tout est rendu
      document.body.offsetHeight;
      // Marquer que le contenu est prêt
      document.body.setAttribute('data-ready', 'true');
    });
  </script>
</body>
</html>`;
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
    const { title, htmlContent, headerImage } = body;

    if (!htmlContent || htmlContent.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Contenu HTML vide' },
        { status: 400 }
      );
    }

    // ✅ Créer la page HTML complète
    const fullHtml = createFullHtmlPage({ title, htmlContent, headerImage });
    
    // ✅ Encoder en base64 pour créer un data URI
    // Note: Les data URIs ont une limite de taille, mais pour du HTML ça devrait passer
    const base64Html = Buffer.from(fullHtml, 'utf-8').toString('base64');
    const dataUri = `data:text/html;base64,${base64Html}`;
    
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
          waitFor: 'body[data-ready="true"]', // ✅ Attendre que le contenu soit complètement rendu
          preferCSSPageSize: false, // ✅ Utiliser la taille A4 standard
          displayHeaderFooter: false // Pas de header/footer
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
    logApi.error(`❌ Erreur export PDF: ${error}`, context);
    
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

