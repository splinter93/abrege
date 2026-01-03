/**
 * Types pour les sélections de texte du canvas dans le chat
 * ✅ Pattern identique à NoteMention pour cohérence
 * Conformité : ZERO any, interfaces explicites
 * @module types/canvasSelection
 */

/**
 * Sélection de texte depuis le canvas
 * Coût : ~50-200 tokens selon la longueur
 * 
 * Pattern : Stockée dans state[] comme mentions[]
 */
export interface CanvasSelection {
  /** ID unique de la sélection (UUID généré) */
  id: string;
  
  /** Contenu textuel sélectionné */
  text: string;
  
  /** Note ID du canvas (optionnel, pour référence) */
  noteId?: string;
  
  /** Slug de la note (optionnel, pour référence) */
  noteSlug?: string;
  
  /** Titre de la note (optionnel, pour affichage) */
  noteTitle?: string;
  
  /** Position de début dans le document (optionnel) */
  startPos?: number;
  
  /** Position de fin dans le document (optionnel) */
  endPos?: number;
  
  /** Timestamp de création (ISO 8601) */
  timestamp: string;
}

/**
 * Contexte de sélections canvas pour le LLM
 * Injecté comme message user léger avant le message principal
 */
export interface CanvasSelectionsContext {
  /** Type de contexte */
  type: 'canvas_selections';
  
  /** Sélections du canvas */
  selections: CanvasSelection[];
  
  /** Timestamp d'injection */
  timestamp: string;
}

