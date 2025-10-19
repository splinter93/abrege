/**
 * Types pour le système de prompts éditeur personnalisables
 * @module types/editorPrompts
 */

/**
 * Mode d'insertion du contenu généré par un prompt
 * - replace: Remplace la sélection (défaut)
 * - append: Ajoute après la sélection
 * - prepend: Ajoute avant la sélection
 */
export type InsertionMode = 'replace' | 'append' | 'prepend';

/**
 * Schéma JSON pour structured outputs
 */
export interface OutputSchema {
  type: 'object';
  properties: {
    content: {
      type: 'string';
      description: string;
    };
  };
  required: string[];
}

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
  
  /** Mode d'insertion du contenu généré (replace, append, prepend) */
  insertion_mode: InsertionMode;
  
  /** Utiliser les structured outputs pour éviter les phrases parasites */
  use_structured_output: boolean;
  
  /** Schéma JSON pour les structured outputs */
  output_schema?: OutputSchema | null;
  
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
  insertion_mode?: InsertionMode;
  use_structured_output?: boolean;
  output_schema?: OutputSchema | null;
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
  insertion_mode?: InsertionMode;
  use_structured_output?: boolean;
  output_schema?: OutputSchema | null;
}

/**
 * Statut d'un prompt par rapport à son agent
 */
export type PromptStatus = 'ok' | 'no-agent' | 'agent-deleted' | 'agent-inactive';

/**
 * Catégories de prompts disponibles
 */
export type PromptCategory = 'writing' | 'code' | 'translate' | 'analysis' | 'custom';


