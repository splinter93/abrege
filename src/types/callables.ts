/**
 * Types pour les callables Synesia
 */

/**
 * Callable depuis l'API Synesia (format réponse GET /execution)
 */
export interface CallableListItem {
  id: string;
  type: 'agent' | 'script' | 'request' | 'callable-pipeline';
  name: string;
  description: string | null;
  icon: string | null;
  group_name: string | null;
  input_schema: unknown;
  output_schema: unknown;
  customization: unknown;
  auth: 'OAUTH' | 'NONE';
  oauth_system_id: string | null;
  is_owner: boolean;
  slug: string | null;
}

/**
 * Callable stocké en base de données
 */
export interface SynesiaCallable {
  id: string;
  name: string;
  type: 'agent' | 'script' | 'request' | 'callable-pipeline';
  description: string | null;
  slug: string | null;
  icon: string | null;
  group_name: string | null;
  input_schema: unknown | null;
  output_schema: unknown | null;
  is_owner: boolean;
  auth: 'OAUTH' | 'NONE';
  oauth_system_id: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Lien agent-callable (jointure agent_callables + synesia_callables)
 */
export interface AgentCallableLink {
  id: string;
  agent_id: string;
  callable_id: string;
  created_at: string;
  updated_at: string;
  synesia_callable: SynesiaCallable;
}






