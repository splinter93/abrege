/**
 * Builder de page HTML pour l'export PDF via Playwright.
 *
 * La page générée réutilise le même contrat typographique et A4 que le
 * rendu document de l'éditeur afin de limiter les dérives visuelles.
 */

import {
  createPrintA4HtmlDocument,
  type PrintA4DocumentOptions,
} from './printA4Document';

export interface HtmlPageOptions extends PrintA4DocumentOptions {}

export function createFullHtmlPage(options: HtmlPageOptions): string {
  return createPrintA4HtmlDocument(options);
}

