/**
 * Injecte les mentions légères de notes dans les instructions système d'un agent.
 * Même format que MentionedNotesContextProvider : métadonnées uniquement (slug, id, titre…).
 * Le LLM décide d'appeler getNote(slug) s'il juge le contenu pertinent.
 * @module services/llm/AgentMentionResolver
 */

import type { NoteMention } from '@/types/noteMention';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function parseMentions(raw: unknown): NoteMention[] {
  if (!Array.isArray(raw)) return [];
  const out: NoteMention[] = [];
  for (const item of raw) {
    if (!isPlainObject(item)) continue;
    const id = item.id;
    const slug = item.slug;
    if (typeof id !== 'string' || typeof slug !== 'string' || slug.length === 0) continue;
    out.push({
      id,
      slug,
      title: typeof item.title === 'string' ? item.title : '',
      description: typeof item.description === 'string' ? item.description : undefined,
      word_count: typeof item.word_count === 'number' ? item.word_count : undefined,
      created_at: typeof item.created_at === 'string' ? item.created_at : undefined,
    });
  }
  return out;
}

/**
 * Appende un bloc de métadonnées (mentions légères) aux instructions système.
 * Aucune requête DB — tout vient du JSONB déjà stocké sur l'agent.
 */
export function resolveAgentSystemInstructionNotes(
  instructions: string,
  mentionsRaw: unknown
): string {
  const mentions = parseMentions(mentionsRaw);
  if (mentions.length === 0) return instructions;

  let block = '\n\n## Referenced Notes\n\n';
  block += 'The following notes are referenced in these instructions (metadata only — use `getNote(slug)` to fetch full content if relevant):\n';

  for (const mention of mentions) {
    block += `- @${mention.slug}\n`;
    block += `  ID: ${mention.id}\n`;
    if (mention.title) block += `  Title: ${mention.title}\n`;
    if (mention.word_count) block += `  Length: ${mention.word_count} words\n`;
    if (mention.description) {
      const short = mention.description.substring(0, 100);
      block += `  Description: ${short}${mention.description.length > 100 ? '...' : ''}\n`;
    }
    block += '\n';
  }

  return `${instructions.trimEnd()}${block.trimEnd()}`;
}
