/**
 * Types pour le système Note Embed
 * Support embeds Notion-style avec prévention récursion
 */

/**
 * Styles d'affichage disponibles pour les note embeds
 */
export type NoteEmbedDisplayStyle = 'card' | 'inline' | 'compact';

/**
 * Attributs du node Tiptap noteEmbed
 */
export interface NoteEmbedAttributes {
  /** ID ou slug de la note à embedder */
  noteRef: string;
  /** Profondeur actuelle (prévention récursion infinie) */
  depth: number;
  /** Style d'affichage de l'embed */
  display: NoteEmbedDisplayStyle;
  /** Username du propriétaire (pour construire l'URL) */
  username?: string;
  /** Titre de la note (optionnel, pour affichage) */
  noteTitle?: string;
}

/**
 * Métadonnées de la note embedée (retournées par l'API)
 */
export interface NoteEmbedMetadata {
  id: string;
  title: string;
  slug: string;
  public_url: string;
  header_image: string | null;
  markdown_content: string;
  html_content?: string;
  created_at: string;
  updated_at: string;
  share_settings?: {
    visibility: 'private' | 'link-private' | 'link-public' | 'limited' | 'scrivia';
  };
  user_id: string;
}

/**
 * État de chargement de l'embed
 */
export type EmbedLoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Entrée du cache avec TTL
 */
export interface CachedNoteEmbed {
  metadata: NoteEmbedMetadata;
  fetchedAt: number;
  expiresAt: number;
}

/**
 * Résultat du hook useNoteEmbedMetadata
 */
export interface UseNoteEmbedMetadataResult {
  note: NoteEmbedMetadata | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Profondeur maximale d'embeds imbriqués (prévention récursion) */
export const MAX_EMBED_DEPTH = 3;

/** Durée de vie du cache (5 minutes) */
export const CACHE_TTL_MS = 5 * 60 * 1000;

/** Nombre maximum d'entrées dans le cache (LRU eviction) */
export const MAX_CACHE_ENTRIES = 50;

/** Hauteur maximale du contenu embedé (avant scroll) */
export const MAX_EMBED_CONTENT_HEIGHT = 400;

/** Nombre maximum de caractères affichés dans le preview */
export const MAX_PREVIEW_CHARS = 500;

/** Timeout pour le fetch de métadonnées (10 secondes) */
export const FETCH_TIMEOUT_MS = 10000;

/** Nombre maximum de retries en cas d'échec */
export const MAX_FETCH_RETRIES = 2;

/** Délai entre retries (backoff exponentiel) */
export const RETRY_BASE_DELAY_MS = 500;

