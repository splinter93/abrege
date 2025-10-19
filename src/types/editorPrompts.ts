/**
 * Types pour le système de prompts éditeur personnalisables
 * @module types/editorPrompts
 */

/**
 * Interface représentant un prompt éditeur
 */
export interface EditorPrompt {
  id: string;
  user_id: string;
  agent_id: string | null;
  name: string;
  description?: string | null;
  prompt_template: string;
  icon: string;
  position: number;
  is_active: boolean;
  is_default: boolean;
  category?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Requête de création d'un prompt éditeur
 */
export interface EditorPromptCreateRequest {
  name: string;
  prompt_template: string;
  icon: string;
  agent_id?: string | null;
  description?: string | null;
  category?: string | null;
  position?: number;
}

/**
 * Requête de mise à jour d'un prompt éditeur
 */
export interface EditorPromptUpdateRequest {
  name?: string;
  prompt_template?: string;
  icon?: string;
  agent_id?: string | null;
  description?: string | null;
  category?: string | null;
  position?: number;
  is_active?: boolean;
}

/**
 * Statut d'un prompt par rapport à son agent
 */
export type PromptStatus = 'ok' | 'no-agent' | 'agent-deleted' | 'agent-inactive';

/**
 * Catégories de prompts disponibles
 */
export type PromptCategory = 'writing' | 'code' | 'translate' | 'analysis' | 'custom';


