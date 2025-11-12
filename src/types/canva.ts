/**
 * Types pour le systeme Canva
 * 
 * Architecture propre avec table dediee canva_sessions
 * Lien vers chat_sessions + notes DB reelles
 */

/**
 * Statut d'une session canva
 */
export type CanvaStatus = 'open' | 'closed' | 'saved' | 'deleted';

/**
 * Session canva complete (DB)
 * 
 * Note: title vient du JOIN avec articles.source_title
 * Source de vérité unique = articles.source_title
 */
export interface CanvaSession {
  id: string;
  chat_session_id: string;
  note_id: string;
  user_id: string;
  title: string; // ✅ Vient du JOIN avec articles.source_title (pas en DB)
  status: CanvaStatus;
  created_at: string;
  closed_at: string | null;
  saved_at: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Requete creation canva
 */
export interface CreateCanvaRequest {
  chat_session_id: string;
  title?: string;
  initial_content?: string;
}

/**
 * Reponse creation canva
 */
export interface CreateCanvaResponse {
  success: boolean;
  canva_id: string;
  note_id: string;
  message?: string;
}

/**
 * Requete sauvegarde canva
 */
export interface SaveCanvaRequest {
  classeur_id: string;
  folder_id?: string | null;
}

/**
 * Reponse sauvegarde canva
 */
export interface SaveCanvaResponse {
  success: boolean;
  message?: string;
}

/**
 * Reponse liste canvases
 */
export interface ListCanvasResponse {
  success: boolean;
  canva_sessions: CanvaSession[];
  count: number;
}

/**
 * Reponse generique canva
 */
export interface CanvaResponse {
  success: boolean;
  canva_session?: CanvaSession;
  message?: string;
  error?: string;
}

