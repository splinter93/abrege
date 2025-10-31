/**
 * Types pour les mentions légères de notes dans le chat
 * ✅ REFACTO : Types simples (state pattern, comme images[])
 * Conformité : ZERO any, interfaces explicites
 * @module types/noteMention
 */

/**
 * Mention légère d'une note (métadonnées uniquement)
 * Coût : ~10-20 tokens vs 5000+ pour note attachée complète
 * 
 * Pattern : Stockée dans state[] comme images[]
 */
export interface NoteMention {
  /** ID unique de la note (UUID) */
  id: string;
  
  /** Slug unique de la note */
  slug: string;
  
  /** Titre de la note */
  title: string;
  
  /** Description courte (optionnelle) */
  description?: string;
  
  /** Nombre de mots (optionnel) */
  word_count?: number;
  
  /** Date de création (ISO 8601) */
  created_at?: string;
}

/**
 * Contexte de mentions pour le LLM
 * Injecté comme message user léger avant le message principal
 */
export interface MentionsContext {
  /** Type de contexte */
  type: 'mentions';
  
  /** Notes mentionnées */
  notes: NoteMention[];
  
  /** Timestamp d'injection */
  timestamp: string;
}

