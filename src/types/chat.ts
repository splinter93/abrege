/**
 * Types stricts pour les messages du chat
 * Remplace les `any` dans ChatMessage.tsx et ChatFullscreenV2.tsx
 */

import type { ToolCall, ToolResult } from '@/hooks/useChatHandlers';
import type { StreamTimeline } from './streamTimeline';

/**
 * Configuration d'un agent de chat
 */
export interface Agent {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  model: string;
  provider?: string;
  system_instructions?: string;
  context_template?: string;
  personality?: string;
  expertise?: string[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  is_active?: boolean;
  is_chat_agent?: boolean;
  is_endpoint_agent?: boolean;
  capabilities?: string[] | Record<string, unknown>; // JSONB dans la base
  api_v2_capabilities?: string[];
  profile_picture?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Message de base du chat
 */
export interface BaseMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp?: string | number;
  sequence_number?: number;  // ✅ Ordre strict (table chat_messages)
  streamTimeline?: StreamTimeline; // ✅ Timeline capturée du streaming
  /**
   * Identifiant client stable pour conserver les clés React
   * entre l'ajout optimiste et la version persistée.
   */
  clientMessageId?: string;
  /**
   * UUID unique pour idempotence (déduplication)
   * Permet d'éviter les doublons en cas de retry/double-clic
   */
  operation_id?: string;
}

/**
 * Message utilisateur
 */
export interface UserMessage extends BaseMessage {
  role: 'user';
  name?: string;
  attachedImages?: Array<{
    url: string; // Base64 data URI
    fileName?: string;
  }>;
  attachedNotes?: Array<{
    id: string;
    slug: string;
    title: string;
    word_count?: number;
  }>;
  /** Mentions légères de notes (metadata ~10-20 tokens) */
  mentions?: import('@/types/noteMention').NoteMention[];
  /** Mentions légères de prompts (metadata ~10-20 tokens) */
  prompts?: import('@/types/promptMention').PromptMention[];
}

/**
 * Message assistant avec métadonnées optionnelles
 */
export interface AssistantMessage extends BaseMessage {
  role: 'assistant';
  name?: 'observation' | string;
  channel?: 'analysis' | 'default';
  reasoning?: string;
  tool_calls?: ToolCall[];
  tool_results?: ToolResult[];
  isStreaming?: boolean; // ✅ NOUVEAU : Indique si le message est en cours de streaming
  streamTimeline?: import('@/types/streamTimeline').StreamTimeline; // ✅ Timeline pour ordre chronologique exact
  stream_timeline?: import('@/types/streamTimeline').StreamTimeline; // ✅ Alias snake_case (DB)
}

/**
 * Message système
 */
export interface SystemMessage extends BaseMessage {
  role: 'system';
}

/**
 * Message de résultat d'outil
 */
export interface ToolMessage extends BaseMessage {
  role: 'tool';
  tool_call_id: string;
  name: string;
  success?: boolean;
}

/**
 * Union de tous les types de messages
 */
export type ChatMessage = UserMessage | AssistantMessage | SystemMessage | ToolMessage;

/**
 * Type guard pour vérifier si un message est un message d'observation
 */
export function isObservationMessage(msg: ChatMessage): msg is AssistantMessage {
  return msg.role === 'assistant' && (msg as AssistantMessage).name === 'observation';
}

/**
 * Type guard pour vérifier si un message a des tool calls
 */
export function hasToolCalls(msg: ChatMessage): msg is AssistantMessage & { tool_calls: NonNullable<AssistantMessage['tool_calls']> } {
  return msg.role === 'assistant' && 
         'tool_calls' in msg && 
         Array.isArray((msg as AssistantMessage).tool_calls) &&
         (msg as AssistantMessage).tool_calls!.length > 0;
}

/**
 * Type guard pour vérifier si un message a du reasoning
 */
export function hasReasoning(msg: ChatMessage): msg is AssistantMessage & { reasoning: string } {
  return msg.role === 'assistant' && 
         'reasoning' in msg && 
         typeof (msg as AssistantMessage).reasoning === 'string' &&
         (msg as AssistantMessage).reasoning!.length > 0;
}

/**
 * Type guard pour vérifier si c'est un message d'analyse sans contenu
 */
export function isEmptyAnalysisMessage(msg: ChatMessage): boolean {
  return msg.role === 'assistant' && 
         (msg as AssistantMessage).channel === 'analysis' && 
         !msg.content;
}

/**
 * Interface pour les données de résultat d'outil
 */
export interface ToolResultData {
  success?: boolean;
  error?: string | null;
  [key: string]: unknown;
}

/**
 * Fonction pour vérifier le succès d'un résultat d'outil
 */
export function isToolResultSuccess(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const result = data as ToolResultData;
  
  if ('success' in result) {
    return Boolean(result.success);
  }
  if ('error' in result && result.error) {
    return false;
  }
  return true;
}

/**
 * Métadonnées de debug pour les messages
 */
export interface MessageDebugInfo {
  total: number;
  filtered: number;
  hasToolCalls: boolean;
  hasReasoning: boolean;
  channels: Array<{
    role: string;
    channel?: string;
    hasContent: boolean;
  }>;
}

/**
 * État d'édition d'un message
 * Utilisé pour le flow d'édition ChatGPT-style
 */
export interface EditingState {
  messageId: string;
  originalContent: string;
  messageIndex: number;
}

/**
 * Session de chat complète (format DB)
 */
export interface ChatSession {
  id: string;
  user_id: string;
  name: string;
  agent_id: string | null;
  is_active: boolean;
  is_empty?: boolean; // Conversation vide (aucun message)
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_message_at: string | null; // Date du dernier message (pour tri sidebar)
  // Messages gérés via useInfiniteMessages (table chat_messages)
}

/**
 * Données pour créer une nouvelle session
 */
export interface CreateChatSessionData {
  name: string;
  agent_id?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Données pour mettre à jour une session
 */
export interface UpdateChatSessionData {
  name?: string;
  agent_id?: string | null;
  metadata?: Record<string, unknown>;
  is_active?: boolean;
}

/**
 * Réponse API pour une session
 */
export interface ChatSessionResponse {
  success: boolean;
  data?: ChatSession;
  error?: string;
}

/**
 * Réponse API pour une liste de sessions
 */
export interface ChatSessionsListResponse {
  success: boolean;
  data?: ChatSession[];
  error?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}
