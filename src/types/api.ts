/**
 * Types pour les réponses API
 * Remplace les 'any' par des interfaces strictes
 * @module types/api
 */

/**
 * Réponse API pour les notes récentes
 */
export interface RecentNoteAPIResponse {
  id: string;
  slug: string;
  source_title: string;
  markdown_content?: string;
  word_count?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Réponse API pour la recherche de notes
 */
export interface SearchNoteAPIResponse {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  type: 'note' | 'classeur' | 'file';
  classeur_id?: string;
  folder_id?: string;
  created_at?: string;
}

/**
 * Wrapper générique pour les réponses API
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Réponse API pour liste de notes récentes
 */
export interface RecentNotesAPIResponse extends APIResponse<unknown> {
  notes: RecentNoteAPIResponse[];
}

/**
 * Réponse API pour recherche
 */
export interface SearchAPIResponse extends APIResponse<unknown> {
  results: SearchNoteAPIResponse[];
  total?: number;
}
