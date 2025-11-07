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

const EMBED_REGEX = /\{\{embed:([a-f0-9-]{36}|[a-z0-9-]+)(?:\|(.*?))?\}\}/g;
const DISPLAY_STYLES = new Set(['card', 'inline', 'compact']);

export function preprocessEmbeds(markdown: string): string {
  return markdown.replace(EMBED_REGEX, (match, noteRef, noteTitle) => {
    const rest = noteTitle ?? '';
    let resolvedTitle: string | null = null;
    let display = 'inline';

    if (rest) {
      const segments = rest.split('|');
      for (const segmentRaw of segments) {
        const segment = segmentRaw.trim();
        if (!segment) continue;

        if (segment.toLowerCase().startsWith('display:')) {
          const value = segment.slice('display:'.length).trim().toLowerCase();
          if (DISPLAY_STYLES.has(value)) {
            display = value;
          }
          continue;
        }

        if (!resolvedTitle) {
          resolvedTitle = segment;
        }
      }
    }

    let html = `<note-embed data-note-ref="${noteRef}" data-depth="0" data-display="${display}"`;
    
    if (resolvedTitle) {
      const escapedTitle = resolvedTitle.replace(/"/g, '&quot;');
      html += ` data-note-title="${escapedTitle}"`;
    }
    
    html += `></note-embed>`;
    
    return html;
  });
}

