/**
 * Types pour les mentions de prompts dans le chat
 * Pattern : Identique à NoteMention (metadata légère)
 * Conformité : ZERO any, interfaces explicites
 * @module types/promptMention
 */

/**
 * Mention d'un prompt (métadonnées légères pour metadata DB)
 * 
 * Pattern : Stockée dans state[] comme mentions[] et images[]
 * Usage : Metadata envoyée au backend pour remplacement /slug par template
 * 
 * ✅ REFACTO : Utilise slug (comme mentions @slug)
 * ✅ Metadata légère (pas de prompt_template - économie tokens)
 */
export interface PromptMention {
  /** ID unique du prompt (UUID) */
  id: string;
  
  /** Slug unique du prompt (pour /slug dans texte) */
  slug: string;
  
  /** Nom du prompt (pour affichage tooltip) */
  name: string;
  
  /** Description courte (optionnelle) */
  description?: string | null;
  
  /** Contexte d'utilisation (optionnel, pour validation) */
  context?: 'editor' | 'chat' | 'both';
  
  /** Agent ID associé (optionnel) */
  agent_id?: string | null;
  
  /** Template complet (optionnel - chargé par backend si besoin) */
  prompt_template?: string;

  /** Valeurs de placeholders renseignées côté client */
  placeholderValues?: Record<string, string>;
}

