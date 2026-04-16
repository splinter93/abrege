/**
 * Champs à ne jamais envoyer à Supabase sur UPDATE agents (colonnes supprimées, UI-only, etc.)
 */
const OMIT_FROM_AGENTS_ROW: ReadonlySet<string> = new Set([
  'personality',
  'is_favorite',
  'category',
  'instructions',
  'is_platform', // Immuable via UI — seul le service role / migration peut le modifier
]);

/**
 * Retire les clés non persistées / obsolètes avant .update() sur la table agents.
 */
export function omitNonPersistedAgentFields(
  row: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const key of OMIT_FROM_AGENTS_ROW) {
    delete out[key];
  }
  delete out.id;
  return out;
}
