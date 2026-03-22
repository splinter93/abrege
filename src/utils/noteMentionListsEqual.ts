/**
 * Comparaison stable de deux listes de mentions (pour éviter les updates / dirty state inutiles).
 * @module utils/noteMentionListsEqual
 */

import type { NoteMention } from '@/types/noteMention';

export function areNoteMentionListsEqual(
  a: NoteMention[] | undefined,
  b: NoteMention[] | undefined
): boolean {
  return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
}
