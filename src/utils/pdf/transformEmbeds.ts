/**
 * Transformation des embeds pour l'export PDF
 * 
 * @description Transforme les iframes et embeds non-exportables en éléments PDF-compatibles
 * - YouTube iframes → liens texte
 * - Note embeds → liens stylisés
 */

/**
 * Transforme les iframes YouTube en liens texte
 * 
 * @param element - Élément DOM contenant potentiellement des iframes YouTube
 */
export function transformYouTubeEmbeds(element: HTMLElement): void {
  const youtubeEmbeds = element.querySelectorAll(
    '.youtube-embed iframe, iframe[src*="youtube"], iframe[src*="youtu.be"]'
  );
  
  youtubeEmbeds.forEach((iframe) => {
    const src = (iframe as HTMLIFrameElement).src;
    const link = document.createElement('div');
    link.style.padding = '1em';
    link.style.backgroundColor = '#f5f5f5';
    link.style.border = '1px solid #ddd';
    link.style.margin = '1em 0';
    link.style.color = '#000000';
    link.textContent = `🎥 Vidéo YouTube: ${src}`;
    
    if (iframe.parentNode) {
      iframe.parentNode.replaceChild(link, iframe);
    }
  });
}

/**
 * Transforme les note embeds en liens stylisés
 * 
 * @param element - Élément DOM contenant potentiellement des note embeds
 */
export function transformNoteEmbeds(element: HTMLElement): void {
  const noteEmbeds = element.querySelectorAll('.note-embed');
  
  noteEmbeds.forEach((embed) => {
    const link = embed.querySelector('a');
    if (link) {
      const linkText = link.textContent || 'Note liée';
      const linkDiv = document.createElement('div');
      linkDiv.style.padding = '0.5em';
      linkDiv.style.backgroundColor = '#f9f9f9';
      linkDiv.style.borderLeft = '3px solid #007bff';
      linkDiv.style.margin = '0.5em 0';
      linkDiv.style.color = '#000000';
      linkDiv.textContent = `📄 ${linkText}`;
      
      if (embed.parentNode) {
        embed.parentNode.replaceChild(linkDiv, embed);
      }
    }
  });
}

