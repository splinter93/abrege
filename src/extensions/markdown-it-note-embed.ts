/**
 * Plugin markdown-it pour parser les note embeds
 * 
 * Formats supportés:
 * - {{embed:noteRef}}
 * - {{embed:noteRef|Note Title}}
 * - {{embed:noteRef|Note Title|display:inline}}
 * - {{embed:noteRef||display:inline}} (sans titre)
 * 
 * Output: <div data-type="note-embed" data-note-ref="noteRef" data-note-title="Note Title" data-display="inline" data-depth="0"></div>
 */

import type MarkdownIt from 'markdown-it';

// ✅ Regex étendue pour supporter display
// Groupe 1: noteRef (UUID ou slug)
// Groupe 2: noteTitle (optionnel)
// Groupe 3: display style (optionnel)
const EMBED_REGEX = /^\{\{embed:([a-f0-9-]{36}|[a-z0-9-]+)(?:\|(.*))?\}\}$/;
const DISPLAY_STYLES = new Set(['card', 'inline', 'compact']);

export function markdownItNoteEmbed(md: MarkdownIt) {
  // Règle block pour parser {{embed:noteRef}}
  md.block.ruler.before('paragraph', 'note_embed', (state, startLine, endLine, silent) => {
    const pos = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    const lineText = state.src.slice(pos, max).trim();

    // Vérifier si la ligne match {{embed:noteRef}}
    const match = lineText.match(EMBED_REGEX);
    if (!match) return false;

    // Mode silent = juste vérifier sans créer de token
    if (silent) return true;

    const noteRef = match[1];
    const rest = match[2] ?? '';

    let noteTitle: string | null = null;
    let display: string = 'inline';

    if (rest) {
      const segments = rest.split('|');
      for (const segmentRaw of segments) {
        const segment = segmentRaw.trim();
        if (!segment) {
          continue;
        }

        if (segment.toLowerCase().startsWith('display:')) {
          const value = segment.slice('display:'.length).trim().toLowerCase();
          if (DISPLAY_STYLES.has(value)) {
            display = value;
          }
          continue;
        }

        if (!noteTitle) {
          noteTitle = segment;
        }
      }
    }

    // Créer le token
    const token = state.push('note_embed', 'div', 0);
    token.attrSet('data-type', 'note-embed');
    token.attrSet('data-note-ref', noteRef);
    if (noteTitle) {
      token.attrSet('data-note-title', noteTitle);
    }
    token.attrSet('data-depth', '0');
    token.attrSet('data-display', display);
    token.markup = lineText;
    token.block = true;
    token.map = [startLine, startLine + 1];

    state.line = startLine + 1;

    return true;
  });

  // Renderer pour convertir le token en HTML
  md.renderer.rules.note_embed = (tokens, idx) => {
    const token = tokens[idx];
    const noteRef = token.attrGet('data-note-ref');
    const noteTitle = token.attrGet('data-note-title');
    const depth = token.attrGet('data-depth') || '0';
    const display = token.attrGet('data-display') || 'inline';

    let html = `<div data-type="note-embed" data-note-ref="${noteRef}" data-depth="${depth}" data-display="${display}"`;
    if (noteTitle) {
      html += ` data-note-title="${noteTitle}"`;
    }
    html += `></div>`;

    return html;
  };
}

