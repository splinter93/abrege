/**
 * Agents plateforme : `user_id` NULL + `is_platform = true` en base.
 * Visibles par tous les comptes, non modifiables via UI (RLS + guards applicatif).
 */

export type PlatformAgentRow = {
  is_platform?: boolean | null;
  user_id?: string | null;
};

/** Retourne true si la ligne est un agent plateforme (flag is_platform). */
export function isPlatformAgentRow(row: PlatformAgentRow): boolean {
  return row.is_platform === true;
}

/** Lecture / exécution : agent plateforme OU propriété explicite du viewer. */
export function userCanAccessAgent(
  row: PlatformAgentRow & { user_id?: string | null },
  viewerUserId: string,
): boolean {
  if (isPlatformAgentRow(row)) return true;
  return row.user_id === viewerUserId;
}
