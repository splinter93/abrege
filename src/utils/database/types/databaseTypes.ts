/**
 * Types pour les opérations de base de données V2
 * Extrait de V2DatabaseUtils pour respecter limite 300 lignes
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Max 300 lignes par fichier
 * - Types explicites (pas de any)
 * - Documentation JSDoc complète
 */

/**
 * Contexte API pour les opérations de base de données
 * Contient les informations nécessaires pour le logging et la traçabilité
 */
export interface ApiContext {
  /** Nom de l'opération (ex: 'createNote', 'updateClasseur') */
  operation: string;
  /** Composant qui appelle l'opération (ex: 'API', 'Service') */
  component: string;
  /** ID utilisateur (optionnel) */
  userId?: string;
  /** Timestamp de l'opération (optionnel) */
  timestamp?: number;
  /** Autres propriétés dynamiques */
  [key: string]: unknown;
}

/**
 * Données pour créer une note
 */
export interface CreateNoteData {
  /** Titre de la note */
  source_title: string;
  /** ID du classeur (UUID ou slug) */
  notebook_id?: string;
  /** Alias pour notebook_id (support Groq) */
  notebook?: string;
  /** Contenu markdown de la note */
  markdown_content?: string;
  /** URL de l'image d'en-tête */
  header_image?: string;
  /** ID du dossier parent (optionnel) */
  folder_id?: string | null;
  /** Description de la note */
  description?: string;
}

/**
 * Données pour mettre à jour une note
 */
export interface UpdateNoteData {
  /** Nouveau titre (optionnel) */
  source_title?: string;
  /** Nouveau contenu markdown (optionnel) */
  markdown_content?: string;
  /** Nouveau contenu HTML (optionnel) */
  html_content?: string;
  /** Nouvelle image d'en-tête (optionnel, null pour supprimer) */
  header_image?: string | null;
  /** Offset de l'image d'en-tête (optionnel) */
  header_image_offset?: number;
  /** Blur de l'image d'en-tête (optionnel) */
  header_image_blur?: number;
  /** Overlay de l'image d'en-tête (optionnel) */
  header_image_overlay?: number;
  /** Afficher le titre dans l'image (optionnel) */
  header_title_in_image?: boolean;
  /** Mode large (optionnel) */
  wide_mode?: boolean;
  /** Mode A4 (optionnel) */
  a4_mode?: boolean;
  /** Langue pour les slash commands (optionnel) */
  slash_lang?: 'fr' | 'en';
  /** Famille de police (optionnel) */
  font_family?: string;
  /** ID du dossier parent (optionnel) */
  folder_id?: string | null;
  /** Description (optionnel) */
  description?: string;
  /** ID du classeur (optionnel) */
  classeur_id?: string | null;
  /** Est un brouillon canva (optionnel) */
  is_canva_draft?: boolean;
}

/**
 * Données pour créer un dossier
 */
export interface CreateFolderData {
  /** Nom du dossier */
  name: string;
  /** ID du classeur parent */
  classeur_id: string;
  /** ID du dossier parent (optionnel, null pour racine) */
  parent_id?: string | null;
}

/**
 * Données pour mettre à jour un dossier
 */
export interface UpdateFolderData {
  /** Nouveau nom (optionnel) */
  name?: string;
  /** Nouveau parent (optionnel, null pour racine) */
  parent_id?: string | null;
}

/**
 * Données pour créer un classeur
 */
export interface CreateClasseurData {
  /** Nom du classeur */
  name: string;
  /** Description (optionnel) */
  description?: string;
  /** Icône (optionnel) */
  icon?: string;
  /** Emoji (optionnel) */
  emoji?: string;
}

/**
 * Données pour mettre à jour un classeur
 */
export interface UpdateClasseurData {
  /** Nouveau nom (optionnel) */
  name?: string;
  /** Nouvelle description (optionnel) */
  description?: string;
  /** Nouvelle icône (optionnel) */
  icon?: string;
  /** Nouvel emoji (optionnel) */
  emoji?: string;
  /** Nouvelle position (optionnel) */
  position?: number;
}

/**
 * Paramètres de partage d'une ressource
 */
export interface ShareSettings {
  /** Niveau de visibilité */
  visibility?: 'private' | 'public' | 'link-private' | 'link-public' | 'limited' | 'scrivia';
  /** Autoriser l'édition (optionnel) */
  allow_edit?: boolean;
  /** Autoriser les commentaires (optionnel) */
  allow_comments?: boolean;
  /** Liste des utilisateurs invités (optionnel) */
  invited_users?: string[];
  /** Date d'expiration du lien (optionnel) */
  link_expires?: string;
}

/**
 * Données pour un agent
 */
export interface AgentData {
  /** Nom d'affichage (optionnel) */
  display_name?: string;
  /** Slug (optionnel) */
  slug?: string;
  /** Description (optionnel) */
  description?: string;
  /** Modèle LLM (optionnel) */
  model?: string;
  /** Instructions système (optionnel) */
  system_instructions?: string;
  /** Capacités API V2 (optionnel) */
  api_v2_capabilities?: string[];
  /** Autres propriétés dynamiques */
  [key: string]: unknown;
}

/**
 * Opération de contenu pour une note
 */
export interface ContentOperation {
  /** ID unique de l'opération */
  id: string;
  /** Type d'action */
  action: 'insert' | 'replace' | 'delete' | 'upsert_section';
  /** Cible de l'opération */
  target: unknown;
  /** Condition WHERE */
  where: string;
  /** Contenu à insérer/remplacer (optionnel) */
  content?: string;
  /** Options supplémentaires (optionnel) */
  options?: Record<string, unknown>;
}

