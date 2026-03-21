/**
 * Préparation d'un élément DOM pour l'export PDF.
 *
 * Le fallback html2canvas réutilise le même markup A4 que le pipeline
 * Playwright pour rester visuellement proche, même si le rendu final
 * reste dégradé car rasterisé.
 */

import { cleanupDomForPdf } from './cleanupDom';
import { transformYouTubeEmbeds, transformNoteEmbeds } from './transformEmbeds';
import { simpleLogger as logger } from '@/utils/logger';
import {
  createPrintA4DocumentMarkup,
  type PrintA4DocumentOptions,
} from './printA4Document';
import { getPrintA4DocumentCss } from './printA4Theme';

export type PreparePdfElementOptions = PrintA4DocumentOptions;

function createContainer(): HTMLElement {
  const container = document.createElement('div');
  container.style.width = '210mm';
  container.style.padding = '0';
  container.style.margin = '0';
  container.style.backgroundColor = '#eef2f7';
  container.style.boxSizing = 'border-box';
  container.style.border = 'none';
  container.style.outline = 'none';
  return container;
}

export function prepareElementForPdf(
  options: PreparePdfElementOptions
): HTMLElement {
  const container = createContainer();

  const styleElement = document.createElement('style');
  styleElement.textContent = getPrintA4DocumentCss({ fontFamily: options.fontFamily });
  container.appendChild(styleElement);

  const documentWrapper = document.createElement('div');
  documentWrapper.innerHTML = createPrintA4DocumentMarkup(options).trim();
  const documentNode = documentWrapper.firstElementChild as HTMLElement | null;
  if (!documentNode) {
    throw new Error('Print document markup could not be created');
  }

  container.appendChild(documentNode);

  const contentDiv = container.querySelector('.markdown-body') as HTMLElement | null;
  if (!contentDiv) {
    throw new Error('Content div not found after creation');
  }

  cleanupDomForPdf(contentDiv);
  transformYouTubeEmbeds(contentDiv);
  transformNoteEmbeds(contentDiv);

  logger.info('[prepareElementForPdf] Élément préparé', {
    title: options.title,
    htmlLength: options.htmlContent.length,
    hasHeaderImage: !!options.headerImage,
    containerHTML: container.innerHTML.substring(0, 500),
    textContent: container.textContent?.substring(0, 200),
  });

  return container;
}

