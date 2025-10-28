/**
 * Plugin markdown-it pour les callouts GitHub/Obsidian style
 * Supporte la syntaxe : > [!NOTE] > Contenu
 */

import type MarkdownIt from 'markdown-it';
import type StateBlock from 'markdown-it/lib/rules_block/state_block';

const CALLOUT_TYPES = {
  NOTE: { icon: '📝', color: '#64748b' },
  TIP: { icon: '💡', color: '#eab308' },
  INFO: { icon: 'ℹ️', color: '#0ea5e9' },
  WARNING: { icon: '⚠️', color: '#f59e0b' },
  DANGER: { icon: '❌', color: '#ef4444' },
  ERROR: { icon: '❌', color: '#ef4444' },
  SUCCESS: { icon: '✅', color: '#22c55e' },
};

export function markdownItCallouts(md: MarkdownIt) {
  // Override blockquote rule pour détecter les callouts
  const defaultBlockquoteRule = md.block.ruler.__rules__?.find(r => r.name === 'blockquote');
  
  if (!defaultBlockquoteRule) return;

  md.block.ruler.at('blockquote', (state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean => {
    // Vérifier si c'est un callout markdown
    const pos = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];

    if (pos >= max) return false;
    if (state.src.charCodeAt(pos) !== 0x3E /* > */) return false;

    // Regarder la ligne suivante pour détecter [!TYPE]
    let nextLine = startLine + 1;
    if (nextLine >= endLine) {
      // Pas de callout, laisser le comportement par défaut
      return defaultBlockquoteRule.fn(state, startLine, endLine, silent);
    }

    const nextPos = state.bMarks[nextLine] + state.tShift[nextLine];
    const nextMax = state.eMarks[nextLine];
    const nextLineContent = state.src.slice(nextPos, nextMax);

    // Matcher [!TYPE] au début de la ligne (après le >)
    const calloutMatch = nextLineContent.match(/^>\s*\[!(NOTE|TIP|INFO|WARNING|DANGER|ERROR|SUCCESS)\]/i);
    
    if (!calloutMatch) {
      // Pas un callout, laisser le comportement par défaut
      return defaultBlockquoteRule.fn(state, startLine, endLine, silent);
    }

    if (silent) return true;

    const calloutType = calloutMatch[1].toUpperCase();
    const calloutInfo = CALLOUT_TYPES[calloutType as keyof typeof CALLOUT_TYPES] || CALLOUT_TYPES.NOTE;

    // Trouver la fin du blockquote
    let lastLineInQuote = startLine;
    let terminate = false;

    while (lastLineInQuote < endLine) {
      lastLineInQuote++;
      if (lastLineInQuote >= endLine) break;

      const linePos = state.bMarks[lastLineInQuote] + state.tShift[lastLineInQuote];
      const lineMax = state.eMarks[lastLineInQuote];

      if (linePos < lineMax && state.sCount[lastLineInQuote] < state.blkIndent) {
        if (state.src.charCodeAt(linePos) !== 0x3E /* > */) {
          terminate = true;
          break;
        }
      }
    }

    const oldParent = state.parentType;
    const oldLineMax = state.lineMax;
    state.parentType = 'blockquote' as any;

    let token = state.push('callout_open', 'div', 1);
    token.markup = '>';
    token.map = [startLine, 0];
    token.attrSet('class', `markdown-callout markdown-callout-${calloutType.toLowerCase()}`);
    token.attrSet('data-callout-type', calloutType);
    token.attrSet('data-callout-icon', calloutInfo.icon);
    token.attrSet('data-callout-color', calloutInfo.color);

    // Extraire le contenu (sauter la première ligne avec [!TYPE])
    const contentStart = startLine + 2; // Sauter > et > [!TYPE]
    const contentEnd = terminate ? lastLineInQuote : endLine;

    // Parser le contenu du callout
    const oldBMarks: number[] = [];
    const oldTShift: number[] = [];
    const oldSCount: number[] = [];

    for (let i = contentStart; i < contentEnd; i++) {
      oldBMarks.push(state.bMarks[i]);
      oldTShift.push(state.tShift[i]);
      oldSCount.push(state.sCount[i]);

      // Retirer le > de chaque ligne
      if (state.src.charCodeAt(state.bMarks[i] + state.tShift[i]) === 0x3E /* > */) {
        state.bMarks[i] += 1;
        if (state.src.charCodeAt(state.bMarks[i]) === 0x20 /* space */) {
          state.bMarks[i] += 1;
        }
        state.tShift[i] = 0;
      }
    }

    state.lineMax = contentEnd;
    state.md.block.tokenize(state, contentStart, contentEnd);
    state.lineMax = oldLineMax;

    // Restaurer les positions
    for (let i = contentStart; i < contentEnd; i++) {
      state.bMarks[i] = oldBMarks[i - contentStart];
      state.tShift[i] = oldTShift[i - contentStart];
      state.sCount[i] = oldSCount[i - contentStart];
    }

    token = state.push('callout_close', 'div', -1);
    token.markup = '>';

    state.parentType = oldParent;
    state.line = terminate ? lastLineInQuote : endLine;

    return true;
  });

  // Ajouter le renderer pour les callouts
  md.renderer.rules.callout_open = (tokens, idx) => {
    const token = tokens[idx];
    const type = token.attrGet('data-callout-type') || 'NOTE';
    const icon = token.attrGet('data-callout-icon') || '📝';
    const className = token.attrGet('class') || '';

    return `<div class="${className}">
      <div class="markdown-callout-header">
        <span class="markdown-callout-icon">${icon}</span>
        <span class="markdown-callout-title">${type}</span>
      </div>
      <div class="markdown-callout-content">`;
  };

  md.renderer.rules.callout_close = () => {
    return `</div></div>`;
  };
}

