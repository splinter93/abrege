/**
 * Types pour les datasources Synesia (GET /datasources/available — corps = tableau)
 */

/** Élément tel que renvoyé par l’API Synesia */
export interface SynesiaDatasourceApiItem {
  id: string;
  project_id: string;
  type: string;
  name: string;
  description: string | null;
  customization: unknown;
}

/** Datasource stockée en base après sync */
export interface SynesiaDatasource {
  id: string;
  project_id: string;
  type: string;
  name: string;
  description: string | null;
  customization: unknown;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Lien agent–datasource (jointure agent_datasources + synesia_datasources) */
export interface AgentDatasourceLink {
  id: string;
  agent_id: string;
  datasource_id: string;
  created_at: string;
  updated_at: string;
  synesia_datasource: SynesiaDatasource;
}
