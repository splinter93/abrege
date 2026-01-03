/**
 * Helper pour construire la section Canva context
 * Extrait de CanvaContextProvider.ts pour réutilisabilité
 */

import type { CanvaContextPayload, CanvaContextSession } from '@/types/canvaContext';

function formatSessionSummary(session: CanvaContextSession, index: number): string {
  const statusEmojiMap: Record<string, string> = {
    open: '🟢',
    closed: '🟠',
    saved: '💾',
    deleted: '⚫️'
  };
  const emoji = statusEmojiMap[session.status] || '⚪️';
  const slugOrId = session.note.slug || session.note.id;
  const activeMarker = session.isActive ? ' • ACTIVE' : '';

  return `${index + 1}. ${emoji} ${session.status.toUpperCase()} • ${session.note.title} (${slugOrId})${activeMarker}`;
}

export function buildCanvaContextSection(payload?: CanvaContextPayload | null): string | null {
  if (!payload || payload.canvases.length === 0) {
    return null;
  }

  const summaryLine = `Sessions: ${payload.stats.total} (open: ${payload.stats.open}, closed: ${payload.stats.closed}, saved: ${payload.stats.saved})`;
  const activeLine = payload.activeNote
    ? `Active note: ${payload.activeNote.note.title} (${payload.activeNote.note.slug || payload.activeNote.note.id}) [${payload.activeNote.status}]`
    : 'Active note: aucune';

  const sessionsSummary = payload.canvases
    .slice(0, 5)
    .map((session, index) => formatSessionSummary(session, index))
    .join('\n');

  const additionalInfo =
    payload.canvases.length > 5
      ? `… ${payload.canvases.length - 5} autre(s) session(s) non listée(s)`
      : '';

  const rawJson = JSON.stringify(payload, null, 2);

  return [
    '## Canva Context',
    summaryLine,
    activeLine,
    sessionsSummary,
    additionalInfo,
    '### Raw Canva JSON',
    rawJson
  ]
    .filter(Boolean)
    .join('\n');
}

