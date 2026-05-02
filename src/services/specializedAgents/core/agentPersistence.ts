/**
 * Filtre les données avant un .update() sur la table `agents`.
 *
 * Stratégie : ALLOWLIST stricte des colonnes modifiables.
 * On ne laisse passer que les colonnes qui :
 *   1. existent réellement en DB,
 *   2. peuvent être écrites par un utilisateur via l'API.
 *
 * Colonnes EXCLUES intentionnellement (même si présentes en DB) :
 *   - `is_platform` : immuable via API ; seul le service role / migration peut le modifier.
 *                     Service role bypass RLS → ne jamais l'inclure ici.
 *   - `user_id`     : immuable après création (propriétaire).
 *   - `is_favorite`, `category` : champs UI-only, jamais persistés.
 *   - `personality`, `instructions` : colonnes supprimées en migration.
 *
 * Mise à jour de la liste : ajouter une entrée quand une migration ADD COLUMN est jouée.
 */
const AGENTS_DB_COLUMNS: ReadonlySet<string> = new Set([
  // ── Création initiale (20250130_create_agents_table) ─────────────────────
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
  'profile_picture',      // 20251010
  'tts_language',         // 20260312
  'voice',                // col DB (xAI TTS)
  'reasoning_effort',     // 20260426
  // ── Colonnes confirmées par la vue agents_active_summary ─────────────────
  'model_variant',
  'max_completion_tokens',
  'stream',
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
