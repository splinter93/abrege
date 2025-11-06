/**
 * Prétraite le markdown pour convertir les embeds en HTML
 * 
 * Convertit {{embed:noteRef}} ou {{embed:noteRef|title}} 
 * en <div data-type="note-embed" data-note-ref="noteRef" data-note-title="title"></div>
 * 
 * POURQUOI ? tiptap-markdown ne supporte pas les nodes custom dans le markdown.
 * On doit convertir notre syntaxe custom en HTML, puis Tiptap parsera cet HTML
 * avec parseHTML() pour créer le node noteEmbed.
 */

const EMBED_REGEX = /\{\{embed:([a-f0-9-]{36}|[a-z0-9-]+)(?:\|([^}]+))?\}\}/g;

export function preprocessEmbeds(markdown: string): string {
  return markdown.replace(EMBED_REGEX, (match, noteRef, noteTitle) => {
    let html = `<div data-type="note-embed" data-note-ref="${noteRef}" data-depth="0"`;
    
    if (noteTitle) {
      // Échapper les guillemets dans le titre
      const escapedTitle = noteTitle.replace(/"/g, '&quot;');
      html += ` data-note-title="${escapedTitle}"`;
    }
    
    html += `></div>`;
    
    return html;
  });
}

