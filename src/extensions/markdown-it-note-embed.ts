/**
 * Plugin markdown-it pour parser les note embeds
 * 
 * Formats supportés:
 * - {{embed:noteRef}}
 * - {{embed:noteRef|Note Title}}
 * 
 * Output: <div data-type="note-embed" data-note-ref="noteRef" data-note-title="Note Title" data-depth="0"></div>
 */

import type MarkdownIt from 'markdown-it';

const EMBED_REGEX = /^\{\{embed:([a-f0-9-]{36}|[a-z0-9-]+)(?:\|([^}]+))?\}\}$/;

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
    const noteTitle = match[2] || null;

    // Créer le token
    const token = state.push('note_embed', 'div', 0);
    token.attrSet('data-type', 'note-embed');
    token.attrSet('data-note-ref', noteRef);
    if (noteTitle) {
      token.attrSet('data-note-title', noteTitle);
    }
    token.attrSet('data-depth', '0');
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

    let html = `<div data-type="note-embed" data-note-ref="${noteRef}" data-depth="${depth}"`;
    if (noteTitle) {
      html += ` data-note-title="${noteTitle}"`;
    }
    html += `></div>`;

    return html;
  };
}

