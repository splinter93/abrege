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
 * Reponse API pour un canva session unique
 */
export interface CanvaSessionResponse {
  success: boolean;
  canva_session: CanvaSession;
}

/**
 * Reponse API pour création canva
 */
export interface CreateCanvaSessionResponse {
  success: boolean;
  canva_id?: string;
  note_id?: string;
  canva_session?: CanvaSession;
  message?: string;
}

/**
 * Reponse API pour note (utilisée dans switchCanva)
 */
export interface NoteApiResponse {
  success: boolean;
  note: {
    id: string;
    title?: string;
    source_title?: string;
    markdown_content: string;
    html_content?: string;
    folder_id: string | null;
    classeur_id: string | null;
    position: number;
    created_at: string;
    updated_at: string;
    slug: string;
    public_url?: string;
    header_image?: string;
    header_image_offset?: number;
    header_image_blur?: number;
    header_image_overlay?: number;
    header_title_in_image?: boolean;
    wide_mode?: boolean;
    a4_mode?: boolean;
    slash_lang?: 'fr' | 'en';
    font_family?: string;
    share_settings?: unknown;
  };
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

/**
 * Payload Supabase Realtime pour postgres_changes
 * Structure standard des événements INSERT/UPDATE/DELETE
 * 
 * Note: Supabase envoie `event_type` (snake_case), mais on normalise en `eventType` (camelCase)
 */
export interface RealtimePostgresChangesPayload<T = unknown> {
  event_type?: 'INSERT' | 'UPDATE' | 'DELETE';
  eventType?: 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  new: T | null;
  old: T | null;
  errors?: unknown[];
}

/**
 * Helper pour extraire eventType (gère event_type et eventType)
 */
export function getEventType(payload: RealtimePostgresChangesPayload<unknown>): 'INSERT' | 'UPDATE' | 'DELETE' | null {
  return (payload.eventType || payload.event_type || null) as 'INSERT' | 'UPDATE' | 'DELETE' | null;
}

/**
 * Type guard pour valider un payload Realtime
 */
export function isRealtimePostgresPayload<T>(
  payload: unknown,
  expectedTable: string
): payload is RealtimePostgresChangesPayload<T> {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  
  const p = payload as Record<string, unknown>;
  
  return (
    typeof p.eventType === 'string' &&
    ['INSERT', 'UPDATE', 'DELETE'].includes(p.eventType) &&
    typeof p.table === 'string' &&
    p.table === expectedTable &&
    (p.new === null || typeof p.new === 'object') &&
    (p.old === null || typeof p.old === 'object')
  );
}

