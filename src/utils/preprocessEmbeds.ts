/**
 * Prétraite le markdown pour convertir les embeds en HTML
 * 
 * Convertit :
 * - {{embed:noteRef}} → <note-embed data-note-ref="noteRef">...</note-embed>
 * - {{youtube:...}} → <youtube-embed data-video-id="..."></youtube-embed>
 * 
 * POURQUOI ? tiptap-markdown ne supporte pas les nodes custom dans le markdown.
 * On doit convertir notre syntaxe custom en HTML, puis Tiptap parsera cet HTML
 * avec parseHTML() pour créer le node correspondant.
 */

import { parseYouTubeInput, parseYouTubeTimestamp } from '@/utils/youtube';

const EMBED_REGEX = /\{\{embed:([a-f0-9-]{36}|[a-z0-9-]+)(?:\|(.*?))?\}\}/g;
const DISPLAY_STYLES = new Set(['card', 'inline', 'compact']);
const YOUTUBE_REGEX = /\{\{youtube:([^}]+)\}\}/g;

export function preprocessEmbeds(markdown: string): string {
  const withNoteEmbeds = markdown.replace(EMBED_REGEX, (match, noteRef, noteTitle) => {
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

  const withYouTubeEmbeds = withNoteEmbeds.replace(YOUTUBE_REGEX, (match, rawValue) => {
    const segments = rawValue
      .split('|')
      .map((segment: string) => segment.trim())
      .filter((segment: string) => segment.length > 0);
    if (segments.length === 0) {
      return match;
    }

    const primary = segments[0];
    const rest = segments.slice(1);

    const { videoId: parsedVideoId, startSeconds: parsedStart } = parseYouTubeInput(primary);
    const resolvedVideoId = parsedVideoId;

    if (!resolvedVideoId) {
      return match; // Laisser tel quel si ID invalide → préserve texte pour debug
    }

    let startSeconds = parsedStart;

    for (const segment of rest) {
      if (segment.toLowerCase().startsWith('start=')) {
        const value = segment.slice('start='.length).trim();
        startSeconds = parseYouTubeTimestamp(value);
        continue;
      }

      if (segment.toLowerCase().startsWith('t=')) {
        const value = segment.slice('t='.length).trim();
        startSeconds = parseYouTubeTimestamp(value);
      }
    }

    let html = `<youtube-embed data-video-id="${resolvedVideoId}" data-depth="0"`;
    if (typeof startSeconds === 'number' && startSeconds >= 0) {
      html += ` data-start="${startSeconds}"`;
    }
    html += `></youtube-embed>`;

    return html;
  });

  return withYouTubeEmbeds;
}

