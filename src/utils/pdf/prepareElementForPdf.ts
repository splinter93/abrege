/**
 * Préparation d'un élément DOM pour l'export PDF
 * 
 * @description Crée et prépare un élément DOM optimisé pour l'export PDF
 * - Crée le container avec styles inline
 * - Ajoute le header image si présent
 * - Applique les styles CSS markdown
 * - Nettoie le DOM et transforme les embeds
 */

import { getPdfStyles } from './pdfStyles';
import { cleanupDomForPdf } from './cleanupDom';
import { transformYouTubeEmbeds, transformNoteEmbeds } from './transformEmbeds';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Crée un container pour le contenu PDF
 */
function createContainer(): HTMLElement {
  const container = document.createElement('div');
  container.style.width = '210mm'; // Largeur A4 exactement
  container.style.padding = '0';
  container.style.margin = '0';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = "'Figtree', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif";
  container.style.fontSize = '11pt';
  container.style.lineHeight = '1.6';
  container.style.boxSizing = 'border-box';
  container.style.border = 'none';
  container.style.outline = 'none';
  return container;
}

/**
 * Crée et ajoute le header image si présent
 */
function addHeaderImage(container: HTMLElement, headerImage: string): void {
  const headerImageContainer = document.createElement('div');
  headerImageContainer.style.width = '100%';
  headerImageContainer.style.height = '200px';
  headerImageContainer.style.overflow = 'hidden';
  headerImageContainer.style.marginBottom = '0';
  headerImageContainer.style.marginLeft = '0';
  headerImageContainer.style.marginRight = '0';
  headerImageContainer.style.padding = '0';
  headerImageContainer.style.position = 'relative';
  headerImageContainer.style.boxSizing = 'border-box';
  
  const headerImg = document.createElement('img');
  headerImg.src = headerImage;
  headerImg.style.width = '100%';
  headerImg.style.height = '100%';
  headerImg.style.objectFit = 'cover';
  headerImg.style.objectPosition = 'center';
  headerImg.style.display = 'block';
  headerImg.style.margin = '0';
  headerImg.style.padding = '0';
  
  headerImageContainer.appendChild(headerImg);
  container.appendChild(headerImageContainer);
}

/**
 * Crée le content wrapper avec titre et contenu
 */
function createContentWrapper(title: string, html: string, hasHeaderImage: boolean): HTMLElement {
  const contentWrapper = document.createElement('div');
  contentWrapper.style.padding = '20mm';
  contentWrapper.style.paddingTop = hasHeaderImage ? '24px' : '20mm';
  contentWrapper.style.paddingBottom = '30mm'; // Marge en bas pour éviter les coupures
  
  // Ajouter le titre
  const titleElement = document.createElement('h1');
  titleElement.textContent = title || 'Note';
  titleElement.style.fontSize = '28pt';
  titleElement.style.marginTop = '0';
  titleElement.style.marginBottom = '16px';
  titleElement.style.pageBreakAfter = 'avoid';
  titleElement.style.color = '#000000';
  titleElement.style.fontWeight = '700';
  titleElement.style.lineHeight = '1.2';
  contentWrapper.appendChild(titleElement);

  // Créer un conteneur pour le contenu HTML
  const contentDiv = document.createElement('div');
  contentDiv.className = 'markdown-body';
  
  // Vérifier que le HTML n'est pas vide
  if (!html || html.trim().length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.textContent = '(Note vide)';
    emptyMsg.style.color = '#666';
    contentDiv.appendChild(emptyMsg);
  } else {
    contentDiv.innerHTML = html;
  }
  
  contentWrapper.appendChild(contentDiv);
  return contentWrapper;
}

/**
 * Prépare un élément DOM pour l'export PDF
 * 
 * @param html - Contenu HTML à exporter
 * @param title - Titre du document
 * @param headerImage - URL de l'image header (optionnel)
 * @returns Élément DOM préparé et optimisé pour PDF
 */
export function prepareElementForPdf(
  html: string,
  title: string,
  headerImage?: string | null
): HTMLElement {
  // Créer le container principal
  const container = createContainer();
  
  // Ajouter le header image si présent
  if (headerImage) {
    addHeaderImage(container, headerImage);
  }
  
  // Créer le content wrapper avec titre et contenu
  const contentWrapper = createContentWrapper(title, html, !!headerImage);
  container.appendChild(contentWrapper);
  
  // Récupérer le contentDiv pour les transformations
  const contentDiv = contentWrapper.querySelector('.markdown-body') as HTMLElement;
  if (!contentDiv) {
    throw new Error('Content div not found after creation');
  }
  
  // Nettoyer le DOM
  cleanupDomForPdf(contentDiv);
  
  // Transformer les embeds
  transformYouTubeEmbeds(contentDiv);
  transformNoteEmbeds(contentDiv);
  
  // Appliquer les styles CSS
  const styles = getPdfStyles();
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  container.appendChild(styleElement);
  
  // Log pour debug
  logger.info('[prepareElementForPdf] Élément préparé', {
    title,
    htmlLength: html.length,
    hasHeaderImage: !!headerImage,
    containerHTML: container.innerHTML.substring(0, 500),
    textContent: container.textContent?.substring(0, 200)
  });
  
  return container;
}

