/**
 * Types pour les notes attachées (style Cursor)
 * Séparation claire données/métadonnées pour citations précises
 * @module types/attachedNotes
 */

/**
 * Métadonnées d'une note attachée
 * Enrichi par rapport à l'interface Note de base
 */
export interface AttachedNoteMetadata {
  /** ID unique de la note (UUID) */
  id: string;
  
  /** Slug unique de la note */
  slug: string;
  
  /** Titre de la note */
  title: string;
  
  /** Chemin virtuel (format: slug.md) */
  path: string;
  
  /** Nombre de lignes du contenu */
  lineCount: number;
  
  /** Indique si le contenu complet est inclus */
  isFullContent: boolean;
  
  /** Date de dernière modification (ISO 8601) */
  lastModified?: string;
  
  /** Taille en bytes du contenu markdown */
  sizeBytes: number;
}

/**
 * Note formatée style Cursor avec numéros de lignes
 * Permet citations précises ("voir ligne 42 de api-docs.md")
 */
export interface AttachedNoteFormatted {
  /** Métadonnées de la note */
  metadata: AttachedNoteMetadata;
  
  /** Contenu avec numéros de lignes (format: "     1|line content") */
  contentWithLines: string;
}

/**
 * Contexte additionnel pour LLM (séparé du system message)
 * Évite duplication tokens et permet meilleure gestion du contexte
 */
export interface AdditionalLLMContext {
  /** Notes attachées formatées avec métadonnées */
  attachedNotes: AttachedNoteFormatted[];
}

