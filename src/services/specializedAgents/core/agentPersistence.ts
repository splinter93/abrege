/**
 * Filtre les données avant un .update() sur la table `agents`.
 *
 * Stratégie : ALLOWLIST stricte.
 * On ne laisse passer que les colonnes qui existent réellement en DB.
 * Toute clé inconnue (ex. `config`, `is_favorite`, champs UI-only) est silencieusement
 * ignorée plutôt que d'atteindre Supabase et provoquer un HTTP 500.
 *
 * Mise à jour de la liste : ajouter une entrée quand une migration ADD COLUMN est jouée.
 */
const AGENTS_DB_COLUMNS: ReadonlySet<string> = new Set([
  // ── Création initiale (20250130_create_agents_table) ─────────────────────
  'user_id',
  'name',
  'provider',
  'temperature',
  'top_p',
  'is_active',
  'updated_at',
  'metadata',
  'api_v2_capabilities',
  // ── Enrichissement (20250131_enrich_agents_table) ─────────────────────────
  'model',
  'max_tokens',
  'system_instructions',
  'context_template',
  'api_config',
  'expertise',
  'capabilities',
  'version',
  'is_default',
  'priority',
  // ── Agents spécialisés (20250201_specialized_agents_extension) ───────────
  'slug',
  'display_name',
  'description',
  'is_chat_agent',
  'is_endpoint_agent',
  'input_schema',
  'output_schema',
  'openapi_schema_id',
  // ── Divers (migrations ultérieures) ──────────────────────────────────────
  'profile_picture',  // 20251010
  'tts_language',     // 20260312
  'is_platform',      // 20260417
  'voice',            // présent dans le type Agent / col DB
  'reasoning_effort', // 20260426
]);

/**
 * Retire tout champ absent de la table `agents` avant .update().
 * Supprime toujours `id` (non modifiable via UPDATE).
 */
export function omitNonPersistedAgentFields(
  row: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key !== 'id' && AGENTS_DB_COLUMNS.has(key)) {
      out[key] = value;
    }
  }
  return out;
}
