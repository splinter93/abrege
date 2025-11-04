/**
 * Types pour les mentions de prompts dans le chat
 * Pattern : Identique à NoteMention (state stocké)
 * Conformité : ZERO any, interfaces explicites
 * @module types/promptMention
 */

/**
 * Mention d'un prompt (métadonnées pour remplacement)
 * 
 * Pattern : Stockée dans state[] comme mentions[] et images[]
 * Usage : Permet de remplacer /Nom par template au moment de l'envoi
 */
export interface PromptMention {
  /** ID unique du prompt (UUID) */
  id: string;
  
  /** Nom du prompt (affiché comme /Nom) */
  name: string;
  
  /** Template complet du prompt */
  prompt_template: string;
  
  /** Description courte (optionnelle) */
  description?: string | null;
  
  /** Contexte d'utilisation */
  context: 'editor' | 'chat' | 'both';
  
  /** Agent ID associé (optionnel) */
  agent_id?: string | null;
}

