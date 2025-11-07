/**
 * Plugin markdown-it pour parser les embeds YouTube custom
 *
 * Syntaxe supportée :
 * - {{youtube:VIDEO_ID}}
 * - {{youtube:https://youtu.be/VIDEO_ID}}
 * - {{youtube:https://www.youtube.com/watch?v=VIDEO_ID}}
 */

import type MarkdownIt from 'markdown-it';
import { parseYouTubeInput, parseYouTubeTimestamp } from '@/utils/youtube';

const YOUTUBE_REGEX = /^\{\{youtube:([^}]+)\}\}$/;

export function markdownItYouTubeEmbed(md: MarkdownIt) {
  md.block.ruler.before('paragraph', 'youtube_embed', (state, startLine, endLine, silent) => {
    const pos = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    const lineText = state.src.slice(pos, max).trim();

    const match = lineText.match(YOUTUBE_REGEX);
    if (!match) {
      return false;
    }

    const rawValue = match[1];
    const segments = rawValue.split('|').map(segment => segment.trim()).filter(Boolean);
    const primary = segments[0];
    const rest = segments.slice(1);

    const { videoId, startSeconds: parsedStart } = parseYouTubeInput(primary);
    if (!videoId) {
      return false;
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

    if (silent) {
      return true;
    }

    const token = state.push('youtube_embed', 'youtube-embed', 0);
    token.attrSet('data-video-id', videoId);
    token.attrSet('data-depth', '0');
    if (typeof startSeconds === 'number' && startSeconds >= 0) {
      token.attrSet('data-start', startSeconds.toString());
    }
    token.markup = lineText;
    token.block = true;
    token.map = [startLine, startLine + 1];

    state.line = startLine + 1;
    return true;
  });

  md.renderer.rules.youtube_embed = (tokens, idx) => {
    const token = tokens[idx];
    const videoId = token.attrGet('data-video-id');
    const depth = token.attrGet('data-depth') ?? '0';
    const start = token.attrGet('data-start');

    if (!videoId) {
      return token.markup ?? '';
    }

    let html = `<youtube-embed data-video-id="${videoId}" data-depth="${depth}"`;
    if (start) {
      html += ` data-start="${start}"`;
    }
    html += `></youtube-embed>`;

    return html;
  };
}


