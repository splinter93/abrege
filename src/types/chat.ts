/**
 * Types stricts pour les messages du chat
 * Remplace les `any` dans ChatMessage.tsx et ChatFullscreenV2.tsx
 */

import type { ToolCall, ToolResult } from '@/hooks/useChatHandlers';

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
  instructions?: string;
  context_template?: string;
  personality?: string;
  expertise?: string[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  is_active?: boolean;
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
}

/**
 * Message utilisateur
 */
export interface UserMessage extends BaseMessage {
  role: 'user';
  name?: string;
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
