/**
 * Types pour le système de prompts personnalisables (éditeur et chat)
 * @module types/editorPrompts
 */

/**
 * Contexte d'utilisation du prompt
 * - editor: Uniquement dans l'éditeur
 * - chat: Uniquement dans le chat
 * - both: Dans les deux contextes
 */
export type PromptContext = 'editor' | 'chat' | 'both';

/**
 * Mode d'insertion du contenu généré par un prompt (uniquement pour contexte editor)
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
 * Interface représentant un prompt (éditeur ou chat)
 */
export interface EditorPrompt {
  id: string;
  user_id: string;
  agent_id: string | null;
  name: string;
  slug: string; // ✅ NOUVEAU : Slug unique pour mentions /slug
  description?: string | null;
  prompt_template: string;
  icon: string;
  position: number;
  is_active: boolean;
  is_default: boolean;
  category?: string | null;
  
  /** Contexte d'utilisation (editor, chat, both) */
  context: PromptContext;
  
  /** Mode d'insertion du contenu généré (uniquement pour editor) */
  insertion_mode?: InsertionMode | null;
  
  /** Utiliser les structured outputs pour éviter les phrases parasites */
  use_structured_output: boolean;
  
  /** Schéma JSON pour les structured outputs */
  output_schema?: OutputSchema | null;
  
  created_at: string;
  updated_at: string;
}

/**
 * Requête de création d'un prompt
 */
export interface EditorPromptCreateRequest {
  name: string;
  prompt_template: string;
  icon: string;
  context?: PromptContext;
  agent_id?: string | null;
  description?: string | null;
  category?: string | null;
  position?: number;
  insertion_mode?: InsertionMode | null;
  use_structured_output?: boolean;
  output_schema?: OutputSchema | null;
}

/**
 * Requête de mise à jour d'un prompt
 */
export interface EditorPromptUpdateRequest {
  name?: string;
  prompt_template?: string;
  icon?: string;
  context?: PromptContext;
  agent_id?: string | null;
  description?: string | null;
  category?: string | null;
  position?: number;
  is_active?: boolean;
  insertion_mode?: InsertionMode | null;
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
export type PromptCategory = 'writing' | 'code' | 'translate' | 'analysis' | 'learning' | 'brainstorm' | 'custom';


