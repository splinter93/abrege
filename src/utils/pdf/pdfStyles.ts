/**
 * Styles CSS pour l'export PDF
 * 
 * @description Styles optimisés pour le rendu PDF avec formatage professionnel
 * - Typographie claire et lisible
 * - Page breaks intelligents
 * - Support tables, code blocks, embeds
 */

/**
 * Retourne les styles CSS complets pour l'export PDF
 * 
 * @returns String CSS avec tous les styles nécessaires
 */
export function getPdfStyles(): string {
  return `
    .markdown-body {
      font-family: 'Figtree', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
    }
    .markdown-body h1 { 
      font-size: 24pt; 
      margin-top: 20px; 
      margin-bottom: 12px; 
      page-break-after: avoid; 
      color: #000000; 
      font-weight: 700; 
      line-height: 1.2;
    }
    .markdown-body h2 { 
      font-size: 20pt; 
      margin-top: 24px; 
      margin-bottom: 10px; 
      page-break-after: avoid; 
      color: #000000; 
      font-weight: 600; 
      line-height: 1.25;
    }
    .markdown-body h3 { 
      font-size: 16pt; 
      margin-top: 18px; 
      margin-bottom: 8px; 
      page-break-after: avoid; 
      color: #000000; 
      font-weight: 600; 
      line-height: 1.3;
    }
    .markdown-body h4 { 
      font-size: 14pt; 
      margin-top: 16px; 
      margin-bottom: 6px; 
      page-break-after: avoid; 
      color: #000000; 
      font-weight: 600; 
      line-height: 1.35;
    }
    .markdown-body p { 
      margin: 8px 0; 
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
      margin: 4px 0; 
      color: #1a1a1a; 
      line-height: 1.5;
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
}

